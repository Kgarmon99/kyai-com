import { query, now, generateId } from "../../../../../lib/db.mjs";
import { setCors, json, readBody, requireAuth, requireRole, rowToSubmission } from "../../../../../lib/api-utils.mjs";

function safeJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function publishSignal(payload, ts) {
  const id = payload.id || generateId("kyai");
  await query(
    `INSERT INTO signals
     (id, title, body, category, region, source_name, source_url, url, published_at, lane, kind, review_status, confidence, kentucky_connection, people, institutions, metadata, submitted_at, updated_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       title=excluded.title, body=excluded.body, category=excluded.category, region=excluded.region,
       source_name=excluded.source_name, source_url=excluded.source_url, url=excluded.url,
       published_at=excluded.published_at, lane=excluded.lane, kind=excluded.kind,
       review_status=excluded.review_status, confidence=excluded.confidence,
       kentucky_connection=excluded.kentucky_connection, people=excluded.people,
       institutions=excluded.institutions, metadata=excluded.metadata, updated_at=excluded.updated_at, status=excluded.status`,
    [
      id,
      payload.title,
      payload.body,
      payload.category,
      payload.region,
      payload.sourceName || payload.source,
      payload.sourceUrl,
      payload.url,
      payload.publishedAt || payload.date,
      payload.lane,
      payload.kind || "curated",
      "Curated source",
      payload.confidence || "high",
      payload.kentuckyConnection,
      JSON.stringify(payload.people || []),
      JSON.stringify(payload.institutions || []),
      JSON.stringify(payload.metadata || {}),
      ts,
      ts,
      "active",
    ],
  );
  return id;
}

async function publishEvent(payload, ts) {
  const id = payload.id || generateId("kyai-event");
  await query(
    `INSERT INTO events (id, title, date, location, region, host, type, status, source_url, why_it_matters, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       title=excluded.title, date=excluded.date, location=excluded.location, region=excluded.region,
       host=excluded.host, type=excluded.type, status=excluded.status, source_url=excluded.source_url,
       why_it_matters=excluded.why_it_matters, updated_at=excluded.updated_at`,
    [id, payload.title, payload.date, payload.location, payload.region, payload.host, payload.type, "Source verified", payload.sourceUrl, payload.whyItMatters, ts, ts],
  );
  return id;
}

async function publishProfile(payload, ts) {
  const id = payload.id || generateId("kyai-profile");
  await query(
    `INSERT INTO profiles (id, name, type, region, source_url, reason, claim_status, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name=excluded.name, type=excluded.type, region=excluded.region, source_url=excluded.source_url,
       reason=excluded.reason, claim_status=excluded.claim_status, updated_at=excluded.updated_at`,
    [id, payload.name, payload.type, payload.region, payload.sourceUrl, payload.reason, payload.claimStatus || "Open profile", ts, ts],
  );
  return id;
}

async function publishToolkit(payload, ts) {
  const id = payload.id || generateId("kyai-toolkit");
  await query(
    `INSERT INTO toolkits (id, title, audience, use_case, status, review_needed, sections, starter_text, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       title=excluded.title, audience=excluded.audience, use_case=excluded.use_case, status=excluded.status,
       review_needed=excluded.review_needed, sections=excluded.sections, starter_text=excluded.starter_text, updated_at=excluded.updated_at`,
    [id, payload.title, payload.audience, payload.useCase, payload.status || "Shareable", payload.reviewNeeded, JSON.stringify(payload.sections || []), payload.starterText, ts, ts],
  );
  return id;
}

async function publish(type, payload) {
  const ts = now();
  switch (type) {
    case "signal":
      return await publishSignal(payload, ts);
    case "event":
      return await publishEvent(payload, ts);
    case "profile":
      return await publishProfile(payload, ts);
    case "toolkit":
      return await publishToolkit(payload, ts);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

export default async function handler(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "POST") {
    json(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const user = await requireAuth(request, response);
  if (!user) return;
  if (!requireRole(user, response, "admin", "editor")) return;

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const segments = url.pathname.split("/").filter(Boolean);
    const type = segments[3];
    const id = segments[4];
    const action = segments[5];

    const validTypes = ["signal", "event", "profile", "toolkit"];
    const validActions = ["approve", "reject", "request_changes"];

    if (!validTypes.includes(type)) {
      json(response, 400, { ok: false, error: `type must be one of: ${validTypes.join(", ")}` });
      return;
    }
    if (!validActions.includes(action)) {
      json(response, 400, { ok: false, error: `action must be one of: ${validActions.join(", ")}` });
      return;
    }

    const rows = await query("SELECT * FROM submissions WHERE id = ? AND type = ? LIMIT 1", [id, type]);
    if (!rows.length) {
      json(response, 404, { ok: false, error: "Submission not found" });
      return;
    }

    const submission = rowToSubmission(rows[0]);
    const body = await readBody(request);
    const reviewerNotes = body.reviewerNotes || body.notes || "";
    const ts = now();

    if (action === "approve") {
      const publishedId = await publish(type, submission.payload);
      await query(
        "UPDATE submissions SET status = ?, reviewer_notes = ?, updated_at = ? WHERE id = ?",
        ["approved", reviewerNotes, ts, id],
      );
      json(response, 200, { ok: true, action, submissionId: id, publishedId, type, status: "approved" });
      return;
    }

    const newStatus = action === "reject" ? "rejected" : "changes_requested";
    await query(
      "UPDATE submissions SET status = ?, reviewer_notes = ?, updated_at = ? WHERE id = ?",
      [newStatus, reviewerNotes, ts, id],
    );
    json(response, 200, { ok: true, action, submissionId: id, type, status: newStatus });
  } catch (error) {
    console.error("Review error:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
