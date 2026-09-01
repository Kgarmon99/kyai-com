#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "assets/kyai-hero.png",
  "assets/kyai-mark.svg",
  "vercel.json",
  "dist/client/index.html",
  "dist/client/styles.css",
  "dist/client/app.js",
  "dist/client/data/intelligence-feed.json",
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
  "Kentucky AI Tracker",
  "Community board",
  "Latest Kentucky AI intelligence",
  "A public commons for Kentucky AI knowledge",
]) {
  if (!html.includes(phrase)) {
    throw new Error(`Missing page phrase: ${phrase}`);
  }
}

for (const phrase of ["loadIntelligence", "research", "events", "seedThreads", "kyai-threads"]) {
  if (!js.includes(phrase)) {
    throw new Error(`Missing app capability: ${phrase}`);
  }
}

if (vercel.outputDirectory !== "dist/client") {
  throw new Error("Vercel outputDirectory must be dist/client");
}

console.log("KYAI smoke test passed");
