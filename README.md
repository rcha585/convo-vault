# Convo Vault

如果在 ChatGPT 里遇到一段值得长期保存的对话，怎么办？

如果一段长对话里混着代码、表格、图片、文件线索和思考过程，手动复制太痛苦，怎么办？

如果你不想把私密对话丢给陌生在线转换工具，但又想要漂亮的 Markdown、PDF 和结构化数据，怎么办？

现在你有了 **Convo Vault**。

Convo Vault 是一个本地优先的 Chrome 扩展，用来把 ChatGPT 对话导出成可以长期保存、检索和二次处理的本地档案。它会读取你当前打开的 ChatGPT 对话，把选中的消息打包成本地 `.zip`，里面包含可读的 Markdown、PDF，以及适合后续放进 Obsidian、知识库、搜索索引或 RAG 流程的结构化数据。

当前版本：`0.7.9`

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
npm run backend:check
```

如果后端是通过 **Copy Start** 带 token 启动的，`backend:check` 也需要同一个 `CGCE_LOCAL_API_TOKEN`；没有 token 时返回 `401` 是安全拦截，不是服务坏了。

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
