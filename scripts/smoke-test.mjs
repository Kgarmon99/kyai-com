#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

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
  "AI near me",
  "Regional pages",
  "Kentucky AI Tracker",
  "Regional momentum",
  "Community board",
  "Latest Kentucky AI intelligence",
  "Kentucky AI calendar",
  "Turn the pulse into posts people can pass around",
  "Get the Kentucky AI pulse in your inbox",
  "People, places, and claimed listings",
  "Resources people can use immediately",
  "A public commons for Kentucky AI knowledge",
  "Build with KYAI",
  "Claim a real lane in Kentucky AI",
  "Weekly missions people can claim",
]) {
  if (!html.includes(phrase)) {
    throw new Error(`Missing page phrase: ${phrase}`);
  }
}

for (const phrase of [
  "loadIntelligence",
  "rolePlaybooks",
  "loadProductData",
  "renderRegionalPages",
  "renderEventCalendar",
  "trustDesk",
  "renderNearMe",
  "renderShareKit",
  "renderLeaderboard",
  "renderToolkits",
  "getSignalUrl",
  "research",
  "events",
  "seedThreads",
  "kyai-threads",
  "kyai-newsletter-subscribers",
  "/api/newsletter-signup",
  "loadContributorOs",
  "renderContributorOs",
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

console.log("KYAI smoke test passed");
