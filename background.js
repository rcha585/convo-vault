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

  const response = await fetch(src, {
    credentials: "include",
    referrer: pageUrl || undefined
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed with HTTP ${response.status}.`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type") || "application/octet-stream";
  const base64 = await blobToBase64(blob);
  return `data:${mimeType};base64,${base64}`;
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
