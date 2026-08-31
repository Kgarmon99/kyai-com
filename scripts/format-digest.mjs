#!/usr/bin/env node
import { readFileSync } from "node:fs";

const feed = JSON.parse(readFileSync("data/intelligence-feed.json", "utf8"));
const feedItems = feed.items || [];
const categoryOrder = ["industry", "research", "education", "policy", "workforce", "events", "news"];
const picked = [];
const seenIds = new Set();

for (const category of categoryOrder) {
  const item = feedItems.find((candidate) => candidate.category === category && !seenIds.has(candidate.id));
  if (item) {
    picked.push(item);
    seenIds.add(item.id);
  }
}

for (const item of feedItems) {
  if (picked.length >= 8) break;
  if (seenIds.has(item.id)) continue;
  picked.push(item);
  seenIds.add(item.id);
}

const items = picked.slice(0, 8);
const updated = feed.updatedAt
  ? new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Chicago",
    }).format(new Date(feed.updatedAt))
  : "not refreshed yet";

const lines = [
  `KYAI Kentucky AI digest`,
  `Updated: ${updated}`,
  `Items tracked: ${feed.summary?.totalItems || items.length}`,
  `Curated leads: ${feed.summary?.curatedItems || 0}`,
  "",
];

if (!items.length) {
  lines.push("No fresh items yet. Run npm run refresh:intel to populate the feed.");
} else {
  for (const item of items) {
    const date = item.publishedAt ? item.publishedAt.slice(0, 10) : "undated";
    const people = item.people?.length ? ` | People: ${item.people.join(", ")}` : "";
    lines.push(`- [${item.category}] ${item.title} (${item.source || "source"}, ${date})${people}`);
    if (item.url) lines.push(`  ${item.url}`);
  }
}

console.log(lines.join("\n"));
