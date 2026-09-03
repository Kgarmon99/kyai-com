const DEFAULT_NOTIFY_TO = "kahlil@getmoneybot.com";
const DEFAULT_GITHUB_REPO = "Kgarmon99/kyai-newsletter-signups";

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
    role: String(body.role || "general").trim().slice(0, 80),
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

async function deliverWithGitHub(entry) {
  const token = process.env.KYAI_NEWSLETTER_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.KYAI_NEWSLETTER_GITHUB_REPO || DEFAULT_GITHUB_REPO;
  if (!token) return false;

  await postJson(
    `https://api.github.com/repos/${repo}/issues`,
    {
      title: `Newsletter signup: ${entry.email}`,
      body: [
        "New KYAI newsletter signup.",
        "",
        `Email: ${entry.email}`,
        `Name: ${entry.name || "Not provided"}`,
        `Region: ${entry.region}`,
        `Role: ${entry.role}`,
        `Interests: ${entry.interests.join(", ")}`,
        `Source: ${entry.source}`,
        `Created: ${entry.createdAt}`,
      ].join("\n"),
    },
    {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "kyai-newsletter-signup",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  );
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
        `Role: ${entry.role}`,
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
      (await deliverWithGitHub(entry)) ||
      (await deliverWithResend(entry)) ||
      false;

    if (!delivered) {
      throw new Error("No newsletter delivery backend configured");
    }

    json(response, 200, { ok: true, savedRemotely: delivered, delivery: "private-intake" });
  } catch (error) {
    console.error("Newsletter signup failed", error);
    json(response, 502, {
      ok: false,
      error: "Newsletter signup is temporarily unavailable.",
    });
  }
}
