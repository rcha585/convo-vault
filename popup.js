const SETTINGS_STORAGE_KEY = "convoVaultSettings";
const DEFAULT_SETTINGS = {
  backendRoot: "",
  port: 38474,
  cacheDir: "",
  browserPath: ""
};

const exportButton = document.getElementById("exportButton");
const statusEl = document.getElementById("status");
const backendDot = document.getElementById("backendDot");
const backendStatus = document.getElementById("backendStatus");
const checkBackendButton = document.getElementById("checkBackendButton");
const copyStartButton = document.getElementById("copyStartButton");
const stopBackendButton = document.getElementById("stopBackendButton");
const backendRootInput = document.getElementById("backendRootInput");

let currentSettings = { ...DEFAULT_SETTINGS };

document.addEventListener("DOMContentLoaded", async () => {
  currentSettings = await loadSettings();
  renderSettings(currentSettings);
  checkBackend();
});

exportButton.addEventListener("click", async () => {
  setBusy(true, "Opening selector...");

  try {
    await saveSettingsFromForm({ quiet: true });
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

checkBackendButton.addEventListener("click", async () => {
  await saveSettingsFromForm({ quiet: true });
  checkBackend({ announce: true });
});

copyStartButton.addEventListener("click", async () => {
  try {
    await saveSettingsFromForm({ quiet: true });
    const command = buildStartCommand(currentSettings);

    await navigator.clipboard.writeText(command);
    setStatus("Start command copied. Paste it into your terminal.");
  } catch (error) {
    setStatus(error.message || String(error));
  }
});

stopBackendButton.addEventListener("click", async () => {
  setBackendBusy(true);
  setStatus("Stopping local renderer...");

  try {
    const response = await fetch(`${getRendererUrl()}/shutdown`, {
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
    const response = await fetch(`${getRendererUrl()}/health`, {
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

async function saveSettingsFromForm(options = {}) {
  const nextSettings = readSettingsFromForm();
  currentSettings = nextSettings;
  await saveSettings(nextSettings);

  if (!options.quiet) {
    setStatus("Settings saved.");
  }

  return nextSettings;
}

function readSettingsFromForm() {
  return {
    backendRoot: backendRootInput.value.trim(),
    port: DEFAULT_SETTINGS.port,
    cacheDir: DEFAULT_SETTINGS.cacheDir,
    browserPath: DEFAULT_SETTINGS.browserPath
  };
}

function renderSettings(settings) {
  backendRootInput.value = settings.backendRoot || "";
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_STORAGE_KEY], (result) => {
      resolve(normalizeSettings(result?.[SETTINGS_STORAGE_KEY]));
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [SETTINGS_STORAGE_KEY]: normalizeSettings(settings)
    }, resolve);
  });
}

function normalizeSettings(settings = {}) {
  return {
    backendRoot: String(settings.backendRoot || "").trim(),
    port: DEFAULT_SETTINGS.port,
    cacheDir: DEFAULT_SETTINGS.cacheDir,
    browserPath: DEFAULT_SETTINGS.browserPath
  };
}

function getRendererUrl(settings = currentSettings) {
  const port = normalizeSettings(settings).port;
  return `http://127.0.0.1:${port}`;
}

function buildStartCommand(settings) {
  const normalized = normalizeSettings(settings);

  if (!normalized.backendRoot) {
    throw new Error("Set the Convo Vault folder first.");
  }

  const args = [
    "node",
    "scripts/start-local-backend.mjs",
    "--detached"
  ];

  if (getPreferredShellKind() === "powershell") {
    const command = args
      .map((arg, index) => index < 4 ? arg : quotePowerShellSingle(arg))
      .join(" ");

    return `Set-Location -LiteralPath ${quotePowerShellSingle(normalized.backendRoot)}; ${command}`;
  }

  const command = args.map(quotePosixSingle).join(" ");
  return `cd ${quotePosixSingle(normalized.backendRoot)} && ${command}`;
}

function quotePowerShellSingle(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function quotePosixSingle(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function getPreferredShellKind() {
  const platform = String(
    navigator.userAgentData?.platform ||
    navigator.platform ||
    ""
  ).toLowerCase();

  return platform.includes("win") ? "powershell" : "posix";
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
