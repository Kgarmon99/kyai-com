const DEFAULT_NOTIFY_TO = "kahlil@getmoneybot.com";
const FORM_SUBMIT_ENDPOINT = "https://formsubmit.co/ajax";

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSignup(body = {}) {
  const interests = Array.isArray(body.interests)
    ? body.interests.map((interest) => String(interest).trim()).filter(Boolean)
    : [];

  return {
    email: String(body.email || "").trim().toLowerCase(),
    name: String(body.name || "").trim().slice(0, 120),
    region: String(body.region || "Statewide").trim().slice(0, 120),
    interests: interests.length ? interests.slice(0, 8) : ["weekly-pulse"],
    createdAt: body.createdAt || new Date().toISOString(),
    source: String(body.source || "kyai-newsletter").trim().slice(0, 80),
  };
}

async function readBody(request) {
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

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Newsletter provider responded ${response.status}: ${text.slice(0, 240)}`);
  }

  return response;
}

async function deliverWithWebhook(entry) {
  const webhookUrl = process.env.KYAI_NEWSLETTER_WEBHOOK_URL;
  if (!webhookUrl) return false;

  await postJson(webhookUrl, {
    type: "kyai.newsletter_signup",
    data: entry,
  });
  return true;
}

async function deliverWithResend(entry) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.KYAI_NEWSLETTER_NOTIFY_TO || DEFAULT_NOTIFY_TO;
  const from = process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>";
  if (!apiKey) return false;

  await postJson(
    "https://api.resend.com/emails",
    {
      from,
      to: [notifyTo],
      subject: `New KYAI newsletter signup: ${entry.email}`,
      text: [
        "New KYAI newsletter signup",
        "",
        `Email: ${entry.email}`,
        `Name: ${entry.name || "Not provided"}`,
        `Region: ${entry.region}`,
        `Interests: ${entry.interests.join(", ")}`,
        `Source: ${entry.source}`,
        `Created: ${entry.createdAt}`,
      ].join("\n"),
    },
    {
      Authorization: `Bearer ${apiKey}`,
    },
  );
  return true;
}

async function deliverWithFormSubmit(entry) {
  const notifyTo = process.env.KYAI_NEWSLETTER_NOTIFY_TO || DEFAULT_NOTIFY_TO;

  await postJson(`${FORM_SUBMIT_ENDPOINT}/${encodeURIComponent(notifyTo)}`, {
    _subject: `New KYAI newsletter signup: ${entry.email}`,
    _template: "table",
    _captcha: "false",
    email: entry.email,
    name: entry.name || "Not provided",
    region: entry.region,
    interests: entry.interests.join(", "),
    source: entry.source,
    createdAt: entry.createdAt,
  });
  return true;
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

  const entry = normalizeSignup(await readBody(request));
  if (!isValidEmail(entry.email)) {
    json(response, 400, { ok: false, error: "A valid email is required." });
    return;
  }

  try {
    if (process.env.KYAI_NEWSLETTER_DRY_RUN === "1") {
      json(response, 200, { ok: true, savedRemotely: true, delivery: "dry-run" });
      return;
    }

    const delivered =
      (await deliverWithWebhook(entry)) ||
      (await deliverWithResend(entry)) ||
      (await deliverWithFormSubmit(entry));

    json(response, 200, { ok: true, savedRemotely: delivered, delivery: "notification" });
  } catch (error) {
    console.error("Newsletter signup failed", error);
    json(response, 502, {
      ok: false,
      error: "Newsletter signup is temporarily unavailable.",
    });
  }
}
