import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { buildAssetManifest } = require("../tools/advanced-pdf/assets.js");

test("asset manifest deduplicates cached AI image bytes and references user files", async () => {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), "convo-vault-assets-"));
  const onePixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const payload = {
    title: "Asset test",
    source: "https://chatgpt.com/c/test",
    exportedAt: "2026-07-09T00:00:00.000Z",
    messages: [
      {
        id: "assistant-1",
        role: "assistant",
        turnNumber: 1,
        markdown: `![generated image](${onePixelPng})`
      },
      {
        id: "assistant-2",
        role: "assistant",
        turnNumber: 2,
        markdown: `![generated image again](${onePixelPng})`
      },
      {
        id: "user-1",
        role: "user",
        turnNumber: 3,
        markdown: "[File: notes.pdf](https://example.test/notes.pdf)"
      }
    ]
  };

  const manifest = buildAssetManifest(payload, { cacheRoot });
  const cachedImages = manifest.assets.filter((asset) => asset.storage === "local-cache");
  const fileReferences = manifest.assets.filter((asset) => asset.kind === "file");

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(cachedImages.length, 1);
  assert.equal(cachedImages[0].origin, "ai-generated");
  assert.equal(cachedImages[0].references.length, 2);
  assert.equal(fileReferences.length, 1);
  assert.equal(fileReferences[0].storage, "reference-only");

  const cachedImagePath = path.join(cacheRoot, cachedImages[0].cachePath);
  assert.equal((await stat(cachedImagePath)).isFile(), true);
  assert.equal((await readFile(cachedImagePath)).length, cachedImages[0].sizeBytes);
});
