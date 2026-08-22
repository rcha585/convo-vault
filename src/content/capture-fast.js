  async function collectFastConversationMessages(debugLog = null, options = {}) {
    const signal = options.signal || null;
    throwIfCaptureCancelled(signal);
    const conversationId = getCurrentConversationId();

    if (!conversationId) {
      throw new Error("No conversation id was found in the current URL.");
    }

    const data = await fetchConversationData(conversationId, {
      timeoutMs: CONVERSATION_API_FETCH_TIMEOUT_MS,
      debugLog,
      signal
    });
    throwIfCaptureCancelled(signal);
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
    let pendingAssistantNodes = [];
    let directThinkingMessageCount = 0;

    function flushAssistantTurn() {
      if (!pendingAssistantNodes.length) {
        return;
      }

      const synthesized = synthesizeAssistantTurn(pendingAssistantNodes, messages.length + 1);
      pendingAssistantNodes = [];

      if (!synthesized) {
        return;
      }

      if (synthesized.thinkingMarkdown) {
        directThinkingMessageCount += 1;
      }

      messages.push(synthesized);
    }

    for (const node of pathNodes) {
      const message = node?.message;
      if (!message) {
        incrementReasonCount(filterStats, "missing-message");
        continue;
      }

      const rawRole = String(message.author?.role || "").toLowerCase();
      const metadata = message.metadata || {};
      const authorMetadata = message.author?.metadata || {};

      if (
        isTruthyApiFlag(metadata.is_visually_hidden_from_conversation)
        || isTruthyApiFlag(metadata.is_hidden)
        || isTruthyApiFlag(metadata.hidden)
        || isTruthyApiFlag(authorMetadata.is_visually_hidden_from_conversation)
        || isTruthyApiFlag(authorMetadata.is_hidden)
        || isTruthyApiFlag(authorMetadata.hidden)
      ) {
        incrementReasonCount(filterStats, "hidden");
        continue;
      }

      if (rawRole === "user") {
        flushAssistantTurn();

        const turnNumber = messages.length + 1;
        const id = message.id || node.id || `api-message-${turnNumber}`;
        const markdown = cleanApiMarkdown([
          extractApiContentMarkdown(message.content),
          extractApiAttachmentMarkdown(message)
        ].filter(Boolean).join("\n\n"));

        messages.push({
          id,
          role: "user",
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
          thinkingMarkdown: "",
          preview: truncatePreview(markdown, 180),
          sourceMessageId: message.id || "",
          sourceTurnId: node.id || "",
          sourceNode: null,
          codeBlockCount: getCodeBlockDiagnostics(markdown, "").length,
          fileCount: countApiFileAttachments(message),
          imageCount: countMarkdownImages(markdown),
          imagesEmbedded: 0,
          imagesDeferred: countMarkdownImages(markdown),
          imagesFailed: 0,
          captureMode: "fast"
        });
      } else if (rawRole === "assistant" || rawRole === "tool") {
        if (message.end_turn === false) {
          incrementReasonCount(filterStats, "assistant-not-final");
        }
        pendingAssistantNodes.push(node);
      }
    }

    flushAssistantTurn();

    debugLog?.event("fastCapture.path", {
      pathNodeCount: pathNodes.length,
      exportedMessageCount: messages.length
    });

    if (Object.keys(filterStats).length) {
      debugLog?.event("fastCapture.filteredSummary", {
        filtered: filterStats
      });
    }

    if (directThinkingMessageCount) {
      debugLog?.event("fastCapture.thinkingMerged", {
        applied: directThinkingMessageCount
      });
    }

    return messages;
  }

  function synthesizeAssistantTurn(nodes, turnNumber) {
    if (!nodes.length) {
      return null;
    }

    let primaryMessage = null;
    const textParts = [];
    const thinkingParts = [];
    const imagePointers = [];
    const fileEntries = [];
    const citations = [];
    const memories = [];
    let maxDurationSec = 0;
    let turnId = "";
    let timestamp = null;

    // First pass: locate the primary final assistant message if present
    for (const node of nodes) {
      const msg = node?.message;
      if (!msg) continue;
      const role = String(msg.author?.role || "").toLowerCase();
      if (role === "assistant") {
        if (!turnId) turnId = msg.id || node.id;
        if (!timestamp) {
          timestamp = msg.create_time ?? msg.update_time ?? msg.metadata?.create_time ?? msg.metadata?.timestamp;
        }
        if (msg.channel === "final" || msg.end_turn === true || !primaryMessage) {
          primaryMessage = msg;
        }
      }
    }

    // Second pass: aggregate all thinking, content, citations, memories, files, and images across nodes
    for (const node of nodes) {
      const msg = node?.message;
      if (!msg) continue;

      const metadata = msg.metadata || {};
      const duration = Number(metadata.finished_duration_sec || metadata.thinking_duration_seconds || 0);
      if (duration > maxDurationSec) {
        maxDurationSec = duration;
      }

      if (Array.isArray(metadata.citations)) {
        citations.push(...metadata.citations);
      }
      if (Array.isArray(metadata.conversation_context_citation_metadata)) {
        memories.push(...metadata.conversation_context_citation_metadata);
      }

      // Collect thinking parts
      const thinkingCandidate = extractApiThinkingMarkdown(msg);
      if (thinkingCandidate) {
        thinkingParts.push(thinkingCandidate);
      }

      // Collect generated files
      const fileCandidate = extractApiGeneratedFilesMarkdown(msg);
      if (fileCandidate) {
        fileEntries.push(fileCandidate);
      }

      // Collect attachments
      const attachmentCandidate = extractApiAttachmentMarkdown(msg);
      if (attachmentCandidate) {
        fileEntries.push(attachmentCandidate);
      }

      const isThinking = isApiThinkingNode(msg);
      const isInternalTool = isApiInternalToolCallNode(msg);

      // Collect text and image parts
      const content = msg.content;
      if (content && typeof content === "object") {
        const parts = Array.isArray(content.parts) ? content.parts : [];
        for (const part of parts) {
          if (typeof part === "string" && part.trim()) {
            if (isThinking) {
              thinkingParts.push(part.trim());
            } else if (
              !isInternalTool
              && !isApiInternalFileIngestionText(part)
              && !looksLikeInternalApiToolCall(part)
              && !looksLikeApiJsonPayload(part)
            ) {
              textParts.push(part.trim());
            }
          } else if (part && typeof part === "object") {
            const ptr = part.asset_pointer || part.assetPointer || part.url || "";
            if (ptr && isApiImageHaystack(`${part.content_type || ""} ${part.mime_type || ""} ${ptr}`)) {
              const label = sanitizeApiMarkdownLabel(part.name || part.filename || part.title || "Image");
              const imgMd = `![${label}](${ptr})`;
              if (!imagePointers.includes(imgMd)) {
                imagePointers.push(imgMd);
              }
            }
          }
        }

        if (!parts.length && typeof content.text === "string" && content.text.trim()) {
          if (isThinking) {
            thinkingParts.push(content.text.trim());
          } else if (
            !isInternalTool
            && !isApiInternalFileIngestionText(content.text)
            && !looksLikeInternalApiToolCall(content.text)
            && !looksLikeApiJsonPayload(content.text)
          ) {
            textParts.push(content.text.trim());
          }
        }
      }
    }

    // Build synthesized markdown
    const combinedProse = uniqueStrings(textParts).join("\n\n");
    const combinedImages = imagePointers.join("\n\n");
    const combinedFiles = uniqueStrings(fileEntries).join("\n\n");

    let markdown = cleanApiMarkdown([
      combinedProse,
      combinedImages,
      combinedFiles
    ].filter(Boolean).join("\n\n"));

    const thinkingMarkdown = cleanApiMarkdown(buildTurnThinkingTimeline(nodes, citations));

    if (primaryMessage) {
      markdown = enrichApiMarkdownWithCitations(markdown, primaryMessage);
      markdown = enrichApiMarkdownWithMemories(markdown, primaryMessage);
    } else if (citations.length || memories.length) {
      markdown = enrichApiMarkdownWithCitations(markdown, { metadata: { citations } });
      markdown = enrichApiMarkdownWithMemories(markdown, { metadata: { conversation_context_citation_metadata: memories } });
    }

    if (!markdown && !thinkingMarkdown) {
      return null;
    }

    const id = turnId || `api-assistant-${turnNumber}`;
    const agentTrace = extractTurnAgentTrace(nodes, citations, memories);

    return {
      id,
      role: "assistant",
      order: turnNumber,
      turnNumber,
      conversationOrder: turnNumber,
      timestamp: formatConversationTimestamp(timestamp),
      markdown,
      thinkingMarkdown,
      agentTrace,
      preview: truncatePreview(cleanMarkdown(`${markdown}\n${thinkingMarkdown}`), 180),
      sourceMessageId: primaryMessage?.id || id,
      sourceTurnId: id,
      sourceNode: null,
      codeBlockCount: getCodeBlockDiagnostics(markdown, thinkingMarkdown).length,
      fileCount: (primaryMessage ? countApiFileAttachments(primaryMessage) : 0) + fileEntries.length,
      imageCount: countMarkdownImages(markdown),
      imagesEmbedded: 0,
      imagesDeferred: countMarkdownImages(markdown),
      imagesFailed: 0,
      captureMode: "fast"
    };
  }

  function isApiThinkingNode(msg) {
    if (!msg) return false;
    const channel = String(msg.channel || msg.metadata?.channel || msg.author?.metadata?.channel || "").toLowerCase();
    const contentType = String(msg.content?.content_type || msg.content?.contentType || "").toLowerCase();
    return (
      channel === "analysis"
      || channel === "reasoning"
      || channel === "commentary"
      || contentType === "thoughts"
      || contentType === "reasoning"
      || contentType === "reasoning_recap"
      || msg.metadata?.is_thinking_preamble_message === true
    );
  }

  function isApiInternalFileIngestionText(text) {
    const str = String(text || "").trim();
    if (!str) return false;
    return (
      /Make sure to include fileL\d+-L\d+ in your response/i.test(str)
      || /Use ref_id "turn\d+file\d+"/i.test(str)
      || /\[L\d+\]\s*<PARSED TEXT FOR PAGE/i.test(str)
      || (/^\[L\d+\]/m.test(str) && /PARSED TEXT/i.test(str))
      || /scoped to this file\.\s*Use `?files\.(?:search|find|read)`?/i.test(str)
      || /Full file size:\s*\d+\s*pages/i.test(str)
    );
  }

  function isApiInternalToolCallNode(msg) {
    if (!msg) return false;
    const recipient = String(msg.recipient || msg.metadata?.recipient || msg.author?.metadata?.recipient || "").toLowerCase();
    const contentType = String(msg.content?.content_type || msg.content?.contentType || "").toLowerCase();
    const messageType = String(msg.metadata?.message_type || msg.metadata?.messageType || "").toLowerCase();
    const role = String(msg.author?.role || "").toLowerCase();
    const name = String(msg.author?.name || "").toLowerCase();

    if (role === "tool" || role === "system") {
      return true;
    }

    if (name.includes("browser") || name.includes("myfiles") || name.includes("search") || name.includes("tool")) {
      return true;
    }

    if (["python", "web.run", "browser", "search", "myfiles_browser", "file_search", "api_tool", "api_tool.search_plugins", "api_tool.call_tool", "api_tool.suggest_installs", "api_tool.list_resources"].some((r) => recipient.includes(r))) {
      return true;
    }

    if (["code", "execution", "tool", "tool_call", "search_query", "search_result"].includes(messageType)) {
      return true;
    }

    if (contentType === "code" && recipient && recipient !== "all") {
      return true;
    }

    const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
    for (const part of parts) {
      if (typeof part === "string" && isApiInternalFileIngestionText(part)) {
        return true;
      }
    }

    return false;
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

  function extractSkippedApiThinkingMarkdown(message, role, skipReason) {
    if (role !== "assistant" || !isPotentialApiThinkingSkipReason(skipReason)) {
      return "";
    }

    const explicitThinking = cleanApiMarkdown(extractApiThinkingMarkdown(message));
    if (explicitThinking) {
      return explicitThinking;
    }

    const markdown = cleanApiMarkdown(extractApiContentMarkdown(message?.content));
    if (!markdown || looksLikeInternalApiToolCall(markdown) || looksLikeApiJsonPayload(markdown)) {
      return "";
    }

    return markdown;
  }

  function isPotentialApiThinkingSkipReason(reason) {
    return reason === "assistant-not-final"
      || reason === "channel:analysis"
      || reason === "channel:reasoning"
      || reason === "content-type:thoughts"
      || reason === "content-type:reasoning";
  }

  function looksLikeApiJsonPayload(markdown) {
    const text = String(markdown || "").trim();
    return /^[{[]/.test(text) && /["'}\]]$/.test(text);
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

  function cleanApiMarkdown(value) {
    return cleanMarkdown(removeApiPrivateUseArtifacts(value));
  }

  function removeApiPrivateUseArtifacts(value) {
    return String(value || "")
      .replace(/[\uE000-\uF8FF]*cite(?:[\uE000-\uF8FF]+turn[0-9A-Za-z_-]+)+[\uE000-\uF8FF]*/gi, "")
      .replace(/[\uE000-\uF8FF]+/g, "")
      .replace(/[ \t]+\n/g, "\n");
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

  function isApiImageHaystack(haystack) {
    const text = String(haystack || "");
    return /\bimage\b|image\/|img|picture|\.(?:png|jpe?g|gif|webp|avif|bmp|svg)(?:$|[?#])|sediment:\/\/|file_000/i.test(text);
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

    return isApiImageHaystack(haystack);
  }

  function sanitizeApiMarkdownLabel(value) {
    return String(value || "Image")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
      .replace(/[[\]\\]/g, "\\$&")
      || "Image";
  }

  function buildTurnThinkingTimeline(nodes, citations = []) {
    const steps = [];
    let maxDurationSec = 0;
    const seenSteps = new Set();

    function addStep(icon, label, content) {
      const cleanContent = String(content || "").trim();
      if (!cleanContent) return;
      const key = `${label}:${cleanContent}`;
      if (seenSteps.has(key)) return;
      seenSteps.add(key);
      steps.push(`- ${icon} **${label}**: ${cleanContent}`);
    }

    for (const node of nodes) {
      const msg = node?.message;
      if (!msg) continue;

      const metadata = msg.metadata || {};
      const duration = Number(metadata.finished_duration_sec || metadata.thinking_duration_seconds || 0);
      if (duration > maxDurationSec) {
        maxDurationSec = duration;
      }

      const channel = String(msg.channel || metadata.channel || "").toLowerCase();
      const isCommentary = channel === "commentary" || msg.metadata?.is_thinking_preamble_message === true;

      // 1. Commentary / Preamble / Analysis
      if (isCommentary) {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const commentaryText = parts.filter((p) => typeof p === "string" && p.trim()).join(" ");
        if (commentaryText && !looksLikeInternalApiToolCall(commentaryText) && !looksLikeApiJsonPayload(commentaryText)) {
          addStep("💬", "分析计划", commentaryText);
        }
      } else if (channel === "analysis" || channel === "reasoning") {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const analysisText = parts.filter((p) => typeof p === "string" && p.trim()).join(" ");
        if (analysisText && !looksLikeInternalApiToolCall(analysisText) && !looksLikeApiJsonPayload(analysisText)) {
          addStep("🧠", "推理思考", analysisText);
        }
      }

      // 2. Tool & Skill Invocations
      const recipient = String(msg.recipient || metadata.recipient || "").toLowerCase();

      if (recipient.includes("google_drive") || recipient.includes("api_tool")) {
        const docCitation = citations.find((c) => c?.metadata?.title || c?.title);
        const docTitle = docCitation?.metadata?.title || docCitation?.title || "";
        addStep("🔌", "调用工具", `**Google Drive** · ${docTitle ? `读取文档《${docTitle}》` : "查询相关文档"}`);
      } else if (recipient === "web.run" || recipient === "browser") {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        let queries = [];
        for (const p of parts) {
          if (typeof p === "string") {
            const match = p.match(/"q(?:uery)?"\s*:\s*"([^"]+)"/g);
            if (match) {
              queries.push(...match.map((m) => m.replace(/.*"([^"]+)"$/, "$1")));
            }
          }
        }
        queries = uniqueStrings(queries);
        addStep("🔍", "网页搜索", queries.length ? `检索 \`${queries.slice(0, 5).join("`, `")}\`` : "联网检索相关行业素材与案例");
      } else if (recipient === "container.exec" || recipient === "python") {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const codeText = parts.filter((p) => typeof p === "string").join(" ");
        if (/slides|pptx/i.test(codeText)) {
          addStep("🎨", "调用技能", "**Slide Generator** · 生成 PPTX 幻灯片演示文稿");
        } else {
          addStep("⚙️", "执行代码", "**Python Sandbox** · 执行数据与资产处理");
        }
      } else if (recipient === "dalle.text2im" || recipient.includes("image")) {
        addStep("🖼️", "生成图像", "**DALL-E** · 渲染多模态视觉设计与图标");
      }

      // 3. Thoughts & Reasoning Summaries
      if (Array.isArray(msg.content?.thoughts)) {
        for (const t of msg.content.thoughts) {
          if (t?.summary) {
            addStep("🧠", "推理思考", t.summary);
          }
        }
      }

      if (Array.isArray(metadata.reasoning_titles)) {
        for (const title of metadata.reasoning_titles) {
          if (title) {
            addStep("🧠", "推理思考", title);
          }
        }
      }

      // Fallback simple string thoughts
      const simpleThoughts = [metadata.reasoning, metadata.reasoning_content, metadata.thinking, metadata.thoughts]
        .filter((v) => typeof v === "string" && v.trim());
      for (const thought of simpleThoughts) {
        if (!looksLikeInternalApiToolCall(thought) && !looksLikeApiJsonPayload(thought)) {
          addStep("🧠", "推理思考", thought);
        }
      }
    }

    if (!steps.length && maxDurationSec === 0) {
      return "";
    }

    const durationPrefix = maxDurationSec > 0
      ? `Worked for ${maxDurationSec >= 60 ? `${Math.floor(maxDurationSec / 60)}m ${maxDurationSec % 60}s` : `${maxDurationSec}s`}`
      : "";

    const header = durationPrefix ? `> 💭 **Thinking Process (${durationPrefix})**` : "> 💭 **Thinking Process**";

    if (!steps.length) {
      return header;
    }

    return `${header}\n>\n` + steps.map((s) => `> ${s}`).join("\n");
  }

  function extractTurnAgentTrace(nodes, citations = [], memories = []) {
    const activities = [];
    const internalToolCalls = [];
    const fileIngestions = [];
    const thinkingNodes = [];
    const searches = [];

    for (const node of nodes) {
      const msg = node?.message;
      if (!msg) continue;
      const role = String(msg.author?.role || "").toLowerCase();
      const recipient = String(msg.recipient || msg.metadata?.recipient || "").toLowerCase();
      const channel = String(msg.channel || msg.metadata?.channel || "").toLowerCase();
      const contentType = String(msg.content?.content_type || "").toLowerCase();
      const metadata = msg.metadata || {};

      // 1. Thinking / Reasoning
      if (channel === "commentary" || channel === "analysis" || channel === "reasoning" || contentType === "thoughts" || isApiThinkingNode(msg)) {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const text = parts.filter((p) => typeof p === "string" && p.trim()).join("\n");
        const duration = Number(metadata.finished_duration_sec || metadata.thinking_duration_seconds || 0);
        thinkingNodes.push({
          nodeId: node.id,
          channel,
          contentType,
          durationSeconds: duration,
          summary: msg.content?.thoughts?.[0]?.summary || "",
          content: text
        });
        activities.push({
          type: "reasoning",
          channel,
          durationSeconds: duration,
          summary: msg.content?.thoughts?.[0]?.summary || "",
          snippet: text.slice(0, 300)
        });
      }

      // 2. Web Searches
      if (recipient === "web.run" || recipient === "browser" || metadata.search_result_groups || metadata.search_results) {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const searchEntry = {
          nodeId: node.id,
          recipient,
          queries: [],
          results: []
        };
        for (const p of parts) {
          if (typeof p === "string") {
            const match = p.match(/"q(?:uery)?"\s*:\s*"([^"]+)"/g);
            if (match) {
              searchEntry.queries.push(...match.map((m) => m.replace(/.*"([^"]+)"$/, "$1")));
            }
          }
        }
        if (Array.isArray(metadata.search_result_groups)) {
          for (const grp of metadata.search_result_groups) {
            if (grp?.search_query) searchEntry.queries.push(grp.search_query);
          }
        }
        if (Array.isArray(metadata.search_results)) {
          for (const r of metadata.search_results) {
            if (r?.url || r?.title) {
              searchEntry.results.push({ title: r.title || "", url: r.url || "", snippet: r.snippet || "" });
            }
          }
        }
        searchEntry.queries = uniqueStrings(searchEntry.queries);
        searches.push(searchEntry);
        activities.push({
          type: "web_search",
          queries: searchEntry.queries,
          resultCount: searchEntry.results.length
        });
      }

      // 3. Tool Calls & Ingestion Slices
      if (role === "tool" || isApiInternalToolCallNode(msg)) {
        const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [msg.content?.text];
        const rawText = parts.filter((p) => typeof p === "string").join("\n");
        const isFileIngest = isApiInternalFileIngestionText(rawText);

        if (isFileIngest) {
          fileIngestions.push({
            nodeId: node.id,
            recipient,
            sizeBytes: rawText.length,
            rawText
          });
          activities.push({
            type: "file_ingestion",
            recipient,
            sizeBytes: rawText.length,
            preview: rawText.slice(0, 200)
          });
        } else {
          internalToolCalls.push({
            nodeId: node.id,
            role,
            recipient,
            rawContent: rawText
          });
          activities.push({
            type: "tool_execution",
            role,
            recipient,
            preview: rawText.slice(0, 200)
          });
        }
      }
    }

    return {
      activityCount: activities.length,
      activities,
      thinkingNodes,
      searches,
      internalToolCalls,
      fileIngestions,
      citations,
      memories
    };
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

    const stringThoughts = candidates
      .filter((value) => typeof value === "string" && value.trim());

    const contentThoughts = Array.isArray(message?.content?.thoughts)
      ? message.content.thoughts
        .map((t) => t?.summary || t?.content || "")
        .filter(Boolean)
      : [];

    const reasoningTitles = Array.isArray(metadata.reasoning_titles)
      ? metadata.reasoning_titles.filter(Boolean)
      : [];

    const durationSec = Number(metadata.finished_duration_sec || metadata.thinking_duration_seconds || 0);
    const durationPrefix = durationSec > 0
      ? `Worked for ${durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`}`
      : "";

    const allThinkingParts = [...stringThoughts, ...contentThoughts];
    if (reasoningTitles.length && !allThinkingParts.length) {
      allThinkingParts.push(...reasoningTitles);
    }

    let thinkingText = allThinkingParts.join("\n\n").trim();
    if (durationPrefix && thinkingText) {
      thinkingText = `> 💭 **Thinking Process (${durationPrefix})**\n>\n` + thinkingText.split("\n").map((line) => `> ${line}`).join("\n");
    } else if (durationPrefix && !thinkingText) {
      thinkingText = `> 💭 **Thinking Process (${durationPrefix})**`;
    }

    return thinkingText;
  }

  function extractApiGeneratedFilesMarkdown(message) {
    const metadata = message?.metadata || {};
    const files = [];

    // Check aggregate_result
    const aggregate = metadata.aggregate_result;
    if (aggregate?.status === "success" && typeof aggregate.final_expression_output === "string") {
      const match = aggregate.final_expression_output.match(/name:\s*([^\n]+)/);
      if (match && !files.some((f) => f.name === match[1].trim())) {
        files.push({ name: match[1].trim(), url: "" });
      }
    }

    // Check sandbox files in parts
    const parts = Array.isArray(message?.content?.parts) ? message.content.parts : [];
    for (const part of parts) {
      if (typeof part === "string") {
        const sandboxMatches = [...part.matchAll(/\[([^\]]+)\]\((sandbox:[^)]+)\)/g)];
        for (const match of sandboxMatches) {
          if (!files.some((f) => f.url === match[2])) {
            files.push({ name: match[1], url: match[2] });
          }
        }
      }
    }

    if (!files.length) {
      return "";
    }

    return files.map((file) => file.url ? `📥 **Generated File**: [${file.name}](${file.url})` : `📥 **Generated Artifact**: ${file.name}`).join("\n");
  }

  function enrichApiMarkdownWithCitations(markdown, message) {
    const citations = Array.isArray(message?.metadata?.citations) ? message.metadata.citations : [];
    if (!citations.length) {
      return markdown;
    }

    let enriched = markdown;
    const footnotes = [];

    citations.forEach((citation, index) => {
      const footnoteIndex = index + 1;
      const title = citation?.metadata?.title
        || citation?.title
        || citation?.metadata?.name
        || citation?.name
        || `Source ${footnoteIndex}`;
      const url = citation?.metadata?.url
        || citation?.url
        || citation?.metadata?.cloud_doc_url
        || citation?.metadata?.extra?.url
        || citation?.metadata?.search_result?.url
        || citation?.metadata?.search_result?.link
        || citation?.link
        || "";

      if (url) {
        footnotes.push(`[^${footnoteIndex}]: [${title}](${url})`);
      } else {
        footnotes.push(`[^${footnoteIndex}]: 📄 **Document**: ${title}`);
      }

      // Replace matching citation tokens if present
      const markerPattern = new RegExp(`fileciteturn\\d+file\\d+L\\d+-L\\d+|fileciteturn\\d+file\\d+`, "g");
      enriched = enriched.replace(markerPattern, `[^${footnoteIndex}]`);
    });

    // Remove any remaining raw citation tokens and normalize footnote spacing
    enriched = enriched
      .replace(/fileciteturn\w+/gi, "")
      .replace(/[ \t]+(\[\^\d+\])/g, " $1");

    if (footnotes.length) {
      enriched = enriched.trim() + "\n\n" + footnotes.join("\n");
    }

    return enriched;
  }

  function enrichApiMarkdownWithMemories(markdown, message) {
    const memories = Array.isArray(message?.metadata?.conversation_context_citation_metadata)
      ? message.metadata.conversation_context_citation_metadata
      : [];

    let enriched = markdown.replace(/memcite/gi, "");

    if (!memories.length) {
      return enriched;
    }

    const memoryLines = memories
      .map((item) => {
        const citation = item?.citation;
        if (!citation) return "";
        const title = citation.title || citation.snippet || "";
        const attribution = citation.attribution || "Memory";
        const url = citation.url || "";
        return url
          ? `> - **${attribution}**: [${title}](${url})`
          : `> - **${attribution}**: ${title}`;
      })
      .filter(Boolean);

    if (memoryLines.length) {
      enriched = enriched.trim() + "\n\n> 🧠 **Memory & Context**:\n" + memoryLines.join("\n");
    }

    return enriched;
  }

  async function enrichMessageTimestamps(messages, debugLog = null, options = {}) {
    const signal = options.signal || null;
    throwIfCaptureCancelled(signal);
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
      const data = await fetchConversationData(conversationId, { signal });
      throwIfCaptureCancelled(signal);
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
      if (isCaptureCancelledError(error)) {
        throw error;
      }
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
    const signal = options.signal || null;
    throwIfCaptureCancelled(signal);
    const timeoutMs = Number(options.timeoutMs || CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS);
    const attemptTimeoutMs = Math.min(timeoutMs, CONVERSATION_API_ATTEMPT_TIMEOUT_MS);
    const accessToken = await getChatGptAccessToken(debugLog, attemptTimeoutMs, signal);
    throwIfCaptureCancelled(signal);
    const attempts = buildConversationApiAttempts(conversationId, accessToken);
    const failures = [];

    debugLog?.event("conversationApi.probe.start", {
      conversationId,
      attempts: attempts.length,
      accessTokenAvailable: Boolean(accessToken)
    });

    for (const attempt of attempts) {
      throwIfCaptureCancelled(signal);
      try {
        const data = await fetchConversationApiAttempt(attempt, attemptTimeoutMs, signal);
        throwIfCaptureCancelled(signal);
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
        if (isCaptureCancelledError(error)) {
          throw error;
        }
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

  async function fetchConversationApiAttempt(attempt, timeoutMs, signal = null) {
    const headers = {
      accept: "application/json",
      ...(attempt.headers || {})
    };

    if (attempt.authMode === "bearer" && attempt.accessToken) {
      headers.authorization = `Bearer ${attempt.accessToken}`;
    }

    const response = await fetchWithTimeout(attempt.url, {
      timeoutMs,
      signal,
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

  async function getChatGptAccessToken(debugLog = null, timeoutMs = CONVERSATION_API_ATTEMPT_TIMEOUT_MS, signal = null) {
    throwIfCaptureCancelled(signal);
    if (chatGptAccessTokenLoaded) {
      return cachedChatGptAccessToken;
    }

    chatGptAccessTokenLoaded = true;

    try {
      const url = new URL("/api/auth/session", location.origin);
      const response = await fetchWithTimeout(url.href, {
        timeoutMs,
        signal,
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
      if (isCaptureCancelledError(error)) {
        chatGptAccessTokenLoaded = false;
        throw error;
      }
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
    const externalSignal = options.signal || null;
    const timeoutMs = Number(options.timeoutMs || CONVERSATION_API_ATTEMPT_TIMEOUT_MS);
    let timedOut = false;
    const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);

    throwIfCaptureCancelled(externalSignal);
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = options;
      return await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        if (externalSignal?.aborted) {
          throw createCaptureCancelledError(externalSignal.reason);
        }
        throw new Error("timeout");
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
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
