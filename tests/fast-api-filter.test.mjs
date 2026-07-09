import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("Fast API parser filters hidden and internal assistant nodes", async () => {
  const fast = await loadFastCaptureModule();
  const events = [];
  const data = {
    current_node: "final-answer",
    mapping: {
      root: { id: "root", parent: "", message: null },
      prompt: {
        id: "prompt",
        parent: "root",
        message: makeMessage("user", "How should I start?")
      },
      hidden: {
        id: "hidden",
        parent: "prompt",
        message: makeMessage("assistant", "hidden setup", {
          metadata: { is_visually_hidden_from_conversation: true }
        })
      },
      search: {
        id: "search",
        parent: "hidden",
        message: makeMessage("assistant", '{"search_query":[{"q":"example"}]}', {
          end_turn: false,
          recipient: "web.run"
        })
      },
      code: {
        id: "code",
        parent: "search",
        message: makeMessage("assistant", "import math", {
          contentType: "code",
          end_turn: false,
          recipient: "python"
        })
      },
      "final-answer": {
        id: "final-answer",
        parent: "code",
        message: makeMessage("assistant", "Start with a small checklist.", {
          channel: "final",
          end_turn: true,
          recipient: "all"
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data, {
    event(name, payload) {
      events.push({ name, payload });
    }
  });

  assert.deepEqual(Array.from(messages, (message) => message.role), ["user", "assistant"]);
  assert.equal(messages[0].markdown, "How should I start?");
  assert.equal(messages[1].markdown, "Start with a small checklist.");
  assert.deepEqual(JSON.parse(JSON.stringify(events.find((event) => event.name === "fastCapture.filteredSummary")?.payload.filtered)), {
    hidden: 1,
    "assistant-not-final": 2
  });
});

test("Fast API parser keeps final assistant code answers", async () => {
  const fast = await loadFastCaptureModule();
  const data = {
    current_node: "answer",
    mapping: {
      root: { id: "root", parent: "", message: null },
      prompt: {
        id: "prompt",
        parent: "root",
        message: makeMessage("user", "Show me code.")
      },
      answer: {
        id: "answer",
        parent: "prompt",
        message: makeMessage("assistant", "```python\nprint('ok')\n```", {
          end_turn: true,
          recipient: "all"
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data);

  assert.equal(messages.length, 2);
  assert.match(messages[1].markdown, /```python/);
});

test("Fast API parser emits image asset pointers as markdown images", async () => {
  const fast = await loadFastCaptureModule();
  const data = {
    current_node: "prompt",
    mapping: {
      root: { id: "root", parent: "", message: null },
      prompt: {
        id: "prompt",
        parent: "root",
        message: makeMessage("user", "", {
          contentType: "multimodal_text",
          parts: [
            "Please review this.",
            {
              asset_pointer: "file-service://file-image-123",
              content_type: "image/png",
              name: "diagram.png"
            }
          ],
          metadata: {
            attachments: [
              {
                id: "file-image-123",
                name: "diagram.png",
                mime_type: "image/png"
              }
            ]
          }
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data);

  assert.equal(messages.length, 1);
  assert.match(messages[0].markdown, /Please review this\./);
  assert.match(messages[0].markdown, /!\[diagram\.png]\(file-service:\/\/file-image-123\)/);
  assert.doesNotMatch(messages[0].markdown, /\[File: diagram\.png]/);
  assert.equal(messages[0].imageCount, 1);
  assert.equal(messages[0].fileCount, 0);
});

test("Fast API parser keeps sediment image pointers for embedding", async () => {
  const fast = await loadFastCaptureModule();
  const data = {
    current_node: "prompt",
    mapping: {
      root: { id: "root", parent: "", message: null },
      prompt: {
        id: "prompt",
        parent: "root",
        message: makeMessage("user", "", {
          contentType: "multimodal_text",
          parts: [
            {
              asset_pointer: "sediment://file_00000000c1e071fa9d934c60d95d7f69",
              content_type: "image/jpeg"
            },
            "What can you see?"
          ]
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data);

  assert.equal(messages.length, 1);
  assert.match(messages[0].markdown, /!\[Image]\(sediment:\/\/file_00000000c1e071fa9d934c60d95d7f69\)/);
  assert.equal(messages[0].imageCount, 1);
});

test("Fast API parser cleans citation control markers", async () => {
  const fast = await loadFastCaptureModule();
  const data = {
    current_node: "answer",
    mapping: {
      root: { id: "root", parent: "", message: null },
      answer: {
        id: "answer",
        parent: "root",
        message: makeMessage("assistant", "This supports images. \uE200cite\uE202turn0search21\uE202turn0search2\uE201", {
          end_turn: true,
          recipient: "all"
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].markdown, "This supports images.");
});

test("Fast API parser merges non-final assistant thinking into final answers", async () => {
  const fast = await loadFastCaptureModule();
  const events = [];
  const data = {
    current_node: "answer",
    mapping: {
      root: { id: "root", parent: "", message: null },
      prompt: {
        id: "prompt",
        parent: "root",
        message: makeMessage("user", "Please analyze this.")
      },
      thinking: {
        id: "thinking",
        parent: "prompt",
        message: makeMessage("assistant", "Checking the uploaded file and comparing the visible details.", {
          end_turn: false,
          channel: "analysis"
        })
      },
      answer: {
        id: "answer",
        parent: "thinking",
        message: makeMessage("assistant", "The file looks relevant.", {
          end_turn: true,
          recipient: "all"
        })
      }
    }
  };

  const messages = fast.buildMessagesFromConversationApi(data, {
    event(name, payload) {
      events.push({ name, payload });
    }
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[1].markdown, "The file looks relevant.");
  assert.equal(messages[1].thinkingMarkdown, "Checking the uploaded file and comparing the visible details.");
  assert.deepEqual(JSON.parse(JSON.stringify(events.find((event) => event.name === "fastCapture.thinkingMerged")?.payload)), {
    applied: 1
  });
});

async function loadFastCaptureModule() {
  const source = await readFile(path.join(repoRoot, "src", "content", "capture-fast.js"), "utf8");
  const context = vm.createContext({
    CONVERSATION_API_FETCH_TIMEOUT_MS: 15_000,
    CONVERSATION_TIMESTAMP_FETCH_TIMEOUT_MS: 3_500,
    CONVERSATION_API_ATTEMPT_TIMEOUT_MS: 4_500,
    cleanMarkdown,
    countMarkdownImages,
    filenameFromUrl,
    formatConversationTimestamp,
    getCodeBlockDiagnostics,
    sanitizeFileAttachmentName,
    truncatePreview,
    uniqueStrings
  });

  vm.runInContext(`${source}\nglobalThis.__fastCaptureTest = { buildMessagesFromConversationApi };`, context);
  return context.__fastCaptureTest;
}

function makeMessage(role, text, options = {}) {
  return {
    id: `${role}-${hashText(text)}`,
    author: { role },
    content: {
      content_type: options.contentType || "text",
      parts: options.parts || [text]
    },
    channel: options.channel || "",
    end_turn: options.end_turn,
    metadata: options.metadata || {},
    recipient: options.recipient || ""
  };
}

function cleanMarkdown(value) {
  return String(value || "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function truncatePreview(value, maxLength) {
  const text = cleanMarkdown(value).replace(/\s+/g, " ");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function formatConversationTimestamp() {
  return "";
}

function getCodeBlockDiagnostics() {
  return [];
}

function countMarkdownImages(value) {
  return (String(value || "").match(/!\[[^\]]*]\(/g) || []).length;
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function sanitizeFileAttachmentName(value) {
  return String(value || "").trim();
}

function filenameFromUrl(value) {
  return String(value || "").split("/").filter(Boolean).pop() || "";
}

function hashText(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}
