import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

function advisoryId(item) {
  const match = String(item.url ?? "").match(/(GHSA-[\w-]+)/i);
  return match?.[1]?.toUpperCase() ?? `npm-${item.source}`;
}

export function evaluateAudit(audit, policy, today = new Date().toISOString().slice(0, 10)) {
  if (audit?.auditReportVersion !== 2 || typeof audit.vulnerabilities !== "object") {
    return { passed: false, errors: ["npm audit did not return a version 2 vulnerability report"], advisories: [] };
  }

  const exceptions = new Map();
  const errors = [];
  for (const exception of policy?.exceptions ?? []) {
    if (!exception.advisory || !exception.owner || !exception.rationale || !exception.expiresAt) {
      errors.push(`invalid exception record: ${exception.advisory ?? "unknown"}`);
      continue;
    }
    if (exception.expiresAt < today) {
      errors.push(`expired exception: ${exception.advisory} (${exception.expiresAt})`);
      continue;
    }
    exceptions.set(String(exception.advisory).toUpperCase(), exception);
  }

  const advisories = [];
  const seen = new Set();
  for (const [dependency, vulnerability] of Object.entries(audit.vulnerabilities)) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== "object" || via === null) continue;
      const id = advisoryId(via);
      if (seen.has(id)) continue;
      seen.add(id);
      const severity = String(via.severity ?? vulnerability.severity ?? "critical").toLowerCase();
      const excepted = exceptions.has(id) && (SEVERITY_RANK[severity] ?? 4) < SEVERITY_RANK.high;
      advisories.push({ id, dependency, severity, title: via.title, excepted });
      if (!excepted) errors.push(`${severity} ${id}: ${dependency} - ${via.title}`);
    }
  }

  for (const id of exceptions.keys()) {
    if (!seen.has(id)) errors.push(`stale exception no longer present in npm audit: ${id}`);
  }
  return { passed: errors.length === 0, errors, advisories };
}

function main() {
  const policy = JSON.parse(readFileSync(new URL("./npm-audit-exceptions.json", import.meta.url), "utf8"));
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("npm_execpath is unavailable; run this policy through `npm run audit:policy`");
    return 2;
  }
  const completed = spawnSync(
    process.execPath,
    [npmCli, "audit", "--json", "--registry=https://registry.npmjs.org"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  let audit;
  try {
    audit = JSON.parse(completed.stdout);
  } catch {
    console.error(completed.stderr || completed.stdout || "npm audit produced no JSON output");
    return 2;
  }
  const result = evaluateAudit(audit, policy);
  if (!result.passed) {
    for (const error of result.errors) console.error(error);
    return 1;
  }
  console.log(`npm audit policy passed (${result.advisories.length} active advisories)`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main();
}
