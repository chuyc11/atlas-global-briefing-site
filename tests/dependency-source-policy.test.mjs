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
