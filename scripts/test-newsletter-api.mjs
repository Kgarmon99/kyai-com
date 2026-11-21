#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler, {
  addResendContact,
  buildWelcomeEmail,
  isPostgresDatabase,
  splitName,
} from "../api/newsletter-signup.js";

function mockRequest({ method = "POST", body } = {}) {
  const request = Readable.from([]);
  request.method = method;
  request.body = body;
  return request;
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

// All handler calls below run in dry-run mode: no network, no database, no
// file writes.
process.env.KYAI_NEWSLETTER_DRY_RUN = "1";

const invalid = await callApi({
  body: {
    email: "not-an-email",
  },
});
assert.equal(invalid.statusCode, 400);
assert.equal(invalid.body.ok, false);

const signup = await callApi({
  body: {
    email: "Test@Example.com",
    name: "Kentucky Builder",
    region: "Lexington / Bluegrass",
    role: "founder",
    interests: ["weekly-pulse", "events"],
    source: "kyai-newsletter",
  },
});
assert.equal(signup.statusCode, 200);
assert.equal(signup.body.ok, true);
assert.equal(signup.body.stored, true);
assert.equal(signup.body.welcomeSent, false);
assert.equal(signup.body.delivery, "dry-run");
assert.equal(signup.headers["access-control-allow-methods"], "POST, OPTIONS");

const method = await callApi({ method: "GET" });
assert.equal(method.statusCode, 405);

// Name splitting for the Resend contact record.
assert.deepEqual(splitName("Kentucky Builder"), { firstName: "Kentucky", lastName: "Builder" });
assert.deepEqual(splitName("Kahlil"), { firstName: "Kahlil", lastName: "" });
assert.deepEqual(splitName("  "), { firstName: "", lastName: "" });
assert.deepEqual(splitName("Mary Jane Watson"), { firstName: "Mary", lastName: "Jane Watson" });

// Only a Postgres DATABASE_URL counts as durable storage.
const originalDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
assert.equal(isPostgresDatabase(), false);
process.env.DATABASE_URL = "kyai.db";
assert.equal(isPostgresDatabase(), false);
process.env.DATABASE_URL = "postgres://user:pass@host/db";
assert.equal(isPostgresDatabase(), true);
process.env.DATABASE_URL = "postgresql://user:pass@host/db";
assert.equal(isPostgresDatabase(), true);
if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
else process.env.DATABASE_URL = originalDatabaseUrl;

// Welcome email: live links only, consistent site name, no em dashes.
const welcome = buildWelcomeEmail({
  email: "test@example.com",
  name: "Kentucky Builder",
  region: "Lexington / Bluegrass",
  role: "founder",
  interests: ["weekly-pulse", "events"],
});
const welcomeCopy = `${welcome.subject}\n${welcome.html}\n${welcome.text}`;
assert.match(welcome.subject, /Kentucky AI Pulse/);
assert.doesNotMatch(welcomeCopy, /Kentucky Artificial Intelligence Network/);
assert.doesNotMatch(welcomeCopy, /#near-me/);
assert.doesNotMatch(welcomeCopy, /#toolkits/);
for (const anchor of ["#intelligence", "#regions", "#events", "#contribute"]) {
  assert.ok(welcome.html.includes(anchor), `welcome HTML is missing ${anchor}`);
  assert.ok(welcome.text.includes(anchor), `welcome text is missing ${anchor}`);
}
assert.doesNotMatch(welcomeCopy, /—/);
assert.match(welcome.html, /Kentucky Builder/);

// Resend contact add: stubbed fetch, no real network calls.
process.env.RESEND_API_KEY = "re_test_key";
process.env.KYAI_RESEND_AUDIENCE_ID = "aud_test_id";

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

const created = stubFetch({ ok: true, status: 201, text: async () => '{"id":"c1"}' });
assert.equal(
  await addResendContact({ email: "test@example.com", name: "Kentucky Builder" }, created),
  true
);
assert.equal(created.calls.length, 1);
assert.equal(created.calls[0].url, "https://api.resend.com/audiences/aud_test_id/contacts");
assert.equal(created.calls[0].options.method, "POST");
assert.equal(created.calls[0].options.headers.Authorization, "Bearer re_test_key");
assert.deepEqual(JSON.parse(created.calls[0].options.body), {
  email: "test@example.com",
  first_name: "Kentucky",
  last_name: "Builder",
  unsubscribed: false,
});

// No name: name fields are omitted from the contact payload.
const nameless = stubFetch({ ok: true, status: 201, text: async () => '{"id":"c2"}' });
assert.equal(
  await addResendContact({ email: "noname@example.com", name: "" }, nameless),
  true
);
const namelessBody = JSON.parse(nameless.calls[0].options.body);
assert.equal("first_name" in namelessBody, false);
assert.equal("last_name" in namelessBody, false);

// A contact that is already in the audience still counts as stored.
const duplicate = stubFetch({
  ok: false,
  status: 409,
  text: async () => '{"message":"Contact already exists"}',
});
assert.equal(
  await addResendContact({ email: "test@example.com", name: "Kentucky Builder" }, duplicate),
  true
);

// Other failures do not count as stored.
const rejected = stubFetch({ ok: false, status: 400, text: async () => '{"message":"Bad request"}' });
assert.equal(
  await addResendContact({ email: "test@example.com", name: "Kentucky Builder" }, rejected),
  false
);
const throwing = stubFetch(new Error("network down"));
assert.equal(
  await addResendContact({ email: "test@example.com", name: "Kentucky Builder" }, throwing),
  false
);

// Without a key or an audience ID, no call is made and nothing is stored.
const noKey = stubFetch({ ok: true, status: 201, text: async () => "{}" });
delete process.env.RESEND_API_KEY;
assert.equal(
  await addResendContact({ email: "test@example.com", name: "" }, noKey),
  false
);
assert.equal(noKey.calls.length, 0);
process.env.RESEND_API_KEY = "re_test_key";

const noAudience = stubFetch({ ok: true, status: 201, text: async () => "{}" });
delete process.env.KYAI_RESEND_AUDIENCE_ID;
assert.equal(
  await addResendContact({ email: "test@example.com", name: "" }, noAudience),
  false
);
assert.equal(noAudience.calls.length, 0);

console.log("KYAI newsletter API test passed");
