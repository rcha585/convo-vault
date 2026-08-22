# Convo Vault

> Knowledge base experiment: Raw Pack v0.1 is available under [`tools/knowledge-pack/`](tools/knowledge-pack/README.md). It imports mixed local files into an Obsidian-compatible, immutable raw evidence layer with hashes, manifests, duplicate detection, and optional PDF page assets. Private Vault folders are excluded from Git.

如果在 ChatGPT 里遇到一段值得长期保存的对话，怎么办？

如果一段长对话里混着代码、表格、图片、文件线索和思考过程，手动复制太痛苦，怎么办？

如果你不想把私密对话丢给陌生在线转换工具，但又想要漂亮的 Markdown、PDF 和结构化数据，怎么办？

现在你有了 **Convo Vault**。

Convo Vault 是一个本地优先的 Chrome 扩展，用来把 ChatGPT 对话导出成可以长期保存、检索和二次处理的本地档案。它会读取你当前打开的 ChatGPT 对话，把选中的消息打包成本地 `.zip`，里面包含可读的 Markdown、PDF，以及适合后续放进 Obsidian、知识库、搜索索引或 RAG 流程的结构化数据。

当前版本：`0.7.26`

## 最近更新

`0.7.26` 重磅推出 Fast 2.0 轮次聚合引擎（Turn-Chain Synthesizer）与全维度元数据提取：

- **Turn-Chain 轮次链路聚合**：彻底解决多步工具调用（DALL-E 绘图、代码沙盒、Drive 插件）导致的 11 条助手回复漏抓与图片丢失问题；保证每个用户提问严格对称对应一个高保真助手大卡片（100% 轮次召回）
- **DALL-E 与多模态图像资产全量保留**：自动提取 DALL-E 绘图节点生成的全部高清图片指针与沙盒工件，消灭 Same-Role Adjacency 断层
- **思考链与精准耗时（Thinking Process & Duration）**：自动提取思考摘要、推理标题与真实思考秒数（如 `Worked for 11s`、`Worked for 9m 38s`），格式化为折叠思考块
- **文献引用与标准角标（Sources & Citations Footnotes）**：自动解析 Google Docs / 网页调研引用，将内部标记替换为标准 Markdown 文献脚注 `[^1]: [标题](URL)`
- **长期记忆与历史对话（Memory & Context）**：自动提取记忆引用与前置历史对话关联卡片

`0.7.25` 增强 Hybrid 2.0 靶向富化与长对话虚拟化缺口自愈：

- **Hybrid 2.0 靶向增强**：以 Fast API 建立的 100% 完整线性拓扑（Ground Truth）为主控骨架，引导 Full DOM 执行靶向精准滚动富化；遇到 DOM 偶发未挂载节点自动以 API 文本保底，彻底杜绝漏抓（100% 召回率）
- **连续序列缺口自愈（Sequential Gap Recovery）**：扫描中发现的最大 Turn 序号 $M$ 自动生成 $1 \sim M$ 连续整数基准；中间虚拟化缺失序号（如 49~51）会自动定位并按比例精准滚动视口补抓
- **动态扫描与遍历预算**：结合视口最大滚动高度与预期消息数自适应调整遍历与水合时间，避免长对话/多图对话在未抵达页面底部前提前超时中断
- **完整性闸门加固**：序列断层缺口与同角色异常相邻（Same-Role Adjacency）直接触发缺失警告并拦截未闭合的不完整快照

`0.7.24` 修复完整性闸门的误报：

- 期望角色统计现在与有序的 canonical turn 身份使用同一组数据，不再把 ChatGPT 页面里无序号的重复 DOM 外壳误算成额外的 user message
- Full 扫描中保留 URL、等到导出时再 Base64 化的图片现在标记为 `deferred`，不再误记为 `failed`；真正缺失来源或导出嵌入失败的图片仍会触发完整性拦截
- Selector 的完整性详情会分别显示 embedded、deferred 和 failed 图片数量

`0.7.23` 改进 Selector 扫描生命周期与完整性保护：

- Selector 改为 Full-first：打开面板不会自动扫描，必须明确点击 `Start Scan`
- 每次扫描由单一任务持有固定模式；取消、切换模式或较旧任务都不能覆盖新的结果
- 导出使用已验证快照的 capture mode，不再读取可能已经变化的下拉框值
- 新增完整性闸门：显示期望/实际消息身份、角色、缺失顺序和图片覆盖；不完整结果默认禁止导出，只能显式 override
- Hybrid 遇到无法对齐的实质 Full-only assistant turn 时会判定为不完整，避免静默漏掉 ImageGen 回复

`0.7.22` 修复图片型对话的抓取与 Bundle 性能问题：

