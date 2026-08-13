// Lab 10 — A10:2021 Mishandling of Exceptional Conditions

function lab10_triggerException() {
  const val = document.getElementById('lab10-input').value;
  const out = document.getElementById('lab10-out-1');
  if (val.trim() === '') {
    out.textContent = 'Enter something in the field, then submit — try a very unexpected value.';
    return;
  }
  const looksMalformed = /[^0-9]/.test(val);
  if (looksMalformed) {
    out.textContent =
      'POST /api/orders/lookup  { order_id: "' + val + '" }\n500 Internal Server Error\n' +
      'TypeError: Cannot convert "' + val + '" to an integer\n' +
      '  at parseOrderId (orders.js:41)\n' +
      '  at handler (orders.js:12)\n' +
      'DB_HOST=internal-db-03.prod.local  DB_USER=orders_svc\n\n' +
      'flag{unhandled_exception_stack_trace}';
  } else {
    out.textContent = 'POST /api/orders/lookup  { order_id: "' + val + '" }\n200 OK — no order found';
  }
}

function lab10_checkFailOpen() {
  const out = document.getElementById('lab10-out-2');
  out.textContent =
    'GET /api/permissions/check?user=guest&resource=/admin/reports\n' +
    'permission_service.timeout after 3000ms\n' +
    'catch (err) { return { allowed: true } }  // "fail open" fallback\n\n' +
    '200 OK — { allowed: true }\n\n' +
    '[FINDING] When the permission service errors out, the app defaults to\n' +
    'granting access instead of denying it.\n' +
    'flag{fail_open_error_handling}';
}

function lab10_exploitTimeout() {
  const out = document.getElementById('lab10-out-3');
  out.textContent =
    'GET /api/permissions/check?user=guest&resource=/admin/reports&stall=true\n' +
    '(forcing the permission service to time out on purpose)\n' +
    'permission_service.timeout after 3000ms → fail-open triggered\n' +
    'GET /admin/reports  → 200 OK — full report data returned to a guest user\n\n' +
    'flag{exploited_fail_open_condition}';
}

const LAB10_STEPS = [
  {
    title: 'Trigger an unhandled exception',
    desc: 'This order lookup endpoint assumes its input is always a clean number and never wraps the conversion in a try/catch. Send it something it doesn\'t expect.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/api/orders/lookup</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab10-input" class="mono" placeholder="order_id..." />
            <button class="btn btn-ghost" onclick="lab10_triggerException()">Submit</button>
          </div>
          <pre id="lab10-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Try something that isn\'t a number, like: abc',
  },
  {
    title: 'Find the fail-open condition',
    desc: 'When the permission-checking service errors or times out, see what the app defaults to.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/api/permissions/check</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab10_checkFailOpen()">Simulate permission-service timeout</button>
          <pre id="lab10-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — read the catch block in the response carefully.',
  },
  {
    title: 'Exploit the fail-open path',
    desc: 'Deliberately force the timeout as a guest user, aimed at a restricted resource.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/admin/reports (as guest)</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab10_exploitTimeout()">Force timeout and request /admin/reports</button>
          <pre id="lab10-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — a guest account ends up with data it should never see.',
  },
];

const LAB10_INTRO = {
  summary:
    "Mishandling of Exceptional Conditions covers what happens when errors and edge cases aren't handled safely — from leaking stack traces to defaulting into an insecure ('fail open') state whenever something goes wrong.",
  vulnerableCode:
`try {
  const allowed = await permissionService.check(user, resource);
} catch (err) {
  return { allowed: true }; // fail OPEN on error — dangerous!
}`,
  secureCode:
`try {
  const allowed = await permissionService.check(user, resource);
  return { allowed };
} catch (err) {
  logger.error('permission_check_failed', err);
  return { allowed: false }; // fail CLOSED — safe default
}`,
};

const LAB10_REMEDIATION = [
  'Always fail closed (deny by default) when a security-relevant check errors out.',
  'Never expose stack traces or internal details in production error responses.',
  'Handle exceptional and edge-case input explicitly rather than assuming only "happy path" data arrives.',
  'Add monitoring on error rates so failures get caught, not silently swallowed.',
];
