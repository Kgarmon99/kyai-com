#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "assets/kyai-hero.png",
  "assets/kyai-mark.svg",
  "data/contributor-os.json",
  "CONTRIBUTING.md",
  "EDITORIAL_POLICY.md",
  "ROADMAP.md",
  ".github/ISSUE_TEMPLATE/signal.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "vercel.json",
  "dist/client/index.html",
  "dist/client/styles.css",
  "dist/client/app.js",
  "dist/client/data/intelligence-feed.json",
  "dist/client/data/contributor-os.json",
  "dist/client/signals/kyai-urv8ur/index.html",
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
  "Kentucky AI Tracker",
  "Regional momentum",
  "Community board",
  "Latest Kentucky AI intelligence",
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
  "loadContributorOs",
  "renderContributorOs",
  "buildIssueUrl",
]) {
  if (!js.includes(phrase)) {
    throw new Error(`Missing app capability: ${phrase}`);
  }
}

const signalPage = readFileSync("dist/client/signals/kyai-urv8ur/index.html", "utf8");
for (const phrase of ["KYAI Signal", "Share this signal", "Why it matters"]) {
  if (!signalPage.includes(phrase)) {
    throw new Error(`Missing signal page phrase: ${phrase}`);
  }
}

if (vercel.outputDirectory !== "dist/client") {
  throw new Error("Vercel outputDirectory must be dist/client");
}

console.log("KYAI smoke test passed");
