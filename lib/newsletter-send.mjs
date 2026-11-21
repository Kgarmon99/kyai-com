// Shared weekly newsletter build and send logic. Used by the manual CLI
// (scripts/send-weekly-newsletter.mjs) and the Vercel Cron route
// (api/send-weekly-newsletter.js), so the digest and the Resend send exist
// in exactly one place.
//
// The digest is built from the current data files. No refresh happens here:
// the daily intelligence-refresh GitHub Action keeps the feed fresh, and
// each refresh redeploys the site, so the deployed route reads fresh data.
//
// Required env:
//   RESEND_API_KEY            Resend API key (starts with re_)
//   KYAI_RESEND_AUDIENCE_ID   Resend audience ID holding the subscribers
// Optional env:
//   KYAI_NEWSLETTER_FROM      Sender, e.g. KYAI <updates@kyai.com> (must use a
//                             domain verified in Resend to reach subscribers)
//   KYAI_NEWSLETTER_TEST_TO   If set, send one test email to this address
//                             instead of broadcasting to the audience.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = "https://ky-ai.vercel.app";

export function formatLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(date);
}

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build the plain-text weekly digest from a parsed intelligence feed: one
// item per category first, then the newest remaining items, up to 8 total.
export function buildDigest(feed) {
  const feedItems = feed.items || [];
  const categoryOrder = ["industry", "research", "education", "policy", "workforce", "events", "news"];
  const picked = [];
  const seenIds = new Set();

  for (const category of categoryOrder) {
    const item = feedItems.find((candidate) => candidate.category === category && !seenIds.has(candidate.id));
    if (item) {
      picked.push(item);
      seenIds.add(item.id);
    }
  }

  for (const item of feedItems) {
    if (picked.length >= 8) break;
    if (seenIds.has(item.id)) continue;
    picked.push(item);
    seenIds.add(item.id);
  }

  const items = picked.slice(0, 8);
  const updated = feed.updatedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Chicago",
      }).format(new Date(feed.updatedAt))
    : "not refreshed yet";

  const lines = [
    `KYAI Kentucky AI digest`,
    `Updated: ${updated}`,
    `Items tracked: ${feed.summary?.totalItems || items.length}`,
    `Curated leads: ${feed.summary?.curatedItems || 0}`,
    "",
  ];

  if (!items.length) {
    lines.push("No fresh items yet. Run npm run refresh:intel to populate the feed.");
  } else {
    for (const item of items) {
      const date = item.publishedAt ? item.publishedAt.slice(0, 10) : "undated";
      const people = item.people?.length ? ` | People: ${item.people.join(", ")}` : "";
      lines.push(`- [${item.category}] ${item.title} (${item.source || "source"}, ${date})${people}`);
      if (item.url) lines.push(`  ${item.url}`);
    }
  }

  return lines.join("\n");
}

// Convert the plain-text digest into simple readable HTML: "- ..." lines
// become list items, the "  <url>" line after an item becomes a
// "Read the source" link on that item, other lines become paragraphs.
export function digestToHtml(digest) {
  const parts = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const line of digest.trim().split("\n")) {
    if (line.startsWith("- ")) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line.startsWith("  http")) {
      const url = line.trim();
      if (inList && parts.length) {
        const last = parts[parts.length - 1];
        parts[parts.length - 1] = last.replace(
          "</li>",
          ` <a href="${escapeHtml(url)}">Read the source</a></li>`
        );
      } else {
        parts.push(`<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`);
      }
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return parts.join("\n");
}

// Build the weekly email (subject, plain text, HTML) from a parsed feed.
export function buildWeeklyEmail(feed, now = new Date()) {
  const digest = buildDigest(feed);
  const subject = `KYAI weekly Kentucky AI pulse - ${formatLocalDate(now)}`;
  const trackedCount = feed.summary?.totalItems || feed.items?.length || 0;

  const text = [
    "Here is this week's KYAI update.",
    "",
    `Live site: ${SITE_URL}`,
    `Tracked items: ${trackedCount}`,
    "",
    digest.trim(),
    "",
    "You are receiving this because you signed up for the Kentucky AI Pulse.",
    "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
    "",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0d1527; color: #e2e8f0; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #17233d; border-radius: 12px; padding: 32px; border: 1px solid #2e3d5c; }
      .brand { color: #38bdf8; font-size: 26px; font-weight: 800; text-decoration: none; display: inline-block; margin-bottom: 20px; }
      h1 { font-size: 22px; color: #ffffff; margin: 0 0 16px 0; }
      p { line-height: 1.6; color: #cbd5e1; font-size: 15px; margin: 0 0 12px 0; }
      ul { color: #cbd5e1; padding-left: 20px; line-height: 1.6; font-size: 15px; }
      li { margin-bottom: 12px; }
      a { color: #38bdf8; }
      .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #2e3d5c; padding-top: 16px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <a class="brand" href="${SITE_URL}/">KYAI</a>
      <h1>Your weekly Kentucky AI pulse</h1>
      <p>Here is this week's KYAI update. We are tracking ${trackedCount} items. <a href="${SITE_URL}/">See everything live on the site</a>.</p>
${digestToHtml(digest)}
      <div class="footer">
        Kentucky AI Pulse &bull; Open AI intelligence and civic education for Kentucky.<br/>
        You are receiving this because you signed up for the Kentucky AI Pulse.<br/>
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html, trackedCount };
}

async function postResend(apiKey, path, payload, fetchImpl) {
  const response = await fetchImpl(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend ${path} failed (${response.status}): ${body.message || "unknown error"}`);
  }
  return body;
}

// Build the weekly digest from the current data files and send it through
// Resend: a broadcast to the audience, or one test email when
// KYAI_NEWSLETTER_TEST_TO is set. The fetch implementation is injectable so
// tests can stub it without network calls. Throws on missing config or a
// failed Resend call. Returns the Resend id, the send mode, and the email
// subject and tracked count for logging.
export async function sendWeeklyNewsletter({
  fetchImpl = fetch,
  feedPath = path.join(root, "data", "intelligence-feed.json"),
  now = new Date(),
} = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.KYAI_RESEND_AUDIENCE_ID;
  const testTo = process.env.KYAI_NEWSLETTER_TEST_TO;
  const from = process.env.KYAI_NEWSLETTER_FROM || "KYAI <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Set it to send the weekly newsletter.");
  }

  if (!testTo && !audienceId) {
    throw new Error(
      "KYAI_RESEND_AUDIENCE_ID is not set. Set it to broadcast the weekly newsletter, " +
      "or set KYAI_NEWSLETTER_TEST_TO to send a single test email instead."
    );
  }

  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const { subject, text, html, trackedCount } = buildWeeklyEmail(feed, now);

  if (testTo) {
    const result = await postResend(apiKey, "/emails", {
      from,
      to: [testTo],
      subject,
      html,
      text,
    }, fetchImpl);
    return { id: result.id || null, mode: "test", testTo, subject, trackedCount };
  }

  const result = await postResend(apiKey, "/broadcasts", {
    name: subject,
    audience_id: audienceId,
    from,
    subject,
    html,
    text,
    send: true,
  }, fetchImpl);
  return { id: result.id || null, mode: "broadcast", audienceId, subject, trackedCount };
}
