// KYAI database layer
// Supports Vercel Postgres (DATABASE_URL starting with postgres://) or local SQLite.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isPostgres = () => {
  const url = process.env.DATABASE_URL || "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
};

let _pg;
async function getPg() {
  if (_pg) return _pg;
  const { sql } = await import("@vercel/postgres");
  _pg = sql;
  return _pg;
}

let _sqlite;
function getSqlite() {
  if (_sqlite) return _sqlite;
  const Database = require("better-sqlite3");
  const dbPath = process.env.DATABASE_URL?.startsWith("file:")
    ? process.env.DATABASE_URL.slice(5)
    : (process.env.DATABASE_URL || path.join(root, "kyai.db"));
  _sqlite = new Database(dbPath);
  _sqlite.pragma("journal_mode = WAL");
  return _sqlite;
}

function normalizeSql(sqlOrTemplate) {
  if (isPostgres()) {
    // better-sqlite3 accepts ? placeholders; Postgres driver prefers $1, $2...
    let index = 0;
    return sqlOrTemplate.replace(/\?/g, () => `$${++index}`);
  }
  return sqlOrTemplate;
}

export async function query(sqlOrTemplate, values = []) {
  const sqlText = normalizeSql(sqlOrTemplate);
  if (isPostgres()) {
    const sql = await getPg();
    const result = await sql.query(sqlText, values);
    return result.rows || [];
  }

  const db = getSqlite();
  const statement = db.prepare(sqlText);
  const trimmed = sqlText.trim().toLowerCase();
  if (trimmed.startsWith("select") || trimmed.startsWith("with")) {
    return statement.all(...values);
  }
  return statement.run(...values);
}

export async function exec(sqlOrTemplate, values = []) {
  return query(sqlOrTemplate, values);
}

export async function transaction(fn) {
  if (isPostgres()) {
    const sql = await getPg();
    return sql.transaction(fn)();
  }
  return getSqlite().transaction(fn)();
}

export function isConnected() {
  try {
    return isPostgres() || !!getSqlite();
  } catch {
    return false;
  }
}

export function now() {
  return new Date().toISOString();
}

export function generateId(prefix = "kyai") {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segment = () =>
    Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${prefix}-${segment()}${segment()}`;
}

export async function initSchema() {
  const schema = readFileSync(path.join(root, "lib", "schema.sql"), "utf8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (isPostgres()) {
    const sql = await getPg();
    for (const statement of statements) {
      await sql.query(`${statement};`);
    }
  } else {
    const db = getSqlite();
    db.exec(schema);
  }

  // Lightweight migration: add columns introduced after initial schema creation.
  try {
    await query("ALTER TABLE regions ADD COLUMN updated_at TEXT", []);
  } catch {
    // Column already exists; ignore.
  }
}

export function upsertSql(table, columns, conflictColumn) {
  const cols = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.filter((c) => c !== conflictColumn).map((c) => `${c} = EXCLUDED.${c}`).join(", ");

  if (isPostgres()) {
    return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictColumn}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`;
  }
  if (updates) {
    return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}`;
  }
  return `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`;
}

// Seed static JSON data so the API has content even before dynamic submissions.
export async function seedFromStaticData() {
  const feedPath = path.join(root, "data", "intelligence-feed.json");
  const regionsPath = path.join(root, "data", "regions.json");
  const eventsPath = path.join(root, "data", "events.json");
  const profilesPath = path.join(root, "data", "profiles.json");
  const toolkitsPath = path.join(root, "data", "toolkits.json");

  const feed = safeReadJson(feedPath, { items: [] });
  const regions = safeReadJson(regionsPath, { regions: [] });
  const events = safeReadJson(eventsPath, { events: [] });
  const profiles = safeReadJson(profilesPath, { profiles: [] });
  const toolkits = safeReadJson(toolkitsPath, { toolkits: [] });

  const ts = now();

  for (const item of feed.items || []) {
    await query(
      upsertSql("signals", [
        "id", "title", "body", "category", "region", "source_name", "source_url", "url",
        "published_at", "lane", "kind", "review_status", "confidence", "kentucky_connection",
        "people", "institutions", "metadata", "submitted_at", "updated_at", "status",
      ], "id"),
      [
        item.id,
        item.title,
        item.body,
        item.category,
        item.region,
        item.source,
        item.sourceUrl,
        item.url,
        item.publishedAt,
        item.lane,
        item.kind,
        item.reviewStatus,
        item.confidence,
        item.kentuckyConnection,
        JSON.stringify(item.people || []),
        JSON.stringify(item.institutions || []),
        JSON.stringify({}),
        ts,
        ts,
        "active",
      ],
    );
  }

  for (const region of regions.regions || []) {
    await query(
      upsertSql("regions", [
        "id", "slug", "name", "short_name", "headline", "summary", "maintainer", "status",
        "next_win", "focus_areas", "open_questions", "partner_asks", "recommended_toolkits",
        "updated_at",
      ], "id"),
      [
        region.id,
        region.slug,
        region.name,
        region.shortName,
        region.headline,
        region.summary,
        region.maintainer,
        region.status,
        region.nextWin,
        JSON.stringify(region.focusAreas || []),
        JSON.stringify(region.openQuestions || []),
        JSON.stringify(region.partnerAsks || []),
        JSON.stringify(region.recommendedToolkits || []),
        ts,
      ],
    );
  }

  for (const event of events.events || []) {
    await query(
      upsertSql("events", [
        "id", "title", "date", "location", "region", "host", "type", "status", "source_url", "why_it_matters", "submitted_at", "updated_at",
      ], "id"),
      [event.id, event.title, event.date, event.location, event.region, event.host, event.type, event.status, event.sourceUrl, event.whyItMatters, ts, ts],
    );
  }

  for (const profile of profiles.profiles || []) {
    await query(
      upsertSql("profiles", [
        "id", "name", "type", "region", "source_url", "reason", "claim_status", "submitted_at", "updated_at",
      ], "id"),
      [profile.id, profile.name, profile.type, profile.region, profile.sourceUrl, profile.reason, profile.claimStatus, ts, ts],
    );
  }

  for (const toolkit of toolkits.toolkits || []) {
    await query(
      upsertSql("toolkits", [
        "id", "title", "audience", "use_case", "status", "review_needed", "sections", "starter_text", "submitted_at", "updated_at",
      ], "id"),
      [toolkit.id, toolkit.title, toolkit.audience, toolkit.useCase, toolkit.status, toolkit.reviewNeeded, JSON.stringify(toolkit.sections || []), toolkit.starterText, ts, ts],
    );
  }
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export { isPostgres };
