"use client";

import { useMemo, useState } from "react";

type BriefEvent = {
  category: string;
  time: string;
  title: string;
  body: string;
  implication: string;
  source: string;
  href: string;
};

const events: BriefEvent[] = [
  {
    category: "地缘",
    time: "首要变量",
    title: "伊朗国葬之后，霍尔木兹治理进入执行博弈",
    body: "葬礼、谈判延迟与海峡航线规则仍未闭环。OPEC+ 增产抑制单边供给恐慌，但航运保险与黄金的风险溢价仍在。",
    implication: "盯住实体航线、保险费率与 UKMTO 警报，而非只交易新闻标题。",
    source: "AP / Guardian",
    href: "https://apnews.com/article/88b7f2e4902c18e2c1aa0eb91ad7bcfb",
  },
  {
    category: "安全",
    time: "一周窗口",
    title: "Kyiv 再遭打击，NATO Ankara 进入采购兑现期",
    body: "城市防空缺口继续扩大。峰会的关键不再是支出承诺，而是拦截弹、雷达、counter-UAS 与联合采购文本。",
    implication: "防务主题由政治表态转向订单、产能与交付节奏验证。",
    source: "AP / NATO",
    href: "https://www.nato.int/en/news-and-events/events/2026/07/overview---2026-nato-summit-in-ankara-",
  },
  {
    category: "科技",
    time: "结构迁移",
    title: "AI 叙事从芯片扩散至电力、水与平台责任",
    body: "数据中心费率争议和在线安全执法同时升温。AI 资本开支的约束正在从算力供应，迁移到电网、水权、许可与治理。",
    implication: "将 SMH、CIBR、PHO 与电网设备分开观察，避免把 AI 当作单一交易。",
    source: "Guardian / NCA",
    href: "https://www.theguardian.com/us-news/2026/jul/05/ratepayer-protection-act-datacenters",
  },
  {
    category: "气候",
    time: "复合冲击",
    title: "Bavi、欧美热浪与海温纪录形成连锁压力",
    body: "极端天气同步冲击电网、医疗、保险、港口与灾害物流。气候适应已经从慢变量变为即时运营问题。",
    implication: "水务、冷却、电网韧性和灾害物流的验证窗口延长至一个月。",
    source: "AP / WMO",
    href: "https://wmo.int/media/news/record-breaking-heat-spreads-through-europe",
  },
  {
    category: "宏观",
    time: "待开市验证",
    title: "美国就业降温，但现金市场尚未给出新答案",
    body: "6 月非农新增 5.7 万、失业率 4.2%。旧收盘显示 AI beta 走弱、防务和黄金偏强，但假期价格必须降权。",
    implication: "下一有效交易日看收益率、SPY/RSP 宽度与 QQQ/SMH 相对表现。",
    source: "BLS",
    href: "https://www.bls.gov/news.release/empsit.nr0.htm",
  },
  {
    category: "中国",
    time: "选择性托底",
    title: "流动性操作托住大盘，港股平台强于内地成长",
    body: "1 万亿元三个月买断式逆回购提供流动性支持；A/H 市场仍高度分化，港股平台走强，新能源与部分成长承压。",
    implication: "保持选择性，不把指数托底误读为全面 risk-on。",
    source: "PBOC / Xinhua",
    href: "https://english.www.gov.cn/news/202607/03/content_WS6a47bb34c6d00ca5f9a0c05b.html",
  },
];

const filters = ["全部", "地缘", "安全", "科技", "气候", "宏观", "中国"];

const scenarios = [
  { horizon: "1日", scenario: "霍尔木兹治理风险维持高位", chance: "高", watch: "航线、保险、USO / GLD / JETS" },
  { horizon: "1日", scenario: "美股重开后等待宽度与利率确认", chance: "中", watch: "SPY / RSP、2Y / 10Y、SMH" },
  { horizon: "1周", scenario: "防空与反无人机采购加速", chance: "高", watch: "NATO 公报、ITA、联合采购" },
  { horizon: "1周", scenario: "AI 定价向电力、水与治理轮动", chance: "高", watch: "CIBR / PHO 相对 SMH" },
  { horizon: "1月", scenario: "气候—健康复合冲击延续", chance: "高", watch: "灾害赔付、医院与电网压力" },
];

