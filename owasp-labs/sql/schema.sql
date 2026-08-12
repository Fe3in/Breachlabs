-- ============================================================
-- BREACHLAB — OWASP Top 10 (A01–A10) Training Range
-- Run this entire file once in Supabase: SQL Editor > New query > Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- NOTE: search_path includes `extensions` because Supabase installs pgcrypto
-- there, not in `public`. Omitting it causes "function digest(...) does not
-- exist" errors at runtime even though it looks fine in the SQL editor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));
  candidate := base_username;

  -- Never let a username collision break signup: append a short numeric
  -- suffix until we find one that's free.
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Only the trigger should ever call this, never the API directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------- LABS (public metadata, no secrets) ----------
create table if not exists public.labs (
  id int primary key,
  slug text unique not null,
  code text not null,
  title text not null,
  category text not null,
  difficulty text not null,
  summary text not null,
  total_steps int not null,
  points int not null default 100
);

alter table public.labs enable row level security;
drop policy if exists "Labs are public" on public.labs;
create policy "Labs are public" on public.labs for select using (true);

insert into public.labs (id, slug, code, title, category, difficulty, summary, total_steps, points) values
(1,'broken-access-control','A01:2021','Broken Access Control','Access Control','Easy','Users can access resources outside their intended permissions.',3,100),
(2,'cryptographic-failures','A02:2021','Cryptographic Failures','Cryptography','Easy','Sensitive data is exposed due to weak or missing encryption.',3,100),
(3,'injection','A03:2021','Injection','Injection','Medium','Untrusted user data tricks an interpreter into executing unintended commands.',3,150),
(4,'insecure-design','A04:2021','Insecure Design','Design','Medium','Flaws in the application''s architecture before coding even begins.',3,150),
(5,'security-misconfiguration','A05:2021','Security Misconfiguration','Configuration','Easy','Systems are poorly configured, such as keeping default passwords active.',3,100),
(6,'insecure-design-business-logic','A06:2021','Insecure Design — Business Logic','Business Logic','Medium','Flaws embedded directly into the application architecture due to missing threat modeling or weak security design patterns.',3,150),
(7,'authentication-failures','A07:2021','Authentication Failures','Authentication','Medium','Weaknesses in user identity verification, session management, or credential handling.',3,150),
(8,'software-data-integrity-failures','A08:2021','Software & Data Integrity Failures','Supply Chain','Hard','Code or infrastructure updates fail to verify integrity, risking insecure CI/CD pipelines or plugin tampering.',3,200),
(9,'security-logging-alerting-failures','A09:2021','Security Logging & Alerting Failures','Monitoring','Easy','Insufficient logging, monitoring, or incident detection allows breaches to go unnoticed.',3,100),
(10,'mishandling-exceptional-conditions','A10:2021','Mishandling of Exceptional Conditions','Error Handling','Hard','Applications fail to handle errors or edge cases safely, leading to crashes or exploitable states.',3,200)
on conflict (id) do update set
  slug=excluded.slug, code=excluded.code, title=excluded.title, category=excluded.category,
  difficulty=excluded.difficulty, summary=excluded.summary, total_steps=excluded.total_steps, points=excluded.points;

-- ---------- FLAGS (secret — zero RLS policies = clients can never read this table) ----------
create table if not exists public.lab_flags (
  lab_id int references public.labs(id) on delete cascade,
  step int not null,
  flag_hash text not null,
  primary key (lab_id, step)
);
alter table public.lab_flags enable row level security;
-- Intentionally zero policies. Only the SECURITY DEFINER function below can read this table.

-- ---------- PROGRESS ----------
create table if not exists public.user_progress (
  user_id uuid references auth.users(id) on delete cascade,
  lab_id int references public.labs(id) on delete cascade,
  current_step int not null default 1,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);
alter table public.user_progress enable row level security;

drop policy if exists "Users view own progress" on public.user_progress;
create policy "Users view own progress" on public.user_progress
  for select using (auth.uid() = user_id);
-- No insert/update policy on purpose — the only write path is submit_flag() below.

