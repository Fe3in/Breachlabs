// Lab 1 — A01:2021 Broken Access Control
// Simulated fake API. Nothing here is a real network call.

const LAB1_DB = {
  'acc-2291': { owner: 'You (demo user)', role: 'user', balance: '$4,120.55' },
  'acc-2290': { owner: 'J. Whitfield', role: 'user', balance: '$88,204.10', internal_note: 'flag{idor_account_takeover}' },
};

function lab1_getSession() {
  const out = document.getElementById('lab1-out-1');
  out.textContent = JSON.stringify({ account_id: 'acc-2291', role: 'user' }, null, 2);
}

function lab1_getAccount() {
  const id = document.getElementById('lab1-input-2').value.trim();
  const out = document.getElementById('lab1-out-2');
  const record = LAB1_DB[id];
  if (!record) {
    out.textContent = `404 — no account "${id}" in range acc-2280 .. acc-2299`;
    return;
  }
  out.textContent = `GET /api/account/${id}/balance  → 200 OK\n` + JSON.stringify(record, null, 2);
}

function lab1_getAdminPanel() {
  const role = document.getElementById('lab1-role').value;
  const out = document.getElementById('lab1-out-3');
  if (role === 'admin') {
    out.textContent =
      'GET /api/admin/panel  (role=admin sent by client, never re-checked server-side)\n' +
      '200 OK\n' +
      JSON.stringify({ panel: 'admin', finding: 'flag{privilege_escalation_via_role_param}' }, null, 2);
  } else {
    out.textContent = 'GET /api/admin/panel  → 403 Forbidden (role=user)';
  }
}

const LAB1_STEPS = [
  {
    title: 'Read your own session',
    desc: 'SecureBank\'s mobile API exposes a debug endpoint that echoes your session. Call it and note your account ID — you\'ll need it in a moment.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET /api/session</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab1_getSession()">Send request</button>
          <pre id="lab1-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Just click the button — this endpoint requires no exploitation, it\'s only here to show you your own account ID.',
  },
  {
    title: 'Access another account (IDOR)',
    desc: 'The balance endpoint takes an account ID directly from the URL and never checks whether it belongs to the caller. Account IDs are sequential. Try a neighboring ID to your own.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET /api/account/:id/balance</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input type="text" id="lab1-input-2" class="mono" value="acc-2291" />
            <button class="btn btn-ghost" onclick="lab1_getAccount()">Send request</button>
          </div>
          <pre id="lab1-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Your account is acc-2291. Try acc-2290 — the API never verifies the ID belongs to you.',
  },
  {
    title: 'Escalate to admin',
    desc: 'The admin panel trusts a "role" value that the client itself controls, instead of checking permissions server-side. Change the role and request the panel.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET /api/admin/panel</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <select id="lab1-role" class="mono" style="flex:1; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:11px; border-radius:6px;">
              <option value="user">role: user</option>
              <option value="admin">role: admin</option>
            </select>
            <button class="btn btn-ghost" onclick="lab1_getAdminPanel()">Send request</button>
          </div>
          <pre id="lab1-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Set the dropdown to "role: admin" before sending — this app never re-validates role on the server.',
  },
];
