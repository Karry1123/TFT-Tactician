# 当前国服资料配置 / Current China catalog

核对日期：2026-10-01。国服版本为 **18.3 B**，`patch` 字段采用公告原样 `18.3 B`。版本公告原文链接和各字段数据来源见 `scripts/catalog_provenance.json`。本项目针对 PC 云顶之弈，不是金铲铲之战。

`scripts/catalog.json` 含10种散件、36种普通成装配方、65个基础棋子记录及9个拉克丝起源变体、36个羁绊、3个海克斯档位定义和251个当前池海克斯（银色69、金色115、彩色67）。拉克丝基础记录是通用身份，不能把多个起源变体当成独立棋子同时上场。远古巨龙 `boardSlots=2` 已纳入转型人口检查。羁绊与特殊机制没有完整战斗模拟。

`scripts/sources.json` 配置8个条目：腾讯与 Riot 版本公告、NGA 发现入口、Bilibili 官方赛季参考，以及4份原创教学文本。社区入口不是已授权的当前攻略，不参与提取。`purpose=guide` 与 `sample` 参与提取；`reference` 仅用于人工核对。含样例时发布数据库保持 `demo=true`。已移除被403拦截的 Mobalytics 攻略。

原创样例位于 `scripts/transcripts/sample_guide.txt`，包含 Fast 8、Fast 9、维迦追三、装备队列、二星节点及转型顺序。它不是外部视频转载，使用说明写在文件开头。若要导入真实授权转录，请新增 `purpose=guide` 的 transcript 条目，并使用作者真实 HTTPS 原文链接。

## 本地验证

```powershell
python scripts/crawler_and_extractor.py --validate-only
python -m unittest discover -s scripts -p "test_*.py"
npm run typecheck
npm test
npm run build
```

离线验证会检查 catalog 的唯一 ID、组件引用、羁绊引用、档位定义，manifest 的版本和来源 ID，以及本地转录文件。它不会请求网页或 Gemini。在线抓取受 robots.txt、跳转、页面大小和可读正文限制；单个来源失败会警告并跳过，至少一个来源成功就继续提取，全部失败则报错并保留原数据库。仅通过离线检查不代表在线来源均可成功抓取。

## 启动与发布

```powershell
npm ci
npm run dev
```

浏览器打开 http://localhost:3000。`public/data/meta_comps.json` 已同步完整海克斯目录，并保留教学阵容，没有伪造真实阵容统计。在线提取需要安装 `scripts/requirements.txt`、配置未启用付费的项目密钥 `GEMINI_API_KEY`，再执行 `python scripts/crawler_and_extractor.py`。无需密钥即可运行前端和离线验证。

English: The catalog is configured for China patch 18.3 B. Four blocked Mobalytics URLs were removed. The original local transcript is now an extraction source; refreshes including sample content retain demo=true. Reference entries are excluded. Individual source failures are warned and skipped; no successful content produces a descriptive error. A successful source enables Gemini extraction, which still requires a valid API key and available quota.

海克斯来自当前公开手册快照 `set18-18.3b-live-r3`，与版本固定的游戏数据交叉核对；来源与摘要见 `catalog_provenance.json`。旧赛季专属之徽/之冕家族不在当前池中，不额外编造。导入脚本保留中文名称对应的旧 ID；潘朵拉的备战席档位校正为金色。描述、关键词和类别用于查找，不是战力模拟。汇总文本最多30,000字符，完整提示词最多90,000字符，输出最多16,000 token。
