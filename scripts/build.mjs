#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { initSchema, seedFromStaticData, query, isConnected } = await import("../lib/db.mjs").catch(() => ({
  initSchema: null,
  seedFromStaticData: null,
  query: null,
  isConnected: () => false,
}));

const { rowToSignal, rowToEvent, rowToProfile, rowToToolkit, rowToRegion } = await import("../lib/api-utils.mjs").catch(() => ({
  rowToSignal: (r) => r,
  rowToEvent: (r) => r,
  rowToProfile: (r) => r,
  rowToToolkit: (r) => r,
  rowToRegion: (r) => r,
}));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = path.join(root, "dist", "client");
const SITE_URL = "https://kyai-flax.vercel.app";

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

function normalizeRegionKey(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("western") || text.includes("west") || text.includes("paducah") || text.includes("murray")) return "western";
  if (text.includes("louisville")) return "louisville";
  if (text.includes("lexington") || text.includes("bluegrass") || text.includes("frankfort")) return "bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("pikeville") || text.includes("morehead") || text.includes("richmond")) return "appalachia";
  if (text.includes("northern") || text.includes("nku")) return "northern";
  if (text.includes("south") || text.includes("bowling") || text.includes("wku")) return "southcentral";
  return "statewide";
}

function readJson(relativePath, fallback) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) return fallback;
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function siteHeader() {
  return `<header class="site-header">
      <a class="brand" href="/#top" aria-label="KYAI home">
        <img src="/assets/kyai-mark.svg?v=kentucky-20260902" alt="" />
        <span>
          KYAI
          <small>AI for Kentucky</small>
        </span>
      </a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="/#near-me">AI near me</a>
        <a href="/#regions">Regions</a>
        <a href="/#intelligence">Intelligence</a>
        <a href="/#events">Events</a>
        <a href="/#share">Share</a>
        <a href="/#network">Network</a>
        <a href="/#toolkits">Toolkits</a>
        <a href="/#contribute">Contribute</a>
      </nav>
    </header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
      <div>
        <strong>KYAI</strong>
        <span>Open AI intelligence and education for Kentucky.</span>
      </div>
      <a href="https://github.com/Kgarmon99/kyai-com">Open-source repo</a>
    </footer>`;
}

function pageShell({ title, description, url, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#123d68" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="/assets/kyai-hero.png" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/assets/kyai-mark.svg?v=kentucky-20260902" />
    <link rel="stylesheet" href="/styles.css?v=contributor-os-20260902" />
  </head>
  <body>
    ${siteHeader()}
    <main>${body}</main>
    ${siteFooter()}
  </body>
</html>`;
}

function signalPage(item) {
  const title = `${item.title} | KYAI Signal`;
  const region = normalizeRegion(item.region);
  const url = `${SITE_URL}/signals/${encodeURIComponent(item.id)}`;
  const shareText = `${item.title} - ${region} ${item.category || "AI"} signal via KYAI`;
  const relatedPeople = [...(item.people || []), ...(item.institutions || [])].slice(0, 8);
  const reviewStatus = item.reviewStatus || (item.kind === "curated" ? "Curated source" : "Needs editor pass");
  const confidence = item.confidence || (item.kind === "curated" ? "high" : "review");

  return pageShell({
    title,
    description: item.body,
    url,
    body: `<section class="signal-detail-section">
        <article class="signal-detail-card">
          <a class="back-link" href="/#intelligence">Back to Kentucky AI Pulse</a>
          <div class="update-meta">
            <span>${escapeHtml(region)}</span>
            <span>${escapeHtml(item.category || "signal")}</span>
            ${item.publishedAt ? `<span>${escapeHtml(item.publishedAt.slice(0, 10))}</span>` : ""}
            <span>${escapeHtml(reviewStatus)}</span>
            <span>${escapeHtml(confidence)} confidence</span>
          </div>
          <h1>${escapeHtml(item.title)}</h1>
          <p class="signal-lede">${escapeHtml(item.body)}</p>
          <dl class="signal-facts">
            <div>
              <dt>Why it matters</dt>
              <dd>${escapeHtml(item.whyItMatters || `${region} now has a concrete AI signal residents, educators, founders, and public leaders can track.`)}</dd>
            </div>
            ${
              item.kentuckyConnection
                ? `<div>
                    <dt>Kentucky connection</dt>
                    <dd>${escapeHtml(item.kentuckyConnection)}</dd>
                  </div>`
                : ""
            }
            <div>
              <dt>Source</dt>
              <dd>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.source || "Original source")}</a>` : escapeHtml(item.source || "KYAI signal desk")}</dd>
            </div>
            <div>
              <dt>Review status</dt>
              <dd>${escapeHtml(reviewStatus)} / ${escapeHtml(confidence)} confidence</dd>
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
      </section>`,
  });
}

