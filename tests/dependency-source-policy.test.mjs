import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluateDependencySources,
  evaluatePackageManager,
} from "../security/dependency-source-policy.mjs";

function lockWith(resolved, integrity = "sha512-test") {
  return {
    lockfileVersion: 3,
    packages: {
      "": {},
      "node_modules/example": { resolved, integrity },
    },
  };
}

test("accepts only integrity-pinned npm registry artifacts", () => {
  const result = evaluateDependencySources(
    lockWith("https://registry.npmjs.org/example/-/example-1.0.0.tgz"),
  );
  assert.equal(result.passed, true);
  assert.equal(result.checked.length, 1);
});

test("rejects mirrors, insecure URLs, credentials, and non-URL sources", () => {
  for (const resolved of [
    "https://registry.npmmirror.com/example/-/example-1.0.0.tgz",
    "http://registry.npmjs.org/example/-/example-1.0.0.tgz",
    "https://token@registry.npmjs.org/example/-/example-1.0.0.tgz",
    "git+https://github.com/example/example.git",
  ]) {
    assert.equal(evaluateDependencySources(lockWith(resolved)).passed, false, resolved);
  }
});

test("rejects remote artifacts without SHA-512 integrity", () => {
  const result = evaluateDependencySources(
    lockWith("https://registry.npmjs.org/example/-/example-1.0.0.tgz", ""),
  );
  assert.equal(result.passed, false);
  assert.match(result.errors.join("\n"), /SHA-512/);
});

test("pins the npm major used by the hosted Sites builder", () => {
  assert.equal(
    evaluatePackageManager({ packageManager: "npm@10.9.2" }).passed,
    true,
  );
  assert.equal(
    evaluatePackageManager({ packageManager: "npm@11.6.2" }).passed,
    false,
  );
});

test("current package lock satisfies the release policy", async () => {
  const lockfile = JSON.parse(
    await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  const result = evaluateDependencySources(lockfile);
  assert.equal(result.passed, true, result.errors.slice(0, 10).join("\n"));
});

test("security-sensitive dependency pins stay above the remediated releases", async () => {
  const [manifest, lockfile] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.deepEqual(manifest.overrides, {
    postcss: "8.5.24",
    sharp: "0.35.3",
    "fast-uri": "4.1.1",
    minimatch: "10.2.5",
  });
  assert.equal(manifest.dependencies.next, "16.2.12");
  assert.equal(manifest.dependencies.react, "19.2.8");
  assert.equal(manifest.dependencies["react-dom"], "19.2.8");
  assert.equal(manifest.devDependencies["eslint-config-next"], "16.2.12");
  assert.equal(manifest.devDependencies["react-server-dom-webpack"], "19.2.8");

  for (const [path, version] of Object.entries({
    "node_modules/next": "16.2.12",
    "node_modules/react": "19.2.8",
    "node_modules/react-dom": "19.2.8",
    "node_modules/react-server-dom-webpack": "19.2.8",
    "node_modules/postcss": "8.5.24",
    "node_modules/sharp": "0.35.3",
    "node_modules/fast-uri": "4.1.1",
    "node_modules/minimatch": "10.2.5",
  })) {
    assert.equal(lockfile.packages[path]?.version, version, path);
  }
});
