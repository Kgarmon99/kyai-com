#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = path.join(root, "dist", "client");

rmSync(path.join(root, "dist"), { force: true, recursive: true });
mkdirSync(client, { recursive: true });

for (const entry of ["index.html", "styles.css", "app.js", "assets"]) {
  cpSync(path.join(root, entry), path.join(client, entry), { recursive: true });
}

if (existsSync(path.join(root, "data"))) {
  cpSync(path.join(root, "data"), path.join(client, "data"), { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRegion(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("western") || text.includes("west") || text.includes("paducah")) return "Western Kentucky";
  if (text.includes("louisville")) return "Louisville";
  if (text.includes("lexington") || text.includes("bluegrass")) return "Bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("pikeville")) return "Appalachia";
  if (text.includes("northern")) return "Northern Kentucky";
  if (text.includes("south") || text.includes("bowling")) return "South Central Kentucky";
  if (text.includes("frankfort")) return "Frankfort";
  return value || "Kentucky";
}

function signalPage(item) {
  const title = `${item.title} | KYAI Signal`;
  const region = normalizeRegion(item.region);
  const url = `https://kyai-flax.vercel.app/signals/${encodeURIComponent(item.id)}`;
  const shareText = `${item.title} - ${region} ${item.category || "AI"} signal via KYAI`;
  const relatedPeople = [...(item.people || []), ...(item.institutions || [])].slice(0, 8);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(item.body)}" />
    <meta name="theme-color" content="#123d68" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(item.body)}" />
    <meta property="og:image" content="/assets/kyai-hero.png" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/assets/kyai-mark.svg?v=kentucky-20260902" />
    <link rel="stylesheet" href="/styles.css?v=network-20260902" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/#top" aria-label="KYAI home">
        <img src="/assets/kyai-mark.svg?v=kentucky-20260902" alt="" />
        <span>
          KYAI
          <small>AI for Kentucky</small>
        </span>
      </a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="/#near-me">AI near me</a>
        <a href="/#intelligence">Intelligence</a>
        <a href="/#share">Share</a>
        <a href="/#network">Network</a>
        <a href="/#toolkits">Toolkits</a>
        <a href="/#contribute">Contribute</a>
      </nav>
    </header>
    <main>
      <section class="signal-detail-section">
        <article class="signal-detail-card">
          <a class="back-link" href="/#intelligence">Back to Kentucky AI Pulse</a>
          <div class="update-meta">
            <span>${escapeHtml(region)}</span>
            <span>${escapeHtml(item.category || "signal")}</span>
            ${item.publishedAt ? `<span>${escapeHtml(item.publishedAt.slice(0, 10))}</span>` : ""}
          </div>
          <h1>${escapeHtml(item.title)}</h1>
          <p class="signal-lede">${escapeHtml(item.body)}</p>
          <dl class="signal-facts">
            <div>
              <dt>Why it matters</dt>
              <dd>${escapeHtml(region)} now has a concrete AI signal residents, educators, founders, and public leaders can track.</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.source || "Original source")}</a>` : escapeHtml(item.source || "KYAI signal desk")}</dd>
            </div>
            <div>
              <dt>Follow-up</dt>
              <dd>Share local context, add related people, or request a KYAI workshop around this topic.</dd>
            </div>
          </dl>
          ${
            relatedPeople.length
              ? `<div class="signal-tags" aria-label="Related people and organizations">${relatedPeople
                  .map((person) => `<span>${escapeHtml(person)}</span>`)
                  .join("")}</div>`
              : ""
          }
          <div class="share-card signal-share-card">
            <p class="kicker">Share this signal</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(shareText)}</p>
            <div class="share-actions">
              <a class="button primary" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a>
              <a class="button secondary" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}">X</a>
              <a class="button secondary" href="sms:?&body=${encodeURIComponent(`${shareText} ${url}`)}">Text</a>
            </div>
          </div>
        </article>
      </section>
    </main>
    <footer class="site-footer">
      <div>
        <strong>KYAI</strong>
        <span>Open AI intelligence and education for Kentucky.</span>
      </div>
      <a href="https://github.com/Kgarmon99/kyai-com">Open-source repo</a>
    </footer>
  </body>
</html>`;
}

const feedPath = path.join(root, "data", "intelligence-feed.json");
if (existsSync(feedPath)) {
  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const signalsDir = path.join(client, "signals");
  mkdirSync(signalsDir, { recursive: true });

  for (const item of feed.items || []) {
    if (!item.id) continue;
    const pageDir = path.join(signalsDir, item.id);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(path.join(pageDir, "index.html"), signalPage(item));
  }
}

console.log("Built static client files and signal pages into dist/client");
