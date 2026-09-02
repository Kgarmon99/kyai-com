#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "../api/newsletter-signup.js";

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
    interests: ["weekly-pulse", "events"],
    source: "kyai-newsletter",
  },
});
assert.equal(signup.statusCode, 200);
assert.equal(signup.body.ok, true);
assert.equal(signup.body.savedRemotely, true);
assert.equal(signup.body.delivery, "dry-run");
assert.equal(signup.headers["access-control-allow-methods"], "POST, OPTIONS");

const method = await callApi({ method: "GET" });
assert.equal(method.statusCode, 405);

console.log("KYAI newsletter API test passed");
