/**
 * Post-build asset copier.
 *
 * `tsc` only emits JavaScript — non-TypeScript assets such as GeoJSON fixtures
 * are left behind. Without this step, `node dist/index.js` cannot read any map
 * layer or serve any download in production.
 *
 * Run automatically via `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(SERVER_ROOT, 'src', 'fixtures');
const TARGET = path.join(SERVER_ROOT, 'dist', 'fixtures');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let files = 0;

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);

    if (entry.isDirectory()) {
      files += copyDir(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
      files += 1;
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`[copy-assets] Source fixtures directory not found: ${SOURCE}`);
    process.exitCode = 1;
    return;
  }

  const count = copyDir(SOURCE, TARGET);
  console.log(`[copy-assets] Copied ${count} fixture file(s) → ${path.relative(SERVER_ROOT, TARGET)}`);

  // The 8 SDG documents are genuinely unavailable upstream. Report this so the
  // gap stays visible instead of being silently "fixed" with dummy files.
  const docsDir = path.join(TARGET, 'documents');
  const docCount = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter((f) => fs.statSync(path.join(docsDir, f)).isFile()).length
    : 0;

  if (docCount === 0) {
    console.log('[copy-assets] documents/ is empty — official PDFs not yet published (expected).');
  }
}

main();
