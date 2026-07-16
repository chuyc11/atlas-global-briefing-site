import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the ATLAS briefing", async () => {
  const payload = JSON.parse(
    await readFile(new URL("../app/briefing.generated.json", import.meta.url), "utf8"),
  );
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=86400");
  const policy = response.headers.get("content-security-policy") ?? "";
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /script-src 'self' 'nonce-[A-Za-z0-9+/_-]+' 'strict-dynamic'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);

  const html = await response.text();
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/gi)];
  assert.ok(inlineScripts.length > 0);
  assert.ok(inlineScripts.every((match) => match[1].includes(`nonce="${nonce}"`)));
  assert.match(html, /<title>ATLAS｜全球决策晨报<\/title>/i);
  assert.match(html, /ATLAS/);
  assert.match(html, new RegExp(`data-atlas-report-date="${payload.reportDate}"`));
  assert.match(html, new RegExp(`data-atlas-content-hash="${payload.contentHash}"`));
  assert.match(html, /GLOBAL INTELLIGENCE/);
  assert.ok(html.includes(payload.hero.editorNote));
  assert.match(html, /今天必须知道的/);
  assert.match(html, /查看完整分析/);
  assert.match(html, /运行闭环/);
  assert.match(html, /公开聚合视图/);
  assert.doesNotMatch(html, /codex-preview|Codex is working|react-loading-skeleton/i);
});

test("uses generated briefing data without starter preview residue", async () => {
  const [page, layout, generated, runner] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/briefing.generated.json", import.meta.url), "utf8"),
    readFile(new URL("../build/run-vinext.mjs", import.meta.url), "utf8"),
  ]);

  const payload = JSON.parse(generated);
  assert.match(page, /import generated from "\.\/briefing\.generated\.json"/);
  assert.match(layout, /ATLAS｜全球决策晨报/);
  assert.match(runner, /WRANGLER_LOG_PATH/);
  assert.match(payload.reportDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(payload.schemaVersion, 4);
  assert.ok(Array.isArray(payload.events) && payload.events.length > 0);
  assert.ok(payload.events.length >= 5 && payload.events.length <= 7);
  assert.ok(payload.scenarios.length > 0 && payload.scenarios.length <= 7);
  assert.ok(payload.sources.length >= 10);
  assert.equal(new Set(payload.events.map((item) => item.id)).size, payload.events.length);
  assert.ok(payload.events.every((item) => item.body.length >= 12));
  assert.ok(payload.events.every((item) => item.facts.length > 0));
  assert.ok(payload.events.every((item) => item.sources.length > 0));
  assert.ok(payload.events.every((item) => item.verificationSignals.length > 0));
  assert.ok(payload.scenarios.every((item) => item.sourceRefs.length > 0));
  const eventsByCategory = new Map(payload.events.map((item) => [item.category, item]));
  assert.equal(eventsByCategory.get("科技")?.predictionId, "");
  assert.doesNotMatch(eventsByCategory.get("科技")?.analysis ?? "", /510300\.SH|588000\.SH/);
  assert.ok(payload.scenarios.every((item) => item.id.startsWith(`${payload.reportDate}-P`)));
  assert.ok(
    payload.scenarios.every((item) =>
      item.sourceRefs.every((source) => /^https?:\/\//.test(source.href)),
    ),
  );
  assert.ok(
    payload.scenarios.every(
      (item) => new Set(item.sourceRefs.map((source) => source.href)).size === item.sourceRefs.length,
    ),
  );
  for (const portfolio of [payload.portfolios.us, payload.portfolios.china]) {
    assert.equal(portfolio.publicDataOnly, true);
    assert.equal(portfolio.paperTradingOnly, true);
    for (const field of ["accountId", "positions", "cash", "equity", "realizedPnl", "initialCash"]) {
      assert.equal(Object.hasOwn(portfolio, field), false, `public portfolio leaked ${field}`);
    }
  }
  assert.equal(Object.hasOwn(payload.system.ledger, "contentHash"), false);
  assert.equal(Object.hasOwn(payload.system.ledger, "accountCount"), false);
  assert.doesNotMatch(generated, /[A-Za-z]:\\\\(?:Users|Documents)\\|\/(?:Users|home)\//i);
  assert.equal(payload.system.boundary.realBrokerOrdersAllowed, false);
  assert.ok(payload.system.selfHealing);
  assert.equal(payload.system.boundary.sourceCodeAutoModified, false);
  assert.equal(payload.system.boundary.productionAutoDeployed, false);
  assert.ok(payload.system.improvements);
  assert.equal(typeof payload.system.improvements.status, "string");
  assert.equal(payload.evolution.mode, "gated_self_evolution");
  assert.equal(payload.evolution.state, "shadow");
  assert.equal(payload.evolution.boundary.auto_promote_strategy, false);
  assert.ok(payload.evolution.active_rules.length > 0);
  assert.equal(payload.reportQuality.passed, true);
  assert.equal(payload.reportQuality.fillerCount, 0);
  assert.ok(payload.reportQuality.characterCount >= payload.reportQuality.minimumCharacters);
  assert.ok(payload.reportQuality.characterCount <= payload.reportQuality.maximumCharacters);
  assert.ok(new Set(payload.events.map((item) => item.implication)).size > 1);
  assert.ok(payload.events.every((item) => /^(https?:\/\/|#[A-Za-z])/.test(item.href)));
  assert.notEqual(payload.hero.headline.join(""), payload.hero.dek);
  assert.notEqual(payload.hero.dek, payload.hero.editorNote);
  assert.ok(
    payload.events.every(
      (item) => !/^(结论|确认事实|分析判断|判断)[：:]/.test(item.cardTitle),
    ),
  );
  assert.doesNotMatch(generated, /｜｜/);

  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});

test("hardens image-optimizer error responses", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `image-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/_vinext/image"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.ok(response.status >= 400);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=86400");
});
