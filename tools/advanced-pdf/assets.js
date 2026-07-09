const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_URI_RE = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,([a-z0-9+/=\r\n]+)$/i;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const FILE_LINK_RE = /\[File:\s*([^\]]+)](?:\(([^)\s]+)\))?/gi;
const FILENAME_RE = /[^\\/:*?"<>|\n\r]{1,140}\.(?:pdf|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|zip|rar|7z|mov|mp4|mp3|wav)\b/gi;

function buildAssetManifest(payload, options = {}) {
  const cacheRoot = options.cacheRoot || process.env.CGCE_CACHE_DIR || "";
  const assetRoot = cacheRoot ? path.join(cacheRoot, "assets") : "";
  const assetsById = new Map();
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];

  if (assetRoot) {
    fs.mkdirSync(assetRoot, { recursive: true });
  }

  for (const message of messages) {
    collectMessageImageAssets(message, "markdown", assetRoot, assetsById);
    collectMessageImageAssets(message, "thinkingMarkdown", assetRoot, assetsById);
    collectMessageFileAssets(message, "markdown", assetsById);
    collectMessageFileAssets(message, "thinkingMarkdown", assetsById);
  }

  const assets = [...assetsById.values()].sort((a, b) => a.assetId.localeCompare(b.assetId));
  const counts = assets.reduce((result, asset) => {
    result.total += 1;
    result.byKind[asset.kind] = (result.byKind[asset.kind] || 0) + 1;
    result.byOrigin[asset.origin] = (result.byOrigin[asset.origin] || 0) + 1;
    result.byStorage[asset.storage] = (result.byStorage[asset.storage] || 0) + 1;
    return result;
  }, {
    total: 0,
    byKind: {},
    byOrigin: {},
    byStorage: {}
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    conversation: {
      title: payload?.title || "ChatGPT Conversation",
      source: payload?.source || "",
      exportedAt: payload?.exportedAt || "",
      captureMode: payload?.captureMode || ""
    },
    policy: {
      userUploads: "metadata-thumbnail-original-optional",
      aiGenerated: "preserve-original-when-available",
      remoteReferences: "reference-only-until-fetch-enabled",
      dedupe: "sha256"
    },
    assetStore: {
      type: "local-cache",
      rootHint: ".convo-vault/assets",
      pathStyle: "sha256-prefix"
    },
    counts,
    assets
  };
}

function collectMessageImageAssets(message, field, assetRoot, assetsById) {
  const source = String(message?.[field] || "");
  let match;

  while ((match = MARKDOWN_IMAGE_RE.exec(source))) {
    const alt = cleanText(match[1] || "Image", 160);
    const src = match[2] || "";
    const reference = buildReference(message, field, { label: alt });
    const dataUri = parseDataUri(src);

    if (dataUri) {
      const sha256 = hashBuffer(dataUri.bytes);
      const extension = extensionFromMime(dataUri.mimeType);
      const cachePath = path.join("sha256", sha256.slice(0, 2), sha256.slice(2, 4), `${sha256}.${extension}`);

      if (assetRoot) {
        const absolutePath = path.join(assetRoot, cachePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        if (!fs.existsSync(absolutePath)) {
          fs.writeFileSync(absolutePath, dataUri.bytes);
        }
      }

      upsertAsset(assetsById, {
        assetId: `sha256:${sha256}`,
        sha256,
        kind: kindFromMime(dataUri.mimeType),
        origin: originFromMessageRole(message?.role),
        storage: "local-cache",
        mimeType: dataUri.mimeType,
        sizeBytes: dataUri.bytes.length,
        cachePath: slashPath(path.join("assets", cachePath)),
        label: alt,
        references: [reference]
      });
      continue;
    }

    upsertAsset(assetsById, {
      assetId: `ref:${hashString(src)}`,
      kind: "image",
      origin: originFromMessageRole(message?.role),
      storage: "reference-only",
      sourceUrl: src,
      label: alt,
      references: [reference]
    });
  }
}

function collectMessageFileAssets(message, field, assetsById) {
  const source = String(message?.[field] || "");
  const sourceWithoutFileLinks = source.replace(FILE_LINK_RE, " ");
  let match;

  FILE_LINK_RE.lastIndex = 0;
  while ((match = FILE_LINK_RE.exec(source))) {
    const fileName = cleanText(match[1] || "attachment", 180);
    const sourceUrl = match[2] || "";
    upsertAsset(assetsById, {
      assetId: `file-ref:${hashString(`${fileName}\n${sourceUrl}`)}`,
      kind: "file",
      origin: originFromMessageRole(message?.role),
      storage: "reference-only",
      fileName,
      sourceUrl,
      label: fileName,
      references: [buildReference(message, field, { label: fileName })]
    });
  }

  FILENAME_RE.lastIndex = 0;
  while ((match = FILENAME_RE.exec(sourceWithoutFileLinks))) {
    const fileName = cleanText(match[0], 180);
    upsertAsset(assetsById, {
      assetId: `file-name:${hashString(fileName)}`,
      kind: "file",
      origin: originFromMessageRole(message?.role),
      storage: "metadata-only",
      fileName,
      label: fileName,
      references: [buildReference(message, field, { label: fileName })]
    });
  }
}

function upsertAsset(assetsById, asset) {
  const existing = assetsById.get(asset.assetId);

  if (!existing) {
    assetsById.set(asset.assetId, {
      ...asset,
      references: uniqueReferences(asset.references || [])
    });
    return;
  }

  existing.references = uniqueReferences([
    ...existing.references,
    ...(asset.references || [])
  ]);

  if (!existing.label && asset.label) {
    existing.label = asset.label;
  }
}

function buildReference(message, field, details = {}) {
  return {
    messageId: message?.id || "",
    turnNumber: message?.turnNumber || message?.order || null,
    role: message?.role || "unknown",
    field,
    label: details.label || ""
  };
}

function uniqueReferences(references) {
  const seen = new Set();
  const result = [];

  for (const reference of references) {
    const key = JSON.stringify(reference);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(reference);
  }

  return result;
}

function parseDataUri(value) {
  const match = String(value || "").match(DATA_URI_RE);

  if (!match) {
    return null;
  }

  return {
    mimeType: (match[1] || "application/octet-stream").toLowerCase(),
    bytes: Buffer.from(match[2].replace(/\s+/g, ""), "base64")
  };
}

function originFromMessageRole(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "assistant") return "ai-generated";
  if (normalized === "user") return "user-provided";
  return "unknown";
}

function kindFromMime(mimeType) {
  const type = String(mimeType || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
}

function extensionFromMime(mimeType) {
  const type = String(mimeType || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/svg+xml") return "svg";
  const subtype = type.split("/")[1] || "bin";
  return subtype.replace(/[^a-z0-9]+/g, "").slice(0, 12) || "bin";
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hashString(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function cleanText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function slashPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

module.exports = {
  buildAssetManifest
};
