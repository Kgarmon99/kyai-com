import { query, generateId, now } from "./db.mjs";
import {
  setCors,
  json,
  parseFilters,
  buildWhere,
  rowToSignal,
  rowToEvent,
  rowToProfile,
  rowToToolkit,
  rowToRegion,
  createSubmission,
} from "./api-utils.mjs";

const TABLE_MAP = {
  signals: { rowMapper: rowToSignal, table: "signals", allowedFilters: ["region", "category", "status", "review_status"] },
  events: { rowMapper: rowToEvent, table: "events", allowedFilters: ["region", "type", "status"] },
  profiles: { rowMapper: rowToProfile, table: "profiles", allowedFilters: ["region", "type", "claim_status"] },
  toolkits: { rowMapper: rowToToolkit, table: "toolkits", allowedFilters: ["status", "audience"] },
  regions: { rowMapper: rowToRegion, table: "regions", allowedFilters: ["status"] },
};

export function createListHandler(type) {
  const config = TABLE_MAP[type];

  return async function handler(request, response) {
    setCors(response);
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    try {
      const filters = parseFilters(new URL(request.url, `http://${request.headers.host}`));
      const { where, values } = buildWhere(filters, config.allowedFilters);
      const limit = filters.limit;
      const offset = filters.offset;

      const countResult = await query(`SELECT COUNT(*) as total FROM ${config.table} ${where}`, values);
      const total = Number(countResult[0]?.total || 0);

      const rows = await query(`SELECT * FROM ${config.table} ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);

      json(response, 200, {
        ok: true,
        type,
        total,
        limit,
        offset,
        items: rows.map(config.rowMapper),
      });
    } catch (error) {
      console.error(`Error listing ${type}:`, error);
      json(response, 500, { ok: false, error: "Internal server error" });
    }
  };
}

export function createDetailHandler(type) {
  const config = TABLE_MAP[type];

  return async function handler(request, response) {
    setCors(response);
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const id = url.pathname.split("/").pop();
      const rows = await query(`SELECT * FROM ${config.table} WHERE id = ? LIMIT 1`, [id]);
      if (!rows.length) {
        json(response, 404, { ok: false, error: "Not found" });
        return;
      }
      json(response, 200, { ok: true, [type.slice(0, -1)]: config.rowMapper(rows[0]) });
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      json(response, 500, { ok: false, error: "Internal server error" });
    }
  };
}

export async function handleSubmission(request, response) {
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

  try {
    const { readBody } = await import("./api-utils.mjs");
    const body = await readBody(request);
    const type = String(body.type || "").toLowerCase();
    const allowedTypes = ["signal", "event", "profile", "toolkit"];

    if (!allowedTypes.includes(type)) {
      json(response, 400, { ok: false, error: `type must be one of: ${allowedTypes.join(", ")}` });
      return;
    }

    const payload = body.payload || body;
    if (!payload.title && !payload.name) {
      json(response, 400, { ok: false, error: "payload must include a title or name" });
      return;
    }

    const id = await createSubmission(type, payload, body.source || "public-api");
    json(response, 201, { ok: true, id, status: "pending", message: "Submission received and pending review" });
  } catch (error) {
    console.error("Error creating submission:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
