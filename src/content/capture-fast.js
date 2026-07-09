  async function collectFastConversationMessages(debugLog = null) {
    const conversationId = getCurrentConversationId();

    if (!conversationId) {
      throw new Error("No conversation id was found in the current URL.");
    }

    const data = await fetchConversationData(conversationId, {
      timeoutMs: CONVERSATION_API_FETCH_TIMEOUT_MS
    });
    const messages = buildMessagesFromConversationApi(data, debugLog);

    debugLog?.event("fastCapture.loaded", {
      conversationId,
      mappingCount: data?.mapping && typeof data.mapping === "object" ? Object.keys(data.mapping).length : 0,
      messageCount: messages.length
    });

    return messages;
  }

  function buildMessagesFromConversationApi(data, debugLog = null) {
    const pathNodes = getConversationApiCurrentPath(data);
    const messages = [];

    for (const node of pathNodes) {
      const message = node?.message;
      const role = normalizeApiRole(message?.author?.role);

      if (!message || !role) {
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

    return messages;
  }

  function getConversationApiCurrentPath(data) {
    const mapping = data?.mapping && typeof data.mapping === "object" ? data.mapping : {};
    const currentNode = data?.current_node || data?.currentNode || "";
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

    return Object.values(mapping);
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

    const assetPointer = part.asset_pointer || part.assetPointer || part.url || "";

    if (/image|img|picture/i.test(`${part.content_type || ""} ${part.mime_type || ""} ${assetPointer}`)) {
      return `[Image: ${assetPointer || "image attachment"}]`;
    }

    if (assetPointer) {
      return `[Attachment: ${assetPointer}]`;
    }

    return "";
  }

  function extractApiAttachmentMarkdown(message) {
    const attachments = getApiAttachmentObjects(message);
    const lines = attachments
      .map((attachment) => formatApiAttachmentMarkdown(attachment))
      .filter(Boolean);

    return uniqueStrings(lines).join("\n");
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
    return getApiAttachmentObjects(message).length;
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
    const url = new URL(`/backend-api/conversation/${encodeURIComponent(conversationId)}`, location.origin);
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS);
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

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
