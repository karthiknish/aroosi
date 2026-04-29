import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(currentFile);
const webDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(webDir, "../..");
const rootPackageJsonPath = path.join(repoRoot, "package.json");
const rootPackageLockPath = path.join(repoRoot, "package-lock.json");

function pruneRootPackageManifest(source) {
  const manifest = JSON.parse(source);
  manifest.workspaces = ["apps/web", "packages/*"];
  return `${JSON.stringify(manifest, null, 4)}\n`;
}

function pruneRootLockfile(source) {
  const lock = JSON.parse(source);

  if (lock.packages?.[""]?.workspaces) {
    lock.packages[""].workspaces = ["apps/web", "packages/*"];
  }

  if (lock.packages) {
    for (const key of Object.keys(lock.packages)) {
      if (
        key === "apps/mobile" ||
        key === "node_modules/@aroosi/mobile" ||
        key.startsWith("apps/mobile/")
      ) {
        delete lock.packages[key];
      }
    }
  }

  return `${JSON.stringify(lock, null, 4)}\n`;
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build:raw"], {
      cwd: webDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`build:raw exited with code ${code ?? 1}`));
    });
  });
}

async function main() {
  const originalPackageJson = await readFile(rootPackageJsonPath, "utf8");
  const originalPackageLock = await readFile(rootPackageLockPath, "utf8");
  const shouldRestore = process.env.VERCEL !== "1";

  await writeFile(rootPackageJsonPath, pruneRootPackageManifest(originalPackageJson));
  await writeFile(rootPackageLockPath, pruneRootLockfile(originalPackageLock));

  try {
    await runBuild();
  } finally {
    if (shouldRestore) {
      await writeFile(rootPackageJsonPath, originalPackageJson);
      await writeFile(rootPackageLockPath, originalPackageLock);
    }
  }
}

main().catch((error) => {
  console.error("[vercel-build] failed", error);
  process.exit(1);
});