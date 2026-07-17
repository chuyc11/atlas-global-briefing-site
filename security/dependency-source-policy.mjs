import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_ALLOWED_HOSTS = new Set(["registry.npmjs.org"]);
const REQUIRED_PACKAGE_MANAGER = "npm@10.9.2";

export function evaluatePackageManager(manifest) {
  if (!manifest || manifest.packageManager !== REQUIRED_PACKAGE_MANAGER) {
    return {
      passed: false,
      errors: [`package.json must pin packageManager to ${REQUIRED_PACKAGE_MANAGER}`],
    };
  }
  return { passed: true, errors: [] };
}

export function evaluateDependencySources(lockfile, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  const errors = [];
  const checked = [];
  if (
    !lockfile ||
    !Number.isInteger(lockfile.lockfileVersion) ||
    lockfile.lockfileVersion < 2 ||
    typeof lockfile.packages !== "object" ||
    lockfile.packages === null
  ) {
    return {
      passed: false,
      errors: ["package-lock.json must use lockfileVersion 2+ with a packages map"],
      checked,
    };
  }

  for (const [packagePath, metadata] of Object.entries(lockfile.packages)) {
    if (!metadata || typeof metadata !== "object") continue;
    const resolved = metadata.resolved;
    if (resolved === undefined) continue;
    if (typeof resolved !== "string" || resolved.length === 0) {
      errors.push(`${packagePath || "<root>"} has an invalid resolved source`);
      continue;
    }

    let parsed;
    try {
      parsed = new URL(resolved);
    } catch {
      errors.push(`${packagePath || "<root>"} uses a non-URL dependency source: ${resolved}`);
      continue;
    }
    checked.push({ packagePath, resolved, host: parsed.hostname.toLowerCase() });
    if (parsed.protocol !== "https:") {
      errors.push(`${packagePath || "<root>"} must use HTTPS: ${resolved}`);
    }
    if (parsed.username || parsed.password) {
      errors.push(`${packagePath || "<root>"} embeds credentials in its dependency source`);
    }
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
      errors.push(
        `${packagePath || "<root>"} uses unsupported registry host ${parsed.hostname}`,
      );
    }
    if (typeof metadata.integrity !== "string" || !metadata.integrity.startsWith("sha512-")) {
      errors.push(`${packagePath || "<root>"} is missing a SHA-512 integrity value`);
    }
  }

  return { passed: errors.length === 0, errors, checked };
}

function main() {
  let lockfile;
  let manifest;
  try {
    lockfile = JSON.parse(
      readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
    );
    manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
  } catch (error) {
    console.error(`unable to read dependency metadata: ${error.message}`);
    return 2;
  }
  const managerResult = evaluatePackageManager(manifest);
  if (!managerResult.passed) {
    for (const error of managerResult.errors) console.error(error);
    return 1;
  }
  const result = evaluateDependencySources(lockfile);
  if (!result.passed) {
    for (const error of result.errors) console.error(error);
    return 1;
  }
  console.log(
    `dependency source policy passed (${result.checked.length} registry artifacts)`,
  );
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main();
}
