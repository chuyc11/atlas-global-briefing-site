import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MANIFEST_NAME = "retained-static-assets.json";
const MAX_RETAINED_GENERATIONS = 5;

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function listFiles(root, relative = "") {
  const directory = path.join(root, relative);
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    if (entry.isFile()) files.push(child.split(path.sep).join("/"));
  }
  return files;
}

async function readRetainedGenerations(projectRoot) {
  const manifestPath = path.join(projectRoot, ".vinext", MANIFEST_NAME);
  try {
    const payload = JSON.parse(await readFile(manifestPath, "utf8"));
    if (Array.isArray(payload.generations)) {
      return payload.generations
        .filter(Array.isArray)
        .map((generation) => generation.filter((item) => typeof item === "string"));
    }
    return Array.isArray(payload.paths) ? [payload.paths] : [];
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return [];
    throw error;
  }
}

export async function snapshotCurrentStaticAssets(projectRoot) {
  const staticRoot = path.join(projectRoot, "dist", "client", "_next", "static");
  if (!(await exists(staticRoot))) return null;
  const retainedGenerations = await readRetainedGenerations(projectRoot);
  const retained = new Set(retainedGenerations.flat());
  const currentFiles = await listFiles(staticRoot);
  const activeGeneration = currentFiles.filter((relative) => !retained.has(relative)).sort();
  const generations = [activeGeneration, ...retainedGenerations]
    .filter((generation) => generation.length)
    .slice(0, MAX_RETAINED_GENERATIONS);
  const files = [...new Set(generations.flat())].sort();
  if (!files.length) return null;
  const snapshotRoot = path.join(
    projectRoot,
    ".vinext",
    `live-static-snapshot-${process.pid}-${Date.now()}`,
  );
  for (const relative of files) {
    const destination = path.join(snapshotRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(staticRoot, relative), destination);
  }
  return { root: snapshotRoot, paths: files, generations };
}

export async function restorePreviousStaticAssets(projectRoot, snapshot) {
  if (!snapshot) return;
  const staticRoot = path.join(projectRoot, "dist", "client", "_next", "static");
  const manifestPath = path.join(projectRoot, ".vinext", MANIFEST_NAME);
  const restored = [];
  try {
    for (const relative of snapshot.paths) {
      const destination = path.join(staticRoot, relative);
      if (await exists(destination)) continue;
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(snapshot.root, relative), destination);
      restored.push(relative);
    }
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 2,
        maxGenerations: MAX_RETAINED_GENERATIONS,
        generations: snapshot.generations,
        paths: snapshot.paths,
        restoredPaths: restored.sort(),
      }, null, 2)}\n`,
      "utf8",
    );
  } finally {
    await rm(snapshot.root, { recursive: true, force: true });
  }
}
