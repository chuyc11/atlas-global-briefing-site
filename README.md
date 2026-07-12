# ATLAS 全球决策晨报

ATLAS 是统一研究工作台的网页展示层。页面读取
`app/briefing.generated.json`，该文件由根目录的统一同步命令从最新中文晨报增量生成。

## 本地运行

需要 Node.js `>=22.13.0`：

```powershell
npm install
npm run dev
```

## 验证

```powershell
npm test
```

测试会完成 vinext/Cloudflare Worker 构建，并验证服务端输出、结构化深度数据、来源、情景和组合数据。

页面运行后可执行真实浏览器回归：

```powershell
npm run test:ui
```

该回归覆盖事件详情抽屉、情景展开、主题筛选、虚拟组合持仓、可持久化观察清单、移动导航、横向溢出、控制台错误和失败请求。

## 数据更新

推荐在工作区根目录执行：

```powershell
python atlas.py sync
```

该命令同时更新 global-briefing → trading-core 数据桥和本页面使用的生成数据。若只需要重新生成网页数据，也可执行：

```powershell
python work\global-briefing\scripts\sync_briefing_site.py --force
```

网页卡片只保留决策摘要；“查看完整分析”会展示已确认事实、驱动与传导、受益/承压方向、验证信号、观察标的、证伪条件和来源。运行闭环区域只读展示 cycle、canonical ledger、隔离 replay 与 shadow gate。

网页为研究展示，不连接券商，也不产生真实订单。
