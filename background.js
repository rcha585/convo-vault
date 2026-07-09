const IMAGE_FETCH_TIMEOUT_MS = 6000;
const ACCESS_TOKEN_TIMEOUT_MS = 3500;
const accessTokenCache = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "FETCH_IMAGE_AS_DATA_URI") {
    return false;
  }

  fetchImageAsDataUri(message.src, message.pageUrl)
    .then((dataUri) => sendResponse({ ok: true, dataUri }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

async function fetchImageAsDataUri(src, pageUrl) {
  if (!src) {
    throw new Error("Missing image URL.");
  }

  if (src.startsWith("data:")) {
    return src;
  }

  const candidates = buildImageFetchCandidates(src, pageUrl);
  const errors = [];
  const seen = new Set();

  for (const candidate of candidates) {
    try {
      return await fetchImageCandidateAsDataUri(candidate, pageUrl, seen);
    } catch (error) {
      errors.push(`${candidate.label}: ${error.message || error}`);
    }
  }

  throw new Error(`Image fetch failed. ${errors.slice(0, 4).join("; ")}`);
}

async function fetchImageCandidateAsDataUri(candidate, pageUrl, seen = new Set()) {
  if (!candidate?.url || seen.has(candidate.url)) {
    throw new Error("duplicate or missing candidate URL");
  }

  if (/^data:image\//i.test(candidate.url)) {
    return candidate.url;
  }

  seen.add(candidate.url);

  const headers = {
    accept: candidate.kind === "metadata"
      ? "application/json,*/*;q=0.8"
      : "image/avif,image/webp,image/apng,image/svg+xml,image/*,application/json,*/*;q=0.8"
  };
  const origin = getUrlOrigin(candidate.url);

  if (origin && isTrustedChatGptOrigin(origin)) {
    const accessToken = await getChatGptAccessToken(origin);

    if (accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetchWithTimeout(candidate.url, {
    timeoutMs: IMAGE_FETCH_TIMEOUT_MS,
    credentials: "include",
    referrer: pageUrl || undefined,
    headers
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (/json/i.test(contentType)) {
    const metadata = await response.json();
    const nestedCandidates = extractImageUrlsFromMetadata(metadata)
      .flatMap((url) => buildImageFetchCandidates(url, pageUrl))
      .filter((next) => next.url && !seen.has(next.url));
    const nestedErrors = [];

    for (const nextCandidate of nestedCandidates) {
      try {
        return await fetchImageCandidateAsDataUri(nextCandidate, pageUrl, seen);
      } catch (error) {
        nestedErrors.push(`${nextCandidate.label}: ${error.message || error}`);
      }
    }

    throw new Error(`metadata did not resolve to image${nestedErrors.length ? ` (${nestedErrors.slice(0, 3).join("; ")})` : ""}`);
  }

  if (contentType && !/^image\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
    throw new Error(`unexpected content-type ${contentType}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type") || "application/octet-stream";
  const base64 = await blobToBase64(blob);
  return `data:${mimeType};base64,${base64}`;
}

function buildImageFetchCandidates(src, pageUrl) {
  const value = String(src || "").trim();

  if (/^data:image\//i.test(value)) {
    return [{ label: "direct:data", url: value }];
  }

  if (/^https?:\/\//i.test(value)) {
    return [{ label: "direct", url: value }];
  }

  const origin = getTrustedChatGptOrigin(pageUrl) || "https://chatgpt.com";

  if (/^\//.test(value)) {
    return [{ label: "relative", url: new URL(value, origin).href }];
  }

  const pointer = getInternalAssetPointer(value);

  if (!pointer.fileId) {
    return [{ label: "direct", url: value }];
  }

  const encodedId = encodeURIComponent(pointer.fileId);
  const labelPrefix = pointer.scheme || "asset";
  const paths = [
    `/backend-api/files/${encodedId}/content`,
    `/backend-api/files/${encodedId}/download`,
    `/backend-api/files/${encodedId}/image`,
    `/backend-api/files/${encodedId}/thumbnail`,
    `/backend-api/files/${encodedId}`,
    `/backend-api/files/${encodedId}?download=1`,
    `/backend-api/estuary/content?id=${encodedId}&p=fs`,
    `/backend-api/estuary/content?id=${encodedId}&p=fs&v=0`,
    `/backend-api/sediment/files/${encodedId}/content`,
    `/backend-api/sediment/files/${encodedId}/download`,
    `/backend-api/sediment/files/${encodedId}`
  ];

  return paths.map((path, index) => ({
    label: `${labelPrefix}:${index + 1}`,
    url: new URL(path, origin).href,
    kind: isMetadataAssetPath(path, encodedId) ? "metadata" : "image"
  }));
}

function isMetadataAssetPath(path, encodedId) {
  return path.endsWith(`/${encodedId}`) && !/(?:content|download|image|thumbnail|\?)/i.test(path);
}

function getInternalAssetPointer(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(file-service|sediment):\/\/([^/?#]+)/i);
  return {
    scheme: match?.[1] || "",
    fileId: match?.[2] || ""
  };
}

function extractImageUrlsFromMetadata(metadata) {
  const urls = [];
  const seen = new Set();
  const preferredKey = /(?:url|href|uri|download|content|image|thumbnail|preview|signed|asset)/i;

  function visit(value, key = "", depth = 0) {
    if (depth > 5 || value == null) {
      return;
    }

    if (typeof value === "string") {
      const text = value.trim();
      if (
        text
        && preferredKey.test(key)
        && /^(?:https?:\/\/|\/|file-service:\/\/|sediment:\/\/|data:image\/)/i.test(text)
        && !seen.has(text)
      ) {
        seen.add(text);
        urls.push(text);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key, depth + 1));
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => {
        visit(childValue, childKey, depth + 1);
      });
    }
  }

  visit(metadata);
  return urls;
}

async function getChatGptAccessToken(origin) {
  if (!origin || !isTrustedChatGptOrigin(origin)) {
    return "";
  }

  if (accessTokenCache.has(origin)) {
    return accessTokenCache.get(origin);
  }

  try {
    const response = await fetchWithTimeout(new URL("/api/auth/session", origin).href, {
      timeoutMs: ACCESS_TOKEN_TIMEOUT_MS,
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      accessTokenCache.set(origin, "");
      return "";
    }

    const session = await response.json();
    const token = extractAccessTokenFromSession(session);
    accessTokenCache.set(origin, token);
    return token;
  } catch (_) {
    accessTokenCache.set(origin, "");
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
  const timeoutId = setTimeout(() => controller.abort(), Number(options.timeoutMs || IMAGE_FETCH_TIMEOUT_MS));

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
    clearTimeout(timeoutId);
  }
}

function getTrustedChatGptOrigin(pageUrl) {
  try {
    const parsed = new URL(pageUrl || "");
    return isTrustedChatGptOrigin(parsed.origin) ? parsed.origin : "";
  } catch (_) {
    return "";
  }
}

function getUrlOrigin(url) {
  try {
    return new URL(url).origin;
  } catch (_) {
    return "";
  }
}

function isTrustedChatGptOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "chatgpt.com" || hostname === "chat.openai.com";
  } catch (_) {
    return false;
  }
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
