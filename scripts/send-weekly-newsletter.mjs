#!/usr/bin/env node
// Build the weekly KYAI digest and send it to every subscriber through a
// Resend broadcast to the KYAI audience. Run by the newsletter-weekly GitHub
// Action every Monday, or manually with npm run newsletter:send.
//
// Required env:
//   RESEND_API_KEY            Resend API key (starts with re_)
//   KYAI_RESEND_AUDIENCE_ID   Resend audience ID holding the subscribers
// Optional env:
//   KYAI_NEWSLETTER_FROM      Sender, e.g. KYAI <updates@kyai.com> (must use a
//                             domain verified in Resend to reach subscribers)
//   KYAI_NEWSLETTER_TEST_TO   If set, send one test email to this address
//                             instead of broadcasting to the audience.
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shouldRefresh = process.argv.includes("--no-refresh") ? false : process.env.KYAI_REFRESH_BEFORE_SEND !== "0";

const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.KYAI_RESEND_AUDIENCE_ID;
const testTo = process.env.KYAI_NEWSLETTER_TEST_TO;
const from = process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>";

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

function formatLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(date);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
}

// Convert the plain-text digest from format-digest.mjs into simple readable
// HTML: "- ..." lines become list items, the "  <url>" line after an item
// becomes a "Read the source" link on that item, other lines become paragraphs.
function digestToHtml(digest) {
  const parts = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const line of digest.trim().split("\n")) {
    if (line.startsWith("- ")) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line.startsWith("  http")) {
      const url = line.trim();
      if (inList && parts.length) {
        const last = parts[parts.length - 1];
        parts[parts.length - 1] = last.replace(
          "</li>",
          ` <a href="${escapeHtml(url)}">Read the source</a></li>`
        );
      } else {
        parts.push(`<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`);
      }
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return parts.join("\n");
}

async function postResend(path, payload) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend ${path} failed (${response.status}): ${body.message || "unknown error"}`);
  }
  return body;
}

if (shouldRefresh) {
  await run(process.execPath, ["scripts/refresh-intelligence.mjs"], {
    env: {
      ...process.env,
      KYAI_ENABLE_GDELT: process.env.KYAI_ENABLE_GDELT || "0",
    },
  });
}

const { stdout: digest } = await run(process.execPath, ["scripts/format-digest.mjs"]);
const feed = JSON.parse(readFileSync(path.join(root, "data", "intelligence-feed.json"), "utf8"));
const subject = `KYAI weekly Kentucky AI pulse - ${formatLocalDate()}`;
const trackedCount = feed.summary?.totalItems || feed.items?.length || 0;

const text = [
  "Here is this week's KYAI update.",
  "",
  "Live site: https://ky-ai.vercel.app",
  `Tracked items: ${trackedCount}`,
  "",
  digest.trim(),
  "",
  "You are receiving this because you signed up for the Kentucky AI Pulse.",
  "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
  "",
].join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0d1527; color: #e2e8f0; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #17233d; border-radius: 12px; padding: 32px; border: 1px solid #2e3d5c; }
      .brand { color: #38bdf8; font-size: 26px; font-weight: 800; text-decoration: none; display: inline-block; margin-bottom: 20px; }
      h1 { font-size: 22px; color: #ffffff; margin: 0 0 16px 0; }
      p { line-height: 1.6; color: #cbd5e1; font-size: 15px; margin: 0 0 12px 0; }
      ul { color: #cbd5e1; padding-left: 20px; line-height: 1.6; font-size: 15px; }
      li { margin-bottom: 12px; }
      a { color: #38bdf8; }
      .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #2e3d5c; padding-top: 16px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <a class="brand" href="https://ky-ai.vercel.app/">KYAI</a>
      <h1>Your weekly Kentucky AI pulse</h1>
      <p>Here is this week's KYAI update. We are tracking ${trackedCount} items. <a href="https://ky-ai.vercel.app/">See everything live on the site</a>.</p>
${digestToHtml(digest)}
      <div class="footer">
        Kentucky AI Pulse &bull; Open AI intelligence and civic education for Kentucky.<br/>
        You are receiving this because you signed up for the Kentucky AI Pulse.<br/>
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`;

if (testTo) {
  const result = await postResend("/emails", {
    from,
    to: [testTo],
    subject,
    html,
    text,
  });
  console.log(`Sent KYAI weekly newsletter test email to ${testTo} (id: ${result.id || "unknown"})`);
} else {
  const result = await postResend("/broadcasts", {
    name: subject,
    audience_id: audienceId,
    from,
    subject,
    html,
    text,
    send: true,
  });
  console.log(`Sent KYAI weekly newsletter broadcast to audience ${audienceId} (id: ${result.id || "unknown"})`);
}