function regionPage(region, feedItems, events, profiles, toolkits) {
  const regionKey = region.id;
  const regionUrl = `${SITE_URL}/regions/${region.slug}/`;
  const signals = feedItems.filter((item) => normalizeRegionKey(item.region) === regionKey).slice(0, 8);
  const regionEvents = events.filter((event) => normalizeRegionKey(event.region) === regionKey || normalizeRegionKey(event.region) === "statewide").slice(0, 5);
  const regionProfiles = profiles.filter((profile) => normalizeRegionKey(profile.region) === regionKey || normalizeRegionKey(profile.region) === "statewide").slice(0, 6);
  const recommendedToolkits = toolkits
    .filter((toolkit) => (region.recommendedToolkits || []).includes(toolkit.id))
    .concat(toolkits.filter((toolkit) => !(region.recommendedToolkits || []).includes(toolkit.id)).slice(0, 2))
    .slice(0, 5);

  return pageShell({
    title: `${region.name} AI Brief | KYAI`,
    description: region.summary || region.headline,
    url: regionUrl,
    body: `<section class="signal-detail-section">
        <article class="signal-detail-card">
          <a class="back-link" href="/#regions">Back to KYAI regions</a>
          <div class="update-meta">
            <span>${escapeHtml(region.status || "Regional brief")}</span>
            <span>${signals.length} signals</span>
            <span>${regionEvents.length} events</span>
            <span>${regionProfiles.length} profiles</span>
          </div>
          <h1>${escapeHtml(region.name)} AI brief</h1>
          <p class="signal-lede">${escapeHtml(region.summary || region.headline)}</p>
          <dl class="signal-facts">
            <div><dt>Next win</dt><dd>${escapeHtml(region.nextWin || "Claim a local signal lane and keep it current.")}</dd></div>
            <div><dt>Maintainer</dt><dd>${escapeHtml(region.maintainer || "Open regional maintainer")}</dd></div>
            <div><dt>Focus areas</dt><dd>${escapeHtml((region.focusAreas || []).join(" / "))}</dd></div>
          </dl>
          <div class="signal-tags">${(region.partnerAsks || []).map((ask) => `<span>${escapeHtml(ask)}</span>`).join("")}</div>
          <div class="regional-page-grid">
            ${signals
              .map(
                (item) => `<article class="regional-page-card">
                  <div class="mission-meta"><span>${escapeHtml(item.category || "signal")}</span><span>${escapeHtml(item.reviewStatus || item.kind || "review")}</span></div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.body)}</p>
                  <a class="button neutral small-button" href="/signals/${encodeURIComponent(item.id)}/">Open signal</a>
                </article>`,
              )
              .join("")}
          </div>
          <h2>Events and rooms</h2>
          <div class="event-calendar">
            ${regionEvents
              .map(
                (event) => `<article class="event-card">
                  <div class="event-date"><strong>${escapeHtml(event.date)}</strong><span>${escapeHtml(event.time || event.type || "Event")}</span></div>
                  <div><div class="mission-meta"><span>${escapeHtml(event.status || "Open")}</span><span>${escapeHtml(event.type || "Event")}</span></div><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.whyItMatters || event.location || "")}</p></div>
                  <a class="button neutral small-button" href="${escapeHtml(event.sourceUrl || "/#events")}">Open</a>
                </article>`,
              )
              .join("")}
          </div>
          <h2>People and toolkits</h2>
          <div class="profile-grid">
            ${regionProfiles
              .map(
                (profile) => `<article class="profile-card">
                  <div class="mission-meta"><span>${escapeHtml(profile.type || "Profile")}</span><span>${escapeHtml(profile.claimStatus || "Open")}</span></div>
                  <h3>${escapeHtml(profile.name)}</h3>
                  <p>${escapeHtml(profile.reason)}</p>
                  <a class="button neutral small-button" href="${escapeHtml(profile.sourceUrl || "/#network")}">Source</a>
                </article>`,
              )
              .join("")}
            ${recommendedToolkits
              .map(
                (toolkit) => `<article class="profile-card">
                  <div class="mission-meta"><span>${escapeHtml(toolkit.status || "Toolkit")}</span><span>${escapeHtml(toolkit.audience || "Kentucky")}</span></div>
                  <h3>${escapeHtml(toolkit.title)}</h3>
                  <p>${escapeHtml(toolkit.useCase || toolkit.detail)}</p>
                  <a class="button primary small-button" href="/toolkits/${encodeURIComponent(toolkit.id)}/">${escapeHtml(toolkit.downloadLabel || "Open toolkit")}</a>
                </article>`,
              )
              .join("")}
          </div>
        </article>
      </section>`,
  });
}

