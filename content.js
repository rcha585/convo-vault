(() => {
  const EXPORTER_VERSION = "0.4.2";
  const installedState = window.__chatGptConversationExporterInstalled;

  if (
    installedState
    && typeof installedState === "object"
    && installedState.version === EXPORTER_VERSION
  ) {
    return;
  }

  if (
    installedState === true
    && window.__chatGptConversationExporterVersion === EXPORTER_VERSION
  ) {
    return;
  }

  window.__chatGptConversationExporterInstalled = {
    version: EXPORTER_VERSION,
    installedAt: Date.now()
  };
  window.__chatGptConversationExporterVersion = EXPORTER_VERSION;
  const TOP_LOAD_ATTEMPTS = 14;
  const WALK_ATTEMPTS = 56;
  const SCROLL_SETTLE_MS = 110;
  const DOM_IDLE_MS = 45;
  const MAX_DOM_IDLE_MS = 220;
  const CAPTURE_SETTLE_MS = 12;
  const TOP_STABLE_PASSES = 2;
  const MAX_SCAN_MS = 75_000;
  const HYDRATE_RESERVED_MS = 15_000;
  const MISSING_TURN_RECOVERY_MS = 18_000;
  const TURN_HYDRATION_SETTLE_MS = 70;
  const CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS = 3500;
  const THINKING_FLYOUT_AUTO_OPEN_LIMIT = 48;
  const THINKING_FLYOUT_OPEN_TIMEOUT_MS = 1400;
  const DEBUG_EVENT_LIMIT = 500;
  const DETAILED_DEBUG_LOG = false;
  const PDF_IMAGE_PRELOAD_LIMIT = 18;
  const PDF_LINK_CHIP_PADDING_X = 5.2;
  const ADVANCED_PDF_RENDERER_URL = "http://127.0.0.1:38474";
  const MESSAGE_NODE_SELECTORS = [
    '[data-turn-id]',
    '[data-turn-container]',
    '[data-turn-id-container]',
    '[data-testid^="conversation-turn-"]',
    '[data-testid*="conversation-turn"]',
    'div[data-turn-id]',
    'div[data-turn-container]',
    'div[data-turn-id-container]',
    '[data-message-author-role]',
    '[data-message-id]',
    'main [data-is-streaming]',
    'main [class*="result-streaming"]',
    '[data-testid*="assistant" i]',
    '[data-testid*="bot-message" i]',
    '[data-testid*="user-message" i]',
    'main [data-start]',
    'main .markdown',
    'main [class*="markdown"]',
    'main [class*="prose"]',
    'main [class*="response"]',
    'main [class*="message"]',
    'main [class*="group/turn"]',
    'main [class*="group\\/turn"]',
    'main article',
    'main [role="article"]',
    'main [data-testid*="message"]',
    'main [class*="assistant" i]',
    'main [class*="group/conversation-turn"]',
    'main [class*="conversation-turn"]'
  ];
  const ASSISTANT_BODY_SELECTORS = [
    '[data-message-author-role="assistant"]',
    '[data-message-author-role="assistant"] div.markdown.prose',
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"] [class*="markdown"]',
    '[data-message-author-role="assistant"] [class*="prose"]',
    '[data-message-author-role="assistant"] [dir="auto"]',
    '[data-message-author-role="assistant"] p',
    '[data-message-author-role="assistant"] li',
    '[data-message-author-role="assistant"] table',
    '[data-message-author-role="assistant"] [data-start]',
    '[data-message-author-role="assistant"] [class*="response"]',
    '[data-message-author-role="assistant"] [class*="text-base"]',
    '[data-message-author-role="assistant"] [class*="min-w-0"]',
    '[data-message-author-role="assistant"] [class*="w-full"]',
    '[data-message-author-role="assistant"] [class*="break-words"]',
    '[data-message-author-role="assistant"] [data-is-streaming]',
    '[data-message-author-role="assistant"] [class*="result-streaming"]',
    '[data-turn-id] [data-message-author-role="assistant"]',
    '[data-turn-id] div.markdown.prose',
    '[data-turn-id] .markdown',
    '[data-turn-id] [class*="markdown"]',
    '[data-turn-id] [class*="prose"]',
    '[data-turn-id] [dir="auto"]',
    '[data-turn-id] [data-is-streaming]',
    '[data-turn-container] [data-message-author-role="assistant"]',
    '[data-turn-container] div.markdown.prose',
    '[data-turn-container] .markdown',
    '[data-turn-container] [class*="markdown"]',
    '[data-turn-container] [class*="prose"]',
    '[data-turn-container] [dir="auto"]',
    '[data-turn-container] [data-is-streaming]',
    '[data-turn-id-container] [data-message-author-role="assistant"]',
    '[data-turn-id-container] div.markdown.prose',
    '[data-turn-id-container] .markdown',
    '[data-turn-id-container] [class*="markdown"]',
    '[data-turn-id-container] [class*="prose"]',
    '[data-turn-id-container] [dir="auto"]',
    '[data-turn-id-container] [data-is-streaming]',
    '[data-testid="bot-message"]',
    '[data-testid*="bot-message"]',
    '[data-testid*="assistant-message"]',
    '[data-testid*="assistant-response"]',
    '[data-testid*="assistant-turn"]',
    '[data-testid*="model-response"]',
    '[data-testid*="response"] [class*="markdown"]',
    '[data-testid*="assistant"] .markdown',
    '[data-testid*="assistant"] [class*="markdown"]',
    '[data-testid*="assistant"] [class*="prose"]',
    '[data-testid*="assistant"] [dir="auto"]',
    '[data-testid*="assistant"] [data-start]',
    'article [data-message-author-role="assistant"]',
    'article .markdown',
    'article [class*="prose"]',
    'article [dir="auto"]',
    '[data-is-streaming]',
    '[class*="result-streaming"]',
    '[data-start]',
    '[class*="markdown"]',
    '[class*="prose"]',
    '[class*="response"]',
    '[dir="auto"]',
    '.markdown'
  ];
  const USER_BODY_SELECTORS = [
    '[data-message-author-role="user"]',
    '[data-message-author-role="user"] [class*="whitespace-pre-wrap"]',
    '[data-testid="user-message"]',
    '[data-testid*="user-message"]',
    '.whitespace-pre-wrap',
    '[class*="whitespace-pre-wrap"]'
  ];
  const THINKING_SELECTORS = [
    '[data-testid*="reasoning" i]',
    '[data-testid*="thinking" i]',
    '[data-testid*="thought" i]',
    '[aria-label*="reasoning" i]',
    '[aria-label*="thinking" i]',
    '[aria-label*="thought" i]',
    '[aria-label*="\u601d\u8003"]',
    '[aria-label*="\u63a8\u7406"]',
    '[title*="reasoning" i]',
    '[title*="thinking" i]',
    '[title*="thought" i]',
    '[title*="\u601d\u8003"]',
    '[title*="\u63a8\u7406"]',
    '[class*="reasoning" i]',
    '[class*="thinking" i]',
    '[class*="thought" i]',
    'button.group__menu-item',
    'button.hoverable',
    'button[data-fill]',
    '[role="button"].group__menu-item',
    '[role="button"].hoverable',
    '[role="button"][data-fill]',
    'details'
  ];
  const THINKING_CUE_RE = /\b(show\s+)?(reasoning|reasoned|thinking|thoughts?|thought|thought\s+for)\b|\u5df2\u601d\u8003|\u601d\u8003|\u63a8\u7406|\u60f3\u6cd5|\u601d\u7ef4\u94fe|\u601d\u8003\u8fc7\u7a0b/i;
  const THINKING_STATUS_RE = /\b(?:thought|thinking|reasoned)\s*(?:for)?\s*\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds?)\b|\u5df2\u601d\u8003\s*\d+(?:\.\d+)?\s*(?:s|\u79d2)?|\u601d\u8003\s*\d+(?:\.\d+)?\s*(?:s|\u79d2)/i;
  const THINKING_FLYOUT_TITLE_RE = /^(?:\u601d\u8003|\u63a8\u7406|thinking|reasoning)$/i;
  const THINKING_FLYOUT_DONE_RE = /^(?:\u5b8c\u6210|done|completed)$/i;
  const THINKING_FLYOUT_STOP_RE = /^(?:\u8bb0\u5fc6|memory|memories|past chat|saved memory|web search|deep research|references?)\b/i;
  const EXPAND_CUE_RE = /\b(show\s+more|show\s+all|expand|expanded|continue|read\s+more|more|details?|view\s+more)\b|\u5c55\u5f00|\u663e\u793a\u66f4\u591a|\u67e5\u770b\u66f4\u591a|\u7ee7\u7eed|\u66f4\u591a/i;
  const EXPANDABLE_BUTTON_SELECTORS = [
    "button.group__menu-item",
    "button.hoverable",
    "button[data-fill]",
    "[role='button'].group__menu-item",
    "[role='button'].hoverable",
    "[role='button'][data-fill]",
    "button[aria-expanded]",
    "button[aria-controls]"
  ];
  const DATE_TIME_VALUE_RE = /\b(?:\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?:[,\uFF0C]?\s*(?:at\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:am|pm))?)?\b/i;
  const TIME_VALUE_RE = /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:am|pm))?\b/i;
  const TIMESTAMP_CUE_RE = /\b(timestamp|sent|created|edited|updated|today|yesterday|date|time|am|pm)\b|\u65f6\u95f4|\u53d1\u9001|\u521b\u5efa|\u7f16\u8f91|\u66f4\u65b0/i;
  const NON_MESSAGE_TEXT_RE = /chatgpt\s+(can|may|might)\s+make\s+mistakes|check\s+important\s+info|verify\s+important\s+information|chatgpt\s*\u4e5f?\u53ef\u80fd\u4f1a?\u72af\u9519|\u8bf7\u6838\u67e5\u91cd\u8981\u4fe1\u606f|\u8bf7\u6838\u5bf9\u91cd\u8981\u4fe1\u606f|\u6838\u67e5\u91cd\u8981\u4fe1\u606f/i;
  const NON_MESSAGE_ROLE_RE = /\b(alert|status|banner|complementary|navigation|contentinfo|dialog|tooltip|menu|menubar|search)\b/i;
  const ASSISTANT_SIGNAL_RE = /\b(assistant|bot-message|bot|model-response|model|response|answer|completion|markdown|prose)\b/i;
  const USER_SIGNAL_RE = /\b(user|human|prompt|question|whitespace-pre-wrap)\b/i;
  const FILE_NAME_RE = /[^\\/:*?"<>|\n\r]{1,140}\.(?:pdf|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|zip|rar|7z|mov|mp4|mp3|wav)/i;
  const FILE_ATTACHMENT_RE = /\b(file|attachment|download|uploaded|pdf|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|zip|rar|7z|mov|mp4|mp3|wav|document)\b|\u6587\u4ef6|\u9644\u4ef6|\u4e0b\u8f7d|\u6587\u6863/i;
  const IMAGE_DATA_URI_CACHE = new Map();
  let lastTurnNodeCache = null;
  let lastTurnNodeCacheAt = 0;
  const LANGUAGE_ALIASES = new Map([
    ["js", "javascript"],
    ["mjs", "javascript"],
    ["cjs", "javascript"],
    ["ts", "typescript"],
    ["py", "python"],
    ["rb", "ruby"],
    ["rs", "rust"],
    ["sh", "bash"],
    ["zsh", "bash"],
    ["ps", "powershell"],
    ["ps1", "powershell"],
    ["md", "markdown"],
    ["yml", "yaml"]
  ]);
  const KNOWN_LANGUAGES = new Set([
    "bash",
    "c",
    "cpp",
    "csharp",
    "css",
    "diff",
    "go",
    "graphql",
    "html",
    "java",
    "javascript",
    "json",
    "jsx",
    "kotlin",
    "markdown",
    "php",
    "powershell",
    "python",
    "r",
    "ruby",
    "rust",
    "shell",
    "sql",
    "swift",
    "text",
    "tsx",
    "typescript",
    "xml",
    "yaml",
    "yml"
  ]);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "OPEN_CHATGPT_EXPORT_SELECTOR") {
      openMessageSelectorPanel()
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

      return true;
    }

    if (message?.type !== "EXPORT_CHATGPT_CONVERSATION") {
      return false;
    }

    exportConversation()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

    return true;
  });

  const messageExtractor = {
    collect: collectConversationMessages,
    preview: makeMessagePreview,
    loadOlderMessages,
    walkConversation,
    createDebugLog
  };

  const markdownBuilder = {
    build: buildMarkdown,
    download: downloadMarkdown,
    metadata: createExportMetadata,
    filename: makeFilename
  };
  const pdfBuilder = {
    download: downloadPdf,
    settings: createDefaultPdfSettings
  };

  const messageSelectorUI = createMessageSelectorUI();

  async function openMessageSelectorPanel() {
    return messageSelectorUI.open({
      loadMessages: async (onProgress) => {
        return messageExtractor.collect({ onProgress });
      },
      exportMessages: (messages, options) => exportSelectedMessages(messages, options)
    });
  }

  async function exportConversation() {
    const result = await messageExtractor.collect();
    const messages = result.messages || result;

    if (!messages.length) {
      throw new Error("No conversation messages were found on this page.");
    }

    return exportSelectedMessages(messages);
  }

  async function collectConversationMessages(options = {}) {
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const debugLog = createDebugLog();
    const scrollTarget = getBestScrollTarget();
    const originalScrollTop = getScrollTop(scrollTarget);
    const collector = createMessageCollector(debugLog);
    const scanDeadline = Date.now() + MAX_SCAN_MS;
    const walkDeadline = scanDeadline - HYDRATE_RESERVED_MS;
    debugLog.setScrollTarget(scrollTarget);

    try {
      // ChatGPT can lazy-load older turns. First move upward until the top is
      // stable, then walk downward and capture each visible batch.
      debugLog.mark("start");
      onProgress("Loading older messages...");
      await loadOlderMessages(scrollTarget, collector, debugLog, scanDeadline);
      debugLog.mark("loadedOlderMessages");
      onProgress("Scanning conversation...");
      await walkConversation(scrollTarget, collector, debugLog, walkDeadline);
      debugLog.mark("walkedConversation");
      onProgress("Hydrating virtualized messages...");
      const hydrateDeadline = Math.max(scanDeadline, Date.now() + HYDRATE_RESERVED_MS);
      await hydrateVirtualizedTurns(collector, debugLog, hydrateDeadline);
      debugLog.mark("hydratedVirtualizedTurns");
      await collector.captureFromDom();
      debugLog.mark("finalCapture");
      onProgress("Recovering missed turns...");
      const recoveryDeadline = Date.now() + MISSING_TURN_RECOVERY_MS;
      await recoverMissingTurnMessages(scrollTarget, collector, debugLog, recoveryDeadline);
      debugLog.mark("recoveredMissingTurns");
      await collector.captureFromDom({ settleMs: 0 });

      const messages = collector.getMessages();

      if (!messages.length) {
        throw new Error("No conversation messages were found on this page.");
      }

      onProgress("Loading message timestamps...");
      await enrichMessageTimestamps(messages, debugLog);
      debugLog.mark("enrichedTimestamps");
      onProgress("Loading thinking details...");
      await enrichVisibleThinkingFlyouts(messages, debugLog);
      debugLog.mark("enrichedThinkingFlyouts");
      debugLog.finish(messages);
      onProgress(`Found ${messages.length} messages.`);
      return {
        messages,
        debugLog
      };
    } finally {
      setScrollTop(scrollTarget, originalScrollTop);
    }
  }

  async function exportSelectedMessages(messages, options = {}) {
    if (!messages.length) {
      throw new Error("Select at least one message to export.");
    }

    const exportedAt = new Date();
    const metadata = markdownBuilder.metadata(messages, exportedAt);
    const requestedFormat = options.format;
    const format = requestedFormat === "pdf"
      || requestedFormat === "advanced-pdf"
      || requestedFormat === "advanced-markdown"
      ? requestedFormat
      : "markdown";
    let filename = "";

    if (format === "advanced-markdown") {
      const markdownResult = await downloadAdvancedMarkdown(metadata, messages, exportedAt);
      filename = markdownResult.filename;

      if (options.debugLog) {
        options.debugLog.event?.("advancedMarkdown.generated", {
          engine: markdownResult.markdownEngine,
          filename,
          rendererUrl: ADVANCED_PDF_RENDERER_URL,
          exporterVersion: EXPORTER_VERSION,
          captureWarning: markdownResult.captureWarning || ""
        });
        downloadDebugLog(options.debugLog, filename.replace(/\.md$/i, "-debug.json"));
      }

      return {
        ok: true,
        format,
        filename,
        messageCount: messages.length,
        imagesEmbedded: messages.reduce((total, message) => total + message.imagesEmbedded, 0),
        imagesFailed: messages.reduce((total, message) => total + message.imagesFailed, 0),
        markdownEngine: markdownResult.markdownEngine,
        captureWarning: markdownResult.captureWarning || ""
      };
    }

    if (format === "advanced-pdf") {
      const pdfResult = await downloadAdvancedPdf(metadata, messages, exportedAt);
      filename = pdfResult.filename;

      if (options.debugLog) {
        options.debugLog.event?.("advancedPdf.generated", {
          engine: pdfResult.pdfEngine,
          filename,
          rendererUrl: ADVANCED_PDF_RENDERER_URL,
          exporterVersion: EXPORTER_VERSION,
          captureWarning: pdfResult.captureWarning || ""
        });
        downloadDebugLog(options.debugLog, filename.replace(/\.pdf$/i, "-debug.json"));
      }

      return {
        ok: true,
        format,
        filename,
        messageCount: messages.length,
        pageCount: pdfResult.pageCount,
        pdfEngine: pdfResult.pdfEngine,
        imagesEmbedded: 0,
        imagesFailed: 0,
        imageLinks: messages.reduce((total, message) => total + (message.imageCount || 0), 0),
        captureWarning: pdfResult.captureWarning || ""
      };
    }

    if (format === "pdf") {
      const pdfResult = await pdfBuilder.download(metadata, messages, options.pdfSettings || {}, exportedAt);
      filename = pdfResult.filename;

      if (options.debugLog) {
        options.debugLog.event?.("pdf.generated", {
          engine: pdfResult.pdfEngine,
          filename,
          pageCount: pdfResult.pageCount,
          exporterVersion: EXPORTER_VERSION
        });
        downloadDebugLog(options.debugLog, filename.replace(/\.pdf$/i, "-debug.json"));
      }

      return {
        ok: true,
        format,
        filename,
        messageCount: messages.length,
        pageCount: pdfResult.pageCount,
        pdfEngine: pdfResult.pdfEngine,
        imagesEmbedded: 0,
        imagesFailed: 0,
        imageLinks: messages.reduce((total, message) => total + (message.imageCount || 0), 0)
      };
    }

    const markdown = markdownBuilder.build(metadata, messages);
    filename = markdownBuilder.filename(metadata.title, exportedAt, "md");
    markdownBuilder.download(filename, markdown);

    if (options.debugLog) {
      downloadDebugLog(options.debugLog, filename.replace(/\.md$/i, "-debug.json"));
    }

    return {
      ok: true,
      format,
      filename,
      messageCount: messages.length,
      imagesEmbedded: messages.reduce((total, message) => total + message.imagesEmbedded, 0),
      imagesFailed: messages.reduce((total, message) => total + message.imagesFailed, 0)
    };
  }

  function createExportMetadata(messages, exportedAt = new Date()) {
    return {
      title: getConversationTitle(),
      source: location.href,
      exportedAt,
      exporterVersion: EXPORTER_VERSION,
      messageCount: messages.length
    };
  }

  function createStructuredExportPayload(messages, exportedAt = new Date()) {
    return {
      schemaVersion: 1,
      exporterVersion: EXPORTER_VERSION,
      title: getConversationTitle(),
      source: location.href,
      exportedAt: exportedAt.toISOString(),
      messageCount: messages.length,
      messages: messages.map((message, index) => createPortableMessageSnapshot(message, index))
    };
  }

  async function downloadAdvancedMarkdown(metadata, messages, exportedAt = new Date()) {
    const defaultFileName = markdownBuilder.filename(metadata.title, exportedAt, "md");
    const payload = createStructuredExportPayload(messages, exportedAt);

    let response;
    try {
      response = await fetch(`${ADVANCED_PDF_RENDERER_URL}/capture-render-markdown`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exportPayload: payload,
          fileName: defaultFileName,
          capture: createBackendCaptureRequest(messages, metadata)
        })
      });
    } catch (error) {
      throw new Error(`Local renderer is not running. Start it with: node tools\\advanced-pdf\\server.js. Details: ${error.message || error}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Markdown renderer failed (${response.status}). ${errorText || response.statusText}`);
    }

    const blob = await response.blob();
    const filename = getFilenameFromContentDisposition(response.headers.get("content-disposition")) || defaultFileName;
    downloadBlob(filename, blob);

    return {
      filename,
      markdownEngine: response.headers.get("x-markdown-engine") || "advanced-local",
      captureWarning: response.headers.get("x-capture-warning") || ""
    };
  }

  async function downloadAdvancedPdf(metadata, messages, exportedAt = new Date()) {
    const defaultFileName = markdownBuilder.filename(metadata.title, exportedAt, "pdf");
    const payload = createStructuredExportPayload(messages, exportedAt);

    let response;
    try {
      response = await fetch(`${ADVANCED_PDF_RENDERER_URL}/capture-render-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exportPayload: payload,
          fileName: defaultFileName,
          capture: createBackendCaptureRequest(messages, metadata)
        })
      });
    } catch (error) {
      throw new Error(`Local renderer is not running. Start it with: node tools\\advanced-pdf\\server.js. Details: ${error.message || error}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`PDF renderer failed (${response.status}). ${errorText || response.statusText}`);
    }

    const blob = await response.blob();
    const filename = getFilenameFromContentDisposition(response.headers.get("content-disposition")) || defaultFileName;
    downloadBlob(filename, blob);

    return {
      filename,
      pageCount: Number(response.headers.get("x-page-count")) || null,
      pdfEngine: response.headers.get("x-pdf-engine") || "advanced-local-chrome",
      captureWarning: response.headers.get("x-capture-warning") || ""
    };
  }

  function createBackendCaptureRequest(messages, metadata) {
    return {
      url: location.href,
      title: metadata?.title || getConversationTitle(),
      exporterVersion: EXPORTER_VERSION,
      selectedOrders: messages
        .map((message) => Number(message.order))
        .filter((order) => Number.isFinite(order) && order > 0)
    };
  }

  function getFilenameFromContentDisposition(header) {
    if (!header) {
      return "";
    }

    const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch (_) {
        return utf8Match[1];
      }
    }

    const quotedMatch = header.match(/filename="([^"]+)"/i);
    return quotedMatch ? quotedMatch[1] : "";
  }

  function createDebugLog(options = {}) {
    const startedAt = new Date();
    const events = [];
    const isDetailed = options.detailed ?? DETAILED_DEBUG_LOG;
    const maxEvents = options.maxEvents || DEBUG_EVENT_LIMIT;
    let droppedEvents = 0;
    const stats = {
      selectorHits: {},
      normalizedCandidates: 0,
      acceptedCandidates: 0,
      filteredCandidates: 0,
      filteredTurns: 0,
      acceptedTurns: 0,
      duplicateCandidates: 0,
      extractedMessages: 0,
      emptyMessages: 0,
      emptyReasons: {},
      filterReasons: {},
      roles: {
        user: 0,
        assistant: 0,
        system: 0,
        tool: 0,
        unknown: 0
      }
    };
    const timings = {};
    const pageTurnDiagnostics = getPageTurnDiagnostics();
    const messageDiagnostics = [];
    let exportMessages = [];
    let scrollTargetSummary = null;
    let finalSummary = null;

    return {
      stats,
      event(type, data = {}) {
        if (events.length >= maxEvents) {
          droppedEvents += 1;
          return;
        }

        events.push({
          type,
          atMs: Date.now() - startedAt.getTime(),
          ...data
        });
      },
      selectorHit(selector, count) {
        stats.selectorHits[selector] = (stats.selectorHits[selector] || 0) + count;
      },
      mark(name) {
        timings[name] = Date.now() - startedAt.getTime();
      },
      progress(type, data = {}) {
        this.event(`progress.${type}`, data);
      },
      candidateAccepted(node, selector, role) {
        stats.acceptedCandidates += 1;
        if (isTurnNode(node)) {
          stats.acceptedTurns += 1;
        }
        if (!isDetailed) {
          return;
        }
        this.event("candidate.accepted", {
          selector,
          role,
          node: summarizeNode(node),
          signals: summarizeCandidateSignals(node)
        });
      },
      candidateFiltered(element, selector, reason, normalized = null) {
        stats.filteredCandidates += 1;
        stats.filterReasons[reason] = (stats.filterReasons[reason] || 0) + 1;
        if (isTurnNode(normalized || element)) {
          stats.filteredTurns += 1;
        }
        if (!isDetailed) {
          return;
        }
        this.event("candidate.filtered", {
          selector,
          reason,
          element: summarizeNode(element),
          elementSignals: summarizeCandidateSignals(element),
          normalized: normalized ? summarizeNode(normalized) : null,
          normalizedSignals: normalized ? summarizeCandidateSignals(normalized) : null
        });
      },
      candidateDuplicate(node, selector, reason) {
        stats.duplicateCandidates += 1;
        if (!isDetailed) {
          return;
        }
        this.event("candidate.duplicate", {
          selector,
          reason,
          node: summarizeNode(node)
        });
      },
      messageExtracted(message, body, roleReason) {
        stats.extractedMessages += 1;
        stats.roles[message.role] = (stats.roles[message.role] || 0) + 1;
        messageDiagnostics.push(createMessageDebugSnapshot(message, body, roleReason));
        if (!isDetailed) {
          return;
        }
        this.event("message.extracted", {
          id: message.id,
          role: message.role,
          roleReason,
          markdownLength: message.markdown.length,
          thinkingLength: message.thinkingMarkdown.length,
          usedWholeNodeFallback: Boolean(message.usedWholeNodeFallback),
          serializationAttempts: message.serializationAttempts || [],
          codeBlockCount: message.codeBlockCount,
          fileCount: message.fileCount,
          imageCount: message.imageCount,
          imagesEmbedded: message.imagesEmbedded,
          imagesFailed: message.imagesFailed,
          imageEvents: message.imageEvents || [],
          node: summarizeNode(message.sourceNode),
          body: summarizeNode(body)
        });
      },
      messageEmpty(node, role, body, reason, parts = null) {
        stats.emptyMessages += 1;
        stats.emptyReasons[reason] = (stats.emptyReasons[reason] || 0) + 1;
        if (!isDetailed) {
          return;
        }
        this.event("message.empty", {
          role,
          reason,
          node: summarizeNode(node),
          nodeSignals: summarizeCandidateSignals(node),
          nodeSerializationHint: getSerializationHint(node),
          body: summarizeNode(body),
          bodySignals: summarizeCandidateSignals(body),
          bodySerializationHint: getSerializationHint(body),
          bodyCandidates: parts?.bodyCandidates || []
        });
      },
      lastTurn(stage, node, message = null, parts = null, roleReason = "") {
        if (!isDetailed) {
          return;
        }
        this.event("lastTurn.diagnostic", {
          stage,
          role: message?.role || "",
          roleReason,
          markdownLength: message?.markdown?.length || 0,
          thinkingLength: message?.thinkingMarkdown?.length || 0,
          codeBlockCount: message?.codeBlockCount || 0,
          imageCount: message?.imageCount || 0,
          serializationAttempts: message?.serializationAttempts || [],
          node: summarizeNode(node),
          nodeSignals: summarizeCandidateSignals(node),
          nodeSerializationHint: getSerializationHint(node),
          body: parts?.body ? summarizeNode(parts.body) : null,
          bodyCandidates: parts?.bodyCandidates || []
        });
      },
      setScrollTarget(node) {
        scrollTargetSummary = {
          ...summarizeNode(node),
          scrollTop: getScrollTop(node),
          scrollHeight: getScrollHeight(node),
          clientHeight: getClientHeight(node),
          maxScrollTop: getMaxScrollTop(node),
          canProgrammaticallyScroll: canProgrammaticallyScroll(node)
        };
      },
      finish(messages) {
        exportMessages = messages.map((message, index) => createPortableMessageSnapshot(message, index));
        const userMessages = messages.filter((message) => message.role === "user").length;
        const assistantMessages = messages.filter((message) => message.role === "assistant").length;
        const assistantThinkingMessages = messages.filter((message) => message.role === "assistant" && message.thinkingMarkdown).length;
        const thinThinkingMessages = messages.filter((message) => message.role === "assistant" && isThinThinkingMarkdown(message.thinkingMarkdown)).length;
        const attachmentStats = messages.reduce((totals, message) => {
          const stats = getMessageAttachmentStats(message);
          totals.totalImages += stats.images;
          totals.totalFiles += stats.files;

          if (stats.total > 0) {
            totals.messagesWithAttachments += 1;
          }

          return totals;
        }, {
          totalImages: 0,
          totalFiles: 0,
          messagesWithAttachments: 0
        });
        const capturedTurnOrders = [...new Set(messages
          .map((message) => Number(message.order))
          .filter((order) => Number.isFinite(order) && order > 0 && order < 1_000_000))]
          .sort((a, b) => a - b);
        const capturedTurnOrderSet = new Set(capturedTurnOrders);
        const missingTurnOrders = pageTurnDiagnostics.dataTurnIdCount
          ? Array.from({ length: pageTurnDiagnostics.dataTurnIdCount }, (_, index) => index + 1)
            .filter((order) => !capturedTurnOrderSet.has(order))
          : [];
        finalSummary = {
          totalMessages: messages.length,
          userMessages,
          assistantMessages,
          assistantThinkingMessages,
          thinThinkingMessages,
          richThinkingMessages: Math.max(0, assistantThinkingMessages - thinThinkingMessages),
          markdownFeatureStats: getMarkdownFeatureStats(messages),
          ...attachmentStats,
          systemMessages: messages.filter((message) => message.role === "system").length,
          toolMessages: messages.filter((message) => message.role === "tool").length,
          pageTurnCount: pageTurnDiagnostics.dataTurnIdCount,
          extractionRateFromDataTurnId: pageTurnDiagnostics.dataTurnIdCount
            ? Number((messages.length / pageTurnDiagnostics.dataTurnIdCount).toFixed(3))
            : null,
          capturedTurnOrders,
          missingTurnOrders
        };
      },
      toJSON() {
        return {
          exporterVersion: EXPORTER_VERSION,
          features: {
            conversationTimestampApi: true,
            visibleThinkingFlyoutCapture: true,
            autoOpenThinkingFlyouts: true,
            thinkingFlyoutAutoOpenLimit: THINKING_FLYOUT_AUTO_OPEN_LIMIT,
            pdfEngine: "vector-type3-cjk-experimental"
          },
          pageUrl: location.href,
          title: getConversationTitle(),
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          pageTurnDiagnostics,
          timings,
          debugEvents: {
            detailed: isDetailed,
            retained: events.length,
            dropped: droppedEvents
          },
          scrollTarget: scrollTargetSummary,
          stats,
          finalSummary,
          exportPayload: {
            schemaVersion: 1,
            exporterVersion: EXPORTER_VERSION,
            title: getConversationTitle(),
            source: location.href,
            exportedAt: new Date().toISOString(),
            messages: exportMessages
          },
          messageDiagnostics,
          events
        };
      }
    };
  }

  function createMessageDebugSnapshot(message, body, roleReason = "") {
    const markdown = String(message?.markdown || "");
    const thinkingMarkdown = String(message?.thinkingMarkdown || "");

    return {
      id: message?.id || "",
      role: message?.role || "",
      order: message?.order ?? null,
      roleReason,
      sourceMessageId: message?.sourceMessageId || "",
      timestamp: message?.timestamp || "",
      markdownLength: markdown.length,
      thinkingLength: thinkingMarkdown.length,
      markdownPreview: truncateDebugText(markdown, 4000),
      thinkingPreview: truncateDebugText(thinkingMarkdown, 2400),
      featureFlags: getMarkdownFeatureFlags(markdown, thinkingMarkdown),
      codeBlockDiagnostics: getCodeBlockDiagnostics(markdown, thinkingMarkdown),
      codeBlockCount: message?.codeBlockCount || 0,
      fileCount: message?.fileCount || 0,
      imageCount: message?.imageCount || 0,
      imagesEmbedded: message?.imagesEmbedded || 0,
      imagesFailed: message?.imagesFailed || 0,
      usedWholeNodeFallback: Boolean(message?.usedWholeNodeFallback),
      serializationAttempts: (message?.serializationAttempts || []).slice(0, 8),
      node: message?.sourceNode ? summarizeNode(message.sourceNode) : null,
      body: body ? summarizeNode(body) : null
    };
  }

  function createPortableMessageSnapshot(message, index = 0) {
    return {
      id: message?.id || `message-${index + 1}`,
      role: message?.role || "unknown",
      order: message?.order ?? index,
      sourceMessageId: message?.sourceMessageId || "",
      timestamp: message?.timestamp || "",
      preview: message?.preview || "",
      markdown: String(message?.markdown || ""),
      thinkingMarkdown: String(message?.thinkingMarkdown || ""),
      codeBlockCount: message?.codeBlockCount || 0,
      fileCount: message?.fileCount || 0,
      imageCount: message?.imageCount || 0,
      imagesEmbedded: message?.imagesEmbedded || 0,
      imagesFailed: message?.imagesFailed || 0
    };
  }

  function truncateDebugText(text, maxLength) {
    const value = String(text || "");

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 24))}\n...[truncated ${value.length - maxLength} chars]`;
  }

  function getCodeBlockDiagnostics(markdown, thinkingMarkdown = "") {
    const combined = `${String(markdown || "")}\n${String(thinkingMarkdown || "")}`;
    const diagnostics = [];
    const pattern = /(^|\n)([`~]{3,})([^\n]*)\n([\s\S]*?)\n\2(?=\n|$)/g;
    let match;

    while ((match = pattern.exec(combined)) !== null) {
      const code = match[4] || "";
      const lines = code.split("\n");
      diagnostics.push({
        language: normalizeLanguage(match[3] || ""),
        lineCount: lines.length,
        nonEmptyLineCount: lines.filter((line) => line.trim()).length,
        maxLineLength: lines.reduce((max, line) => Math.max(max, line.length), 0),
        firstLine: truncateDebugText(lines.find((line) => line.trim()) || "", 160)
      });
    }

    return diagnostics.slice(0, 12);
  }

  function downloadDebugLog(debugLog, filename) {
    const payload = JSON.stringify(debugLog.toJSON(), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function getMarkdownFeatureFlags(markdown, thinkingMarkdown = "") {
    const combined = `${String(markdown || "")}\n${String(thinkingMarkdown || "")}`;

    return {
      hasBold: /(\*\*|__)[\s\S]+?\1/.test(combined),
      hasItalic: /(^|[^*])(?:\*|_)[^*_]+(?:\*|_)/.test(combined),
      hasList: /^\s*(?:[-*+]|\d+[.)])\s+\S/m.test(combined),
      hasOrderedList: /^\s*\d+[.)]\s+\S/m.test(combined),
      hasQuote: /^\s*>/m.test(combined),
      hasCodeBlock: /```/.test(combined),
      hasTable: /^\s*\|.*\|\s*$/m.test(combined),
      hasLink: /\[[^\]]+\]\([^)]+\)/.test(combined),
      boldMarkerCount: (combined.match(/(\*\*|__)/g) || []).length,
      orderedListItemCount: (combined.match(/^\s*\d+[.)]\s+\S/gm) || []).length,
      quoteLineCount: (combined.match(/^\s*>/gm) || []).length,
      tableRowCount: (combined.match(/^\s*\|.*\|\s*$/gm) || []).length
    };
  }

  function getMarkdownFeatureStats(messages) {
    return messages.reduce((stats, message) => {
      const markdown = String(message.markdown || "");
      const thinkingMarkdown = String(message.thinkingMarkdown || "");
      const flags = getMarkdownFeatureFlags(markdown, thinkingMarkdown);

      if (flags.hasBold) {
        stats.messagesWithBold += 1;
      }

      if (flags.hasItalic) {
        stats.messagesWithItalic += 1;
      }

      if (flags.hasList) {
        stats.messagesWithLists += 1;
      }

      if (flags.hasQuote) {
        stats.messagesWithQuotes += 1;
      }

      if (flags.hasCodeBlock) {
        stats.messagesWithCodeBlocks += 1;
      }

      if (flags.hasTable) {
        stats.messagesWithTables += 1;
      }

      if (flags.hasLink) {
        stats.messagesWithLinks += 1;
      }

      return stats;
    }, {
      messagesWithBold: 0,
      messagesWithItalic: 0,
      messagesWithLists: 0,
      messagesWithQuotes: 0,
      messagesWithCodeBlocks: 0,
      messagesWithTables: 0,
      messagesWithLinks: 0
    });
  }

  function getPageTurnDiagnostics() {
    return {
      dataTurnIdCount: document.querySelectorAll("[data-turn-id]").length,
      dataTurnContainerCount: document.querySelectorAll("[data-turn-container]").length,
      dataTurnIdContainerCount: document.querySelectorAll("[data-turn-id-container]").length,
      authorRoleCount: document.querySelectorAll("[data-message-author-role]").length,
      assistantRoleCount: document.querySelectorAll('[data-message-author-role="assistant"]').length,
      userRoleCount: document.querySelectorAll('[data-message-author-role="user"]').length,
      legacyConversationTurnCount: document.querySelectorAll('[data-testid*="conversation-turn"]').length,
      markdownProseCount: document.querySelectorAll("div.markdown.prose, .markdown.prose").length,
      markdownCount: document.querySelectorAll(".markdown, [class*='markdown']").length
    };
  }

  function makeMessagePreview(message) {
    const text = [
      message.markdown,
      message.thinkingMarkdown ? `Thinking: ${message.thinkingMarkdown}` : ""
    ].filter(Boolean).join(" ");
    const preview = text
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/!\[[^\]]*]\([^)]+\)/g, "[image]")
      .replace(/[#*_>`~\[\]()|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (preview) {
      return truncatePreview(preview, 30);
    }

    const extras = [];

    if (message.codeBlockCount) {
      extras.push(`${message.codeBlockCount} code block(s)`);
    }

    if (message.imageCount) {
      extras.push(`${message.imageCount} image(s)`);
    }

    return extras.join(", ") || "No text preview available.";
  }

  function truncatePreview(text, maxLength) {
    const value = String(text || "").trim();

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
  }

  function isLikelyNonMessageMarkdown(message) {
    const text = [message.markdown, message.thinkingMarkdown].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    if (!text) {
      return false;
    }

    return text.length <= 320 && NON_MESSAGE_TEXT_RE.test(text);
  }

  function getMessageStats(message) {
    const stats = [];

    if (message.timestamp) {
      stats.push(message.timestamp);
    }

    if (message.codeBlockCount) {
      stats.push(`${message.codeBlockCount} code`);
    }

    if (message.imageCount) {
      stats.push(`${message.imageCount} img`);
    }

    if (message.thinkingMarkdown) {
      stats.push("thinking");
    }

    return stats.join(" | ") || "text";
  }

  function summarizeNode(node) {
    if (!node) {
      return null;
    }

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    if (!element) {
      return null;
    }

    return {
      tag: element.tagName?.toLowerCase() || "",
      id: element.id || "",
      role: element.getAttribute?.("role") || "",
      testId: element.getAttribute?.("data-testid") || "",
      messageRole: element.getAttribute?.("data-message-author-role") || "",
      messageId: element.getAttribute?.("data-message-id") || "",
      className: String(element.getAttribute?.("class") || "").slice(0, 220),
      textPreview: getElementText(element).slice(0, 260),
      selectorPath: getNodeSelectorPath(element)
    };
  }

  function summarizeCandidateSignals(node) {
    if (!node?.matches) {
      return null;
    }

    return {
      isConversationTurn: isConversationTurnNode(node),
      isTurnNode: isTurnNode(node),
      turnId: getTurnId(node),
      hasTurnContainer: hasTurnContainerSignal(node),
      hasRoleOrMessageId: hasRoleOrMessageIdSignal(node),
      hasAssistantSignal: hasAssistantRoleSignal(node),
      hasUserSignal: hasUserRoleSignal(node),
      hasMessageContent: hasMessageContent(node),
      isNonMessage: isNonMessageNode(node),
      innerTextLength: String(node.innerText || "").trim().length,
      textContentLength: String(node.textContent || "").trim().length,
      markdownCount: node.querySelectorAll?.(".markdown, [class*='markdown'], [class*='prose']").length || 0,
      streamingCount: node.querySelectorAll?.("[data-is-streaming], [class*='result-streaming']").length || 0,
      expandableButtonCount: getExpandableContentButtons(node).length,
      mediaCount: node.querySelectorAll?.("img, picture, canvas").length || 0,
      codeCount: node.querySelectorAll?.("pre, code").length || 0
    };
  }

  function getSerializationHint(node) {
    if (!node?.matches) {
      return null;
    }

    return {
      rawTextLength: getRawElementText(node).length,
      elementTextLength: getElementText(node).length,
      childNodeCount: node.childNodes?.length || 0,
      elementChildCount: node.children?.length || 0,
      skippedBySerializer: shouldSkipElement(node, { skipElements: new WeakSet() }),
      markdownCount: node.querySelectorAll?.("div.markdown.prose, .markdown, [class*='markdown'], [class*='prose']").length || 0,
      richMarkdownContainer: isRichMarkdownContainer(node),
      structuralBlockCount: node.querySelectorAll?.("strong, b, em, i, blockquote, ul, ol, table").length || 0,
      semanticTagCounts: {
        strong: node.querySelectorAll?.("strong, b").length || 0,
        emphasis: node.querySelectorAll?.("em, i").length || 0,
        blockquote: node.querySelectorAll?.("blockquote").length || 0,
        orderedList: node.querySelectorAll?.("ol").length || 0,
        unorderedList: node.querySelectorAll?.("ul").length || 0,
        table: node.querySelectorAll?.("table").length || 0,
        dataRange: node.querySelectorAll?.("[data-start], [data-end], [data-is-last-node], [data-is-only-node]").length || 0
      },
      cssFormattedInlineCount: node.querySelectorAll?.(".font-bold, .font-semibold, .font-extrabold, .font-black, .italic, [style*='font-weight'], [style*='font-style']").length || 0,
      dirAutoCount: node.querySelectorAll?.("[dir='auto']").length || 0,
      buttonCount: node.querySelectorAll?.("button, [role='button']").length || 0,
      expandableButtonCount: getExpandableContentButtons(node).length,
      hiddenCount: node.querySelectorAll?.("[hidden], [aria-hidden='true']").length || 0
    };
  }

  function getNodeSelectorPath(element) {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = current.tagName.toLowerCase();
      const testId = current.getAttribute("data-testid");
      const role = current.getAttribute("data-message-author-role");

      if (testId) {
        part += `[data-testid="${testId.slice(0, 80)}"]`;
      } else if (role) {
        part += `[data-message-author-role="${role}"]`;
      } else if (current.id) {
        part += `#${current.id}`;
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function highlightMessageNode(node) {
    const previousOutline = node.style.outline;
    const previousOutlineOffset = node.style.outlineOffset;
    const previousBackground = node.style.backgroundColor;
    const previousTransition = node.style.transition;

    node.style.transition = "outline-color 160ms ease, background-color 160ms ease";
    node.style.outline = "3px solid #0f766e";
    node.style.outlineOffset = "6px";
    node.style.backgroundColor = "rgba(15, 118, 110, 0.08)";

    window.setTimeout(() => {
      if (!node.isConnected) {
        return;
      }

      node.style.outline = previousOutline;
      node.style.outlineOffset = previousOutlineOffset;
      node.style.backgroundColor = previousBackground;
      node.style.transition = previousTransition;
    }, 1600);
  }

  function createMessageSelectorUI() {
    const hostId = "chatgpt-exporter-selector-host";
    let host = null;
    let shadow = null;
    let messages = [];
    let selectedIds = new Set();
    let api = null;
    let currentDebugLog = null;

    return {
      open(nextApi) {
        api = nextApi;
        ensurePanel();
        setPanelBusy(true, "Loading conversation...");
        reloadMessages();
        return { ok: true, panelOpen: true };
      }
    };

    function ensurePanel() {
      host = document.getElementById(hostId);

      if (!host) {
        host = document.createElement("div");
        host.id = hostId;
        document.documentElement.append(host);
        shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = getSelectorPanelMarkup();
        bindPanelEvents();
      } else {
        shadow = host.shadowRoot;
      }

      host.style.display = "block";
    }

    function bindPanelEvents() {
      shadow.querySelector("[data-action='close']").addEventListener("click", () => {
        host.style.display = "none";
      });
      shadow.querySelector("[data-action='refresh']").addEventListener("click", () => {
        if (api) {
          reloadMessages();
        }
      });
      shadow.querySelector("[data-action='select-all']").addEventListener("click", () => {
        selectedIds = new Set(messages.map((message) => message.id));
        syncCheckboxes();
      });
      shadow.querySelector("[data-action='select-users']").addEventListener("click", () => {
        selectedIds = new Set(messages.filter((message) => message.role === "user").map((message) => message.id));
        syncCheckboxes();
      });
      shadow.querySelector("[data-action='select-assistants']").addEventListener("click", () => {
        selectedIds = new Set(messages.filter((message) => message.role === "assistant").map((message) => message.id));
        syncCheckboxes();
      });
      shadow.querySelector("[data-action='invert']").addEventListener("click", () => {
        selectedIds = new Set(messages.filter((message) => !selectedIds.has(message.id)).map((message) => message.id));
        syncCheckboxes();
      });
      shadow.querySelector("[data-action='export']").addEventListener("click", () => {
        exportCheckedMessages();
      });
      shadow.querySelector("[data-option='export-format']").addEventListener("change", () => {
        updateExportButtonLabel();
      });
      shadow.querySelector("[data-action='pdf-cancel']").addEventListener("click", () => {
        closePdfSettingsDialog();
      });
      shadow.querySelector("[data-action='pdf-overlay']").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
          closePdfSettingsDialog();
        }
      });
      shadow.querySelector(".cgce-pdf-form").addEventListener("submit", (event) => {
        event.preventDefault();
        generatePdfFromDialog();
      });
      shadow.querySelector(".cgce-list").addEventListener("change", (event) => {
        const checkbox = event.target.closest("input[type='checkbox'][data-message-id]");

        if (!checkbox) {
          return;
        }

        if (checkbox.checked) {
          selectedIds.add(checkbox.dataset.messageId);
        } else {
          selectedIds.delete(checkbox.dataset.messageId);
        }

        updateSelectionSummary();
      });
      shadow.querySelector(".cgce-list").addEventListener("dblclick", (event) => {
        const row = event.target.closest(".cgce-message[data-message-id]");

        if (!row) {
          return;
        }

        const message = messages.find((candidate) => candidate.id === row.dataset.messageId);
        scrollToMessage(message);
      });
    }

    function renderMessageList() {
      const list = shadow.querySelector(".cgce-list");

      if (!messages.length) {
        list.innerHTML = '<div class="cgce-empty">No messages found on this page.</div>';
        return;
      }

      list.innerHTML = "";

      for (const message of messages) {
        list.append(createMessageRow(message));
      }
    }

    async function reloadMessages() {
      setPanelBusy(true, "Reloading conversation...");

      try {
        const result = await api.loadMessages((message) => setPanelStatus(message));
        messages = result.messages || result;
        currentDebugLog = result.debugLog || null;
        selectedIds = new Set(messages.map((message) => message.id));
        renderMessageList();
        updateSelectionSummary();
        setPanelBusy(false, `Ready. ${messages.length} messages found.`);
      } catch (error) {
        setPanelBusy(false, error.message || String(error), true);
      }
    }

    function createMessageRow(message) {
      const label = document.createElement("label");
      label.className = `cgce-message cgce-message-${sanitizeCssClass(message.role)}`;
      label.dataset.messageId = message.id;
      label.title = "Double-click to jump to this message";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedIds.has(message.id);
      checkbox.dataset.messageId = message.id;

      const content = document.createElement("span");
      content.className = "cgce-message-content";

      const meta = document.createElement("span");
      meta.className = "cgce-message-meta";

      const role = document.createElement("span");
      role.className = "cgce-role";
      role.textContent = formatRole(message.role);

      const stats = document.createElement("span");
      stats.className = "cgce-stats";
      stats.textContent = getMessageStats(message);

      meta.append(role, stats);

      const preview = document.createElement("span");
      preview.className = "cgce-preview";
      preview.textContent = message.preview || messageExtractor.preview(message);

      content.append(meta, preview);
      label.append(checkbox, content);
      return label;
    }

    function scrollToMessage(message) {
      const node = resolveMessageNode(message);

      if (!node?.isConnected) {
        setPanelStatus("That message is not currently mounted in the page. Try Reload messages.", true);
        return;
      }

      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
      highlightMessageNode(node);
      setPanelStatus(`Jumped to ${formatRole(message.role)} message.`);
    }

    function resolveMessageNode(message) {
      if (message?.sourceNode?.isConnected) {
        return message.sourceNode;
      }

      if (message?.sourceTurnId) {
        const byTurnId = document.querySelector(`[data-turn-id="${cssString(message.sourceTurnId)}"]`);

        if (byTurnId) {
          return normalizeMessageNode(byTurnId) || byTurnId;
        }
      }

      if (message?.sourceMessageId) {
        const byMessageId = document.querySelector(`[data-message-id="${cssString(message.sourceMessageId)}"]`);

        if (byMessageId) {
          return normalizeMessageNode(byMessageId) || byMessageId;
        }
      }

      if (message?.sourceTestId) {
        return document.querySelector(`[data-testid="${cssString(message.sourceTestId)}"]`);
      }

      return null;
    }

    function syncCheckboxes() {
      for (const checkbox of shadow.querySelectorAll("input[type='checkbox'][data-message-id]")) {
        checkbox.checked = selectedIds.has(checkbox.dataset.messageId);
      }

      updateSelectionSummary();
    }

    function updateSelectionSummary() {
      const selected = messages.filter((message) => selectedIds.has(message.id));
      const userCount = selected.filter((message) => message.role === "user").length;
      const assistantCount = selected.filter((message) => message.role === "assistant").length;
      const exportButton = shadow.querySelector("[data-action='export']");

      exportButton.disabled = !selected.length;
      setPanelStatus(`${selected.length}/${messages.length} selected. ${userCount} user, ${assistantCount} assistant.`);
      updateExportButtonLabel();
    }

    function getSelectedMessages() {
      return messages.filter((message) => selectedIds.has(message.id));
    }

    function getSelectedFormat() {
      return shadow.querySelector("[data-option='export-format']")?.value === "pdf" ? "pdf" : "markdown";
    }

    function getExportBackendFormat(format) {
      return format === "pdf" ? "advanced-pdf" : "advanced-markdown";
    }

    function exportCheckedMessages() {
      const selected = getSelectedMessages();

      if (!selected.length) {
        setPanelStatus("Select at least one message first.", true);
        return;
      }

      const format = getSelectedFormat();
      runExport(selected, {
        format: getExportBackendFormat(format),
        debugLog: shouldDownloadDebugLog() ? currentDebugLog : null
      });
    }

    async function runExport(selected, options) {
      try {
        const busyLabel = options.format === "advanced-pdf"
          ? "Generating PDF..."
          : options.format === "advanced-markdown"
            ? "Generating Markdown..."
            : options.format === "pdf"
              ? "Generating PDF..."
              : "Exporting selected messages...";
        setPanelBusy(true, busyLabel);
        const result = await api.exportMessages(selected, options);
        setPanelBusy(false, formatExportResult(result));
      } catch (error) {
        setPanelBusy(false, error.message || String(error), true);
      }
    }

    function formatExportResult(result) {
      if (result.format === "pdf" || result.format === "advanced-pdf") {
        const pageSummary = result.pageCount ? `, ${result.pageCount} page(s)` : "";
        const imageSummary = result.imageLinks ? `, ${result.imageLinks} image attachment(s)` : "";
        const captureSummary = result.captureWarning ? ` Backend capture warning: ${result.captureWarning}` : "";
        return `Saved ${result.filename}. ${result.messageCount} message(s)${pageSummary}${imageSummary}.${captureSummary}`;
      }

      const failedSummary = result.imagesFailed ? `, ${result.imagesFailed} image(s) left as links` : "";
      const captureSummary = result.captureWarning ? ` Backend capture warning: ${result.captureWarning}` : "";
      return `Saved ${result.filename}. ${result.messageCount} message(s), ${result.imagesEmbedded} image(s) embedded${failedSummary}.${captureSummary}`;
    }

    function updateExportButtonLabel() {
      const exportButton = shadow.querySelector("[data-action='export']");
      const format = getSelectedFormat();
      exportButton.textContent = format === "pdf" ? "Export PDF" : "Export Markdown";
    }

    function openPdfSettingsDialog(selected) {
      const overlay = shadow.querySelector("[data-action='pdf-overlay']");
      const defaults = pdfBuilder.settings(getConversationTitle(), new Date());

      shadow.querySelector("[data-pdf-field='fileName']").value = defaults.fileName;
      shadow.querySelector("[data-pdf-field='title']").value = defaults.title;
      shadow.querySelector("[data-pdf-field='pageFormat']").value = defaults.pageFormat;
      shadow.querySelector("[data-pdf-field='orientation']").value = defaults.orientation;
      shadow.querySelector("[data-pdf-field='margin']").value = defaults.margin;
      shadow.querySelector("[data-pdf-field='colorMode']").value = defaults.colorMode;
      shadow.querySelector("[data-pdf-field='fontScale']").value = defaults.fontScale;
      shadow.querySelector("[data-pdf-field='fontFamily']").value = defaults.fontFamily;
      shadow.querySelector("[data-pdf-field='includeTimestamps']").checked = defaults.includeTimestamps;
      shadow.querySelector("[data-pdf-field='includeThinking']").checked = defaults.includeThinking;
      shadow.querySelector("[data-pdf-field='includeToc']").checked = defaults.includeToc;
      shadow.querySelector("[data-pdf-field='pageBreakPerMessage']").checked = defaults.pageBreakPerMessage;
      shadow.querySelector("[data-pdf-field='removePageNumbers']").checked = defaults.removePageNumbers;
      overlay.dataset.selectedCount = String(selected.length);
      overlay.hidden = false;
      shadow.querySelector("[data-pdf-field='fileName']").focus();
    }

    function closePdfSettingsDialog() {
      shadow.querySelector("[data-action='pdf-overlay']").hidden = true;
    }

    async function generatePdfFromDialog() {
      const selected = getSelectedMessages();

      if (!selected.length) {
        closePdfSettingsDialog();
        setPanelStatus("Select at least one message first.", true);
        return;
      }

      const settings = collectPdfSettings();
      closePdfSettingsDialog();
      await runExport(selected, {
        format: "pdf",
        pdfSettings: settings,
        debugLog: shouldDownloadDebugLog() ? currentDebugLog : null
      });
    }

    function collectPdfSettings() {
      return {
        fileName: shadow.querySelector("[data-pdf-field='fileName']").value,
        title: shadow.querySelector("[data-pdf-field='title']").value,
        pageFormat: shadow.querySelector("[data-pdf-field='pageFormat']").value,
        orientation: shadow.querySelector("[data-pdf-field='orientation']").value,
        margin: shadow.querySelector("[data-pdf-field='margin']").value,
        colorMode: shadow.querySelector("[data-pdf-field='colorMode']").value,
        fontScale: Number(shadow.querySelector("[data-pdf-field='fontScale']").value || 100),
        fontFamily: shadow.querySelector("[data-pdf-field='fontFamily']").value,
        includeTimestamps: shadow.querySelector("[data-pdf-field='includeTimestamps']").checked,
        includeThinking: shadow.querySelector("[data-pdf-field='includeThinking']").checked,
        includeToc: shadow.querySelector("[data-pdf-field='includeToc']").checked,
        pageBreakPerMessage: shadow.querySelector("[data-pdf-field='pageBreakPerMessage']").checked,
        removePageNumbers: shadow.querySelector("[data-pdf-field='removePageNumbers']").checked
      };
    }

    function shouldDownloadDebugLog() {
      return Boolean(shadow.querySelector("[data-option='debug-log']")?.checked);
    }

    function setPanelBusy(isBusy, message, isError = false) {
      shadow.querySelector("[data-action='export']").disabled = isBusy || selectedIds.size === 0;
      shadow.querySelector("[data-action='refresh']").disabled = isBusy;
      shadow.querySelector(".cgce-panel").classList.toggle("is-busy", isBusy);

      if (message) {
        setPanelStatus(message, isError);
      }
    }

    function setPanelStatus(message, isError = false) {
      const status = shadow.querySelector(".cgce-status");
      status.textContent = message || "";
      status.classList.toggle("is-error", isError);
    }

    function getSelectorPanelMarkup() {
      return `
        <style>
          :host {
            all: initial;
            color-scheme: light;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .cgce-panel {
            position: fixed;
            top: 18px;
            right: 18px;
            bottom: 18px;
            z-index: 2147483647;
            width: min(430px, calc(100vw - 36px));
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            overflow: hidden;
            background: #ffffff;
            border: 1px solid #d7dde8;
            border-radius: 8px;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
            color: #111827;
          }

          .cgce-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 16px 16px 12px;
            border-bottom: 1px solid #e6eaf0;
          }

          .cgce-title {
            margin: 0;
            font-size: 16px;
            line-height: 1.25;
            font-weight: 700;
          }

          .cgce-subtitle {
            margin: 4px 0 0;
            max-width: 300px;
            font-size: 12px;
            line-height: 1.4;
            color: #5b6472;
          }

          .cgce-icon-buttons {
            display: flex;
            gap: 6px;
          }

          .cgce-icon-button {
            width: 32px;
            height: 32px;
            border: 1px solid #d7dde8;
            border-radius: 6px;
            background: #ffffff;
            color: #243042;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
          }

          .cgce-icon-button:disabled {
            cursor: wait;
            opacity: 0.55;
          }

          .cgce-actions {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            padding: 12px 16px;
            border-bottom: 1px solid #e6eaf0;
            background: #f8fafc;
          }

          .cgce-action {
            min-height: 32px;
            border: 1px solid #cfd7e3;
            border-radius: 6px;
            background: #ffffff;
            color: #172033;
            font-size: 12px;
            font-weight: 650;
            cursor: pointer;
          }

          .cgce-list {
            overflow: auto;
            min-height: 0;
            padding: 6px 8px 8px;
            background: #ffffff;
          }

          .cgce-message {
            display: grid;
            grid-template-columns: 14px 1fr;
            gap: 6px;
            align-items: center;
            padding: 4px 6px;
            margin: 0 0 3px;
            border: 1px solid #e3e8f0;
            border-radius: 4px;
            background: #ffffff;
            cursor: pointer;
          }

          .cgce-message:hover {
            border-color: #9aa8bb;
            background: #f9fbfd;
          }

          .cgce-message input {
            width: 13px;
            height: 13px;
            margin: 0;
            accent-color: #0f766e;
          }

          .cgce-message-content {
            min-width: 0;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 5px;
            align-items: center;
          }

          .cgce-message-meta {
            display: contents;
          }

          .cgce-role {
            display: inline-flex;
            align-items: center;
            min-height: 16px;
            padding: 0 5px;
            border-radius: 999px;
            background: #eef6f5;
            color: #0f766e;
            font-size: 9px;
            font-weight: 750;
            text-transform: uppercase;
            letter-spacing: 0;
          }

          .cgce-message-assistant .cgce-role {
            background: #eff4ff;
            color: #3159a8;
          }

          .cgce-stats {
            overflow: hidden;
            color: #64748b;
            font-size: 10px;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .cgce-preview {
            display: block;
            overflow: hidden;
            color: #1f2937;
            font-size: 11px;
            line-height: 1.25;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .cgce-footer {
            display: grid;
            gap: 10px;
            padding: 12px 16px 14px;
            border-top: 1px solid #e6eaf0;
            background: #ffffff;
          }

          .cgce-status {
            min-height: 17px;
            color: #4b5563;
            font-size: 12px;
            line-height: 1.35;
          }

          .cgce-status.is-error {
            color: #b42318;
          }

          .cgce-option {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #334155;
            font-size: 12px;
            line-height: 1.3;
          }

          .cgce-option input {
            width: 14px;
            height: 14px;
            margin: 0;
            accent-color: #0f766e;
          }

          .cgce-footer-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
          }

          .cgce-format {
            display: grid;
            grid-template-columns: auto minmax(110px, 1fr);
            gap: 8px;
            align-items: center;
            color: #334155;
            font-size: 12px;
          }

          .cgce-select,
          .cgce-input {
            min-height: 32px;
            min-width: 0;
            border: 1px solid #cfd7e3;
            border-radius: 6px;
            background: #ffffff;
            color: #172033;
            font: inherit;
            font-size: 13px;
          }

          .cgce-select {
            padding: 0 8px;
          }

          .cgce-input {
            box-sizing: border-box;
            width: 100%;
            padding: 0 10px;
          }

          .cgce-export {
            min-height: 40px;
            border: 0;
            border-radius: 7px;
            background: #0f766e;
            color: #ffffff;
            font-size: 14px;
            font-weight: 750;
            cursor: pointer;
          }

          .cgce-export:disabled {
            cursor: not-allowed;
            opacity: 0.58;
          }

          .cgce-empty {
            padding: 18px;
            color: #64748b;
            font-size: 13px;
            text-align: center;
          }

          .cgce-pdf-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(15, 23, 42, 0.62);
          }

          .cgce-pdf-overlay[hidden] {
            display: none;
          }

          .cgce-pdf-dialog {
            width: min(560px, calc(100vw - 36px));
            max-height: calc(100vh - 36px);
            overflow: auto;
            box-sizing: border-box;
            border: 1px solid #d7dde8;
            border-radius: 8px;
            background: #ffffff;
            color: #111827;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
          }

          .cgce-pdf-form {
            display: grid;
            gap: 12px;
            padding: 20px;
          }

          .cgce-pdf-title {
            margin: 0 0 4px;
            font-size: 18px;
            line-height: 1.25;
            font-weight: 760;
            text-align: center;
          }

          .cgce-pdf-grid {
            display: grid;
            grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px 10px;
            align-items: center;
          }

          .cgce-pdf-grid label {
            color: #1f2937;
            font-size: 13px;
            line-height: 1.3;
          }

          .cgce-pdf-grid .cgce-span-2 {
            grid-column: span 2;
          }

          .cgce-check {
            display: inline-flex;
            min-height: 28px;
            align-items: center;
            gap: 8px;
            color: #1f2937;
            font-size: 13px;
            line-height: 1.3;
          }

          .cgce-check input {
            width: 15px;
            height: 15px;
            margin: 0;
            accent-color: #0f766e;
          }

          .cgce-pdf-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 6px;
          }

          .cgce-secondary {
            min-height: 38px;
            border: 1px solid #cfd7e3;
            border-radius: 7px;
            background: #ffffff;
            color: #334155;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }

          @media (max-width: 520px) {
            .cgce-panel {
              inset: 0;
              width: auto;
              border-radius: 0;
            }

            .cgce-footer-row,
            .cgce-pdf-actions {
              grid-template-columns: 1fr;
            }

            .cgce-pdf-grid {
              grid-template-columns: 1fr;
            }

            .cgce-pdf-grid .cgce-span-2 {
              grid-column: auto;
            }
          }
        </style>
        <aside class="cgce-panel" aria-label="ChatGPT export message selector">
          <header class="cgce-header">
            <div>
              <h2 class="cgce-title">Select messages</h2>
              <p class="cgce-subtitle">Review extracted turns, adjust selection, then choose an export format.</p>
            </div>
            <div class="cgce-icon-buttons">
              <button class="cgce-icon-button" type="button" data-action="refresh" title="Reload messages" aria-label="Reload messages">R</button>
              <button class="cgce-icon-button" type="button" data-action="close" title="Close" aria-label="Close">X</button>
            </div>
          </header>
          <div class="cgce-actions" aria-label="Selection tools">
            <button class="cgce-action" type="button" data-action="select-all">All</button>
            <button class="cgce-action" type="button" data-action="select-users">Questions</button>
            <button class="cgce-action" type="button" data-action="select-assistants">Answers</button>
            <button class="cgce-action" type="button" data-action="invert">Invert</button>
          </div>
          <div class="cgce-list" role="list"></div>
          <footer class="cgce-footer">
            <div class="cgce-status" role="status" aria-live="polite"></div>
            <div class="cgce-footer-row">
              <label class="cgce-format">
                <span>Format</span>
                <select class="cgce-select" data-option="export-format">
                  <option value="markdown">Markdown</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <label class="cgce-option">
                <input type="checkbox" data-option="debug-log">
                <span>Debug log</span>
              </label>
            </div>
            <button class="cgce-export" type="button" data-action="export">Export Markdown</button>
          </footer>
        </aside>
        <div class="cgce-pdf-overlay" data-action="pdf-overlay" hidden>
          <section class="cgce-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="cgce-pdf-title">
            <form class="cgce-pdf-form">
              <h2 class="cgce-pdf-title" id="cgce-pdf-title">Export to PDF</h2>
              <div class="cgce-pdf-grid">
                <label for="cgce-pdf-file">File Name</label>
                <input class="cgce-input cgce-span-2" id="cgce-pdf-file" type="text" data-pdf-field="fileName">

                <label for="cgce-pdf-title-input">Content Title</label>
                <input class="cgce-input cgce-span-2" id="cgce-pdf-title-input" type="text" data-pdf-field="title">

                <label for="cgce-pdf-format">Page Format</label>
                <select class="cgce-select" id="cgce-pdf-format" data-pdf-field="pageFormat">
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
                <select class="cgce-select" data-pdf-field="orientation" aria-label="Orientation">
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>

                <label for="cgce-pdf-margin">Page Margin</label>
                <select class="cgce-select" id="cgce-pdf-margin" data-pdf-field="margin">
                  <option value="normal">Normal</option>
                  <option value="narrow">Narrow</option>
                  <option value="wide">Wide</option>
                </select>
                <select class="cgce-select" data-pdf-field="colorMode" aria-label="Color mode">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>

                <label for="cgce-pdf-font-size">Font Size</label>
                <input class="cgce-input" id="cgce-pdf-font-size" type="number" min="80" max="130" step="5" data-pdf-field="fontScale">
                <select class="cgce-select" data-pdf-field="fontFamily" aria-label="Font">
                  <option value="default">Default</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Mono</option>
                </select>

                <label>Date & Time</label>
                <label class="cgce-check">
                  <input type="checkbox" data-pdf-field="includeTimestamps">
                  <span>Message timestamps</span>
                </label>
                <label class="cgce-check">
                  <input type="checkbox" data-pdf-field="removePageNumbers">
                  <span>Remove page numbers</span>
                </label>

                <label>Structure</label>
                <label class="cgce-check">
                  <input type="checkbox" data-pdf-field="includeToc">
                  <span>Table of contents</span>
                </label>
                <label class="cgce-check">
                  <input type="checkbox" data-pdf-field="pageBreakPerMessage">
                  <span>Page break per prompt</span>
                </label>

                <label>Content</label>
                <label class="cgce-check cgce-span-2">
                  <input type="checkbox" data-pdf-field="includeThinking">
                  <span>Thought process</span>
                </label>
              </div>
              <div class="cgce-pdf-actions">
                <button class="cgce-secondary" type="button" data-action="pdf-cancel">Cancel</button>
                <button class="cgce-export" type="submit">Generate</button>
              </div>
            </form>
          </section>
        </div>
      `;
    }
  }

  function createMessageCollector(debugLog = null) {
    const messagesByKey = new Map();
    const capturedStableKeys = new Set();
    let sequence = 0;

    return {
      async captureFromDom(options = {}) {
        const settleMs = Number.isFinite(options.settleMs) ? Math.max(0, options.settleMs) : CAPTURE_SETTLE_MS;

        if (settleMs) {
          await sleep(settleMs);
        }

        for (const node of options.nodes || getCandidateMessageNodes(debugLog)) {
          const stableKey = getStableNodeKey(node);
          const existingByStableKey = stableKey && capturedStableKeys.has(stableKey) ? messagesByKey.get(stableKey) : null;
          const shouldRevisit = shouldRevisitMessageNode(node) || shouldRevisitCapturedMessage(node, existingByStableKey);

          if (existingByStableKey && !shouldRevisit) {
            debugLog?.candidateDuplicate(node, "collector", "stable node key already captured");
            continue;
          }

          const roleDetails = detectRoleDetails(node, sequence);
          const role = roleDetails.role;
          const parts = getMessageParts(node, role);
          const key = getMessageKey(node, role, parts);
          const existingMessage = messagesByKey.get(key) || existingByStableKey || null;

          if (existingMessage && !shouldRevisit) {
            debugLog?.candidateDuplicate(node, "collector", "message key already captured");
            continue;
          }

          const message = await extractMessage(node, parts, role, sequence);

          if (isLikelyNonMessageMarkdown(message)) {
            debugLog?.messageEmpty(node, role, parts.body, "serialized content matched non-message disclaimer/system text", parts);
            continue;
          }

          if (message?.markdown || message?.thinkingMarkdown || message?.codeBlockCount || message?.imageCount || message?.fileCount) {
            message.id = key;
            const mergedMessage = mergeMessageAttachments(message, existingMessage);
            mergedMessage.preview = messageExtractor.preview(mergedMessage);
            if (!existingMessage || isMessageRicher(mergedMessage, existingMessage)) {
              messagesByKey.set(key, mergedMessage);
              if (stableKey) {
                messagesByKey.set(stableKey, mergedMessage);
                capturedStableKeys.add(stableKey);
              }
              debugLog?.messageExtracted(mergedMessage, parts.body, roleDetails.reason);

              if (isLastTurnNode(node)) {
                debugLog?.lastTurn("updated", node, mergedMessage, parts, roleDetails.reason);
              }

              if (!existingMessage) {
                sequence += 1;
              }
            } else {
              debugLog?.candidateDuplicate(node, "collector", "revisited turn was not richer than captured message");

              if (isLastTurnNode(node)) {
                debugLog?.lastTurn("revisited-not-richer", node, message, parts, roleDetails.reason);
              }
            }
          } else {
            debugLog?.messageEmpty(node, role, parts.body, "no markdown, thinking, code, or image content after serialization", parts);

            if (isLastTurnNode(node)) {
              debugLog?.lastTurn("empty", node, message, parts, roleDetails.reason);
            }
          }
        }
      },

      getMessages() {
        return uniqueMessages([...messagesByKey.values()]).sort((a, b) => a.order - b.order);
      },

      getMessageCount() {
        return uniqueMessages([...messagesByKey.values()]).length;
      },

      hasCapturedNode(node) {
        const stableKey = getStableNodeKey(node);
        return Boolean(stableKey && capturedStableKeys.has(stableKey));
      }
    };
  }

  function uniqueMessages(messages) {
    const seen = new Set();
    const result = [];

    for (const message of messages) {
      if (!message || seen.has(message)) {
        continue;
      }

      seen.add(message);
      result.push(message);
    }

    return result;
  }

  async function loadOlderMessages(scrollTarget, collector, debugLog = null, deadline = Infinity) {
    let stableAtTopCount = 0;
    let previousSignature = getConversationSignature(scrollTarget);
    await collector.captureFromDom();

    for (let attempt = 0; attempt < TOP_LOAD_ATTEMPTS; attempt += 1) {
      if (Date.now() >= deadline) {
        debugLog?.progress("loadOlder.timeout", { attempt, maxScanMs: MAX_SCAN_MS });
        break;
      }

      const top = getScrollTop(scrollTarget);
      const step = Math.max(Math.floor(getClientHeight(scrollTarget) * 4.2), 2600);
      const shouldJumpToTop = attempt === 0 || attempt % 4 === 3 || top <= step;
      setScrollTop(scrollTarget, shouldJumpToTop ? 0 : Math.max(0, top - step));
      await waitForScrollAndDomIdle();

      if (getScrollTop(scrollTarget) <= 80) {
        setScrollTop(scrollTarget, 0);
        await waitForScrollAndDomIdle(90);
      }

      await collector.captureFromDom({ settleMs: 0 });

      const currentSignature = getConversationSignature(scrollTarget);
      const atTop = getScrollTop(scrollTarget) <= 2;
      debugLog?.progress("loadOlder", {
        attempt,
        top: getScrollTop(scrollTarget),
        scrollHeight: getScrollHeight(scrollTarget),
        stableAtTopCount
      });

      if (atTop && currentSignature === previousSignature) {
        stableAtTopCount += 1;
      } else {
        stableAtTopCount = 0;
      }

      previousSignature = currentSignature;

      if (stableAtTopCount >= TOP_STABLE_PASSES) {
        break;
      }
    }
  }

  async function walkConversation(scrollTarget, collector, debugLog = null, deadline = Infinity) {
    let stuckCount = 0;
    let bottomStableCount = 0;
    let previousSignature = "";
    let maxAttempts = getWalkAttemptLimit(scrollTarget);

    await collector.captureFromDom({ settleMs: 0 });

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (Date.now() >= deadline) {
        debugLog?.progress("walk.timeout", { attempt, maxScanMs: MAX_SCAN_MS, hydrateReservedMs: HYDRATE_RESERVED_MS });
        break;
      }

      const top = getScrollTop(scrollTarget);
      const maxTop = getMaxScrollTop(scrollTarget);

      if (maxTop - top <= 4) {
        bottomStableCount += 1;

        if (bottomStableCount >= 2) {
          break;
        }

        await waitForScrollAndDomIdle(90);
        await collector.captureFromDom({ settleMs: 0 });
        continue;
      }

      bottomStableCount = 0;
      const step = getWalkScrollStep(scrollTarget);
      setScrollTop(scrollTarget, Math.min(top + step, maxTop));
      await waitForScrollAndDomIdle();

      if (Date.now() >= deadline) {
        debugLog?.progress("walk.timeoutAfterWait", { attempt, maxScanMs: MAX_SCAN_MS, hydrateReservedMs: HYDRATE_RESERVED_MS });
        break;
      }

      await collector.captureFromDom({ settleMs: 0 });

      const newTop = getScrollTop(scrollTarget);
      const currentSignature = getConversationSignature(scrollTarget);
      stuckCount = Math.abs(newTop - top) <= 2 && currentSignature === previousSignature ? stuckCount + 1 : 0;
      previousSignature = currentSignature;
      maxAttempts = Math.min(WALK_ATTEMPTS, Math.max(maxAttempts, getWalkAttemptLimit(scrollTarget)));
      debugLog?.progress("walk", {
        attempt,
        maxAttempts,
        top,
        newTop,
        maxTop,
        stuckCount
      });

      if (stuckCount >= 4) {
        break;
      }
    }
  }

  function getWalkScrollStep(scrollTarget) {
    return Math.max(Math.floor(getClientHeight(scrollTarget) * 3.6), 3000);
  }

  function getWalkAttemptLimit(scrollTarget) {
    const step = getWalkScrollStep(scrollTarget);
    const estimated = Math.ceil(getMaxScrollTop(scrollTarget) / Math.max(1, step)) + 6;
    return Math.min(WALK_ATTEMPTS, Math.max(10, estimated));
  }

  async function hydrateVirtualizedTurns(collector, debugLog = null, deadline = Infinity) {
    const allTurns = orderTurnsForHydration(getAllTurnNodes());
    const turns = getTurnsNeedingHydration(allTurns, collector);

    debugLog?.progress("hydrate.start", {
      totalTurns: allTurns.length,
      pendingTurns: turns.length,
      capturedMessages: collector.getMessageCount(),
      emptyTurns: allTurns.filter((turn) => !hasMountedMessageText(turn)).length
    });

    for (let index = 0; index < turns.length; index += 1) {
      if (Date.now() >= deadline) {
        debugLog?.progress("hydrate.timeout", { index, totalTurns: turns.length, maxScanMs: MAX_SCAN_MS });
        break;
      }

      const turn = turns[index];

      if (!turn?.isConnected) {
        continue;
      }

      if (collector.hasCapturedNode(turn)) {
        continue;
      }

      const beforeTextLength = getRawElementText(turn).length;
      const beforeHasMountedText = hasMountedMessageText(turn);
      const hydrationResult = await hydrateSingleTurn(turn, collector, deadline);

      debugLog?.progress("hydrate.turn", {
        index,
        totalTurns: turns.length,
        testId: turn.getAttribute("data-testid") || "",
        turnId: getTurnId(turn),
        beforeTextLength,
        afterTextLength: hydrationResult.afterTextLength,
        beforeHasMountedText,
        afterHasMountedText: hydrationResult.afterHasMountedText,
        attempts: hydrationResult.attempts
      });
    }
  }

  async function hydrateSingleTurn(turn, collector, deadline = Infinity) {
    const attempts = [
      { block: "center", waitMs: TURN_HYDRATION_SETTLE_MS },
      { block: "start", waitMs: 150 },
      { block: "end", waitMs: 180 }
    ];
    let afterTextLength = getRawElementText(turn).length;
    let afterHasMountedText = hasMountedMessageText(turn);
    let attemptsUsed = 0;

    for (const attempt of attempts) {
      if (Date.now() >= deadline || collector.hasCapturedNode(turn)) {
        break;
      }

      turn.scrollIntoView({
        behavior: "auto",
        block: attempt.block,
        inline: "nearest"
      });
      await waitForScrollAndDomIdle(attempt.waitMs);
      await collector.captureFromDom({ settleMs: 0, nodes: [turn] });
      attemptsUsed += 1;
      afterTextLength = getRawElementText(turn).length;
      afterHasMountedText = hasMountedMessageText(turn);

      if (afterHasMountedText || collector.hasCapturedNode(turn)) {
        break;
      }
    }

    return {
      afterTextLength,
      afterHasMountedText,
      attempts: attemptsUsed
    };
  }

  async function recoverMissingTurnMessages(scrollTarget, collector, debugLog = null, deadline = Infinity) {
    let missingOrders = getMissingConversationTurnOrders(collector.getMessages());

    debugLog?.progress("missingRecovery.start", {
      missingOrders,
      capturedMessages: collector.getMessageCount()
    });

    if (!missingOrders.length) {
      return;
    }

    for (let pass = 0; pass < 3 && missingOrders.length && Date.now() < deadline; pass += 1) {
      for (const order of missingOrders) {
        if (Date.now() >= deadline) {
          break;
        }

        let turn = findBestTurnNodeByOrder(order);

        if (!turn) {
          await scrollNearTurnOrder(scrollTarget, order);
          turn = findBestTurnNodeByOrder(order);
        }

        if (!turn?.isConnected) {
          debugLog?.progress("missingRecovery.noNode", { pass, order });
          continue;
        }

        const beforeCount = collector.getMessageCount();
        const beforeTextLength = getRawElementText(turn).length;
        const beforeHasMountedText = hasMountedMessageText(turn);
        const hydrationResult = await hydrateSingleTurn(turn, collector, deadline);
        await collector.captureFromDom({ settleMs: 0, nodes: [turn] });
        const captured = !getMissingConversationTurnOrders(collector.getMessages()).includes(order);

        debugLog?.progress("missingRecovery.turn", {
          pass,
          order,
          captured,
          beforeCount,
          afterCount: collector.getMessageCount(),
          testId: turn.getAttribute("data-testid") || "",
          turnId: getTurnId(turn),
          beforeTextLength,
          afterTextLength: hydrationResult.afterTextLength,
          beforeHasMountedText,
          afterHasMountedText: hydrationResult.afterHasMountedText,
          attempts: hydrationResult.attempts
        });
      }

      missingOrders = getMissingConversationTurnOrders(collector.getMessages());
    }

    debugLog?.progress("missingRecovery.finish", {
      missingOrders,
      capturedMessages: collector.getMessageCount()
    });
  }

  function getMissingConversationTurnOrders(messages) {
    const availableOrders = getAvailableConversationTurnOrders();

    if (!availableOrders.length) {
      return [];
    }

    const capturedOrders = new Set(messages
      .map((message) => Number(message.order))
      .filter((order) => Number.isFinite(order) && order > 0 && order < 1_000_000));

    return availableOrders.filter((order) => !capturedOrders.has(order));
  }

  function getAvailableConversationTurnOrders() {
    return [...new Set(getAllTurnNodes()
      .map((turn) => getConversationTurnNumber(turn))
      .filter((order) => Number.isFinite(order) && order > 0 && order < 1_000_000))]
      .sort((a, b) => a - b);
  }

  function findBestTurnNodeByOrder(order) {
    const candidates = getAllTurnNodes()
      .filter((turn) => getConversationTurnNumber(turn) === order);

    if (!candidates.length) {
      return null;
    }

    return candidates
      .map((turn) => ({
        turn,
        score: getTurnRecoveryScore(turn)
      }))
      .sort((a, b) => b.score - a.score)[0].turn;
  }

  function getTurnRecoveryScore(turn) {
    const textLength = getRawElementText(turn).length;
    const messageIds = turn.querySelectorAll?.("[data-message-id]")?.length || 0;
    const roleHints = turn.querySelectorAll?.("[data-message-author-role], [data-testid*='message' i], .markdown, [class*='markdown'], [class*='prose']")?.length || 0;

    return textLength
      + messageIds * 2000
      + roleHints * 250
      + (hasMountedMessageText(turn) ? 1000 : 0)
      + (getPotentialMessageNodeResult(turn).ok ? 500 : 0);
  }

  async function scrollNearTurnOrder(scrollTarget, order) {
    const orders = getAvailableConversationTurnOrders();
    const first = orders[0] || 1;
    const last = orders[orders.length - 1] || order;
    const span = Math.max(1, last - first);
    const ratio = Math.min(1, Math.max(0, (order - first) / span));
    setScrollTop(scrollTarget, Math.round(getMaxScrollTop(scrollTarget) * ratio));
    await waitForScrollAndDomIdle(220);
  }

  function getTurnsNeedingHydration(turns, collector) {
    if (!turns.length || collector.getMessageCount() >= turns.length) {
      return [];
    }

    return turns.filter((turn) => turn?.isConnected && !collector.hasCapturedNode(turn));
  }

  function orderTurnsForHydration(turns) {
    return [...turns].sort((a, b) => {
      const aMounted = hasMountedMessageText(a);
      const bMounted = hasMountedMessageText(b);

      if (aMounted !== bMounted) {
        return aMounted ? 1 : -1;
      }

      return compareDocumentOrder(a, b);
    });
  }

  function hasMountedMessageText(turn) {
    if (!turn?.isConnected) {
      return false;
    }

    if (turn.querySelector("[data-message-author-role], .markdown, [class*='markdown'], [class*='prose'], [data-start], pre, code, img, picture, canvas")) {
      return getRawElementText(turn).length > 0 || Boolean(turn.querySelector("img, picture, canvas, pre, code"));
    }

    return getRawElementText(turn).length > 0;
  }

  async function waitForScrollAndDomIdle(ms = SCROLL_SETTLE_MS) {
    await sleep(ms);
    await waitForConversationDomIdle();
  }

  function waitForConversationDomIdle(idleMs = DOM_IDLE_MS, maxMs = MAX_DOM_IDLE_MS) {
    const root = document.querySelector("main") || document.body;

    if (!root) {
      return sleep(idleMs);
    }

    return new Promise((resolve) => {
      let finished = false;
      let idleTimer = null;
      const observer = new MutationObserver(scheduleFinish);
      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        window.clearTimeout(idleTimer);
        window.clearTimeout(maxTimer);
        observer.disconnect();
        resolve();
      };
      const maxTimer = window.setTimeout(finish, maxMs);

      function scheduleFinish() {
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(finish, idleMs);
      }

      observer.observe(root, {
        attributes: true,
        childList: true,
        subtree: true
      });
      scheduleFinish();
    });
  }

  function getConversationSignature(scrollTarget) {
    const nodes = getCandidateMessageNodes();
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    return [
      Math.round(getScrollTop(scrollTarget)),
      Math.round(getScrollHeight(scrollTarget)),
      nodes.length,
      first ? getNodeSignature(first) : "",
      last ? getNodeSignature(last) : ""
    ].join("|");
  }

  function getNodeSignature(node) {
    return [
      getTurnId(node),
      node.getAttribute("data-turn-container") || "",
      node.getAttribute("data-turn-id-container") || "",
      node.getAttribute("data-testid") || "",
      node.querySelector("[data-message-id]")?.getAttribute("data-message-id") || "",
      getElementText(node).slice(0, 120)
    ].join(":");
  }

  function getCandidateMessageNodes(debugLog = null) {
    const primaryTurnNodes = getPrimaryTurnMessageNodes(debugLog);

    if (primaryTurnNodes.length) {
      return primaryTurnNodes;
    }

    let nodes = [];

    // Data attributes are strongest, semantic article nodes are broad fallback,
    // and conversation-turn class fragments cover recent Tailwind-style builds.
    for (const selector of MESSAGE_NODE_SELECTORS) {
      const elements = [...document.querySelectorAll(selector)];
      debugLog?.selectorHit(selector, elements.length);

      for (const element of elements) {
        const normalized = normalizeMessageNode(element);

        if (!normalized) {
          debugLog?.candidateFiltered(element, selector, "normalize returned null");
          continue;
        }

        const potential = getPotentialMessageNodeResult(normalized);

        if (!potential.ok) {
          debugLog?.candidateFiltered(element, selector, potential.reason, normalized);
          continue;
        }

        debugLog && (debugLog.stats.normalizedCandidates += 1);
        nodes = addCandidateMessageNode(nodes, normalized, selector, debugLog);
      }
    }

    return nodes.sort(compareDocumentOrder);
  }

  function getPrimaryTurnMessageNodes(debugLog = null) {
    const turns = getAllTurnNodes();
    const nodes = [];

    debugLog?.selectorHit("primary-turn-nodes", turns.length);

    for (const turn of turns) {
      const potential = getPotentialMessageNodeResult(turn);

      if (!potential.ok) {
        debugLog?.candidateFiltered(turn, "primary-turn-nodes", potential.reason, turn);
        continue;
      }

      nodes.push(turn);
      debugLog?.candidateAccepted(turn, "primary-turn-nodes", "");
    }

    return nodes.sort(compareDocumentOrder);
  }

  function addCandidateMessageNode(nodes, candidate, selector = "", debugLog = null) {
    const candidateScore = scoreMessageNodeSpecificity(candidate);
    const nextNodes = [];
    let shouldAdd = true;

    for (const existing of nodes) {
      if (existing === candidate) {
        shouldAdd = false;
        debugLog?.candidateDuplicate(candidate, selector, "same normalized node");
        nextNodes.push(existing);
        continue;
      }

      if (existing.contains(candidate)) {
        if (isTurnNode(existing)) {
          shouldAdd = false;
          debugLog?.candidateDuplicate(candidate, selector, "contained by accepted turn node");
          nextNodes.push(existing);
          continue;
        }

        const existingScore = scoreMessageNodeSpecificity(existing);

        if (candidateScore >= existingScore || isLikelyBroadMessageShell(existing, candidate)) {
          debugLog?.candidateDuplicate(existing, selector, "replaced broader existing node with more specific candidate");
          nextNodes.push(candidate);
        } else {
          shouldAdd = false;
          debugLog?.candidateDuplicate(candidate, selector, "contained by stronger existing node");
          nextNodes.push(existing);
        }

        continue;
      }

      if (candidate.contains(existing)) {
        if (isTurnNode(candidate)) {
          debugLog?.candidateDuplicate(existing, selector, "replaced child node with turn node");
          continue;
        }

        const existingScore = scoreMessageNodeSpecificity(existing);

        if (candidateScore > existingScore && !isLikelyBroadMessageShell(candidate, existing)) {
          debugLog?.candidateDuplicate(existing, selector, "removed weaker existing child node");
          continue;
        }

        shouldAdd = false;
        debugLog?.candidateDuplicate(candidate, selector, "candidate is broader than existing node");
        nextNodes.push(existing);
        continue;
      }

      nextNodes.push(existing);
    }

    if (shouldAdd && !nextNodes.includes(candidate)) {
      nextNodes.push(candidate);
      debugLog?.candidateAccepted(candidate, selector, detectRole(candidate, 0));
    }

    return uniqueElements(nextNodes);
  }

  function normalizeMessageNode(element) {
    if (isTurnNode(element)) {
      return getTurnRootNode(element);
    }

    const conversationTurn = getClosestTurnNode(element);

    if (conversationTurn) {
      return getTurnRootNode(conversationTurn);
    }

    if (element.matches("[data-message-author-role]")) {
      return getRoleMessageBoundary(element);
    }

    const roleContainer = element.closest("[data-message-author-role]");

    if (roleContainer) {
      return getRoleMessageBoundary(roleContainer);
    }

    if (element.matches("[data-message-id]")) {
      return element.closest("[data-message-author-role], article, [role='article']") || element;
    }

    if (isAssistantContentElement(element)) {
      return findMessageBoundary(element, "assistant");
    }

    if (isUserContentElement(element)) {
      return findMessageBoundary(element, "user");
    }

    if (element.matches("article, [role='article']") && hasMessageContent(element)) {
      return element;
    }

    return null;
  }

  function getRoleMessageBoundary(roleElement) {
    const turn = getClosestTurnNode(roleElement);

    if (turn) {
      return turn;
    }

    const article = roleElement.closest("article, [role='article']");

    if (article && article.querySelectorAll("[data-message-author-role]").length === 1 && getElementText(article).length <= 9000) {
      return article;
    }

    return roleElement;
  }

  function isPotentialMessageNode(node) {
    return getPotentialMessageNodeResult(node).ok;
  }

  function getPotentialMessageNodeResult(node) {
    const main = document.querySelector("main");

    if (main && !main.contains(node)) {
      return {
        ok: false,
        reason: "outside main"
      };
    }

    if (isTurnNode(node)) {
      if (isDisclaimerLikeNode(node)) {
        return {
          ok: false,
          reason: "turn node matched disclaimer/system text"
        };
      }

      return {
        ok: true,
        reason: "turn node accepted even without visible text"
      };
    }

    if (hasRoleOrMessageIdSignal(node)) {
      if (isDisclaimerLikeNode(node)) {
        return {
          ok: false,
          reason: "role/message node matched disclaimer/system text"
        };
      }

      return {
        ok: true,
        reason: "role/message id signal"
      };
    }

    if (isHardNonMessageNode(node)) {
      return {
        ok: false,
        reason: "non-message page chrome/disclaimer/system text"
      };
    }

    if (!hasMessageContent(node)) {
      return {
        ok: false,
        reason: "no message-like text/media/content markers"
      };
    }

    return {
      ok: true,
      reason: "message-like content"
    };
  }

  function hasMessageContent(node) {
    if (!node?.matches) {
      return false;
    }

    if (hasRoleOrMessageIdSignal(node) || isTurnNode(node) || isAssistantContentElement(node) || isUserContentElement(node)) {
      return true;
    }

    if (node.matches("pre, code, img, picture, canvas, p, li, table, blockquote, [dir='auto']")) {
      return true;
    }

    if (node.querySelector("pre, code, img, picture, canvas, p, li, table, blockquote, [dir='auto'], [data-message-id], [data-message-author-role], [data-testid*='assistant' i], [data-testid*='bot-message' i], [data-testid*='user-message' i], [data-testid*='message' i], .markdown, [class*='markdown'], [class*='prose'], [class*='break-words'], [data-start], [data-is-streaming], [class*='result-streaming']")) {
      return true;
    }

    const text = getElementText(node) || getRawElementText(node);
    return text.trim().length > 0;
  }

  function isConversationTurnNode(node) {
    return Boolean(node?.matches?.('[data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]'));
  }

  function isTurnNode(node) {
    return Boolean(node?.matches?.('[data-turn-id], [data-turn-container], [data-turn-id-container], [data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]'));
  }

  function getAllTurnNodes() {
    return uniqueElements([
      ...document.querySelectorAll("[data-turn-id]"),
      ...document.querySelectorAll("[data-turn-container]"),
      ...document.querySelectorAll("[data-turn-id-container]"),
      ...document.querySelectorAll('[data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]')
    ].map((node) => normalizeMessageNode(node) || node))
      .filter((node) => node?.isConnected && isTurnNode(node))
      .sort(compareDocumentOrder);
  }

  function isLastTurnNode(node) {
    const turn = isTurnNode(node) ? node : getClosestTurnNode(node);
    return Boolean(turn && getLastTurnNode() === turn);
  }

  function getLastTurnNode() {
    const now = Date.now();

    if (lastTurnNodeCache?.isConnected && now - lastTurnNodeCacheAt <= 250) {
      return lastTurnNodeCache;
    }

    const turns = getAllTurnNodes();
    lastTurnNodeCache = turns[turns.length - 1] || null;
    lastTurnNodeCacheAt = now;
    return lastTurnNodeCache;
  }

  function shouldRevisitMessageNode(node) {
    return Boolean(
      isLastTurnNode(node)
      || node.matches?.("[data-is-streaming], [class*='result-streaming']")
      || node.querySelector?.("[data-is-streaming], [class*='result-streaming'], [data-is-last-node], [data-is-only-node]")
    );
  }

  function shouldRevisitCapturedMessage(node, existingMessage) {
    if (!existingMessage) {
      return false;
    }

    const mountedAttachmentCount = countMountedAttachmentElements(node);
    const capturedAttachmentCount = getMessageAttachmentStats(existingMessage).total;

    if (mountedAttachmentCount > capturedAttachmentCount) {
      return true;
    }

    const mountedTextLength = getRawElementText(node).length;
    const capturedLength = (existingMessage.markdown || "").length + (existingMessage.thinkingMarkdown || "").length;

    return mountedTextLength > capturedLength + Math.max(160, Math.floor(capturedLength * 0.2));
  }

  function isMessageRicher(nextMessage, previousMessage) {
    const nextLength = (nextMessage.markdown || "").length + (nextMessage.thinkingMarkdown || "").length;
    const previousLength = (previousMessage.markdown || "").length + (previousMessage.thinkingMarkdown || "").length;
    const nextAttachments = getMessageAttachmentStats(nextMessage);
    const previousAttachments = getMessageAttachmentStats(previousMessage);

    if (nextAttachments.total > previousAttachments.total) {
      return true;
    }

    if (nextLength > previousLength + Math.max(120, Math.floor(previousLength * 0.12))) {
      return true;
    }

    if (
      nextMessage.codeBlockCount > previousMessage.codeBlockCount
      || nextAttachments.images > previousAttachments.images
      || nextAttachments.files > previousAttachments.files
    ) {
      return true;
    }

    return previousLength === 0 && nextLength > 0;
  }

  function mergeMessageAttachments(primaryMessage, previousMessage) {
    if (!previousMessage?.markdown) {
      return primaryMessage;
    }

    const nextBlocks = getMarkdownAttachmentBlocks(primaryMessage.markdown);
    const previousBlocks = getMarkdownAttachmentBlocks(previousMessage.markdown);
    const existingKeys = new Set(nextBlocks.map((block) => block.key));
    const missingBlocks = previousBlocks.filter((block) => !existingKeys.has(block.key));

    if (missingBlocks.length) {
      primaryMessage.markdown = cleanMarkdown([
        missingBlocks.map((block) => block.markdown).join("\n\n"),
        primaryMessage.markdown || ""
      ].filter(Boolean).join("\n\n"));
    }

    primaryMessage.imageCount = Math.max(primaryMessage.imageCount || 0, previousMessage.imageCount || 0);
    primaryMessage.fileCount = Math.max(primaryMessage.fileCount || 0, previousMessage.fileCount || 0);
    primaryMessage.imagesEmbedded = Math.max(primaryMessage.imagesEmbedded || 0, previousMessage.imagesEmbedded || 0);
    primaryMessage.imagesFailed = Math.max(primaryMessage.imagesFailed || 0, previousMessage.imagesFailed || 0);

    return primaryMessage;
  }

  function getMessageAttachmentStats(message) {
    const blocks = getMarkdownAttachmentBlocks(message?.markdown || "");
    const markdownImages = blocks.filter((block) => block.kind === "image").length;
    const markdownFiles = blocks.filter((block) => block.kind === "file").length;
    const images = Math.max(message?.imageCount || 0, markdownImages);
    const files = Math.max(message?.fileCount || 0, markdownFiles);

    return {
      images,
      files,
      total: images + files
    };
  }

  function getMarkdownAttachmentBlocks(markdown) {
    const value = String(markdown || "");
    const blocks = [];

    for (const match of value.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
      const alt = match[1] || "image";
      const url = match[2] || "";
      blocks.push({
        kind: "image",
        key: `image:${alt}:${url}`,
        markdown: match[0]
      });
    }

    for (const match of value.matchAll(/\[File:\s*([^\]]+)\](?:\(([^)]*)\))?/gi)) {
      const name = sanitizeFileAttachmentName(match[1]) || "Attachment";
      blocks.push({
        kind: "file",
        key: `file:${name.toLowerCase()}`,
        markdown: `[File: ${escapeMarkdownLinkLabel(name)}]`
      });
    }

    return blocks;
  }

  function countMountedAttachmentElements(node) {
    if (!node?.querySelectorAll) {
      return 0;
    }

    return uniqueElements([
      ...node.querySelectorAll("img, canvas, a, button, [role='button'], [download]")
    ]).filter((element) => {
      const tag = element.tagName?.toLowerCase?.() || "";

      if (tag === "img") {
        return !isLikelyDecorativeImage(element);
      }

      if (tag === "canvas") {
        return !isLikelyDecorativeMedia(element);
      }

      return hasUsefulImageContent(element) || isLikelyFileAttachmentElement(element);
    }).length;
  }

  function getClosestTurnNode(element) {
    return element?.closest?.('[data-turn-id], [data-turn-container], [data-turn-id-container], [data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]') || null;
  }

  function getTurnRootNode(element) {
    if (!element?.closest) {
      return element || null;
    }

    return element.closest('[data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]')
      || element.closest("[data-turn-id]")
      || element.closest("[data-turn-container]")
      || element.closest("[data-turn-id-container]")
      || element;
  }

  function getTurnId(node) {
    return node?.getAttribute?.("data-turn-id") || node?.closest?.("[data-turn-id]")?.getAttribute("data-turn-id") || "";
  }

  function hasTurnContainerSignal(node) {
    return Boolean(node?.matches?.("[data-turn-container], [data-turn-id-container]") || node?.querySelector?.("[data-turn-container], [data-turn-id-container]"));
  }

  function hasRoleOrMessageIdSignal(node) {
    return Boolean(node?.matches?.("[data-message-author-role], [data-message-id]") || node?.querySelector?.("[data-message-author-role], [data-message-id]"));
  }

  function isNonMessageNode(node) {
    if (!node?.matches) {
      return false;
    }

    if (hasRoleOrMessageIdSignal(node) || isTurnNode(node)) {
      return isDisclaimerLikeNode(node);
    }

    return isHardNonMessageNode(node);
  }

  function isHardNonMessageNode(node) {
    if (!node?.matches) {
      return false;
    }

    if (node.closest("#chatgpt-exporter-selector-host, nav, header, footer, aside")) {
      return true;
    }

    const role = node.getAttribute("role") || "";

    if (NON_MESSAGE_ROLE_RE.test(role) && !node.querySelector("[data-message-author-role], [data-message-id]")) {
      return true;
    }

    const attrs = [
      node.getAttribute("data-testid") || "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("class") || ""
    ].join(" ");

    if (/\b(toast|notice|banner|alert|warning|disclaimer|composer|input|prompt-textarea|sidebar|navigation)\b/i.test(attrs)) {
      return true;
    }

    return isDisclaimerLikeNode(node);
  }

  function isDisclaimerLikeNode(node) {
    const text = getElementText(node) || getRawElementText(node);
    const compactText = text.replace(/\s+/g, " ").trim();

    if (NON_MESSAGE_TEXT_RE.test(compactText) && compactText.length <= 260) {
      return true;
    }

    if (!node.querySelector("[data-message-author-role], [data-message-id], .markdown, [class*='markdown'], [data-start], pre, img") && compactText.length <= 180 && NON_MESSAGE_TEXT_RE.test(compactText)) {
      return true;
    }

    return false;
  }

  function findMessageBoundary(element, expectedRole) {
    const roleContainer = element.closest(`[data-message-author-role="${cssString(expectedRole)}"]`);

    if (roleContainer) {
      return roleContainer;
    }

    const turn = getClosestTurnNode(element);

    if (turn) {
      return turn;
    }

    const messageId = element.closest("[data-message-id]");

    if (messageId) {
      return messageId;
    }

    const assistantTestId = expectedRole === "assistant"
      ? element.closest('[data-testid*="assistant" i], [data-testid*="bot-message" i], [data-testid*="model-response" i], [data-testid*="response" i]')
      : null;

    if (assistantTestId) {
      return assistantTestId;
    }

    const article = element.closest("article, [role='article']");

    if (article && article.querySelectorAll("[data-message-author-role], .markdown, [class*='markdown'], [data-start], [data-is-streaming], [class*='result-streaming']").length <= 3) {
      return article;
    }

    return findCompactMessageAncestor(element) || element;
  }

  function findCompactMessageAncestor(element) {
    let current = element;
    let best = element;

    while (current?.parentElement) {
      const parent = current.parentElement;

      if (parent.matches("main, body, html, nav, aside, header, footer")) {
        break;
      }

      const textLength = getElementText(parent).length;
      const roleCount = parent.querySelectorAll("[data-message-author-role]").length;
      const contentCount = parent.querySelectorAll(".markdown, [class*='markdown'], [class*='prose'], [data-start], [data-is-streaming], [class*='result-streaming']").length;

      if (roleCount > 1 || contentCount > 4 || textLength > 12000) {
        break;
      }

      best = parent;
      current = parent;
    }

    return best;
  }

  function isAssistantContentElement(element) {
    if (!element.matches?.("*")) {
      return false;
    }

    const attrs = [
      element.getAttribute("data-testid") || "",
      element.getAttribute("data-message-author-role") || "",
      element.className || ""
    ].join(" ").toLowerCase();

    return element.matches('[data-message-author-role="assistant"], .markdown, [class*="markdown"], [class*="prose"], [class*="break-words"], [data-start], [data-is-streaming], [class*="result-streaming"]')
      || element.querySelector?.('[data-message-author-role="assistant"], .markdown, [class*="markdown"], [class*="prose"], [class*="break-words"], [data-start], [data-is-streaming], [class*="result-streaming"]')
      || ASSISTANT_SIGNAL_RE.test(attrs);
  }

  function isUserContentElement(element) {
    return Boolean(element.matches?.('[data-message-author-role="user"], [data-testid*="user-message" i], .whitespace-pre-wrap, [class*="whitespace-pre-wrap"]')
      || element.querySelector?.('[data-message-author-role="user"], [data-testid*="user-message" i], .whitespace-pre-wrap, [class*="whitespace-pre-wrap"]'));
  }

  function scoreMessageNodeSpecificity(node) {
    let score = 0;

    if (node.matches('[data-message-author-role="assistant"]')) {
      score += 1200;
    } else if (node.querySelector('[data-message-author-role="assistant"]')) {
      score += 900;
    }

    if (node.matches('[data-message-author-role="user"]') || node.querySelector('[data-message-author-role="user"]')) {
      score += 800;
    }

    if (node.matches("[data-message-id]") || node.querySelector("[data-message-id]")) {
      score += 700;
    }

    if (isTurnNode(node)) {
      score += 650;
    }

    if (node.matches(".markdown, [class*='markdown'], [class*='prose'], [data-start], [data-is-streaming], [class*='result-streaming']")) {
      score += 550;
    }

    if (node.querySelector(".markdown, [class*='markdown'], [class*='prose'], [data-start], [data-is-streaming], [class*='result-streaming']")) {
      score += 420;
    }

    if (node.matches("article, [role='article']")) {
      score += 160;
    }

    score += Math.min(getElementText(node).length, 1800) / 20;
    score -= node.querySelectorAll("[data-message-author-role]").length > 1 ? 800 : 0;
    score -= node.querySelectorAll("article, [role='article']").length * 150;

    return score;
  }

  function isLikelyBroadMessageShell(container, child) {
    if (!container.contains(child)) {
      return false;
    }

    const roleCount = container.querySelectorAll("[data-message-author-role]").length;
    const contentCount = container.querySelectorAll(".markdown, [class*='markdown'], [class*='prose'], [data-start], [data-is-streaming], [class*='result-streaming']").length;

    return roleCount > 1 || contentCount > 2 || getElementText(container).length > getElementText(child).length * 2.8;
  }

  function compareDocumentOrder(a, b) {
    if (a === b) {
      return 0;
    }

    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  function detectRole(node, sequence) {
    return detectRoleDetails(node, sequence).role;
  }

  function detectRoleDetails(node, sequence) {
    // The author-role attribute is the strongest signal. Test ids, body shape,
    // and order are fallbacks for UI revisions where attributes move around.
    const roleElement = findRoleElement(node);
    const role = roleElement?.getAttribute("data-message-author-role")?.toLowerCase();

    if (role === "user" || role === "assistant" || role === "system" || role === "tool") {
      return {
        role,
        reason: "data-message-author-role"
      };
    }

    const testId = getMessageSignalText(node).toLowerCase();

    if (/\b(user|human)-?message\b/.test(testId)) {
      return {
        role: "user",
        reason: "user/human signal in data-testid/class/aria"
      };
    }

    if (/\b(bot|assistant|model)-?(message|response|turn)?\b|\bassistant-response\b/.test(testId)) {
      return {
        role: "assistant",
        reason: "assistant/bot/model signal in data-testid/class/aria"
      };
    }

    if (isTurnNode(node) && node.querySelector("div.markdown.prose, .markdown.prose, .markdown, [class*='markdown'], [class*='prose'], [data-is-streaming], [class*='result-streaming']")) {
      return {
        role: "assistant",
        reason: "turn node with assistant markdown/prose structure"
      };
    }

    if (isTurnNode(node) && hasUserRoleSignal(node)) {
      return {
        role: "user",
        reason: "turn node with user structure"
      };
    }

    const labelText = [
      node.getAttribute("aria-label") || "",
      node.getAttribute("data-testid") || "",
      getElementText(node).slice(0, 240)
    ].join(" ").toLowerCase();

    if (/\byou said\b|\buser\b/.test(labelText)) {
      return {
        role: "user",
        reason: "user label text"
      };
    }

    if (/\bchatgpt said\b|\bassistant\b|\bchatgpt\b/.test(labelText)) {
      return {
        role: "assistant",
        reason: "assistant label text"
      };
    }

    if (hasAssistantRoleSignal(node)) {
      return {
        role: "assistant",
        reason: "assistant content signal"
      };
    }

    if (hasUserRoleSignal(node)) {
      return {
        role: "user",
        reason: "user content signal"
      };
    }

    return {
      role: sequence % 2 === 0 ? "user" : "assistant",
      reason: "turn order fallback"
    };
  }

  function getMessageSignalText(node) {
    return [
      node.getAttribute("data-testid") || "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("class") || "",
      ...[...node.querySelectorAll("[data-testid], [aria-label], [class]")]
        .slice(0, 12)
        .map((element) => [
          element.getAttribute("data-testid") || "",
          element.getAttribute("aria-label") || "",
          element.getAttribute("class") || ""
        ].join(" "))
    ].join(" ");
  }

  function hasAssistantRoleSignal(node) {
    if (node.matches('[data-message-author-role="assistant"], .markdown, [class*="markdown"], [class*="prose"], [class*="break-words"], [data-start], [data-is-streaming], [class*="result-streaming"]')) {
      return true;
    }

    if (node.querySelector('[data-message-author-role="assistant"], [data-testid="bot-message"], [data-testid*="bot-message" i], [data-testid*="assistant" i], [data-testid*="model-response" i], .markdown, [class*="markdown"], [class*="prose"], [class*="break-words"], [data-start], [data-is-streaming], [class*="result-streaming"]')) {
      return true;
    }

    const signalText = getMessageSignalText(node).toLowerCase();
    return ASSISTANT_SIGNAL_RE.test(signalText);
  }

  function hasUserRoleSignal(node) {
    if (node.matches('[data-message-author-role="user"], [data-testid*="user-message" i], .whitespace-pre-wrap, [class*="whitespace-pre-wrap"]')) {
      return true;
    }

    return Boolean(node.querySelector('[data-message-author-role="user"], [data-testid*="user-message" i], .whitespace-pre-wrap, [class*="whitespace-pre-wrap"]'));
  }

  function getMessageParts(node, role) {
    const roleElement = findRoleElement(node, role);
    const body = findMessageBody(node, role, roleElement);
    const thinkingElements = getThinkingElements(node, body, role);
    const timestamp = findTimestamp(node);

    return {
      roleElement,
      body,
      bodyCandidates: getBodyCandidateDebug(node, role, roleElement),
      thinkingElements,
      timestamp
    };
  }

  function findRoleElement(node, role) {
    if (role && node.matches(`[data-message-author-role="${cssString(role)}"]`)) {
      return node;
    }

    if (role) {
      const exact = node.querySelector(`[data-message-author-role="${cssString(role)}"]`);

      if (exact) {
        return exact;
      }
    }

    if (node.matches("[data-message-author-role]")) {
      return node;
    }

    return node.querySelector("[data-message-author-role]");
  }

  function findMessageBody(node, role, roleElement) {
    const root = roleElement || node;
    const selectors = role === "assistant" ? ASSISTANT_BODY_SELECTORS : USER_BODY_SELECTORS;
    const candidates = [root, node];

    if (role === "assistant") {
      candidates.push(...findAssistantBodyCandidates(node, root));
    }

    for (const selector of selectors) {
      for (const element of root.querySelectorAll(selector)) {
        candidates.push(element);
      }
    }

    for (const selector of selectors) {
      for (const element of node.querySelectorAll(selector)) {
        candidates.push(element);
      }
    }

    return chooseBestBody(candidates, root, role);
  }

  function findAssistantBodyCandidates(node, root) {
    const scopes = uniqueElements([root, node]).filter(Boolean);
    const selectors = [
      "div.markdown.prose",
      ".markdown.prose",
      ".markdown",
      "[class*='markdown']",
      "[class*='prose']",
      "[data-start]",
      "[data-end]",
      "[data-is-last-node]",
      "[data-is-only-node]",
      "[data-is-streaming]",
      "[class*='result-streaming']",
      "[class*='flex']",
      "[class*='min-w-0']",
      "[class*='w-full']",
      "[dir='auto']",
      ...EXPANDABLE_BUTTON_SELECTORS,
      "article",
      "section"
    ];
    const candidates = [];

    for (const scope of scopes) {
      candidates.push(...findStructuredContentCandidates(scope));

      for (const selector of selectors) {
        candidates.push(...scope.querySelectorAll(selector));
      }
    }

    return candidates.filter((candidate) => {
      const button = candidate.closest("button, [role='button']");
      return (!button || isExpandableContentButton(button)) && !candidate.closest("nav, aside, header, footer");
    });
  }

  function getBodyCandidateDebug(node, role, roleElement) {
    const root = roleElement || node;
    const candidates = role === "assistant"
      ? uniqueElements([root, node, ...findStructuredContentCandidates(node), ...findAssistantBodyCandidates(node, root), ...getExpandableContentButtons(node)])
      : uniqueElements([root, node]);

    return candidates.slice(0, 12).map((candidate) => ({
      node: summarizeNode(candidate),
      score: scoreBodyCandidate(candidate, root, role),
      textLength: getRawElementText(candidate).length,
      serializedHint: getSerializationHint(candidate)
    }));
  }

  function chooseBestBody(candidates, fallback, role) {
    const unique = uniqueElements(candidates).filter((element) => element && hasMessageContent(element) && !isNonMessageNode(element));

    if (!unique.length) {
      return fallback;
    }

    return unique
      .map((element) => ({ element, score: scoreBodyCandidate(element, fallback, role) }))
      .sort((a, b) => b.score - a.score)[0].element;
  }

  function isRichMarkdownContainer(element) {
    return Boolean(element?.matches?.("div.markdown.prose, .markdown.prose, .markdown, [class*='markdown'], [class*='prose']"));
  }

  function scoreBodyCandidate(element, fallback, role) {
    const textLength = Math.min(getElementText(element).length, 2000);
    const mediaScore = element.querySelectorAll("pre, code, img, picture, canvas").length * 220;
    const richContainerScore = isRichMarkdownContainer(element) ? 1200 : element.querySelector?.("div.markdown.prose, .markdown.prose, .markdown, [class*='markdown'], [class*='prose']") ? 650 : 0;
    const markdownScore = element.matches(".markdown") || element.querySelector(".markdown") ? 500 : 0;
    const proseScore = element.matches("[class*='markdown'], [class*='prose'], [data-is-streaming], [class*='result-streaming']") ? 520 : 0;
    const structuredNodeScore = element.matches("[data-start], [data-end], [data-is-last-node], [data-is-only-node]") || element.querySelector("[data-start], [data-end], [data-is-last-node], [data-is-only-node]") ? 140 : 0;
    const assistantScore = role === "assistant" && hasAssistantRoleSignal(element) ? 420 : 0;
    const userPenalty = role === "assistant" && hasUserRoleSignal(element) ? 650 : 0;
    const roleScore = element.matches("[data-message-author-role]") ? 500 : 0;
    const fallbackScore = element === fallback ? 450 : 0;
    const chromePenalty = element.querySelectorAll("button, [role='button'], [role='menu'], [role='menuitem']").length * 45;
    const nonMessagePenalty = isNonMessageNode(element) ? 3000 : 0;
    const markdownFragmentPenalty = element.matches("[data-start], [data-end], [data-is-last-node], [data-is-only-node], p, li") && !isRichMarkdownContainer(element) ? 280 : 0;

    return textLength + mediaScore + richContainerScore + markdownScore + proseScore + structuredNodeScore + assistantScore + roleScore + fallbackScore - chromePenalty - userPenalty - nonMessagePenalty - markdownFragmentPenalty;
  }

  function getThinkingElements(node, body, role) {
    if (role !== "assistant") {
      return [];
    }

    const roots = uniqueElements([node, body]).filter(Boolean);
    const candidates = [];

    for (const root of roots) {
      for (const selector of THINKING_SELECTORS) {
        for (const element of root.querySelectorAll(selector)) {
          const normalized = normalizeThinkingElement(element, node, body);

          if (normalized && isLikelyThinkingElement(normalized, node, body)) {
            candidates.push(normalized);
          }
        }
      }

      candidates.push(...findThinkingCueRegions(root, node, body));
    }

    return uniqueTopLevelElements(candidates);
  }

  function normalizeThinkingElement(element, messageNode, body = null) {
    const controlledId = element.getAttribute("aria-controls");
    const controlled = controlledId ? document.getElementById(controlledId) : null;

    if (controlled && messageNode.contains(controlled)) {
      const controlledRegion = controlled.closest("details, section, article") || controlled;
      return body && controlledRegion.contains(body) ? findCompactAncestor(controlled, messageNode, body) : controlledRegion;
    }

    if (element.matches("button, summary")) {
      const disclosureRegion = element.closest("details, section, article");

      if (disclosureRegion && !(body && disclosureRegion.contains(body))) {
        return disclosureRegion;
      }

      return findCompactAncestor(element, messageNode, body) || element;
    }

    return findCompactAncestor(element, messageNode, body) || element;
  }

  function findCompactAncestor(element, boundary, body = null) {
    let current = element;
    let best = element;

    while (current?.parentElement && current.parentElement !== boundary) {
      const parent = current.parentElement;
      const text = getElementText(parent);

      if (body && parent.contains(body)) {
        break;
      }

      if (!THINKING_CUE_RE.test(text.slice(0, 500))) {
        break;
      }

      if (text.length > 5000 || parent.querySelector('[data-message-author-role]:not([data-message-author-role="assistant"])')) {
        break;
      }

      best = parent;
      current = parent;
    }

    return best;
  }

  function findThinkingCueRegions(root, messageNode, body) {
    if (!root?.querySelectorAll) {
      return [];
    }

    const selectors = [
      "details",
      "summary",
      "button",
      "[role='button']",
      "[aria-expanded]",
      "[aria-controls]",
      "[data-testid]",
      "[aria-label]",
      "[title]",
      "section",
      "article",
      "div"
    ].join(",");
    const regions = [];

    for (const element of root.querySelectorAll(selectors)) {
      if (!isThinkingCueCandidateElement(element, messageNode, body)) {
        continue;
      }

      const region = findThinkingRegionFromCue(element, messageNode, body);

      if (region && isLikelyThinkingElement(region, messageNode, body)) {
        regions.push(region);
      }
    }

    return uniqueElements(regions);
  }

  function isThinkingCueCandidateElement(element, messageNode, body) {
    if (!element?.matches || !messageNode.contains(element) || element === messageNode || element === body) {
      return false;
    }

    if (body && body.contains(element)) {
      return false;
    }

    if (element.closest("#chatgpt-exporter-selector-host, nav, header, footer, aside, [role='menu']")) {
      return false;
    }

    const text = getElementText(element);
    const attrs = [
      element.getAttribute("data-testid") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.className || ""
    ].join(" ");
    const cueText = `${attrs} ${text.slice(0, 700)}`;

    if (THINKING_STATUS_RE.test(cueText)) {
      return text.length <= 4000;
    }

    if (!THINKING_CUE_RE.test(cueText)) {
      return false;
    }

    return element.matches("details, summary, button, [role='button'], [aria-expanded], [aria-controls], [data-testid], [aria-label], [title]")
      || text.length <= 1200;
  }

  function findThinkingRegionFromCue(element, messageNode, body) {
    let current = element;
    let best = element;

    while (current?.parentElement && current.parentElement !== messageNode) {
      const parent = current.parentElement;

      if (body && parent.contains(body)) {
        break;
      }

      if (parent.querySelector('[data-message-author-role]:not([data-message-author-role="assistant"])')) {
        break;
      }

      const text = getElementText(parent);

      if (text.length > 4000 || !THINKING_CUE_RE.test(text.slice(0, 900))) {
        break;
      }

      best = parent;
      current = parent;
    }

    return best;
  }

  function isLikelyThinkingElement(element, messageNode, body) {
    if (!messageNode.contains(element) || element === messageNode || element === body) {
      return false;
    }

    if (body && element.contains(body)) {
      return false;
    }

    if (element.matches("button, [role='button']") && !isExpandableContentButton(element)) {
      const text = getExpandableCueText(element);

      if (!THINKING_STATUS_RE.test(text)) {
        return false;
      }
    }

    if (element.matches("[role='menu'], [role='menuitem']")) {
      return false;
    }

    const attrs = [
      element.getAttribute("data-testid") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.className || ""
    ].join(" ");
    const text = getElementText(element);

    return THINKING_CUE_RE.test(`${attrs} ${text.slice(0, 700)}`);
  }

  async function revealExpandableThinking(root = document) {
    return revealExpandableContent(root);
  }

  async function revealExpandableContent(root = document, debugLog = null) {
    const clickDisabled = true;
    let expandableButtonCount = 0;

    const buttons = uniqueElements([
      ...root.querySelectorAll('main button[aria-expanded="false"], main button[aria-controls], main button'),
      ...EXPANDABLE_BUTTON_SELECTORS.flatMap((selector) => [...root.querySelectorAll(`main ${selector}`)])
    ]);
    expandableButtonCount = buttons.filter((button) => isExpandableCueElement(button) || isExpandableContentButton(button)).length;

    debugLog?.event("expandable.reveal", {
      detailsOpened: 0,
      expandableButtonCount,
      clicked: 0,
      clickDisabled
    });
  }

  function isThinkingCueElement(element) {
    return isExpandableCueElement(element) && THINKING_CUE_RE.test(getExpandableCueText(element));
  }

  function isExpandableCueElement(element) {
    const text = getExpandableCueText(element);

    if (!text) {
      return false;
    }

    const hasDisclosureState = element.matches?.("[aria-expanded], [aria-controls], summary, details");
    const strongExpandCue = /\b(show\s+more|show\s+all|read\s+more|view\s+more|continue|expand)\b|\u5c55\u5f00|\u663e\u793a\u66f4\u591a|\u67e5\u770b\u66f4\u591a|\u7ee7\u7eed/i;

    return THINKING_CUE_RE.test(text) || (hasDisclosureState ? EXPAND_CUE_RE.test(text) : strongExpandCue.test(text));
  }

  function isExpandableContentButton(element) {
    if (!element?.matches?.("button, [role='button']")) {
      return false;
    }

    if (element.matches("[data-testid*='copy' i], [data-testid*='feedback' i], [data-testid*='share' i], [aria-label*='Copy' i], [aria-label*='Good response' i], [aria-label*='Bad response' i], [aria-label*='Share' i]")) {
      return false;
    }

    if (element.matches(EXPANDABLE_BUTTON_SELECTORS.join(","))) {
      return true;
    }

    return isExpandableCueElement(element);
  }

  function getExpandableContentButtons(root) {
    if (!root?.querySelectorAll) {
      return [];
    }

    return uniqueElements(
      EXPANDABLE_BUTTON_SELECTORS.flatMap((selector) => [...root.querySelectorAll(selector)])
    ).filter(isExpandableContentButton);
  }

  function getExpandableCueText(element) {
    const text = [
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.getAttribute("data-testid") || "",
      element.getAttribute("aria-controls") || "",
      getElementText(element).slice(0, 500)
    ].join(" ");

    return text;
  }

  function findTimestamp(node) {
    const roots = getTimestampSearchRoots(node);
    const selectors = [
      "time[datetime]",
      "time",
      "[datetime]",
      '[data-testid*="timestamp" i]',
      '[data-testid*="time" i]',
      '[class*="timestamp" i]',
      '[class*="time" i]',
      '[aria-label*="timestamp" i]',
      '[aria-label*="sent" i]',
      '[aria-label*="date" i]',
      '[aria-label*="time" i]',
      '[title*="timestamp" i]',
      '[title*="sent" i]',
      '[title*="date" i]',
      '[title*="time" i]',
      '[title]'
    ];

    for (const root of roots) {
      for (const selector of selectors) {
        for (const element of getTimestampSelectorMatches(root, selector)) {
          const value = normalizeTimestamp(
            element.getAttribute("datetime") ||
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            getElementText(element)
          );

          if (value) {
            return value;
          }
        }
      }
    }

    for (const root of roots) {
      const value = findTimestampInShortTextNodes(root);

      if (value) {
        return value;
      }
    }

    return "";
  }

  function getTimestampSearchRoots(node) {
    if (!node?.querySelectorAll) {
      return [];
    }

    return uniqueElements([
      node,
      getClosestTurnNode(node),
      node.closest?.("[data-turn-container]"),
      node.closest?.("[data-turn-id-container]"),
      node.parentElement
    ].filter(Boolean)).filter((root) => root?.querySelectorAll && !root.matches?.("html, body, main"));
  }

  function getTimestampSelectorMatches(root, selector) {
    const matches = [];

    if (root.matches?.(selector)) {
      matches.push(root);
    }

    matches.push(...root.querySelectorAll(selector));
    return uniqueElements(matches);
  }

  function findTimestampInShortTextNodes(root) {
    const rootTextLength = getElementText(root).length;

    if (rootTextLength > 5000 && root.querySelectorAll("[data-message-author-role], .markdown, [class*='markdown']").length > 2) {
      return "";
    }

    const candidates = uniqueElements([
      root,
      ...root.querySelectorAll("time, span, div")
    ]);

    for (const element of candidates) {
      if (!isShortTimestampTextElement(element)) {
        continue;
      }

      const value = extractTimestampFromText(getElementText(element));

      if (value) {
        return value;
      }
    }

    return "";
  }

  function isShortTimestampTextElement(element) {
    if (!element?.matches || element.closest("#chatgpt-exporter-selector-host")) {
      return false;
    }

    if (element.querySelector("p, li, pre, code, img, svg, button, [role='button'], .markdown, [class*='markdown']")) {
      return false;
    }

    const text = getElementText(element);
    return Boolean(text && text.length <= 96 && extractTimestampFromText(text));
  }

  function normalizeTimestamp(value) {
    const timestamp = String(value || "").replace(/\s+/g, " ").trim();

    if (!timestamp || timestamp.length > 160) {
      return "";
    }

    return extractTimestampFromText(timestamp);
  }

  function extractTimestampFromText(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();

    if (!text) {
      return "";
    }

    const dateTimeMatch = text.match(DATE_TIME_VALUE_RE);

    if (dateTimeMatch) {
      return dateTimeMatch[0].trim();
    }

    if (!TIMESTAMP_CUE_RE.test(text)) {
      return "";
    }

    const timeMatch = text.match(TIME_VALUE_RE);
    return timeMatch ? timeMatch[0].trim() : "";
  }

  async function enrichMessageTimestamps(messages, debugLog = null) {
    const messagesNeedingApiTime = messages.filter((message) => message?.sourceMessageId);

    if (!messagesNeedingApiTime.length) {
      debugLog?.event("timestamps.skipped", { reason: "no source message ids" });
      return;
    }

    const conversationId = getCurrentConversationId();

    if (!conversationId) {
      debugLog?.event("timestamps.skipped", { reason: "no conversation id in url" });
      return;
    }

    try {
      const data = await fetchConversationData(conversationId);
      const timestampMap = buildConversationTimestampMap(data);
      let applied = 0;

      for (const message of messagesNeedingApiTime) {
        const timestamp = timestampMap.get(message.sourceMessageId);

        if (timestamp) {
          message.timestamp = timestamp;
          applied += 1;
        }
      }

      debugLog?.event("timestamps.enriched", {
        conversationId,
        available: timestampMap.size,
        applied
      });
    } catch (error) {
      debugLog?.event("timestamps.failed", {
        conversationId,
        error: error?.message || String(error)
      });
    }
  }

  function getCurrentConversationId() {
    const pathParts = location.pathname.split("/").map(decodePathPart).filter(Boolean);
    const conversationSegmentIndex = pathParts.findIndex((part) => part === "c");
    const id = conversationSegmentIndex >= 0 ? pathParts[conversationSegmentIndex + 1] : "";

    if (id && /^[a-z0-9_-]{8,}$/i.test(id)) {
      return id;
    }

    const queryId = new URLSearchParams(location.search).get("conversation_id") || "";
    return /^[a-z0-9_-]{8,}$/i.test(queryId) ? queryId : "";
  }

  function decodePathPart(part) {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  }

  async function fetchConversationData(conversationId) {
    const url = new URL(`/backend-api/conversation/${encodeURIComponent(conversationId)}`, location.origin);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS);

    const response = await fetch(url.href, {
      credentials: "include",
      signal: controller.signal,
      headers: {
        accept: "application/json"
      }
    }).finally(() => window.clearTimeout(timeoutId));

    if (!response.ok) {
      throw new Error(`Conversation API returned ${response.status}`);
    }

    return response.json();
  }

  function buildConversationTimestampMap(data) {
    const map = new Map();
    const mapping = data?.mapping && typeof data.mapping === "object" ? data.mapping : {};

    for (const node of Object.values(mapping)) {
      const message = node?.message || {};
      const messageId = message.id || node?.id || "";
      const timestamp = formatConversationTimestamp(
        message.create_time ??
        message.update_time ??
        message.metadata?.create_time ??
        message.metadata?.timestamp
      );

      if (messageId && timestamp) {
        map.set(messageId, timestamp);
      }
    }

    return map;
  }

  function formatConversationTimestamp(value) {
    if (value == null || value === "") {
      return "";
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return normalizeTimestamp(value);
    }

    const milliseconds = numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;
    const date = new Date(milliseconds);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      padDatePart(date.getDate()),
      padDatePart(date.getMonth() + 1),
      date.getFullYear()
    ].join("/") + `, ${[
      padDatePart(date.getHours()),
      padDatePart(date.getMinutes()),
      padDatePart(date.getSeconds())
    ].join(":")}`;
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  async function enrichVisibleThinkingFlyouts(messages, debugLog = null) {
    const snapshots = getVisibleThinkingFlyoutSnapshots();
    let applied = 0;

    debugLog?.event("thinkingFlyout.visibleScan", {
      ...getThinkingFlyoutDiagnostic(),
      snapshotCount: snapshots.length,
      snapshots: snapshots.slice(0, 3).map(getThinkingSnapshotDebug)
    });

    for (const snapshot of snapshots) {
      applied += applyThinkingFlyoutSnapshot(snapshot, messages) ? 1 : 0;
    }

    const opened = await enrichThinkingFlyoutsByOpeningTriggers(messages, debugLog);

    debugLog?.event("thinkingFlyout.enriched", {
      available: snapshots.length,
      visibleApplied: applied,
      autoAttempted: opened.attempted,
      autoApplied: opened.applied
    });
  }

  async function enrichThinkingFlyoutsByOpeningTriggers(messages, debugLog = null) {
    const assistantMessages = messages.filter((message) => message.role === "assistant" && isThinThinkingMarkdown(message.thinkingMarkdown));
    let attempted = 0;
    let applied = 0;

    debugLog?.event("thinkingFlyout.autoStart", {
      assistantMessages: messages.filter((message) => message.role === "assistant").length,
      thinThinkingMessages: assistantMessages.length,
      limit: THINKING_FLYOUT_AUTO_OPEN_LIMIT
    });

    for (const message of assistantMessages) {
      if (attempted >= THINKING_FLYOUT_AUTO_OPEN_LIMIT) {
        break;
      }

      const triggerResult = await findMountedThinkingTriggerForMessage(message);
      const trigger = triggerResult.trigger;

      if (!trigger) {
        debugLog?.event("thinkingFlyout.triggerMissing", {
          message: getThinkingDebugMessageInfo(message),
          reason: triggerResult.reason,
          candidates: triggerResult.candidates || []
        });
        continue;
      }

      attempted += 1;

      try {
        const beforeSnapshots = getVisibleThinkingFlyoutSnapshots();
        const beforeSignatures = new Set(beforeSnapshots.map((snapshot) => snapshot.signature));
        debugLog?.event("thinkingFlyout.autoClick", {
          message: getThinkingDebugMessageInfo(message),
          triggerText: getElementText(trigger).slice(0, 120),
          triggerSource: triggerResult.source,
          beforeSnapshotCount: beforeSnapshots.length
        });
        trigger.click();
        const snapshot = await waitForThinkingFlyoutSnapshot(beforeSignatures, THINKING_FLYOUT_OPEN_TIMEOUT_MS);
        const wasApplied = snapshot ? applyThinkingFlyoutSnapshot(snapshot, messages, message) : false;

        debugLog?.event("thinkingFlyout.autoResult", {
          message: getThinkingDebugMessageInfo(message),
          snapshot: snapshot ? getThinkingSnapshotDebug(snapshot) : null,
          applied: wasApplied,
          reason: snapshot ? (wasApplied ? "applied" : "snapshot not richer than current thinking") : "no new flyout snapshot after click"
        });

        if (wasApplied) {
          applied += 1;
        }
      } catch (error) {
        debugLog?.event("thinkingFlyout.openFailed", {
          message: getThinkingDebugMessageInfo(message),
          error: error?.message || String(error)
        });
      }
    }

    return {
      attempted,
      applied
    };
  }

  async function findMountedThinkingTriggerForMessage(message) {
    const candidates = [
      message.sourceNode,
      message.sourceNode?.closest?.("[data-turn-id-container], [data-turn-container], [data-turn-id], [data-testid*='conversation-turn']"),
      message.sourceTurnId ? document.querySelector(`[data-turn-id="${cssString(message.sourceTurnId)}"]`) : null,
      message.sourceTurnContainer ? document.querySelector(`[data-turn-id-container="${cssString(message.sourceTurnContainer)}"], [data-turn-container="${cssString(message.sourceTurnContainer)}"]`) : null,
      message.sourceMessageId ? document.querySelector(`[data-message-id="${cssString(message.sourceMessageId)}"]`)?.closest("[data-turn-id-container], [data-turn-container], [data-turn-id], [data-testid*='conversation-turn']") : null
    ].filter(Boolean);
    const diagnostics = [];

    if (!candidates.length) {
      return {
        trigger: null,
        reason: "no mounted source node for message",
        candidates: diagnostics
      };
    }

    for (const candidate of uniqueElements(candidates)) {
      const trigger = findThinkingTriggerInRoot(candidate);
      const candidateInfo = {
        source: "before-scroll",
        node: summarizeNode(candidate),
        triggerCount: countThinkingTriggersInRoot(candidate)
      };
      diagnostics.push(candidateInfo);

      if (trigger) {
        return {
          trigger,
          reason: "found before scroll",
          source: "before-scroll",
          candidates: diagnostics
        };
      }

      candidate.scrollIntoView?.({ block: "center", inline: "nearest" });
      await sleep(120);

      const mountedTrigger = findThinkingTriggerInRoot(candidate);
      diagnostics.push({
        source: "after-scroll",
        node: summarizeNode(candidate),
        triggerCount: countThinkingTriggersInRoot(candidate)
      });

      if (mountedTrigger) {
        return {
          trigger: mountedTrigger,
          reason: "found after scroll",
          source: "after-scroll",
          candidates: diagnostics
        };
      }
    }

    return {
      trigger: null,
      reason: "no thinking trigger inside mounted source nodes",
      candidates: diagnostics
    };
  }

  function findThinkingTriggerInRoot(root) {
    if (!root?.querySelectorAll) {
      return null;
    }

    return [...root.querySelectorAll("button, [role='button']")].find(isThinkingDetailTriggerElement) || null;
  }

  function countThinkingTriggersInRoot(root) {
    if (!root?.querySelectorAll) {
      return 0;
    }

    return [...root.querySelectorAll("button, [role='button']")].filter(isThinkingDetailTriggerElement).length;
  }

  function isThinkingDetailTriggerElement(element) {
    if (!element?.matches || element.closest("#chatgpt-exporter-selector-host, nav, header, footer, aside, [role='menu']")) {
      return false;
    }

    const cueText = getExpandableCueText(element);

    if (!cueText || !THINKING_STATUS_RE.test(cueText)) {
      return false;
    }

    if (element.matches("[data-testid*='copy' i], [data-testid*='feedback' i], [data-testid*='share' i], [aria-label*='Copy' i], [aria-label*='Good response' i], [aria-label*='Bad response' i], [aria-label*='Share' i]")) {
      return false;
    }

    return true;
  }

  async function waitForThinkingFlyoutSnapshot(previousSignatures, timeoutMs) {
    const startedAt = Date.now();
    let bestSnapshot = null;

    while (Date.now() - startedAt < timeoutMs) {
      const snapshots = getVisibleThinkingFlyoutSnapshots();
      const freshSnapshot = snapshots.find((snapshot) => !previousSignatures.has(snapshot.signature) && snapshot.markdown);

      if (freshSnapshot) {
        return freshSnapshot;
      }

      bestSnapshot = snapshots.find((snapshot) => snapshot.markdown) || bestSnapshot;
      await sleep(100);
    }

    return previousSignatures.size ? null : bestSnapshot;
  }

  function applyThinkingFlyoutSnapshot(snapshot, messages, preferredMessage = null) {
    const target = preferredMessage || findThinkingFlyoutTargetMessage(snapshot, messages);

    if (!target || !isRicherThinkingMarkdown(snapshot.markdown, target.thinkingMarkdown)) {
      return false;
    }

    target.thinkingMarkdown = snapshot.markdown;
    target.preview = messageExtractor.preview(target);
    return true;
  }

  function getThinkingFlyoutDiagnostic() {
    const roots = [
      ...document.querySelectorAll('[data-stage-thread-flyout="true"], [data-testid="stage-thread-flyout"], [data-testid="screen-threadFlyout"]')
    ];
    const screenFlyouts = [...document.querySelectorAll('[data-testid="screen-threadFlyout"]')];
    const reasoningPanels = [...document.querySelectorAll([
      'section[aria-label*="\u63a8\u7406"]',
      'section[aria-label*="\u601d\u8003"]',
      'section[aria-label*="reasoning" i]',
      'section[aria-label*="thinking" i]'
    ].join(","))];
    const candidates = uniqueElements([...roots, ...screenFlyouts, ...reasoningPanels]);

    return {
      rootCount: roots.length,
      screenFlyoutCount: screenFlyouts.length,
      reasoningPanelCount: reasoningPanels.length,
      visibleCandidateCount: candidates.filter(isVisibleElement).length,
      candidatePreviews: candidates.slice(0, 4).map((element) => ({
        visible: isVisibleElement(element),
        node: summarizeNode(element),
        textPreview: getElementText(element).slice(0, 220)
      }))
    };
  }

  function getThinkingSnapshotDebug(snapshot) {
    return {
      markdownLength: snapshot.markdown?.length || 0,
      status: snapshot.status || "",
      duration: snapshot.duration || "",
      signature: snapshot.signature || "",
      preview: String(snapshot.markdown || "").replace(/\s+/g, " ").slice(0, 220),
      panel: summarizeNode(snapshot.panel)
    };
  }

  function getThinkingDebugMessageInfo(message) {
    return {
      id: message.id || "",
      role: message.role || "",
      order: message.order ?? null,
      sourceTurnId: message.sourceTurnId || "",
      sourceMessageId: message.sourceMessageId || "",
      sourceTestId: message.sourceTestId || "",
      thinkingLength: message.thinkingMarkdown?.length || 0,
      thinkingPreview: String(message.thinkingMarkdown || "").replace(/\s+/g, " ").slice(0, 160),
      preview: message.preview || ""
    };
  }

  function getVisibleThinkingFlyoutSnapshots() {
    const roots = uniqueElements([
      ...document.querySelectorAll('[data-stage-thread-flyout="true"], [data-testid="stage-thread-flyout"], [data-testid="screen-threadFlyout"]')
    ]);
    const panels = [];

    for (const root of roots) {
      if (isThinkingFlyoutPanel(root)) {
        panels.push(root);
      }

      panels.push(...root.querySelectorAll([
        '[data-testid="screen-threadFlyout"]',
        'section[aria-label*="\u63a8\u7406"]',
        'section[aria-label*="\u601d\u8003"]',
        'section[aria-label*="reasoning" i]',
        'section[aria-label*="thinking" i]'
      ].join(",")));
    }

    if (!panels.length) {
      panels.push(...document.querySelectorAll([
        '[data-testid="screen-threadFlyout"]',
        'section[aria-label*="\u63a8\u7406"]',
        'section[aria-label*="\u601d\u8003"]',
        'section[aria-label*="reasoning" i]',
        'section[aria-label*="thinking" i]'
      ].join(",")));
    }

    return uniqueTopLevelElements(panels)
      .filter(isThinkingFlyoutPanel)
      .map(extractThinkingFlyoutSnapshot)
      .filter((snapshot) => snapshot.markdown);
  }

  function isThinkingFlyoutPanel(element) {
    if (!element?.matches || !isVisibleElement(element)) {
      return false;
    }

    const attrs = [
      element.getAttribute("data-testid") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("class") || ""
    ].join(" ");
    const text = getElementText(element);

    return Boolean(
      /stage-thread-flyout|screen-threadFlyout|reasoning|thinking|\u63a8\u7406|\u601d\u8003/i.test(attrs)
      && (THINKING_CUE_RE.test(text.slice(0, 1200)) || THINKING_STATUS_RE.test(text))
    );
  }

  function extractThinkingFlyoutSnapshot(panel) {
    const lines = getThinkingFlyoutLines(panel);
    const markdown = formatThinkingFlyoutLinesAsMarkdown(lines);
    const status = lines.find((line) => THINKING_STATUS_RE.test(line)) || "";

    return {
      panel,
      markdown,
      status,
      duration: extractThinkingDuration(status || getElementText(panel)),
      signature: hashString(markdown || getElementText(panel))
    };
  }

  function getThinkingFlyoutLines(panel) {
    const rawText = String(panel.innerText || panel.textContent || "").replace(/\r\n?/g, "\n");
    const sourceLines = rawText.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const startIndex = sourceLines.findIndex((line) => THINKING_FLYOUT_TITLE_RE.test(line) || THINKING_STATUS_RE.test(line) || THINKING_CUE_RE.test(line));
    const lines = startIndex >= 0 ? sourceLines.slice(startIndex) : sourceLines;
    const result = [];

    for (const line of lines) {
      if (THINKING_FLYOUT_STOP_RE.test(line)) {
        break;
      }

      if (isThinkingFlyoutNoiseLineSafe(line)) {
        continue;
      }

      result.push(line);
    }

    return result;
  }

  function isThinkingFlyoutNoiseLine(line) {
    return THINKING_FLYOUT_TITLE_RE.test(line)
      || /^activity\s*[·:]/i.test(line)
      || /^\u6d3b\u52a8\s*[·:]/.test(line)
      || /^close$/i.test(line)
      || /^\u5173\u95ed$/.test(line);
  }

  function isThinkingFlyoutNoiseLineSafe(line) {
    return THINKING_FLYOUT_TITLE_RE.test(line)
      || /^activity\s*(?:[\u00b7:])?/i.test(line)
      || /^\u6d3b\u52a8\s*(?:[\u00b7:])?/.test(line)
      || /^close$/i.test(line)
      || /^\u5173\u95ed$/.test(line);
  }

  function formatThinkingFlyoutLinesAsMarkdown(lines) {
    const contentLines = [];
    const statusLines = [];

    for (const line of lines) {
      if (THINKING_STATUS_RE.test(line) || THINKING_FLYOUT_DONE_RE.test(line)) {
        statusLines.push(line);
      } else {
        contentLines.push(line);
      }
    }

    const items = [];

    for (let index = 0; index < contentLines.length; index += 1) {
      const line = contentLines[index];
      const next = contentLines[index + 1] || "";

      if (next && isLikelyThinkingFlyoutHeadingSafe(line, next)) {
        items.push(`- **${line}**\n  ${next}`);
        index += 1;
      } else {
        items.push(`- ${line}`);
      }
    }

    return cleanMarkdown([
      items.join("\n"),
      statusLines.map((line) => `\u2713 ${line}`).join("\n")
    ].filter(Boolean).join("\n\n"));
  }

  function isLikelyThinkingFlyoutHeading(line, nextLine) {
    return line.length <= 38
      && nextLine.length >= 24
      && !/[.?!。？！:：]$/.test(line)
      && !THINKING_STATUS_RE.test(line)
      && !THINKING_FLYOUT_DONE_RE.test(line);
  }

  function isLikelyThinkingFlyoutHeadingSafe(line, nextLine) {
    return line.length <= 38
      && nextLine.length >= 24
      && !/[.?!\u3002\uff1f\uff01:\uff1a]$/.test(line)
      && !THINKING_STATUS_RE.test(line)
      && !THINKING_FLYOUT_DONE_RE.test(line);
  }

  function extractThinkingDuration(text) {
    const match = String(text || "").match(/\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds?|\u79d2)?/i);
    return match ? match[0].replace(/\s+/g, "") : "";
  }

  function findThinkingFlyoutTargetMessage(snapshot, messages) {
    const assistantMessages = messages.filter((message) => message.role === "assistant");

    if (!assistantMessages.length) {
      return null;
    }

    if (snapshot.status || snapshot.duration) {
      const matchedByStatus = assistantMessages.find((message) => {
        const text = [
          message.thinkingMarkdown || "",
          message.sourceNode ? getElementText(message.sourceNode) : ""
        ].join(" ");
        return Boolean(
          snapshot.status && text.includes(snapshot.status)
          || snapshot.duration && text.replace(/\s+/g, "").includes(snapshot.duration)
        );
      });

      if (matchedByStatus) {
        return matchedByStatus;
      }
    }

    return assistantMessages.find((message) => isNodeInViewport(message.sourceNode) && isThinThinkingMarkdown(message.thinkingMarkdown))
      || assistantMessages.find((message) => isThinThinkingMarkdown(message.thinkingMarkdown))
      || assistantMessages[0];
  }

  function isRicherThinkingMarkdown(candidate, current) {
    const next = cleanMarkdown(candidate);
    const previous = cleanMarkdown(current);

    if (!next) {
      return false;
    }

    if (!previous) {
      return true;
    }

    return next.length > previous.length + Math.max(40, Math.floor(previous.length * 0.25));
  }

  function isThinThinkingMarkdown(markdown) {
    const value = cleanMarkdown(markdown);
    return !value || value.length < 90 || (THINKING_STATUS_RE.test(value) && value.length < 160);
  }

  function isVisibleElement(element) {
    const rect = element?.getBoundingClientRect?.();

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
  }

  function isNodeInViewport(node) {
    const rect = node?.getBoundingClientRect?.();

    if (!rect) {
      return false;
    }

    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function getMessageKey(node, role, parts) {
    const messageId = getMessageIdFromNode(node);
    const turnDataId = getTurnId(node);
    const turnId = node.getAttribute("data-testid") || node.closest("[data-testid]")?.getAttribute("data-testid");
    const body = parts.body || node;

    if (messageId) {
      return `message-id:${messageId}`;
    }

    if (turnDataId) {
      return `turn-id:${turnDataId}`;
    }

    if (turnId && /^conversation-turn-\d+/.test(turnId)) {
      return `turn:${turnId}`;
    }

    const fingerprint = [
      role,
      parts.timestamp || "",
      getElementText(body).slice(0, 600),
      parts.thinkingElements.map((element) => getElementText(element).slice(0, 200)).join("\n"),
      [...body.querySelectorAll("pre")].map((pre) => pre.textContent || "").join("\n").slice(0, 400)
    ].join("\n");

    return `fingerprint:${hashString(fingerprint)}`;
  }

  function getStableNodeKey(node) {
    const messageId = getMessageIdFromNode(node);

    if (messageId) {
      return `message-id:${messageId}`;
    }

    const turnDataId = getTurnId(node);

    if (turnDataId) {
      return `turn-id:${turnDataId}`;
    }

    const turnId = node.getAttribute("data-testid") || node.closest("[data-testid]")?.getAttribute("data-testid");

    if (turnId && /^conversation-turn-\d+/.test(turnId)) {
      return `turn:${turnId}`;
    }

    return "";
  }

  function getMessageIdFromNode(node) {
    return node?.querySelector?.("[data-message-id]")?.getAttribute("data-message-id") || node?.getAttribute?.("data-message-id") || "";
  }

  async function extractMessage(node, parts, role, order) {
    const body = parts.body || node;
    const thinkingElements = parts.thinkingElements || [];
    let state = createSerializationState(thinkingElements);
    let usedWholeNodeFallback = false;
    const serializationAttempts = [];
    let markdown = cleanMarkdown(await serializeNodeChildren(body, state));
    serializationAttempts.push({
      stage: "primary-body",
      length: markdown.length,
      node: summarizeNode(body)
    });

    if (shouldRunCompletenessPass(node, body, role, markdown)) {
      const completeState = createSerializationState(thinkingElements, true);
      const completeResult = await serializeCompleteMessageContent(node, parts, completeState, serializationAttempts);

      if (isMoreCompleteMarkdown(completeResult.markdown, markdown)) {
        markdown = completeResult.markdown;
        usedWholeNodeFallback = completeResult.usedFallback;
        state = completeState;
      }
    }

    if (!markdown) {
      const fallbackState = createSerializationState(thinkingElements, true);
      const fallbackResult = await serializeFallbackMessageContent(node, parts, fallbackState, serializationAttempts);
      markdown = fallbackResult.markdown;
      usedWholeNodeFallback = fallbackResult.usedFallback;
      state = fallbackState;
    }

    const previousSkipElements = state.skipElements;
    let thinkingMarkdown = "";

    try {
      state.skipElements = new WeakSet();
      thinkingMarkdown = cleanMarkdown((await Promise.all(
        thinkingElements.map((element) => serializeNode(element, state))
      )).join("\n\n"));
    } finally {
      state.skipElements = previousSkipElements;
    }

    return {
      role,
      sourceNode: node,
      sourceTurnId: getTurnId(node),
      sourceTurnContainer: node.getAttribute("data-turn-id-container") || node.getAttribute("data-turn-container") || "",
      sourceTestId: node.getAttribute("data-testid") || "",
      sourceMessageId: getMessageIdFromNode(node),
      order: getOrderHint(node, order),
      timestamp: parts.timestamp || "",
      markdown,
      thinkingMarkdown,
      usedWholeNodeFallback,
      serializationAttempts,
      codeBlockCount: state.codeBlockCount,
      fileCount: state.fileCount,
      imageCount: state.imageCount,
      imagesEmbedded: state.imagesEmbedded,
      imagesFailed: state.imagesFailed,
      imageEvents: state.imageEvents
    };
  }

  function createSerializationState(thinkingElements = [], includeHidden = false) {
    return {
      codeBlockCount: 0,
      fileCount: 0,
      imageCount: 0,
      imagesEmbedded: 0,
      imagesFailed: 0,
      imageEvents: [],
      includeHidden,
      skipElements: new WeakSet(thinkingElements)
    };
  }

  function shouldRunCompletenessPass(node, body, role, markdown) {
    if (role !== "assistant") {
      return false;
    }

    return Boolean(
      isLastTurnNode(node)
      || node.querySelector?.("[data-is-last-node], [data-is-only-node], [data-end], [data-start]")
      || body?.querySelector?.("[data-is-last-node], [data-is-only-node], [data-end], [data-start]")
      || markdown.length > 1200
    );
  }

  function isMoreCompleteMarkdown(candidate, current) {
    const next = cleanMarkdown(candidate);
    const previous = cleanMarkdown(current);

    if (!next) {
      return false;
    }

    if (!previous) {
      return true;
    }

    return next.length > previous.length + Math.max(180, Math.floor(previous.length * 0.18));
  }

  async function serializeCompleteMessageContent(node, parts, state, attempts = []) {
    const body = parts.body || node;
    const candidates = getCompleteContentCandidates(node, body);
    const serializedPieces = [];

    for (const candidate of candidates) {
      const markdown = cleanMarkdown(await serializeNode(candidate, state));

      attempts.push({
        stage: "complete-candidate",
        length: markdown.length,
        node: summarizeNode(candidate),
        hint: getSerializationHint(candidate)
      });

      if (markdown) {
        serializedPieces.push(markdown);
      }
    }

    const aggregate = cleanMarkdown(serializedPieces.join("\n\n"));
    attempts.push({
      stage: "complete-aggregate",
      length: aggregate.length,
      candidateCount: candidates.length,
      node: summarizeNode(node),
      hint: getSerializationHint(node)
    });

    if (aggregate) {
      return {
        markdown: aggregate,
        usedFallback: candidates.some((candidate) => candidate !== body)
      };
    }

    const wholeTurn = cleanMarkdown(await serializeNodeChildren(node, state));
    attempts.push({
      stage: "complete-whole-turn",
      length: wholeTurn.length,
      node: summarizeNode(node),
      hint: getSerializationHint(node)
    });

    return {
      markdown: wholeTurn,
      usedFallback: true
    };
  }

  function getCompleteContentCandidates(node, body) {
    const richSelector = "div.markdown.prose, .markdown.prose, .markdown, [class*='markdown'], [class*='prose']";
    const richCandidates = uniqueTopLevelElements([
      body?.matches?.(richSelector) ? body : null,
      ...node.querySelectorAll(richSelector)
    ]).filter((candidate) => isSerializableContentCandidate(candidate, node));

    if (richCandidates.length) {
      return richCandidates;
    }

    const selectors = [
      "[data-start]",
      "[data-end]",
      "[data-is-last-node]",
      "[data-is-only-node]",
      "[data-is-streaming]",
      "[class*='result-streaming']",
      "blockquote",
      "ul",
      "ol",
      "table",
      "pre"
    ].join(", ");
    const rawCandidates = uniqueElements([
      body,
      ...node.querySelectorAll(selectors)
    ]).filter((candidate) => isSerializableContentCandidate(candidate, node));

    const topLevel = uniqueTopLevelElements(rawCandidates);

    if (topLevel.length === 1 && topLevel[0] === body && body !== node && isLastTurnNode(node)) {
      return uniqueTopLevelElements([body, ...node.querySelectorAll("[data-start], [data-end], [data-is-last-node], [data-is-only-node]")]);
    }

    return topLevel.length ? topLevel : [body || node];
  }

  function isSerializableContentCandidate(candidate, scope) {
    return Boolean(
      candidate
      && scope?.contains?.(candidate)
      && hasMessageContent(candidate)
      && !isNonMessageNode(candidate)
      && !candidate.closest("nav, aside, header, footer, [role='menu'], [role='menuitem']")
    );
  }

  async function serializeFallbackMessageContent(node, parts, state, attempts = []) {
    const previousIncludeHidden = state.includeHidden;
    state.includeHidden = true;
    const candidates = uniqueElements([
      ...findStructuredContentCandidates(node),
      ...findAssistantBodyCandidates(node, parts.body || node),
      ...getExpandableContentButtons(node),
      parts.body,
      node
    ]).filter((candidate) => candidate && hasMessageContent(candidate) && !isNonMessageNode(candidate));

    try {
      for (const candidate of candidates) {
        const markdown = cleanMarkdown(await serializeNodeChildren(candidate, state));
        attempts.push({
          stage: "fallback-candidate",
          length: markdown.length,
          node: summarizeNode(candidate),
          hint: getSerializationHint(candidate)
        });

        if (markdown) {
          return {
            markdown,
            usedFallback: candidate !== parts.body
          };
        }
      }

      const rawText = cleanMarkdown(getRawElementText(node));
      attempts.push({
        stage: "raw-text",
        length: rawText.length,
        node: summarizeNode(node)
      });

      if (rawText && !NON_MESSAGE_TEXT_RE.test(rawText)) {
        return {
          markdown: rawText,
          usedFallback: true
        };
      }

      return {
        markdown: "",
        usedFallback: false
      };
    } finally {
      state.includeHidden = previousIncludeHidden;
    }
  }

  function findStructuredContentCandidates(node) {
    if (!node?.querySelectorAll) {
      return [];
    }

    return [...node.querySelectorAll("div.markdown.prose, .markdown.prose, [data-start], [data-end], [data-is-last-node], [data-is-only-node], blockquote, ul, ol, table")]
      .filter((candidate) => !candidate.closest("nav, aside, header, footer"));
  }

  async function serializeNodeChildren(element, state) {
    const parts = [];

    for (const child of element.childNodes) {
      parts.push(await serializeNode(child, state));
    }

    return parts.join("");
  }

  function getCssInlineMarkdownFormat(element) {
    if (!isInlineMarkdownFormattingElement(element)) {
      return null;
    }

    const className = ` ${String(element.getAttribute("class") || "")} `;
    const styleAttr = String(element.getAttribute("style") || "");
    let bold = /\sfont-(?:semibold|bold|extrabold|black)\s/.test(className)
      || /font-\[(?:[6-9]\d{2}|[1-9]\d{3})\]/.test(className)
      || /font-weight\s*:\s*(?:bold|bolder|[6-9]\d{2}|[1-9]\d{3})/i.test(styleAttr);
    let italic = /\sitalic\s/.test(className) || /font-style\s*:\s*(?:italic|oblique)/i.test(styleAttr);

    if (!bold || !italic) {
      const computed = getElementComputedStyle(element);
      const parentComputed = getElementComputedStyle(element.parentElement);

      if (!bold && computed) {
        const weight = parseFontWeight(computed.fontWeight);
        const parentWeight = parseFontWeight(parentComputed?.fontWeight);
        bold = weight >= 600 && weight > Math.max(500, parentWeight || 0);
      }

      if (!italic && computed) {
        italic = /italic|oblique/i.test(computed.fontStyle || "") && !/italic|oblique/i.test(parentComputed?.fontStyle || "");
      }
    }

    return bold || italic ? { bold, italic } : null;
  }

  function isInlineMarkdownFormattingElement(element) {
    const tag = element?.tagName?.toLowerCase?.() || "";

    if (!["span", "mark", "small"].includes(tag)) {
      return false;
    }

    return !element.querySelector?.("p, ul, ol, blockquote, table, pre, h1, h2, h3, h4, h5, h6, div, section, article");
  }

  function getElementComputedStyle(element) {
    if (!element || !window.getComputedStyle) {
      return null;
    }

    try {
      return window.getComputedStyle(element);
    } catch {
      return null;
    }
  }

  function parseFontWeight(weight) {
    const value = String(weight || "").trim().toLowerCase();

    if (value === "bold" || value === "bolder") {
      return 700;
    }

    if (value === "normal" || value === "lighter") {
      return 400;
    }

    const numeric = Number.parseInt(value, 10);
    return Number.isFinite(numeric) ? numeric : 400;
  }

  function wrapSerializedInlineMarkdown(text, format) {
    let value = cleanMarkdown(text);

    if (!value) {
      return "";
    }

    if (format.italic && !isWrappedWithMarkdown(value, "_") && !isWrappedWithMarkdown(value, "*")) {
      value = `_${value}_`;
    }

    if (format.bold && !isWrappedWithMarkdown(value, "**") && !isWrappedWithMarkdown(value, "__")) {
      value = `**${value}**`;
    }

    return value;
  }

  function isWrappedWithMarkdown(text, marker) {
    return String(text || "").startsWith(marker) && String(text || "").endsWith(marker);
  }

  async function serializeNode(node, state) {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeTextNode(node.nodeValue || "", node.parentElement);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node;
    const tag = element.tagName.toLowerCase();

    if (shouldSkipElement(element, state)) {
      return "";
    }

    if (tag === "br") {
      return "\n";
    }

    if (tag === "pre") {
      // Code blocks are serialized directly so syntax fences and language hints
      // survive even if surrounding toolbar markup changes.
      state.codeBlockCount += 1;
      return `\n\n${formatCodeBlock(element)}\n\n`;
    }

    if (isLikelyFileAttachmentElement(element)) {
      const fileMarkdown = formatFileAttachmentMarkdown(element);
      if (fileMarkdown) {
        state.fileCount += 1;
      }
      return fileMarkdown ? `\n\n${fileMarkdown}\n\n` : "";
    }

    if (hasChatGptRangeMarker(element) && !isSemanticMarkdownElementTag(tag)) {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `\n\n${text}\n\n` : "";
    }

    if (tag === "img") {
      if (isLikelyDecorativeImage(element)) {
        return "";
      }

      state.imageCount += 1;
      const imageMarkdown = await imageElementToMarkdown(element, state);
      return imageMarkdown ? `\n\n${imageMarkdown}\n\n` : "";
    }

    if (tag === "canvas") {
      const imageMarkdown = canvasElementToMarkdown(element, state);
      return imageMarkdown ? `\n\n${imageMarkdown}\n\n` : "";
    }

    if (false && hasUsefulBackgroundImage(element)) {
      const imageMarkdown = await backgroundImageElementToMarkdown(element, state);

      if (imageMarkdown) {
        return `\n\n${imageMarkdown}\n\n${await serializeNodeChildren(element, state)}`;
      }
    }

    if (tag === "code" && element.closest("pre") === null && isStandaloneCodeBlock(element)) {
      state.codeBlockCount += 1;
      return `\n\n${formatCodeBlockFromElement(element)}\n\n`;
    }

    if (tag === "code" && element.closest("pre") === null) {
      return formatInlineCode(element.textContent || "");
    }

    if (tag === "strong" || tag === "b") {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `**${text}**` : "";
    }

    if (tag === "em" || tag === "i") {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `_${text}_` : "";
    }

    if (tag === "s" || tag === "del") {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `~~${text}~~` : "";
    }

    const cssInlineFormat = getCssInlineMarkdownFormat(element);

    if (cssInlineFormat) {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? wrapSerializedInlineMarkdown(text, cssInlineFormat) : "";
    }

    if (tag === "hr") {
      return "\n\n---\n\n";
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `\n\n${"#".repeat(level)} ${text}\n\n` : "";
    }

    if (tag === "p") {
      const text = cleanMarkdown(await serializeNodeChildren(element, state));
      return text ? `\n\n${text}\n\n` : "";
    }

    if (tag === "ul") {
      return `\n${await serializeList(element, state, false)}\n`;
    }

    if (tag === "ol") {
      return `\n${await serializeList(element, state, true)}\n`;
    }

    if (tag === "blockquote") {
      const quote = cleanMarkdown(await serializeNodeChildren(element, state));
      return quote ? `\n\n${quote.split("\n").map((line) => `> ${line}`).join("\n")}\n\n` : "";
    }

    if (tag === "table") {
      const table = await serializeTable(element, state);
      return table ? `\n\n${table}\n\n` : "";
    }

    if (tag === "a") {
      const href = element.href;
      const rawLabel = cleanMarkdown(await serializeNodeChildren(element, state)) || href;
      const label = cleanPdfLinkLabel(rawLabel, href);

      if (!href || href === label || href.startsWith("javascript:")) {
        return label;
      }

      return `[${escapeMarkdownLinkLabel(label)}](${href})`;
    }

    const serialized = await serializeNodeChildren(element, state);

    if (isBlockElement(tag)) {
      const text = cleanMarkdown(serialized);
      return text ? `\n\n${text}\n\n` : "";
    }

    return serialized;
  }

  function hasChatGptRangeMarker(element) {
    return Boolean(
      element?.hasAttribute?.("data-start")
      || element?.hasAttribute?.("data-end")
      || element?.hasAttribute?.("data-is-last-node")
      || element?.hasAttribute?.("data-is-only-node")
    );
  }

  function isSemanticMarkdownElementTag(tag) {
    return /^h[1-6]$/.test(tag)
      || [
        "p",
        "pre",
        "code",
        "strong",
        "b",
        "em",
        "i",
        "s",
        "del",
        "hr",
        "ul",
        "ol",
        "blockquote",
        "table",
        "a",
        "img",
        "canvas"
      ].includes(tag);
  }

  function shouldSkipElement(element, state) {
    const tag = element.tagName.toLowerCase();

    if (state?.skipElements?.has(element)) {
      return true;
    }

    if (["script", "style", "noscript", "template", "svg"].includes(tag)) {
      return true;
    }

    if (tag === "button" && !isExpandableContentButton(element) && !hasUsefulImageContent(element) && !hasUsefulFileContent(element)) {
      return true;
    }

    if (!state?.includeHidden && (element.getAttribute("aria-hidden") === "true" || element.hidden)) {
      return true;
    }

    if (element.matches(".sr-only, [data-testid*='copy'], [data-testid*='feedback'], [data-testid*='share'], [data-testid*='toolbar'], [data-testid*='actions']")) {
      return true;
    }

    if (element.matches("[role='button']") && !isExpandableContentButton(element) && !hasUsefulImageContent(element) && !hasUsefulFileContent(element)) {
      return true;
    }

    if (element.matches("[role='menu'], [role='menuitem'], [role='tooltip'], [role='dialog']")) {
      return true;
    }

    if (element.matches("[aria-label*='Copy' i], [aria-label*='Read aloud' i], [aria-label*='Good response' i], [aria-label*='Bad response' i], [aria-label*='Share' i]")) {
      return true;
    }

    return isLikelyCodeToolbar(element);
  }

  function isLikelyCodeToolbar(element) {
    if (element.querySelector("pre") || !element.parentElement?.querySelector("pre")) {
      return false;
    }

    const previousOrNextIsPre = element.previousElementSibling?.matches("pre") || element.nextElementSibling?.matches("pre");

    if (!previousOrNextIsPre) {
      return false;
    }

    const text = getElementText(element).toLowerCase().replace(/\s+/g, " ").trim();

    if (!text || text.length > 80) {
      return false;
    }

    const words = text.split(" ").filter(Boolean);
    return words.every((word) => word === "copy" || word === "code" || KNOWN_LANGUAGES.has(word));
  }

  function hasUsefulImageContent(element) {
    const image = element.querySelector?.("img");

    if (!image) {
      return false;
    }

    if (isLikelyImageAttachmentButton(element)) {
      return true;
    }

    const width = getMediaWidth(image);
    const height = getMediaHeight(image);
    return width >= 80 && height >= 80;
  }

  function isLikelyImageAttachmentButton(element) {
    const label = [
      element.getAttribute?.("aria-label") || "",
      element.getAttribute?.("title") || "",
      element.getAttribute?.("class") || "",
      element.querySelector?.("img")?.getAttribute("alt") || ""
    ].join(" ").toLowerCase();

    return /open image|image|picture|photo|attachment|\u6253\u5f00\u56fe\u7247|\u56fe\u7247|\u9644\u4ef6/.test(label);
  }

  function hasUsefulFileContent(element) {
    return Boolean(isLikelyFileAttachmentElement(element));
  }

  function isLikelyFileAttachmentElement(element) {
    if (!element?.matches) {
      return false;
    }

    if (element.closest?.("[data-testid*='copy' i], [data-testid*='toolbar' i], [data-testid*='actions' i]")) {
      return false;
    }

    const text = getElementText(element);
    const href = getAttachmentHref(element);
    const signal = [
      text,
      href,
      element.getAttribute("download") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.getAttribute("class") || "",
      element.querySelector?.("[download]")?.getAttribute("download") || ""
    ].join(" ");
    const attachmentName = extractFileName(signal);

    if (!FILE_ATTACHMENT_RE.test(signal)) {
      return false;
    }

    if (!attachmentName) {
      return false;
    }

    const hasAttachmentControl = element.matches("a, button, [role='button'], [download]")
      || Boolean(element.querySelector?.("a, button, [role='button'], [download]"));

    return hasAttachmentControl && isCompactFileAttachmentElement(element, attachmentName);
  }

  function isCompactFileAttachmentElement(element, attachmentName) {
    if (!element?.matches) {
      return false;
    }

    if (isTurnNode(element) || hasRoleOrMessageIdSignal(element)) {
      return false;
    }

    if (element.querySelector?.(".markdown, [class*='markdown'], [class*='prose'], [data-start], [data-end], [data-is-last-node], [data-is-only-node], p, li, blockquote, pre, table")) {
      return false;
    }

    const text = getElementText(element);
    const compactRemainder = text
      .replace(attachmentName, "")
      .replace(FILE_ATTACHMENT_RE, "")
      .replace(/\b(open|download|attachment|attached|uploaded|preview)\b/gi, "")
      .replace(/\u6253\u5f00|\u4e0b\u8f7d|\u9644\u4ef6|\u6587\u4ef6|\u9884\u89c8/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (compactRemainder.length > 36) {
      return false;
    }

    const rect = element.getBoundingClientRect?.();

    if (rect && rect.width && rect.height && (rect.height > 160 || rect.width > 520)) {
      return false;
    }

    return true;
  }

  function formatFileAttachmentMarkdown(element) {
    const href = getAttachmentHref(element);
    const name = sanitizeFileAttachmentName(getAttachmentName(element, href));

    if (!name) {
      return "";
    }

    return `[File: ${escapeMarkdownLinkLabel(name)}]`;
  }

  function getAttachmentHref(element) {
    return element.href
      || element.getAttribute?.("href")
      || element.querySelector?.("a[href]")?.href
      || element.querySelector?.("[href]")?.getAttribute("href")
      || "";
  }

  function getAttachmentName(element, href = "") {
    const download = element.getAttribute?.("download") || element.querySelector?.("[download]")?.getAttribute("download") || "";
    const text = getElementText(element);
    const label = element.getAttribute?.("aria-label") || element.getAttribute?.("title") || "";
    const candidates = [download, text, label, filenameFromUrl(href)];

    for (const candidate of candidates) {
      const name = extractFileName(candidate);

      if (name) {
        return name;
      }
    }

    return "";
  }

  function filenameFromUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      return decodeURIComponent(parsed.pathname.split("/").pop() || "");
    } catch {
      return "";
    }
  }

  function extractFileName(text) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    const match = value.match(FILE_NAME_RE);
    return match?.[0] || "";
  }

  function sanitizeFileAttachmentName(name) {
    return String(name || "").replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function getFileAttachmentExtension(name) {
    const match = String(name || "").match(/\.([a-z0-9]{1,6})$/i);
    return (match?.[1] || "FILE").toUpperCase();
  }

  async function serializeList(listElement, state, ordered) {
    const items = [...listElement.children].filter((child) => child.tagName?.toLowerCase() === "li");
    let number = Number(listElement.getAttribute("start") || 1);
    const lines = [];

    for (const item of items) {
      const text = cleanMarkdown(await serializeNodeChildren(item, state));

      if (!text) {
        continue;
      }

      const prefix = ordered ? `${number}. ` : "- ";
      lines.push(`${prefix}${text.replace(/\n/g, "\n  ")}`);
      number += 1;
    }

    return lines.join("\n");
  }

  async function serializeTable(table, state) {
    const rows = [];

    for (const row of table.querySelectorAll("tr")) {
      const cells = [];

      for (const cell of row.querySelectorAll("th,td")) {
        const markdown = cleanMarkdown(await serializeNodeChildren(cell, state));
        cells.push(escapeTableCell(markdown || getElementText(cell)));
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (!rows.length) {
      return "";
    }

    const columnCount = Math.max(...rows.map((row) => row.length));
    const normalizedRows = rows.map((row) => padRow(row, columnCount));
    const [header, ...bodyRows] = normalizedRows;
    const separator = Array.from({ length: columnCount }, () => "---");

    return [
      markdownTableRow(header),
      markdownTableRow(separator),
      ...bodyRows.map(markdownTableRow)
    ].join("\n");
  }

  async function imageElementToMarkdown(image, state) {
    const src = image.currentSrc || image.src || image.getAttribute("src") || "";
    const alt = sanitizeAltText(image.alt || image.getAttribute("aria-label") || `image-${state.imageCount}`);

    if (!src) {
      state.imagesFailed += 1;
      return "";
    }

    state.imagesFailed += 1;
    state.imageEvents?.push({
      type: "img",
      src,
      ok: false,
      skipped: true,
      reason: "base64 embedding disabled during message scan"
    });
    return `![${escapeMarkdownLinkLabel(alt)}](${src})\n\n<!-- Image base64 embedding is temporarily disabled during scanning to avoid page side effects. -->`;
  }

  async function backgroundImageElementToMarkdown(element, state) {
    const src = getBackgroundImageUrl(element);

    if (!src) {
      return "";
    }

    const alt = sanitizeAltText(element.getAttribute("aria-label") || element.getAttribute("title") || "background-image");
    state.imageCount += 1;

    try {
      const dataUri = await imageToDataUriFromSrc(src);
      state.imagesEmbedded += 1;
      state.imageEvents?.push({
        type: "background-image",
        src,
        ok: true
      });
      return `![${escapeMarkdownLinkLabel(alt)}](${dataUri})`;
    } catch (error) {
      state.imagesFailed += 1;
      state.imageEvents?.push({
        type: "background-image",
        src,
        ok: false,
        error: error.message || String(error)
      });
      return `![${escapeMarkdownLinkLabel(alt)}](${src})\n\n<!-- Background image could not be converted to base64: ${escapeHtmlComment(error.message || String(error))} -->`;
    }
  }

  function hasUsefulBackgroundImage(element) {
    if (element.closest("button:not(.group__menu-item):not(.hoverable), [role='button']:not(.group__menu-item):not(.hoverable), nav, aside, header, footer")) {
      return false;
    }

    const src = getBackgroundImageUrl(element);

    if (!src) {
      return false;
    }

    const width = element.clientWidth || Number(element.getAttribute("width")) || 0;
    const height = element.clientHeight || Number(element.getAttribute("height")) || 0;

    return width >= 40 && height >= 40;
  }

  function getBackgroundImageUrl(element) {
    const backgroundImage = window.getComputedStyle(element).backgroundImage || "";
    const match = backgroundImage.match(/url\(["']?(.+?)["']?\)/);

    if (!match?.[1] || match[1].startsWith("data:image/svg")) {
      return "";
    }

    try {
      return new URL(match[1], location.href).href;
    } catch {
      return match[1];
    }
  }

  function canvasElementToMarkdown(canvas, state) {
    const width = canvas.width || canvas.clientWidth;
    const height = canvas.height || canvas.clientHeight;

    if (!width || !height || isLikelyDecorativeMedia(canvas)) {
      return "";
    }

    try {
      state.imageCount += 1;
      state.imagesEmbedded += 1;
      state.imageEvents?.push({
        type: "canvas",
        ok: true
      });
      return `![canvas-${state.imageCount}](${canvas.toDataURL("image/png")})`;
    } catch (error) {
      state.imagesFailed += 1;
      state.imageEvents?.push({
        type: "canvas",
        ok: false,
        error: error.message || String(error)
      });
      return `<!-- Canvas could not be converted to base64: ${escapeHtmlComment(error.message || String(error))} -->`;
    }
  }

  function isLikelyDecorativeImage(image) {
    const imageButton = image.closest("button, [role='button']");

    if (imageButton && isLikelyImageAttachmentButton(imageButton)) {
      return false;
    }

    if (image.closest("button, [role='button'], [role='menuitem'], [data-testid*='avatar' i], [class*='avatar' i]")) {
      return true;
    }

    return isLikelyDecorativeMedia(image);
  }

  function isLikelyDecorativeMedia(element) {
    const width = getMediaWidth(element);
    const height = getMediaHeight(element);
    const alt = "alt" in element ? String(element.alt || "").trim() : "";

    if (alt === "" && width && height && width <= 48 && height <= 48) {
      return true;
    }

    return width && height && width <= 24 && height <= 24;
  }

  function getMediaWidth(element) {
    return Number(element.getAttribute?.("width")) || element.naturalWidth || element.width || element.clientWidth || 0;
  }

  function getMediaHeight(element) {
    return Number(element.getAttribute?.("height")) || element.naturalHeight || element.height || element.clientHeight || 0;
  }

  async function imageToDataUri(image, src) {
    if (src.startsWith("data:")) {
      return src;
    }

    try {
      return await imageToDataUriFromSrc(src);
    } catch (backgroundError) {
      return imageToDataUriWithCanvas(image);
    }
  }

  async function imageToDataUriFromSrc(src) {
    if (src.startsWith("data:")) {
      return src;
    }

    if (IMAGE_DATA_URI_CACHE.has(src)) {
      const cached = IMAGE_DATA_URI_CACHE.get(src);

      if (cached.ok) {
        return cached.dataUri;
      }

      throw new Error(cached.error);
    }

    try {
      const dataUri = await requestImageFromBackground(src);
      IMAGE_DATA_URI_CACHE.set(src, {
        ok: true,
        dataUri
      });
      return dataUri;
    } catch (error) {
      IMAGE_DATA_URI_CACHE.set(src, {
        ok: false,
        error: error.message || String(error)
      });
      throw error;
    }
  }

  function requestImageFromBackground(src) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "FETCH_IMAGE_AS_DATA_URI",
          src,
          pageUrl: location.href
        },
        (response) => {
          const runtimeError = chrome.runtime.lastError;

          if (runtimeError) {
            reject(new Error(runtimeError.message));
            return;
          }

          if (!response?.ok) {
            reject(new Error(response?.error || "Background image fetch failed."));
            return;
          }

          resolve(response.dataUri);
        }
      );
    });
  }

  function imageToDataUriWithCanvas(image) {
    const canvas = document.createElement("canvas");
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) {
      throw new Error("Image dimensions are not available.");
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  }

  function formatCodeBlock(pre) {
    const code = trimTrailingNewlines(extractCodeText(pre));
    const language = detectCodeLanguage(pre);
    const fence = makeFence(code);
    return `${fence}${language}\n${code}\n${fence}`;
  }

  function formatCodeBlockFromElement(codeElement) {
    const code = trimTrailingNewlines(extractCodeText(codeElement));
    const language = detectCodeLanguage(codeElement);
    const fence = makeFence(code);
    return `${fence}${language}\n${code}\n${fence}`;
  }

  function extractCodeText(pre) {
    const codeElement = pre.matches?.("code") ? pre : pre.querySelector("code");

    if (codeElement) {
      return normalizeExtractedCodeText(codeElement.innerText || codeElement.textContent || "");
    }

    const clone = pre.cloneNode(true);

    for (const element of clone.querySelectorAll("button, [role='button'], [data-testid*='copy' i], [data-testid*='toolbar' i]")) {
      element.remove();
    }

    return normalizeExtractedCodeText(pre.innerText || clone.textContent || "");
  }

  function normalizeExtractedCodeText(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ");
  }

  function detectCodeLanguage(pre) {
    const code = pre.matches("code") ? pre : pre.querySelector("code");
    const candidates = [
      code?.getAttribute("data-language"),
      code?.getAttribute("data-highlight-language"),
      code?.getAttribute("data-code-language"),
      pre.getAttribute("data-language"),
      pre.getAttribute("data-highlight-language"),
      pre.getAttribute("data-code-language"),
      getLanguageFromClass(code?.className || ""),
      getLanguageFromClass(pre.className || ""),
      getLanguageFromClass(pre.parentElement?.className || ""),
      getLanguageFromNearbyText(pre)
    ];

    for (const candidate of candidates) {
      const language = normalizeLanguage(candidate);

      if (language) {
        return language;
      }
    }

    return "";
  }

  function getLanguageFromClass(className) {
    const match = String(className).match(/(?:^|\s)(?:language|lang)-([a-z0-9_+#.-]+)/i);
    return match?.[1] || "";
  }

  function getLanguageFromNearbyText(pre) {
    const nearbyText = [
      pre.previousElementSibling?.textContent || "",
      pre.parentElement?.firstElementChild?.textContent || ""
    ].join(" ").toLowerCase();

    for (const language of KNOWN_LANGUAGES) {
      if (new RegExp(`\\b${escapeRegExp(language)}\\b`, "i").test(nearbyText)) {
        return language;
      }
    }

    return "";
  }

  function normalizeLanguage(language) {
    const normalized = String(language || "")
      .trim()
      .toLowerCase()
      .replace(/^language-/, "")
      .replace(/^lang-/, "")
      .replace(/^brush:/, "")
      .replace(/[^a-z0-9_+#.-]/g, "");

    if (!normalized || normalized.length > 30) {
      return "";
    }

    return LANGUAGE_ALIASES.get(normalized) || normalized;
  }

  function isStandaloneCodeBlock(element) {
    const text = element.textContent || "";

    return text.includes("\n") || element.matches("[class*='hljs'], [class*='language-'], [class*='lang-']");
  }

  function formatInlineCode(text) {
    const trimmed = text.trim();

    if (!trimmed) {
      return "";
    }

    const fence = trimmed.includes("`") ? "``" : "`";
    return `${fence}${trimmed}${fence}`;
  }

  function buildMarkdown(metadata, messages) {
    const lines = [
      "---",
      `title: "${escapeYaml(metadata.title)}"`,
      `source: "${escapeYaml(metadata.source)}"`,
      `exported_at: "${metadata.exportedAt.toISOString()}"`,
      `exporter: "ChatGPT Conversation Exporter ${metadata.exporterVersion}"`,
      `message_count: ${metadata.messageCount}`,
      "---",
      "",
      `# ${metadata.title}`,
      "",
      `Exported: ${metadata.exportedAt.toLocaleString()}`,
      "",
      `Source: ${metadata.source}`,
      ""
    ];

    messages.forEach((message, index) => {
      lines.push(`## ${index + 1}. ${formatRole(message.role)}`, "");

      if (message.timestamp) {
        lines.push(`_Time: ${message.timestamp}_`, "");
      }

      if (message.thinkingMarkdown) {
        lines.push("### Thinking", "", message.thinkingMarkdown, "", "### Message", "");
      }

      lines.push(message.markdown || "_No text content found._", "");
    });

    return `${lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim()}\n`;
  }

  function downloadMarkdown(filename, markdown) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    downloadBlob(filename, blob);
  }

  function createDefaultPdfSettings(title, exportedAt = new Date()) {
    const safeTitle = sanitizeFilename(title || "ChatGPT Conversation").slice(0, 80);

    return {
      fileName: `${safeTitle}-${exportedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19)}.pdf`,
      title: title || "ChatGPT Conversation",
      pageFormat: "a4",
      orientation: "portrait",
      margin: "normal",
      colorMode: "light",
      fontScale: 100,
      fontFamily: "default",
      includeTimestamps: true,
      includeThinking: true,
      includeToc: true,
      pageBreakPerMessage: false,
      removePageNumbers: false
    };
  }

  async function downloadPdf(metadata, messages, rawSettings = {}, exportedAt = new Date()) {
    const settings = normalizePdfSettings(rawSettings, metadata, exportedAt);

    await sleep(20);
    const imageMap = await preloadPdfImages(messages);
    const layout = layoutPdfDocument(metadata, messages, settings, imageMap);
    let pdfEngine = "vector-type3-cjk";
    let blob = null;

    try {
      if (!canUseNativeVectorPdf(messages)) {
        throw new Error("Native vector PDF is not available for this message set.");
      }

      blob = buildVectorPdf(layout);
    } catch (error) {
      console.warn("Falling back to raster PDF export.", error);
      pdfEngine = "raster-vector-fallback";
      blob = buildRasterPdf(renderPdfPages(layout));
    }

    downloadBlob(settings.fileName, blob);

    return {
      filename: settings.fileName,
      pageCount: layout.pages.length,
      pdfEngine
    };
  }

  function canUseNativeVectorPdf(messages) {
    return Array.isArray(messages) && messages.length > 0;
  }

  async function preloadPdfImages(messages) {
    const urls = uniquePdfImageUrls(messages).slice(0, PDF_IMAGE_PRELOAD_LIMIT);
    const imageMap = new Map();

    for (const url of urls) {
      try {
        imageMap.set(url, await loadPdfImageInfo(url));
      } catch {
        // Keep PDF export resilient: failed previews still render as image attachment placeholders.
      }
    }

    return imageMap;
  }

  function uniquePdfImageUrls(messages) {
    return [...new Set(messages.flatMap((message) => [
      ...extractPdfMarkdownImages(message.markdown).map((image) => image.url),
      ...extractPdfMarkdownImages(message.thinkingMarkdown).map((image) => image.url)
    ]).filter(Boolean))];
  }

  async function loadPdfImageInfo(url) {
    const dataUri = String(url || "").startsWith("data:image/")
      ? url
      : await imageToDataUriFromSrc(url);
    const image = await loadPdfImageElement(dataUri);

    return {
      dataUri,
      image,
      width: image.naturalWidth || image.width || 1,
      height: image.naturalHeight || image.height || 1
    };
  }

  function loadPdfImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("PDF image preview failed to load."));
      image.src = src;
    });
  }

  function normalizePdfSettings(rawSettings, metadata, exportedAt) {
    const defaults = createDefaultPdfSettings(metadata.title, exportedAt);
    const title = String(rawSettings.title || defaults.title).replace(/\s+/g, " ").trim() || defaults.title;
    const fontScale = Math.max(80, Math.min(130, Number(rawSettings.fontScale || defaults.fontScale) || defaults.fontScale));
    const fileName = normalizePdfFilename(rawSettings.fileName, title, exportedAt);

    return {
      ...defaults,
      ...rawSettings,
      fileName,
      title,
      pageFormat: rawSettings.pageFormat === "letter" ? "letter" : "a4",
      orientation: rawSettings.orientation === "landscape" ? "landscape" : "portrait",
      margin: ["narrow", "normal", "wide"].includes(rawSettings.margin) ? rawSettings.margin : "normal",
      colorMode: rawSettings.colorMode === "dark" ? "dark" : "light",
      fontScale,
      fontFamily: ["default", "serif", "mono"].includes(rawSettings.fontFamily) ? rawSettings.fontFamily : "default",
      includeTimestamps: rawSettings.includeTimestamps !== false,
      includeThinking: rawSettings.includeThinking !== false,
      includeToc: rawSettings.includeToc !== false,
      pageBreakPerMessage: rawSettings.pageBreakPerMessage ?? defaults.pageBreakPerMessage,
      removePageNumbers: Boolean(rawSettings.removePageNumbers)
    };
  }

  function normalizePdfFilename(fileName, title, exportedAt) {
    const fallback = makeFilename(title || "chatgpt-conversation", exportedAt, "pdf");
    const raw = String(fileName || "").trim();

    if (!raw) {
      return fallback;
    }

    const withoutExtension = raw.replace(/\.pdf$/i, "");
    const safe = sanitizeFilename(withoutExtension).slice(0, 120);
    return `${safe || sanitizeFilename(title || "chatgpt-conversation")}.pdf`;
  }

  function layoutPdfDocument(metadata, messages, settings, imageMap = new Map()) {
    const pageSize = getPdfPageSize(settings);
    const theme = getPdfTheme(settings.colorMode);
    const margin = getPdfMargin(settings.margin);
    const fontScale = settings.fontScale / 100;
    const bodyFamily = getPdfFontFamily(settings.fontFamily);
    const monoFamily = '"Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace';
    const styles = {
      title: createPdfTextStyle(bodyFamily, 22 * fontScale, 760, 28 * fontScale, theme.title),
      section: createPdfTextStyle(bodyFamily, 12.5 * fontScale, 740, 17 * fontScale, theme.title),
      body: createPdfTextStyle(bodyFamily, 9.8 * fontScale, 400, 14.4 * fontScale, theme.text),
      meta: createPdfTextStyle(bodyFamily, 7.8 * fontScale, 400, 11.5 * fontScale, theme.muted),
      tocTitle: createPdfTextStyle(bodyFamily, 10.8 * fontScale, 760, 15 * fontScale, theme.title),
      toc: createPdfTextStyle(bodyFamily, 8.4 * fontScale, 400, 12.3 * fontScale, theme.text),
      quote: createPdfTextStyle(bodyFamily, 9.4 * fontScale, 400, 13.8 * fontScale, theme.text),
      code: createPdfTextStyle(monoFamily, 8.2 * fontScale, 400, 12.2 * fontScale, theme.codeText),
      codeLabel: createPdfTextStyle(monoFamily, 6.9 * fontScale, 760, 10.5 * fontScale, theme.codeLabel),
      link: createPdfTextStyle(bodyFamily, 8.5 * fontScale, 400, 12.8 * fontScale, theme.link),
      label: createPdfTextStyle(bodyFamily, 7.6 * fontScale, 760, 10.8 * fontScale, theme.muted),
      messageHeader: createPdfTextStyle(bodyFamily, 8.3 * fontScale, 760, 12 * fontScale, theme.title)
    };
    const measurer = document.createElement("canvas").getContext("2d");
    const contentLeft = margin;
    const contentWidth = pageSize.width - margin * 2;
    const headerHeight = 28;
    const footerHeight = settings.removePageNumbers ? 12 : 24;
    const contentTop = margin + headerHeight;
    const contentBottom = pageSize.height - margin - footerHeight;
    const pages = [];
    const tocOps = [];
    const messageEntries = [];
    const imageDetailRefs = [];
    let page = null;
    let cursorY = 0;
    let activeCard = null;
    let activeMessageEntry = null;
    let detachedFrame = null;

    startNewPage();
    addDocumentHeader();

    if (settings.includeToc && messages.length > 1) {
      addTableOfContents();
      startNewPage();
    }

    messages.forEach((message, index) => {
      if (settings.pageBreakPerMessage && (index > 0 || cursorY > contentTop + 48)) {
        startNewPage();
      }

      const entry = {
        index,
        role: formatPdfRole(message.role),
        pageNumber: 0,
        thinkingPageNumber: 0,
        imagePageNumber: 0,
        filePageNumber: 0
      };
      messageEntries.push(entry);
      Object.assign(entry, addMessageCard(message, index, entry));
    });

    appendImageDetailPages();

    for (const op of tocOps) {
      const entry = messageEntries[op.index];
      const pageNumber = getTocTargetPageNumber(op, entry);
      op.pageNumber = pageNumber || 1;
      op.targetPageIndex = Math.max(0, op.pageNumber - 1);
      op.role = entry?.role || "Message";
    }

    return {
      pages,
      pageSize,
      margin,
      contentLeft,
      contentWidth,
      contentTop,
      contentBottom,
      metadata,
      settings,
      styles,
      theme,
      messageEntries
    };

    function appendImageDetailPages() {
      if (!imageDetailRefs.length) {
        return;
      }

      const previousPage = page;
      const previousCursorY = cursorY;

      for (const detail of imageDetailRefs) {
        page = {
          backgrounds: [],
          ops: []
        };
        pages.push(page);
        detail.pageIndex = pages.length - 1;

        const titleHeight = styles.section.lineHeight + styles.meta.lineHeight + 12;
        const maxImageWidth = contentWidth;
        const maxImageHeight = Math.max(120, contentBottom - contentTop - titleHeight);
        const scale = Math.min(
          maxImageWidth / Math.max(1, detail.imageInfo.width),
          maxImageHeight / Math.max(1, detail.imageInfo.height)
        );
        const drawWidth = Math.max(80, detail.imageInfo.width * scale);
        const drawHeight = Math.max(70, detail.imageInfo.height * scale);
        const x = contentLeft + (contentWidth - drawWidth) / 2;
        const y = contentTop + titleHeight;

        page.ops.push({
          type: "text",
          text: "Image preview",
          x: contentLeft,
          y: contentTop,
          width: contentWidth,
          style: styles.section,
          background: "",
          borderColor: "",
          url: "",
          underline: false,
          paddingX: 0
        });
        page.ops.push({
          type: "text",
          text: detail.alt || "Embedded image",
          x: contentLeft,
          y: contentTop + styles.section.lineHeight,
          width: contentWidth,
          style: styles.meta,
          background: "",
          borderColor: "",
          url: "",
          underline: false,
          paddingX: 0
        });
        page.backgrounds.push({
          type: "panel",
          x: x - 7,
          y: y - 7,
          width: drawWidth + 14,
          height: drawHeight + 14,
          radius: 9,
          fill: theme.imagePreviewBg,
          border: theme.imageBorder
        });
        page.ops.push({
          type: "image",
          image: detail.imageInfo.image,
          alt: detail.alt || "image",
          x,
          y,
          width: drawWidth,
          height: drawHeight,
          radius: 6
        });
      }

      page = previousPage;
      cursorY = previousCursorY;
    }

    function getTocTargetPageNumber(op, entry) {
      if (op.targetKind === "thinking") {
        return entry?.thinkingPageNumber || entry?.pageNumber;
      }

      if (op.targetKind === "image") {
        return entry?.imagePageNumber || entry?.pageNumber;
      }

      if (op.targetKind === "file") {
        return entry?.filePageNumber || entry?.pageNumber;
      }

      return entry?.pageNumber;
    }

    function addDocumentHeader() {
      const boxX = contentLeft;
      const boxY = cursorY;
      const boxHeight = 86;
      page.backgrounds.push({
        type: "panel",
        x: boxX,
        y: boxY,
        width: contentWidth,
        height: boxHeight,
        radius: 10,
        fill: theme.headerBg,
        border: theme.headerBorder,
        accentColor: theme.headerAccent,
        accentSide: "top"
      });

      cursorY = boxY + 14;
      addText(settings.title, styles.title, {
        x: boxX + 16,
        width: contentWidth - 32,
        bottomGap: 3,
        fullWidth: true
      });
      addText(`Exported ${metadata.exportedAt.toLocaleString()}  |  ${messages.length} messages  |  ChatGPT conversation`, styles.meta, {
        x: boxX + 16,
        width: contentWidth - 32,
        fullWidth: true
      });
      addText(`Source: ${metadata.source}`, styles.link, {
        x: boxX + 16,
        width: contentWidth - 32,
        url: metadata.source,
        fullWidth: true
      });

      cursorY = boxY + boxHeight + 14;
    }

    function addTableOfContents() {
      const tocRows = buildPdfTocRows(messages, settings);
      const rowHeight = styles.toc.lineHeight;
      const boxPad = 12;
      const columnGap = 14;
      let rowIndex = 0;
      let sectionIndex = 0;

      while (rowIndex < tocRows.length) {
        if (cursorY > contentTop && contentBottom - cursorY < 120) {
          startNewPage();
        }

        const availableHeight = Math.max(120, contentBottom - cursorY - 14);
        const columns = tocRows.length - rowIndex > 14 && contentWidth > 420 ? 2 : 1;
        const titleHeight = styles.tocTitle.lineHeight + 4;
        const chromeHeight = 10 + titleHeight + boxPad;
        const rowsPerColumn = Math.max(1, Math.floor((availableHeight - chromeHeight) / rowHeight));
        const capacity = Math.max(1, rowsPerColumn * columns);
        const pageRows = tocRows.slice(rowIndex, rowIndex + capacity);
        const actualRowsPerColumn = Math.ceil(pageRows.length / columns);
        const boxHeight = 10 + titleHeight + actualRowsPerColumn * rowHeight + boxPad;
        const boxX = contentLeft;
        const boxY = cursorY;
        const columnWidth = (contentWidth - boxPad * 2 - columnGap * (columns - 1)) / columns;

        page.backgrounds.push({
          type: "panel",
          x: boxX,
          y: boxY,
          width: contentWidth,
          height: boxHeight,
          radius: 8,
          fill: theme.panelBg,
          border: theme.panelBorder
        });

        cursorY = boxY + 10;
        addText(sectionIndex === 0 ? "Contents" : "Contents (continued)", styles.tocTitle, {
          x: boxX + boxPad,
          width: contentWidth - boxPad * 2,
          fullWidth: true,
          bottomGap: 4
        });

        const listTop = cursorY;

        pageRows.forEach((rowData, index) => {
          const column = Math.floor(index / actualRowsPerColumn);
          const row = index % actualRowsPerColumn;
          const op = {
            type: "toc",
            index: rowData.messageIndex,
            targetKind: rowData.kind,
            label: rowData.label,
            marker: rowData.marker,
            x: boxX + boxPad + column * (columnWidth + columnGap),
            y: listTop + row * rowHeight,
            width: columnWidth,
            style: styles.toc
          };
          page.ops.push(op);
          tocOps.push(op);
        });

        rowIndex += pageRows.length;
        sectionIndex += 1;
        cursorY = boxY + boxHeight + 14;

        if (rowIndex < tocRows.length) {
          startNewPage();
        }
      }
    }

    function addMessageCard(message, index, entry) {
      if (message.role === "user") {
        return addUserTurn(message, index, entry);
      }

      return addAssistantTurn(message, index, entry);
    }

    function addUserTurn(message, index, entry) {
      const roleTheme = getPdfRoleTheme(message.role, theme);
      const cardWidth = Math.min(contentWidth * 0.74, 390);
      const cardX = contentLeft + contentWidth - cardWidth;
      const blocks = parsePdfMarkdownBlocks(message.markdown || "_No text content found._");
      const attachmentBlocks = blocks.filter((block) => block.type === "image" || block.type === "file");
      const bodyBlocks = blocks.filter((block) => block.type !== "image" && block.type !== "file");

      ensureSpace(54);
      const startPageNumber = pages.length;
      activeMessageEntry = entry;
      addUserIcon(cardX + cardWidth - 17, roleTheme.accent);
      addGap(4);

      if (attachmentBlocks.length) {
        withDetachedFrame({
          x: cardX,
          width: cardWidth,
          align: "right"
        }, () => addMarkdownBlocks(attachmentBlocks));
      }

      if (bodyBlocks.length) {
        beginMessageCard(roleTheme, cardX, cardWidth);
        addMarkdownBlocks(bodyBlocks);
        endMessageCard();
      }

      if (settings.includeTimestamps && message.timestamp) {
        addText(message.timestamp, styles.meta, {
          x: cardX,
          width: cardWidth,
          align: "right",
          bottomGap: 2
        });
      }

      activeMessageEntry = null;
      addGap(10);
      return {
        pageNumber: startPageNumber,
        thinkingPageNumber: 0,
        imagePageNumber: entry?.imagePageNumber || 0,
        filePageNumber: entry?.filePageNumber || 0
      };
    }

    function addUserIcon(x, color) {
      const size = 16;
      ensureSpace(size + 2);
      page.ops.push({
        type: "userIcon",
        x,
        y: cursorY,
        size,
        strokeColor: color || theme.userAccent
      });
      cursorY += size + 2;
    }

    function addAssistantTurn(message, index, entry) {
      ensureSpace(40);
      const startPageNumber = pages.length;
      let thinkingPageNumber = 0;
      activeMessageEntry = entry;
      addAssistantIcon(contentLeft, theme.title);

      if (settings.includeThinking && message.thinkingMarkdown) {
        thinkingPageNumber = addThinkingBlock(message.thinkingMarkdown);
      }

      addMarkdownContent(message.markdown || "_No text content found._");

      if (settings.includeTimestamps && message.timestamp) {
        addText(message.timestamp, styles.meta, {
          x: contentLeft,
          width: contentWidth,
          bottomGap: 4
        });
      }

      activeMessageEntry = null;
      addGap(14);
      return {
        pageNumber: startPageNumber,
        thinkingPageNumber,
        imagePageNumber: entry?.imagePageNumber || 0,
        filePageNumber: entry?.filePageNumber || 0
      };
    }

    function addAssistantIcon(x, color) {
      const size = 18;
      ensureSpace(size + 6);
      page.ops.push({
        type: "assistantIcon",
        x,
        y: cursorY,
        size,
        strokeColor: color || theme.title
      });
      cursorY += size + 6;
    }

    function startNewPage() {
      const continuingCard = activeCard;

      if (continuingCard) {
        finalizeMessageCardSegment(contentBottom);
      }

      page = {
        backgrounds: [],
        ops: []
      };
      pages.push(page);
      cursorY = contentTop;

      if (continuingCard) {
        activeCard = continuingCard;
        startMessageCardSegment(cursorY);
        cursorY += activeCard.paddingTop;
      }
    }

    function beginMessageCard(roleTheme, x, width) {
      activeCard = {
        ...roleTheme,
        x,
        width,
        paddingX: 13,
        paddingTop: 10,
        paddingBottom: 10,
        segmentPage: null,
        segmentY: 0
      };
      startMessageCardSegment(cursorY);
      cursorY += activeCard.paddingTop;
    }

    function startMessageCardSegment(y) {
      if (!activeCard) {
        return;
      }

      activeCard.segmentPage = page;
      activeCard.segmentY = y;
    }

    function finalizeMessageCardSegment(endY = cursorY) {
      if (!activeCard?.segmentPage) {
        return;
      }

      const y = activeCard.segmentY;
      const height = Math.max(26, endY - y);
      activeCard.segmentPage.backgrounds.push({
        type: "card",
        x: activeCard.x,
        y,
        width: activeCard.width,
        height,
        radius: 9,
        fill: activeCard.fill,
        border: activeCard.border,
        accentColor: activeCard.accent,
        accentSide: activeCard.accentSide
      });
      activeCard.segmentPage = null;
    }

    function endMessageCard() {
      if (!activeCard) {
        return;
      }

      if (cursorY + activeCard.paddingBottom > contentBottom) {
        finalizeMessageCardSegment(contentBottom);
        activeCard = null;
        cursorY = contentBottom;
        return;
      }

      cursorY += activeCard.paddingBottom;
      finalizeMessageCardSegment(cursorY);
      activeCard = null;
    }

    function ensureSpace(height) {
      if (cursorY + height > contentBottom && cursorY > contentTop) {
        startNewPage();
      }
    }

    function addGap(size) {
      if (cursorY > contentTop) {
        cursorY = Math.min(contentBottom, cursorY + size);
      }
    }

    function addText(text, style, options = {}) {
      const value = String(text || "").trim();

      if (!value) {
        return;
      }

      if (options.topGap) {
        addGap(options.topGap);
      }

      const frame = getPdfTextFrame(options);
      const styleWithColor = options.color ? { ...style, color: options.color } : style;
      const lines = wrapPdfText(measurer, value, frame.width, styleWithColor, Boolean(options.preserveWhitespace));

      if (options.keepWithNext) {
        ensureSpace(Math.min(contentBottom - contentTop, styleWithColor.lineHeight * Math.min(lines.length + 1, 3)));
      }

      for (const line of lines) {
        addLine(line, styleWithColor, {
          x: frame.x,
          width: frame.width,
          align: options.align || "left",
          background: options.background,
          borderColor: options.borderColor,
          url: options.url,
          underline: options.underline,
          paddingX: options.paddingX || 0
        });
      }

      if (options.bottomGap) {
        addGap(options.bottomGap);
      }
    }

    function addRichText(text, style, options = {}) {
      addRichSegments(parsePdfInlineSegments(text), style, options);
    }

    function addRichSegments(segments, style, options = {}) {
      const inlineSegments = normalizePdfInlineSegments(segments);

      if (!inlineSegments.length) {
        return;
      }

      if (options.topGap) {
        addGap(options.topGap);
      }

      const frame = getPdfTextFrame(options);
      const styleWithColor = options.color ? { ...style, color: options.color } : style;
      const lines = wrapPdfRichSegments(measurer, inlineSegments, frame.width, styleWithColor, styles.code);

      if (options.keepWithNext) {
        ensureSpace(Math.min(contentBottom - contentTop, styleWithColor.lineHeight * Math.min(lines.length + 1, 3)));
      }

      for (const line of lines) {
        ensureSpace(styleWithColor.lineHeight);
        page.ops.push({
          type: "richText",
          segments: line.segments,
          x: frame.x,
          y: cursorY,
          width: frame.width,
          lineWidth: line.width,
          style: styleWithColor,
          codeStyle: styles.code,
          align: options.align || "left",
          background: options.background || "",
          borderColor: options.borderColor || "",
          paddingX: options.paddingX || 0,
          linkChipBg: theme.linkChipBg,
          linkChipBorder: theme.linkChipBorder,
          linkChipText: theme.linkChipText
        });
        cursorY += styleWithColor.lineHeight;
      }

      if (options.bottomGap) {
        addGap(options.bottomGap);
      }
    }

    function getPdfTextFrame(options = {}) {
      if (Number.isFinite(options.x) && Number.isFinite(options.width)) {
        return {
          x: options.x + (options.indent || 0),
          width: Math.max(24, options.width - (options.indent || 0))
        };
      }

      if (detachedFrame && !options.fullWidth) {
        const indent = options.indent || 0;
        return {
          x: detachedFrame.x + indent,
          width: Math.max(24, detachedFrame.width - indent)
        };
      }

      if (activeCard && !options.fullWidth) {
        const indent = options.indent || 0;
        return {
          x: activeCard.x + activeCard.paddingX + indent,
          width: Math.max(24, activeCard.width - activeCard.paddingX * 2 - indent)
        };
      }

      return {
        x: contentLeft + (options.indent || 0),
        width: Math.max(24, contentWidth - (options.indent || 0))
      };
    }

    function withDetachedFrame(frame, callback) {
      const previousFrame = detachedFrame;
      detachedFrame = frame;

      try {
        callback();
      } finally {
        detachedFrame = previousFrame;
      }
    }

    function isCurrentFrameRightAligned() {
      return activeCard?.accentSide === "right" || detachedFrame?.align === "right";
    }

    function addLine(text, style, options = {}) {
      ensureSpace(style.lineHeight);
      page.ops.push({
        type: "text",
        text,
        x: options.x ?? contentLeft,
        y: cursorY,
        width: options.width ?? contentWidth,
        style,
        align: options.align || "left",
        background: options.background || "",
        borderColor: options.borderColor || "",
        url: options.url || "",
        underline: Boolean(options.underline || options.url),
        paddingX: options.paddingX || 0
      });
      cursorY += style.lineHeight;
    }

    function addMarkdownContent(markdown) {
      addMarkdownBlocks(parsePdfMarkdownBlocks(markdown));
    }

    function addMarkdownBlocks(blocks) {
      for (const block of blocks) {
        addMarkdownBlock(block);
      }
    }

    function addMarkdownBlock(block) {
      if (block.type === "heading") {
        addRichText(block.text, styles.section, { topGap: 3, bottomGap: 2 });
      } else if (block.type === "quote") {
        addQuoteBlock(block.text);
      } else if (block.type === "list") {
        const items = block.items || [];
        ensureSpace(styles.body.lineHeight * Math.min(Math.max(items.length, 1), 3) + 5);

        for (const item of items) {
          addRichSegments([
            {
              text: `${item.marker} `,
              bold: true
            },
            ...parsePdfInlineSegments(item.text)
          ], styles.body, {
            indent: 9,
            keepWithNext: true
          });
        }
        addGap(3);
      } else if (block.type === "code") {
        addCodeBlock(block.language, block.code);
      } else if (block.type === "table") {
        addTableBlock(block.raw);
      } else if (block.type === "image") {
        addImageLink(block.alt, block.url);
      } else if (block.type === "file") {
        addFileAttachmentBlock(block.name);
      } else {
        addRichText(block.text, styles.body, { bottomGap: 3 });
      }
    }

    function addQuoteBlock(text, options = {}) {
      const parts = splitPdfQuoteParagraphs(text)
        .map((line) => line.trim())
        .filter(Boolean);
      const quoteOptions = {
        indent: options.indent ?? 8,
        borderColor: options.borderColor || theme.quoteBorder,
        background: options.background || theme.quoteBg,
        paddingX: options.paddingX ?? 8,
        bottomGap: options.bottomGap ?? 3
      };

      if (!parts.length) {
        return;
      }

      const quoteStyle = {
        ...styles.quote,
        italic: options.italic ?? true
      };
      const frame = getPdfTextFrame({
        indent: quoteOptions.indent
      });
      const textX = frame.x + quoteOptions.paddingX;
      const textWidth = Math.max(24, frame.width - quoteOptions.paddingX * 2);
      const paragraphGap = 3;
      const paddingY = 5;
      const layouts = parts.map((part) => ({
        lines: wrapPdfRichSegments(measurer, parsePdfInlineSegments(part), textWidth, quoteStyle, styles.code)
      }));
      const maxPanelHeight = Math.max(40, contentBottom - contentTop - 8);
      let chunk = [];
      let chunkHeight = paddingY * 2;

      const flushChunk = () => {
        if (!chunk.length) {
          return;
        }

        renderQuotePanel(chunk, chunkHeight, {
          x: frame.x,
          width: frame.width,
          textX,
          textWidth,
          quoteStyle,
          paragraphGap,
          paddingY,
          background: quoteOptions.background,
          borderColor: quoteOptions.borderColor,
          bottomGap: quoteOptions.bottomGap
        });
        chunk = [];
        chunkHeight = paddingY * 2;
      };

      for (const layout of layouts) {
        const height = layout.lines.length * quoteStyle.lineHeight + (chunk.length ? paragraphGap : 0);

        if (chunk.length && chunkHeight + height > maxPanelHeight) {
          flushChunk();
        }

        chunk.push(layout);
        chunkHeight += height;
      }

      flushChunk();
    }

    function splitPdfQuoteParagraphs(text) {
      const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
      const parts = [];
      let current = [];

      for (const line of lines) {
        if (!line.trim()) {
          if (current.length) {
            parts.push(current.join(" "));
            current = [];
          }
          continue;
        }

        current.push(line.trim());
      }

      if (current.length) {
        parts.push(current.join(" "));
      }

      return parts;
    }

    function renderQuotePanel(chunk, height, options) {
      ensureSpace(height);
      const y = cursorY;

      page.backgrounds.push({
        type: "panel",
        x: options.x,
        y,
        width: options.width,
        height,
        radius: 4,
        fill: options.background,
        border: "",
        accentColor: options.borderColor,
        accentSide: "left"
      });

      cursorY += options.paddingY;

      for (let index = 0; index < chunk.length; index += 1) {
        if (index > 0) {
          cursorY += options.paragraphGap;
        }

        for (const line of chunk[index].lines) {
          page.ops.push({
            type: "richText",
            segments: line.segments,
            x: options.textX,
            y: cursorY,
            width: options.textWidth,
            lineWidth: line.width,
            style: options.quoteStyle,
            codeStyle: styles.code,
            align: "left",
            background: "",
            borderColor: "",
            paddingX: 0,
            linkChipBg: theme.linkChipBg,
            linkChipBorder: theme.linkChipBorder,
            linkChipText: theme.linkChipText
          });
          cursorY += options.quoteStyle.lineHeight;
        }
      }

      cursorY = y + height;
      addGap(options.bottomGap);
    }

    function addThinkingBlock(markdown) {
      ensureSpace(styles.label.lineHeight + styles.body.lineHeight * 2);
      const thinkingPageNumber = pages.length;
      beginMessageCard({
        fill: theme.thinkingBg,
        border: theme.thinkingBorder,
        accent: theme.thinkingBorder,
        accentSide: "left"
      }, contentLeft, contentWidth);
      addText("Thinking", styles.label, {
        topGap: 3,
        color: theme.thinkingTitle
      });

      const blocks = parsePdfMarkdownBlocks(markdown);

      for (const block of blocks) {
        addThinkingMarkdownBlock(block);
      }

      endMessageCard();
      addGap(8);
      return thinkingPageNumber;
    }

    function addThinkingMarkdownBlock(block) {
      if (block.type === "heading") {
        addRichText(block.text, styles.label, {
          indent: 8,
          color: theme.thinkingTitle,
          bottomGap: 1
        });
        return;
      }

      if (block.type === "list") {
        const items = block.items || [];

        for (let index = 0; index < items.length; index += 1) {
          addThinkingTimelineItem(parsePdfInlineSegments(items[index].text), index === items.length - 1);
        }
        return;
      }

      if (block.type === "quote") {
        addQuoteBlock(block.text, {
          indent: 8,
          borderColor: theme.thinkingBorder,
          background: theme.thinkingBg,
          paddingX: 6,
          bottomGap: 1
        });
        return;
      }

      if (block.type === "code") {
        addCodeBlock(block.language, block.code, { indent: 8 });
        return;
      }

      const text = block.type === "image"
        ? `Image attachment: ${block.alt || "image"}`
        : block.type === "file"
          ? `File: ${block.name || "Attachment"}`
          : block.text || block.raw || "";

      addRichText(text, styles.body, {
        indent: 8,
        bottomGap: 1
      });
    }

    function addThinkingTimelineItem(content, isLast) {
      const segments = Array.isArray(content) ? normalizePdfInlineSegments(content) : parsePdfInlineSegments(content);
      const { textSegments, chipSegments } = splitThinkingTimelineLinkSegments(segments);
      const value = stripPdfInlineMarkdown([
        textSegments.map((segment) => segment.text).join(" "),
        chipSegments.map((segment) => segment.text).join(" ")
      ].join(" "));

      if (!value) {
        return;
      }

      const frame = getPdfTextFrame({ indent: 8 });
      const railX = frame.x + 3;
      const textX = frame.x + 13;
      const textWidth = Math.max(24, frame.width - 18);
      const textLines = textSegments.length
        ? wrapPdfRichSegments(measurer, textSegments, textWidth, styles.body, styles.code)
        : [];
      const chipLines = chipSegments.length
        ? wrapPdfRichSegments(measurer, chipSegments, textWidth, styles.meta, styles.code)
        : [];
      const textHeight = textLines.length * styles.body.lineHeight;
      const chipHeight = chipLines.length ? 2 + chipLines.length * styles.meta.lineHeight : 0;
      const height = Math.max(styles.body.lineHeight, textHeight + chipHeight);

      ensureSpace(height + 3);
      page.ops.push({
        type: "thinkingRail",
        x: railX,
        y: cursorY,
        height: height + (isLast ? 0 : 5),
        dotRadius: 2.2,
        lineColor: theme.thinkingBorder,
        dotColor: theme.thinkingTitle
      });

      for (const line of textLines) {
        page.ops.push({
          type: "richText",
          segments: line.segments,
          x: textX,
          y: cursorY,
          width: textWidth,
          lineWidth: line.width,
          style: styles.body,
          codeStyle: styles.code,
          align: "left",
          background: "",
          borderColor: "",
          paddingX: 0,
          linkChipBg: theme.linkChipBg,
          linkChipBorder: theme.linkChipBorder,
          linkChipText: theme.linkChipText
        });
        cursorY += styles.body.lineHeight;
      }

      if (chipLines.length) {
        if (textLines.length) {
          cursorY += 1.5;
        }

        for (const line of chipLines) {
          page.ops.push({
            type: "richText",
            segments: line.segments,
            x: textX,
            y: cursorY,
            width: textWidth,
            lineWidth: line.width,
            style: styles.meta,
            codeStyle: styles.code,
            align: "left",
            background: "",
            borderColor: "",
            paddingX: 0,
            linkChipBg: theme.linkChipBg,
            linkChipBorder: theme.linkChipBorder,
            linkChipText: theme.linkChipText
          });
          cursorY += styles.meta.lineHeight;
        }
      }

      addGap(2);
    }

    function splitThinkingTimelineLinkSegments(segments) {
      const textSegments = [];
      const chips = [];
      const seen = new Set();

      for (const segment of segments || []) {
        if (isPdfLinkChipSegment(segment)) {
          const label = cleanPdfLinkLabel(segment.text, segment.url);
          const key = `${segment.url}|${label}`;

          if (label && !seen.has(key)) {
            chips.push({
              ...segment,
              text: label,
              bold: false,
              italic: false
            });
            seen.add(key);
          }
          continue;
        }

        const text = String(segment?.text || "")
          .replace(/再显示\s*\d+\s*个/g, "")
          .replace(/\s+-\s+(?=\s*$)/g, " ")
          .replace(/\s{2,}/g, " ");

        if (text.trim()) {
          textSegments.push({
            ...segment,
            text
          });
        }
      }

      return {
        textSegments: normalizePdfInlineSegments(textSegments),
        chipSegments: interspersePdfSpaceSegments(chips)
      };
    }

    function interspersePdfSpaceSegments(segments) {
      const result = [];

      for (const segment of segments || []) {
        if (result.length) {
          result.push({ text: " " });
        }

        result.push(segment);
      }

      return result;
    }

    function addCodeBlock(language, code, options = {}) {
      const frame = getPdfTextFrame({ indent: options.indent || 0 });
      const codeX = frame.x + 7;
      const codeWidth = Math.max(40, frame.width - 14);
      const languageLabel = language ? String(language).toUpperCase() : "";
      const lines = String(code || "").replace(/\t/g, "  ").split("\n");

      addGap(4);
      if (languageLabel) {
        addLine(languageLabel, styles.codeLabel, {
          x: codeX,
          width: codeWidth,
          background: theme.codeHeaderBg,
          paddingX: 8
        });
      }

      for (const rawLine of lines) {
        const segments = highlightPdfCodeLine(rawLine || " ", language, theme);
        const wrapped = wrapPdfCodeSegments(measurer, segments, codeWidth, styles.code, styles.code);

        for (const line of wrapped) {
          ensureSpace(styles.code.lineHeight);
          page.ops.push({
            type: "richText",
            segments: line.segments,
            width: codeWidth,
            x: codeX,
            y: cursorY,
            lineWidth: line.width,
            style: styles.code,
            codeStyle: styles.code,
            align: "left",
            background: theme.codeBg,
            paddingX: 8,
            linkChipBg: theme.linkChipBg,
            linkChipBorder: theme.linkChipBorder,
            linkChipText: theme.linkChipText
          });
          cursorY += styles.code.lineHeight;
        }
      }
      addGap(6);
    }

    function addTableBlock(raw) {
      const table = parsePdfMarkdownTable(raw);

      if (!table || !table.rows.length) {
        addCodeBlock("", raw);
        return;
      }

      const frame = getPdfTextFrame({ indent: 0 });
      const columnCount = table.columnCount;
      const columnWidths = getPdfTableColumnWidths(columnCount, frame.width);
      const paddingX = 7;
      const paddingY = 5;
      const lineHeight = styles.body.lineHeight;
      const rows = [
        {
          cells: table.headers,
          header: true
        },
        ...table.rows.map((cells) => ({
          cells,
          header: false
        }))
      ];

      addGap(5);

      for (const row of rows) {
        const cellLines = row.cells.map((cell, columnIndex) => {
          const style = row.header
            ? { ...styles.body, weight: 760, color: theme.title }
            : styles.body;
          const textWidth = Math.max(16, columnWidths[columnIndex] - paddingX * 2);
          const segments = parsePdfInlineSegments(cell || " ");
          const lines = wrapPdfRichSegments(measurer, segments.length ? segments : [{ text: " " }], textWidth, style, styles.code);
          return {
            style,
            lines: lines.length ? lines : [{ segments: [{ text: " " }], width: 0 }],
            textWidth
          };
        });
        const rowHeight = Math.max(
          lineHeight + paddingY * 2,
          ...cellLines.map((cell) => cell.lines.length * lineHeight + paddingY * 2)
        );

        ensureSpace(rowHeight);
        const rowY = cursorY;
        let cellX = frame.x;

        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          const width = columnWidths[columnIndex];
          const fill = row.header ? theme.codeHeaderBg : theme.page;
          const border = theme.rule;
          page.backgrounds.push({
            type: "panel",
            x: cellX,
            y: rowY,
            width,
            height: rowHeight,
            radius: 0,
            fill,
            border
          });

          const cell = cellLines[columnIndex];
          let lineY = rowY + paddingY;

          for (const line of cell.lines) {
            page.ops.push({
              type: "richText",
              segments: line.segments,
              x: cellX + paddingX,
              y: lineY,
              width: cell.textWidth,
              lineWidth: line.width,
              style: cell.style,
              codeStyle: styles.code,
              align: "left",
              background: "",
              borderColor: "",
              paddingX: 0,
              linkChipBg: theme.linkChipBg,
              linkChipBorder: theme.linkChipBorder,
              linkChipText: theme.linkChipText
            });
            lineY += lineHeight;
          }

          cellX += width;
        }

        cursorY = rowY + rowHeight;
      }

      addGap(7);
    }

    function addImageLink(alt, url) {
      const imageInfo = imageMap.get(url);

      if (imageInfo) {
        addImagePreview(alt, url, imageInfo);
        return;
      }

      addImagePlaceholder(alt, url);
    }

    function addImagePlaceholder(alt, url) {
      const frame = getPdfTextFrame({ indent: 0 });
      const width = Math.min(frame.width, activeCard ? frame.width : 220);
      const height = Math.min(155, Math.max(112, width * 0.62));

      ensureSpace(height + 7);
      if (activeMessageEntry && !activeMessageEntry.imagePageNumber) {
        activeMessageEntry.imagePageNumber = pages.length;
      }

      const x = isCurrentFrameRightAligned() ? frame.x + frame.width - width : frame.x;
      const y = cursorY;

      page.backgrounds.push({
        type: "panel",
        x,
        y,
        width,
        height,
        radius: 8,
        fill: theme.imagePreviewBg,
        border: theme.imageBorder
      });
      page.ops.push({
        type: "imagePlaceholder",
        alt: alt || "image",
        x,
        y,
        width,
        height,
        style: styles.body,
        iconColor: theme.imageBorder,
        textColor: theme.imageTitle,
        mutedColor: theme.muted
      });

      cursorY = y + height + 7;
    }

    function addImagePreview(alt, url, imageInfo) {
      const frame = getPdfTextFrame({ indent: 0 });
      const maxWidth = Math.min(frame.width, activeCard ? frame.width : contentWidth * 0.62);
      const maxHeight = activeCard ? 270 : 330;
      const scale = Math.min(maxWidth / Math.max(1, imageInfo.width), maxHeight / Math.max(1, imageInfo.height));
      const drawWidth = Math.max(80, imageInfo.width * scale);
      const drawHeight = Math.max(70, imageInfo.height * scale);
      const outerHeight = drawHeight + 14;
      const detailRef = {
        imageInfo,
        alt: alt || "image",
        pageIndex: NaN
      };

      ensureSpace(outerHeight);

      if (activeMessageEntry && !activeMessageEntry.imagePageNumber) {
        activeMessageEntry.imagePageNumber = pages.length;
      }

      imageDetailRefs.push(detailRef);
      const x = isCurrentFrameRightAligned() ? frame.x + frame.width - drawWidth : frame.x;
      const y = cursorY;
      page.backgrounds.push({
        type: "panel",
        x,
        y,
        width: drawWidth,
        height: outerHeight,
        radius: 8,
        fill: theme.imagePreviewBg,
        border: theme.imageBorder
      });
      page.ops.push({
        type: "image",
        image: imageInfo.image,
        alt: alt || "image",
        detailRef,
        x: x + 7,
        y: y + 7,
        width: drawWidth - 14,
        height: drawHeight,
        radius: 6
      });

      cursorY = y + outerHeight + 6;
    }

    function addFileAttachmentBlock(name) {
      const safeName = sanitizeFileAttachmentName(name) || "Attachment";
      const extension = getFileAttachmentExtension(safeName);
      const frame = getPdfTextFrame({ indent: 0 });
      const height = 36;
      const iconSize = 22;

      measurer.font = getCanvasFont(styles.body);
      const measuredWidth = measurer.measureText(safeName).width;
      const width = Math.min(frame.width, Math.max(142, Math.min(300, measuredWidth + iconSize + 44)));

      ensureSpace(height + 8);

      if (activeMessageEntry && !activeMessageEntry.filePageNumber) {
        activeMessageEntry.filePageNumber = pages.length;
      }

      const x = isCurrentFrameRightAligned()
        ? frame.x + frame.width - width
        : frame.x;
      const y = cursorY;

      page.backgrounds.push({
        type: "panel",
        x,
        y,
        width,
        height,
        radius: 8,
        fill: theme.fileBg,
        border: theme.fileBorder
      });
      page.ops.push({
        type: "file",
        name: safeName,
        extension,
        x,
        y,
        width,
        height,
        iconSize,
        style: styles.body,
        iconBg: theme.fileIconBg,
        iconText: theme.fileIconText,
        textColor: theme.fileText
      });

      cursorY = y + height + 7;
    }
  }

  function createPdfTextStyle(family, size, weight, lineHeight, color) {
    return {
      family,
      size,
      weight,
      lineHeight,
      color
    };
  }

  function getPdfPageSize(settings) {
    const sizes = {
      a4: { width: 595.28, height: 841.89 },
      letter: { width: 612, height: 792 }
    };
    const base = sizes[settings.pageFormat] || sizes.a4;

    if (settings.orientation === "landscape") {
      return {
        width: base.height,
        height: base.width
      };
    }

    return { ...base };
  }

  function getPdfMargin(size) {
    if (size === "narrow") {
      return 36;
    }

    if (size === "wide") {
      return 72;
    }

    return 54;
  }

  function getPdfFontFamily(fontFamily) {
    if (fontFamily === "serif") {
      return 'Georgia, "Times New Roman", "Songti SC", SimSun, serif';
    }

    if (fontFamily === "mono") {
      return '"Cascadia Mono", Consolas, "SFMono-Regular", "Microsoft YaHei", monospace';
    }

    return 'Inter, Arial, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
  }

  function getPdfTheme(colorMode) {
    if (colorMode === "dark") {
      return {
        page: "#111827",
        headerBg: "#172033",
        headerBorder: "#334155",
        headerAccent: "#8b5cf6",
        panelBg: "#172033",
        panelBorder: "#334155",
        title: "#f9fafb",
        text: "#e5e7eb",
        muted: "#9ca3af",
        rule: "#374151",
        link: "#93c5fd",
        linkChipBg: "#243244",
        linkChipBorder: "#334155",
        linkChipText: "#dbeafe",
        quoteBg: "#172033",
        quoteBorder: "#64748b",
        codeBg: "#0f172a",
        codeHeaderBg: "#1e293b",
        codeBorder: "#334155",
        codeLabel: "#cbd5e1",
        codeText: "#e5e7eb",
        codeKeyword: "#c084fc",
        codeString: "#86efac",
        codeNumber: "#fbbf24",
        codeComment: "#94a3b8",
        codeFunction: "#60a5fa",
        codeProperty: "#fcd34d",
        codeOperator: "#cbd5e1",
        thinkingBg: "#1f2937",
        thinkingBorder: "#8b5cf6",
        thinkingTitle: "#ddd6fe",
        imageBg: "#172033",
        imagePreviewBg: "#0f172a",
        imageBorder: "#38bdf8",
        imageTitle: "#bae6fd",
        fileBg: "#172033",
        fileBorder: "#334155",
        fileIconBg: "#ef4444",
        fileIconText: "#ffffff",
        fileText: "#e5e7eb",
        fileMuted: "#9ca3af",
        userCardBg: "#1f2937",
        userCardBorder: "#374151",
        userAccent: "#9ca3af",
        assistantCardBg: "#172033",
        assistantCardBorder: "#334155",
        assistantAccent: "#93c5fd"
      };
    }

    return {
      page: "#ffffff",
      headerBg: "#f7fafc",
      headerBorder: "#d9e2ec",
      headerAccent: "#10a37f",
      panelBg: "#fbfdff",
      panelBorder: "#d9e2ec",
      title: "#111827",
      text: "#1f2937",
      muted: "#667085",
      rule: "#d7dde8",
      link: "#1d4ed8",
      linkChipBg: "#eef0f3",
      linkChipBorder: "#e1e5eb",
      linkChipText: "#1f2937",
      quoteBg: "#f8fafc",
      quoteBorder: "#94a3b8",
      codeBg: "#f6f8fb",
      codeHeaderBg: "#e9eef6",
      codeBorder: "#cbd5e1",
      codeLabel: "#475569",
      codeText: "#111827",
      codeKeyword: "#c026d3",
      codeString: "#16a34a",
      codeNumber: "#0ea5e9",
      codeComment: "#64748b",
      codeFunction: "#2563eb",
      codeProperty: "#b45309",
      codeOperator: "#64748b",
      thinkingBg: "#f5f3ff",
      thinkingBorder: "#8b5cf6",
      thinkingTitle: "#5b21b6",
      imageBg: "#f0f9ff",
      imagePreviewBg: "#ffffff",
      imageBorder: "#38bdf8",
      imageTitle: "#075985",
      fileBg: "#ffffff",
      fileBorder: "#d9e2ec",
      fileIconBg: "#ff5c5c",
      fileIconText: "#ffffff",
      fileText: "#111827",
      fileMuted: "#6b7280",
      userCardBg: "#f4f4f5",
      userCardBorder: "#e4e4e7",
      userAccent: "#71717a",
      assistantCardBg: "#f8fafc",
      assistantCardBorder: "#d9e2ec",
      assistantAccent: "#2563eb"
    };
  }

  function getPdfRoleTheme(role, theme) {
    if (role === "user") {
      return {
        fill: theme.userCardBg,
        border: theme.userCardBorder,
        accent: theme.userAccent,
        accentSide: "right"
      };
    }

    return {
      fill: theme.assistantCardBg,
      border: theme.assistantCardBorder,
      accent: theme.assistantAccent,
      accentSide: "left"
    };
  }

  function buildPdfTocRows(messages, settings) {
    const rows = [];

    messages.forEach((message, index) => {
      const images = extractPdfMarkdownImages(message.markdown);
      const files = extractPdfMarkdownFiles(message.markdown);

      if (images.length) {
        rows.push({
          kind: "image",
          marker: "Image",
          messageIndex: index,
          label: `${images[0].alt || "Image"} - ${extractPdfTopicLabel(message.markdown, message.preview)}`
        });
      }

      if (files.length) {
        rows.push({
          kind: "file",
          marker: "File",
          messageIndex: index,
          label: `${files[0].name || "Attachment"} - ${extractPdfTopicLabel(message.markdown, message.preview)}`
        });
      }

      if (settings.includeThinking && message.thinkingMarkdown) {
        rows.push({
          kind: "thinking",
          marker: "Thinking",
          messageIndex: index,
          label: extractPdfTopicLabel(message.thinkingMarkdown, message.preview)
        });
      }

      rows.push({
        kind: "message",
        marker: formatPdfRole(message.role),
        messageIndex: index,
        label: extractPdfTopicLabel(message.markdown, message.preview)
      });
    });

    return rows;
  }

  function formatPdfRole(role) {
    return role === "assistant" ? "ChatGPT" : formatRole(role);
  }

  function extractPdfMarkdownImages(markdown) {
    return [...String(markdown || "").matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)]
      .map((match) => ({
        alt: match[1] || "image",
        url: match[2] || ""
      }));
  }

  function extractPdfMarkdownFiles(markdown) {
    return [...String(markdown || "").matchAll(/\[File:\s*([^\]]+)\](?:\(([^)]*)\))?/gi)]
      .map((match) => ({
        name: sanitizeFileAttachmentName(match[1]) || "Attachment"
      }));
  }

  function extractPdfTopicLabel(markdown, fallback = "") {
    const blocks = parsePdfMarkdownBlocks(markdown);
    const candidates = [];

    for (const block of blocks) {
      if (block.type === "heading") {
        candidates.push(block.text);
      } else if (block.type === "list") {
        candidates.push(...block.items.slice(0, 2).map((item) => item.text));
      } else if (block.type === "quote" || block.type === "paragraph") {
        candidates.push(block.text);
      } else if (block.type === "image") {
        candidates.push(`[Image: ${block.alt || "image"}]`);
      } else if (block.type === "file") {
        candidates.push(`[File: ${block.name || "Attachment"}]`);
      }
    }

    const text = stripPdfInlineMarkdown(candidates.find(Boolean) || fallback || "")
      .replace(/\s+/g, " ")
      .trim();

    return truncatePdfLabel(text || "No preview", 58);
  }

  function truncatePdfLabel(text, maxLength) {
    const value = String(text || "").trim();

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
  }

  function parsePdfMarkdownBlocks(markdown) {
    const lines = normalizePdfMarkdownBlockSource(markdown)
      .replace(/\r\n?/g, "\n")
      .replace(/<!--[\s\S]*?-->/g, "")
      .split("\n");
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
      if (fence) {
        const marker = fence[1];
        const language = normalizeLanguage(fence[2] || "");
        const codeLines = [];
        index += 1;

        while (index < lines.length && !lines[index].trim().startsWith(marker)) {
          codeLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length) {
          index += 1;
        }

        blocks.push({
          type: "code",
          language,
          code: codeLines.join("\n")
        });
        continue;
      }

      const image = line.match(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/);
      if (image && line.replace(image[0], "").trim() === "") {
        blocks.push({
          type: "image",
          alt: image[1] || "image",
          url: image[2]
        });
        index += 1;
        continue;
      }

      const file = line.match(/^\s*\[File:\s*([^\]]+)\](?:\(([^)]*)\))?\s*$/i);
      if (file) {
        blocks.push({
          type: "file",
          name: sanitizeFileAttachmentName(file[1])
        });
        index += 1;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        blocks.push({
          type: "heading",
          level: Math.min(6, heading[1].length),
          text: heading[2]
        });
        index += 1;
        continue;
      }

      if (/^\s*>/.test(line)) {
        const quoteLines = [];

        while (index < lines.length && /^\s*>/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }

        blocks.push({
          type: "quote",
          text: quoteLines.join("\n")
        });
        continue;
      }

      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
        const items = [];

        while (index < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[index])) {
          const item = lines[index].match(/^\s*((?:[-*+])|(?:\d+[.)]))\s+(.+)$/);
          const continuation = [];
          index += 1;

          while (
            index < lines.length
            && lines[index].trim()
            && /^\s{2,}\S/.test(lines[index])
            && !/^\s{0,3}(?:[-*+]|\d+[.)])\s+/.test(lines[index])
          ) {
            continuation.push(lines[index].trim());
            index += 1;
          }

          items.push({
            marker: item?.[1] || "-",
            text: [item?.[2] || line.trim(), ...continuation].join(" ")
          });
        }

        blocks.push({
          type: "list",
          items
        });
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line)) {
        const tableLines = [];

        while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
          tableLines.push(lines[index]);
          index += 1;
        }

        blocks.push({
          type: "table",
          raw: tableLines.join("\n")
        });
        continue;
      }

      const paragraph = [];
      while (
        index < lines.length
        && lines[index].trim()
        && !/^\s*(`{3,}|~{3,})/.test(lines[index])
        && !/^\s*(?:#{1,6}\s+|>|(?:[-*+]|\d+[.)])\s+|\|.*\|\s*$)/.test(lines[index])
      ) {
        paragraph.push(lines[index]);
        index += 1;
      }

      blocks.push({
        type: "paragraph",
        text: paragraph.join(" ")
      });
    }

    return normalizePdfMarkdownBlocks(blocks);
  }

  function normalizePdfMarkdownBlockSource(markdown) {
    return repairLoosePdfMarkdownLinks(String(markdown || ""));
  }

  function normalizePdfMarkdownBlocks(blocks) {
    const normalized = [];
    let index = 0;

    while (index < blocks.length) {
      const letter = tryConvertLetterBlock(blocks, index);

      if (letter) {
        normalized.push(letter.block);
        index = letter.nextIndex;
        continue;
      }

      const converted = tryConvertLooseKeyValueTable(blocks, index);

      if (converted) {
        normalized.push(converted.block);
        index = converted.nextIndex;
        continue;
      }

      normalized.push(blocks[index]);
      index += 1;
    }

    return normalized;
  }

  function tryConvertLetterBlock(blocks, startIndex) {
    const first = blocks[startIndex];

    if (first?.type !== "paragraph" || !isLetterGreeting(first.text)) {
      return null;
    }

    const parts = [String(first.text || "").trim()];
    let index = startIndex + 1;
    let foundClosing = false;

    while (index < blocks.length && parts.length < 10) {
      const block = blocks[index];

      if (block?.type !== "paragraph") {
        break;
      }

      const text = String(block.text || "").trim();

      if (!text || isLikelySectionAfterLetter(text, foundClosing)) {
        break;
      }

      parts.push(text);

      if (isLetterClosing(text)) {
        foundClosing = true;
      } else if (foundClosing && isLikelyShortSignature(text)) {
        index += 1;
        break;
      }

      index += 1;
    }

    if (!foundClosing || parts.length < 3) {
      return null;
    }

    return {
      block: {
        type: "quote",
        text: parts.join("\n\n")
      },
      nextIndex: index
    };
  }

  function isLetterGreeting(text) {
    const value = stripPdfInlineMarkdown(text);
    return /^(kia ora|dear|hi|hello|ng[aā]\s?mihi|to whom it may concern)\b/i.test(value);
  }

  function isLetterClosing(text) {
    const value = stripPdfInlineMarkdown(text);
    return /^(ng[aā]\s?mihi|kind regards|regards|best regards|thanks|thank you|sincerely|cheers),?(\s+\S+)?$/i.test(value);
  }

  function isLikelyShortSignature(text) {
    const value = stripPdfInlineMarkdown(text);
    return value.length > 0 && value.length <= 36 && !/[。！？.!?]/.test(value);
  }

  function isLikelySectionAfterLetter(text, foundClosing) {
    const value = stripPdfInlineMarkdown(text);

    if (!foundClosing) {
      return false;
    }

    return /^(中文|我的|所以|今晚|准备|自我介绍|项目|为什么|注意|建议)/.test(value);
  }

  function tryConvertLooseKeyValueTable(blocks, startIndex) {
    const header = blocks[startIndex];
    const valueHeader = blocks[startIndex + 1];

    if (
      header?.type !== "paragraph"
      || valueHeader?.type !== "paragraph"
      || stripPdfInlineMarkdown(header.text) !== "项目"
      || stripPdfInlineMarkdown(valueHeader.text) !== "情况"
    ) {
      return null;
    }

    const rows = [];
    let index = startIndex + 2;

    while (index < blocks.length) {
      const keyBlock = blocks[index];

      if (!isLooseTableKeyBlock(keyBlock)) {
        break;
      }

      const key = stripPdfInlineMarkdown(keyBlock.text);
      const valueParts = [];
      index += 1;

      while (index < blocks.length && blocks[index]?.type === "paragraph") {
        const text = String(blocks[index].text || "").trim();

        if (valueParts.length && isLooseTableKeyBlock(blocks[index])) {
          break;
        }

        if (valueParts.length && shouldEndLooseTableValue(text, rows, valueParts)) {
          break;
        }

        valueParts.push(text);
        index += 1;
      }

      if (!valueParts.length) {
        break;
      }

      rows.push([key, valueParts.join(" ")]);
    }

    if (rows.length < 2) {
      return null;
    }

    return {
      block: {
        type: "table",
        raw: [
          markdownTableRow(["项目", "情况"]),
          markdownTableRow(["---", "---"]),
          ...rows.map((row) => markdownTableRow(row.map(escapeTableCell)))
        ].join("\n")
      },
      nextIndex: index
    };
  }

  function isLooseTableKeyBlock(block) {
    if (block?.type !== "paragraph") {
      return false;
    }

    const text = stripPdfInlineMarkdown(block.text);

    if (!text || text.length > 18) {
      return false;
    }

    if (/https?:|www\.|NZBN|Registered|Headquartered|Limited|Solutions|Company|LinkedIn/i.test(text)) {
      return false;
    }

    return !/[，,。.；;：:()（）]/.test(text);
  }

  function shouldEndLooseTableValue(text, rows, valueParts) {
    if (rows.length < 2 || valueParts.length < 1) {
      return false;
    }

    return /^(所以|但|不过|我的判断|总结|结论|建议|你收到)/.test(stripPdfInlineMarkdown(text));
  }

  function parsePdfMarkdownTable(raw) {
    const parsedRows = String(raw || "")
      .split(/\r?\n/)
      .map((line) => splitPdfMarkdownTableRow(line))
      .filter((row) => row.length > 0);

    if (!parsedRows.length) {
      return null;
    }

    const hasSeparator = parsedRows.length > 1 && isPdfMarkdownTableSeparatorRow(parsedRows[1]);
    const headers = normalizePdfTableRow(parsedRows[0], Math.max(...parsedRows.map((row) => row.length)));
    const bodyRows = (hasSeparator ? parsedRows.slice(2) : parsedRows.slice(1))
      .map((row) => normalizePdfTableRow(row, headers.length))
      .filter((row) => row.some((cell) => stripPdfInlineMarkdown(cell)));

    return {
      headers,
      rows: bodyRows,
      columnCount: headers.length
    };
  }

  function splitPdfMarkdownTableRow(line) {
    const trimmed = String(line || "").trim();

    if (!/^\|?.*\|.*$/.test(trimmed)) {
      return [];
    }

    const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    const cells = [];
    let current = "";
    let escaped = false;

    for (const char of withoutOuterPipes) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "|") {
        cells.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  function isPdfMarkdownTableSeparatorRow(cells) {
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(String(cell || "").trim()));
  }

  function normalizePdfTableRow(row, length) {
    return Array.from({ length }, (_, index) => String(row[index] || "").trim());
  }

  function getPdfTableColumnWidths(columnCount, width) {
    if (columnCount <= 1) {
      return [width];
    }

    if (columnCount === 2) {
      return [width * 0.32, width * 0.68];
    }

    const first = Math.min(width * 0.26, 110);
    const remaining = Math.max(24, (width - first) / (columnCount - 1));
    return [first, ...Array.from({ length: columnCount - 1 }, () => remaining)];
  }

  function normalizePdfInlineMarkdown(text) {
    return repairLoosePdfMarkdownLinks(String(text || ""))
      .replace(/!\\?\[[^\]\n]*\\?\]\([^)]+\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePdfInlineSegmentSource(text) {
    return repairLoosePdfMarkdownLinks(String(text || ""))
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/\[!\\?\[[^\]\n]*\\?\]\([^)]+\)\s*([^\]]*?)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => formatCleanPdfMarkdownLink(label, url))
      .replace(/!\\?\[[^\]\n]*\\?\]\([^)]+\)/g, "")
      .replace(/\[File:\s*([^\]]+)\](?:\(([^)]*)\))?/gi, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanPdfLinkLabel(label, url = "") {
    const clean = String(label || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/!\\?\[[^\]\n]*\\?\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*\+\d+$/g, "");

    return clean || formatPdfUrlLabel(url || "");
  }

  function formatCleanPdfMarkdownLink(label, url) {
    const cleanLabel = cleanPdfLinkLabel(label, url);
    return cleanLabel ? `[${escapeMarkdownLinkLabel(cleanLabel)}](${url})` : "";
  }

  function repairLoosePdfMarkdownLinks(text) {
    return String(text || "").replace(/(^|[\s(（])([^\s()[\]\n][^()[\]\n]{0,80}?)\]\((https?:\/\/[^)\s]+)\)/g, (match, prefix, label, url) => {
      const cleanLabel = normalizeLoosePdfLinkLabel(label);

      if (!cleanLabel) {
        return match;
      }

      return `${prefix}[${cleanLabel}](${url})`;
    });
  }

  function normalizeLoosePdfLinkLabel(label) {
    let value = String(label || "")
      .replace(/^[\s,，.。:：;；、]+/, "")
      .replace(/[\s,，.。:：;；、]+$/, "")
      .trim();

    const sentenceParts = value.split(/[。；;，,]/);
    value = sentenceParts[sentenceParts.length - 1].trim();

    if (value.length > 48) {
      const words = value.split(/\s+/).filter(Boolean);
      value = words.length > 1 ? words.slice(-4).join(" ") : value.slice(-48);
    }

    return value.replace(/^\[+/, "").trim();
  }

  function stripPdfInlineMarkdown(text) {
    return normalizePdfInlineMarkdown(text)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt) => `Image attachment: ${alt || "image"}`)
      .replace(/\[File:\s*([^\]]+)\]\(([^)]+)\)/gi, "$1")
      .replace(/\[File:\s*([^\]]+)\]/gi, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `${label} (${url})`)
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parsePdfInlineSegments(text, inherited = {}, depth = 0) {
    const source = normalizePdfInlineSegmentSource(text);

    if (!source) {
      return [];
    }

    if (depth > 4) {
      return [{ text: stripPdfInlineMarkdown(source), ...inherited }];
    }

    const segments = [];
    let index = 0;
    let plain = "";

    const flushPlain = () => {
      if (plain) {
        segments.push({ text: plain, ...inherited });
        plain = "";
      }
    };

    while (index < source.length) {
      const rest = source.slice(index);

      if (rest.startsWith("`")) {
        const end = source.indexOf("`", index + 1);

        if (end > index + 1) {
          flushPlain();
          segments.push({
            text: source.slice(index + 1, end),
            ...inherited,
            code: true
          });
          index = end + 1;
          continue;
        }
      }

      const boldMarker = rest.startsWith("**") ? "**" : rest.startsWith("__") ? "__" : "";

      if (boldMarker) {
        const end = source.indexOf(boldMarker, index + 2);

        if (end > index + 2) {
          flushPlain();
          segments.push(...parsePdfInlineSegments(source.slice(index + 2, end), {
            ...inherited,
            bold: true
          }, depth + 1));
          index = end + 2;
          continue;
        }
      }

      const italicMarker = rest.startsWith("*") ? "*" : rest.startsWith("_") ? "_" : "";

      if (italicMarker && !rest.startsWith("**") && !rest.startsWith("__")) {
        const end = source.indexOf(italicMarker, index + 1);

        if (end > index + 1 && isLikelyPdfItalicDelimiter(source, index, end)) {
          flushPlain();
          segments.push(...parsePdfInlineSegments(source.slice(index + 1, end), {
            ...inherited,
            italic: true
          }, depth + 1));
          index = end + 1;
          continue;
        }
      }

      if (rest.startsWith("~~")) {
        const end = source.indexOf("~~", index + 2);

        if (end > index + 2) {
          flushPlain();
          segments.push(...parsePdfInlineSegments(source.slice(index + 2, end), inherited, depth + 1));
          index = end + 2;
          continue;
        }
      }

      if (rest.startsWith("[")) {
        const closeLabel = source.indexOf("]", index + 1);
        const openUrl = closeLabel >= 0 ? source.indexOf("(", closeLabel) : -1;
        const closeUrl = openUrl === closeLabel + 1 ? source.indexOf(")", openUrl + 1) : -1;

        if (closeLabel > index + 1 && openUrl === closeLabel + 1 && closeUrl > openUrl + 1) {
          flushPlain();
          const url = source.slice(openUrl + 1, closeUrl);
          segments.push(...parsePdfInlineSegments(source.slice(index + 1, closeLabel), {
            ...inherited,
            url
          }, depth + 1));
          index = closeUrl + 1;
          continue;
        }
      }

      const bareUrl = rest.match(/^https?:\/\/[^\s)]+/i);

      if (bareUrl) {
        flushPlain();
        const url = stripPdfUrlTrailingPunctuation(bareUrl[0]);
        segments.push({
          text: formatPdfUrlLabel(url),
          ...inherited,
          url
        });
        index += url.length;
        continue;
      }

      const bareDomain = rest.match(/^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s)\]]*)?/i);

      if (bareDomain && source[index - 1] !== "@") {
        flushPlain();
        const domain = stripPdfUrlTrailingPunctuation(bareDomain[0]);
        const url = `https://${domain}`;
        segments.push({
          text: formatPdfUrlLabel(url),
          ...inherited,
          url
        });
        index += domain.length;
        continue;
      }

      plain += source[index];
      index += 1;
    }

    flushPlain();
    return normalizePdfInlineSegments(segments);
  }

  function isLikelyPdfItalicDelimiter(source, start, end) {
    const before = source[start - 1] || "";
    const afterStart = source[start + 1] || "";
    const beforeEnd = source[end - 1] || "";
    const after = source[end + 1] || "";

    if (/\s/.test(afterStart) || /\s/.test(beforeEnd)) {
      return false;
    }

    if (/[A-Za-z0-9]/.test(before) && /[A-Za-z0-9]/.test(afterStart)) {
      return false;
    }

    if (/[A-Za-z0-9]/.test(beforeEnd) && /[A-Za-z0-9]/.test(after)) {
      return false;
    }

    return true;
  }

  function stripPdfUrlTrailingPunctuation(value) {
    return String(value || "").replace(/[.,;:!?，。；：！？]+$/g, "");
  }

  function formatPdfUrlLabel(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, "");
      const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : "";
      const label = `${host}${path && path.length <= 18 ? path : ""}`;
      return label || url;
    } catch {
      return url;
    }
  }

  function normalizePdfInlineSegments(segments) {
    const normalized = [];

    for (const segment of segments || []) {
      const text = String(segment?.text || "");

      if (!text) {
        continue;
      }

      const item = {
        text,
        bold: Boolean(segment.bold),
        italic: Boolean(segment.italic),
        code: Boolean(segment.code),
        url: segment.url || "",
        color: segment.color || "",
        weight: segment.weight || null
      };
      const previous = normalized[normalized.length - 1];

      if (
        previous
        && previous.bold === item.bold
        && previous.italic === item.italic
        && previous.code === item.code
        && previous.url === item.url
        && previous.color === item.color
        && previous.weight === item.weight
      ) {
        previous.text += item.text;
      } else {
        normalized.push(item);
      }
    }

    return normalized;
  }

  function compactPdfUrl(url) {
    const value = String(url || "").trim();

    if (!value) {
      return "";
    }

    try {
      const parsed = new URL(value, location.href);
      const path = parsed.pathname.length > 34 ? `${parsed.pathname.slice(0, 31)}...` : parsed.pathname;
      return `${parsed.hostname}${path}`;
    } catch {
      return value.length > 48 ? `${value.slice(0, 45)}...` : value;
    }
  }

  function wrapPdfText(context, text, maxWidth, style, preserveWhitespace = false) {
    context.font = getCanvasFont(style);
    const value = String(text || "");
    const sourceLines = preserveWhitespace
      ? value.replace(/\t/g, "  ").split("\n")
      : value.replace(/[ \t]+/g, " ").split(/\n+/);
    const result = [];

    for (const sourceLine of sourceLines) {
      const wrapped = wrapPdfLine(context, sourceLine, maxWidth, preserveWhitespace);
      result.push(...(wrapped.length ? wrapped : [""]));
    }

    return result.length ? result : [""];
  }

  function wrapPdfRichSegments(context, segments, maxWidth, baseStyle, codeStyle) {
    const tokens = [];

    for (const segment of normalizePdfInlineSegments(segments)) {
      const segmentTokens = tokenizePdfText(segment.text);

      for (const token of segmentTokens) {
        tokens.push({
          ...segment,
          text: token
        });
      }
    }

    const lines = [];
    let current = [];
    let currentWidth = 0;

    const pushLine = () => {
      trimPdfRichLine(current);
      const width = measurePdfRichLine(context, current, baseStyle, codeStyle);
      lines.push({
        segments: mergePdfRichLineSegments(current),
        width
      });
      current = [];
      currentWidth = 0;
    };

    for (const token of tokens) {
      if (token.text === " " && !current.length) {
        continue;
      }

      const tokenWidth = measurePdfRichSegment(context, token, baseStyle, codeStyle);

      if (current.length && currentWidth + tokenWidth > maxWidth) {
        pushLine();

        if (token.text === " ") {
          continue;
        }
      }

      if (!current.length && tokenWidth > maxWidth && token.text.length > 1) {
        const pieces = breakLongPdfRichToken(context, token, maxWidth, baseStyle, codeStyle);

        for (const piece of pieces.slice(0, -1)) {
          lines.push({
            segments: [piece],
            width: measurePdfRichSegment(context, piece, baseStyle, codeStyle)
          });
        }

        const last = pieces[pieces.length - 1];
        current.push(last);
        currentWidth = measurePdfRichSegment(context, last, baseStyle, codeStyle);
        continue;
      }

      current.push(token);
      currentWidth += tokenWidth;
    }

    if (current.length || !lines.length) {
      pushLine();
    }

    return lines;
  }

  function wrapPdfCodeSegments(context, segments, maxWidth, baseStyle, codeStyle) {
    const tokens = [];

    for (const segment of segments || []) {
      const text = String(segment?.text || "");
      const parts = text.match(/[ \t]+|[^ \t]+/g) || [text || " "];

      for (const part of parts) {
        tokens.push({
          ...segment,
          text: part
        });
      }
    }

    const lines = [];
    let current = [];
    let currentWidth = 0;

    const pushLine = () => {
      const width = measurePdfRichLine(context, current, baseStyle, codeStyle);
      lines.push({
        segments: mergePdfRichLineSegments(current.length ? current : [{ text: " " }]),
        width
      });
      current = [];
      currentWidth = 0;
    };

    for (const token of tokens.length ? tokens : [{ text: " " }]) {
      const tokenWidth = measurePdfRichSegment(context, token, baseStyle, codeStyle);

      if (current.length && currentWidth + tokenWidth > maxWidth) {
        pushLine();
      }

      if (!current.length && tokenWidth > maxWidth && token.text.length > 1) {
        const pieces = breakLongPdfRichToken(context, token, maxWidth, baseStyle, codeStyle);

        for (const piece of pieces.slice(0, -1)) {
          lines.push({
            segments: [piece],
            width: measurePdfRichSegment(context, piece, baseStyle, codeStyle)
          });
        }

        const last = pieces[pieces.length - 1];
        current.push(last);
        currentWidth = measurePdfRichSegment(context, last, baseStyle, codeStyle);
        continue;
      }

      current.push(token);
      currentWidth += tokenWidth;
    }

    if (current.length || !lines.length) {
      pushLine();
    }

    return lines;
  }

  function highlightPdfCodeLine(line, language, theme) {
    const source = String(line || " ");
    const lang = normalizeLanguage(language || "");

    if (/^(html|xml|svg|vue|svelte)$/.test(lang)) {
      return highlightPdfMarkupLine(source, theme);
    }

    const segments = [];
    let index = 0;

    const push = (text, color = "", weight = null) => {
      if (!text) {
        return;
      }

      segments.push({ text, color, weight });
    };

    while (index < source.length) {
      const rest = source.slice(index);
      const whitespace = rest.match(/^\s+/);

      if (whitespace) {
        push(whitespace[0]);
        index += whitespace[0].length;
        continue;
      }

      if (rest.startsWith("//") || (/^(python|py|bash|sh|shell|ruby|rb|r)$/.test(lang) && rest.startsWith("#"))) {
        push(rest, theme.codeComment);
        break;
      }

      if (rest.startsWith("/*")) {
        const end = rest.indexOf("*/", 2);
        const value = end >= 0 ? rest.slice(0, end + 2) : rest;
        push(value, theme.codeComment);
        index += value.length;
        continue;
      }

      const string = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/);

      if (string) {
        push(string[0], theme.codeString);
        index += string[0].length;
        continue;
      }

      const number = rest.match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?)(?:[eE][+-]?\d+)?\b/i);

      if (number) {
        push(number[0], theme.codeNumber);
        index += number[0].length;
        continue;
      }

      const identifier = rest.match(/^[A-Za-z_$][\w$-]*/);

      if (identifier) {
        const word = identifier[0];
        const before = source.slice(0, index).replace(/\s+$/g, "");
        const after = source.slice(index + word.length);
        const nextNonSpace = after.match(/^\s*(.)/)?.[1] || "";

        if (isPdfCodeKeyword(word, lang)) {
          push(word, theme.codeKeyword, 620);
        } else if (nextNonSpace === "(") {
          push(word, theme.codeFunction);
        } else if (before.endsWith(".") || nextNonSpace === ":") {
          push(word, theme.codeProperty);
        } else {
          push(word);
        }

        index += word.length;
        continue;
      }

      const operator = rest.match(/^(=>|===|!==|==|!=|<=|>=|\+\+|--|\|\||&&|[{}()[\].,;:+\-*/%<>=!?:|&^~])/);

      if (operator) {
        push(operator[0], theme.codeOperator);
        index += operator[0].length;
        continue;
      }

      push(source[index]);
      index += 1;
    }

    return mergePdfRichLineSegments(segments);
  }

  function highlightPdfMarkupLine(line, theme) {
    const segments = [];
    const pattern = /(<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*?>)/g;
    let index = 0;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > index) {
        segments.push({ text: line.slice(index, match.index) });
      }

      const token = match[0];

      if (token.startsWith("<!--")) {
        segments.push({ text: token, color: theme.codeComment });
      } else {
        const pieces = token.match(/(<\/?|\/?>|\s+|[A-Za-z_:][-A-Za-z0-9_:.]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|=|[^\s]+)/g) || [token];

        for (const piece of pieces) {
          if (/^<\/?|\/?>$/.test(piece)) {
            segments.push({ text: piece, color: theme.codeOperator });
          } else if (/^["']/.test(piece)) {
            segments.push({ text: piece, color: theme.codeString });
          } else if (piece === "=") {
            segments.push({ text: piece, color: theme.codeOperator });
          } else if (/^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(piece)) {
            segments.push({ text: piece, color: theme.codeKeyword });
          } else {
            segments.push({ text: piece });
          }
        }
      }

      index = match.index + token.length;
    }

    if (index < line.length) {
      segments.push({ text: line.slice(index) });
    }

    return segments.length ? mergePdfRichLineSegments(segments) : [{ text: " " }];
  }

  function isPdfCodeKeyword(word, language) {
    const lower = String(word || "").toLowerCase();
    const common = new Set([
      "abstract", "as", "async", "await", "boolean", "break", "case", "catch", "class", "const",
      "continue", "declare", "def", "default", "del", "do", "elif", "else", "enum", "except",
      "export", "extends", "false", "final", "finally", "for", "from", "function", "global", "if",
      "implements", "import", "in", "instanceof", "int", "interface", "lambda", "let", "module",
      "namespace", "new", "none", "null", "of", "package", "pass", "private", "protected", "public",
      "raise", "readonly", "require", "return", "static", "string", "super", "switch", "this",
      "throw", "trait", "true", "try", "type", "typeof", "undefined", "use", "using", "var", "void",
      "while", "with", "yield"
    ]);

    if (common.has(lower)) {
      return true;
    }

    if (/^(css|scss|sass|less)$/.test(language)) {
      return [
        "important", "media", "keyframes", "supports", "charset", "container", "font-face", "import",
        "layer", "page", "property", "scope"
      ].includes(lower);
    }

    return false;
  }

  function trimPdfRichLine(line) {
    while (line.length && line[0].text === " ") {
      line.shift();
    }

    while (line.length && line[line.length - 1].text === " ") {
      line.pop();
    }
  }

  function mergePdfRichLineSegments(line) {
    const merged = [];

    for (const segment of line) {
      const previous = merged[merged.length - 1];

      if (
        previous
        && previous.bold === segment.bold
        && previous.italic === segment.italic
        && previous.code === segment.code
        && previous.url === segment.url
        && previous.color === segment.color
        && previous.weight === segment.weight
      ) {
        previous.text += segment.text;
      } else {
        merged.push({ ...segment });
      }
    }

    return merged;
  }

  function measurePdfRichLine(context, line, baseStyle, codeStyle) {
    return line.reduce((width, segment) => width + measurePdfRichSegment(context, segment, baseStyle, codeStyle), 0);
  }

  function measurePdfRichSegment(context, segment, baseStyle, codeStyle) {
    context.font = getCanvasFont(getPdfInlineSegmentStyle(segment, baseStyle, codeStyle));
    const textWidth = context.measureText(segment.text || "").width;
    return isPdfLinkChipSegment(segment) ? textWidth + PDF_LINK_CHIP_PADDING_X * 2 : textWidth;
  }

  function isPdfLinkChipSegment(segment) {
    const url = String(segment?.url || "");
    return Boolean(url && !url.startsWith("data:") && url.length < 2000 && !segment?.code);
  }

  function breakLongPdfRichToken(context, token, maxWidth, baseStyle, codeStyle) {
    const pieces = [];
    let current = "";

    for (const char of Array.from(token.text || "")) {
      const next = current + char;
      const candidate = {
        ...token,
        text: next
      };

      if (current && measurePdfRichSegment(context, candidate, baseStyle, codeStyle) > maxWidth) {
        pieces.push({
          ...token,
          text: current
        });
        current = char;
      } else {
        current = next;
      }
    }

    if (current || !pieces.length) {
      pieces.push({
        ...token,
        text: current
      });
    }

    return pieces;
  }

  function wrapPdfLine(context, line, maxWidth, preserveWhitespace) {
    const tokens = preserveWhitespace ? Array.from(line || " ") : tokenizePdfText(line);
    const lines = [];
    let current = "";

    for (const token of tokens) {
      if (!preserveWhitespace && token === " " && !current) {
        continue;
      }

      const next = current + token;

      if (current && context.measureText(next).width > maxWidth) {
        lines.push(preserveWhitespace ? current.replace(/\s+$/g, "") : current.trimEnd());
        current = preserveWhitespace ? token : token.trimStart();
        continue;
      }

      if (!current && context.measureText(token).width > maxWidth) {
        const pieces = breakLongPdfToken(context, token, maxWidth);
        lines.push(...pieces.slice(0, -1));
        current = pieces[pieces.length - 1] || "";
        continue;
      }

      current = next;
    }

    if (current || !lines.length) {
      lines.push(preserveWhitespace ? current.replace(/\s+$/g, "") : current.trimEnd());
    }

    return lines;
  }

  function tokenizePdfText(text) {
    const chars = Array.from(String(text || ""));
    const tokens = [];
    let buffer = "";

    for (const char of chars) {
      if (/\s/.test(char)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(" ");
      } else if (isCjkPdfChar(char)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(char);
      } else {
        buffer += char;
      }
    }

    if (buffer) {
      tokens.push(buffer);
    }

    return tokens;
  }

  function isCjkPdfChar(char) {
    return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(char);
  }

  function breakLongPdfToken(context, token, maxWidth) {
    const pieces = [];
    let current = "";

    for (const char of Array.from(token)) {
      const next = current + char;

      if (current && context.measureText(next).width > maxWidth) {
        pieces.push(current);
        current = char;
      } else {
        current = next;
      }
    }

    if (current || !pieces.length) {
      pieces.push(current);
    }

    return pieces;
  }

  function buildVectorPdf(layout) {
    const chunks = [];
    const offsets = [];
    const objects = new Map();
    const imageResources = new Map();
    const type3FontGroups = new Map();
    const type3FontChunks = [];
    const measurer = document.createElement("canvas").getContext("2d");
    let byteOffset = 0;
    let nextObjectId = 1;
    const catalogId = nextObjectId++;
    const pagesId = nextObjectId++;
    const fontBaseId = nextObjectId++;
    const fontBaseBoldId = nextObjectId++;
    const fontMonoId = nextObjectId++;
    const fontMonoBoldId = nextObjectId++;
    const pageRefs = layout.pages.map(() => ({
      pageId: nextObjectId++,
      contentId: nextObjectId++,
      annotIds: []
    }));
    const preparedPages = layout.pages.map((page, pageIndex) => prepareVectorPage(page, pageIndex));

    for (const page of preparedPages) {
      pageRefs[page.pageIndex].annotIds = page.links.map(() => nextObjectId++);
    }

    addObject(catalogId, [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);
    addObject(pagesId, [`<< /Type /Pages /Count ${layout.pages.length} /Kids [${pageRefs.map((ref) => `${ref.pageId} 0 R`).join(" ")}] >>`]);
    addObject(fontBaseId, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]);
    addObject(fontBaseBoldId, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]);
    addObject(fontMonoId, ["<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>"]);
    addObject(fontMonoBoldId, ["<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>"]);

    for (const font of type3FontChunks) {
      addType3FontObjects(font);
    }

    for (const image of imageResources.values()) {
      addObject(image.id, [
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
        image.bytes,
        "\nendstream"
      ]);
    }

    for (const prepared of preparedPages) {
      const ref = pageRefs[prepared.pageIndex];
      const annotRefs = ref.annotIds.map((id) => `${id} 0 R`).join(" ");
      const annots = annotRefs ? ` /Annots [${annotRefs}]` : "";
      const xObjectEntries = prepared.imageNames
        .map((name) => `/${name} ${[...imageResources.values()].find((image) => image.name === name)?.id || 0} 0 R`)
        .join(" ");
      const xObjects = xObjectEntries ? ` /XObject << ${xObjectEntries} >>` : "";
      const type3Fonts = type3FontChunks.map((font) => `/${font.name} ${font.fontId} 0 R`).join(" ");
      const type3FontResources = type3Fonts ? ` ${type3Fonts}` : "";

      addStreamObject(ref.contentId, prepared.content);

      prepared.links.forEach((link, linkIndex) => {
        const id = ref.annotIds[linkIndex];
        const rect = [
          formatPdfNumber(link.x),
          formatPdfNumber(layout.pageSize.height - link.y - link.height),
          formatPdfNumber(link.x + link.width),
          formatPdfNumber(layout.pageSize.height - link.y)
        ].join(" ");
        const destinationIndex = Number.isFinite(link.pageIndex)
          ? Math.max(0, Math.min(pageRefs.length - 1, link.pageIndex))
          : -1;
        const destinationRef = destinationIndex >= 0 ? pageRefs[destinationIndex] : null;

        if (destinationRef) {
          addObject(id, [
            `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /Dest [${destinationRef.pageId} 0 R /Fit] >>`
          ]);
          return;
        }

        addObject(id, [
          `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url || "")}) >> >>`
        ]);
      });

      addObject(ref.pageId, [
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${formatPdfNumber(layout.pageSize.width)} ${formatPdfNumber(layout.pageSize.height)}] /Resources << /Font << /FBase ${fontBaseId} 0 R /FBaseB ${fontBaseBoldId} 0 R /FMono ${fontMonoId} 0 R /FMonoB ${fontMonoBoldId} 0 R${type3FontResources} >>${xObjects} >> /Contents ${ref.contentId} 0 R${annots} >>`
      ]);
    }

    const maxObjectId = Math.max(...objects.keys());
    appendString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    for (let id = 1; id <= maxObjectId; id += 1) {
      const objectParts = objects.get(id);
      if (!objectParts) {
        continue;
      }

      offsets[id] = byteOffset;
      appendString(`${id} 0 obj\n`);

      for (const part of objectParts) {
        if (typeof part === "string") {
          appendString(part);
        } else {
          appendBytes(part);
        }
      }

      appendString("\nendobj\n");
    }

    const xrefOffset = byteOffset;
    appendString(`xref\n0 ${maxObjectId + 1}\n`);
    appendString("0000000000 65535 f \n");

    for (let id = 1; id <= maxObjectId; id += 1) {
      appendString(`${String(offsets[id] || 0).padStart(10, "0")} 00000 n \n`);
    }

    appendString(`trailer\n<< /Size ${maxObjectId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return new Blob(chunks, { type: "application/pdf" });

    function prepareVectorPage(page, pageIndex) {
      const commands = [];
      const links = [];
      const imageNames = new Set();

      for (const background of getOrderedPdfBackgrounds(page.backgrounds || [])) {
        drawVectorBackground(background);
      }

      for (const op of page.ops || []) {
        if (op.type === "toc") {
          drawVectorTocRow(op);
        } else if (op.type === "image") {
          drawVectorImage(op);
        } else if (op.type === "imagePlaceholder") {
          drawVectorImagePlaceholder(op);
        } else if (op.type === "file") {
          drawVectorFile(op);
        } else if (op.type === "userIcon") {
          drawVectorUserIcon(op);
        } else if (op.type === "assistantIcon") {
          drawVectorAssistantIcon(op);
        } else if (op.type === "thinkingRail") {
          drawVectorThinkingRail(op);
        } else if (op.type === "richText") {
          drawVectorRichText(op);
        } else {
          drawVectorText(op);
        }
      }

      drawVectorHeaderFooter(pageIndex);

      return {
        pageIndex,
        content: commands.join("\n"),
        links,
        imageNames: [...imageNames]
      };

      function add(command) {
        if (command) {
          commands.push(command);
        }
      }

      function toPdfY(y, height = 0) {
        return layout.pageSize.height - y - height;
      }

      function drawVectorBackground(op) {
        drawVectorRect(op.x, op.y, op.width, op.height, {
          fill: op.fill || "#ffffff",
          stroke: op.border || "",
          radius: op.radius || 0,
          lineWidth: op.type === "card" ? 0.8 : 0.7
        });

        if (op.accentColor) {
          if (op.accentSide === "right") {
            drawVectorRect(op.x + op.width - 3, op.y + 7, 3, Math.max(0, op.height - 14), { fill: op.accentColor });
          } else if (op.accentSide === "top") {
            drawVectorRect(op.x + 10, op.y, Math.max(0, op.width - 20), 3, { fill: op.accentColor });
          } else {
            drawVectorRect(op.x, op.y + 7, 3, Math.max(0, op.height - 14), { fill: op.accentColor });
          }
        }
      }

      function drawVectorText(op) {
        const style = op.style || layout.styles.body;
        const lineHeight = style.lineHeight || style.size * 1.25;
        const paddingX = op.paddingX || 0;

        if (op.background) {
          drawVectorRect(op.x - paddingX, op.y, op.width + paddingX * 2, lineHeight, { fill: op.background });
        }

        if (op.borderColor) {
          drawVectorRect(op.x - paddingX, op.y, 2.5, lineHeight, { fill: op.borderColor });
        }

        let drawX = op.x;
        const textWidth = measurePlainPdfText(op.text || "", style);

        if (op.align === "right") {
          drawX = op.x + Math.max(0, op.width - textWidth);
        } else if (op.align === "center") {
          drawX = op.x + Math.max(0, (op.width - textWidth) / 2);
        }

        const textY = op.y + Math.max(0, (lineHeight - style.size) / 2);
        drawVectorTextRun(op.text || "", drawX, textY, style);

        if (op.underline) {
          drawVectorLine(drawX, op.y + lineHeight - 2.2, drawX + Math.min(op.width, textWidth), op.y + lineHeight - 2.2, style.color, 0.6);

          if (op.url && !String(op.url).startsWith("data:") && String(op.url).length < 2000) {
            links.push({
              url: op.url,
              x: drawX,
              y: op.y,
              width: Math.max(12, Math.min(op.width, textWidth)),
              height: lineHeight
            });
          }
        }
      }

      function drawVectorRichText(op) {
        const style = op.style || layout.styles.body;
        const lineHeight = style.lineHeight || style.size * 1.25;
        const paddingX = op.paddingX || 0;

        if (op.background) {
          drawVectorRect(op.x - paddingX, op.y, op.width + paddingX * 2, lineHeight, { fill: op.background });
        }

        if (op.borderColor) {
          drawVectorRect(op.x - paddingX, op.y, 2.5, lineHeight, { fill: op.borderColor });
        }

        let drawX = op.x;

        if (op.align === "right") {
          drawX = op.x + Math.max(0, op.width - (op.lineWidth || 0));
        } else if (op.align === "center") {
          drawX = op.x + Math.max(0, (op.width - (op.lineWidth || 0)) / 2);
        }

        for (const segment of op.segments || []) {
          const segmentStyle = getPdfInlineSegmentStyle(segment, style, op.codeStyle || style);
          const text = segment.text || "";
          const textWidth = measurePdfRichSegment(measurer, segment, style, op.codeStyle || style);
          const isLinkChip = isPdfLinkChipSegment(segment);
          const width = isLinkChip ? textWidth : Math.max(0, textWidth);

          if (isLinkChip) {
            const chipHeight = Math.min(lineHeight - 1.4, Math.max(segmentStyle.size + 4.4, 9));
            const chipY = op.y + Math.max(0, (lineHeight - chipHeight) / 2);
            drawVectorRect(drawX, chipY, width, chipHeight, {
              fill: op.linkChipBg || "#eef0f3",
              stroke: op.linkChipBorder || "#e1e5eb",
              radius: chipHeight / 2,
              lineWidth: 0.45
            });
            drawVectorTextRun(text, drawX + PDF_LINK_CHIP_PADDING_X, chipY + Math.max(0, (chipHeight - segmentStyle.size) / 2) - 0.2, {
              ...segmentStyle,
              color: op.linkChipText || segmentStyle.color
            });
            links.push({
              url: segment.url,
              x: drawX,
              y: chipY,
              width: Math.max(12, width),
              height: chipHeight
            });
            drawX += width;
            continue;
          }

          if (segment.code) {
            drawVectorRect(drawX - 1.5, op.y + 1.6, textWidth + 3, lineHeight - 3.2, {
              fill: op.codeBackground || "#eef2f7",
              radius: 2.5
            });
          }

          const textY = op.y + Math.max(0, (lineHeight - segmentStyle.size) / 2);
          drawVectorTextRun(text, drawX, textY, segmentStyle);

          if (segment.url && !String(segment.url).startsWith("data:") && String(segment.url).length < 2000) {
            drawVectorLine(drawX, op.y + lineHeight - 2.2, drawX + textWidth, op.y + lineHeight - 2.2, segmentStyle.color, 0.6);
            links.push({
              url: segment.url,
              x: drawX,
              y: op.y,
              width: Math.max(12, textWidth),
              height: lineHeight
            });
          }

          drawX += textWidth;
        }
      }

      function drawVectorTocRow(op) {
        const style = op.style || layout.styles.toc;
        const color = getPdfTocColor(op, layout.theme);
        const left = `${op.marker || op.role || "Message"} - ${op.label || ""}`;
        const right = String(op.pageNumber || "");
        const rightWidth = measurePlainPdfText(right, style) + 4;
        const leftWidth = Math.min(measurePlainPdfText(left, style), op.width - rightWidth - 20);

        drawVectorTextRun(left, op.x, op.y, { ...style, color }, { maxWidth: op.width - rightWidth - 16 });
        drawVectorTextRun(right, op.x + op.width - rightWidth, op.y, { ...style, color });
        drawVectorLine(op.x + leftWidth + 8, op.y + style.lineHeight * 0.62, op.x + op.width - rightWidth - 8, op.y + style.lineHeight * 0.62, layout.theme.rule, 0.45, [1, 3]);

        if (Number.isFinite(op.targetPageIndex)) {
          links.push({
            pageIndex: op.targetPageIndex,
            x: op.x,
            y: op.y,
            width: op.width,
            height: style.lineHeight
          });
        }
      }

      function drawVectorImage(op) {
        const resource = registerImageResource(op.image);

        if (!resource) {
          drawVectorImagePlaceholder({
            ...op,
            style: layout.styles.body,
            iconColor: layout.theme.imageBorder,
            textColor: layout.theme.imageTitle,
            mutedColor: layout.theme.muted
          });
          return;
        }

        imageNames.add(resource.name);
        add(`q\n${formatPdfNumber(op.width)} 0 0 ${formatPdfNumber(op.height)} ${formatPdfNumber(op.x)} ${formatPdfNumber(toPdfY(op.y, op.height))} cm\n/${resource.name} Do\nQ`);
      }

      function drawVectorImagePlaceholder(op) {
        const style = op.style || layout.styles.body;
        drawVectorTextRun("Image preview unavailable", op.x + 12, op.y + Math.max(10, op.height / 2 - style.size), {
          ...style,
          color: op.textColor || layout.theme.imageTitle
        });
      }

      function drawVectorFile(op) {
        const iconSize = op.iconSize || 22;
        const iconX = op.x + 10;
        const iconY = op.y + (op.height - iconSize) / 2;
        drawVectorRect(iconX, iconY, iconSize, iconSize, {
          fill: op.iconBg || "#ef4444",
          radius: 4
        });
        drawVectorTextRun(String(op.extension || "FILE").slice(0, 4).toUpperCase(), iconX + 3, iconY + iconSize / 2 - 3.4, {
          ...op.style,
          size: (String(op.extension || "").length > 3 ? 5.1 : 5.8),
          weight: 800,
          color: op.iconText || "#ffffff"
        });
        drawVectorTextRun(op.name || "Attachment", iconX + iconSize + 12, op.y + (op.height - op.style.size) / 2, {
          ...op.style,
          weight: 650,
          color: op.textColor || op.style.color
        });
      }

      function drawVectorUserIcon(op) {
        const size = op.size || 16;
        const cx = op.x + size / 2;
        const cy = op.y + size / 2;
        drawVectorCircle(cx, cy, size / 2 - 0.7, "", op.strokeColor || "#111827", op.lineWidth || 1.05);
        drawVectorCircle(cx, op.y + size * 0.38, size * 0.15, "", op.strokeColor || "#111827", op.lineWidth || 1.05);
        drawVectorArc(cx, op.y + size * 0.84, size * 0.3, Math.PI * 1.14, Math.PI * 1.86, op.strokeColor || "#111827", op.lineWidth || 1.05);
      }

      function drawVectorAssistantIcon(op) {
        const size = op.size || 18;
        drawVectorCircle(op.x + size / 2, op.y + size / 2, size / 2 - 0.8, "", op.strokeColor || "#111827", op.lineWidth || 1.1);
        drawVectorTextRun("AI", op.x + size * 0.27, op.y + size * 0.25, {
          ...layout.styles.meta,
          size: size * 0.34,
          weight: 760,
          color: op.strokeColor || "#111827"
        });
      }

      function drawVectorThinkingRail(op) {
        const x = op.x;
        const y = op.y;
        const dotY = y + 7;
        const lineTop = dotY + (op.dotRadius || 2.2) + 3;
        const lineBottom = y + Math.max(10, op.height || 10);

        if (lineBottom > lineTop + 1) {
          drawVectorLine(x, lineTop, x, lineBottom, op.lineColor || "#8b5cf6", op.lineWidth || 1.2);
        }

        drawVectorCircle(x, dotY, op.dotRadius || 2.2, op.dotColor || op.lineColor || "#8b5cf6");
      }

      function drawVectorHeaderFooter(pageIndex) {
        const headerStyle = layout.styles.meta;
        const y = Math.max(14, layout.margin * 0.55);
        const rightText = layout.metadata.exportedAt.toLocaleString();
        drawVectorTextRun(layout.settings.title, layout.contentLeft, y, headerStyle, { maxWidth: layout.contentWidth * 0.58 });
        drawVectorTextRun(rightText, layout.contentLeft + layout.contentWidth * 0.62, y, headerStyle);
        drawVectorLine(layout.contentLeft, layout.contentTop - 10, layout.contentLeft + layout.contentWidth, layout.contentTop - 10, layout.theme.rule, 0.7);

        if (!layout.settings.removePageNumbers) {
          const footerText = `Page ${pageIndex + 1} / ${layout.pages.length}`;
          const footerY = layout.pageSize.height - Math.max(20, layout.margin * 0.55);
          const footerWidth = measurePlainPdfText(footerText, headerStyle);
          drawVectorTextRun(footerText, layout.contentLeft + (layout.contentWidth - footerWidth) / 2, footerY, headerStyle);
        }
      }

      function drawVectorTextRun(text, x, topY, style, options = {}) {
        let value = String(text || "");

        if (!value) {
          return;
        }

        if (options.maxWidth && measurePlainPdfText(value, style) > options.maxWidth) {
          value = fitPdfTextForWidth(value, options.maxWidth, style);
        }

        const color = style.color || layout.theme.text;
        const y = layout.pageSize.height - (topY + (style.size || 10) * 0.82);
        const runs = getVectorPdfTextRuns(value, style);
        let cursorX = x;

        for (const run of runs) {
          if (!run.encoded || run.width <= 0) {
            continue;
          }

          const textCommand = `BT /${run.fontName} ${formatPdfNumber(style.size || 10)} Tf 1 0 0 1 ${formatPdfNumber(cursorX)} ${formatPdfNumber(y)} Tm ${run.encoded} Tj ET`;
          add(`q\n${pdfFillColor(color)}\n${textCommand}\nQ`);

          if (!run.type3 && (style.weight || 400) >= 650 && run.fontName === "FBase") {
            add(`q\n${pdfFillColor(color)}\nBT /${run.fontName} ${formatPdfNumber(style.size || 10)} Tf 1 0 0 1 ${formatPdfNumber(cursorX + 0.16)} ${formatPdfNumber(y)} Tm ${run.encoded} Tj ET\nQ`);
          }

          cursorX += run.width;
        }
      }

      function drawVectorRect(x, y, width, height, options = {}) {
        if (width <= 0 || height <= 0) {
          return;
        }

        const path = vectorRoundedRectPath(x, toPdfY(y, height), width, height, options.radius || 0);
        const parts = ["q"];

        if (options.fill) {
          parts.push(pdfFillColor(options.fill));
          parts.push(path);
          parts.push("f");
        }

        if (options.stroke) {
          parts.push(pdfStrokeColor(options.stroke));
          parts.push(`${formatPdfNumber(options.lineWidth || 0.7)} w`);
          parts.push(path);
          parts.push("S");
        }

        parts.push("Q");
        add(parts.join("\n"));
      }

      function drawVectorLine(x1, y1, x2, y2, color, width = 0.7, dash = null) {
        if (x2 <= x1 && y2 === y1) {
          return;
        }

        const dashCommand = dash ? `[${dash.map(formatPdfNumber).join(" ")}] 0 d` : "[] 0 d";
        add(`q\n${pdfStrokeColor(color)}\n${formatPdfNumber(width)} w\n${dashCommand}\n${formatPdfNumber(x1)} ${formatPdfNumber(layout.pageSize.height - y1)} m\n${formatPdfNumber(x2)} ${formatPdfNumber(layout.pageSize.height - y2)} l\nS\nQ`);
      }

      function drawVectorCircle(cx, cy, radius, fill = "", stroke = "", width = 0.8) {
        const y = layout.pageSize.height - cy;
        const k = 0.5522847498;
        const c = radius * k;
        const path = [
          `${formatPdfNumber(cx + radius)} ${formatPdfNumber(y)} m`,
          `${formatPdfNumber(cx + radius)} ${formatPdfNumber(y + c)} ${formatPdfNumber(cx + c)} ${formatPdfNumber(y + radius)} ${formatPdfNumber(cx)} ${formatPdfNumber(y + radius)} c`,
          `${formatPdfNumber(cx - c)} ${formatPdfNumber(y + radius)} ${formatPdfNumber(cx - radius)} ${formatPdfNumber(y + c)} ${formatPdfNumber(cx - radius)} ${formatPdfNumber(y)} c`,
          `${formatPdfNumber(cx - radius)} ${formatPdfNumber(y - c)} ${formatPdfNumber(cx - c)} ${formatPdfNumber(y - radius)} ${formatPdfNumber(cx)} ${formatPdfNumber(y - radius)} c`,
          `${formatPdfNumber(cx + c)} ${formatPdfNumber(y - radius)} ${formatPdfNumber(cx + radius)} ${formatPdfNumber(y - c)} ${formatPdfNumber(cx + radius)} ${formatPdfNumber(y)} c`
        ].join("\n");
        const parts = ["q"];
        if (fill) {
          parts.push(pdfFillColor(fill), path, "f");
        }
        if (stroke) {
          parts.push(pdfStrokeColor(stroke), `${formatPdfNumber(width)} w`, path, "S");
        }
        parts.push("Q");
        add(parts.join("\n"));
      }

      function drawVectorArc(cx, cy, radius, start, end, color, width = 0.8) {
        const steps = 12;
        const points = [];
        for (let index = 0; index <= steps; index += 1) {
          const t = start + (end - start) * (index / steps);
          points.push([cx + Math.cos(t) * radius, cy + Math.sin(t) * radius]);
        }
        const commands = [`q\n${pdfStrokeColor(color)}\n${formatPdfNumber(width)} w\n${formatPdfNumber(points[0][0])} ${formatPdfNumber(layout.pageSize.height - points[0][1])} m`];
        for (const point of points.slice(1)) {
          commands.push(`${formatPdfNumber(point[0])} ${formatPdfNumber(layout.pageSize.height - point[1])} l`);
        }
        commands.push("S\nQ");
        add(commands.join("\n"));
      }

      function registerImageResource(image) {
        if (!image) {
          return null;
        }

        const key = image.currentSrc || image.src || `${image.naturalWidth || image.width}:${image.naturalHeight || image.height}:${imageResources.size}`;
        const existing = imageResources.get(key);

        if (existing) {
          return existing;
        }

        try {
          const jpeg = imageElementToPdfJpeg(image);
          const resource = {
            id: nextObjectId++,
            name: `Im${imageResources.size + 1}`,
            ...jpeg
          };
          imageResources.set(key, resource);
          return resource;
        } catch {
          return null;
        }
      }
    }

    function addType3FontObjects(font) {
      const firstCode = 32;
      const lastCode = firstCode + font.glyphs.length - 1;
      const widths = font.glyphs.map((glyph) => formatPdfNumber(glyph.widthUnits)).join(" ");
      const differences = `[${firstCode} ${font.glyphs.map((glyph) => `/${glyph.name}`).join(" ")}]`;
      const charProcs = font.glyphs.map((glyph) => `/${glyph.name} ${glyph.objectId} 0 R`).join(" ");
      const bbox = [
        font.bbox.xMin,
        font.bbox.yMin,
        font.bbox.xMax,
        font.bbox.yMax
      ].map(formatPdfNumber).join(" ");

      addObject(font.fontId, [
        `<< /Type /Font /Subtype /Type3 /Name /${font.name} /FontBBox [${bbox}] /FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << ${charProcs} >> /Encoding << /Type /Encoding /Differences ${differences} >> /FirstChar ${firstCode} /LastChar ${lastCode} /Widths [${widths}] /Resources << >> /ToUnicode ${font.toUnicodeId} 0 R >>`
      ]);
      addStreamObject(font.toUnicodeId, buildPdfType3ToUnicodeCMap(font.glyphs));

      for (const glyph of font.glyphs) {
        addStreamObject(glyph.objectId, buildPdfType3GlyphStream(glyph));
      }
    }

    function getType3Glyph(char, style) {
      const value = Array.from(String(char || ""))[0] || "";
      const key = getPdfType3StyleKey(style);
      let group = type3FontGroups.get(key);

      if (!group) {
        group = {
          chunks: [],
          glyphsByChar: new Map()
        };
        type3FontGroups.set(key, group);
      }

      const existing = group.glyphsByChar.get(value);

      if (existing) {
        return existing;
      }

      let chunk = group.chunks[group.chunks.length - 1];

      if (!chunk || chunk.glyphs.length >= 224) {
        chunk = {
          name: `FT3_${type3FontChunks.length + 1}`,
          fontId: nextObjectId++,
          toUnicodeId: nextObjectId++,
          glyphs: [],
          bbox: {
            xMin: 0,
            yMin: -260,
            xMax: 1000,
            yMax: 980
          }
        };
        group.chunks.push(chunk);
        type3FontChunks.push(chunk);
      }

      const mask = createPdfType3GlyphMask(value, style);
      const glyph = {
        char: value,
        code: 32 + chunk.glyphs.length,
        name: `g${chunk.glyphs.length + 1}`,
        objectId: nextObjectId++,
        ...mask
      };

      chunk.glyphs.push(glyph);
      group.glyphsByChar.set(value, {
        ...glyph,
        fontName: chunk.name
      });
      chunk.bbox.xMin = Math.min(chunk.bbox.xMin, glyph.xOffsetUnits);
      chunk.bbox.yMin = Math.min(chunk.bbox.yMin, glyph.yOffsetUnits);
      chunk.bbox.xMax = Math.max(chunk.bbox.xMax, glyph.xOffsetUnits + glyph.imageWidthUnits);
      chunk.bbox.yMax = Math.max(chunk.bbox.yMax, glyph.yOffsetUnits + glyph.imageHeightUnits);

      return group.glyphsByChar.get(value);
    }

    function addObject(id, parts) {
      objects.set(id, parts);
    }

    function addStreamObject(id, data) {
      const bytes = typeof data === "string" ? stringToPdfAsciiBytes(data) : data;
      addObject(id, [
        `<< /Length ${bytes.length} >>\nstream\n`,
        bytes,
        "\nendstream"
      ]);
    }

    function appendString(value) {
      const bytes = stringToPdfAsciiBytes(value);
      chunks.push(bytes);
      byteOffset += bytes.length;
    }

    function appendBytes(bytes) {
      chunks.push(bytes);
      byteOffset += bytes.length;
    }

    function measurePlainPdfText(text, style) {
      measurer.font = getCanvasFont(style);
      return measurer.measureText(String(text || "")).width;
    }

    function fitPdfTextForWidth(text, width, style) {
      const value = String(text || "");

      for (let length = value.length; length > 0; length -= 1) {
        const candidate = `${value.slice(0, length)}...`;
        if (measurePlainPdfText(candidate, style) <= width) {
          return candidate;
        }
      }

      return "";
    }

    function getVectorPdfTextRuns(text, style) {
      const runs = [];
      let current = null;

      for (const char of Array.from(String(text || ""))) {
        const type3 = !isPdfWinAnsiText(char);
        const fontName = type3 ? getType3Glyph(char, style).fontName : getVectorPdfBaseFontName(style);
        const glyph = type3 ? getType3Glyph(char, style) : null;
        const encodedHex = type3
          ? glyph.code.toString(16).padStart(2, "0").toUpperCase()
          : stringToWinAnsiHex(char);
        const width = type3
          ? (glyph.widthUnits / 1000) * (style.size || 10)
          : measurePlainPdfText(char, style);

        if (current && current.fontName === fontName && current.type3 === type3) {
          current.encodedHex += encodedHex;
          current.width += width;
          continue;
        }

        current = {
          fontName,
          type3,
          encodedHex,
          encoded: "",
          width
        };
        runs.push(current);
      }

      for (const run of runs) {
        run.encoded = `<${run.encodedHex}>`;
      }

      return runs;
    }

    function getVectorPdfBaseFontName(style) {
      const isMono = /mono|consolas|courier|cascadia/i.test(style?.family || "");
      const isBold = (style?.weight || 400) >= 650;

      if (isMono) {
        return isBold ? "FMonoB" : "FMono";
      }

      return isBold ? "FBaseB" : "FBase";
    }
  }

  function vectorRoundedRectPath(x, y, width, height, radius = 0) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));

    if (!r) {
      return `${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`;
    }

    const k = 0.5522847498;
    const c = r * k;
    const x0 = x;
    const x1 = x + width;
    const y0 = y;
    const y1 = y + height;

    return [
      `${formatPdfNumber(x0 + r)} ${formatPdfNumber(y0)} m`,
      `${formatPdfNumber(x1 - r)} ${formatPdfNumber(y0)} l`,
      `${formatPdfNumber(x1 - r + c)} ${formatPdfNumber(y0)} ${formatPdfNumber(x1)} ${formatPdfNumber(y0 + r - c)} ${formatPdfNumber(x1)} ${formatPdfNumber(y0 + r)} c`,
      `${formatPdfNumber(x1)} ${formatPdfNumber(y1 - r)} l`,
      `${formatPdfNumber(x1)} ${formatPdfNumber(y1 - r + c)} ${formatPdfNumber(x1 - r + c)} ${formatPdfNumber(y1)} ${formatPdfNumber(x1 - r)} ${formatPdfNumber(y1)} c`,
      `${formatPdfNumber(x0 + r)} ${formatPdfNumber(y1)} l`,
      `${formatPdfNumber(x0 + r - c)} ${formatPdfNumber(y1)} ${formatPdfNumber(x0)} ${formatPdfNumber(y1 - r + c)} ${formatPdfNumber(x0)} ${formatPdfNumber(y1 - r)} c`,
      `${formatPdfNumber(x0)} ${formatPdfNumber(y0 + r)} l`,
      `${formatPdfNumber(x0)} ${formatPdfNumber(y0 + r - c)} ${formatPdfNumber(x0 + r - c)} ${formatPdfNumber(y0)} ${formatPdfNumber(x0 + r)} ${formatPdfNumber(y0)} c`,
      "h"
    ].join("\n");
  }

  function pdfFillColor(color) {
    const [r, g, b] = pdfRgb(color);
    return `${r} ${g} ${b} rg`;
  }

  function pdfStrokeColor(color) {
    const [r, g, b] = pdfRgb(color);
    return `${r} ${g} ${b} RG`;
  }

  function pdfRgb(color) {
    const value = String(color || "#000000").trim();
    const hex = value.startsWith("#") ? value.slice(1) : value;
    const normalized = hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex.padEnd(6, "0").slice(0, 6);
    const int = Number.parseInt(normalized, 16);
    const r = Number.isFinite(int) ? (int >> 16) & 255 : 0;
    const g = Number.isFinite(int) ? (int >> 8) & 255 : 0;
    const b = Number.isFinite(int) ? int & 255 : 0;
    return [r, g, b].map((channel) => formatPdfNumber(channel / 255));
  }

  function isPdfWinAnsiText(text) {
    return /^[\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff]*$/.test(String(text || ""));
  }

  function stringToUtf16BeHex(text) {
    let hex = "";
    const value = String(text || "");

    for (let index = 0; index < value.length; index += 1) {
      hex += value.charCodeAt(index).toString(16).padStart(4, "0");
    }

    return hex.toUpperCase();
  }

  function stringToWinAnsiHex(text) {
    let hex = "";

    for (const char of String(text || "")) {
      const code = char.charCodeAt(0);
      hex += (code <= 255 ? code : 63).toString(16).padStart(2, "0");
    }

    return hex.toUpperCase();
  }

  function stringToPdfAsciiBytes(text) {
    const value = String(text || "");
    const bytes = new Uint8Array(value.length);

    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 255;
    }

    return bytes;
  }

  function buildPdfToUnicodeCMap(chars) {
    const entries = [...chars]
      .map((char) => char.codePointAt(0))
      .filter((codePoint) => Number.isFinite(codePoint) && codePoint <= 0xffff)
      .sort((a, b) => a - b)
      .map((codePoint) => `<${codePoint.toString(16).padStart(4, "0").toUpperCase()}> <${codePoint.toString(16).padStart(4, "0").toUpperCase()}>`);
    const lines = [
      "/CIDInit /ProcSet findresource begin",
      "12 dict begin",
      "begincmap",
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
      "/CMapName /Adobe-Identity-UCS def",
      "/CMapType 2 def",
      "1 begincodespacerange",
      "<0000> <FFFF>",
      "endcodespacerange"
    ];

    for (let index = 0; index < entries.length; index += 100) {
      const chunk = entries.slice(index, index + 100);
      lines.push(`${chunk.length} beginbfchar`, ...chunk, "endbfchar");
    }

    lines.push(
      "endcmap",
      "CMapName currentdict /CMap defineresource pop",
      "end",
      "end"
    );
    return stringToPdfAsciiBytes(lines.join("\n"));
  }

  function getPdfType3StyleKey(style = {}) {
    const isMono = /mono|consolas|courier|cascadia/i.test(style.family || "");
    const isBold = (style.weight || 400) >= 650;
    const isItalic = Boolean(style.italic);
    return `${isMono ? "mono" : "text"}:${isBold ? "bold" : "regular"}:${isItalic ? "italic" : "normal"}`;
  }

  function createPdfType3GlyphMask(char, style = {}) {
    const scale = 12;
    const baseSize = Math.max(8, style.size || 10);
    const renderSize = Math.round(baseSize * scale);
    const probe = document.createElement("canvas");
    const probeContext = probe.getContext("2d");
    const font = getPdfType3CanvasFont(style, renderSize);
    probeContext.font = font;
    const metrics = probeContext.measureText(char);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || renderSize * 0.86);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || renderSize * 0.2);
    const left = Math.ceil(Math.max(0, metrics.actualBoundingBoxLeft || 0));
    const right = Math.ceil(Math.max(metrics.width, metrics.actualBoundingBoxRight || metrics.width));
    const pad = Math.max(3, Math.ceil(renderSize * 0.08));
    const pixelWidth = Math.max(2, left + right + pad * 2);
    const pixelHeight = Math.max(2, ascent + descent + pad * 2);
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.font = font;
    context.fillStyle = "#000000";
    context.textBaseline = "alphabetic";
    context.fillText(char, pad + left, pad + ascent);

    if ((style.weight || 400) >= 650) {
      const boldOffset = Math.max(1, Math.round(renderSize * 0.011));
      context.fillText(char, pad + left + boldOffset, pad + ascent);
    }

    const image = context.getImageData(0, 0, pixelWidth, pixelHeight);
    const rowBytes = Math.ceil(pixelWidth / 8);
    const maskBytes = new Uint8Array(rowBytes * pixelHeight);
    const alphaThreshold = (style.weight || 400) >= 650 ? 78 : 110;

    for (let y = 0; y < pixelHeight; y += 1) {
      for (let x = 0; x < pixelWidth; x += 1) {
        const alpha = image.data[(y * pixelWidth + x) * 4 + 3];

        if (alpha > alphaThreshold) {
          maskBytes[y * rowBytes + Math.floor(x / 8)] |= 1 << (7 - (x % 8));
        }
      }
    }

    const advanceWidthUnits = Math.max(160, Math.round((Math.max(metrics.width, renderSize * 0.35) / renderSize) * 1000));
    const imageWidthUnits = Math.max(1, Math.round((pixelWidth / renderSize) * 1000));
    const imageHeightUnits = Math.max(1, Math.round((pixelHeight / renderSize) * 1000));
    const xOffsetUnits = Math.round((-left - pad * 0.2) / renderSize * 1000);
    const yOffsetUnits = Math.round(-(descent + pad) / renderSize * 1000);

    return {
      widthUnits: advanceWidthUnits,
      imageWidth: pixelWidth,
      imageHeight: pixelHeight,
      imageWidthUnits,
      imageHeightUnits,
      xOffsetUnits,
      yOffsetUnits,
      maskHex: bytesToHex(maskBytes)
    };
  }

  function getPdfType3CanvasFont(style = {}, renderSize = 100) {
    const weight = Math.max(400, Math.min(900, style.weight || 400));
    const italic = style.italic ? "italic " : "";
    const isMono = /mono|consolas|courier|cascadia/i.test(style.family || "");
    const family = isMono
      ? '"Cascadia Mono", Consolas, "Microsoft YaHei UI", "Microsoft YaHei", monospace'
      : '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", Arial, sans-serif';

    return `${italic}${weight} ${renderSize}px ${family}`;
  }

  function buildPdfType3GlyphStream(glyph) {
    return stringToPdfAsciiBytes([
      `${formatPdfNumber(glyph.widthUnits)} 0 ${formatPdfNumber(glyph.xOffsetUnits)} ${formatPdfNumber(glyph.yOffsetUnits)} ${formatPdfNumber(glyph.xOffsetUnits + glyph.imageWidthUnits)} ${formatPdfNumber(glyph.yOffsetUnits + glyph.imageHeightUnits)} d1`,
      "q",
      `${formatPdfNumber(glyph.imageWidthUnits)} 0 0 ${formatPdfNumber(glyph.imageHeightUnits)} ${formatPdfNumber(glyph.xOffsetUnits)} ${formatPdfNumber(glyph.yOffsetUnits)} cm`,
      `BI /W ${glyph.imageWidth} /H ${glyph.imageHeight} /ImageMask true /BitsPerComponent 1 /Decode [1 0] /Filter /ASCIIHexDecode ID`,
      `${glyph.maskHex}>`,
      "EI",
      "Q"
    ].join("\n"));
  }

  function buildPdfType3ToUnicodeCMap(glyphs) {
    const lines = [
      "/CIDInit /ProcSet findresource begin",
      "12 dict begin",
      "begincmap",
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
      "/CMapName /Adobe-Type3-UCS def",
      "/CMapType 2 def",
      "1 begincodespacerange",
      "<20> <FF>",
      "endcodespacerange"
    ];
    const entries = glyphs.map((glyph) => `<${glyph.code.toString(16).padStart(2, "0").toUpperCase()}> <${stringToUtf16BeHex(glyph.char)}>`).filter(Boolean);

    for (let index = 0; index < entries.length; index += 100) {
      const chunk = entries.slice(index, index + 100);
      lines.push(`${chunk.length} beginbfchar`, ...chunk, "endbfchar");
    }

    lines.push(
      "endcmap",
      "CMapName currentdict /CMap defineresource pop",
      "end",
      "end"
    );
    return stringToPdfAsciiBytes(lines.join("\n"));
  }

  function bytesToHex(bytes) {
    let hex = "";

    for (const byte of bytes || []) {
      hex += byte.toString(16).padStart(2, "0").toUpperCase();
    }

    return hex;
  }

  function imageElementToPdfJpeg(image) {
    const sourceWidth = image.naturalWidth || image.width || 1;
    const sourceHeight = image.naturalHeight || image.height || 1;
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return {
      width,
      height,
      bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.84))
    };
  }

  function renderPdfPages(layout) {
    const scale = 1.75;

    return layout.pages.map((page, pageIndex) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(layout.pageSize.width * scale);
      canvas.height = Math.ceil(layout.pageSize.height * scale);
      const context = canvas.getContext("2d");
      const links = [];

      context.scale(scale, scale);
      context.fillStyle = layout.theme.page;
      context.fillRect(0, 0, layout.pageSize.width, layout.pageSize.height);

      for (const background of getOrderedPdfBackgrounds(page.backgrounds || [])) {
        drawPdfBackgroundOp(context, background);
      }

      for (const op of page.ops) {
        if (op.type === "toc") {
          drawPdfTocRow(context, layout, op, links);
        } else if (op.type === "image") {
          drawPdfImageOp(context, op, links);
        } else if (op.type === "imagePlaceholder") {
          drawPdfImagePlaceholderOp(context, op);
        } else if (op.type === "file") {
          drawPdfFileOp(context, op, links);
        } else if (op.type === "userIcon") {
          drawPdfUserIconOp(context, op);
        } else if (op.type === "assistantIcon") {
          drawPdfAssistantIconOp(context, op);
        } else if (op.type === "thinkingRail") {
          drawPdfThinkingRailOp(context, op);
        } else if (op.type === "richText") {
          drawPdfRichTextOp(context, op, links);
        } else {
          drawPdfTextOp(context, op, links);
        }
      }

      drawPdfHeaderFooter(context, layout, pageIndex);

      return {
        width: layout.pageSize.width,
        height: layout.pageSize.height,
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        jpegBytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.88)),
        links
      };
    });
  }

  function getOrderedPdfBackgrounds(backgrounds) {
    return [...backgrounds].sort((a, b) => {
      const aLayer = a.type === "card" ? 0 : 1;
      const bLayer = b.type === "card" ? 0 : 1;
      return aLayer - bLayer;
    });
  }

  function drawPdfBackgroundOp(context, op) {
    context.save();
    drawPdfRoundedRectPath(context, op.x, op.y, op.width, op.height, op.radius || 0);
    context.fillStyle = op.fill || "#ffffff";
    context.fill();

    if (op.border) {
      context.strokeStyle = op.border;
      context.lineWidth = op.type === "card" ? 0.8 : 0.7;
      context.stroke();
    }

    if (op.accentColor) {
      context.fillStyle = op.accentColor;

      if (op.accentSide === "right") {
        context.fillRect(op.x + op.width - 3, op.y + 7, 3, Math.max(0, op.height - 14));
      } else if (op.accentSide === "top") {
        context.fillRect(op.x + 10, op.y, Math.max(0, op.width - 20), 3);
      } else {
        context.fillRect(op.x, op.y + 7, 3, Math.max(0, op.height - 14));
      }
    }

    context.restore();
  }

  function drawPdfRoundedRectPath(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));

    if (typeof context.roundRect === "function") {
      context.beginPath();
      context.roundRect(x, y, width, height, r);
      return;
    }

    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
  }

  function drawPdfHeaderFooter(context, layout, pageIndex) {
    const headerStyle = layout.styles.meta;
    const y = Math.max(14, layout.margin * 0.55);
    const rightText = layout.metadata.exportedAt.toLocaleString();

    context.fillStyle = headerStyle.color;
    context.font = getCanvasFont(headerStyle);
    context.textBaseline = "top";
    drawPdfFittedText(context, layout.settings.title, layout.contentLeft, y, layout.contentWidth * 0.58);
    drawPdfFittedText(context, rightText, layout.contentLeft + layout.contentWidth * 0.62, y, layout.contentWidth * 0.38, "right");

    context.strokeStyle = layout.theme.rule;
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(layout.contentLeft, layout.contentTop - 10);
    context.lineTo(layout.contentLeft + layout.contentWidth, layout.contentTop - 10);
    context.stroke();

    if (layout.settings.removePageNumbers) {
      return;
    }

    const footerText = `Page ${pageIndex + 1} / ${layout.pages.length}`;
    const footerY = layout.pageSize.height - Math.max(20, layout.margin * 0.55);
    context.fillStyle = headerStyle.color;
    context.font = getCanvasFont(headerStyle);
    drawPdfFittedText(context, footerText, layout.contentLeft, footerY, layout.contentWidth, "center");
  }

  function drawPdfTocRow(context, layout, op, links) {
    const style = op.style;
    const color = getPdfTocColor(op, layout.theme);
    const left = `${op.marker || op.role || "Message"} - ${op.label || ""}`;
    const right = String(op.pageNumber || "");
    const y = op.y;

    context.font = getCanvasFont(style);
    context.textBaseline = "top";
    context.fillStyle = color;
    const rightWidth = context.measureText(right).width + 4;
    drawPdfFittedText(context, left, op.x, y, op.width - rightWidth - 16);
    drawPdfFittedText(context, right, op.x + op.width - rightWidth, y, rightWidth, "right");

    const leftWidth = Math.min(context.measureText(left).width, op.width - rightWidth - 20);
    const dotStart = op.x + leftWidth + 8;
    const dotEnd = op.x + op.width - rightWidth - 8;

    if (dotEnd > dotStart) {
      context.strokeStyle = layout.theme.rule;
      context.setLineDash([1, 3]);
      context.beginPath();
      context.moveTo(dotStart, y + style.lineHeight * 0.62);
      context.lineTo(dotEnd, y + style.lineHeight * 0.62);
      context.stroke();
      context.setLineDash([]);
    }

    if (Number.isFinite(op.targetPageIndex)) {
      links.push({
        pageIndex: op.targetPageIndex,
        x: op.x,
        y,
        width: op.width,
        height: style.lineHeight
      });
    }
  }

  function getPdfTocColor(op, theme) {
    if (op.targetKind === "thinking") {
      return theme.thinkingTitle;
    }

    if (op.targetKind === "image") {
      return theme.imageTitle;
    }

    if (op.targetKind === "file") {
      return theme.fileText;
    }

    return op.marker === "User" ? theme.userAccent : theme.assistantAccent;
  }

  function drawPdfUserIconOp(context, op) {
    const size = op.size || 16;
    const x = op.x;
    const y = op.y;
    const cx = x + size / 2;
    const cy = y + size / 2;

    context.save();
    context.strokeStyle = op.strokeColor || "#111827";
    context.lineWidth = op.lineWidth || 1.05;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    context.arc(cx, cy, size / 2 - 0.7, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(cx, y + size * 0.38, size * 0.15, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(cx, y + size * 0.86, size * 0.29, Math.PI * 1.12, Math.PI * 1.88);
    context.stroke();
    context.restore();
  }

  function drawPdfThinkingRailOp(context, op) {
    const x = op.x;
    const y = op.y;
    const dotY = y + 7;
    const lineTop = dotY + (op.dotRadius || 2.2) + 3;
    const lineBottom = y + Math.max(10, op.height || 10);

    context.save();
    context.strokeStyle = op.lineColor || "#8b5cf6";
    context.lineWidth = op.lineWidth || 1.2;
    context.lineCap = "round";

    if (lineBottom > lineTop + 1) {
      context.beginPath();
      context.moveTo(x, lineTop);
      context.lineTo(x, lineBottom);
      context.stroke();
    }

    context.fillStyle = op.dotColor || op.lineColor || "#8b5cf6";
    context.beginPath();
    context.arc(x, dotY, op.dotRadius || 2.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPdfAssistantIconOp(context, op) {
    const size = op.size || 18;
    const x = op.x;
    const y = op.y;
    const cx = x + size / 2;
    const cy = y + size / 2;

    context.save();
    context.translate(cx, cy);
    context.strokeStyle = op.strokeColor || "#111827";
    context.lineWidth = op.lineWidth || Math.max(1.25, size * 0.105);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (let index = 0; index < 6; index += 1) {
      context.save();
      context.rotate(index * Math.PI / 3);
      context.beginPath();
      context.moveTo(-size * 0.07, -size * 0.39);
      context.bezierCurveTo(size * 0.19, -size * 0.52, size * 0.47, -size * 0.34, size * 0.47, -size * 0.06);
      context.bezierCurveTo(size * 0.47, size * 0.16, size * 0.27, size * 0.31, size * 0.07, size * 0.24);
      context.stroke();
      context.restore();
    }

    context.restore();
  }

  function drawPdfTextOp(context, op, links) {
    const style = op.style;
    const lineHeight = style.lineHeight;
    const paddingX = op.paddingX || 0;

    if (op.background) {
      context.fillStyle = op.background;
      context.fillRect(op.x - paddingX, op.y, op.width + paddingX * 2, lineHeight);
    }

    if (op.borderColor) {
      context.fillStyle = op.borderColor;
      context.fillRect(op.x - paddingX, op.y, 2.5, lineHeight);
    }

    context.font = getCanvasFont(style);
    context.textBaseline = "top";
    context.fillStyle = style.color;
    const textY = op.y + Math.max(0, (lineHeight - style.size) / 2);

    if (op.align && op.align !== "left") {
      drawPdfFittedText(context, op.text, op.x, textY, op.width, op.align);
    } else {
      context.fillText(op.text, op.x, textY, op.width);
    }

    if (op.underline) {
      const textWidth = Math.min(op.width, context.measureText(op.text).width);
      const underlineY = op.y + lineHeight - 2.2;
      context.strokeStyle = style.color;
      context.lineWidth = 0.6;
      context.beginPath();
      context.moveTo(op.x, underlineY);
      context.lineTo(op.x + textWidth, underlineY);
      context.stroke();

      if (op.url && !String(op.url).startsWith("data:") && String(op.url).length < 2000) {
        links.push({
          url: op.url,
          x: op.x,
          y: op.y,
          width: Math.max(12, textWidth),
          height: lineHeight
        });
      }
    }
  }

  function drawPdfRichTextOp(context, op, links) {
    const style = op.style;
    const lineHeight = style.lineHeight;
    const paddingX = op.paddingX || 0;
    const textY = op.y + Math.max(0, (lineHeight - style.size) / 2);

    if (op.background) {
      context.fillStyle = op.background;
      context.fillRect(op.x - paddingX, op.y, op.width + paddingX * 2, lineHeight);
    }

    if (op.borderColor) {
      context.fillStyle = op.borderColor;
      context.fillRect(op.x - paddingX, op.y, 2.5, lineHeight);
    }

    let drawX = op.x;

    if (op.align === "right") {
      drawX = op.x + Math.max(0, op.width - (op.lineWidth || 0));
    } else if (op.align === "center") {
      drawX = op.x + Math.max(0, (op.width - (op.lineWidth || 0)) / 2);
    }

    for (const segment of op.segments || []) {
      const segmentStyle = getPdfInlineSegmentStyle(segment, style, op.codeStyle || style);
      context.font = getCanvasFont(segmentStyle);
      context.textBaseline = "top";
      const text = segment.text || "";
      const textWidth = context.measureText(text).width;
      const isLinkChip = isPdfLinkChipSegment(segment);
      const width = isLinkChip ? textWidth + PDF_LINK_CHIP_PADDING_X * 2 : textWidth;

      if (isLinkChip) {
        const chipHeight = Math.min(lineHeight - 1.4, Math.max(segmentStyle.size + 4.4, 9));
        const chipY = op.y + Math.max(0, (lineHeight - chipHeight) / 2);
        const chipTextY = chipY + Math.max(0, (chipHeight - segmentStyle.size) / 2) - 0.2;
        context.fillStyle = op.linkChipBg || "#eef0f3";
        drawPdfRoundedRectPath(context, drawX, chipY, width, chipHeight, chipHeight / 2);
        context.fill();
        context.strokeStyle = op.linkChipBorder || "#e1e5eb";
        context.lineWidth = 0.45;
        context.stroke();
        context.fillStyle = op.linkChipText || segmentStyle.color;
        context.fillText(text, drawX + PDF_LINK_CHIP_PADDING_X, chipTextY, Math.max(4, width - PDF_LINK_CHIP_PADDING_X * 2));
        links.push({
          url: segment.url,
          x: drawX,
          y: chipY,
          width: Math.max(12, width),
          height: chipHeight
        });
        drawX += width;
        continue;
      }

      if (segment.code) {
        context.fillStyle = op.codeBackground || "#eef2f7";
        drawPdfRoundedRectPath(context, drawX - 1.5, op.y + 1.6, width + 3, lineHeight - 3.2, 2.5);
        context.fill();
      }

      context.fillStyle = segmentStyle.color;
      context.fillText(text, drawX, textY, Math.max(4, op.x + op.width - drawX));

      if (segment.url && !String(segment.url).startsWith("data:") && String(segment.url).length < 2000) {
        const underlineY = op.y + lineHeight - 2.2;
        context.strokeStyle = segmentStyle.color;
        context.lineWidth = 0.6;
        context.beginPath();
        context.moveTo(drawX, underlineY);
        context.lineTo(drawX + width, underlineY);
        context.stroke();
        links.push({
          url: segment.url,
          x: drawX,
          y: op.y,
          width: Math.max(12, width),
          height: lineHeight
        });
      }

      drawX += width;
    }
  }

  function getPdfInlineSegmentStyle(segment, baseStyle, codeStyle) {
    if (segment?.code) {
      return {
        ...codeStyle,
        color: codeStyle.color || baseStyle.color,
        size: Math.max(6.8, Math.min(codeStyle.size || baseStyle.size, baseStyle.size * 0.94)),
        lineHeight: baseStyle.lineHeight,
        weight: 500,
        italic: false
      };
    }

    return {
      ...baseStyle,
      weight: Number.isFinite(segment?.weight)
        ? segment.weight
        : segment?.bold
          ? Math.max(700, baseStyle.weight || 400)
          : baseStyle.weight,
      italic: Boolean(baseStyle.italic || segment?.italic),
      color: segment?.color || (segment?.url ? "#1d4ed8" : baseStyle.color)
    };
  }

  function drawPdfImageOp(context, op, links) {
    context.save();
    drawPdfRoundedRectPath(context, op.x, op.y, op.width, op.height, op.radius || 0);
    context.clip();
    context.drawImage(op.image, op.x, op.y, op.width, op.height);
    context.restore();

    if (Number.isFinite(op.detailRef?.pageIndex)) {
      links.push({
        pageIndex: op.detailRef.pageIndex,
        x: op.x,
        y: op.y,
        width: op.width,
        height: op.height
      });
    }
  }

  function drawPdfImagePlaceholderOp(context, op) {
    const iconSize = 34;
    const iconX = op.x + (op.width - iconSize) / 2;
    const iconY = op.y + Math.max(16, op.height * 0.28);
    const textX = op.x + 12;
    const textWidth = Math.max(24, op.width - 24);

    context.save();
    context.fillStyle = "rgba(56, 189, 248, 0.08)";
    drawPdfRoundedRectPath(context, op.x + 8, op.y + 8, op.width - 16, op.height - 16, 7);
    context.fill();

    drawPdfRoundedRectPath(context, iconX, iconY, iconSize, iconSize, 5);
    context.strokeStyle = op.iconColor || "#38bdf8";
    context.lineWidth = 1.1;
    context.stroke();

    context.strokeStyle = op.iconColor || "#38bdf8";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(iconX + 7, iconY + 24);
    context.lineTo(iconX + 14, iconY + 17);
    context.lineTo(iconX + 20, iconY + 22);
    context.lineTo(iconX + 27, iconY + 12);
    context.stroke();
    context.beginPath();
    context.arc(iconX + 12, iconY + 11, 2.2, 0, Math.PI * 2);
    context.fillStyle = op.iconColor || "#38bdf8";
    context.fill();

    context.font = getCanvasFont({
      ...op.style,
      weight: 650,
      size: Math.max(8.2, op.style.size * 0.98)
    });
    context.textBaseline = "top";
    context.fillStyle = op.textColor || op.style.color;
    drawPdfFittedText(context, "Image preview unavailable", textX, iconY + iconSize + 9, textWidth, "center");

    context.font = `400 ${Math.max(6.7, op.style.size * 0.72)}px ${op.style.family}`;
    context.fillStyle = op.mutedColor || "#6b7280";
    drawPdfFittedText(context, op.alt || "Thumbnail only", textX, iconY + iconSize + 22, textWidth, "center");
    context.restore();
  }

  function drawPdfFileOp(context, op) {
    const iconSize = op.iconSize || 22;
    const iconX = op.x + 9;
    const iconY = op.y + (op.height - iconSize) / 2;
    const textX = iconX + iconSize + 9;
    const textWidth = Math.max(24, op.width - (textX - op.x) - 10);
    const extension = String(op.extension || "FILE").slice(0, 4);

    context.save();
    drawPdfRoundedRectPath(context, iconX, iconY, iconSize, iconSize, 5);
    context.fillStyle = op.iconBg || "#ef4444";
    context.fill();

    context.fillStyle = "rgba(255,255,255,0.55)";
    context.beginPath();
    context.moveTo(iconX + iconSize - 7, iconY);
    context.lineTo(iconX + iconSize, iconY + 7);
    context.lineTo(iconX + iconSize - 7, iconY + 7);
    context.closePath();
    context.fill();

    context.font = `800 ${extension.length > 3 ? 5.1 : 5.8}px ${op.style.family}`;
    context.textBaseline = "middle";
    context.fillStyle = op.iconText || "#ffffff";
    drawPdfFittedText(context, extension, iconX + 3, iconY + iconSize / 2 + 0.4, iconSize - 6, "center");

    context.font = getCanvasFont({
      ...op.style,
      weight: 650,
      size: Math.max(8.2, op.style.size * 0.98)
    });
    context.textBaseline = "top";
    context.fillStyle = op.textColor || op.style.color;
    drawPdfFittedText(context, op.name || "Attachment", textX, op.y + (op.height - op.style.size) / 2, textWidth);

    context.restore();
  }

  function drawPdfFittedText(context, text, x, y, width, align = "left") {
    const value = String(text || "");
    let fitted = value;

    if (context.measureText(fitted).width > width) {
      fitted = "";

      for (let length = value.length; length > 0; length -= 1) {
        const candidate = `${value.slice(0, length)}...`;

        if (context.measureText(candidate).width <= width) {
          fitted = candidate;
          break;
        }
      }
    }

    const textWidth = Math.min(width, context.measureText(fitted).width);
    let drawX = x;

    if (align === "right") {
      drawX = x + width - textWidth;
    } else if (align === "center") {
      drawX = x + (width - textWidth) / 2;
    }

    context.fillText(fitted, drawX, y, width);
  }

  function getCanvasFont(style) {
    return `${style.italic ? "italic " : ""}${style.weight || 400} ${style.size}px ${style.family}`;
  }

  function buildRasterPdf(pages) {
    const chunks = [];
    const offsets = [];
    let byteOffset = 0;
    let nextObjectId = 3;
    const pageRefs = pages.map((page, index) => {
      const pageRef = {
        pageId: nextObjectId++,
        imageId: nextObjectId++,
        contentId: nextObjectId++,
        imageName: `Im${index + 1}`,
        annotIds: []
      };
      pageRef.annotIds = page.links.map(() => nextObjectId++);
      return pageRef;
    });
    const maxObjectId = nextObjectId - 1;

    appendString("%PDF-1.4\n");
    addPdfObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
    addPdfObject(2, [`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((ref) => `${ref.pageId} 0 R`).join(" ")}] >>`]);

    pages.forEach((page, pageIndex) => {
      const ref = pageRefs[pageIndex];
      const content = `q\n${formatPdfNumber(page.width)} 0 0 ${formatPdfNumber(page.height)} 0 0 cm\n/${ref.imageName} Do\nQ`;
      const contentStream = `${content}\n`;
      const annotRefs = ref.annotIds.map((id) => `${id} 0 R`).join(" ");
      const annots = annotRefs ? ` /Annots [${annotRefs}]` : "";

      addPdfObject(ref.imageId, [
        `<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\nstream\n`,
        page.jpegBytes,
        "\nendstream"
      ]);
      addPdfObject(ref.contentId, [
        `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`
      ]);

      page.links.forEach((link, linkIndex) => {
        const id = ref.annotIds[linkIndex];
        const rect = [
          formatPdfNumber(link.x),
          formatPdfNumber(page.height - link.y - link.height),
          formatPdfNumber(link.x + link.width),
          formatPdfNumber(page.height - link.y)
        ].join(" ");
        const destinationIndex = Number.isFinite(link.pageIndex)
          ? Math.max(0, Math.min(pageRefs.length - 1, link.pageIndex))
          : -1;
        const destinationRef = destinationIndex >= 0 ? pageRefs[destinationIndex] : null;

        if (destinationRef) {
          addPdfObject(id, [
            `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /Dest [${destinationRef.pageId} 0 R /Fit] >>`
          ]);
          return;
        }

        addPdfObject(id, [
          `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url || "")}) >> >>`
        ]);
      });

      addPdfObject(ref.pageId, [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(page.width)} ${formatPdfNumber(page.height)}] /Resources << /XObject << /${ref.imageName} ${ref.imageId} 0 R >> >> /Contents ${ref.contentId} 0 R${annots} >>`
      ]);
    });

    const xrefOffset = byteOffset;
    appendString(`xref\n0 ${maxObjectId + 1}\n`);
    appendString("0000000000 65535 f \n");

    for (let id = 1; id <= maxObjectId; id += 1) {
      appendString(`${String(offsets[id] || 0).padStart(10, "0")} 00000 n \n`);
    }

    appendString(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return new Blob(chunks, { type: "application/pdf" });

    function addPdfObject(id, parts) {
      offsets[id] = byteOffset;
      appendString(`${id} 0 obj\n`);

      for (const part of parts) {
        if (typeof part === "string") {
          appendString(part);
        } else {
          appendBytes(part);
        }
      }

      appendString("\nendobj\n");
    }

    function appendString(value) {
      chunks.push(value);
      byteOffset += value.length;
    }

    function appendBytes(bytes) {
      chunks.push(bytes);
      byteOffset += bytes.length;
    }
  }

  function formatPdfNumber(value) {
    return Number(value).toFixed(2).replace(/\.?0+$/g, "");
  }

  function escapePdfString(text) {
    return encodeURI(String(text || "")).replace(/[\\()]/g, "\\$&").replace(/\r|\n/g, "");
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = String(dataUrl || "").split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function getConversationTitle() {
    const documentTitle = cleanTitle(document.title);

    if (documentTitle && documentTitle.toLowerCase() !== "chatgpt") {
      return documentTitle;
    }

    const heading = document.querySelector("main h1, h1");
    const headingText = heading ? cleanTitle(getElementText(heading)) : "";
    return headingText || "ChatGPT Conversation";
  }

  function cleanTitle(title) {
    return String(title || "")
      .replace(/^chatgpt\s*[-|:]\s*/i, "")
      .replace(/\s+-\s+chatgpt$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeFilename(title, date, extension = "md") {
    const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeTitle = sanitizeFilename(title || "chatgpt-conversation").slice(0, 80);
    const safeExtension = String(extension || "md").replace(/^\.+/, "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "md";
    return `${safeTitle}-${timestamp}.${safeExtension}`;
  }

  function getBestScrollTarget() {
    // ChatGPT has used both document-level and nested scroll containers. Score
    // candidates by scroll range plus whether they contain conversation turns,
    // but only keep targets whose scrollTop can actually be changed. Some
    // recent ChatGPT builds expose large scrollHeight on <main> while the real
    // scroll owner is an ancestor/document scroller; choosing that inert node
    // leaves virtualized turns empty forever.
    const main = document.querySelector("main");
    const firstTurn = document.querySelector('[data-turn-id], [data-turn-container], [data-turn-id-container], [data-testid^="conversation-turn-"], [data-testid*="conversation-turn"]');
    const candidates = [
      document.scrollingElement,
      document.documentElement,
      document.body,
      main,
      main?.parentElement,
      ...getAncestorChain(firstTurn),
      ...getAncestorChain(main),
      ...document.querySelectorAll("[data-radix-scroll-area-viewport], [class*='overflow-y-auto'], [class*='overflow-auto'], [class*='scroll']")
    ].filter(Boolean);

    const ranked = uniqueElements(candidates)
      .filter((element) => getScrollHeight(element) - getClientHeight(element) > 40)
      .filter((element) => canProgrammaticallyScroll(element))
      .map((element) => ({ element, score: scoreScrollTarget(element, main) }))
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.element || document.scrollingElement || document.documentElement;
  }

  function getAncestorChain(element) {
    const ancestors = [];
    let current = element;

    while (current && current !== document.documentElement) {
      ancestors.push(current);
      current = current.parentElement;
    }

    ancestors.push(document.documentElement, document.body);
    return ancestors;
  }

  function scoreScrollTarget(element, main) {
    const range = getScrollHeight(element) - getClientHeight(element);
    const containsMain = main && (element === main || element.contains(main) || main.contains(element));
    const containsMessages = Boolean(element.querySelector?.('[data-turn-id], [data-turn-container], [data-turn-id-container], [data-testid^="conversation-turn-"], [data-message-author-role], [data-message-id]'));
    const isChrome = Boolean(element.closest?.("nav, aside, header"));

    return range + (containsMessages ? 100_000 : 0) + (containsMain ? 25_000 : 0) - (isChrome ? 100_000 : 0);
  }

  function getScrollTop(element) {
    if (isDocumentScroller(element)) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    return element.scrollTop;
  }

  function setScrollTop(element, value) {
    rawSetScrollTop(element, value);
  }

  function rawSetScrollTop(element, value) {
    if (isDocumentScroller(element)) {
      window.scrollTo(0, value);
      document.documentElement.scrollTop = value;
      document.body.scrollTop = value;
      return;
    }

    element.scrollTo?.(0, value);
    element.scrollTop = value;
  }

  function canProgrammaticallyScroll(element) {
    const maxTop = getMaxScrollTop(element);

    if (maxTop <= 40) {
      return false;
    }

    const original = getScrollTop(element);
    const probe = original < Math.min(maxTop, 120)
      ? Math.min(maxTop, original + 80)
      : Math.max(0, original - 80);

    rawSetScrollTop(element, probe);
    const movedTop = getScrollTop(element);
    rawSetScrollTop(element, original);

    return Math.abs(movedTop - original) > 2;
  }

  function getScrollHeight(element) {
    if (isDocumentScroller(element)) {
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    }

    return element.scrollHeight;
  }

  function getClientHeight(element) {
    if (isDocumentScroller(element)) {
      return window.innerHeight || document.documentElement.clientHeight;
    }

    return element.clientHeight;
  }

  function getMaxScrollTop(element) {
    return Math.max(0, getScrollHeight(element) - getClientHeight(element));
  }

  function isDocumentScroller(element) {
    return element === document.scrollingElement || element === document.documentElement || element === document.body;
  }

  function getOrderHint(node, fallback) {
    const turnNumber = getConversationTurnNumber(node);

    if (Number.isFinite(turnNumber)) {
      return turnNumber;
    }

    const turn = isTurnNode(node) ? node : getClosestTurnNode(node);
    const domIndex = getAllTurnNodes().indexOf(turn);

    if (domIndex >= 0) {
      return domIndex + 1_000_000;
    }

    return fallback + 2_000_000;
  }

  function getConversationTurnNumber(node) {
    const testIds = [
      node?.getAttribute?.("data-testid") || "",
      node?.closest?.("[data-testid]")?.getAttribute("data-testid") || "",
      node?.querySelector?.("[data-testid*='conversation-turn']")?.getAttribute("data-testid") || ""
    ];

    for (const testId of testIds) {
      const match = String(testId || "").match(/conversation-turn-(\d+)/);

      if (match) {
        return Number(match[1]);
      }
    }

    return NaN;
  }

  function isBlockElement(tag) {
    return [
      "article",
      "aside",
      "div",
      "figcaption",
      "figure",
      "footer",
      "header",
      "main",
      "section"
    ].includes(tag);
  }

  function getElementText(element) {
    return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getRawElementText(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function normalizeTextNode(text, parentElement) {
    const normalized = String(text || "").replace(/\r\n?/g, "\n");

    if (preservesWhitespace(parentElement)) {
      return normalized
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n");
    }

    return normalized.replace(/\s+/g, " ");
  }

  function preservesWhitespace(element) {
    return Boolean(element?.closest?.("pre, textarea, [class*='whitespace-pre-wrap'], [style*='white-space: pre-wrap']"));
  }

  function cleanMarkdown(markdown) {
    return normalizeMarkdownOutsideCodeFences(String(markdown || ""), (text) => String(text || "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
    )
      .trim();
  }

  function normalizeMarkdownOutsideCodeFences(markdown, normalizeText) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const chunks = [];
    let buffer = [];
    let inFence = false;
    let fenceChar = "";
    let fenceLength = 0;

    const flushText = () => {
      if (!buffer.length) {
        return;
      }

      chunks.push(normalizeText(buffer.join("\n")));
      buffer = [];
    };

    const flushCode = () => {
      if (!buffer.length) {
        return;
      }

      chunks.push(buffer.join("\n").replace(/[ \t]+$/gm, ""));
      buffer = [];
    };

    for (const line of lines) {
      const openingFence = line.match(/^\s*([`~]{3,})(.*)$/);

      if (!inFence && openingFence) {
        flushText();
        inFence = true;
        fenceChar = openingFence[1][0];
        fenceLength = openingFence[1].length;
        buffer.push(line.trimEnd());
        continue;
      }

      if (inFence) {
        buffer.push(line);

        if (isClosingMarkdownFence(line, fenceChar, fenceLength)) {
          flushCode();
          inFence = false;
          fenceChar = "";
          fenceLength = 0;
        }
        continue;
      }

      buffer.push(line);
    }

    if (inFence) {
      flushCode();
    } else {
      flushText();
    }

    return chunks.join("\n");
  }

  function isClosingMarkdownFence(line, fenceChar, fenceLength) {
    const match = String(line || "").match(/^\s*([`~]{3,})\s*$/);
    return Boolean(match && match[1][0] === fenceChar && match[1].length >= fenceLength);
  }

  function makeFence(code) {
    const longestRun = Math.max(0, ...[...String(code).matchAll(/`+/g)].map((match) => match[0].length));
    return "`".repeat(Math.max(3, longestRun + 1));
  }

  function uniqueElements(elements) {
    return [...new Set(elements.filter(Boolean))];
  }

  function uniqueTopLevelElements(elements) {
    const sorted = uniqueElements(elements).sort(compareDocumentOrder);
    const result = [];

    for (const element of sorted) {
      if (result.some((existing) => existing.contains(element))) {
        continue;
      }

      for (let index = result.length - 1; index >= 0; index -= 1) {
        if (element.contains(result[index])) {
          result.splice(index, 1);
        }
      }

      result.push(element);
    }

    return result;
  }

  function trimTrailingNewlines(text) {
    return String(text || "").replace(/\n+$/g, "");
  }

  function markdownTableRow(cells) {
    return `| ${cells.join(" | ")} |`;
  }

  function padRow(row, length) {
    return [...row, ...Array.from({ length: length - row.length }, () => "")];
  }

  function escapeTableCell(text) {
    return sanitizeTableCellMarkdown(text).replace(/\|/g, "\\|");
  }

  function sanitizeTableCellMarkdown(text) {
    return String(text || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/\[!\\?\[[^\]\n]*\\?\]\([^)]+\)\s*([^\]]*?)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => formatCleanPdfMarkdownLink(label, url))
      .replace(/!\\?\[[^\]\n]*\\?\]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => formatCleanPdfMarkdownLink(label, url))
      .replace(/[ \t]*\r?\n+[ \t]*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function escapeMarkdownLinkLabel(text) {
    return String(text || "").replace(/[[\]\\]/g, "\\$&");
  }

  function escapeHtmlComment(text) {
    return String(text || "").replace(/--/g, "- -").replace(/[<>]/g, "");
  }

  function escapeYaml(text) {
    return String(text || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function escapeRegExp(text) {
    return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cssString(text) {
    return String(text || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function sanitizeFilename(name) {
    return String(name || "chatgpt-conversation")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim()
      || "chatgpt-conversation";
  }

  function sanitizeAltText(text) {
    return String(text || "image").replace(/\s+/g, " ").trim().slice(0, 120) || "image";
  }

  function sanitizeCssClass(text) {
    return String(text || "message").toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "message";
  }

  function formatRole(role) {
    const normalized = String(role || "message").toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function hashString(text) {
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
})();
