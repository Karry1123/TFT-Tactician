# 当前国服资料配置 / Current China catalog

核对日期：2026-10-01。国服版本为 **18.3 B**，`patch` 字段采用公告原样 `18.3 B`。版本公告原文链接和各字段数据来源见 `scripts/catalog_provenance.json`。本项目针对 PC 云顶之弈，不是金铲铲之战。

`scripts/catalog.json` 含 10 种散件、36 种普通成装配方、65 个基础棋子记录及 9 个拉克丝起源变体、36 个羁绊、3 个海克斯档位定义和24个常用海克斯。拉克丝基础记录是通用身份，实际阵容应选择对应起源变体，不能把多个变体作为不同棋子同时上场。远古巨龙的 `boardSlots=2` 已纳入转型人口检查。羁绊计数与特殊赛季机制未做完整战斗模拟。

`scripts/sources.json` 配置6个条目：4篇攻略、1篇腾讯版本公告参考、1份原创中文教学转录。`purpose=guide` 才参与定时实盘提取；`reference` 用于人工核对；`sample` 用于本地路径及内容校验，不作为实盘推荐依据。在线攻略为国际服18.3攻略候选，并非已核验的国服18.3 B胜率统计；每次发布前需要检查热更新适配与页面版本。网页可能变化，需定期维护来源。

原创样例位于 `scripts/transcripts/sample_guide.txt`，包含 Fast 8、Fast 9、维迦追三、装备队列、二星节点及转型顺序。它不是外部视频转载，使用说明写在文件开头。若要导入真实授权转录，请新增 `purpose=guide` 的 transcript 条目，并使用作者真实 HTTPS 原文链接。

## 本地验证

```powershell
python scripts/crawler_and_extractor.py --validate-only
python -m unittest discover -s scripts -p "test_*.py"
npm run typecheck
npm run build
```

离线验证会检查 catalog 的唯一 ID、组件引用、羁绊引用、档位定义，manifest 的版本和来源 ID，以及本地转录文件。它不会请求网页或 Gemini。在线抓取受 robots.txt、跳转、页面大小和可读正文限制；失败时保留原数据库。仅通过离线检查不代表在线来源均可成功抓取。

## 启动与发布

```powershell
npm ci
npm run dev
```

浏览器打开 http://localhost:3000。当前前端读取的 `public/data/meta_comps.json` 仍是明确标记的演示数据库；本次修改仅准备实盘资料输入，没有伪造真实阵容输出。需要安装 `scripts/requirements.txt` 中的依赖并设置不启用付费的 AI Studio 项目密钥 `GEMINI_API_KEY`，再运行 `python scripts/crawler_and_extractor.py`；成功提取后才会替换数据库。没有密钥也能运行演示前端和离线验证。

English: The catalog is configured for China patch 18.3 B. Four rolling international base-patch guides are candidate inputs, not verified China-hotfix statistics. Reference and original sample entries are excluded from live extraction. The frontend continues to show its labelled demo until a successful validated Gemini extraction. Run the commands above for offline verification and development.
