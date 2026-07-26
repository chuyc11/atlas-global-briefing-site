import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  cleanupStaleStaticAssetSnapshots,
  restorePreviousStaticAssets,
  snapshotCurrentStaticAssets,
} from "../build/preserve-live-assets.mjs";

test("production builds retain bounded previous static asset generations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "atlas-live-assets-"));
  const staticRoot = path.join(root, "dist", "client", "_next", "static");
  const stateRoot = path.join(root, ".vinext");
  try {
    await mkdir(path.join(staticRoot, "chunks"), { recursive: true });
    await writeFile(path.join(staticRoot, "chunks", "old.js"), "old", "utf8");
    const snapshot = await snapshotCurrentStaticAssets(root);

    await rm(staticRoot, { recursive: true, force: true });
    await mkdir(path.join(staticRoot, "chunks"), { recursive: true });
    await writeFile(path.join(staticRoot, "chunks", "new.js"), "new", "utf8");
    await restorePreviousStaticAssets(root, snapshot);

    assert.equal(await readFile(path.join(staticRoot, "chunks", "old.js"), "utf8"), "old");
    assert.equal(await readFile(path.join(staticRoot, "chunks", "new.js"), "utf8"), "new");
    const manifest = JSON.parse(await readFile(path.join(stateRoot, "retained-static-assets.json"), "utf8"));
    assert.deepEqual(manifest.paths, ["chunks/old.js"]);
    assert.deepEqual(manifest.generations, [["chunks/old.js"]]);

    const secondSnapshot = await snapshotCurrentStaticAssets(root);
    await rm(staticRoot, { recursive: true, force: true });
    await mkdir(path.join(staticRoot, "chunks"), { recursive: true });
    await writeFile(path.join(staticRoot, "chunks", "newest.js"), "newest", "utf8");
    await restorePreviousStaticAssets(root, secondSnapshot);

    assert.equal(await readFile(path.join(staticRoot, "chunks", "old.js"), "utf8"), "old");
    assert.equal(await readFile(path.join(staticRoot, "chunks", "new.js"), "utf8"), "new");
    assert.equal(await readFile(path.join(staticRoot, "chunks", "newest.js"), "utf8"), "newest");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("static snapshots ignore stale and out-of-root manifest entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "atlas-live-assets-stale-"));
  const staticRoot = path.join(root, "dist", "client", "_next", "static");
  const stateRoot = path.join(root, ".vinext");
  try {
    await mkdir(path.join(staticRoot, "chunks"), { recursive: true });
    await mkdir(stateRoot, { recursive: true });
    await writeFile(path.join(staticRoot, "chunks", "live.js"), "live", "utf8");
    await writeFile(
      path.join(stateRoot, "retained-static-assets.json"),
      `${JSON.stringify({
        schemaVersion: 2,
        generations: [["chunks/live.js", "missing.js", "../../outside.txt"]],
      })}\n`,
      "utf8",
    );

    const snapshot = await snapshotCurrentStaticAssets(root);
    assert.deepEqual(snapshot.paths, ["chunks/live.js"]);
    assert.deepEqual(snapshot.generations, [["chunks/live.js"]]);
    assert.equal(await readFile(path.join(snapshot.root, "chunks", "live.js"), "utf8"), "live");
    await restorePreviousStaticAssets(root, snapshot);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("lint excludes generated vinext state and retained production snapshots", async () => {
  const config = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");

  assert.match(config, /["']\.vinext\/\*\*["']/);
});

test("snapshot cleanup removes only stale direct vinext build snapshots", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "atlas-live-assets-cleanup-"));
  const stateRoot = path.join(root, ".vinext");
  const stale = path.join(stateRoot, "live-static-snapshot-101-1000");
  const fresh = path.join(stateRoot, "live-static-snapshot-202-2000");
  const unrelated = path.join(stateRoot, "dev");
  try {
    await mkdir(stale, { recursive: true });
    await mkdir(fresh, { recursive: true });
    await mkdir(unrelated, { recursive: true });
    await writeFile(path.join(stale, "old.js"), "old", "utf8");
    const now = new Date("2026-07-22T12:00:00Z");
    const old = new Date("2026-07-20T12:00:00Z");
    await utimes(stale, old, old);

    const removed = await cleanupStaleStaticAssetSnapshots(root, now.getTime());

    assert.deepEqual(removed, ["live-static-snapshot-101-1000"]);
    await assert.rejects(stat(stale), { code: "ENOENT" });
    assert.equal((await stat(fresh)).isDirectory(), true);
    assert.equal((await stat(unrelated)).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