- Full/Hybrid 图片序列化会按稳定资源身份去掉相邻的主图、预览层和模糊层重复节点，同时保留不同清晰度版本和正文后的有意重复引用
- Bundle 内的图片按 SHA-256 内容哈希只保存一次，Markdown 与 JSON 改为引用 `assets/` 路径，避免重复写入大段 Base64
- 资产分析会跳过 Base64 正文的链接与文件名扫描；七张高清图的真实样本从约 245 MB、140 秒降到约 32 MB、13 秒
- Hybrid 针对 ImageGen 等非标准 assistant 节点的兼容修复仍在后续完善；当前此类对话建议使用 Full 模式

`0.7.21` 主要把导出从“文本 + 基础 PDF”推进到“轻量工作台归档”，并改进了思考活动的结构化排版：

- 新增输出类型矩阵：公式、Mermaid、图表、图片、GIF、文件、视频、音频、交互卡片和引用都会进入 PDF/JSON 的归档逻辑
- PDF 支持更好的公式静态排版，包含常见上下标、分数、根号和数学符号
- Mermaid 支持 flowchart、sequenceDiagram、erDiagram 和 stateDiagram 的静态 SVG 渲染
- 新增简单 `chart` 代码块渲染，可以把 JSON 或 CSV-like 数据变成柱状图、折线图
- JSON sidecars 增加 `outputObjects`，记录每个非纯文本对象的类型、渲染状态和降级原因
- 测试样本库扩展到多语言、RTL、输出类型矩阵和视觉渲染样本

## 怎么使用

1. 复制仓库链接：

```text
https://github.com/rcha585/convo-vault.git
```

2. 克隆项目：

```bash
git clone https://github.com/rcha585/convo-vault.git
cd convo-vault
```

3. 安装本地渲染后端依赖：

```bash
cd tools/advanced-pdf
pnpm install
cd ../..
```

4. 构建 Chrome 扩展：

```bash
npm run build:extension
```

5. 在 Chrome 里加载扩展：

- 打开 `chrome://extensions`
- 开启 **Developer mode**
- 点击 **Load unpacked**
- 选择 `dist/convo-vault-extension`

6. 启动本地后端：

- 打开一个 ChatGPT 对话页面
- 点击 Convo Vault 扩展图标
- 在 `Backend folder` 里填入这个仓库目录，比如 `F:\AI\convo-vault`
- 点击 **Copy Start**
- 把复制出来的命令粘贴到终端执行

`Copy Start` 会自动带上本地访问 token。推荐用这个方式启动后端，不要手动裸跑 `npm run backend` 来做正式导出。

7. 导出对话：

- 回到 ChatGPT 对话页面
- 点击扩展图标
- 点击 **Open Selector**
- 面板只打开，不会立即扫描
- 默认使用 `Full (Recommended)`；确认模式后点击 **Start Scan**
- 等待完整性检查通过；若显示缺失消息，先重新扫描或检查列出的缺失顺序
- 勾选要导出的消息
- 导出 bundle

## 需要什么环境

- Chrome 或 Chromium 系浏览器
- Node.js `20+`
- pnpm，用来安装本地 PDF 渲染后端依赖
- 一个已经登录 ChatGPT 的浏览器会话
- 本地可以运行 Node 服务的终端环境

常用命令：

```bash
npm run build:extension
npm run check
npm test
npm run test:fixtures
npm run backend:check
```

如果后端是通过 **Copy Start** 带 token 启动的，`backend:check` 也需要同一个 `CGCE_LOCAL_API_TOKEN`；没有 token 时返回 `401` 是安全拦截，不是服务坏了。

## 多语言导出

Convo Vault 的界面和按钮目前保持英文，但导出的对话内容按 Unicode 原文保留。也就是说，你可以导出中文、英文、西语、意大利语、日语、韩语，或者多种语言混合的 ChatGPT 对话。

`0.7.14` 加固了 PDF 渲染的多语言文字能力：

- PDF HTML 使用中性语言标记，避免把所有内容都当成中文页面
- 字体 fallback 增加日文、韩文、阿拉伯文、希伯来文和通用 Noto 字体链
- CI 里加入 `npm run test:fixtures` 样本回归流，覆盖西语重音、意大利语重音、日语、韩语、中文、阿拉伯语、希伯来语、emoji、代码块、表格和混合文字方向
- 样本库会同时检查 PDF HTML、Markdown 和 JSON data sidecar，避免只在某一种输出里“看起来正常”

这里的“多语言支持”指的是保留原语言导出，不是自动翻译。PDF、Markdown 和 JSON sidecars 都应该保留原始文本。

## 输出类型归档

`0.7.21` 开始把 ChatGPT 的轻量工作台输出分成两层处理：

