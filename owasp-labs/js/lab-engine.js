// Generic multi-step lab runner. Each lab's HTML page defines its own
// `steps` array (title/description/hint/simulated environment markup) and
// calls LabEngine.init({ labId, steps }). Flags are never present in this
// file or any lab file — every submission is verified server-side via the
// submit_flag() Postgres function, which is the only thing that can read
// the lab_flags table.

const LabEngine = (() => {
  let session = null;
  let labId = null;
  let steps = [];
  let progress = { current_step: 1, completed: false };

  async function loadProgress() {
    const { data } = await sb
      .from('user_progress')
      .select('current_step, completed')
      .eq('user_id', session.user.id)
      .eq('lab_id', labId)
      .maybeSingle();
    if (data) progress = data;
  }

  function renderTrack() {
    const track = document.getElementById('step-track');
    if (!track) return;
    track.innerHTML = steps
      .map((_, i) => {
        const n = i + 1;
        let cls = '';
        if (n < progress.current_step || (progress.completed && n <= steps.length)) cls = 'done';
        else if (n === progress.current_step) cls = 'active';
        return `<div class="step-dot ${cls}"></div>`;
      })
      .join('');
  }

  function panelHtml(step, index) {
    const n = index + 1;
    const isDone = n < progress.current_step || progress.completed;
    const isActive = n === progress.current_step && !progress.completed;
    const isLocked = !isDone && !isActive;

    if (isLocked) {
      return `
        <div class="step-panel" style="opacity:0.5">
          <div class="step-label"><span class="n">${n}</span> STEP ${n} — LOCKED</div>
          <p class="locked-note">Complete step ${n - 1} to unlock this stage.</p>
        </div>`;
    }

    return `
      <div class="step-panel ${isDone ? 'done' : ''}" id="panel-${n}">
        <div class="step-label"><span class="n">${isDone ? '✓' : n}</span> STEP ${n}${isDone ? ' — CLEARED' : ''}</div>
        <h3>${step.title}</h3>
        <p class="desc">${step.desc}</p>
        ${step.simHtml ? `<div class="sim-box"><div class="sim-title">Simulated environment</div>${step.simHtml}</div>` : ''}
        ${step.hint ? `
          <span class="hint-toggle" data-target="hint-${n}">▸ show hint</span>
          <div class="hint-box" id="hint-${n}">${step.hint}</div>
        ` : ''}
        ${isDone ? `<div class="step-feedback ok show">✓ Flag accepted.</div>` : `
          <div class="answer-row">
            <input type="text" id="answer-${n}" class="mono" placeholder="Submit flag or value for this step..." autocomplete="off" />
            <button class="btn btn-primary" id="submit-${n}">Submit</button>
          </div>
          <div class="step-feedback" id="feedback-${n}"></div>
        `}
      </div>`;
  }

  function render() {
    const container = document.getElementById('steps-root');
    if (!container) return;
    container.innerHTML = steps.map(panelHtml).join('');
    renderTrack();
    wireHints();
    wireSubmit();
    runAfterRenderHooks();
    renderCompletionBanner();
  }

  // Some steps need JS to run once their markup is in the DOM (e.g. populating
  // a list of buttons). <script> tags inside innerHTML never execute, so
  // steps can instead define `afterRender()` and we call it here for any
  // panel that's actually visible (done or active, not locked).
  function runAfterRenderHooks() {
    steps.forEach((step, i) => {
      const n = i + 1;
      const isDone = n < progress.current_step || progress.completed;
      const isActive = n === progress.current_step && !progress.completed;
      if ((isDone || isActive) && typeof step.afterRender === 'function') {
        step.afterRender();
      }
    });
  }

  function wireHints() {
    document.querySelectorAll('.hint-toggle').forEach((el) => {
      el.addEventListener('click', () => {
        const box = document.getElementById(el.dataset.target);
        box.classList.toggle('show');
        el.textContent = box.classList.contains('show') ? '▾ hide hint' : '▸ show hint';
      });
    });
  }

  function wireSubmit() {
    steps.forEach((_, i) => {
      const n = i + 1;
      const btn = document.getElementById(`submit-${n}`);
      if (!btn) return;
      btn.addEventListener('click', () => handleSubmit(n));
      document.getElementById(`answer-${n}`)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit(n);
      });
    });
  }

  async function handleSubmit(n) {
    const input = document.getElementById(`answer-${n}`);
    const feedback = document.getElementById(`feedback-${n}`);
    const btn = document.getElementById(`submit-${n}`);
    const val = input.value.trim();
    if (!val) return;

    btn.disabled = true;
    btn.textContent = 'Checking...';

    const { data, error } = await sb.rpc('submit_flag', {
      p_lab_id: labId,
      p_step: n,
      p_answer: val,
    });

    btn.disabled = false;
    btn.textContent = 'Submit';

    if (error) {
      feedback.textContent = '✗ ' + error.message;
      feedback.className = 'step-feedback err show';
      return;
    }

    if (!data.correct) {
      feedback.textContent = '✗ Incorrect. Try again.';
      feedback.className = 'step-feedback err show';
      input.value = '';
      return;
    }

    progress.current_step = Math.min(n + 1, steps.length);
    if (data.completed) progress.completed = true;
    render();
  }

  function renderCompletionBanner() {
    const el = document.getElementById('lab-complete-banner');
    if (!el) return;
    el.style.display = progress.completed ? 'block' : 'none';
  }

  return {
    async init(config) {
      labId = config.labId;
      steps = config.steps;
      session = await requireAuth(config.signinPath || '../auth/signin.html');
      if (!session) return;
      await loadProgress();
      render();
    },
  };
})();