-- ---------- FLAG SUBMISSION (the only way progress ever changes) ----------
create or replace function public.submit_flag(p_lab_id int, p_step int, p_answer text)
returns json
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_hash text;
  v_total_steps int;
  v_correct boolean;
  v_completed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select flag_hash into v_hash from public.lab_flags
    where lab_id = p_lab_id and step = p_step;

  if v_hash is null then
    raise exception 'Invalid lab/step';
  end if;

  v_correct := (v_hash = encode(digest(lower(trim(p_answer)), 'sha256'), 'hex'));

  if not v_correct then
    return json_build_object('correct', false);
  end if;

  select total_steps into v_total_steps from public.labs where id = p_lab_id;
  v_completed := p_step >= v_total_steps;

  insert into public.user_progress (user_id, lab_id, current_step, completed, completed_at, updated_at)
  values (auth.uid(), p_lab_id, least(p_step + 1, v_total_steps), v_completed, case when v_completed then now() else null end, now())
  on conflict (user_id, lab_id) do update
    set current_step = greatest(public.user_progress.current_step, least(p_step + 1, v_total_steps)),
        completed = public.user_progress.completed or v_completed,
        completed_at = coalesce(public.user_progress.completed_at, case when v_completed then now() else null end),
        updated_at = now();

  return json_build_object('correct', true, 'completed', v_completed);
end;
$$;

revoke all on function public.submit_flag(int, int, text) from public;
grant execute on function public.submit_flag(int, int, text) to authenticated;

-- ---------- LEADERBOARD (safe public view — no emails, no flags) ----------
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(sum(l.points) filter (where up.completed), 0)::int as points,
  count(*) filter (where up.completed) as labs_completed
from public.profiles p
left join public.user_progress up on up.user_id = p.id
left join public.labs l on l.id = up.lab_id
group by p.id, p.username
order by points desc, labs_completed desc;

grant select on public.leaderboard to authenticated, anon;

-- ---------- SEED FLAG HASHES ----------
-- Every flag is stored ONLY as a sha256 hash. The plaintext never ships in the app.
insert into public.lab_flags (lab_id, step, flag_hash) values
(1, 1, encode(digest('acc-2291','sha256'),'hex')),
(1, 2, encode(digest('flag{idor_account_takeover}','sha256'),'hex')),
(1, 3, encode(digest('flag{privilege_escalation_via_role_param}','sha256'),'hex')),

(2, 1, encode(digest('summer2023!','sha256'),'hex')),
(2, 2, encode(digest('password123','sha256'),'hex')),
(2, 3, encode(digest('flag{hardcoded_api_key_exposed}','sha256'),'hex')),

(3, 1, encode(digest('flag{auth_bypass_or_1=1}','sha256'),'hex')),
(3, 2, encode(digest('flag{union_select_extracted}','sha256'),'hex')),
(3, 3, encode(digest('flag{sql_injection_full_dump}','sha256'),'hex')),

(4, 1, encode(digest('flag{predictable_reset_token}','sha256'),'hex')),
(4, 2, encode(digest('rst-100047','sha256'),'hex')),
(4, 3, encode(digest('flag{account_takeover_no_rate_limit}','sha256'),'hex')),

(5, 1, encode(digest('flag{exposed_debug_endpoint}','sha256'),'hex')),
(5, 2, encode(digest('admin','sha256'),'hex')),
(5, 3, encode(digest('flag{default_credentials_admin_panel}','sha256'),'hex')),

(6, 1, encode(digest('245.00','sha256'),'hex')),
(6, 2, encode(digest('flag{negative_quantity_exploit}','sha256'),'hex')),
(6, 3, encode(digest('flag{business_logic_bypass_checkout}','sha256'),'hex')),

(7, 1, encode(digest('flag{weak_password_policy}','sha256'),'hex')),
(7, 2, encode(digest('letmein123','sha256'),'hex')),
(7, 3, encode(digest('flag{session_fixation_vulnerability}','sha256'),'hex')),

(8, 1, encode(digest('flag{missing_integrity_check}','sha256'),'hex')),
(8, 2, encode(digest('flag{unsigned_artifact_deployed}','sha256'),'hex')),
(8, 3, encode(digest('flag{supply_chain_compromise_confirmed}','sha256'),'hex')),

(9, 1, encode(digest('flag{missing_audit_logging}','sha256'),'hex')),
(9, 2, encode(digest('flag{no_alerting_on_anomaly}','sha256'),'hex')),
(9, 3, encode(digest('flag{undetected_breach_90_days}','sha256'),'hex')),

(10, 1, encode(digest('flag{unhandled_exception_stack_trace}','sha256'),'hex')),
(10, 2, encode(digest('flag{fail_open_error_handling}','sha256'),'hex')),
(10, 3, encode(digest('flag{exploited_fail_open_condition}','sha256'),'hex'))
on conflict (lab_id, step) do update set flag_hash = excluded.flag_hash;

-- ============================================================
-- Done. Verify with:  select * from public.labs order by id;
-- Next: Authentication → URL Configuration → set Site URL + Redirect URLs
-- to wherever you host index.html / reset-password.html (or http://localhost:PORT for now).
-- Also recommended: Authentication → Policies → enable "leaked password protection".
-- ============================================================