- PDF 是给人看的阅读档案：公式、基础图表、代码、表格和图片尽量静态渲染；视频、音频、交互卡片和大文件以清晰卡片或源码降级展示。
- JSON / asset sidecars 是给机器和后续恢复用的证据档案：每个非纯文本对象都会尽量记录 `kind`、`renderStatus`、`degraded`、`degradationReason`、来源消息和链接/素材线索。

这意味着导出目标不是“把所有交互原样塞进 PDF”，而是保证内容不静默丢失：能读的进 PDF，不能静态表达的进 JSON，并在 PDF 中留下可理解的降级记录。

当前 PDF 静态渲染优先支持：

- 行内 / 块级公式，包括常见上下标、分数、根号和数学符号
- Mermaid flowchart、sequenceDiagram、erDiagram、stateDiagram
- 简单 `chart` 代码块，支持 JSON 或 CSV-like 数据生成柱状图、折线图
- GIF、远程图片、视频、音频和交互内容的清晰降级卡片

## Hybrid、Fast 和 Full

`Full` 是默认推荐模式。它扫描页面 DOM、处理虚拟化消息，并保留 ImageGen、图片型回复和没有普通 API `message-id` 的 assistant turn。

打开 Selector 不会启动任何模式。选择模式后必须点击 `Start Scan`。扫描运行期间模式会锁定；取消、关闭面板或任务失效后，旧结果不能覆盖当前快照。

`Hybrid` 仍然可用，但对 ImageGen 和其他非标准 assistant turn 标记为 Experimental。它先用 `Fast` 读取 ChatGPT conversation API，再用 `Full` 补充页面细节。若 Full 发现无法对齐 Fast 骨架的实质消息，完整性闸门会把结果标为不完整并阻止静默导出。

这意味着：

- Fast 里有、Full 里也能对齐的消息，会合并补强。
- Fast 里有、Full 没扫到的消息，会保留 Fast。
- Full 多抓出来但不能对齐 Fast 的实质候选，会进入完整性报告和 debug report，并阻止普通导出。
- 纯日期/时间分隔符，比如 `星期日 16:10`，会被当作非消息过滤掉。

`Fast` 是 API-first 模式，速度更快，结构更干净，适合快速确认对话骨架。

`Full` 是 DOM-only 深度扫描模式，速度更慢，但当前是长对话、ImageGen、Thinking/flyout 和特殊内容的正常推荐路径。

`Fast` 适合快速查看 API 骨架；`Hybrid` 适合实验性对比；需要完整归档时先选 `Full`。

## 安全措施

Convo Vault 的默认导出流程是本地优先：

- 扩展只读取当前打开的 ChatGPT 页面
- 渲染后端只监听 `127.0.0.1`
- PDF、Markdown 和 zip bundle 都在本机生成
- 不使用远程 PDF 服务
- 运行时数据默认放在 `.convo-vault/`，这个目录不会进 Git

本地后端现在带有 token 门禁：

- popup 会生成随机本地 token
- **Copy Start** 会把 token 传给本地后端
- popup 和 content script 请求后端时会带 `X-Convo-Vault-Token`
- 后端会校验 token，不匹配就返回 `401`
- 如果后端没有配置 token，带浏览器 `Origin` 的请求会被拒绝

这主要解决的是：普通网页不能随便调用你的本地后端，比如误触 `/shutdown`、提交大 payload 让本机渲染，或读取 `/health` 返回的信息。

还有一些产品化安全项会继续收紧，比如逐步减少 `<all_urls>` 权限、把更多图片抓取能力迁到本地后端、进一步细化 CORS 策略。当前优先保证核心导出链路稳定，不先破坏图片和附件导出能力。

## 会输出什么

每次导出通常会得到一个 `.zip` bundle，里面包含：

- `*.md`：可读 Markdown 档案
- `*.pdf`：本地渲染 PDF
- `*.payload.json`：完整导出 payload
- `*.conversation.json`：对话级元数据
- `*.messages.jsonl`：逐条消息 JSONL
- `*.qa-pairs.json`：问答配对
- `*.topics.json`：话题索引
- `*.entities.json`：链接、文件名、日期等实体线索
- `*.agent-trace.json`：Agent 认知与工具调用执行链路（含内部文档切片、搜索记录、代码调用）
- `*.agent-trace.md`：Agent 认知链路与工具执行可读分析报告
- `*.summary.md`：摘要索引
- `*.assets.manifest.json`：图片和附件资源清单

这些文件的目标不是只让你“下载一份聊天记录”，而是让一段重要对话变成真正属于你的本地资料：能读、能搜、能归档，也能继续接入你自己的知识库工作流。
