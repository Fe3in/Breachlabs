// Lab 8 — A08:2021 Software or Data Integrity Failures

function lab8_scanPipeline() {
  const out = document.getElementById('lab8-out-1');
  out.textContent =
    '.ci/deploy.yml\n' +
    '  - run: npm install --no-audit\n' +
    '  - run: cp dist/* /var/www/prod/     # no checksum or signature check\n\n' +
    '[FINDING] The pipeline installs and deploys artifacts with zero integrity verification.\n' +
    'flag{missing_integrity_check}';
}

function lab8_verifyChecksum() {
  const out = document.getElementById('lab8-out-2');
  out.textContent =
    'expected_sha256 = 7a1c9e...d24f  (from the package registry manifest)\n' +
    'actual_sha256    = f30bd1...9e02  (of the file actually deployed)\n\n' +
    '[MISMATCH] The deployed artifact does not match its signed manifest —\n' +
    'nothing in the pipeline stopped it from shipping anyway.\n' +
    'flag{unsigned_artifact_deployed}';
}

function lab8_deployStatus() {
  const out = document.getElementById('lab8-out-3');
  out.textContent =
    'GET /ci/deployments/latest\n200 OK\n' +
    JSON.stringify(
      { artifact: 'app-v2.4.1.tar.gz', signature_verified: false, status: 'deployed to production' },
      null,
      2
    ) +
    '\n\nflag{supply_chain_compromise_confirmed}';
}

const LAB8_STEPS = [
  {
    title: 'Inspect the CI/CD pipeline',
    desc: 'This pipeline was never designed to verify what it deploys. Scan its config.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">.ci/deploy.yml</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab8_scanPipeline()">Scan pipeline config</button>
          <pre id="lab8-out-1" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the scan button — the finding at the bottom is your flag.',
  },
  {
    title: 'Verify the artifact checksum',
    desc: 'Compare the package that actually got deployed against its expected checksum from the registry.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">Artifact integrity check</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab8_verifyChecksum()">Verify checksum</button>
          <pre id="lab8-out-2" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click verify — a mismatch means the artifact was tampered with after signing.',
  },
  {
    title: 'Confirm the compromise',
    desc: 'Check whether the mismatched artifact from the last step actually made it to production.',
    simHtml: `
      <div class="fake-app">
        <div class="fake-topbar">GET shopfast.io/ci/deployments/latest</div>
        <div class="fake-body">
          <button class="btn btn-ghost" onclick="lab8_deployStatus()">Check deployment status</button>
          <pre id="lab8-out-3" class="mono" style="margin-top:12px; white-space:pre-wrap;"></pre>
        </div>
      </div>`,
    hint: 'Click the button — signature_verified: false is the key detail.',
  },
];

const LAB8_INTRO = {
  summary:
    "Software or Data Integrity Failures happen when a pipeline or update mechanism doesn't verify what it's actually deploying — letting a tampered dependency or build artifact reach production completely unnoticed.",
  vulnerableCode:
`- run: npm install
- run: cp dist/* /var/www/prod/
  # no checksum or signature verification anywhere`,
  secureCode:
`- run: npm ci --ignore-scripts        # lockfile-pinned install
- run: sha256sum -c artifact.sha256   # verify checksum
- run: cosign verify --key cosign.pub dist/app.tar.gz`,
};

const LAB8_REMEDIATION = [
  'Pin dependencies via lockfiles and verify checksums or signatures before deployment.',
  'Sign build artifacts and verify signatures at the deploy step, not just at build time.',
  'Restrict which pipelines can publish to production, and require approvals for changes.',
  'Maintain an SBOM and monitor for unexpected dependency changes (supply-chain scanning).',
];
