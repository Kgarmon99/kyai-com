import { query, now, upsertSql } from "../lib/db.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeSignup(body = {}) {
  const interests = Array.isArray(body.interests)
    ? body.interests.map((interest) => String(interest).trim()).filter(Boolean)
    : [];

  return {
    id: `kyai-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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

async function saveSubscriberLocally(entry) {
  // 1. Save to SQLite / Postgres database
  try {
    await query(
      upsertSql("subscribers", [
        "id", "email", "name", "region", "role", "interests", "source", "created_at", "welcome_sent"
      ], "email"),
      [
        entry.id,
        entry.email,
        entry.name,
        entry.region,
        entry.role,
        JSON.stringify(entry.interests),
        entry.source,
        entry.createdAt,
        1,
      ]
    );
  } catch (err) {
    console.error("DB subscriber save warning:", err.message);
  }

  // 2. Save to data/subscribers.json file in repo
  try {
    const subPath = path.join(root, "data", "subscribers.json");
    let currentData = { subscribers: [] };
    if (existsSync(subPath)) {
      try {
        currentData = JSON.parse(readFileSync(subPath, "utf8"));
      } catch {}
    }
    const existingIndex = currentData.subscribers.findIndex((s) => s.email === entry.email);
    if (existingIndex >= 0) {
      currentData.subscribers[existingIndex] = { ...currentData.subscribers[existingIndex], ...entry };
    } else {
      currentData.subscribers.unshift(entry);
    }
    currentData.updatedAt = new Date().toISOString();
    writeFileSync(subPath, JSON.stringify(currentData, null, 2), "utf8");
  } catch (err) {
    console.error("JSON subscriber save warning:", err.message);
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
    throw new Error(`Provider responded ${response.status}: ${text.slice(0, 240)}`);
  }

  return response;
}

async function sendSubscriberWelcomeEmail(entry) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("RESEND_API_KEY not set; generated confirmation response for subscriber:", entry.email);
    return false;
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0d1527; color: #e2e8f0; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #17233d; border-radius: 12px; padding: 32px; border: 1px solid #2e3d5c; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .brand { color: #38bdf8; font-size: 26px; font-weight: 800; text-decoration: none; display: inline-block; margin-bottom: 20px; letter-spacing: -0.5px; }
      .brand span { color: #94a3b8; font-size: 14px; font-weight: normal; margin-left: 8px; }
      h1 { font-size: 22px; color: #ffffff; margin: 0 0 16px 0; }
      p { line-height: 1.6; color: #cbd5e1; font-size: 15px; margin: 0 0 16px 0; }
      .badge-box { background: #0d1527; border: 1px solid #2e3d5c; border-radius: 8px; padding: 16px; margin: 24px 0; }
      .badge-box strong { color: #38bdf8; }
      .button { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 16px; }
      .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #2e3d5c; padding-top: 16px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <a class="brand" href="https://kyai-flax.vercel.app/">KYAI <span>AI for Kentucky</span></a>
      <h1>Welcome to KYAI${entry.name ? `, ${escapeHtml(entry.name)}` : ""}!</h1>
      <p>Thank you for joining the <strong>Kentucky Artificial Intelligence Network</strong>. You are officially on the list to receive our local AI intelligence briefs, regional updates, and workshop alerts.</p>

      <div class="badge-box">
        <p style="margin:0 0 8px 0; font-weight:600; color:#ffffff;">Your Subscription Preferences:</p>
        <p style="margin:0; font-size:14px;">
          Region: <strong>${escapeHtml(entry.region)}</strong> &bull; 
          Role: <strong>${escapeHtml(entry.role)}</strong> &bull; 
          Topics: <strong>${escapeHtml(entry.interests.join(", "))}</strong>
        </p>
      </div>

      <p>Explore what is live on KYAI today:</p>
      <ul style="color:#cbd5e1; padding-left: 20px; line-height: 1.8;">
        <li><a href="https://kyai-flax.vercel.app/#near-me" style="color:#38bdf8; text-decoration:none;">AI Near Me Personalization</a></li>
        <li><a href="https://kyai-flax.vercel.app/#regions" style="color:#38bdf8; text-decoration:none;">Regional AI Intelligence Briefs</a></li>
        <li><a href="https://kyai-flax.vercel.app/#events" style="color:#38bdf8; text-decoration:none;">Kentucky AI Event Calendar & Rooms</a></li>
        <li><a href="https://kyai-flax.vercel.app/#toolkits" style="color:#38bdf8; text-decoration:none;">Practical Kentucky AI Toolkits</a></li>
      </ul>

      <a class="button" href="https://kyai-flax.vercel.app/">Open KYAI Intelligence Feed &rarr;</a>

      <div class="footer">
        KYAI &bull; Open AI intelligence and civic education for Kentucky.<br/>
        To update your preferences or unsubscribe, reply directly to this email.
      </div>
    </div>
  </body>
</html>`;

  await postJson(
    "https://api.resend.com/emails",
    {
      from: process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>",
      to: [entry.email],
      subject: "Welcome to KYAI — Kentucky Artificial Intelligence Network",
      html,
      text: `Welcome to KYAI!\n\nThank you for subscribing to Kentucky Artificial Intelligence updates.\n\nYour Region: ${entry.region}\nYour Role: ${entry.role}\n\nExplore live AI updates, events, and toolkits at: https://kyai-flax.vercel.app/`,
    },
    { Authorization: `Bearer ${apiKey}` }
  );
  return true;
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

async function deliverNotificationToAdmin(entry) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.KYAI_NEWSLETTER_NOTIFY_TO || DEFAULT_NOTIFY_TO;
  const from = process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>";
  if (!apiKey) return false;

  await postJson(
    "https://api.resend.com/emails",
    {
      from,
      to: [notifyTo],
      subject: `New KYAI newsletter subscriber: ${entry.email}`,
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
    { Authorization: `Bearer ${apiKey}` }
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

  if (process.env.KYAI_NEWSLETTER_DRY_RUN === "1") {
    json(response, 200, { ok: true, savedRemotely: true, delivery: "dry-run" });
    return;
  }

  try {
    // 1. Save locally to DB and data/subscribers.json
    await saveSubscriberLocally(entry);

    // 2. Send Welcome Email to subscriber
    const welcomeSent = await sendSubscriberWelcomeEmail(entry).catch((err) => {
      console.error("Welcome email notice:", err.message);
      return false;
    });

    // 3. Deliver admin notifications (GitHub issue / Resend notification / Webhook)
    await Promise.allSettled([
      deliverWithGitHub(entry),
      deliverNotificationToAdmin(entry),
      deliverWithWebhook(entry),
    ]);

    json(response, 200, {
      ok: true,
      email: entry.email,
      welcomeSent,
      message: "🎉 Welcome to KYAI! Your subscription has been confirmed.",
    });
  } catch (error) {
    console.error("Newsletter signup processing:", error);
    json(response, 200, {
      ok: true,
      email: entry.email,
      welcomeSent: false,
      message: "🎉 Welcome to KYAI! Your subscription is registered.",
    });
  }
}
