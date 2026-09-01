#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const account = process.env.KYAI_GMAIL_ACCOUNT || "kahlil@getmoneybot.com";
const recipient = process.env.KYAI_NEWSLETTER_TO || "kahlil@getmoneybot.com";
const shouldRefresh = process.argv.includes("--no-refresh") ? false : process.env.KYAI_REFRESH_BEFORE_SEND !== "0";

function formatLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(date);
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
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
const intro = [
  "Here is this week's KYAI update.",
  "",
  `Live site: https://kyai-flax.vercel.app`,
  `Tracked items: ${feed.summary?.totalItems || feed.items?.length || 0}`,
  "",
].join("\n");
const body = `${intro}${digest.trim()}\n`;

await run("gog", [
  "gmail",
  "send",
  "--to",
  recipient,
  "--subject",
  subject,
  "--body",
  body,
  "--account",
  account,
]);

console.log(`Sent KYAI weekly newsletter to ${recipient}`);
