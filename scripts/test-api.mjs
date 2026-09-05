#!/usr/bin/env node
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema, seedFromStaticData, query } from "../lib/db.mjs";
import { hashApiKey, generateApiKey } from "../lib/api-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDb = path.join(root, "kyai-test-run.db");
process.env.DATABASE_URL = `file:${testDb}`;

function removeTestDb() {
  for (const ext of ["", "-shm", "-wal"]) {
    const file = `${testDb}${ext}`;
    if (existsSync(file)) unlinkSync(file);
  }
}

const tests = [];
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function createResponse() {
  const response = {
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(data) {
      this.ended = true;
      this.body = data;
    },
  };
  return response;
}

function createRequest({ method = "GET", url = "/", headers = {}, body = null } = {}) {
  return {
    method,
    url,
    headers: { host: "localhost", ...headers },
    body,
  };
}

async function runHandler(handler, request) {
  const response = createResponse();
  await handler(request, response);
  const text = response.body || "";
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { response, json, text };
}

async function test(name, fn) {
  tests.push(name);
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}: ${error.message}`);
    if (process.env.KYAI_TEST_VERBOSE) console.error(error);
  }
}

async function main() {
  removeTestDb();

  await initSchema();
  await seedFromStaticData();

  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  await query(
    "INSERT INTO users (id, email, role, region, name, api_key_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["kyai-test-admin", "test@kyai.com", "admin", "Statewide", "Test Admin", apiKeyHash, new Date().toISOString(), new Date().toISOString()],
  );

  const signalsList = (await import("../api/v1/signals.js")).default;
  const signalDetail = (await import("../api/v1/signals/[id].js")).default;
  const eventsList = (await import("../api/v1/events.js")).default;
  const regionsList = (await import("../api/v1/regions.js")).default;
  const regionDetail = (await import("../api/v1/regions/[id].js")).default;
  const submit = (await import("../api/v1/submit.js")).default;
  const review = (await import("../api/v1/review/[type]/[id]/[action].js")).default;
  const personalized = (await import("../api/v1/personalized.js")).default;
  const feed = (await import("../api/v1/feed/[type].js")).default;
  const ingest = (await import("../api/v1/ingest.js")).default;

  await test("GET /api/v1/signals returns 200 with items", async () => {
    const { response, json } = await runHandler(signalsList, createRequest({ url: "/api/v1/signals" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.ok === true, "ok flag");
    assert(Array.isArray(json.items), "items array");
    assert(json.items.length > 0, "has signals");
  });

  await test("GET /api/v1/signals/:id returns a signal", async () => {
    const { json: listJson } = await runHandler(signalsList, createRequest({ url: "/api/v1/signals?limit=1" }));
    const id = listJson.items[0].id;
    const { response, json } = await runHandler(signalDetail, createRequest({ url: `/api/v1/signals/${id}` }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.signal.id === id, "signal id match");
  });

  await test("GET /api/v1/events returns events", async () => {
    const { response, json } = await runHandler(eventsList, createRequest({ url: "/api/v1/events" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.items.length > 0, "has events");
  });

  await test("GET /api/v1/regions returns regions", async () => {
    const { response, json } = await runHandler(regionsList, createRequest({ url: "/api/v1/regions" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.items.length > 0, "has regions");
  });

  await test("GET /api/v1/regions/:id returns a region", async () => {
    const { response, json } = await runHandler(regionDetail, createRequest({ url: "/api/v1/regions/louisville" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.region.id === "louisville", "louisville region");
  });

  await test("POST /api/v1/submit creates a pending submission", async () => {
    const payload = {
      type: "signal",
      payload: {
        title: "Test AI signal",
        body: "A test submission for the KYAI API.",
        category: "education",
        region: "Statewide",
        sourceName: "KYAI test",
        sourceUrl: "https://example.com/test",
      },
    };
    const { response, json } = await runHandler(submit, createRequest({ method: "POST", url: "/api/v1/submit", body: payload }));
    assert(response.statusCode === 201, `status ${response.statusCode}`);
    assert(json.status === "pending", "pending status");
    assert(json.id, "submission id");
  });

  let submissionId;
  await test("Review endpoint rejects missing API key", async () => {
    const { json: submitJson } = await runHandler(submit, createRequest({
      method: "POST",
      url: "/api/v1/submit",
      body: { type: "signal", payload: { title: "Review test signal", category: "policy" } },
    }));
    submissionId = submitJson.id;
    const { response, json } = await runHandler(review, createRequest({
      method: "POST",
      url: `/api/v1/review/signal/${submissionId}/approve`,
      body: {},
    }));
    assert(response.statusCode === 401, `expected 401, got ${response.statusCode}`);
  });

  await test("Review endpoint rejects invalid API key", async () => {
    const { response } = await runHandler(review, createRequest({
      method: "POST",
      url: `/api/v1/review/signal/${submissionId}/approve`,
      headers: { "x-kyai-api-key": "invalid" },
      body: {},
    }));
    assert(response.statusCode === 403, `expected 403, got ${response.statusCode}`);
  });

  await test("Review endpoint approves submission with valid API key", async () => {
    const { response, json } = await runHandler(review, createRequest({
      method: "POST",
      url: `/api/v1/review/signal/${submissionId}/approve`,
      headers: { "x-kyai-api-key": apiKey },
      body: { reviewerNotes: "Looks good" },
    }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.action === "approve", "approve action");
    assert(json.publishedId, "published id");
  });

  await test("GET /api/v1/personalized returns a tailored brief", async () => {
    const { response, json } = await runHandler(personalized, createRequest({ url: "/api/v1/personalized?role=founder&region=louisville" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.ok === true, "ok flag");
    assert(json.role === "founder", "role");
    assert(Array.isArray(json.signals), "signals array");
    assert(typeof json.recommendedAction === "string", "recommended action");
  });

  await test("GET /api/v1/feed/signals.json returns public feed", async () => {
    const { response, json } = await runHandler(feed, createRequest({ url: "/api/v1/feed/signals.json" }));
    assert(response.statusCode === 200, `status ${response.statusCode}`);
    assert(json.type === "signals", "feed type");
    assert(Array.isArray(json.items), "items array");
  });

  await test("POST /api/v1/ingest requires authentication", async () => {
    const { response } = await runHandler(ingest, createRequest({
      method: "POST",
      url: "/api/v1/ingest",
      body: { url: "https://example.com" },
    }));
    assert(response.statusCode === 401, `expected 401, got ${response.statusCode}`);
  });

  console.log(`\n${passed}/${tests.length} tests passed, ${failed} failed`);

  removeTestDb();

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Test runner error:", error);
  removeTestDb();
  process.exit(1);
});
