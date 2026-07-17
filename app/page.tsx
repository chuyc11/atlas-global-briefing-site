"use client";

import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import generated from "./briefing.generated.json";

type SourceRef = { label: string; href: string };
type BriefEvent = (typeof generated.events)[number];
type Scenario = (typeof generated.scenarios)[number];
type Portfolio = typeof generated.portfolios.us;
type EventScoring = {
  eligible_sample_count?: number;
  matured_v2_prediction_count?: number;
  brier_score?: number | null;
  resolved_coverage_pct?: number;
};
type MarketMappingScoring = {
  matured_mapping_count?: number;
  resolved_mapping_count?: number;
  resolved_coverage_pct?: number;
  hit_rate_pct?: number | null;
};
type EvolutionWithSeparateScoring = typeof generated.evolution & {
  event_scoring?: EventScoring;
  proper_scoring?: EventScoring;
  market_mapping_scoring?: MarketMappingScoring;
};
type SystemWithExplicitGates = typeof generated.system & {
  operationalGatePassed?: boolean;
  releaseCandidatePassed?: boolean;
  researchPromotionPassed?: boolean;
};

const events = generated.events as BriefEvent[];
const scenarios = generated.scenarios as Scenario[];
const watchItems = generated.watchlist;
const filters = ["全部", ...Array.from(new Set(events.map((item) => item.category)))];
const selfHealing = generated.system.selfHealing;
const improvements = generated.system.improvements;
const systemStatus = generated.system as SystemWithExplicitGates;
const operationalGatePassed = systemStatus.operationalGatePassed ?? systemStatus.overallPassed;
const releaseCandidatePassed = systemStatus.releaseCandidatePassed ?? false;
const researchPromotionPassed = systemStatus.researchPromotionPassed ?? false;
const evolution = generated.evolution as EvolutionWithSeparateScoring;
const eventScoring = evolution.event_scoring ?? evolution.proper_scoring ?? {};
const marketMappingScoring = evolution.market_mapping_scoring ?? {};

function metric(value: number | null | undefined, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "N/A";
}

