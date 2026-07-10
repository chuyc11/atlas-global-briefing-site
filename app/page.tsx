"use client";

import { useMemo, useState } from "react";
import generated from "./briefing.generated.json";

type BriefEvent = {
  category: string;
  time: string;
  title: string;
  body: string;
  implication: string;
  source: string;
  href: string;
};

const events = generated.events as BriefEvent[];

const filters = ["全部", "地缘", "安全", "科技", "气候", "宏观", "中国"];

const scenarios = generated.scenarios;

const watchItems = generated.watchlist;

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [checked, setChecked] = useState<number[]>([]);
  const reportDate = generated.reportDate.replaceAll("-", ".");
  const highConfidenceSignals = scenarios.filter((item) => item.chance === "高").length;

  const visibleEvents = useMemo(
    () => activeFilter === "全部" ? events : events.filter((item) => item.category === activeFilter),
    [activeFilter],
  );

  const toggleWatch = (index: number) => {
    setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回报告顶部">
          <span className="brand-mark">A</span>
          <span>ATLAS <small>GLOBAL INTELLIGENCE</small></span>
        </a>
        <nav aria-label="报告导航">
          <a href="#signals">今日信号</a>
          <a href="#scenarios">情景推演</a>
          <a href="#markets">市场映射</a>
          <a href="#sources">方法与来源</a>
        </nav>
        <button className="print-button" onClick={() => window.print()} aria-label="打印本期报告">打印本期</button>
      </header>

      <section className="hero" id="top">
        <div className="issue-line">
          <span>{generated.issue}</span>
          <span>{reportDate} · {generated.retrievedAt}</span>
          <span>决策者版</span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{generated.hero.eyebrow}</p>
            <h1>{generated.hero.headline[0]}<br />{generated.hero.headline[1]}</h1>
            <p className="dek">{generated.hero.dek}</p>
            <div className="hero-actions">
              <a className="primary-action" href="#signals">进入今日判断 <span>↓</span></a>
              <span className="reading-time">约 8 分钟读完</span>
            </div>
          </div>
          <aside className="editor-note" aria-label="主编判断">
            <div className="note-kicker"><span></span> 主编判断</div>
            <p>{generated.hero.editorNote}</p>
            <div className="signature">ATLAS RESEARCH DESK</div>
          </aside>
        </div>
      </section>

      <section className="signal-strip" aria-label="核心指标">
        <article>
          <span className="metric-label">风险温度</span>
          <strong>{generated.metrics.riskTemperature}<small>/100</small></strong>
          <div className="temperature-track"><span style={{ width: `${generated.metrics.riskTemperature}%` }}></span></div>
          <p>{generated.risks[0] || "持续跟踪地缘、宏观与气候风险。"}</p>
        </article>
        <article>
          <span className="metric-label">市场姿态</span>
          <strong className="word-metric">{generated.metrics.posture}</strong>
          <p><b>原则：</b>先验证执行与价格，再调整主题暴露。</p>
        </article>
        <article>
          <span className="metric-label">今日信号</span>
          <strong>{generated.metrics.signalCount}<small>条</small></strong>
          <p>其中 {highConfidenceSignals} 条处于高置信验证窗口。</p>
        </article>
        <article className="freshness">
          <span className="metric-label">数据新鲜度</span>
          <strong className="word-metric">{generated.metrics.freshness}</strong>
          <p>美国 {generated.markets.us.asOf}；中国 {generated.markets.china.asOf}。</p>
        </article>
      </section>

      <section className="brief-section" id="signals">
        <div className="section-heading">
          <div>
            <p className="section-number">01 / TODAY</p>
            <h2>今天必须知道的{generated.metrics.signalCount}件事</h2>
          </div>
          <p>先看事实，再看传导。选择主题以聚焦阅读。</p>
        </div>
        <div className="filter-row" role="group" aria-label="筛选简报主题">
          {filters.map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? "active" : ""}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >{filter}</button>
          ))}
        </div>
        <div className="events-grid" aria-live="polite">
          {visibleEvents.map((item, index) => (
            <article className="event-card" key={item.title}>
              <div className="event-meta">
                <span>{item.category}</span>
                <span>{item.time}</span>
              </div>
              <span className="event-index">0{events.indexOf(item) + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="implication"><b>决策含义</b>{item.implication}</div>
              <a href={item.href} target="_blank" rel="noreferrer">{item.source} <span>↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="quote-break">
        <p>THE SIGNAL</p>
        <blockquote>“别问风险是否已经被市场知道，<br />要问它是否已经进入价格与执行。”</blockquote>
      </section>

      <section className="brief-section scenario-section" id="scenarios">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / FORWARD MAP</p>
            <h2>未来情景与验证信号</h2>
          </div>
          <p>概率不是结论，是下一步证据的优先级。</p>
        </div>
        <div className="scenario-table" role="table" aria-label="未来情景推演">
          <div className="scenario-row scenario-head" role="row">
            <span>期限</span><span>核心场景</span><span>概率</span><span>下一验证点</span>
          </div>
          {scenarios.map((item) => (
            <div className="scenario-row" role="row" key={item.scenario}>
              <span className="horizon">{item.horizon}</span>
              <strong>{item.scenario}</strong>
              <span className={`chance ${item.chance === "高" ? "high" : ""}`}>{item.chance}</span>
              <span>{item.watch}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="market-section" id="markets">
        <div className="market-intro">
          <p className="section-number">03 / MARKET PULSE</p>
          <h2>不是一个市场，<br />是三种速度。</h2>
          <p>美国资产等待节后新价格；中国流动性托底但内部高度分化；虚拟组合维持高现金，等待执行信号。</p>
        </div>
        <div className="market-board">
          <div className="board-title"><span>观察面板</span><small>最近可用快照</small></div>
          <div className="market-columns">
            {[generated.markets.us, generated.markets.china].map((market, marketIndex) => (
              <article key={market.label}>
                <div className="market-label">{market.label} <span className={marketIndex === 0 ? "stale-dot" : "live-dot"}>{market.asOf}</span></div>
                {market.items.map((item) => (
                  <div className={`ticker ${item.direction}`} key={item.label}><span>{item.label}</span><strong>{item.change}</strong></div>
                ))}
                <p className="market-note">{market.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="portfolio-section">
        {([generated.portfolios.us, generated.portfolios.china] as const).map((portfolio, index) => (
          <div className={`portfolio-card ${index === 0 ? "dark" : "paper"}`} key={portfolio.name}>
            <div className="portfolio-top"><span>{portfolio.name}</span><small>研究验证账户</small></div>
            <strong className="portfolio-value">{portfolio.value}</strong>
            <div className="return positive">{portfolio.return} 总收益</div>
            <div className="allocation-bar" aria-label={`${portfolio.name}资产配置`}>
              {portfolio.allocations.map((item) => <span style={{ width: `${item.pct}%` }} key={item.label}></span>)}
            </div>
            <div className="allocation-legend">{portfolio.allocations.map((item) => <span key={item.label}>{item.label} {item.pct}%</span>)}</div>
          </div>
        ))}
      </section>

      <section className="watch-section">
        <div className="watch-copy">
          <p className="section-number">04 / WATCHLIST</p>
          <h2>今天收盘前，<br />检查这五件事。</h2>
          <p>勾选状态仅保存在本次浏览期间。它不是任务管理器，而是一张帮助你保持判断纪律的清单。</p>
          <span className="watch-progress">已完成 {checked.length} / {watchItems.length}</span>
        </div>
        <div className="checklist">
          {watchItems.map((item, index) => (
            <label className={checked.includes(index) ? "checked" : ""} key={item}>
              <input type="checkbox" checked={checked.includes(index)} onChange={() => toggleWatch(index)} />
              <span className="custom-check" aria-hidden="true">{checked.includes(index) ? "✓" : ""}</span>
              <span className="check-number">0{index + 1}</span>
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="method-section" id="sources">
        <div>
          <p className="section-number">05 / METHOD & SOURCES</p>
          <h2>证据优先，<br />明确区分事实与判断。</h2>
        </div>
        <div className="method-grid">
          <article><span>01</span><h3>多源核验</h3><p>优先使用官方机构与一手报道；跨来源确认时间、地点与数字。</p></article>
          <article><span>02</span><h3>传导拆分</h3><p>把事件、执行、实体流量、价格与资产反应分层，不用新闻替代市场验证。</p></article>
          <article><span>03</span><h3>新鲜度标注</h3><p>假期、周末或回退数据一律降权，并标注最近有效时间。</p></article>
        </div>
        <div className="source-links">
          <span>核心来源</span>
          {generated.sources.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>{source.label} ↗</a>)}
        </div>
      </section>

      <footer>
        <div className="footer-brand">ATLAS</div>
        <p>每日全球决策情报 · {generated.issue}</p>
        <p>内容用于研究与虚拟验证，不构成投资建议。</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
