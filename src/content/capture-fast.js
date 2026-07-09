  async function collectFastConversationMessages(debugLog = null) {
    const conversationId = getCurrentConversationId();

    if (!conversationId) {
      throw new Error("No conversation id was found in the current URL.");
    }

    const data = await fetchConversationData(conversationId, {
      timeoutMs: CONVERSATION_API_FETCH_TIMEOUT_MS,
      debugLog
    });
    const messages = buildMessagesFromConversationApi(data, debugLog);

    debugLog?.event("fastCapture.loaded", {
      conversationId,
      apiSource: data?.__convoVaultApiSource || "",
      mappingCount: Object.keys(getConversationApiMapping(data)).length,
      linearMessageCount: getConversationApiLinearMessages(data).length,
      messageCount: messages.length
    });

    return messages;
  }

  function buildMessagesFromConversationApi(data, debugLog = null) {
    const pathNodes = getConversationApiCurrentPath(data);
    const messages = [];
    const filterStats = {};

    for (const node of pathNodes) {
      const message = node?.message;
      const role = normalizeApiRole(message?.author?.role);

      const structuralSkipReason = getApiMessageStructuralSkipReason(message, role);
      if (structuralSkipReason) {
        incrementReasonCount(filterStats, structuralSkipReason);
        continue;
      }

      const markdown = cleanMarkdown([
        extractApiContentMarkdown(message.content),
        extractApiAttachmentMarkdown(message)
      ].filter(Boolean).join("\n\n"));
      const thinkingMarkdown = cleanMarkdown(extractApiThinkingMarkdown(message));

      if (!markdown && !thinkingMarkdown) {
        continue;
      }

      const contentSkipReason = getApiMessageContentSkipReason(message, role, markdown);
      if (contentSkipReason) {
        incrementReasonCount(filterStats, contentSkipReason);
        continue;
      }

      const turnNumber = messages.length + 1;
      const id = message.id || node.id || `api-message-${turnNumber}`;

      messages.push({
        id,
        role,
        order: turnNumber,
        turnNumber,
        conversationOrder: turnNumber,
        timestamp: formatConversationTimestamp(
          message.create_time ??
          message.update_time ??
          message.metadata?.create_time ??
          message.metadata?.timestamp
        ),
        markdown,
        thinkingMarkdown,
        preview: truncatePreview(cleanMarkdown(`${markdown}\n${thinkingMarkdown}`), 180),
        sourceMessageId: message.id || "",
        sourceTurnId: node.id || "",
        sourceNode: null,
        codeBlockCount: getCodeBlockDiagnostics(markdown, thinkingMarkdown).length,
        fileCount: countApiFileAttachments(message),
        imageCount: countMarkdownImages(markdown),
        imagesEmbedded: 0,
        imagesFailed: 0,
        captureMode: "fast"
      });
    }

    debugLog?.event("fastCapture.path", {
      pathNodeCount: pathNodes.length,
      exportedMessageCount: messages.length
    });

    if (Object.keys(filterStats).length) {
      debugLog?.event("fastCapture.filteredSummary", {
        filtered: filterStats
      });
    }

    return messages;
  }

  function getApiMessageStructuralSkipReason(message, role) {
    if (!message) {
      return "missing-message";
    }

    if (!role) {
      return "unsupported-role";
    }

    const metadata = message.metadata || {};
    const authorMetadata = message.author?.metadata || {};
    const contentType = normalizeApiField(message.content?.content_type || message.content?.contentType);
    const recipient = normalizeApiField(
      message.recipient
      || metadata.recipient
      || authorMetadata.recipient
    );
    const channel = normalizeApiField(
      message.channel
      || metadata.channel
      || authorMetadata.channel
    );
    const messageType = normalizeApiField(metadata.message_type || metadata.messageType || authorMetadata.message_type);

    if (
      isTruthyApiFlag(metadata.is_visually_hidden_from_conversation)
      || isTruthyApiFlag(metadata.is_hidden)
      || isTruthyApiFlag(metadata.hidden)
      || isTruthyApiFlag(authorMetadata.is_visually_hidden_from_conversation)
      || isTruthyApiFlag(authorMetadata.is_hidden)
      || isTruthyApiFlag(authorMetadata.hidden)
    ) {
      return "hidden";
    }

    if (role === "assistant" && message.end_turn === false) {
      return "assistant-not-final";
    }

    if (role === "assistant" && recipient && !isFinalAssistantRecipient(recipient)) {
      return `recipient:${recipient}`;
    }

    if (role === "assistant" && channel && !isFinalAssistantChannel(channel)) {
      return `channel:${channel}`;
    }

    if (messageType && isInternalApiMessageType(messageType)) {
      return `message-type:${messageType}`;
    }

    if (contentType && !isExportableApiContentType(contentType)) {
      return `content-type:${contentType}`;
    }

    return "";
  }

  function getApiMessageContentSkipReason(message, role, markdown) {
    if (role !== "assistant") {
      return "";
    }

    if (message?.end_turn === true) {
      return "";
    }

    return looksLikeInternalApiToolCall(markdown) ? "tool-call-text" : "";
  }

  function normalizeApiField(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isTruthyApiFlag(value) {
    return value === true || String(value || "").toLowerCase() === "true";
  }

  function isFinalAssistantRecipient(recipient) {
    return ["", "all", "assistant", "user"].includes(recipient);
  }

  function isFinalAssistantChannel(channel) {
    return ["", "all", "final"].includes(channel);
  }

  function isInternalApiMessageType(messageType) {
    return [
      "browser_result",
      "code",
      "execution",
      "execution_output",
      "search_query",
      "search_result",
      "system",
      "tool",
      "tool_call",
      "tool_result"
    ].includes(messageType);
  }

  function isExportableApiContentType(contentType) {
    return [
      "multimodal_text",
      "text"
    ].includes(contentType);
  }

  function looksLikeInternalApiToolCall(markdown) {
    const text = String(markdown || "").trim();

    return /^search\(/i.test(text)
      || /^\{\s*"search_query"\s*:/i.test(text)
      || /^\{\s*"queries"\s*:/i.test(text);
  }

  function incrementReasonCount(stats, reason) {
    if (!isReportableApiSkipReason(reason)) {
      return;
    }

    stats[reason] = (stats[reason] || 0) + 1;
  }

  function isReportableApiSkipReason(reason) {
    return !["missing-message", "unsupported-role"].includes(reason);
  }

  function getConversationApiCurrentPath(data) {
    const mapping = getConversationApiMapping(data);
    const currentNode = getConversationApiCurrentNode(data);
    const path = [];
    const seen = new Set();
    let nodeId = currentNode;

    while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
      seen.add(nodeId);
      const node = mapping[nodeId];
      path.push(node);
      nodeId = node.parent || node.parent_id || "";
    }

    if (path.length) {
      return path.reverse();
    }

    if (Object.keys(mapping).length) {
      return Object.values(mapping);
    }

    return getConversationApiLinearMessages(data)
      .map((message, index) => ({
        id: message?.id || `api-message-${index + 1}`,
        message
      }));
  }

  function getConversationApiMapping(data) {
    const candidates = [
      data?.mapping,
      data?.conversation?.mapping,
      data?.data?.mapping
    ];

    return candidates.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
  }

  function getConversationApiCurrentNode(data) {
    return data?.current_node
      || data?.currentNode
      || data?.conversation?.current_node
      || data?.conversation?.currentNode
      || data?.data?.current_node
      || data?.data?.currentNode
      || "";
  }

  function getConversationApiLinearMessages(data) {
    const candidates = [
      data?.messages,
      data?.items,
      data?.linear_conversation,
      data?.linearConversation,
      data?.conversation?.messages,
      data?.conversation?.items,
      data?.conversation?.linear_conversation,
      data?.data?.messages,
      data?.data?.items,
      data?.data?.linear_conversation
    ];

    return candidates
      .find(Array.isArray)
      ?.map((item) => item?.message || item)
      .filter((message) => message && typeof message === "object") || [];
  }

  function normalizeApiRole(role) {
    const normalized = String(role || "").toLowerCase();

    if (normalized === "user" || normalized === "assistant") {
      return normalized;
    }

    return "";
  }

  function extractApiContentMarkdown(content) {
    if (!content || typeof content !== "object") {
      return "";
    }

    const parts = Array.isArray(content.parts) ? content.parts : [];

    if (parts.length) {
      return cleanMarkdown(parts
        .map((part) => apiContentPartToMarkdown(part))
        .filter(Boolean)
        .join("\n\n"));
    }

    const candidates = [
      content.text,
      content.result,
      content.summary,
      content.value
    ].filter((value) => typeof value === "string" && value.trim());

    return cleanMarkdown(candidates.join("\n\n"));
  }

  function apiContentPartToMarkdown(part) {
    if (typeof part === "string") {
      return part;
    }

    if (!part || typeof part !== "object") {
      return "";
    }

    const assetPointer = part.asset_pointer || part.assetPointer || part.url || "";

    if (assetPointer) {
      const label = sanitizeApiMarkdownLabel(
        part.name
        || part.file_name
        || part.filename
        || part.title
        || "Image"
      );

      if (/image|img|picture/i.test(`${part.content_type || ""} ${part.mime_type || ""} ${assetPointer}`)) {
        return `![${label}](${assetPointer})`;
      }

      return `[Attachment: ${assetPointer}]`;
    }

    const textCandidates = [
      part.text,
      part.content,
      part.transcript,
      part.caption,
      part.name
    ].filter((value) => typeof value === "string" && value.trim());

    if (textCandidates.length) {
      return textCandidates.join("\n\n");
    }

    return "";
  }

  function extractApiAttachmentMarkdown(message) {
    const attachments = getApiAttachmentObjects(message);
    const hasImageAssetPointer = getApiMessageImageAssetPointers(message).length > 0;
    const lines = attachments
      .map((attachment) => hasImageAssetPointer && isApiImageAttachment(attachment)
        ? ""
        : formatApiAttachmentMarkdown(attachment)
      )
      .filter(Boolean);

    return uniqueStrings(lines).join("\n");
  }

  function getApiMessageImageAssetPointers(message) {
    const parts = Array.isArray(message?.content?.parts) ? message.content.parts : [];

    return parts
      .filter((part) => part && typeof part === "object")
      .map((part) => {
        const assetPointer = part.asset_pointer || part.assetPointer || part.url || "";
        const descriptor = [
          part.content_type,
          part.contentType,
          part.mime_type,
          part.mimeType,
          part.name,
          part.file_name,
          part.filename,
          part.title,
          assetPointer
        ].join(" ");

        return /image|img|picture|\bpng\b|\bjpe?g\b|\bwebp\b|\bgif\b/i.test(descriptor)
          ? assetPointer
          : "";
      })
      .filter(Boolean);
  }

  function getApiAttachmentObjects(message) {
    const metadata = message?.metadata || {};
    const candidates = [
      metadata.attachments,
      metadata.files,
      metadata.uploaded_files,
      metadata.uploadedFiles
    ];

    return candidates
      .filter(Array.isArray)
      .flat()
      .filter((attachment) => attachment && typeof attachment === "object");
  }

  function formatApiAttachmentMarkdown(attachment) {
    const name = attachment.name
      || attachment.file_name
      || attachment.filename
      || attachment.title
      || attachment.id
      || "";
    const url = attachment.url || attachment.download_url || attachment.file_url || "";

    if (!name && !url) {
      return "";
    }

    return url
      ? `[File: ${sanitizeFileAttachmentName(name || filenameFromUrl(url) || "attachment")}](${url})`
      : `[File: ${sanitizeFileAttachmentName(name)}]`;
  }

  function countApiFileAttachments(message) {
    const hasImageAssetPointer = getApiMessageImageAssetPointers(message).length > 0;
    return getApiAttachmentObjects(message)
      .filter((attachment) => !(hasImageAssetPointer && isApiImageAttachment(attachment)))
      .length;
  }

  function isApiImageAttachment(attachment) {
    const haystack = [
      attachment?.mime_type,
      attachment?.mimeType,
      attachment?.content_type,
      attachment?.contentType,
      attachment?.name,
      attachment?.file_name,
      attachment?.filename,
      attachment?.title,
      attachment?.url,
      attachment?.download_url,
      attachment?.file_url
    ].join(" ");

    return /\bimage\//i.test(haystack) || /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)(?:$|[?#])/i.test(haystack);
  }

  function sanitizeApiMarkdownLabel(value) {
    return String(value || "Image")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
      .replace(/[[\]\\]/g, "\\$&")
      || "Image";
  }

  function extractApiThinkingMarkdown(message) {
    const metadata = message?.metadata || {};
    const candidates = [
      metadata.reasoning,
      metadata.reasoning_content,
      metadata.thinking,
      metadata.thinking_text,
      metadata.thoughts
    ];

    return candidates
      .filter((value) => typeof value === "string" && value.trim())
      .join("\n\n");
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

  async function fetchConversationData(conversationId, options = {}) {
    const debugLog = options.debugLog || null;
    const timeoutMs = Number(options.timeoutMs || CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS);
    const attemptTimeoutMs = Math.min(timeoutMs, CONVERSATION_API_ATTEMPT_TIMEOUT_MS);
    const accessToken = await getChatGptAccessToken(debugLog, attemptTimeoutMs);
    const attempts = buildConversationApiAttempts(conversationId, accessToken);
    const failures = [];

    debugLog?.event("conversationApi.probe.start", {
      conversationId,
      attempts: attempts.length,
      accessTokenAvailable: Boolean(accessToken)
    });

    for (const attempt of attempts) {
      try {
        const data = await fetchConversationApiAttempt(attempt, attemptTimeoutMs);
        const mapping = getConversationApiMapping(data);
        const linearMessages = getConversationApiLinearMessages(data);
        const mappingCount = Object.keys(mapping).length;

        if (!mappingCount && !linearMessages.length) {
          failures.push(`${attempt.label}: empty response`);
          debugLog?.event("conversationApi.probe.empty", {
            label: attempt.label
          });
          continue;
        }

        Object.defineProperty(data, "__convoVaultApiSource", {
          value: attempt.label,
          enumerable: false,
          configurable: true
        });
        debugLog?.event("conversationApi.probe.success", {
          label: attempt.label,
          mappingCount,
          linearMessageCount: linearMessages.length
        });
        return data;
      } catch (error) {
        const reason = error?.message || String(error);
        failures.push(`${attempt.label}: ${reason}`);
        debugLog?.event("conversationApi.probe.failed", {
          label: attempt.label,
          reason
        });
      }
    }

    throw new Error(`Conversation API attempts failed after ${failures.length} route(s): ${summarizeConversationApiFailures(failures)}.`);
  }

  function summarizeConversationApiFailures(failures) {
    const counts = new Map();

    for (const failure of failures) {
      const reason = String(failure || "").split(": ").slice(1).join(": ") || "unknown";
      const key = reason
        .replace(/bearer:[^;]+/g, "bearer route")
        .replace(/cookie:[^;]+/g, "cookie route");
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([reason, count]) => count > 1 ? `${reason} x${count}` : reason)
      .join(", ");
  }

  function buildConversationApiAttempts(conversationId, accessToken = "") {
    const encodedId = encodeURIComponent(conversationId);
    const paths = uniqueStrings([
      `/backend-api/conversation/${encodedId}?tree_format=true`,
      `/backend-api/conversation/${encodedId}`,
      `/backend-api/conversation/${encodedId}?tree_format=false`,
      `/backend-api/conversation/${encodedId}?include_system_messages=true`,
      `/backend-api/conversation/${encodedId}?tree_format=true&include_system_messages=true`,
      ...buildConversationRouteDataPaths()
    ]);
    const authModes = accessToken ? ["bearer", "cookie"] : ["cookie"];
    const attempts = [];

    for (const authMode of authModes) {
      for (const path of paths) {
        const url = new URL(path, location.origin);
        const isRouteData = url.searchParams.has("_data");
        attempts.push({
          label: `${authMode}:${url.pathname}${url.search}`,
          url: url.href,
          authMode,
          accessToken,
          headers: isRouteData ? { "x-remix-request": "yes" } : {}
        });
      }
    }

    return attempts;
  }

  function buildConversationRouteDataPaths() {
    const routes = getConversationRouteDataNames();
    return routes.map((routeName) => {
      const url = new URL(location.href);
      url.searchParams.set("_data", routeName);
      return `${url.pathname}${url.search}`;
    });
  }

  function getConversationRouteDataNames() {
    const pathParts = location.pathname.split("/").map(decodePathPart).filter(Boolean);
    const hasGizmoRoute = pathParts.includes("g") && pathParts.includes("c");
    const routes = [
      "routes/_conversation.c.$conversationId",
      "routes/_conversation"
    ];

    if (hasGizmoRoute) {
      routes.unshift("routes/_conversation.g.$gizmoId.c.$conversationId");
    }

    return uniqueStrings(routes);
  }

  async function fetchConversationApiAttempt(attempt, timeoutMs) {
    const headers = {
      accept: "application/json",
      ...(attempt.headers || {})
    };

    if (attempt.authMode === "bearer" && attempt.accessToken) {
      headers.authorization = `Bearer ${attempt.accessToken}`;
    }

    const response = await fetchWithTimeout(attempt.url, {
      timeoutMs,
      credentials: "include",
      cache: "no-store",
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return parseConversationApiResponse(response);
  }

  async function parseConversationApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`non-json response (${contentType || "unknown content-type"})`);
    }
  }

  let cachedChatGptAccessToken = "";
  let chatGptAccessTokenLoaded = false;

  async function getChatGptAccessToken(debugLog = null, timeoutMs = CONVERSATION_API_ATTEMPT_TIMEOUT_MS) {
    if (chatGptAccessTokenLoaded) {
      return cachedChatGptAccessToken;
    }

    chatGptAccessTokenLoaded = true;

    try {
      const url = new URL("/api/auth/session", location.origin);
      const response = await fetchWithTimeout(url.href, {
        timeoutMs,
        credentials: "include",
        cache: "no-store",
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        debugLog?.event("conversationApi.token.failed", { status: response.status });
        return "";
      }

      const session = await response.json();
      cachedChatGptAccessToken = extractAccessTokenFromSession(session);
      debugLog?.event("conversationApi.token.loaded", {
        available: Boolean(cachedChatGptAccessToken)
      });
      return cachedChatGptAccessToken;
    } catch (error) {
      debugLog?.event("conversationApi.token.failed", {
        error: error?.message || String(error)
      });
      return "";
    }
  }

  function extractAccessTokenFromSession(session) {
    const candidates = [
      session?.accessToken,
      session?.access_token,
      session?.token,
      session?.user?.accessToken,
      session?.user?.access_token
    ];

    return String(candidates.find((value) => typeof value === "string" && value.length > 20) || "");
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), Number(options.timeoutMs || CONVERSATION_API_ATTEMPT_TIMEOUT_MS));

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("timeout");
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
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
