import { query } from "../../../lib/db.mjs";
import { setCors, json, rowToSignal, rowToEvent, rowToProfile, rowToToolkit } from "../../../lib/api-utils.mjs";

const MAPPERS = {
  signals: { rowMapper: rowToSignal, table: "signals" },
  events: { rowMapper: rowToEvent, table: "events" },
  profiles: { rowMapper: rowToProfile, table: "profiles" },
  toolkits: { rowMapper: rowToToolkit, table: "toolkits" },
};

export default async function handler(request, response) {
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
    const segments = url.pathname.split("/").filter(Boolean);
    const type = segments[segments.length - 1].replace(/\.json$/, "");

    if (!MAPPERS[type]) {
      json(response, 404, { ok: false, error: "Unknown feed type" });
      return;
    }

    const { rowMapper, table } = MAPPERS[type];
    const rows = await query(`SELECT * FROM ${table} ORDER BY updated_at DESC LIMIT 200`, []);

    const feed = {
      generatedAt: new Date().toISOString(),
      type,
      total: rows.length,
      items: rows.map(rowMapper),
    };

    json(response, 200, feed);
  } catch (error) {
    console.error("Feed error:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
