const RANK_TIERS = [
  { min: 0, name: 'Recruit' },
  { min: 1, name: 'Script Kiddie' },
  { min: 600, name: 'Security Analyst' },
  { min: 950, name: 'Red Teamer' },
  { min: 1400, name: 'Elite Operative' },
];

function rankForPoints(points) {
  let rank = RANK_TIERS[0].name;
  for (const tier of RANK_TIERS) if (points >= tier.min) rank = tier.name;
  return rank;
}

function skeletonCards(n) {
  return Array.from({ length: n }, () => `<div class="skeleton-card"></div>`).join('');
}

function difficultyClass(d) {
  return d.toLowerCase();
}

async function loadLabs() {
  const { data } = await sb.from('labs').select('*').order('id');
  return data || [];
}

async function loadMyProgress(userId) {
  const { data } = await sb
    .from('user_progress')
    .select('lab_id, current_step, completed, completed_at, updated_at')
    .eq('user_id', userId);
  const map = {};
  (data || []).forEach((r) => (map[r.lab_id] = r));
  return map;
}

async function loadLeaderboard() {
  const { data } = await sb.from('leaderboard').select('*').limit(8);
  return data || [];
}

async function loadMyLeaderboardPosition(userId) {
  const { data } = await sb.from('leaderboard').select('user_id, points, labs_completed');
  if (!data) return null;
  const idx = data.findIndex((r) => r.user_id === userId);
  if (idx === -1) return null;
  return { position: idx + 1, total: data.length, ...data[idx] };
}

function labCard(lab, progress) {
  let statusHtml, statusClass;
  const p = progress[lab.id];
  if (p?.completed) {
    statusClass = 'cleared';
    statusHtml = 'Cleared';
  } else if (p && p.current_step > 1) {
    statusClass = 'in-progress';
    statusHtml = `Step ${p.current_step} / ${lab.total_steps}`;
  } else {
    statusClass = 'locked';
    statusHtml = 'Not started';
  }

  return `
    <a class="lab-card" href="labs/lab${lab.id}.html">
      <div class="ghost-num">${String(lab.id).padStart(2, '0')}</div>
      <div>
        <div class="lab-code mono">${lab.code} · ${lab.category}</div>
        <h3>${lab.title}</h3>
        <p>${lab.summary}</p>
      </div>
      <div class="lab-meta">
        <span class="chip ${difficultyClass(lab.difficulty)}">${lab.difficulty}</span>
        <span class="status ${statusClass}">${statusHtml}</span>
      </div>
    </a>`;
}

function leaderboardRow(row, i, myId) {
  return `
    <div class="lb-row" style="${row.user_id === myId ? 'border-color:var(--accent)' : ''}">
      <div class="lb-rank ${i < 3 ? 'top' : ''}">#${i + 1}</div>
      <div>${row.username}</div>
      <div class="mono" style="color:var(--text-faint); font-size:12.5px;">${row.labs_completed} cleared</div>
      <div class="lb-points">${row.points} pts</div>
    </div>`;
}

async function initHome() {
  const profileSection = document.getElementById('profile-section');
  const grid = document.getElementById('lab-grid');
  const lbRoot = document.getElementById('leaderboard-root');
  const heroCta = document.getElementById('hero-cta');

  // Show loading state immediately, before we know session/data — replaced below once real content is ready.
  if (grid) grid.innerHTML = skeletonCards(10);
  if (lbRoot) lbRoot.innerHTML = `<div class="loading-row"><span class="spinner"></span> loading leaderboard...</div>`;
  if (profileSection) profileSection.innerHTML = `<div class="skeleton-bar"></div>`;

  const labs = await loadLabs();
  const session = await getSession();

  let progress = {};

  if (session) {
    progress = await loadMyProgress(session.user.id);
    const profile = await getProfile(session.user.id);
    const name = profile?.username || session.user.email.split('@')[0];

    const totalPoints = labs.reduce(
      (sum, l) => sum + (progress[l.id]?.completed ? l.points : 0),
      0
    );
    const clearedCount = labs.filter((l) => progress[l.id]?.completed).length;
    const rank = rankForPoints(totalPoints);

    const position = await loadMyLeaderboardPosition(session.user.id);
    const nextLab = labs.find((l) => !progress[l.id]?.completed);

    if (profileSection) {
      profileSection.innerHTML = `
        <div class="profile-panel">
          <div class="profile-avatar">${initials(name)}</div>
          <div style="flex:1;">
            <p class="profile-name">${name}</p>
            <p class="profile-rank">${rank}${position ? ` · #${position.position} on the leaderboard` : ''}</p>
          </div>
          ${nextLab ? `<a href="labs/lab${nextLab.id}.html" class="btn btn-primary">Continue ${nextLab.code} →</a>` : `<span class="chip easy">All labs cleared</span>`}
        </div>
        <div class="stat-row">
          <div class="stat-card">
            <div class="label">Labs cleared</div>
            <div class="value teal">${clearedCount} / ${labs.length}</div>
          </div>
          <div class="stat-card">
            <div class="label">Points</div>
            <div class="value accent">${totalPoints}</div>
          </div>
          <div class="stat-card">
            <div class="label">Current rank</div>
            <div class="value" style="font-size:19px;">${rank}</div>
          </div>
        </div>`;
    }
    if (heroCta) heroCta.style.display = 'none';
  } else {
    if (profileSection) profileSection.innerHTML = '';
    if (heroCta) heroCta.style.display = 'inline-flex';
  }

  if (grid) grid.innerHTML = labs.map((l) => labCard(l, progress)).join('');

  if (lbRoot) {
    const board = await loadLeaderboard();
    lbRoot.innerHTML = board.length
      ? board.map((r, i) => leaderboardRow(r, i, session?.user?.id)).join('')
      : `<p style="color:var(--text-faint); font-size:14px;">No completions yet — be the first on the board.</p>`;
  }
}
