// Lab 2 — A02:2021 Cryptographic Failures

const LAB2_CAPTURED_B64 = 'c3VtbWVyMjAyMyE='; // intercepted over plain HTTP

// SHA-256("password123") computed offline — nobody's plaintext password lives in this file.
const LAB2_TARGET_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';
const LAB2_WORDLIST = ['123456', 'password', 'qwerty', 'letmein', 'welcome1', 'password123', 'dragon', 'sunshine'];

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function lab2_decode() {
  const out = document.getElementById('lab2-out-1');
  try {
    out.textContent = 'Decoded: ' + atob(LAB2_CAPTURED_B64);
  } catch {
    out.textContent = 'Decode failed.';
  }
}

async function lab2_tryPassword(word) {
  const out = document.getElementById('lab2-out-2');
  out.textContent = `hashing "${word}"...`;
  const hash = await sha256hex(word);
  if (hash === LAB2_TARGET_HASH) {
    out.innerHTML = `<span style="color:var(--teal)">MATCH — "${word}" hashes to the leaked value. This is the account password.</span>`;
  } else {
    out.textContent = `"${word}" → ${hash.slice(0, 16)}...  (no match)`;
  }
}

function lab2_runWordlist() {
  const box = document.getElementById('lab2-wordlist');
  box.innerHTML = LAB2_WORDLIST.map(
    (w) => `<button class="btn btn-ghost" style="padding:6px 12px; font-size:12.5px; margin:3px;" onclick="lab2_tryPassword('${w}')">${w}</button>`
  ).join('');
}

function lab2_scan() {
  const out = document.getElementById('lab2-out-3');
  out.textContent =
    '[CRITICAL] Hardcoded credential detected — bundle.min.js:14\n' +
    '  const STRIPE_TEST_KEY = "sk_test_51Hxxxxx..."\n' +
    'Finding ID: flag{hardcoded_api_key_exposed}';
}

const LAB2_STEPS = [
  {
    title: 'Decode intercepted traffic',
    desc: 'You captured this request body over an unencrypted HTTP connection between the app and its login API. The password field is only base64-encoded — encoding is not encryption.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST /login  (captured, plaintext HTTP)</div>
        <div class="fake-body">
          <div style="margin-bottom:12px;">body.password_b64 = <span class="mono">${LAB2_CAPTURED_B64}</span></div>
          <button class="btn btn-ghost" onclick="lab2_decode()">Base64 decode</button>
          <pre id="lab2-out-1" class="mono" style="margin-top:12px;"></pre>
        </div>
      </div>`,
    hint: 'Base64 is reversible with zero secret required — click decode.',
  },
  {
    title: 'Crack the leaked hash',
    desc: 'A separate breach dump exposes a user\'s password as an unsalted SHA-256 hash. Unsalted hashes of common passwords can be brute-forced against a small wordlist. Try each candidate below.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">leaked_users.csv — row 1</div>
        <div class="fake-body">
          <div style="margin-bottom:12px;">password_hash = <span class="mono" style="word-break:break-all;">${LAB2_TARGET_HASH}</span></div>
          <div id="lab2-wordlist"></div>
          <pre id="lab2-out-2" class="mono" style="margin-top:12px;"></pre>
        </div>
      </div>`,
    hint: 'One of the candidate buttons will report a MATCH — that plaintext is your answer for this step.',
    afterRender: lab2_runWordlist,
  },
  {
    title: 'Find the exposed key',
    desc: 'The app\'s JS bundle was shipped with a debug build that never stripped a hardcoded credential. Run a secret scan against it.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">bundle.min.js</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab2_scan()">Run secret scanner</button>
          <pre id="lab2-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the scanner — it reports a finding ID, which is your flag for this step.',
  },
];
