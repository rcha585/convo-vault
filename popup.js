const RENDERER_URL = "http://127.0.0.1:38474";
const START_COMMAND = "powershell -ExecutionPolicy Bypass -File scripts\\start-local-backend-detached.ps1";

const exportButton = document.getElementById("exportButton");
const statusEl = document.getElementById("status");
const backendDot = document.getElementById("backendDot");
const backendStatus = document.getElementById("backendStatus");
const checkBackendButton = document.getElementById("checkBackendButton");
const copyStartButton = document.getElementById("copyStartButton");
const stopBackendButton = document.getElementById("stopBackendButton");

document.addEventListener("DOMContentLoaded", () => {
  checkBackend();
});

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
    window.close();
  } catch (error) {
    setStatus(error.message || String(error));
  } finally {
    setBusy(false);
  }
});

checkBackendButton.addEventListener("click", () => {
  checkBackend({ announce: true });
});

copyStartButton.addEventListener("click", async () => {
  const command = `Set-Location -LiteralPath 'F:\\AI\\chatgpt-conversation-exporter'; ${START_COMMAND}`;

  try {
    await navigator.clipboard.writeText(command);
    setStatus("Start command copied. Paste it into PowerShell or Windows Terminal.");
  } catch {
    setStatus(command);
  }
});

stopBackendButton.addEventListener("click", async () => {
  setBackendBusy(true);
  setStatus("Stopping local renderer...");

  try {
    const response = await fetch(`${RENDERER_URL}/shutdown`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Stop failed (${response.status}).`);
    }

    setBackendState("stopped", "Local renderer stopped");
    setStatus("Local renderer stopped.");
  } catch (error) {
    setStatus(error.message || String(error));
    await checkBackend();
  } finally {
    setBackendBusy(false);
  }
});

async function checkBackend(options = {}) {
  setBackendState("checking", "Checking local renderer...");
  setBackendBusy(true);

  try {
    const response = await fetch(`${RENDERER_URL}/health`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Health check failed (${response.status}).`);
    }

    const health = await response.json();
    const version = health.version ? ` v${health.version}` : "";
    setBackendState("running", `Local renderer running${version}`);

    if (options.announce) {
      setStatus("Local renderer is running.");
    }
  } catch {
    setBackendState("stopped", "Local renderer not running");

    if (options.announce) {
      setStatus("Local renderer is not running. Copy the start command first.");
    }
  } finally {
    setBackendBusy(false);
  }
}

function setBackendState(state, label) {
  backendDot.classList.toggle("running", state === "running");
  backendDot.classList.toggle("stopped", state === "stopped");
  backendStatus.textContent = label;
  stopBackendButton.disabled = state !== "running";
}

function setBackendBusy(isBusy) {
  checkBackendButton.disabled = isBusy;
  copyStartButton.disabled = false;
  if (isBusy) {
    stopBackendButton.disabled = true;
  }
}

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
