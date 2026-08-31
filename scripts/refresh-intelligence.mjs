#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "data", "intelligence-sources.json");
const editorialPath = path.join(root, "data", "editorial-items.json");
const outputPath = path.join(root, "data", "intelligence-feed.json");
const sources = JSON.parse(readFileSync(sourcePath, "utf8"));
const editorialItems = JSON.parse(readFileSync(editorialPath, "utf8"));
const execFileAsync = promisify(execFile);

const AI_TERMS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "generative",
  "chatbot",
  "data center",
  "automation",
  "algorithm",
];

const KENTUCKY_TERMS = [
  "kentucky",
  "ky",
  "louisville",
  "lexington",
  "bowling green",
  "northern kentucky",
  "paducah",
  "frankfort",
  "murray",
  "morehead",
  "richmond",
  "bluegrass",
  "appalachia",
  "uky",
  "uofl",
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return compact(String(value || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "));
}

function hasTerm(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => {
    if (term.length <= 3) {
      return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(lower);
    }
    return lower.includes(term);
  });
}

function formatGdeltDate(value) {
  if (!value || !/^\d{8}T\d{6}Z$/.test(value)) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
  return new Date(iso).toISOString();
}

function stableId(value) {
  let hash = 0;
  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return `kyai-${Math.abs(hash).toString(36)}`;
}

async function fetchJson(url, timeoutMs = 18000, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const curlRetries = options.curlRetries ?? 1;
  try {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "KYAI intelligence refresh; contact=kahlil@getmoneybot.com",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      const { stdout } = await execFileAsync("curl", [
        "-sS",
        "-L",
        "--retry",
        String(curlRetries),
        "--max-time",
        String(Math.ceil(timeoutMs / 1000)),
        "-H",
        "User-Agent: KYAI intelligence refresh; contact=kahlil@getmoneybot.com",
        url,
      ]);
      return JSON.parse(stdout);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function inferRegion(text, fallback = "Kentucky") {
  const lower = text.toLowerCase();
  if (lower.includes("louisville") || lower.includes("uofl")) return "Louisville";
  if (lower.includes("lexington") || lower.includes("uky") || lower.includes("university of kentucky")) return "Lexington";
  if (lower.includes("northern kentucky") || lower.includes("nku")) return "Northern Kentucky";
  if (lower.includes("western kentucky") || lower.includes("bowling green") || lower.includes("paducah") || lower.includes("murray")) return "Western Kentucky";
  if (lower.includes("eastern kentucky") || lower.includes("appalachia") || lower.includes("morehead") || lower.includes("richmond")) return "Eastern Kentucky";
  if (lower.includes("frankfort")) return "Frankfort";
  return fallback;
}

function inferCategory(item, fallback) {
  const text = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (/research|paper|journal|study|university|faculty|grant|lab/.test(text)) return "research";
  if (/school|student|degree|curriculum|teacher|college|workshop|training|library/.test(text)) return "education";
  if (/law|lawsuit|policy|regulation|government|legislative|attorney general|public/.test(text)) return "policy";
  if (/company|startup|business|workforce|jobs|economic|employer/.test(text)) return "workforce";
  if (/data center|infrastructure|energy|anthropic|hyperscaler/.test(text)) return "industry";
  if (/event|conference|meetup|session/.test(text)) return "events";
  return fallback;
}

async function getGdeltItems() {
  if (process.env.KYAI_ENABLE_GDELT !== "1") {
    console.warn("Skipping GDELT news scan. Set KYAI_ENABLE_GDELT=1 to include it.");
    return [];
  }

  const items = [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 9);

  for (const query of sources.gdeltQueries) {
    const params = new URLSearchParams({
      query: query.query,
      mode: "artlist",
      format: "json",
      maxrecords: "30",
      sort: "datedesc",
      timespan: "9m",
    });
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;

    try {
      const data = await fetchJson(url, 8000, { curlRetries: 0 });
      for (const article of data.articles || []) {
        const title = compact(article.title);
        const body = stripHtml(article.description || "");
        const haystack = `${title} ${body} ${article.domain || ""}`;
        if (!title || !article.url || !hasTerm(haystack, AI_TERMS) || !hasTerm(haystack, KENTUCKY_TERMS)) {
          continue;
        }

        const publishedAt = formatGdeltDate(article.seendate);
        if (publishedAt && new Date(publishedAt) < cutoff) {
          continue;
        }

        items.push({
          id: stableId(article.url || title),
          category: inferCategory({ title, body }, query.category),
          region: inferRegion(haystack),
          title,
          body: `${article.domain || "Publisher"} surfaced in the ${query.label.toLowerCase()} lane.`,
          source: article.domain || "GDELT",
          sourceUrl: article.url ? new URL(article.url).origin : null,
          url: article.url,
          publishedAt,
          lane: query.label,
          kind: "news",
        });
      }
    } catch (error) {
      console.warn(`GDELT query failed for "${query.label}": ${error.message}`);
    }
  }

  return items;
}

function openAlexId(id) {
  return String(id).replace("https://openalex.org/", "");
}

function getAuthorNames(work) {
  const kentuckyIds = new Set(sources.openAlexInstitutions.map((institution) => openAlexId(institution.id)));
  return (work.authorships || [])
    .filter((authorship) =>
      (authorship.institutions || []).some((institution) => kentuckyIds.has(openAlexId(institution.id))),
    )
    .map((authorship) => authorship.author?.display_name)
    .filter(Boolean)
    .slice(0, 4);
}

function getInstitutionNames(work) {
  return [
    ...new Set(
      (work.authorships || [])
        .flatMap((authorship) => authorship.institutions || [])
        .map((institution) => institution.display_name)
        .filter(Boolean),
    ),
  ].slice(0, 4);
}

async function getOpenAlexItems() {
  const items = [];
  const institutionIds = sources.openAlexInstitutions.map((institution) => openAlexId(institution.id)).join("|");
  const cutoffYear = new Date().getFullYear() - 1;

  for (const search of sources.openAlexSearches) {
    const params = new URLSearchParams({
      filter: `institutions.id:${institutionIds},from_publication_date:${cutoffYear}-01-01`,
      search,
      "per-page": "20",
      sort: "publication_date:desc",
      mailto: "kahlil@getmoneybot.com",
    });
    const url = `https://api.openalex.org/works?${params}`;

    try {
      const data = await fetchJson(url, 14000);
      for (const work of data.results || []) {
        const title = compact(work.title);
        if (!title) continue;

        const institutions = getInstitutionNames(work);
        const authors = getAuthorNames(work);
        const source = work.primary_location?.source?.display_name || work.host_venue?.display_name || "OpenAlex";
        const link = work.doi || work.primary_location?.landing_page_url || work.id;
        const text = `${title} ${institutions.join(" ")} ${authors.join(" ")}`;
        if (!hasTerm(text, AI_TERMS)) continue;

        items.push({
          id: stableId(link || title),
          category: "research",
          region: inferRegion(text, institutions[0] || "Kentucky research"),
          title,
          body: `Research signal connected to ${institutions.join(", ") || "a Kentucky institution"}.`,
          source,
          sourceUrl: work.primary_location?.source?.homepage_url || null,
          url: link,
          publishedAt: work.publication_date ? new Date(`${work.publication_date}T12:00:00Z`).toISOString() : null,
          lane: "Kentucky research",
          kind: "research",
          people: authors,
          institutions,
        });
      }
    } catch (error) {
      console.warn(`OpenAlex query failed for "${search}": ${error.message}`);
    }
  }

  return items;
}

function dedupe(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = compact(item.url || item.title).toLowerCase();
    const titleKey = compact(item.title).toLowerCase();
    if (seen.has(key) || seen.has(titleKey)) continue;
    seen.add(key);
    seen.add(titleKey);
    deduped.push(item);
  }

  return deduped;
}

function sortItems(items) {
  return items.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime || a.title.localeCompare(b.title);
  });
}

const curatedItems = editorialItems.map((item) => ({
  id: stableId(item.url || item.title),
  ...item,
}));
const items = sortItems(dedupe([...curatedItems, ...(await getGdeltItems()), ...(await getOpenAlexItems())])).slice(0, 36);
const feed = {
  updatedAt: new Date().toISOString(),
  generatedBy: "KYAI intelligence automation",
  summary: {
    totalItems: items.length,
    newsItems: items.filter((item) => item.kind === "news").length,
    researchItems: items.filter((item) => item.kind === "research").length,
    curatedItems: items.filter((item) => item.kind === "curated").length,
  },
  items,
  watchlist: sources.watchlist,
  sources: [
    ...sources.gdeltQueries.map((query) => ({
      name: query.label,
      type: "GDELT Project DOC 2.0",
      category: query.category,
    })),
    {
      name: "Kentucky institution research",
      type: "OpenAlex",
      category: "research",
    },
  ],
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(feed, null, 2)}\n`);

console.log(`Wrote ${items.length} Kentucky AI intelligence items to data/intelligence-feed.json`);
