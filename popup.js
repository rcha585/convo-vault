const exportButton = document.getElementById("exportButton");
const statusEl = document.getElementById("status");

exportButton.addEventListener("click", async () => {
  setBusy(true, "Opening selector...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !isChatGptUrl(tab.url)) {
      throw new Error("Open a ChatGPT conversation tab first.");
    }

    const response = await sendOpenSelectorMessage(tab.id);

    if (!response?.ok) {
      throw new Error(response?.error || "Could not open the message selector.");
    }

    setStatus("Selector opened on the page.");
  } catch (error) {
    setStatus(error.message || String(error));
  } finally {
    setBusy(false);
  }
});

function isChatGptUrl(url = "") {
  try {
    const { hostname } = new URL(url);
    return hostname === "chatgpt.com" || hostname === "chat.openai.com";
  } catch {
    return false;
  }
}

async function sendOpenSelectorMessage(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "OPEN_CHATGPT_EXPORT_SELECTOR"
    });
  } catch (firstError) {
    // If the tab was already open before the extension was loaded, inject the
    // content script once and try again.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });

    return chrome.tabs.sendMessage(tabId, {
      type: "OPEN_CHATGPT_EXPORT_SELECTOR"
    });
  }
}

function setBusy(isBusy, message) {
  exportButton.disabled = isBusy;
  if (message) {
    setStatus(message);
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}
