// Lab 5 — A05:2021 Security Misconfiguration

function lab5_openDebug() {
  const out = document.getElementById('lab5-out-1');
  out.textContent =
    'GET /debug/status.json  → 200 OK  (should have been disabled in production)\n' +
    JSON.stringify(
      {
        env: 'production',
        debug: true,
        db_host: 'internal-db-03.prod.local',
        last_error: {
          message: 'Connection pool exhausted',
          trace_id: 'flag{exposed_debug_endpoint}',
        },
      },
      null,
      2
    );
}

function lab5_login() {
  const user = document.getElementById('lab5-user').value.trim();
  const pass = document.getElementById('lab5-pass').value.trim();
  const out = document.getElementById('lab5-out-2');
  if (user === 'admin' && pass === 'admin') {
    out.innerHTML = `<span style="color:var(--teal)">200 OK — logged in. Default credentials were never changed after install.</span>`;
  } else {
    out.textContent = '401 Unauthorized';
  }
}

function lab5_sysinfo() {
  const out = document.getElementById('lab5-out-3');
  out.textContent =
    'GET /admin/system-info  → 200 OK\n' +
    JSON.stringify(
      { debug_mode: true, admin_default_creds: true, finding: 'flag{default_credentials_admin_panel}' },
      null,
      2
    );
}

const LAB5_STEPS = [
  {
    title: 'Find the exposed debug endpoint',
    desc: 'This server left a directory listing on in production. Browse it and see what turns up.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">Index of /</div>
        <div class="fake-body">
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
            <span class="mono" style="color:var(--text-faint);">/api/</span>
            <span class="mono" style="color:var(--text-faint);">/assets/</span>
            <button class="btn btn-ghost" style="width:fit-content;" onclick="lab5_openDebug()">/debug/status.json</button>
          </div>
          <pre id="lab5-out-1" class="mono" style="white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click /debug/status.json — that endpoint should never be public in production.',
  },
  {
    title: 'Log in with default credentials',
    desc: 'The admin panel was deployed with its factory-default account still active. Try the most common default pair.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST /admin/login</div>
        <div class="fake-body">
          <div class="field" style="margin-bottom:8px;"><label>Username</label><input id="lab5-user" class="mono" style="width:100%; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:6px;" /></div>
          <div class="field" style="margin-bottom:8px;"><label>Password</label><input id="lab5-pass" type="password" class="mono" style="width:100%; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:6px;" /></div>
          <button class="btn btn-ghost" onclick="lab5_login()">Log in</button>
          <pre id="lab5-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'admin / admin — submit the username that gets you in.',
  },
  {
    title: 'Confirm the misconfiguration',
    desc: 'Now that you\'re in, pull the system info panel to confirm just how exposed this install is.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET /admin/system-info</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab5_sysinfo()">Load system info</button>
          <pre id="lab5-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — the finding field is your flag.',
  },
];
