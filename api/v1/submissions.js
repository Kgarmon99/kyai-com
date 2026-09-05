import { query } from "../../lib/db.mjs";
import { setCors, json, requireAuth, requireRole, rowToSubmission } from "../../lib/api-utils.mjs";

function parseFilters(url) {
  const params = url.searchParams;
  return {
    status: params.get("status") || undefined,
    type: params.get("type") || undefined,
    limit: Math.min(Math.max(parseInt(params.get("limit") || "50", 10), 1), 100),
    offset: Math.max(parseInt(params.get("offset") || "0", 10), 0),
  };
}

function buildWhere(filters) {
  const conditions = [];
  const values = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!value || key === "limit" || key === "offset") continue;
    conditions.push(`${key} = ?`);
    values.push(value);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

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

  const user = await requireAuth(request, response);
  if (!user) return;
  if (!requireRole(user, response, "admin", "editor")) return;

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const filters = parseFilters(url);
    const { where, values } = buildWhere(filters);
    const limit = filters.limit;
    const offset = filters.offset;

    const countResult = await query(`SELECT COUNT(*) as total FROM submissions ${where}`, values);
    const total = Number(countResult[0]?.total || 0);

    const rows = await query(
      `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    json(response, 200, {
      ok: true,
      type: "submissions",
      total,
      limit,
      offset,
      items: rows.map(rowToSubmission),
    });
  } catch (error) {
    console.error("Error listing submissions:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
