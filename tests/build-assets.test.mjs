import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
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
