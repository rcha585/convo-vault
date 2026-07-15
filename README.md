# Convo Vault

如果在 ChatGPT 里遇到一段值得长期保存的对话，怎么办？

如果一段长对话里混着代码、表格、图片、文件线索和思考过程，手动复制太痛苦，怎么办？

如果你不想把私密对话丢给陌生在线转换工具，但又想要漂亮的 Markdown、PDF 和结构化数据，怎么办？

现在你有了 **Convo Vault**。

Convo Vault 是一个本地优先的 Chrome 扩展，用来把 ChatGPT 对话导出成可以长期保存、检索和二次处理的本地档案。它会读取你当前打开的 ChatGPT 对话，把选中的消息打包成本地 `.zip`，里面包含可读的 Markdown、PDF，以及适合后续放进 Obsidian、知识库、搜索索引或 RAG 流程的结构化数据。

当前版本：`0.7.15`

## 最近更新

`0.7.15` 主要把导出从“文本 + 基础 PDF”推进到“轻量工作台归档”：

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
- 默认使用 `Hybrid`
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

`0.7.15` 开始把 ChatGPT 的轻量工作台输出分成两层处理：

- PDF 是给人看的阅读档案：公式、基础图表、代码、表格和图片尽量静态渲染；视频、音频、交互卡片和大文件以清晰卡片或源码降级展示。
- JSON / asset sidecars 是给机器和后续恢复用的证据档案：每个非纯文本对象都会尽量记录 `kind`、`renderStatus`、`degraded`、`degradationReason`、来源消息和链接/素材线索。

这意味着导出目标不是“把所有交互原样塞进 PDF”，而是保证内容不静默丢失：能读的进 PDF，不能静态表达的进 JSON，并在 PDF 中留下可理解的降级记录。

当前 PDF 静态渲染优先支持：

- 行内 / 块级公式，包括常见上下标、分数、根号和数学符号
- Mermaid flowchart、sequenceDiagram、erDiagram、stateDiagram
- 简单 `chart` 代码块，支持 JSON 或 CSV-like 数据生成柱状图、折线图
- GIF、远程图片、视频、音频和交互内容的清晰降级卡片

## Hybrid、Fast 和 Full

`Hybrid` 是默认推荐模式。它先用 `Fast` 读取 ChatGPT conversation API，确定最终消息数量、角色和顺序；再用 `Full` 扫描页面 DOM，补充可见 Thinking、页面细节和渲染线索。最终导出以 Fast 的消息骨架为准，Full 只做补充和异常检查。

这意味着：

- Fast 里有、Full 里也能对齐的消息，会合并补强。
- Fast 里有、Full 没扫到的消息，会保留 Fast。
- Full 多抓出来但不能对齐 Fast 的候选，会进入 debug report，不会直接混进最终导出。
- 纯日期/时间分隔符，比如 `星期日 16:10`，会被当作非消息过滤掉。

`Fast` 是 API-first 模式，速度更快，结构更干净，适合快速确认对话骨架。

`Full` 是 DOM-only 深度扫描模式，速度更慢，主要用于调试页面渲染、虚拟滚动、Thinking/flyout 或特殊内容缺失问题。

日常使用先选 `Hybrid`。只有在排查问题时，才单独比较 `Fast` 和 `Full`。

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
- `*.summary.md`：摘要索引
- `*.assets.manifest.json`：图片和附件资源清单

这些文件的目标不是只让你“下载一份聊天记录”，而是让一段重要对话变成真正属于你的本地资料：能读、能搜、能归档，也能继续接入你自己的知识库工作流。
