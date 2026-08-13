Hands-on OWASP Top 10 (2021) training range — 10 interactive labs, real auth, server-verified flags. Built with HTML/CSS/JS + Supabase.# BREACHLAB — OWASP Top 10 Training Range

![OWASP Top 10](https://img.shields.io/badge/OWASP-Top%2010%20(2021)-red)
![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-orange)
![Backend](https://img.shields.io/badge/backend-Supabase-3ecf8e)
![License](https://img.shields.io/badge/license-MIT-blue)

Hands-on OWASP Top 10 (2021) training range — 10 interactive labs, real auth, server-verified flags. Built with plain HTML/CSS/JS and Supabase, no framework, no build step.

Every lab targets the same fictional company, **ShopFast Inc.** — an e-commerce and payments platform — so instead of 10 disconnected demos, you're mapping out weaknesses across one consistent target.

## Features

- 🎯 **All 10 OWASP Top 10 (2021) categories**, A01–A10, one lab each
- 🧩 **3-step, hands-on challenges** per lab, each with a simulated vulnerable environment you interact with directly
- 🔒 **Flags never touch the client** — verified server-side via a locked-down Postgres function; the `lab_flags` table has zero read policies, so no key can ever read it
- 👤 **Full auth** — sign up, sign in, forgot/reset password
- 🏆 **Profile, rank tiers, and a live leaderboard**
- 📚 **In-depth mode** — each lab opens with a vulnerability overview and a vulnerable-vs-secure code comparison, and closes with a remediation checklist once cleared
- 🖤 **Dark, console-styled UI** — no framework, single dependency (Supabase JS client via CDN)

## ShopFast Inc. — the target

| System | Labs |
|---|---|
| ShopFast Pay (payments API) | A01, A02 |
| ShopFast Store (storefront + search) | A03, A06 |
| ShopFast Accounts (auth + reset) | A04, A07 |
| Admin Console | A05 |
| ShopFast Engineering (CI/CD) | A08 |
| ShopFast Monitoring | A09 |
| Orders API | A10 |

## 1. Create a Supabase project

1. Go to https://supabase.com → **New project**. Pick any name/region, set a database
   password (save it somewhere), and wait ~2 minutes for it to provision.
2. Left sidebar → **SQL Editor** → **New query**. Paste in the entire contents of
   `sql/schema.sql` from this project and click **Run**. This creates all tables,
   locks down the flags table with no read policies, creates the `submit_flag()`
   function that's the only way progress is ever written, and seeds all 10 labs.
3. Left sidebar → **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key.
4. Open `js/config.js` in this project and paste them in:
   ```js
   window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   window.SUPABASE_ANON = "eyJ...";
   ```
   The anon key is safe to ship in client code — Row Level Security is what
   actually protects the data (and note `lab_flags` has *zero* policies, so it's
   unreadable no matter what key is used).

## 2. Configure auth email settings

Still in Supabase:
- **Authentication → Providers → Email**: on by default. Turn off "Confirm email"
  if you want instant sign-up (recommended while testing); leave it on for
  production so people verify real addresses.
- **Authentication → URL Configuration**: set **Site URL** to wherever you'll host
  this (e.g. `http://localhost:5500` while testing, or your real domain later),
  and add `.../auth/reset-password.html` to **Redirect URLs**. This is required
  for the "forgot password" email link to land correctly.

## 3. Run it locally

No build step — it's plain HTML/CSS/JS. Any static file server works, e.g.:

```bash
cd owasp-labs
python3 -m http.server 5500
# then open http://localhost:5500
```

(Opening `index.html` directly via `file://` will NOT work — Supabase's auth
redirect handling needs a real origin. Always serve it over http/https.)

## 4. Deploy

Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3+CloudFront).
Just make sure to update the Supabase **Site URL** / **Redirect URLs** to match
your real domain once you deploy.

## How the flag-hiding works

- `lab_flags` stores only `sha256(answer)`, and has Row Level Security enabled
  with **no policies at all** — so no client, with any key, can ever `SELECT` from
  it directly.
- The only way to check an answer is the Postgres function `submit_flag(lab_id,
  step, answer)`, which runs `SECURITY DEFINER` (server-side, with elevated
  rights) and returns just `{correct: true/false}` — never the flag itself.
- `user_progress` also has no direct insert/update policy — it can only be
  written by that same function, scoped to the calling user's own `auth.uid()`.

So even someone reading every line of this site's JavaScript cannot recover a
flag; they can only see clearly enough of *how* each vulnerability behaves to
work out the answer themselves (which is the point).

## Project structure

```
index.html              Home: hero, profile/rank panel, lab grid, leaderboard
auth/signin.html         Sign in
auth/signup.html         Sign up
auth/forgot-password.html
auth/reset-password.html Landing page for the emailed reset link
labs/lab1.html ... lab10.html
css/style.css             Shared dark theme
js/config.js               <- put your Supabase URL/key here
js/supabase-client.js
js/auth.js                 Nav rendering, session helpers
js/profile.js               Home page logic (rank, stats, leaderboard)
js/lab-engine.js            Generic step renderer + flag submission
js/lab1.js ... lab10.js      Each lab's simulated environment + step copy
sql/schema.sql               Run once in Supabase SQL Editor
```

## Loading states

The lab grid, profile panel, and leaderboard on the home page show a shimmering
skeleton immediately on load, before any Supabase round trip resolves — see
`skeletonCards()` in `js/profile.js`. Each individual lab page shows a small
spinner in place of the step list until your session and progress are fetched
— see the `.loading-row` markup in each `labs/labX.html` and how `render()` in
`js/lab-engine.js` overwrites it.

## Editing labs / adding more

Each `labX.js` exports a `LABX_STEPS` array of `{ title, desc, simHtml, hint }`.
`simHtml` is the interactive simulated environment for that step; the answer
input box below it is added automatically by `lab-engine.js`. To add a 6th lab,
copy the pattern, insert a new row in `public.labs`, and seed its flag hashes
in `public.lab_flags` (using `encode(digest(lower(trim('your-answer')),
'sha256'),'hex')` in SQL, exactly like the existing seed rows).

## Ranks

Computed client-side from total points across completed labs, out of a possible
1400 (Recruit → Script Kiddie → Security Analyst → Red Teamer → Elite
Operative). Tune the thresholds in `js/profile.js` (`RANK_TIERS`).

## License

MIT — see `LICENSE` (add one if you haven't yet; GitHub can generate an MIT
license for you when creating the repo).
