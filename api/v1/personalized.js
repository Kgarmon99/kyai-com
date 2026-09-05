import { query } from "../../lib/db.mjs";
import { setCors, json, normalizeRegion, rowToSignal, rowToEvent, rowToProfile, rowToToolkit } from "../../lib/api-utils.mjs";

const CATEGORY_MAP = {
  business: ["workforce", "industry", "events"],
  teacher: ["education", "policy", "events"],
  student: ["education", "research", "events"],
  founder: ["industry", "research", "workforce"],
  civic: ["policy", "workforce", "education"],
  journalist: ["policy", "industry", "research"],
};

function matchesRegion(itemRegion, targetKey) {
  if (targetKey === "statewide") return true;
  return normalizeRegion(itemRegion) === targetKey;
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

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const role = url.searchParams.get("role") || "business";
    const region = url.searchParams.get("region") || "statewide";
    const categories = CATEGORY_MAP[role] || ["education", "workforce", "policy"];
    const regionKey = normalizeRegion(region);

    const [signalRows, eventRows, profileRows, toolkitRows] = await Promise.all([
      query("SELECT * FROM signals WHERE status = 'active' ORDER BY published_at DESC LIMIT 50", []),
      query("SELECT * FROM events ORDER BY date DESC LIMIT 50", []),
      query("SELECT * FROM profiles ORDER BY updated_at DESC LIMIT 50", []),
      query("SELECT * FROM toolkits ORDER BY updated_at DESC LIMIT 50", []),
    ]);

    const signals = signalRows
      .filter((row) => matchesRegion(row.region, regionKey))
      .sort((a, b) => {
        const aCat = categories.includes(a.category) ? 1 : 0;
        const bCat = categories.includes(b.category) ? 1 : 0;
        return bCat - aCat;
      })
      .slice(0, 6)
      .map(rowToSignal);

    const events = eventRows.filter((row) => matchesRegion(row.region, regionKey)).slice(0, 3).map(rowToEvent);
    const profiles = profileRows.filter((row) => matchesRegion(row.region, regionKey)).slice(0, 3).map(rowToProfile);

    const roleKeywords = {
      business: ["business", "workflows", "Main Street", "small business"],
      teacher: ["school", "education", "classroom", "policy"],
      student: ["opportunity", "pathway", "research", "student"],
      founder: ["opportunity", "infrastructure", "startup", "founder"],
      civic: ["public", "civic", "meeting", "policy"],
      journalist: ["source", "research", "signal", "public"],
    };

    const keywords = roleKeywords[role] || [];
    const toolkits = toolkitRows
      .filter((row) => keywords.some((kw) => `${row.title} ${row.use_case || ""} ${row.audience || ""}`.toLowerCase().includes(kw.toLowerCase())))
      .slice(0, 3)
      .map(rowToToolkit);

    const actions = {
      business: "Request a practical AI clinic for your chamber or team.",
      teacher: "Follow education signals and request a school-facing session.",
      student: "Find nearby programs and add a student project to the map.",
      founder: "Share what you are building or claim a founder profile.",
      civic: "Submit public meetings and request a civic AI briefing.",
      journalist: "Use signal pages as a reporting queue and add missing context.",
    };

    json(response, 200, {
      ok: true,
      role,
      region,
      signals,
      events,
      profiles,
      toolkits: toolkits.length ? toolkits : toolkitRows.slice(0, 3).map(rowToToolkit),
      recommendedAction: actions[role] || actions.business,
    });
  } catch (error) {
    console.error("Personalized error:", error);
    json(response, 500, { ok: false, error: "Internal server error" });
  }
}
