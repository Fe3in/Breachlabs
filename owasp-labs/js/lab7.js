// Lab 7 — A07:2021 Authentication Failures

const LAB7_TARGET_HASH = '9b0eb22aef89516d6fb4b31ccf008a68abe0d10a3fc606316389613eccf96854';
const LAB7_WORDLIST = ['123456', 'password', 'qwerty2024', 'welcome123', 'letmein123', 'trustno1', 'iloveyou1'];

async function sha256hex7(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function lab7_weakSignup() {
  const out = document.getElementById('lab7-out-1');
  out.textContent =
    'POST /api/register  { username: "admin2", password: "123456" }\n' +
    'policy_check = { min_length: 0, require_uppercase: false, require_number: false }\n' +
    '200 OK — account created with a 6-digit numeric password.\n' +
    'flag{weak_password_policy}';
}

async function lab7_tryPassword(word) {
  const out = document.getElementById('lab7-out-2');
  out.textContent = `hashing "${word}"...`;
  const hash = await sha256hex7(word);
  if (hash === LAB7_TARGET_HASH) {
    out.innerHTML = `<span style="color:var(--teal)">MATCH — "${word}" hashes to the captured value. No lockout stopped this attempt.</span>`;
  } else {
    out.textContent = `"${word}" → ${hash.slice(0, 16)}...  (no match, attempt not rate-limited)`;
  }
}

function lab7_runWordlist() {
  const box = document.getElementById('lab7-wordlist');
  box.innerHTML = LAB7_WORDLIST.map(
    (w) => `<button class="btn btn-ghost" style="padding:6px 12px; font-size:12.5px; margin:3px;" onclick="lab7_tryPassword('${w}')">${w}</button>`
  ).join('');
}

function lab7_checkFixation() {
  const out = document.getElementById('lab7-out-3');
  out.textContent =
    'Attacker sets: Cookie: sessionid=sess-fixed-001  (before victim logs in)\n' +
    'Victim logs in normally...\n' +
    'GET /api/whoami  Cookie: sessionid=sess-fixed-001\n' +
    '200 OK — { "user": "victim@example.com" }\n\n' +
    '[FINDING] The session ID was never regenerated at login — the attacker\'s\n' +
    'pre-set session is now authenticated as the victim.\n' +
    'flag{session_fixation_vulnerability}';
}

const LAB7_STEPS = [
  {
    title: 'Spot the weak password policy',
    desc: 'This app enforces no password complexity rules at all. Try registering an account with an obviously weak password.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST /api/register</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab7_weakSignup()">Register with password "123456"</button>
          <pre id="lab7-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Just click the button — the policy accepts it with no pushback.',
  },
  {
    title: 'Brute-force a captured hash',
    desc: 'A separate account\'s password hash leaked, and the login endpoint has no rate limiting or lockout — so a wordlist attack can run unthrottled.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">captured_hash.txt</div>
        <div class="fake-body">
          <div style="margin-bottom:12px; word-break:break-all;" class="mono">${LAB7_TARGET_HASH}</div>
          <div id="lab7-wordlist"></div>
          <pre id="lab7-out-2" class="mono" style="margin-top:12px;"></pre>
        </div>
      </div>`,
    hint: 'One of the candidate buttons will report a MATCH — that plaintext is your answer.',
    afterRender: lab7_runWordlist,
  },
  {
    title: 'Exploit session fixation',
    desc: 'The app accepts a session ID handed to it via cookie and never issues a fresh one after a successful login. See what that means for an attacker who sets the session before the victim logs in.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">Session trace</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab7_checkFixation()">Replay attacker's session after victim login</button>
          <pre id="lab7-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — the finding at the bottom of the output is your flag.',
  },
];
