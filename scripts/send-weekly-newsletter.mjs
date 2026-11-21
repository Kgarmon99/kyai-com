#!/usr/bin/env node
// Send the weekly KYAI digest manually with npm run newsletter:send.
// The scheduled weekly send runs on Vercel Cron (api/send-weekly-newsletter.js).
// Both use the shared implementation in lib/newsletter-send.mjs.
//
// Required env:
//   RESEND_API_KEY            Resend API key (starts with re_)
//   KYAI_RESEND_AUDIENCE_ID   Resend audience ID holding the subscribers
// Optional env:
//   KYAI_NEWSLETTER_FROM      Sender, e.g. KYAI <updates@kyai.com> (must use a
//                             domain verified in Resend to reach subscribers)
//   KYAI_NEWSLETTER_TEST_TO   If set, send one test email to this address
//                             instead of broadcasting to the audience.
//   KYAI_REFRESH_BEFORE_SEND  Set to "0", or pass --no-refresh, to skip the
//                             feed refresh before sending.
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { sendWeeklyNewsletter } from "../lib/newsletter-send.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shouldRefresh = process.argv.includes("--no-refresh") ? false : process.env.KYAI_REFRESH_BEFORE_SEND !== "0";

const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.KYAI_RESEND_AUDIENCE_ID;
const testTo = process.env.KYAI_NEWSLETTER_TEST_TO;

if (!apiKey) {
  console.error("RESEND_API_KEY is not set. Set it to send the weekly newsletter.");
  process.exit(1);
}

if (!testTo && !audienceId) {
  console.error(
    "KYAI_RESEND_AUDIENCE_ID is not set. Set it to broadcast the weekly newsletter, " +
    "or set KYAI_NEWSLETTER_TEST_TO to send a single test email instead."
  );
  process.exit(1);
}

if (shouldRefresh) {
  await execFileAsync(process.execPath, ["scripts/refresh-intelligence.mjs"], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
    env: {
      ...process.env,
      KYAI_ENABLE_GDELT: process.env.KYAI_ENABLE_GDELT || "0",
    },
  });
}

try {
  const result = await sendWeeklyNewsletter();
  if (result.mode === "test") {
    console.log(`Sent KYAI weekly newsletter test email to ${result.testTo} (id: ${result.id || "unknown"})`);
  } else {
    console.log(`Sent KYAI weekly newsletter broadcast to audience ${result.audienceId} (id: ${result.id || "unknown"})`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
