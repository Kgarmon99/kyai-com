#!/usr/bin/env node
// Smoke test for the browser API client helper functions used by review.html.
// Mocks global fetch and verifies request construction.

const originalFetch = globalThis.fetch;
if (typeof globalThis.window === "undefined") {
  globalThis.window = { KYAI_API_BASE: "" };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    readyState: "complete",
    querySelector: () => null,
    addEventListener: () => {},
  };
}
let lastRequest = null;

globalThis.fetch = async function mockFetch(url, options = {}) {
  lastRequest = { url, options };
  return {
    ok: url.includes("/submissions") || url.includes("/review/"),
    status: 200,
    json: async () => {
      if (url.includes("/submissions")) {
        return { ok: true, type: "submissions", total: 1, items: [{ id: "kyai-sub-123", type: "signal", status: "pending", payload: {} }] };
      }
      if (url.includes("/review/")) {
        return { ok: true, action: "approve", submissionId: "kyai-sub-123", status: "approved" };
      }
      return { ok: false };
    },
  };
};

const tests = [];
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

async function test(name, fn) {
  tests.push(name);
  lastRequest = null;
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}: ${error.message}`);
  }
}

async function main() {
  const { fetchSubmissions, reviewSubmission } = await import("../api-client.js");

  await test("fetchSubmissions sends X-KYAI-API-Key header", async () => {
    const result = await fetchSubmissions("kyai_test_key_123", { status: "pending", type: "signal" });
    assert(result.ok, "result ok");
    assert(lastRequest.url.includes("/api/v1/submissions?status=pending&type=signal"), `url: ${lastRequest.url}`);
    assert(lastRequest.options.headers["X-KYAI-API-Key"] === "kyai_test_key_123", "api key header");
  });

  await test("reviewSubmission posts to /review/:type/:id/:action", async () => {
    const result = await reviewSubmission("signal", "kyai-sub-123", "approve", "kyai_test_key_123", "Looks good");
    assert(result.ok, "result ok");
    assert(lastRequest.url.includes("/api/v1/review/signal/kyai-sub-123/approve"), `url: ${lastRequest.url}`);
    assert(lastRequest.options.method === "POST", "POST method");
    assert(lastRequest.options.headers["X-KYAI-API-Key"] === "kyai_test_key_123", "api key header");
    const body = JSON.parse(lastRequest.options.body);
    assert(body.reviewerNotes === "Looks good", "reviewer notes body");
  });

  console.log(`\n${passed}/${tests.length} API client helper tests passed, ${failed} failed`);

  globalThis.fetch = originalFetch;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("API client test runner error:", error);
  globalThis.fetch = originalFetch;
  process.exit(1);
});
