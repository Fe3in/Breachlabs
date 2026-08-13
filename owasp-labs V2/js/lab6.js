// Lab 6 — A06:2021 Insecure Design (Business Logic)
// A checkout flow that never validates quantity or caps discounts —
// a design gap, not a coding typo.

const LAB6_UNIT_PRICE = 49.0;
let lab6_promoClicks = 0;

function lab6_calcFixed() {
  const out = document.getElementById('lab6-out-1');
  const total = (LAB6_UNIT_PRICE * 5).toFixed(2);
  out.textContent =
    'POST /api/checkout  { quantity: 5 }\n200 OK\n' +
    JSON.stringify({ unit_price: LAB6_UNIT_PRICE.toFixed(2), quantity: 5, total }, null, 2);
}

function lab6_submitOrder() {
  const qty = parseInt(document.getElementById('lab6-qty').value, 10);
  const out = document.getElementById('lab6-out-2');
  if (Number.isNaN(qty)) {
    out.textContent = 'Enter a quantity.';
    return;
  }
  const total = (LAB6_UNIT_PRICE * qty).toFixed(2);
  const body = { unit_price: LAB6_UNIT_PRICE.toFixed(2), quantity: qty, total };
  if (qty < 0) {
    out.textContent =
      'POST /api/checkout  { quantity: ' + qty + ' }\n200 OK\n' +
      JSON.stringify(body, null, 2) +
      '\n\n[ANOMALY] Order total is negative — the API never rejected a negative quantity.\n' +
      'flag{negative_quantity_exploit}';
  } else {
    out.textContent = 'POST /api/checkout  { quantity: ' + qty + ' }\n200 OK\n' + JSON.stringify(body, null, 2);
  }
}

function lab6_applyPromo() {
  lab6_promoClicks++;
  const out = document.getElementById('lab6-out-3');
  const remainingTotal = Math.max(0, LAB6_UNIT_PRICE * 5 - lab6_promoClicks * 15).toFixed(2);
  if (lab6_promoClicks < 3) {
    out.textContent = `Promo "SAVE15" applied (${lab6_promoClicks}/∞ — no limit enforced). Running total: ${remainingTotal}`;
  } else {
    out.textContent =
      `Promo "SAVE15" applied ${lab6_promoClicks} times — nothing in the design stops repeat redemption.\n` +
      `Running total: ${remainingTotal}\n` +
      `flag{business_logic_bypass_checkout}`;
  }
}

const LAB6_STEPS = [
  {
    title: 'Read the checkout calculation',
    desc: 'ShopFast\'s cart multiplies unit price by quantity with no bounds checking anywhere in the design. Confirm the normal calculation first.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/store/api/checkout</div>
        <div class="fake-body">
          <div style="margin-bottom:12px;">Cart: 5 × Widget @ $49.00</div>
          <button class="btn btn-ghost" onclick="lab6_calcFixed()">Calculate total</button>
          <pre id="lab6-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Just click calculate — 5 × 49.00. Submit the total shown (no $ sign).',
  },
  {
    title: 'Break the business logic',
    desc: 'The quantity field accepts any integer — including negative ones — and nobody designed a check to prevent that. See what a negative quantity does to the total.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/store/api/checkout</div>
        <div class="fake-body">
          <div class="answer-row" style="margin-bottom:0;">
            <input id="lab6-qty" type="number" class="mono" value="5" />
            <button class="btn btn-ghost" onclick="lab6_submitOrder()">Submit order</button>
          </div>
          <pre id="lab6-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Try a negative number, like -5.',
  },
  {
    title: 'Chain it into a full bypass',
    desc: 'The promo code system was never designed with a redemption limit either. Stack it on top of the same flaw.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">POST shopfast.io/store/api/cart/promo</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab6_applyPromo()">Apply promo "SAVE15"</button>
          <pre id="lab6-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click "Apply promo" a few times in a row — nothing stops repeat use.',
  },
];

const LAB6_INTRO = {
  summary:
    "This lab covers a different flavor of Insecure Design: business logic that was never threat-modeled against abnormal input — like negative quantities or unlimited discount stacking. No single line of code is 'wrong'; the flaw is in what the design never anticipated.",
  vulnerableCode:
`function calculateTotal(price, qty) {
  return price * qty; // no bounds check — negative qty
                       // flips the sign of the whole order
}`,
  secureCode:
`function calculateTotal(price, qty) {
  if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) {
    throw new Error('Invalid quantity');
  }
  return price * qty;
}`,
};

const LAB6_REMEDIATION = [
  'Validate business-rule invariants explicitly (quantity > 0, discount ≤ max) — not just data types.',
  'Thread abuse cases through threat modeling: "what if this value is negative, huge, or repeated?"',
  'Enforce limits server-side — never trust that the UI alone will prevent abnormal input.',
  'Add rate or usage limits on sensitive actions like promo-code redemption.',
];
