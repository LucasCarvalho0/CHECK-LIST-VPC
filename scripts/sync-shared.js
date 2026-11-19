// Copia shared/*.ts para backend e frontend (fonte única de regras e catálogo).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const targets = [path.join(root, 'backend/src/shared'), path.join(root, 'frontend/lib/shared')];
const src = path.join(root, 'shared');
for (const t of targets) {
  fs.mkdirSync(t, { recursive: true });
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.ts'))) {
    fs.copyFileSync(path.join(src, f), path.join(t, f));
  }
}
console.log('shared sincronizado em', targets.map((t) => path.relative(root, t)).join(', '));
