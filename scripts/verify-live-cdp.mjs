import http from "node:http";

async function main() {
  const port = process.env.CHROME_CDP_PORT || 9222;
  console.log(`Checking Chrome Remote Debugging on port ${port}...`);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const tabs = await response.json();
    console.log(`Successfully connected! Found ${tabs.length} open tab(s) in Chrome.`);

    const targetTab = tabs.find((t) =>
      t.url.includes("6a7a6229") || t.url.includes("chatgpt.com")
    );

    if (targetTab) {
      console.log("\n=== Target ChatGPT Tab Found ===");
      console.log("Title:", targetTab.title);
      console.log("URL:", targetTab.url);
      console.log("WebSocket Debugger URL:", targetTab.webSocketDebuggerUrl);
    } else {
      console.log("\nActive Tabs in Chrome:");
      tabs.forEach((t, i) => console.log(`[${i + 1}] ${t.title} (${t.url})`));
    }
  } catch (err) {
    console.log("\n[CDP Status]: Chrome Remote Debugging port is currently closed.");
    console.log("To connect, launch Chrome with the debugging flag:");
    console.log(`  & "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${port}`);
  }
}

main().catch(console.error);
