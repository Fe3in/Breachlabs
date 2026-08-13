// Shared across all pages. Depends on window.sb from supabase-client.js.

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, created_at')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

function initials(name) {
  if (!name) return '?';
  return name.trim().slice(0, 2).toUpperCase();
}

// Renders the shared nav bar into #nav-root on every page.
// `active` is the current page key, used only for potential future highlighting.
async function renderNav(active) {
  const root = document.getElementById('nav-root');
  if (!root) return;

  const session = await getSession();
  const basePrefix = document.body.dataset.base || ''; // '' at root, '../' inside /labs or /auth

  let rightSide;
  if (session) {
    const profile = await getProfile(session.user.id);
    const name = profile?.username || session.user.email.split('@')[0];
    rightSide = `
      <a href="${basePrefix}index.html#profile" class="nav-user">
        <span class="nav-avatar">${initials(name)}</span>
        <span>${name}</span>
      </a>
      <button id="signout-btn">Sign out</button>
    `;
  } else {
    rightSide = `
      <a href="${basePrefix}auth/signin.html">Sign in</a>
      <a href="${basePrefix}auth/signup.html" class="nav-cta">Sign up</a>
    `;
  }

  root.innerHTML = `
    <div class="nav-inner">
      <a href="${basePrefix}index.html" class="brand">
        <span class="brand-dot ${session ? 'on' : ''}"></span> BREACHLAB
      </a>
      <div class="nav-links">${rightSide}</div>
    </div>
  `;

  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = `${basePrefix}index.html`;
    });
  }
}

// Call on lab pages to force sign-in before attempting a challenge.
async function requireAuth(redirectTo) {
  const session = await getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}
