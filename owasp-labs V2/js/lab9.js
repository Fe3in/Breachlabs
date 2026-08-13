// Lab 9 — A09:2021 Security Logging and Alerting Failures

function lab9_reviewLog() {
  const out = document.getElementById('lab9-out-1');
  out.textContent =
    'GET /admin/audit-log?event=failed_login\n200 OK\n' +
    JSON.stringify({ results: [], total: 0 }, null, 2) +
    '\n\n[FINDING] 40+ failed login attempts occurred in the last hour (per the raw\n' +
    'auth server access log) — none of them were written to the audit log at all.\n' +
    'flag{missing_audit_logging}';
}

function lab9_simulateExfil() {
  const out = document.getElementById('lab9-out-2');
  out.textContent =
    'POST /api/reports/export  { table: "users", rows: 50000 }\n200 OK\n' +
    'GET /admin/alerts/recent\n200 OK\n' +
    JSON.stringify({ alerts: [] }, null, 2) +
    '\n\n[FINDING] A 50,000-row export of the users table triggered zero alerts —\n' +
    'there is no anomaly detection on data access volume.\n' +
    'flag{no_alerting_on_anomaly}';
}

function lab9_incidentTimeline() {
  const out = document.getElementById('lab9-out-3');
  out.textContent =
    'GET /admin/incidents/INC-4471\n200 OK\n' +
    JSON.stringify(
      { first_unauthorized_access: '2026-03-02', detected_on: '2026-05-31', detection_source: 'manual customer report' },
      null,
      2
    ) +
    '\n\nflag{undetected_breach_90_days}';
}

const LAB9_STEPS = [
  {
    title: 'Check the audit log',
    desc: 'Failed logins should always show up somewhere. See what the audit log actually captured.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/admin/audit-log?event=failed_login</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab9_reviewLog()">Query audit log</button>
          <pre id="lab9-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — the finding explains what\'s missing.',
  },
  {
    title: 'Trigger an anomaly and check for an alert',
    desc: 'Export an unusually large amount of data and see whether anything reacts to it.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/api/reports/export</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab9_simulateExfil()">Export 50,000 user rows</button>
          <pre id="lab9-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click export — then check the alerts endpoint that fires right after.',
  },
  {
    title: 'Read the incident timeline',
    desc: 'Given both gaps above, see how long a real breach went unnoticed before anyone caught it.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/admin/incidents/INC-4471</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab9_incidentTimeline()">Load incident record</button>
          <pre id="lab9-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — compare the two dates in the response.',
  },
];

const LAB9_INTRO = {
  summary:
    "Security Logging and Alerting Failures happen when systems don't log security-relevant events, or log them but never alert on suspicious patterns — letting a breach sit undetected for weeks or months.",
  vulnerableCode:
`app.post('/login', (req, res) => {
  // failed attempts are never logged at all
  if (!valid) return res.status(401).end();
});`,
  secureCode:
`app.post('/login', (req, res) => {
  if (!valid) {
    logger.warn('failed_login', { user: req.body.username, ip: req.ip });
    alerting.checkThreshold('failed_login', req.ip);
    return res.status(401).end();
  }
});`,
};

const LAB9_REMEDIATION = [
  'Log all security-relevant events: auth failures, permission denials, large data exports.',
  'Set up automated alerting on anomalies (volume spikes, unusual access patterns) — not just raw logs nobody reads.',
  'Centralize logs and retain them long enough to support a real incident investigation.',
  'Practice incident response so alerts actually get acted on quickly, not just generated.',
];
