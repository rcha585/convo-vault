import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixturesDir = path.join(repoRoot, "tests", "fixtures");
const cases = JSON.parse(
  await readFile(path.join(fixturesDir, "export-regression-cases.json"), "utf8")
);

test("backend Markdown and data endpoints preserve export fixture text", async (t) => {
  const port = 39500 + Math.floor(Math.random() * 400);
  const token = `fixture-token-${process.pid}-${Date.now()}`;
  const server = spawn(process.execPath, [
    path.join(repoRoot, "tools", "advanced-pdf", "server.js")
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CGCE_ADVANCED_PDF_PORT: String(port),
      CGCE_LOCAL_API_TOKEN: token
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  server.stdout.setEncoding("utf8");
  server.stderr.setEncoding("utf8");
  server.stdout.on("data", (chunk) => { stdout += chunk; });
  server.stderr.on("data", (chunk) => { stderr += chunk; });

  t.after(async () => {
    try {
      await fetch(`http://127.0.0.1:${port}/shutdown`, {
        method: "POST",
        headers: { "X-Convo-Vault-Token": token }
      });
    } catch (_) {
      server.kill();
    }
  });

  await waitForHealth(port, token, () => `${stdout}\n${stderr}`);

  for (const fixtureCase of cases) {
    const payload = JSON.parse(await readFile(path.join(fixturesDir, fixtureCase.payload), "utf8"));
    const requestBody = JSON.stringify({
      exportPayload: payload,
      fileName: `${fixtureCase.name}.fixture`
    });

    const markdown = await postText(port, token, "/render-markdown", requestBody);
    assertFixtureText(markdown, fixtureCase, "markdown");
    assert.ok(
      markdown.includes(`**Messages:** ${fixtureCase.expectedCounts.messages}`),
      `Expected ${fixtureCase.name} markdown to report message count`
    );

    const dataJson = await postText(port, token, "/render-data", requestBody);
    const data = JSON.parse(dataJson);
    assertFixtureText(collectDataText(data), fixtureCase, "data");
    assertFixtureData(data, fixtureCase);
  }
});

async function waitForHealth(port, token, getLogs) {
  const deadline = Date.now() + 8000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { "X-Convo-Vault-Token": token }
      });
      if (response.ok) return;
      lastError = `${response.status} ${await response.text()}`;
    } catch (error) {
      lastError = error.message || String(error);
    }

    await delay(150);
  }

  throw new Error(`Backend fixture server did not become healthy: ${lastError}\n${getLogs()}`);
}

async function postText(port, token, endpoint, body) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Convo-Vault-Token": token
    },
    body
  });

  const text = await response.text();
  assert.equal(response.ok, true, `${endpoint} failed: ${response.status} ${text}`);
  return text;
}

function assertFixtureText(output, fixtureCase, label) {
  for (const expected of fixtureCase.mustContain) {
    assert.ok(
      output.includes(expected),
      `Expected ${fixtureCase.name} ${label} output to contain: ${expected}`
    );
  }

  for (const forbidden of fixtureCase.mustNotContain || []) {
    assert.ok(
      !output.includes(forbidden),
      `Expected ${fixtureCase.name} ${label} output not to contain: ${forbidden}`
    );
  }
}

function assertFixtureData(data, fixtureCase) {
  const expectedCounts = fixtureCase.expectedCounts || {};

  assert.equal(data.ok, true, `${fixtureCase.name} data ok`);
  assert.equal(data.messages.length, expectedCounts.messages, `${fixtureCase.name} data message array length`);
  assert.equal(data.conversation.messageCount, expectedCounts.messages, `${fixtureCase.name} data message count`);
  assert.deepEqual(data.conversation.roles, expectedCounts.roles, `${fixtureCase.name} data role counts`);
  assert.equal(data.conversation.language || "und", fixtureCase.expectedLang || "und", `${fixtureCase.name} data language`);
  assert.equal(data.qaPairs.length, expectedCounts.qaPairs, `${fixtureCase.name} data QA pairs`);
  for (const message of data.messages) {
    assert.ok(message.id, `${fixtureCase.name} data message id`);
    assert.ok(message.turnNumber > 0, `${fixtureCase.name} data turn number`);
    assert.ok(expectedCounts.roles[message.role] > 0, `${fixtureCase.name} data known role: ${message.role}`);
  }

  const codeBlocks = data.messages.reduce((sum, message) => {
    return sum + (message.counts?.codeBlocks || 0);
  }, 0);
  assert.equal(codeBlocks, expectedCounts.codeBlocks, `${fixtureCase.name} data code blocks`);

  if (fixtureCase.expectedOutputObjects) {
    assert.equal(data.conversation.outputObjectCount, fixtureCase.expectedOutputObjects.total, `${fixtureCase.name} data output object count`);
    assert.equal(data.conversation.degradedObjectCount, fixtureCase.expectedOutputObjects.degraded, `${fixtureCase.name} data degraded object count`);
    assert.equal(data.outputObjects.length, fixtureCase.expectedOutputObjects.total, `${fixtureCase.name} data output object array length`);
    assert.deepEqual(data.outputObjectCounts, {
      total: fixtureCase.expectedOutputObjects.total,
      degraded: fixtureCase.expectedOutputObjects.degraded,
      byKind: fixtureCase.expectedOutputObjects.byKind,
      byRenderStatus: fixtureCase.expectedOutputObjects.byRenderStatus,
      byDegradationReason: fixtureCase.expectedOutputObjects.byDegradationReason
    }, `${fixtureCase.name} data output object counts`);
    for (const object of data.outputObjects) {
      assert.ok(object.objectId, `${fixtureCase.name} data output object id`);
      assert.ok(object.kind, `${fixtureCase.name} data output object kind`);
      assert.ok(object.renderStatus, `${fixtureCase.name} data output object render status`);
      assert.ok(object.messageId, `${fixtureCase.name} data output object message id`);
      assert.ok(object.turnNumber > 0, `${fixtureCase.name} data output object turn`);
      if (object.degraded) {
        assert.ok(object.degradationReason, `${fixtureCase.name} degraded output object reason`);
      }
    }
  }
}

function collectDataText(data) {
  return [
    data.conversation?.title || "",
    data.conversation?.source || "",
    ...(data.messages || []).flatMap((message) => [
      message.markdown || "",
      message.thinkingMarkdown || "",
      message.preview || "",
      message.text || ""
    ])
  ].join("\n");
}
