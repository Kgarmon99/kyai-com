import { query } from "../../lib/db.mjs";
import { setCors, json, requireAuth, rowToSubscriber } from "../../lib/api-utils.mjs";

export default async function handler(request, response) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const user = await requireAuth(request, response);
  if (!user) return;

  if (request.method !== "GET") {
    json(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const region = url.searchParams.get("region") || "";
    const role = url.searchParams.get("role") || "";

    const conditions = [];
    const values = [];

    if (region) {
      conditions.push("region = ?");
      values.push(region);
    }
    if (role) {
      conditions.push("role = ?");
      values.push(role);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query(`SELECT * FROM subscribers ${whereClause} ORDER BY created_at DESC`, values);

    json(response, 200, {
      ok: true,
      total: rows.length,
      subscribers: rows.map(rowToSubscriber),
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
