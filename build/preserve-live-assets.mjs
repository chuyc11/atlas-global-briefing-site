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
const STALE_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_DIRECTORY_PATTERN = /^live-static-snapshot-\d+-\d+$/;

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

export async function cleanupStaleStaticAssetSnapshots(projectRoot, now = Date.now()) {
  const stateRoot = path.resolve(projectRoot, ".vinext");
  let entries;
  try {
    entries = await readdir(stateRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const removed = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SNAPSHOT_DIRECTORY_PATTERN.test(entry.name)) continue;
    const candidate = path.resolve(stateRoot, entry.name);
    // The recursive removal target must remain one direct child of .vinext.
    if (path.dirname(candidate) !== stateRoot) continue;
    try {
      const metadata = await stat(candidate);
      if (now - metadata.mtimeMs < STALE_SNAPSHOT_AGE_MS) continue;
      await rm(candidate, { recursive: true, force: true });
      removed.push(entry.name);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return removed.sort();
}

export async function snapshotCurrentStaticAssets(projectRoot) {
  await cleanupStaleStaticAssetSnapshots(projectRoot);
  const staticRoot = path.join(projectRoot, "dist", "client", "_next", "static");
  if (!(await exists(staticRoot))) return null;
  const configuredGenerations = await readRetainedGenerations(projectRoot);
  const currentFiles = await listFiles(staticRoot);
  const currentFileSet = new Set(currentFiles);
  // The retention manifest is mutable runtime state and can outlive a cleaned
  // dist directory.  Only accept paths that were independently enumerated from
  // the current static root; this both removes stale entries and prevents a
  // crafted manifest from turning copyFile into a path-traversal read.
  const retainedGenerations = configuredGenerations
    .map((generation) => [...new Set(generation.filter((relative) => currentFileSet.has(relative)))])
    .filter((generation) => generation.length);
  const retained = new Set(retainedGenerations.flat());
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
