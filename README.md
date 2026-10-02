# TFT-Tactician

[English](#architecture) | [中文版](#中文版)

Current catalog setup / 当前国服资料配置：见 [版本说明](docs/current-patch-notes.md)。`scripts/catalog.json` 已更新至国服18.3 B；前端发布数据库仍为演示，成功实盘提取后才更新。

A static China-region TFT cockpit. Next.js App Router, TypeScript, Tailwind,
Lucide, and a local shadcn/ui Button. There is no hosted backend, runtime LLM,
database service, subscription, telemetry dependency, or authentication service.

The published `public/data/meta_comps.json` uses illustrative `DEMO-ONLY` units. It is a working fixture,
**not a current China patch recommendation**. Replace it before using recommendations
in actual matches. Mainland connectivity to the chosen static host must be checked
from your own network; this project does not promise access or game integration.

## Architecture

```text
Curated guides / authorized transcript files
    → GitHub Actions (03:00 UTC / 11:00 China daily)
    → one Gemini 3.8 Flash structured extraction (GEMINI_MODEL override)
    → strict Pydantic + patch/catalog/provenance checks
    → atomic public/data/meta_comps.json update
    → git commit and push to default branch
    → host's Git integration rebuilds static site
    → browser fetches /data/meta_comps.json and validates with Zod
    → deterministic evaluation + localStorage decision logs
```

## Run and verify

Use Node.js 22 or newer and Python 3.12.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
python -m pip install -r scripts/requirements.txt
python scripts/crawler_and_extractor.py --validate-only
python -m unittest discover -s scripts -p 'test_*.py'
```

`npm run build` exports the complete static site into `out/`. Serve that directory
with any static web server. The page fetches the JSON at runtime with `no-store`;
deployments must include the regenerated `out/data/meta_comps.json`.
On a patch change the local session is reset. Logs contain state snapshots,
scores, timestamps, comp IDs, and the data revision, with a 100-entry cap and JSON export.
Scores are heuristic fit scores, not win probabilities; manual inputs do not alter the game.

## Enable live daily sync

The default extraction model is `gemini-3.8-flash`. Set the local environment
variable `GEMINI_MODEL` or the repository Actions variable of the same name to
override it. Unset, empty, or whitespace-only values use the default. Requests use
the selected model's native thinking defaults. Check model access and free quota
in your unbilled AI Studio project; there is no automatic model fallback.

1. Create a Google AI Studio API key for a project **without enabled billing**.
   Store it as the repository Actions secret `GEMINI_API_KEY`. Never use a
   `NEXT_PUBLIC_` environment variable for this secret or put it in the JSON.
2. Maintain `scripts/catalog.json` as a verified current CN catalog of components,
   item recipes, units, traits, and augment tiers. Set `patch` to the real patch
   label and `demo` to `false`. IDs must be stable, lowercase, and unique.
3. Set the same patch label in `scripts/sources.json`. Choose up to six reliable,
   current-patch guides. Source selection determines what “top guides” means;
   automatic ranking/discovery is an adapter left for the operator.
4. Configure source entries such as these (replace the example URLs):

   ```json
   {
     "patch": "YOUR-CN-PATCH",
     "sources": [
       {"id":"forum-guide","url":"https://example.com/guide","title":"Verified patch guide","kind":"html"},
       {"id":"bili-guide","url":"https://www.bilibili.com/video/YOUR_VIDEO_ID","title":"Authorized transcript","kind":"transcript","path":"scripts/transcripts/guide.txt"}
     ]
   }
   ```

5. Allow Actions read/write repository permissions and the bot's push to the
   default branch. If branch protections block direct bot writes, use a PR-based
   publishing policy instead; this workflow intentionally fails rather than
   bypassing protections or force pushing. Run the workflow manually once.
6. Connect the repository to the static host's Git integration so successful data
   commits redeploy. Configure an external integration, not an Actions workflow
   triggered by the bot commit: `GITHUB_TOKEN` pushes do not recursively trigger
   other Actions workflows.

HTML ingestion respects robots.txt, rejects redirects/private network URLs, enforces
timeouts and response/text limits, and extracts readable article text. A 404 robots
file permits crawling; other robots failures skip that source with a warning. HTTP
errors, timeouts, unreadable transcripts, and insufficient text also skip only the
affected source. Extraction proceeds with any successful guide or sample; if none
succeed, the job reports a descriptive error and preserves the database. Sources requiring
login, JS rendering, anti-bot bypass, or video transcription are not scraped.
Use creator-authorized transcript text under `scripts/transcripts/`; there is no
paid ASR dependency. Guide text is bounded untrusted input, never executed.
The configured original `sample_guide.txt` participates in extraction as a reliable
local fallback. Any refresh containing sample content is marked `demo=true`.
`purpose=reference` entries are never ingested. The four blocked Mobalytics guide
URLs have been removed from the active manifest.

Gemini receives the full JSON schema in the prompt alongside the canonical catalog.
The API request uses JSON mode (`response_mime_type=application/json`) and explicit
user/text content; it sends neither `response_schema` nor `response_json_schema`.
Strict schema enforcement happens locally after generation. On API failure, logs
include supplied payload/config keys and safe config values, without the API key
or prompt text. Pydantic rejects
unknown IDs, duplicate IDs, wrong types, extra fields, invalid recipes, mismatched
patch labels, invalid holders and missing provenance. Schema validity cannot prove
that extracted advice is true: review your sources and the bot's data diff.
No source, no semantic change, quota exhaustion, extraction failure, or invalid
output preserves the previous valid database. Failure is visible in Actions.
Version history is Git; `revision` increments only for semantic changes. Runtime
validation in the browser catches a malformed manually edited static database.

## Evaluation rules

The engine is pure: it neither mutates input nor makes network calls.

| Signal | Rule |
| --- | --- |
| Item deficit | Reserve component counts in item priority order; each missing half-recipe is weighted by `1 / priority`. A double-belt item needs two belts. Completed items are counted once. |
| Augment fit | Weighted average of explicit ratings from -1 to 1; silver/gold/prismatic weights are 1/1.4/1.8. An unspecified augment is neutral. |
| Transition distance | Missing target units plus 0.5 per off-target board unit, divided by target size, capped at 1. Bench units reduce missing-unit distance. Before 3-2, use the curated early board. |
| Score | `100 - 45 × itemDeficit - 30 × transitionDistance + 15 × augmentFit + tierBonus`; S/A/B bonuses = 5/2/0. Ties use comp ID. The score may exceed 100. |
| Milestones | Report the latest reached deadline and upcoming ones. Owned two/three-star copies satisfy two-star requirements, on board or bench. Older deadlines retire when the next deadline is reached. |
| Pivot | Trigger at HP ≤ 35 or an owned, off-comp five-cost. Prefer available plans and candidates using the unexpected unit. |

Item priority order reserves available components even for partially complete recipes;
it is a greedy recommendation, not a global item optimizer. Equipped items on retained
units cannot be moved without a remover, so they are not credited to another holder.
Items on units outside the destination final comp can be recovered by selling the holder.
Equipment capacity is checked conservatively on the highest-star target copy.
The UI lets you record completed equipped items; loose completed items, reforgers,
removers, emblems, augments that change item rules, unit copy pools, opponents and shop
probabilities are outside this deterministic model.

Pivot plans require owned replacements, enough level and gold, and delivery slots.
At low HP they also require the current two-star deadline. Missing future items become
an acquisition queue, not a claim that they already exist. Plans show replacements,
sales, recovery of completed items and delivery targets; they do not assume completed
items can be broken into components. The configured minimum gold is a reserve threshold,
not an estimate of a guaranteed shop roll cost.

## Zero recurring cost deployment

| Service | Free configuration |
| --- | --- |
| GitHub | Standard Linux runner; public repository is simplest. One run daily with an eight-minute cap, no stored artifacts or paid runner. Private repositories use their included monthly minutes. |
| Gemini | Unbilled AI Studio project; defaults to `gemini-3.8-flash` (override with `GEMINI_MODEL`); exactly one request/run, no SDK retry, grounding, paid fallback or runtime requests. If quota is unavailable, refresh fails and the old JSON remains. |
| Cloudflare Pages | Free plan, Git integration, framework preset `None`, build command `npm run build`, output directory `out`. No Workers or paid services. |
| Vercel | Personal noncommercial Hobby project, Next.js preset, `npm run build`, static export. No functions or paid add-ons. |

Free tiers and region/model availability can change. Code cannot determine whether your
API key's project has billing enabled. **Zero paid usage depends on using an unbilled
project and staying on the free hosting plans**; a request count cap alone cannot make a
billed key free. Hosting traffic/build limits also still apply. Use provider subdomains
to avoid domain registration cost. No services have been provisioned by this repository.
GitHub cron is best effort and public repo schedules can be disabled after inactivity.

Primary references checked for this implementation:

- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini rate limits: check actual project quotas in AI Studio](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub event triggers and token behavior](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow)
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Vercel Hobby personal-use restriction](https://vercel.com/docs/plans/hobby)

---

## 中文版

TFT-Tactician 是面向国服《云顶之弈》的静态战术台，使用 Next.js App Router、
TypeScript、Tailwind CSS、Lucide 图标和本地 shadcn/ui 按钮组件。
阵容评分和转型建议全部在浏览器中计算，无需托管后端、数据库服务或运行时大模型调用。

内置的 `DEMO-ONLY` 数据使用示例单位，**不代表当前国服版本的真实阵容或强度**。
可以用它体验操作、推荐和阶段日志；实际对局使用前，请替换成经过核实的国服版本数据。
国内网络能否访问所选静态托管平台，需要自行验证。本项目不读取或控制游戏客户端。

### 本地快速运行

安装 Node.js 22 或更新版本。仅体验前端时，无需安装 Python 或配置 Gemini API Key。

在 PowerShell 中执行：

```powershell
cd "F:\Teamfight Tactics"
npm.cmd ci
npm.cmd run dev
```

浏览器打开 **http://localhost:3000**。如终端提示使用了其他端口，请打开终端显示的地址。
停止服务时，在终端按 `Ctrl+C`。其他操作系统可将 `npm.cmd` 替换为 `npm`，并使用自己的项目路径。

页面操作：

1. 设置阶段、生命值、金币、等级与当前目标阵容。
2. 点击已获得的海克斯，最多选择三个；填写尚未合成的散件数量。
3. 点击单位加入板凳，再设置其星级、位置和已装备的成装。
4. 查看实时阵容排名、二星节点和装备优先队列。
5. 生命值不高于 35 或获得阵容外五费单位时，查看转型条件和执行步骤。
6. 点击「记录此决策」保存阶段快照；日志支持导出 JSON。「开始新对局」会重置当前状态和日志。

对局状态和最多 100 条日志保存在当前浏览器的 `localStorage` 中，不会同步到其他设备。
日志包含时间、阶段、输入状态、阵容 ID、评分和数据版本。数据的版本标签变化时，
旧对局会重置，避免混用不同版本的数据。浏览器存储不可用时，请导出日志自行保存。

### 架构与数据更新路径

```text
人工选择的攻略网页 / 已获授权的视频文字稿
    → GitHub Actions：每日 UTC 03:00（北京时间 11:00）
    → Gemini 3.8 Flash（可通过 GEMINI_MODEL 覆盖）：每次运行最多一次结构化提取
    → Pydantic 严格校验字段、版本、目录引用和来源
    → 原子更新 public/data/meta_comps.json
    → git commit / push 到默认分支
    → 静态托管平台的 Git 集成重新构建网站
    → 浏览器读取 /data/meta_comps.json 并通过 Zod 校验
    → 本地评分、转型建议和阶段日志
```

### 验证与静态构建

前端检查：

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

构建结果位于 `out/`，可由静态网站服务直接托管。页面通过 `no-store` 方式读取 JSON；
部署时必须包含最新构建生成的 `out/data/meta_comps.json`。

运行数据处理脚本需要 Python 3.12。建议创建独立虚拟环境，无需激活即可执行：

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r scripts/requirements.txt
.venv\Scripts\python.exe scripts/crawler_and_extractor.py --validate-only
.venv\Scripts\python.exe -m unittest discover -s scripts -p "test_*.py"
```

`--validate-only` 校验现有数据库、catalog、sources、版本一致性及本地转录文件路径与内容长度，不调用 Gemini、不更新文件。

提取模型默认使用 `gemini-3.8-flash`。本地可设置环境变量 `GEMINI_MODEL`，
GitHub Actions 可设置同名仓库变量；未设置、空值或纯空白均使用默认模型。
请求使用模型原生思考配置，不强制旧版的零思考预算。请在未启用计费的 AI Studio
项目中确认所选模型可用且有免费配额；不会自动改用其他模型。
`--mock` 同样用于离线校验当前示例数据，不会发布真实攻略。

### 配置真实攻略每日同步

1. 在 Google AI Studio 中，为**未启用计费**的项目创建 API Key。
   上传项目到 GitHub 后，进入仓库的 **Settings → Secrets and variables → Actions**，
   添加名为 `GEMINI_API_KEY` 的仓库 Secret。不要将密钥写入 JSON、提交到仓库，
   或放入以 `NEXT_PUBLIC_` 开头的前端环境变量。
2. 更新 `scripts/catalog.json`，填写当前国服版本的散件、成装配方、单位、羁绊和海克斯档位。
   将 `patch` 改为真实版本标签，设置 `demo: false`。ID 必须稳定、唯一，
   以小写字母或数字开头，只包含小写字母、数字、下划线或连字符。
3. 在 `scripts/sources.json` 中设置相同的 `patch`，并配置最多六个可靠的同版本攻略来源。
   当前需要人工选择攻略；自动发现和排序热门攻略属于后续可扩展的适配器。
4. 按下面格式填写来源，替换所有示例地址：

   ```json
   {
     "patch": "YOUR-CN-PATCH",
     "sources": [
       {
         "id": "forum-guide",
         "url": "https://example.com/guide",
         "title": "已核实的当前版本攻略",
         "kind": "html"
       },
       {
         "id": "bili-guide",
         "url": "https://www.bilibili.com/video/YOUR_VIDEO_ID",
         "title": "已获授权的视频文字稿",
         "kind": "transcript",
         "path": "scripts/transcripts/guide.txt"
       }
     ]
   }
   ```

5. 在 GitHub 仓库的 **Settings → Actions → General → Workflow permissions** 中，
   确保工作流可以读写仓库，且允许机器人推送默认分支。
   若分支保护禁止直接推送，需要调整为通过 PR 发布数据的流程；现有工作流会报错，
   不会绕过保护或强制推送。
6. 进入 **Actions → Daily China TFT sync → Run workflow**，手动运行一次并查看日志与数据差异。
   定时配置位于 `.github/workflows/daily_sync.yml`，cron 为 `0 3 * * *`。
7. 将仓库连接至静态托管平台的 Git 集成，让数据提交后自动重新部署。
   使用 `GITHUB_TOKEN` 推送的提交不会递归触发其他 Actions 工作流，
   因此应使用托管平台的 Git 集成完成重新部署。

HTML 抓取遵守 `robots.txt`，拒绝重定向和私有网络地址，并限制请求时间、响应大小和文本长度。
`robots.txt` 返回 404 时允许抓取；其他读取失败或拒绝抓取只跳过该来源并记录警告。
HTTP 错误、超时、本地文件读取失败或正文过短也按单个来源跳过。至少一个攻略或样例
来源成功就继续提取；全部失败时明确报错并保留原数据库。
需要登录、JavaScript 渲染、绕过反爬措施或视频语音转写的来源，不会被自动处理。
Bilibili 等视频来源应使用已获授权的文字稿，保存为 `scripts/transcripts/` 下的 `.txt` 文件。
配置中的原创 `sample_guide.txt` 已作为可靠的本地提取来源接入。只要提取输入包含
`purpose=sample` 内容，生成数据库就标记 `demo=true`；`purpose=reference` 不参与提取。
四个被反爬拦截的 Mobalytics 攻略链接已从实际来源配置移除。
系统不依赖付费语音转写服务，也不会执行攻略文本中的指令。

完整 JSON Schema 和标准目录放在 Gemini 提示词中；API 请求仅设置 JSON 模式
（`response_mime_type=application/json`），使用明确的 user/text 内容格式，
不发送 `response_schema` 或 `response_json_schema`。生成后继续执行本地严格校验。
API 失败时记录请求/配置字段及配置值，不记录 API Key 或提示词正文。
Pydantic 会拒绝未知或重复的 ID、
错误类型、额外字段、无效配方、版本不匹配、无效装备持有者和缺失的来源引用。
结构校验不能证明攻略内容真实，仍需检查来源与机器人的数据提交差异。

未配置来源、内容无实质变化、API 配额耗尽、提取失败或输出无效时，保留上一份有效数据库。
失败可在 Actions 日志中查看。Git 保存历史版本，`revision` 只在内容发生实质变化时递增。
浏览器还会校验静态 JSON，避免手动修改造成无效数据被使用。

### 评分与转型规则

评估引擎是纯函数，不修改输入，也不发起网络请求。评分表示启发式适配程度，不是胜率。

| 信号 | 计算规则 |
| --- | --- |
| 装备缺口 | 按装备优先级预留散件；每缺少半份配方，按 `1 / priority` 加权。双腰带配方需要两个腰带，已有成装只计算一次。 |
| 海克斯适配 | 显式适配值范围为 -1 到 1，按银色、金色、彩色权重 1、1.4、1.8 计算加权平均；未配置的适配值视为中性。 |
| 过渡距离 | 缺少的目标单位数量，加上每个场上非目标单位的 0.5 惩罚，再除以目标阵容大小，最大为 1。板凳上的目标单位可减少缺口；3-2 前使用配置的前期过渡阵容。 |
| 总分 | `100 - 45 × itemDeficit - 30 × transitionDistance + 15 × augmentFit + tierBonus`。S、A、B 档加分分别为 5、2、0；同分按阵容 ID 排序。分数可能超过 100。 |
| 二星节点 | 展示最近已到达的节点及未来节点。场上或板凳的二星、三星单位均满足二星要求；到达下一节点后，旧节点不再要求补齐。 |
| 转型触发 | 生命值 ≤ 35，或已持有阵容外五费单位时触发；优先展示条件已满足的方案，以及能使用意外五费单位的方案。 |

装备队列采用按优先级分配的贪心策略：即使某件装备暂时无法合成，也会为其预留已有散件。
因此，它不保证找到所有装备组合中的全局最优方案。
保留单位上的成装无法在没有拆卸器时转给其他单位，所以不会重复计入其他持有者。
不属于目标最终阵容的单位，其成装可通过出售持有者回收。
装备槽位会按所选的最高星级目标单位副本进行保守检查。

当前界面支持录入已装备成装。闲置成装、重铸器、拆卸器、纹章、改变装备规则的海克斯、
牌库数量、对手状态和商店命中概率不在模型范围内。

可执行的转型方案要求替换单位已经持有、等级和金币达到门槛、装备接收者有足够槽位。
低血量时还要求满足当前二星节点。尚缺的装备会进入后续获取队列。
步骤包含单位替换、出售、成装回收和装备交付，不假设成装能够自动拆回散件。
配置中的最低金币是保留金币门槛，不是保证能搜到目标牌的预算。

### 零持续费用部署

| 服务 | 免费配置 |
| --- | --- |
| GitHub Actions | 使用标准 Linux 托管运行器。公共仓库配置最简单；每日运行一次，每次最多八分钟，不保存构建产物，不使用付费运行器。私有仓库消耗账户自带的每月免费分钟数。 |
| Gemini | 使用未启用计费的 AI Studio 项目，默认模型 `gemini-3.8-flash`，可通过 `GEMINI_MODEL` 覆盖。每次提取最多一次请求，无 SDK 重试、联网检索、付费降级方案或前端实时调用。配额不可用时保留旧数据。 |
| Cloudflare Pages | Free 计划，连接 Git 仓库，框架预设选择 `None`，构建命令 `npm run build`，输出目录 `out`。无需 Workers 或付费服务。 |
| Vercel | 个人非商业用途的 Hobby 项目，选择 Next.js 预设，构建命令 `npm run build`，使用静态导出，不配置函数或付费附加服务。 |

免费额度、地区支持和模型可用性可能变化。代码无法判断 API Key 所属项目是否启用了计费。
**零付费使用依赖于未启用计费的 Gemini 项目，以及免费托管计划**；
仅限制请求次数不能保证已启用计费的密钥不会产生费用。
托管平台的流量和构建次数限制仍然适用。使用平台提供的免费子域名可以避免域名注册费用。
本仓库没有替你创建任何云服务。GitHub 定时任务不保证准时执行，公共仓库长期不活跃时，
定时任务可能被停用。

官方参考资料：

- [Gemini 价格与免费层](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 配额限制：实际项目额度以 AI Studio 为准](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini 结构化输出](https://ai.google.dev/gemini-api/docs/structured-output)
- [GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub 工作流触发与令牌行为](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow)
- [Next.js 静态导出](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Vercel Hobby 个人用途限制](https://vercel.com/docs/plans/hobby)
