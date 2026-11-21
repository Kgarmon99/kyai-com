// Weekly newsletter send, invoked by Vercel Cron every Monday at 14:00 UTC
// (8:00 AM CT). See the "crons" entry in vercel.json. Vercel sends an HTTP
// GET with Authorization: Bearer <CRON_SECRET>; every other request gets a
// 401. CRON_SECRET must be set in the Vercel project settings (a random
// string of at least 16 characters); Vercel sends it automatically on each
// cron invocation, and a redeploy is needed after adding or changing it.
// The digest is built from the current data files; no refresh happens here.
import { sendWeeklyNewsletter } from "../lib/newsletter-send.mjs";

function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    json(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers?.authorization;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    json(response, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const result = await sendWeeklyNewsletter();
    json(response, 200, {
      ok: true,
      id: result.id,
      mode: result.mode,
      subject: result.subject,
      trackedCount: result.trackedCount,
    });
  } catch (error) {
    console.error("Weekly newsletter send failed:", error.message);
    json(response, 500, { ok: false, error: error.message || "Weekly newsletter send failed." });
  }
}
