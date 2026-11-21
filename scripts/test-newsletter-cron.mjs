#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/send-weekly-newsletter.js";
import {
  buildDigest,
  buildWeeklyEmail,
  sendWeeklyNewsletter,
} from "../lib/newsletter-send.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const feed = JSON.parse(readFileSync(path.join(root, "data", "intelligence-feed.json"), "utf8"));

function mockRequest({ method = "GET", headers = {} } = {}) {
  return { method, headers };
}

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = "") {
      this.body = value;
    },
  };
}

async function callApi(requestOptions) {
  const response = mockResponse();
  await handler(mockRequest(requestOptions), response);
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body ? JSON.parse(response.body) : null,
  };
}

// Stub fetch records Resend calls; no real network happens in this test.
function stubFetch(response) {
  const calls = [];
  const stub = async (url, options) => {
    calls.push({ url, options });
    if (response instanceof Error) throw response;
    return response;
  };
  stub.calls = calls;
  return stub;
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  KYAI_RESEND_AUDIENCE_ID: process.env.KYAI_RESEND_AUDIENCE_ID,
  KYAI_NEWSLETTER_FROM: process.env.KYAI_NEWSLETTER_FROM,
  KYAI_NEWSLETTER_TEST_TO: process.env.KYAI_NEWSLETTER_TEST_TO,
  CRON_SECRET: process.env.CRON_SECRET,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

process.env.RESEND_API_KEY = "re_test_key";
process.env.KYAI_RESEND_AUDIENCE_ID = "aud_test_id";
process.env.CRON_SECRET = "testcronsecret1234";
delete process.env.KYAI_NEWSLETTER_TEST_TO;

// 1. No auth header: 401, and no Resend call is made.
const noFetch = stubFetch({ ok: true, status: 200, json: async () => ({ id: "b_nope" }) });
globalThis.fetch = noFetch;
const noAuth = await callApi({});
assert.equal(noAuth.statusCode, 401);
assert.equal(noAuth.body.ok, false);
assert.equal(noFetch.calls.length, 0);

// 2. Wrong secret: 401, and no Resend call is made.
const wrongAuth = await callApi({
  headers: { authorization: "Bearer wrongsecret0000" },
});
assert.equal(wrongAuth.statusCode, 401);
assert.equal(wrongAuth.body.ok, false);
assert.equal(noFetch.calls.length, 0);

// 3. CRON_SECRET not set at all: 401 even with a header, per the Vercel docs.
delete process.env.CRON_SECRET;
const noSecret = await callApi({
  headers: { authorization: "Bearer testcronsecret1234" },
});
assert.equal(noSecret.statusCode, 401);
assert.equal(noSecret.body.ok, false);
assert.equal(noFetch.calls.length, 0);
process.env.CRON_SECRET = "testcronsecret1234";

// 4. Non-GET method: 405, and no Resend call is made.
const wrongMethod = await callApi({
  method: "POST",
  headers: { authorization: "Bearer testcronsecret1234" },
});
assert.equal(wrongMethod.statusCode, 405);
assert.equal(noFetch.calls.length, 0);

// 5. Correct auth: 200 with the broadcast id, one Resend broadcast call to
// the right audience with the right subject shape.
const broadcast = stubFetch({ ok: true, status: 200, json: async () => ({ id: "b_123" }) });
globalThis.fetch = broadcast;
const sent = await callApi({
  headers: { authorization: "Bearer testcronsecret1234" },
});
assert.equal(sent.statusCode, 200);
assert.equal(sent.body.ok, true);
assert.equal(sent.body.id, "b_123");
assert.equal(sent.body.mode, "broadcast");
assert.match(sent.body.subject, /^KYAI weekly Kentucky AI pulse - /);
assert.equal(sent.body.trackedCount, feed.summary?.totalItems || feed.items?.length || 0);
assert.equal(broadcast.calls.length, 1);
assert.equal(broadcast.calls[0].url, "https://api.resend.com/broadcasts");
assert.equal(broadcast.calls[0].options.method, "POST");
assert.equal(broadcast.calls[0].options.headers.Authorization, "Bearer re_test_key");
const broadcastBody = JSON.parse(broadcast.calls[0].options.body);
assert.equal(broadcastBody.audience_id, "aud_test_id");
assert.equal(broadcastBody.subject, sent.body.subject);
assert.equal(broadcastBody.send, true);
assert.match(broadcastBody.html, /weekly Kentucky AI pulse/);
assert.match(broadcastBody.text, /KYAI Kentucky AI digest/);
assert.doesNotMatch(`${broadcastBody.subject}\n${broadcastBody.text}\n${broadcastBody.html}`, /—/);

// 6. Correct auth but no Resend key: 500 with a clear error, no fetch call.
const noKeyFetch = stubFetch({ ok: true, status: 200, json: async () => ({ id: "b_nope" }) });
globalThis.fetch = noKeyFetch;
delete process.env.RESEND_API_KEY;
const noKey = await callApi({
  headers: { authorization: "Bearer testcronsecret1234" },
});
assert.equal(noKey.statusCode, 500);
assert.equal(noKey.body.ok, false);
assert.match(noKey.body.error, /RESEND_API_KEY/);
assert.equal(noKeyFetch.calls.length, 0);
process.env.RESEND_API_KEY = "re_test_key";

// 7. A failed Resend call surfaces a 500 with the Resend error.
const failing = stubFetch({
  ok: false,
  status: 401,
  json: async () => ({ message: "Invalid API key" }),
});
globalThis.fetch = failing;
const failed = await callApi({
  headers: { authorization: "Bearer testcronsecret1234" },
});
assert.equal(failed.statusCode, 500);
assert.equal(failed.body.ok, false);
assert.match(failed.body.error, /Resend \/broadcasts failed \(401\): Invalid API key/);

// 8. Test mode sends one email, not a broadcast.
const testSend = stubFetch({ ok: true, status: 200, json: async () => ({ id: "e_456" }) });
process.env.KYAI_NEWSLETTER_TEST_TO = "test@example.com";
const testResult = await sendWeeklyNewsletter({ fetchImpl: testSend });
assert.equal(testResult.mode, "test");
assert.equal(testResult.id, "e_456");
assert.equal(testResult.testTo, "test@example.com");
assert.equal(testSend.calls.length, 1);
assert.equal(testSend.calls[0].url, "https://api.resend.com/emails");
assert.deepEqual(JSON.parse(testSend.calls[0].options.body).to, ["test@example.com"]);
delete process.env.KYAI_NEWSLETTER_TEST_TO;

// 9. Digest and email builders: real feed, no em dashes anywhere.
const digest = buildDigest(feed);
assert.match(digest, /^KYAI Kentucky AI digest/);
assert.match(digest, /Items tracked: /);
const email = buildWeeklyEmail(feed, new Date("2026-11-23T14:00:00Z"));
assert.equal(email.subject, "KYAI weekly Kentucky AI pulse - Nov 23, 2026");
assert.doesNotMatch(`${email.subject}\n${email.text}\n${email.html}`, /—/);
assert.match(email.text, /Unsubscribe: \{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
assert.match(email.html, /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);

globalThis.fetch = originalFetch;
restoreEnv();

console.log("KYAI newsletter cron test passed");
