#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "home.css",
  "styles.css",
  "app.js",
  "assets/kyai-hero.png",
  "assets/kyai-mark.svg",
  "data/contributor-os.json",
  "data/regions.json",
  "data/events.json",
  "data/profiles.json",
  "data/toolkits.json",
  "data/kentucky-places.json",
  "CONTRIBUTING.md",
  "EDITORIAL_POLICY.md",
  "ROADMAP.md",
  ".github/ISSUE_TEMPLATE/signal.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "vercel.json",
  "api/newsletter-signup.js",
  "dist/client/index.html",
  "dist/client/home.css",
  "dist/client/styles.css",
  "dist/client/app.js",
  "dist/client/data/intelligence-feed.json",
  "dist/client/data/contributor-os.json",
  "dist/client/data/regions.json",
  "dist/client/data/events.json",
  "dist/client/data/profiles.json",
  "dist/client/data/toolkits.json",
  "dist/client/data/kentucky-places.json",
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
  "KY-Tech",
  "What’s new",
  "feedMeta",
  "newsList",
  "Send a tip",
  "Get the weekly note",
  'data-view="tech"',
  'data-view="ai"',
  'data-view="help"',
  'data-view="email"',
]) {
  if (!html.includes(phrase)) {
    throw new Error(`Missing page phrase: ${phrase}`);
  }
}

if (html.includes("Pick a lane") || html.includes("ky-map") || html.includes("lane-grid")) {
  throw new Error("Homepage still has heavy hero/map/lane chrome");
}

const feedIndex = html.indexOf('id="feed"');
const helpIndex = html.indexOf('id="help"');
if (feedIndex < 0 || helpIndex < 0 || feedIndex > helpIndex) {
  throw new Error("Feed panel must be the first main content on the page");
}

for (const phrase of [
  "loadNews",
  "renderNews",
  "setRegion",
  "showView",
  "isAiStory",
  "buildIssueUrl",
  "kyai-tips",
  "kyai-newsletter-subscribers",
  "/api/newsletter-signup",
  "intelligence-feed.json",
]) {
  if (!js.includes(phrase)) {
    throw new Error(`Missing app capability: ${phrase}`);
  }
}

const signalDirs = readdirSync("dist/client/signals").filter((name) =>
  existsSync(`dist/client/signals/${name}/index.html`),
);
if (!signalDirs.length) {
  throw new Error("Missing signal pages under dist/client/signals");
}
const signalPage = readFileSync(`dist/client/signals/${signalDirs[0]}/index.html`, "utf8");
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
  throw new Error("vercel.json outputDirectory must remain dist/client");
}

const feedDir = "dist/client/feed";
const feedFiles = readdirSync(feedDir);
for (const name of ["signals.json", "events.json", "profiles.json", "toolkits.json", "regions.json"]) {
  if (!feedFiles.includes(name)) {
    throw new Error(`Missing public feed: ${name}`);
  }
}

console.log("KYAI smoke test passed");