function money(value: number | null | undefined, currency: string, signed = false): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const prefix = signed ? (value > 0 ? "+" : value < 0 ? "−" : "") : value < 0 ? "−" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${prefix}${formatted} ${currency}`;
}

function safePublicHref(value: string): string {
  if (/^#[A-Za-z][A-Za-z0-9_-]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "#sources";
  } catch {
    return "#sources";
  }
}

function SourceLink({ source, className = "" }: { source: SourceRef; className?: string }) {
  const href = safePublicHref(source.href);
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a className={className} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {source.label} <span aria-hidden="true">↗</span>
    </a>
  );
}

function DetailList({ items }: { items: readonly string[] }) {
  if (!items.length) return <p className="detail-empty">本期没有足够证据形成结构化结论。</p>;
  return <ul className="detail-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function readStoredChecklist(): number[] {
  try {
    const stored = window.localStorage.getItem(`atlas-watch-${generated.reportDate}`);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter(
      (item): item is number => Number.isInteger(item) && item >= 0 && item < watchItems.length,
    )));
  } catch {
    return [];
  }
}

function trapDialogFocus(keyboardEvent: ReactKeyboardEvent<HTMLElement>) {
  if (keyboardEvent.key !== "Tab") return;
  const focusable = Array.from(
    keyboardEvent.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
  if (!focusable.length) {
    keyboardEvent.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (keyboardEvent.shiftKey && document.activeElement === first) {
    keyboardEvent.preventDefault();
    last.focus();
  } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
    keyboardEvent.preventDefault();
    first.focus();
  }
}

function EventDialog({ event, onClose }: { event: BriefEvent; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="detail-backdrop" onMouseDown={(mouseEvent) => mouseEvent.currentTarget === mouseEvent.target && onClose()}>
      <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="event-detail-title" onKeyDown={trapDialogFocus}>
        <header className="detail-header">
          <div>
            <span>{event.category} · {event.horizon} · {event.confidence}置信</span>
            <small>{event.predictionId || "研究事件"}</small>
          </div>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="关闭详细分析">×</button>
        </header>
        <div className="detail-scroll">
          <p className="section-number">FULL ANALYSIS</p>
          <h2 id="event-detail-title">{event.title}</h2>
          <p className="detail-lead">{event.body}</p>
          <div className="analysis-callout"><b>核心判断</b><p>{event.analysis}</p></div>

          <div className="detail-columns">
            <section><h3>已确认事实</h3><DetailList items={event.facts} /></section>
            <section><h3>驱动与传导</h3><DetailList items={event.drivers} /></section>
            <section><h3>潜在受益</h3><DetailList items={event.beneficiaries} /></section>
            <section><h3>承压与反方风险</h3><DetailList items={event.pressures} /></section>
          </div>

          <section className="verification-block">
            <h3>下一步验证信号</h3>
            <DetailList items={event.verificationSignals} />
          </section>

          {event.instruments.length > 0 && (
            <section className="instrument-section">
              <h3>观察标的与证伪条件</h3>
              <div className="instrument-table">
                {event.instruments.map((instrument) => (
                  <div className="instrument-row" key={`${event.id}-${instrument.symbol}`}>
                    <strong>{instrument.symbol}</strong>
                    <span>{instrument.thesis}</span>
                    <small>{instrument.risk}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="detail-sources">
            <h3>证据来源</h3>
            <div>{event.sources.map((source) => <SourceLink source={source} key={source.href} />)}</div>
          </section>
        </div>
      </section>
    </div>
  );
}

function PortfolioDialog({ portfolio, onClose }: { portfolio: Portfolio; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="detail-backdrop" onMouseDown={(mouseEvent) => mouseEvent.currentTarget === mouseEvent.target && onClose()}>
      <section className="detail-panel portfolio-detail" role="dialog" aria-modal="true" aria-labelledby="portfolio-detail-title" onKeyDown={trapDialogFocus}>
        <header className="detail-header">
          <div><span>虚拟账户公开摘要</span><small>账户总额公开，持仓成本与编号隐藏</small></div>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="关闭组合详情">×</button>
        </header>
        <div className="detail-scroll">
          <p className="section-number">VIRTUAL PORTFOLIO</p>
          <h2 id="portfolio-detail-title">{portfolio.name}</h2>
          <p className="detail-lead">{portfolio.review}</p>
          <div className="portfolio-facts">
            <div><span>总权益</span><strong>{money(portfolio.equity, portfolio.baseCurrency)}</strong></div>
            <div><span>现金</span><strong>{money(portfolio.cash, portfolio.baseCurrency)}</strong></div>
            <div><span>最近一期盈亏</span><strong>{money(portfolio.periodPnl, portfolio.baseCurrency, true)}</strong></div>
            <div><span>累计收益</span><strong>{portfolio.return}</strong></div>
          </div>
          {portfolio.limitations.length > 0 && <div className="data-limitation"><b>数据限制</b><DetailList items={portfolio.limitations} /></div>}
          <section className="position-section">
            <h3>匿名资产配置</h3>
            <div className="allocation-legend">{portfolio.allocations.map((item) => <span key={item.label}>{item.label} {item.pct}%</span>)}</div>
          </section>
          <p className="paper-boundary">仅用于虚拟研究验证，不连接券商，不产生真实订单。</p>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [checked, setChecked] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<BriefEvent | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreDialogFocusRef = useRef(false);
  const reportDate = generated.reportDate.replaceAll("-", ".");
  const highConfidenceSignals = events.filter((item) => item.confidence === "高").length;
  const modalOpen = Boolean(selectedEvent || selectedPortfolio);

  const closeDialog = useCallback(() => {
    restoreDialogFocusRef.current = true;
    setSelectedEvent(null);
    setSelectedPortfolio(null);
  }, []);

  const visibleEvents = useMemo(
    () => activeFilter === "全部" ? events : events.filter((item) => item.category === activeFilter),
    [activeFilter],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setChecked(readStoredChecklist());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const backgroundElements = Array.from(document.querySelectorAll<HTMLElement>("main > :not(.detail-backdrop)"));
    document.body.style.overflow = "hidden";
    backgroundElements.forEach((element) => { element.inert = true; });
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach((element) => { element.inert = false; });
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeDialog, modalOpen]);

  useEffect(() => {
    if (modalOpen || !restoreDialogFocusRef.current) return;
    restoreDialogFocusRef.current = false;
    const trigger = dialogTriggerRef.current;
    dialogTriggerRef.current = null;
    trigger?.focus({ preventScroll: true });
  }, [modalOpen]);

  const toggleWatch = (index: number) => {
    setChecked((current) => {
      const next = current.includes(index) ? current.filter((item) => item !== index) : [...current, index];
      try { window.localStorage.setItem(`atlas-watch-${generated.reportDate}`, JSON.stringify(next)); } catch { /* browser storage may be disabled */ }
      return next;
    });
  };

  const closeMobileNav = () => setMobileNavOpen(false);
  const openEvent = (event: BriefEvent, trigger: HTMLButtonElement) => {
    dialogTriggerRef.current = trigger;
    setSelectedEvent(event);
  };
  const openPortfolio = (portfolio: Portfolio, trigger: HTMLButtonElement) => {
    dialogTriggerRef.current = trigger;
    setSelectedPortfolio(portfolio);
  };

  return (
    <main data-atlas-report-date={generated.reportDate} data-atlas-content-hash={generated.contentHash}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回报告顶部">
          <span className="brand-mark">A</span>
          <span>ATLAS <small>GLOBAL INTELLIGENCE</small></span>
        </a>
        <nav aria-label="报告导航">
          <a href="#signals">今日信号</a><a href="#scenarios">情景推演</a><a href="#markets">市场映射</a><a href="#system">运行闭环</a><a href="#sources">方法与来源</a>
        </nav>
        <div className="header-actions">
          <button type="button" className="mobile-nav-button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="mobile-navigation" aria-label={mobileNavOpen ? "关闭报告导航" : "打开报告导航"}><span></span><span></span><span></span></button>
          <button type="button" className="print-button" onClick={() => window.print()} aria-label="打印本期报告">打印本期</button>
        </div>
        {mobileNavOpen && <nav className="mobile-navigation" id="mobile-navigation" aria-label="移动端报告导航"><a onClick={closeMobileNav} href="#signals">今日信号</a><a onClick={closeMobileNav} href="#scenarios">情景推演</a><a onClick={closeMobileNav} href="#markets">市场映射</a><a onClick={closeMobileNav} href="#system">运行闭环</a><a onClick={closeMobileNav} href="#sources">方法与来源</a></nav>}
      </header>

      <section className="hero" id="top">
        <div className="issue-line"><span>{generated.issue}</span><span>{reportDate} · {generated.retrievedAt}</span><span>决策者版</span></div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{generated.hero.eyebrow}</p>
            <h1>{generated.hero.headline[0]}<br />{generated.hero.headline[1]}</h1>
            <p className="dek">{generated.hero.dek}</p>
            <div className="hero-actions"><a className="primary-action" href="#signals">进入今日判断 <span>↓</span></a><span className="reading-time">约 {generated.metrics.readingMinutes} 分钟读完</span></div>
          </div>
          <aside className="editor-note" aria-label="主编判断"><div className="note-kicker"><span></span> 主编判断</div><p>{generated.hero.editorNote}</p><div className="signature">ATLAS RESEARCH DESK</div></aside>
        </div>
      </section>

      <section className="signal-strip" aria-label="核心指标">
        <article><span className="metric-label">风险信号指数</span><strong>{generated.metrics.riskTemperature}<small>/100</small></strong><div className="temperature-track"><span style={{ width: `${generated.metrics.riskTemperature}%` }}></span></div><p>启发式、未校准：{generated.metrics.riskModel.formula}</p></article>
        <article><span className="metric-label">市场姿态</span><strong className="word-metric">{generated.metrics.posture}</strong><p><b>原则：</b>先验证执行与价格，再调整主题暴露。</p></article>
        <article><span className="metric-label">今日信号</span><strong>{generated.metrics.signalCount}<small>条</small></strong><p>其中 {highConfidenceSignals} 条事件关联高置信预测。</p></article>
        <article className="freshness"><span className="metric-label">来源健康度</span><strong className="word-metric">{generated.metrics.freshness} {generated.metrics.sourceHealth.score}<small>/100</small></strong><p>RSS 错误 {generated.metrics.sourceHealth.rssErrorCount} · 回退 {generated.metrics.sourceHealth.rssFallbackCount}；中国备用报价 {generated.metrics.sourceHealth.chinaFallbackItemCount}/{generated.metrics.sourceHealth.chinaItemCount}。</p></article>
      </section>

      <section className="brief-section" id="signals">
        <div className="section-heading"><div><p className="section-number">01 / TODAY</p><h2>今天必须知道的{generated.metrics.signalCount}件事</h2></div><p>卡片给结论，完整分析给证据、传导、标的和证伪条件。</p></div>
        <div className="filter-row" role="group" aria-label="筛选简报主题">
          {filters.map((filter) => <button type="button" key={filter} className={activeFilter === filter ? "active" : ""} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
        </div>
        <div className="events-grid" aria-live="polite">
          {visibleEvents.map((item, visibleIndex) => (
            <article className="event-card" key={item.id}>
              <div className="event-meta"><span>{item.category}</span><span>{item.horizon} · {item.confidence}</span></div>
              <span className="event-index">{String(visibleIndex + 1).padStart(2, "0")}</span>
              <h3>{item.cardTitle}</h3><p>{item.body}</p>
              <div className="implication"><b>决策含义</b>{item.implication}</div>
              <div className="event-actions"><button type="button" onClick={(clickEvent) => openEvent(item, clickEvent.currentTarget)}>查看完整分析 <span aria-hidden="true">→</span></button><SourceLink source={item.sources[0]} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="risk-band" aria-labelledby="risk-heading">
        <div><p className="section-number">RISK CHECK</p><h2 id="risk-heading">不能只看主线，<br />还要盯住证伪。</h2></div>
        <ol>{generated.risks.map((risk, index) => <li key={risk}><span>{String(index + 1).padStart(2, "0")}</span><p>{risk}</p></li>)}</ol>
      </section>

      <section className="brief-section scenario-section" id="scenarios">
        <div className="section-heading"><div><p className="section-number">02 / FORWARD MAP</p><h2>未来情景与验证信号</h2></div><p>展开每一项，查看驱动、受益、承压、标的和来源。</p></div>
        <div className="scenario-list">
          <div className="scenario-summary scenario-head"><span>期限</span><span>核心场景</span><span>概率</span><span>下一验证点</span><span></span></div>
          {scenarios.map((item) => {
            const expanded = expandedScenario === item.id;
            return <article className="scenario-item" key={item.id}>
              <button type="button" className="scenario-summary" aria-expanded={expanded} onClick={() => setExpandedScenario(expanded ? null : item.id)}>
                <span className="horizon">{item.horizon}</span><strong>{item.scenario}</strong><span className={`chance ${item.chance === "高" ? "high" : ""}`}>{item.chance}</span><span>{item.watch}</span><span className="expand-symbol" aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && <div className="scenario-detail">
                <section><h3>驱动因素</h3><DetailList items={item.drivers} /></section><section><h3>受益方向</h3><DetailList items={item.beneficiaries} /></section><section><h3>承压方向</h3><DetailList items={item.pressures} /></section><section><h3>验证信号</h3><DetailList items={item.verificationSignals} /></section>
                {item.instruments.length > 0 && <section className="scenario-instruments"><h3>观察标的</h3>{item.instruments.map((instrument) => <p key={`${item.id}-${instrument.symbol}`}><b>{instrument.symbol}</b> {instrument.thesis}<small>{instrument.risk}</small></p>)}</section>}
                <section className="scenario-sources"><h3>关联来源</h3><div>{item.sourceRefs.map((source) => <SourceLink source={source} key={source.href} />)}</div></section>
              </div>}
            </article>;
          })}
        </div>
      </section>

      <section className="market-section" id="markets">
        <div className="market-intro"><p className="section-number">03 / MARKET PULSE</p><h2>不是一个市场，<br />是三种速度。</h2><p>美国资产等待节后新价格；中国流动性托底但内部高度分化；虚拟组合维持高现金，等待执行信号。</p></div>
        <div className="market-board"><div className="board-title"><span>观察面板</span><small>最近可用快照</small></div><div className="market-columns">{[generated.markets.us, generated.markets.china].map((market) => <article key={market.label}><div className="market-label">{market.label} <span className={market.isStale ? "stale-dot" : "live-dot"}>{market.asOf}</span></div>{market.items.map((item) => <div className={`ticker ${item.direction}`} key={item.label}><span>{item.label}</span><strong>{item.change}</strong></div>)}<p className="market-note">{market.note}</p></article>)}</div></div>
      </section>

      <section className="portfolio-section">
        {([generated.portfolios.us, generated.portfolios.china] as Portfolio[]).map((portfolio, index) => <div className={`portfolio-card ${index === 0 ? "dark" : "paper"}`} key={portfolio.name}><div className="portfolio-top"><span>{portfolio.name}</span><small>虚拟账户透明摘要</small></div><strong className="portfolio-value">{portfolio.value} {portfolio.baseCurrency}</strong><div className={`return ${(portfolio.periodPnl ?? portfolio.returnPct) >= 0 ? "positive" : "negative"}`}>本期 {money(portfolio.periodPnl, portfolio.baseCurrency, true)} · 累计 {portfolio.return} · 现金 {money(portfolio.cash, portfolio.baseCurrency)}</div><div className="allocation-bar" aria-label={`${portfolio.name}资产配置`}>{portfolio.allocations.map((item) => <span style={{ width: `${item.pct}%` }} key={item.label}></span>)}</div><div className="allocation-legend">{portfolio.allocations.map((item) => <span key={item.label}>{item.label} {item.pct}%</span>)}</div><button type="button" className="portfolio-open" onClick={(clickEvent) => openPortfolio(portfolio, clickEvent.currentTarget)}>查看账户摘要 <span aria-hidden="true">→</span></button></div>)}
      </section>

      <section className="system-section" id="system">
        <div className="system-heading"><p className="section-number">04 / ATLAS CYCLE</p><h2>研究不是结论，<br />是可审计的循环。</h2><p>只读展示最近完成的统一 cycle、唯一虚拟账本、隔离回放和影子晋升门禁。</p></div>
        <div className="system-board">
          <div className="system-metrics"><article><span>Operational Cycle</span><strong>{operationalGatePassed ? "运行门禁通过" : "阻断"}</strong><small>{operationalGatePassed ? "公开安全状态已更新" : "存在阻断项"}</small></article><article><span>Release Candidate</span><strong>{releaseCandidatePassed ? "发布证据完整" : "未认证"}</strong><small>需要全量回归与幂等复跑</small></article><article><span>Canonical Ledger</span><strong>{generated.system.ledger.auditPassed ? "审计通过" : "未通过"}</strong><small>账户、事件与哈希明细不公开</small></article><article><span>Replay Safety</span><strong>{generated.system.replay.executionSafetyPassed ? "执行隔离通过" : "未通过"}</strong><small>研究晋级：{researchPromotionPassed ? "证据通过" : "未通过"}</small></article><article><span>Shadow Gate</span><strong>{generated.system.shadow.recommendedState}</strong><small>evidence: {generated.system.shadow.evidenceStatus}</small></article><article><span>Self Healing</span><strong>{selfHealing.status === "healthy" ? "健康" : selfHealing.status === "blocked" ? "阻断" : selfHealing.status === "degraded" ? "降级" : "未运行"}</strong><small>内部检查与修复数量不公开</small></article><article><span>Review Actions</span><strong>{improvements.status}</strong><small>内部任务数量与能力缺口不公开</small></article></div>
          <details className="system-detail"><summary>查看阶段、边界与限制</summary><div className="stage-list">{generated.system.stages.map((stage) => <span className={stage.status} key={stage.name}>{stage.name}<b>{stage.status}</b></span>)}</div><div className="boundary-list"><p>纸面虚拟交易：是</p><p>真实券商订单：禁止</p><p>总权益、现金与收益：公开</p><p>账户编号与持仓成本：不公开</p><p>源代码自动修改：禁止</p><p>生产自动发布：禁止</p><p>自动晋升 active-normal：禁止</p></div>{!generated.system.replay.strategyEvidencePassed && <div className="data-limitation"><b>策略有效性未验证</b><p>当前回放只证明隔离执行和账本安全，没有基准收益、回撤、成本与样本外标签证据。</p></div>}{generated.system.shadow.evidenceStatus !== "verified" && <div className="data-limitation"><b>门禁保持 shadow</b><p>当前缺少已验证的样本外证据，因此不会自动晋升。</p></div>}</details>
        </div>
      </section>

      <section className="watch-section">
        <div className="watch-copy"><p className="section-number">05 / WATCHLIST</p><h2>今天收盘前，<br />检查这{watchItems.length}件事。</h2><p>进度保存在当前浏览器，作为本期验证清单，不进入交易执行。</p><span className="watch-progress">已完成 {checked.length} / {watchItems.length}</span></div>
        <div className="checklist">{watchItems.map((item, index) => <label className={checked.includes(index) ? "checked" : ""} key={item}><input type="checkbox" checked={checked.includes(index)} onChange={() => toggleWatch(index)} /><span className="custom-check" aria-hidden="true">{checked.includes(index) ? "✓" : ""}</span><span className="check-number">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></label>)}</div>
      </section>

      <section className="review-section">
        <div><p className="section-number">06 / SELF EVOLUTION</p><h2>事件与资产分开算，<br />复盘才不会自欺。</h2><p className="evolution-state">当前状态 <b>{generated.evolution.state}</b> · 自动晋升关闭</p></div>
        <div>
          <div className="evolution-scoreboard">
            <span>事件有效样本<strong>{eventScoring.eligible_sample_count ?? 0}/{eventScoring.matured_v2_prediction_count ?? 0}</strong></span>
            <span>事件 Brier<strong>{metric(eventScoring.brier_score)}</strong></span>
            <span>资产映射解析<strong>{marketMappingScoring.resolved_mapping_count ?? 0}/{marketMappingScoring.matured_mapping_count ?? 0}</strong></span>
            <span>映射命中率<strong>{metric(marketMappingScoring.hit_rate_pct, "%")}</strong></span>
          </div>
          <p className="evolution-state">事件概率只进入 Brier / Log loss / ECE；资产映射只按预注册基准和交易日回报评分。</p>
          <h3>本轮暴露的问题</h3>
          <ul className="evolution-warnings"><li>复盘结果没有 wrong / expired，存在乐观偏差。</li><li>{generated.evolution.integrity.early_closed_without_terminal_evidence.length} 条预测在到期前关闭。</li><li>{generated.evolution.integrity.overdue_unreviewed_prediction_ids.length} 条到期预测仍未复盘。</li></ul>
          <h3>下一轮强制规则</h3>
          <DetailList items={generated.evolution.active_rules.slice(0, 5).map((rule) => rule.instruction)} />
          {generated.limitations.length > 0 && <div className="data-limitation"><b>本期数据限制</b><DetailList items={generated.limitations} /></div>}
        </div>
      </section>

      <section className="method-section" id="sources">
        <div><p className="section-number">07 / METHOD & SOURCES</p><h2>证据优先，<br />明确区分事实与判断。</h2></div>
        <div className="method-grid"><article><span>01</span><h3>多源核验</h3><p>优先使用官方机构与一手报道；跨来源确认时间、地点与数字。</p></article><article><span>02</span><h3>传导拆分</h3><p>把事件、执行、实体流量、价格与资产反应分层，不用新闻替代市场验证。</p></article><article><span>03</span><h3>来源健康度</h3><p>{generated.metrics.sourceHealth.rssFresh24hCount}/{generated.metrics.sourceHealth.rssItemCount} 条 RSS 在 24 小时内；覆盖 {generated.metrics.sourceHealth.rssSourceCoveragePct}% 已配置 RSS 来源。</p></article></div>
        <div className="source-links"><span>本期全部来源</span>{generated.sources.map((source) => <SourceLink source={source} key={source.href} />)}</div>
      </section>

      <footer><div className="footer-brand">ATLAS</div><p>每日全球决策情报 · {generated.issue}</p><p>内容用于研究与虚拟验证，不构成投资建议。</p><a href="#top">回到顶部 ↑</a></footer>

      {selectedEvent && <EventDialog event={selectedEvent} onClose={closeDialog} />}
      {selectedPortfolio && <PortfolioDialog portfolio={selectedPortfolio} onClose={closeDialog} />}
    </main>
  );
}
