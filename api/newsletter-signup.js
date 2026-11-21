import { query, upsertSql } from "../lib/db.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_NOTIFY_TO = "kahlil@getmoneybot.com";
const DEFAULT_GITHUB_REPO = "Kgarmon99/kyai-newsletter-signups";

// A subscriber is durably recorded only when it lands in the Resend audience
// or in Postgres. The local SQLite file and data/subscribers.json are
// ephemeral on Vercel serverless, so they never count as durable storage.
export function isPostgresDatabase() {
  const url = process.env.DATABASE_URL || "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

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

async function saveSubscriberLocally(entry, welcomeSent) {
  // 1. Save to SQLite / Postgres database. Returns true only when the insert
  // succeeded against Postgres, the only durable database here.
  let postgresStored = false;
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
        welcomeSent ? 1 : 0,
      ]
    );
    postgresStored = isPostgresDatabase();
  } catch (err) {
    console.error("DB subscriber save warning:", err.message);
  }

  // 2. Save to data/subscribers.json file in repo (best-effort record only;
  // the file is ephemeral on Vercel, so this never counts as durable).
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

  return postgresStored;
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

// Add the subscriber to the Resend audience. This is the durable record that
// the weekly broadcast sends to. Returns true when the contact is in the
// audience, including when it was already there. The fetch implementation is
// injectable so tests can stub it without network calls.
// Note: Resend marks the audience-nested contacts endpoint as legacy in
// favor of POST /contacts with segments, but the endpoint is still supported
// by the current official SDK and is the shape confirmed to persist contacts
// into an audience. If Resend removes it, switch to POST /contacts with
// segments: [{ id: KYAI_RESEND_AUDIENCE_ID }].
export async function addResendContact(entry, fetchImpl = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.KYAI_RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return false;

  const { firstName, lastName } = splitName(entry.name);
  try {
    const response = await fetchImpl(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: entry.email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          unsubscribed: false,
        }),
      }
    );

    if (response.ok) return true;

    // A contact that is already in the audience is still durably stored.
    const text = await response.text().catch(() => "");
    if (response.status === 409 || /already exists/i.test(text)) return true;

    console.error("Resend contact add failed:", response.status, text.slice(0, 240));
    return false;
  } catch (err) {
    console.error("Resend contact add failed:", err.message);
    return false;
  }
}

export function buildWelcomeEmail(entry) {
  const subject = "Welcome to KYAI, the Kentucky AI Pulse";
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
      <a class="brand" href="https://ky-ai.vercel.app/">KYAI <span>AI for Kentucky</span></a>
      <h1>Welcome to KYAI${entry.name ? `, ${escapeHtml(entry.name)}` : ""}!</h1>
      <p>Thank you for joining the <strong>Kentucky AI Pulse</strong>. You are officially on the list to receive our local AI intelligence briefs, regional updates, and workshop alerts.</p>

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
        <li><a href="https://ky-ai.vercel.app/#intelligence" style="color:#38bdf8; text-decoration:none;">Latest Kentucky AI signals</a></li>
        <li><a href="https://ky-ai.vercel.app/#regions" style="color:#38bdf8; text-decoration:none;">Regional AI intelligence briefs</a></li>
        <li><a href="https://ky-ai.vercel.app/#events" style="color:#38bdf8; text-decoration:none;">Kentucky AI event calendar and rooms</a></li>
        <li><a href="https://ky-ai.vercel.app/#contribute" style="color:#38bdf8; text-decoration:none;">Share a lead or get involved</a></li>
      </ul>

      <a class="button" href="https://ky-ai.vercel.app/">Open KYAI Intelligence Feed &rarr;</a>

      <div class="footer">
        KYAI &bull; Open AI intelligence and civic education for Kentucky.<br/>
        To update your preferences or unsubscribe, reply directly to this email.
      </div>
    </div>
  </body>
</html>`;
  const text = [
    `Welcome to KYAI${entry.name ? `, ${entry.name}` : ""}!`,
    "",
    "Thank you for subscribing to the Kentucky AI Pulse.",
    "",
    `Your Region: ${entry.region}`,
    `Your Role: ${entry.role}`,
    "",
    "Explore what is live on KYAI today:",
    "Latest Kentucky AI signals: https://ky-ai.vercel.app/#intelligence",
    "Regional AI intelligence briefs: https://ky-ai.vercel.app/#regions",
    "Kentucky AI event calendar and rooms: https://ky-ai.vercel.app/#events",
    "Share a lead or get involved: https://ky-ai.vercel.app/#contribute",
  ].join("\n");

  return { subject, html, text };
}

async function sendSubscriberWelcomeEmail(entry) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("RESEND_API_KEY not set; generated confirmation response for subscriber:", entry.email);
    return false;
  }

  const { subject, html, text } = buildWelcomeEmail(entry);
  await postJson(
    "https://api.resend.com/emails",
    {
      from: process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>",
      to: [entry.email],
      subject,
      html,
      text,
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
    // Dry run simulates a durable save without side effects. No email is
    // sent in this mode, so welcomeSent stays false.
    json(response, 200, { ok: true, stored: true, welcomeSent: false, delivery: "dry-run" });
    return;
  }

  try {
    // 1. Durable subscriber record: add the contact to the Resend audience.
    const resendStored = await addResendContact(entry);

    // 2. Send the welcome email to the subscriber.
    const welcomeSent = await sendSubscriberWelcomeEmail(entry).catch((err) => {
      console.error("Welcome email notice:", err.message);
      return false;
    });

    // 3. Best-effort local records (DB + JSON). Only a Postgres insert is durable.
    const postgresStored = await saveSubscriberLocally(entry, welcomeSent);
    const stored = resendStored || postgresStored;

    // 4. Deliver admin notifications (GitHub issue / Resend notification / Webhook)
    await Promise.allSettled([
      deliverWithGitHub(entry),
      deliverNotificationToAdmin(entry),
      deliverWithWebhook(entry),
    ]);

    json(response, 200, {
      ok: true,
      email: entry.email,
      stored,
      welcomeSent,
    });
  } catch (error) {
    console.error("Newsletter signup processing:", error);
    json(response, 200, {
      ok: false,
      email: entry.email,
      stored: false,
      welcomeSent: false,
      error: "Signup could not be completed.",
    });
  }
}
