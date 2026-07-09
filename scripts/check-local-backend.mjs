#!/usr/bin/env node

import http from "node:http";

const port = normalizePort(parsePort(process.argv.slice(2)) || process.env.CGCE_ADVANCED_PDF_PORT);
const url = `http://127.0.0.1:${port}/health`;
const localApiToken = String(process.env.CGCE_LOCAL_API_TOKEN || "").trim();

const request = http.get(url, {
  timeout: 5000,
  headers: localApiToken ? { "X-Convo-Vault-Token": localApiToken } : {}
}, (response) => {
  const chunks = [];

  response.on("data", (chunk) => chunks.push(chunk));
  response.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");

    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
      console.log(body);
      return;
    }

    console.error(`Local backend health check failed (${response.statusCode}).`);
    console.error(body);
    process.exit(1);
  });
});

request.on("timeout", () => {
  request.destroy(new Error("Request timed out."));
});

request.on("error", (error) => {
  console.error(`Local backend is not reachable at ${url}.`);
  console.error(error.message || String(error));
  process.exit(1);
});

function parsePort(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--port") {
      return args[index + 1];
    }
  }

  return "";
}

function normalizePort(value) {
  const portNumber = Number(value || 38474);
  return Number.isFinite(portNumber) && portNumber >= 1024 && portNumber <= 65535
    ? Math.floor(portNumber)
    : 38474;
}
