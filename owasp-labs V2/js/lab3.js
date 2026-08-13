// Lab 3 — A03:2021 Injection
// The "database" below is simulated entirely in JS. The login/search boxes
// build a naive SQL string client-side (exactly like the vulnerable app
// would) and we pattern-match for classic injection syntax to decide
// whether the "query" would have succeeded.

function looksLikeAuthBypass(v) {
  const s = v.toLowerCase().replace(/\s+/g, '');
  return s.includes("or1=1") || s.includes("or'1'='1") || s.includes("'or''='") || (s.includes("or") && s.includes("--") && s.includes("'"));
}
function looksLikeUnionSelect(v) {
  const s = v.toLowerCase();
  return s.includes('union') && s.includes('select');
}
function looksLikeSecretsUnion(v) {
  const s = v.toLowerCase();
  return s.includes('union') && s.includes('select') && s.includes('secrets');
}

function lab3_login() {
  const user = document.getElementById('lab3-user').value;
  const out = document.getElementById('lab3-out-1');
  const query = `SELECT * FROM users WHERE username = '${user}' AND password = '${document.getElementById('lab3-pass').value}'`;
  if (looksLikeAuthBypass(user)) {
    out.innerHTML =
      `<span style="color:var(--text-faint)">Query built: ${escapeHtml(query)}</span>\n` +
      `<span style="color:var(--teal)">200 OK — logged in as admin (the WHERE clause always evaluates true)</span>`;
  } else {
    out.textContent = `Query built: ${query}\n401 Unauthorized`;
  }
}

function lab3_search() {
  const term = document.getElementById('lab3-search').value;
  const out = document.getElementById('lab3-out-2');
  const query = `SELECT name, price FROM products WHERE name LIKE '%${term}%'`;
  if (looksLikeUnionSelect(term)) {
    out.innerHTML =
      `<span style="color:var(--text-faint)">Query built: ${escapeHtml(query)}</span>\n` +
      `<span style="color:var(--teal)">200 OK — extra columns returned from an unintended table:</span>\n` +
      JSON.stringify({ hidden_notes: 'flag{union_select_extracted}' }, null, 2);
    document.getElementById('lab3-step3-hint-unlock')?.classList.remove('locked-note');
  } else {
    out.textContent = `Query built: ${query}\n200 OK — 0 results`;
  }
}

function lab3_dump() {
  const term = document.getElementById('lab3-dump-input').value;
  const out = document.getElementById('lab3-out-3');
  if (looksLikeSecretsUnion(term)) {
    out.innerHTML =
      `<span style="color:var(--teal)">Full extraction succeeded:</span>\n` +
      JSON.stringify({ table: 'secrets', rows: [{ id: 1, value: 'flag{sql_injection_full_dump}' }] }, null, 2);
  } else {
    out.textContent = '200 OK — 0 results (target the "secrets" table with a UNION SELECT)';
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

const LAB3_STEPS = [
  {
    title: 'Bypass the login',
    desc: 'This login form concatenates your input directly into a SQL query — never a prepared statement. Craft a username that makes the WHERE clause always true.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/login</div>
        <div class="fake-body">
          <div class="field" style="margin-bottom:8px;"><label>Username</label><input id="lab3-user" class="mono" style="width:100%; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:6px;" /></div>
          <div class="field" style="margin-bottom:8px;"><label>Password</label><input id="lab3-pass" class="mono" style="width:100%; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:6px;" /></div>
          <button class="btn btn-ghost" onclick="lab3_login()">Submit login</button>
          <pre id="lab3-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: `Try a username like: ' OR '1'='1`,
  },
  {
    title: 'Extract hidden data via UNION',
    desc: 'The product search box is also vulnerable. A UNION SELECT can append rows from a completely different table onto the results.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/store/search?q=</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab3-search" class="mono" placeholder="search term..." />
            <button class="btn btn-ghost" onclick="lab3_search()">Search</button>
          </div>
          <pre id="lab3-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: `Try: ' UNION SELECT internal_note, null FROM accounts --`,
  },
  {
    title: 'Full extraction',
    desc: 'One more table holds the crown jewels: a "secrets" table. Point your UNION at it directly.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/store/search?q=  (secrets table)</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab3-dump-input" class="mono" placeholder="search term..." />
            <button class="btn btn-ghost" onclick="lab3_dump()">Search</button>
          </div>
          <pre id="lab3-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: `Try: ' UNION SELECT value, null FROM secrets --`,
  },
];

const LAB3_INTRO = {
  summary:
    "Injection flaws happen when untrusted input is inserted into a command or query interpreter without proper handling, letting an attacker alter the intended logic. SQL injection is the classic example: string-concatenated queries let user input redefine what the query actually does.",
  vulnerableCode:
`const query =
  \`SELECT * FROM users WHERE username = '\${user}'
   AND password = '\${pass}'\`;
db.query(query);`,
  secureCode:
`const query =
  'SELECT * FROM users WHERE username = ? AND password = ?';
db.query(query, [user, pass]); // parameterized — input is always
                                // data, never code`,
};

const LAB3_REMEDIATION = [
  'Always use parameterized queries or prepared statements — never string concatenation.',
  'Apply least-privilege database accounts so a compromised app can\'t read arbitrary tables.',
  'Validate and sanitize user input as a second layer of defense, not the only one.',
  'Prefer an ORM with built-in escaping, and consider a WAF for defense in depth.',
];