const watchItems = [
  "伊朗谈判恢复日期与霍尔木兹新航运警报",
  "NATO 是否落地拦截弹与 counter-UAS 联合采购",
  "美股重开后的收益率、市场宽度与 AI beta",
  "Bavi 对 Rota、Guam、Saipan 的损害评估",
  "中国大盘、港股平台与科创板的成交宽度",
];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [checked, setChecked] = useState<number[]>([]);

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
          <span>VOL. 026</span>
          <span>2026.07.06 · 16:05 CST</span>
          <span>决策者版</span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">每日全球晨间简报</p>
            <h1>风险没有消失，<br />只是换了传导路径。</h1>
            <p className="dek">从霍尔木兹航运规则、Kyiv 防空压力，到 AI 数据中心的电力与水资源约束——今天的关键不是追逐标题，而是识别风险如何进入资产、政策与运营。</p>
            <div className="hero-actions">
              <a className="primary-action" href="#signals">进入今日判断 <span>↓</span></a>
              <span className="reading-time">约 8 分钟读完</span>
            </div>
          </div>
          <aside className="editor-note" aria-label="主编判断">
            <div className="note-kicker"><span></span> 主编判断</div>
            <p>市场正在从“事件定价”转向“执行定价”。海峡是否真实通航、防务资金是否变成订单、AI 算力是否获得电网许可，比宏大叙事更重要。</p>
            <div className="signature">ATLAS RESEARCH DESK</div>
          </aside>
        </div>
      </section>

      <section className="signal-strip" aria-label="核心指标">
        <article>
          <span className="metric-label">风险温度</span>
          <strong>72<small>/100</small></strong>
          <div className="temperature-track"><span style={{ width: "72%" }}></span></div>
          <p>地缘与气候风险叠加，维持高位。</p>
        </article>
        <article>
          <span className="metric-label">市场姿态</span>
          <strong className="word-metric">选择性防御</strong>
          <p><b>偏好：</b>黄金、防务、网络安全、电网韧性</p>
        </article>
        <article>
          <span className="metric-label">今日信号</span>
          <strong>6<small>条</small></strong>
          <p>其中 4 条处于高置信验证窗口。</p>
        </article>
        <article className="freshness">
          <span className="metric-label">数据新鲜度</span>
          <strong className="word-metric">中等</strong>
          <p>中国行情 07.06；美国行情因假期停留 07.02。</p>
        </article>
      </section>

      <section className="brief-section" id="signals">
        <div className="section-heading">
          <div>
            <p className="section-number">01 / TODAY</p>
            <h2>今天必须知道的六件事</h2>
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
            <article>
              <div className="market-label">美国 / 全球 <span className="stale-dot">低时效</span></div>
              <div className="ticker"><span>SPY</span><strong>-0.13%</strong></div>
              <div className="ticker down"><span>QQQ</span><strong>-1.73%</strong></div>
              <div className="ticker down"><span>SMH</span><strong>-4.54%</strong></div>
              <div className="ticker up"><span>ITA</span><strong>+1.78%</strong></div>
              <div className="ticker up"><span>GLD</span><strong>+2.03%</strong></div>
              <p className="market-note">截至 07.02 收盘，等待下一有效交易日确认。</p>
            </article>
            <article>
              <div className="market-label">中国 / 香港 <span className="live-dot">07.06</span></div>
              <div className="ticker"><span>沪深300</span><strong>0.00%</strong></div>
              <div className="ticker down"><span>创业板</span><strong>-1.77%</strong></div>
              <div className="ticker up"><span>科创50</span><strong>+1.04%</strong></div>
              <div className="ticker up"><span>恒生</span><strong>+0.89%</strong></div>
              <div className="ticker up"><span>恒生科技</span><strong>+0.62%</strong></div>
              <p className="market-note">流动性托底与结构分化同时存在。</p>
            </article>
          </div>
        </div>
      </section>

      <section className="portfolio-section">
        <div className="portfolio-card dark">
          <div className="portfolio-top"><span>US 虚拟组合</span><small>研究验证账户</small></div>
          <strong className="portfolio-value">100,478.74</strong>
          <div className="return positive">+0.48% 总收益</div>
          <div className="allocation-bar" aria-label="美国组合配置：现金60%，其余为主题资产">
            <span style={{ width: "60%" }}></span><span style={{ width: "10.64%" }}></span><span style={{ width: "9.45%" }}></span><span style={{ width: "19.91%" }}></span>
          </div>
          <div className="allocation-legend"><span>现金 60%</span><span>SMH 10.6%</span><span>ITA 9.5%</span><span>其他 19.9%</span></div>
        </div>
        <div className="portfolio-card paper">
          <div className="portfolio-top"><span>CHINA 虚拟组合</span><small>研究验证账户</small></div>
          <strong className="portfolio-value">101,926.83</strong>
          <div className="return positive">+1.93% 总收益</div>
          <div className="allocation-bar" aria-label="中国组合配置：现金65.2%，其余为主题资产">
            <span style={{ width: "65.2%" }}></span><span style={{ width: "11.5%" }}></span><span style={{ width: "10.6%" }}></span><span style={{ width: "12.7%" }}></span>
          </div>
          <div className="allocation-legend"><span>现金 65.2%</span><span>沪深300 11.5%</span><span>科创50 10.6%</span><span>其他 12.7%</span></div>
        </div>
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
          <a href="https://apnews.com/" target="_blank" rel="noreferrer">Associated Press ↗</a>
          <a href="https://www.nato.int/" target="_blank" rel="noreferrer">NATO ↗</a>
          <a href="https://www.bls.gov/" target="_blank" rel="noreferrer">BLS ↗</a>
          <a href="https://wmo.int/" target="_blank" rel="noreferrer">WMO ↗</a>
          <a href="https://www.who.int/" target="_blank" rel="noreferrer">WHO ↗</a>
        </div>
      </section>

      <footer>
        <div className="footer-brand">ATLAS</div>
        <p>每日全球决策情报 · 第 026 期</p>
        <p>内容用于研究与虚拟验证，不构成投资建议。</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
