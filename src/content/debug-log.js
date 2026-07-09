  function createDebugLog(options = {}) {
    const startedAt = new Date();
    const events = [];
    const isDetailed = options.detailed ?? DETAILED_DEBUG_LOG;
    const maxEvents = options.maxEvents || DEBUG_EVENT_LIMIT;
    let captureMode = normalizeCaptureMode(options.captureMode);
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
      setCaptureMode(value) {
        captureMode = normalizeCaptureMode(value);
      },
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
        const roleSequenceDiagnostics = getRoleSequenceDiagnostics(messages);
        const effectiveTurnCount = messages.length;
        const availableTurnOrders = getAvailableConversationTurnOrders();
        const expectedTurnOrders = availableTurnOrders.length
          ? availableTurnOrders
          : pageTurnDiagnostics.dataTurnIdCount
            ? Array.from({ length: pageTurnDiagnostics.dataTurnIdCount }, (_, index) => index + 1)
            : capturedTurnOrders;
        const expectedTurnCount = expectedTurnOrders.length || pageTurnDiagnostics.dataTurnIdCount || effectiveTurnCount;
        const missingTurnOrders = expectedTurnOrders.filter((order) => !capturedTurnOrderSet.has(order));
        finalSummary = {
          captureMode,
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
          availableTurnCount: availableTurnOrders.length,
          expectedTurnCount,
          effectiveTurnCount,
          extractionRateFromDataTurnId: pageTurnDiagnostics.dataTurnIdCount
            ? Number((messages.length / pageTurnDiagnostics.dataTurnIdCount).toFixed(3))
            : null,
          extractionRateFromExpectedTurns: expectedTurnCount
            ? Number((messages.length / expectedTurnCount).toFixed(3))
            : null,
          roleSequenceDiagnostics,
          capturedTurnOrders,
          missingTurnOrders
        };
      },
      getFinalSummary() {
        return finalSummary;
      },
      toJSON() {
        return {
          exporterVersion: EXPORTER_VERSION,
          captureMode,
          features: {
            conversationTimestampApi: true,
            visibleThinkingFlyoutCapture: true,
            autoOpenThinkingFlyouts: true,
            thinkingFlyoutAutoOpenLimit: THINKING_FLYOUT_AUTO_OPEN_LIMIT,
            pdfEngine: "advanced-local-chrome"
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
            captureMode,
            messages: exportMessages
          },
          messageDiagnostics,
          events
        };
      }
    };
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
