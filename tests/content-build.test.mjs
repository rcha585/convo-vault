import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContentScript } from "../scripts/lib/content-build.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("content script is generated from modular Fast and Full sources", async () => {
  const generated = await buildContentScript(repoRoot, { write: false });
  const current = await readFile(path.join(repoRoot, "content.js"), "utf8");
  const debugModule = await readFile(path.join(repoRoot, "src", "content", "debug-log.js"), "utf8");
  const fastModule = await readFile(path.join(repoRoot, "src", "content", "capture-fast.js"), "utf8");
  const fullModule = await readFile(path.join(repoRoot, "src", "content", "capture-full.js"), "utf8");
  const backendServer = await readFile(path.join(repoRoot, "tools", "advanced-pdf", "server.js"), "utf8");

  assert.equal(current.replace(/\r\n/g, "\n"), generated);
  assert.match(generated, /function createDebugLog/);
  assert.match(generated, /async function collectFastConversationMessages/);
  assert.match(generated, /\/api\/auth\/session/);
  assert.match(generated, /Bearer \$\{attempt\.accessToken\}/);
  assert.match(generated, /tree_format=true/);
  assert.match(generated, /routes\/_conversation\.g\.\$gizmoId\.c\.\$conversationId/);
  assert.match(generated, /function createMessageCollector/);
  assert.match(generated, /Switch to Full mode if you want to scan the page/);
  assert.doesNotMatch(generated, /falling back to Full scan/);
  assert.match(debugModule, /function downloadDebugLog/);
  assert.match(fastModule, /function buildMessagesFromConversationApi/);
  assert.match(fastModule, /function getApiMessageStructuralSkipReason/);
  assert.match(fullModule, /async function hydrateVirtualizedTurns/);
  assert.match(backendServer, /captureMode: payload\.captureMode \|\| ""/);
  assert.doesNotMatch(generated, /@convo-vault-include/);
});
