#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "assets/kyai-hero.png",
  "assets/kyai-mark.svg",
  "data/contributor-os.json",
  "data/regions.json",
  "data/events.json",
  "data/profiles.json",
  "data/toolkits.json",
  "CONTRIBUTING.md",
  "EDITORIAL_POLICY.md",
  "ROADMAP.md",
  ".github/ISSUE_TEMPLATE/signal.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "vercel.json",
  "api/newsletter-signup.js",
  "dist/client/index.html",
  "dist/client/styles.css",
  "dist/client/app.js",
  "dist/client/data/intelligence-feed.json",
  "dist/client/data/contributor-os.json",
  "dist/client/data/regions.json",
  "dist/client/data/events.json",
  "dist/client/data/profiles.json",
  "dist/client/data/toolkits.json",
  "dist/client/signals/kyai-urv8ur/index.html",
  "dist/client/regions/louisville/index.html",
  "dist/client/toolkits/school-ai-policy-starter-kit/index.html",
  "dist/client/feed/signals.json",
  "dist/client/feed/events.json",
  "dist/client/feed/profiles.json",
  "dist/client/feed/toolkits.json",
  "dist/client/feed/regions.json",
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const html = readFileSync("index.html", "utf8");
const js = readFileSync("app.js", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));

for (const phrase of [
  "KYAI | Kentucky AI Pulse",
  "See the latest signals",
  "Get updates",
  "Regional pages",
  "Community board",
  "Latest Kentucky AI intelligence",
  "Kentucky AI calendar",
  "Get the Kentucky AI pulse in your inbox",
  "Make the Kentucky AI map smarter.",
  "What happens next",
]) {
  if (!html.includes(phrase)) {
    throw new Error(`Missing page phrase: ${phrase}`);
  }
}

for (const phrase of [
  "loadIntelligence",
  "loadProductData",
  "renderUpdates",
  "renderNewestSignal",
  "renderRegionalPages",
  "renderEventCalendar",
  "getSignalUrl",
  "research",
  "events",
  "seedThreads",
  "kyai-threads",
  "kyai-newsletter-subscribers",
  "/api/newsletter-signup",
  "buildIssueUrl",
]) {
  if (!js.includes(phrase)) {
    throw new Error(`Missing app capability: ${phrase}`);
  }
}

const signalPage = readFileSync("dist/client/signals/kyai-urv8ur/index.html", "utf8");
for (const phrase of ["KYAI Signal", "Share this signal", "Why it matters", "Review status"]) {
  if (!signalPage.includes(phrase)) {
    throw new Error(`Missing signal page phrase: ${phrase}`);
  }
}

const regionPage = readFileSync("dist/client/regions/louisville/index.html", "utf8");
for (const phrase of ["Louisville / North Central AI brief", "Events and rooms", "People and toolkits"]) {
  if (!regionPage.includes(phrase)) {
    throw new Error(`Missing region page phrase: ${phrase}`);
  }
}

const toolkitPage = readFileSync("dist/client/toolkits/school-ai-policy-starter-kit/index.html", "utf8");
for (const phrase of ["KYAI Toolkit", "Review needed", "Share this toolkit"]) {
  if (!toolkitPage.includes(phrase)) {
    throw new Error(`Missing toolkit page phrase: ${phrase}`);
  }
}

if (vercel.outputDirectory !== "dist/client") {
  throw new Error("Vercel outputDirectory must be dist/client");
}

// Privacy guard: the build publishes dist/client to the public web, so no
// personal data may ever appear there. This caught a real leak once — the build
// used to copy all of data/, which published data/subscribers.json to the live
// site. Keep this check ahead of any change to how data files are copied.
const publishedData = existsSync("dist/client/data") ? readdirSync("dist/client/data") : [];
const leaked = publishedData.filter((file) => /subscriber|secret|private|\.env/i.test(file));
if (leaked.length > 0) {
  throw new Error(`Personal or private data published to dist/client/data: ${leaked.join(", ")}`);
}

for (const published of publishedData) {
  const contents = readFileSync(`dist/client/data/${published}`, "utf8");
  if (/"email"\s*:/.test(contents)) {
    throw new Error(`Published data file contains an email field: data/${published}`);
  }
}

// Licensing guard: this project is public and the README calls it open source,
// so both licenses must stay present.
for (const license of ["LICENSE", "data/LICENSE"]) {
  if (!existsSync(license)) {
    throw new Error(`Missing license file: ${license}`);
  }
}

console.log("KYAI smoke test passed");
