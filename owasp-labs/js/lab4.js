// Lab 4 — A04:2021 Insecure Design
// The flaw here isn't a coding bug — it's an architectural choice: reset
// tokens are sequential integers instead of unguessable random values.

function lab4_predict() {
  const guess = document.getElementById('lab4-guess').value.trim();
  const out = document.getElementById('lab4-out-2');
  if (guess === 'rst-100047') {
    out.innerHTML = `<span style="color:var(--teal)">Correct — the tokens increment by exactly 1 with every request across all accounts.</span>`;
  } else {
    out.textContent = 'Not quite. Look at the two captured tokens below — what pattern connects them?';
  }
}

function lab4_useToken() {
  const token = document.getElementById('lab4-token-input').value.trim();
  const out = document.getElementById('lab4-out-3');
  if (token === 'rst-100047') {
    out.innerHTML =
      `<span style="color:var(--teal)">POST /reset-password  token=rst-100047  new_password=hacked123\n` +
      `200 OK — password reset for victim@example.com without ever touching their inbox.\n` +
      `flag{account_takeover_no_rate_limit}</span>`;
  } else {
    out.textContent = `POST /reset-password  token=${token}  → 400 Invalid or expired token`;
  }
}

const LAB4_STEPS = [
  {
    title: 'Spot the design flaw',
    desc: 'This app\'s "forgot password" flow issues a reset token that looks like this: rst-100045. There\'s no coding mistake to find here — the flaw was baked into the design before a single line was written. What class of flaw is this?',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">password_reset_log (captured)</div>
        <div class="fake-body">
          <table class="data-tbl">
            <tr><th>Time</th><th>Account</th><th>Token issued</th></tr>
            <tr><td>14:02:10</td><td>bob@example.com</td><td class="mono">rst-100045</td></tr>
            <tr><td>14:02:41</td><td>test@example.com</td><td class="mono">rst-100046</td></tr>
          </table>
        </div>
      </div>`,
    hint: 'The category of flaw is: flag{predictable_reset_token}',
  },
  {
    title: 'Predict the next token',
    desc: 'A victim, victim@example.com, is about to request a reset. Using the pattern above, predict the exact token their request will receive.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">Prediction check</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab4-guess" class="mono" placeholder="rst-______" />
            <button class="btn btn-ghost" onclick="lab4_predict()">Check pattern</button>
          </div>
          <pre id="lab4-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Tokens increase by 1 with every reset request, system-wide, regardless of account. What comes after 100046?',
  },
  {
    title: 'Take over the account',
    desc: 'No rate limiting exists on the reset endpoint either — the design never anticipated someone trying tokens directly. Use your predicted token to reset the victim\'s password.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST /reset-password</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab4-token-input" class="mono" placeholder="token..." />
            <button class="btn btn-ghost" onclick="lab4_useToken()">Reset password</button>
          </div>
          <pre id="lab4-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Use the same token you predicted in the previous step.',
  },
];
