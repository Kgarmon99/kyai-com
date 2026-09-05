import { createHash, randomUUID } from "node:crypto";
import { query, now } from "./db.mjs";

export const ALLOWED_ORIGINS = (process.env.KYAI_ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());

export function setCors(response, origin = "*") {
  const allowed = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") ? origin : ALLOWED_ORIGINS[0];
  response.setHeader("Access-Control-Allow-Origin", allowed);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-KYAI-API-Key");
}

export function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  return `kyai_${randomUUID().replace(/-/g, "")}`;
}

export async function requireAuth(request, response) {
  const key = request.headers["x-kyai-api-key"] || "";
  if (!key) {
    json(response, 401, { ok: false, error: "Missing X-KYAI-API-Key header" });
    return null;
  }

  const hash = hashApiKey(key);
  const rows = await query("SELECT id, email, role, region, name FROM users WHERE api_key_hash = ?", [hash]);
  if (!rows.length) {
    json(response, 403, { ok: false, error: "Invalid API key" });
    return null;
  }

  return rows[0];
}

export function requireRole(user, response, ...roles) {
  if (!roles.includes(user.role)) {
    json(response, 403, { ok: false, error: `Requires role: ${roles.join(" or ")}` });
    return false;
  }
  return true;
}

export function parseFilters(url) {
  const params = url.searchParams;
  return {
    region: params.get("region") || undefined,
    category: params.get("category") || undefined,
    status: params.get("status") || undefined,
    limit: Math.min(Math.max(parseInt(params.get("limit") || "50", 10), 1), 100),
    offset: Math.max(parseInt(params.get("offset") || "0", 10), 0),
  };
}

export function buildWhere(filters, allowedColumns = []) {
  const conditions = [];
  const values = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!value || key === "limit" || key === "offset") continue;
    const column = key === "region" ? "region" : key;
    if (!allowedColumns.includes(column)) continue;
    conditions.push(`${column} = ?`);
    values.push(value);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

export function normalizeRegion(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("western") || text.includes("west") || text.includes("paducah") || text.includes("murray")) return "western";
  if (text.includes("louisville")) return "louisville";
  if (text.includes("lexington") || text.includes("bluegrass")) return "bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("pikeville") || text.includes("morehead") || text.includes("richmond")) return "appalachia";
  if (text.includes("northern") || text.includes("nku")) return "northern";
  if (text.includes("south") || text.includes("bowling") || text.includes("wku")) return "southcentral";
  if (text.includes("frankfort")) return "frankfort";
  return value || "statewide";
}

export function rowToSignal(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    region: row.region,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    url: row.url,
    publishedAt: row.published_at,
    lane: row.lane,
    kind: row.kind,
    reviewStatus: row.review_status,
    confidence: row.confidence,
    kentuckyConnection: row.kentucky_connection,
    people: safeJsonParse(row.people, []),
    institutions: safeJsonParse(row.institutions, []),
    metadata: safeJsonParse(row.metadata, {}),
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    status: row.status,
  };
}

export function rowToEvent(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    location: row.location,
    region: row.region,
    host: row.host,
    type: row.type,
    status: row.status,
    sourceUrl: row.source_url,
    whyItMatters: row.why_it_matters,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export function rowToProfile(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region,
    sourceUrl: row.source_url,
    reason: row.reason,
    claimStatus: row.claim_status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export function rowToToolkit(row) {
  return {
    id: row.id,
    title: row.title,
    audience: row.audience,
    useCase: row.use_case,
    status: row.status,
    reviewNeeded: row.review_needed,
    sections: safeJsonParse(row.sections, []),
    starterText: row.starter_text,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export function rowToRegion(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    headline: row.headline,
    summary: row.summary,
    maintainer: row.maintainer,
    status: row.status,
    nextWin: row.next_win,
    focusAreas: safeJsonParse(row.focus_areas, []),
    openQuestions: safeJsonParse(row.open_questions, []),
    partnerAsks: safeJsonParse(row.partner_asks, []),
    recommendedToolkits: safeJsonParse(row.recommended_toolkits, []),
  };
}

export function rowToSubmission(row) {
  return {
    id: row.id,
    type: row.type,
    payload: safeJsonParse(row.payload, {}),
    source: row.source,
    status: row.status,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSubscriber(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    region: row.region,
    role: row.role,
    interests: safeJsonParse(row.interests, []),
    source: row.source,
    createdAt: row.created_at,
    welcomeSent: Boolean(row.welcome_sent),
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createSubmission(type, payload, source = "api") {
  const id = `kyai-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = now();
  await query(
    "INSERT INTO submissions (id, type, payload, source, status, reviewer_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, type, JSON.stringify(payload), source, "pending", "", ts, ts],
  );
  return id;
}
