import { query, generateId, now } from "../../lib/db.mjs";
import { setCors, json, readBody, requireAuth, requireRole, normalizeRegion, createSubmission } from "../../lib/api-utils.mjs";

async function fetchPageText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "KYAI civic intelligence bot (+https://kyai.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

async function extractWithOpenAI(text, url, kind, category, region) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a civic intelligence extractor for KYAI, a Kentucky AI tracker. Given the following webpage text and URL, extract a concise ${kind} object. Only include information that is actually present or strongly implied by the text.

URL: ${url}
Kind: ${kind}
Suggested category: ${category || "auto"}
Suggested region: ${region || "auto"}

Text:
${text.slice(0, 6000)}

Return a single JSON object with these fields:
- title (string)
- body (string, 1-2 sentences)
- category (one of: education, workforce, research, industry, policy, events, news)
- region (Kentucky region name, e.g. "Louisville / North Central", "Lexington / Bluegrass", "Western Kentucky", "Eastern Kentucky / Appalachia", "Northern Kentucky", "South Central Kentucky", "Statewide", "Frankfort")
- sourceName (publication or site name)
- sourceUrl (${url})
- url (${url} or a more specific canonical link if clearly present)
- publishedAt (ISO date string if available, else null)
- whyItMatters (1 sentence)
- kentuckyConnection (string)
- confidence (one of: low, medium, high)

If the page is not relevant to Kentucky or AI, return {"relevant": false}.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You extract structured civic intelligence JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`OpenAI error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return content ? JSON.parse(content) : null;
}

function fallbackExtract(text, url, kind, category, region) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const title = sentences[0]?.slice(0, 120) || "Untitled ingest";
  const body = sentences.slice(0, 2).join(". ").slice(0, 280) || "Extracted from submitted URL.";
  const whyItMatters = "Submitted for editor review.";

  return {
    title,
    body,
    category: category || "news",
    region: region || "Statewide",
    sourceName: new URL(url).hostname.replace(/^www\./, ""),
    sourceUrl: url,
    url,
    publishedAt: null,
    whyItMatters,
    kentuckyConnection: "Submitted URL pending review.",
    confidence: "low",
  };
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
    const body = await readBody(request);
    const url = String(body.url || "").trim();
    const kind = String(body.kind || "signal").toLowerCase();
    const category = body.category || "";
    const region = body.region || "";

    if (!url || !URL.canParse(url)) {
      json(response, 400, { ok: false, error: "A valid url is required" });
      return;
    }

    const text = await fetchPageText(url);
    let extracted = await extractWithOpenAI(text, url, kind, category, region);
    const usedLLM = !!extracted;

    if (!extracted || extracted.relevant === false) {
      extracted = fallbackExtract(text, url, kind, category, region);
      extracted.note = usedLLM ? "LLM marked page not relevant; fallback extraction applied." : "No LLM configured; fallback extraction applied.";
    }

    if (kind === "event") {
      const eventPayload = {
        id: generateId("kyai-event"),
        title: extracted.title,
        date: extracted.publishedAt?.slice(0, 10) || "TBD",
        location: extracted.region || region || "Kentucky",
        region: extracted.region || region || "Statewide",
        host: extracted.sourceName || "Unknown host",
        type: "Event",
        status: "Submitted",
        sourceUrl: url,
        whyItMatters: extracted.whyItMatters,
      };
      const id = await createSubmission("event", eventPayload, "ingest");
      json(response, 201, { ok: true, id, type: "event", status: "pending", usedLLM, preview: eventPayload });
      return;
    }

    const signalPayload = {
      id: generateId("kyai"),
      title: extracted.title,
      body: extracted.body,
      category: extracted.category || category || "news",
      region: extracted.region || region || "Statewide",
      sourceName: extracted.sourceName,
      sourceUrl: url,
      url: extracted.url || url,
      publishedAt: extracted.publishedAt || new Date().toISOString(),
      lane: "Ingested URL",
      kind: "curated",
      reviewStatus: "Needs editor pass",
      confidence: extracted.confidence || "low",
      kentuckyConnection: extracted.kentuckyConnection,
      people: extracted.people || [],
      institutions: extracted.institutions || [],
    };

    const id = await createSubmission("signal", signalPayload, "ingest");
    json(response, 201, { ok: true, id, type: "signal", status: "pending", usedLLM, preview: signalPayload });
  } catch (error) {
    console.error("Ingest error:", error);
    json(response, 500, { ok: false, error: error.message || "Internal server error" });
  }
}