function toolkitPage(toolkit) {
  const url = `${SITE_URL}/toolkits/${encodeURIComponent(toolkit.id)}/`;
  return pageShell({
    title: `${toolkit.title} | KYAI Toolkit`,
    description: toolkit.starterText || toolkit.useCase || toolkit.detail,
    url,
    body: `<section class="signal-detail-section">
        <article class="signal-detail-card">
          <a class="back-link" href="/#toolkits">Back to KYAI toolkits</a>
          <div class="update-meta">
            <span>${escapeHtml(toolkit.status || "Toolkit")}</span>
            <span>${escapeHtml(toolkit.audience || "Kentucky")}</span>
            <span>${escapeHtml(toolkit.reviewNeeded || "Reviewer needed")}</span>
          </div>
          <h1>${escapeHtml(toolkit.title)}</h1>
          <p class="signal-lede">${escapeHtml(toolkit.starterText || toolkit.useCase || toolkit.detail)}</p>
          <dl class="signal-facts">
            <div><dt>Audience</dt><dd>${escapeHtml(toolkit.audience || "Kentuckians")}</dd></div>
            <div><dt>Use case</dt><dd>${escapeHtml(toolkit.useCase || toolkit.detail)}</dd></div>
            <div><dt>Review needed</dt><dd>${escapeHtml(toolkit.reviewNeeded || "Community reviewer")}</dd></div>
          </dl>
          <div class="toolkit-section-list">${(toolkit.sections || []).map((section) => `<span>${escapeHtml(section)}</span>`).join("")}</div>
          <div class="share-card signal-share-card">
            <p class="kicker">Share this toolkit</p>
            <h2>${escapeHtml(toolkit.title)}</h2>
            <p>${escapeHtml(toolkit.useCase || toolkit.detail)}</p>
            <div class="share-actions">
              <a class="button primary" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a>
              <a class="button secondary" href="sms:?&body=${encodeURIComponent(`${toolkit.title}: ${toolkit.useCase || toolkit.detail} ${url}`)}">Text</a>
              <a class="button secondary" href="${escapeHtml(`https://github.com/Kgarmon99/kyai-com/issues/new?template=toolkit.yml&title=${encodeURIComponent(`[Toolkit]: ${toolkit.title}`)}`)}">Improve</a>
            </div>
          </div>
        </article>
      </section>`,
  });
}

const feedPath = path.join(root, "data", "intelligence-feed.json");
let feed = { items: [] };
if (existsSync(feedPath)) {
  feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const signalsDir = path.join(client, "signals");
  mkdirSync(signalsDir, { recursive: true });

  for (const item of feed.items || []) {
    if (!item.id) continue;
    const pageDir = path.join(signalsDir, item.id);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(path.join(pageDir, "index.html"), signalPage(item));
  }
}

const regions = readJson("data/regions.json", { regions: [] }).regions || [];
const events = readJson("data/events.json", { events: [] }).events || [];
const profiles = readJson("data/profiles.json", { profiles: [] }).profiles || [];
const toolkits = readJson("data/toolkits.json", { toolkits: [] }).toolkits || [];

const regionsDir = path.join(client, "regions");
mkdirSync(regionsDir, { recursive: true });
for (const region of regions) {
  if (!region.slug) continue;
  const pageDir = path.join(regionsDir, region.slug);
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(path.join(pageDir, "index.html"), regionPage(region, feed.items || [], events, profiles, toolkits));
}

const toolkitsDir = path.join(client, "toolkits");
mkdirSync(toolkitsDir, { recursive: true });
for (const toolkit of toolkits) {
  if (!toolkit.id) continue;
  const pageDir = path.join(toolkitsDir, toolkit.id);
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(path.join(pageDir, "index.html"), toolkitPage(toolkit));
}

async function buildFeeds() {
  const feedDir = path.join(client, "feed");
  mkdirSync(feedDir, { recursive: true });

  let dbAvailable = false;
  try {
    if (isConnected && isConnected()) {
      await initSchema();
      await seedFromStaticData();
      dbAvailable = true;
    }
  } catch (error) {
    console.log("Database unavailable for feed build; falling back to static JSON.", error.message);
  }

  const feeds = {
    signals: { items: [] },
    events: { items: [] },
    profiles: { items: [] },
    toolkits: { items: [] },
    regions: { items: [] },
  };

  if (dbAvailable) {
    const [signalRows, eventRows, profileRows, toolkitRows, regionRows] = await Promise.all([
      query("SELECT * FROM signals ORDER BY published_at DESC LIMIT 200", []),
      query("SELECT * FROM events ORDER BY date DESC LIMIT 200", []),
      query("SELECT * FROM profiles ORDER BY updated_at DESC LIMIT 200", []),
      query("SELECT * FROM toolkits ORDER BY updated_at DESC LIMIT 200", []),
      query("SELECT * FROM regions ORDER BY name", []),
    ]);
    feeds.signals.items = signalRows.map(rowToSignal);
    feeds.events.items = eventRows.map(rowToEvent);
    feeds.profiles.items = profileRows.map(rowToProfile);
    feeds.toolkits.items = toolkitRows.map(rowToToolkit);
    feeds.regions.items = regionRows.map(rowToRegion);
  } else {
    feeds.signals.items = feed.items || [];
    feeds.events.items = events;
    feeds.profiles.items = profiles;
    feeds.toolkits.items = toolkits;
    feeds.regions.items = regions;
  }

  for (const [type, data] of Object.entries(feeds)) {
    writeFileSync(
      path.join(feedDir, `${type}.json`),
      JSON.stringify({ generatedAt: new Date().toISOString(), type, total: data.items.length, items: data.items }, null, 2),
    );
  }
}

await buildFeeds();

console.log("Built static client files, signal pages, regional pages, toolkit pages, and JSON feeds into dist/client");
