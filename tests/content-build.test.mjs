import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContentScript } from "../scripts/lib/content-build.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("content script is generated from modular Fast and Full sources", async () => {
  const generated = await buildContentScript(repoRoot, { write: false });
  const current = await readFile(path.join(repoRoot, "content.js"), "utf8");
  const fastModule = await readFile(path.join(repoRoot, "src", "content", "capture-fast.js"), "utf8");
  const fullModule = await readFile(path.join(repoRoot, "src", "content", "capture-full.js"), "utf8");

  assert.equal(current.replace(/\r\n/g, "\n"), generated);
  assert.match(generated, /async function collectFastConversationMessages/);
  assert.match(generated, /function createMessageCollector/);
  assert.match(fastModule, /function buildMessagesFromConversationApi/);
  assert.match(fullModule, /async function hydrateVirtualizedTurns/);
  assert.doesNotMatch(generated, /@convo-vault-include/);
});
