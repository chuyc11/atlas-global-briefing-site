import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAudit } from "../security/audit-policy.mjs";

const vulnerableAudit = {
  auditReportVersion: 2,
  vulnerabilities: {
    package: {
      severity: "moderate",
      via: [{ source: 1, severity: "moderate", title: "unsafe parser", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" }],
    },
  },
};

test("unexcepted advisories fail closed", () => {
  const result = evaluateAudit(vulnerableAudit, { exceptions: [] }, "2026-07-16");
  assert.equal(result.passed, false);
  assert.match(result.errors[0], /GHSA-AAAA-BBBB-CCCC/);
});

test("current moderate exception is honored but high is never excepted", () => {
  const policy = { exceptions: [{ advisory: "GHSA-AAAA-BBBB-CCCC", owner: "security", rationale: "isolated", expiresAt: "2026-07-17" }] };
  assert.equal(evaluateAudit(vulnerableAudit, policy, "2026-07-16").passed, true);
  vulnerableAudit.vulnerabilities.package.via[0].severity = "high";
  assert.equal(evaluateAudit(vulnerableAudit, policy, "2026-07-16").passed, false);
  vulnerableAudit.vulnerabilities.package.via[0].severity = "moderate";
});

test("expired and stale exceptions fail", () => {
  const expired = { exceptions: [{ advisory: "GHSA-AAAA-BBBB-CCCC", owner: "security", rationale: "isolated", expiresAt: "2026-07-15" }] };
  assert.equal(evaluateAudit(vulnerableAudit, expired, "2026-07-16").passed, false);
  const stale = { exceptions: [{ advisory: "GHSA-DDDD-EEEE-FFFF", owner: "security", rationale: "isolated", expiresAt: "2026-07-17" }] };
  assert.equal(evaluateAudit({ auditReportVersion: 2, vulnerabilities: {} }, stale, "2026-07-16").passed, false);
});
