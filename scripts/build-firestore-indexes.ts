// Using CommonJS style imports to avoid Node ESM warning without changing package.json type
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

interface IndexSpec { indexes?: any[]; fieldOverrides?: any[] }

const root: string = process.cwd();
const partsDir: string = path.join(root, 'firestore', 'indexes');
const targetFile: string = path.join(root, 'firestore.indexes.json');

function load(file: string): IndexSpec {
  const full = path.join(partsDir, file);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw) as IndexSpec;
}

const partFiles: string[] = fs
  .readdirSync(partsDir)
  .filter((f: string) => f.endsWith('.json'))
  .sort();

const combined: IndexSpec = { indexes: [], fieldOverrides: [] };
for (const f of partFiles) {
  const spec = load(f);
  if (spec.indexes) combined.indexes!.push(...spec.indexes);
  if (spec.fieldOverrides) combined.fieldOverrides!.push(...spec.fieldOverrides);
}

// De-duplicate indexes by JSON signature
const seen = new Set<string>();
combined.indexes = combined.indexes!.filter(idx => {
  const key = JSON.stringify(idx);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Preserve existing fieldOverrides from root file if present
try {
  if (fs.existsSync(targetFile)) {
    const existing = JSON.parse(fs.readFileSync(targetFile, 'utf8')) as IndexSpec;
    if (existing.fieldOverrides && existing.fieldOverrides.length) {
      for (const fo of existing.fieldOverrides) {
        const k = JSON.stringify(fo);
        if (!combined.fieldOverrides!.some(x => JSON.stringify(x) === k)) {
          combined.fieldOverrides!.push(fo);
        }
      }
    }
  }
} catch {}

fs.writeFileSync(targetFile, JSON.stringify(combined, null, 2) + '\n');
console.log(`Merged ${partFiles.length} index fragments -> firestore.indexes.json with ${combined.indexes?.length} indexes.`);
