// KYAI frontend API client
// Public read/submit endpoints need no auth. Review/ingest endpoints require an API key server-side.
const KYAI_API_BASE = window.KYAI_API_BASE || "";

async function kyaiFetch(path, options = {}) {
  const url = `${KYAI_API_BASE}/api/v1${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function fetchSignals(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/signals?${params.toString()}`);
}

export async function fetchSignal(id) {
  return kyaiFetch(`/signals/${encodeURIComponent(id)}`);
}

export async function fetchEvents(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/events?${params.toString()}`);
}

export async function fetchProfiles(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/profiles?${params.toString()}`);
}

export async function fetchToolkits(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/toolkits?${params.toString()}`);
}

export async function fetchRegions(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/regions?${params.toString()}`);
}

export async function fetchPersonalizedBrief(role, region) {
  return kyaiFetch(`/personalized?role=${encodeURIComponent(role)}&region=${encodeURIComponent(region)}`);
}

export async function submitLead(type, payload, source = "kyai-site") {
  return kyaiFetch("/submit", {
    method: "POST",
    body: JSON.stringify({ type, payload, source }),
  });
}

export async function fetchSubmissions(apiKey, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return kyaiFetch(`/submissions?${params.toString()}`, {
    headers: { "X-KYAI-API-Key": apiKey },
  });
}

export async function reviewSubmission(type, id, action, apiKey, notes = "") {
  const body = {};
  if (notes) body.reviewerNotes = notes;
  return kyaiFetch(`/review/${encodeURIComponent(type)}/${encodeURIComponent(id)}/${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "X-KYAI-API-Key": apiKey },
    body: JSON.stringify(body),
  });
}

export async function fetchFeed(type) {
  return kyaiFetch(`/feed/${type}.json`);
}

export function renderApiBrief(container, brief) {
  if (!container) return;
  if (!brief || !brief.ok) {
    container.innerHTML = `<p class="form-status">Brief temporarily unavailable.</p>`;
    return;
  }

  const cards = [
    ...brief.signals.slice(0, 3).map((item) => ({
      tag: `${item.region} / ${item.category}`,
      title: item.title,
      body: item.body,
      href: item.url || `/signals/${encodeURIComponent(item.id)}/`,
      cta: "Open signal",
    })),
    ...brief.events.slice(0, 2).map((event) => ({
      tag: `${event.region} / ${event.type || "Event"}`,
      title: event.title,
      body: `${event.date}${event.location ? ` — ${event.location}` : ""}`,
      href: event.sourceUrl || "#events",
      cta: "Open event",
    })),
    ...brief.profiles.slice(0, 2).map((profile) => ({
      tag: `${profile.region} / ${profile.type}`,
      title: profile.name,
      body: profile.reason,
      href: profile.sourceUrl || "#network",
      cta: "Open profile",
    })),
    ...brief.toolkits.slice(0, 2).map((toolkit) => ({
      tag: `${toolkit.status} / ${toolkit.audience}`,
      title: toolkit.title,
      body: toolkit.useCase,
      href: `/toolkits/${encodeURIComponent(toolkit.id)}/`,
      cta: "Open toolkit",
    })),
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="near-me-card">
          <span>${escapeHtml(card.tag)}</span>
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.body)}</p>
          <a href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>
      `,
    )
    .join("");
}

export function initApiBrief() {
  const panel = document.querySelector("#nearMePanel");
  const cards = document.querySelector("#nearMeCards");
  const form = document.querySelector("#nearMeForm");
  if (!panel || !cards || !form) return;

  let debounce;
  async function refresh() {
    const role = form.querySelector("[name='role']")?.value || "business";
    const region = form.querySelector("[name='region']")?.value || "statewide";
    const brief = await fetchPersonalizedBrief(role, region);
    if (brief.ok && brief.data?.ok) {
      renderApiBrief(cards, brief.data);
    }
  }

  form.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(refresh, 400);
  });

  // Initial load after static render.
  setTimeout(refresh, 100);
}

export function initSubmissionForm() {
  const form = document.querySelector("#apiSubmissionForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector(".form-status");
    const data = new FormData(form);
    const type = data.get("type");
    const payload = {
      title: data.get("title"),
      body: data.get("body"),
      category: data.get("category"),
      region: data.get("region"),
      sourceName: data.get("sourceName"),
      sourceUrl: data.get("sourceUrl"),
      url: data.get("sourceUrl"),
      whyItMatters: data.get("whyItMatters"),
      kentuckyConnection: data.get("kentuckyConnection"),
    };

    status.textContent = "Submitting…";
    const result = await submitLead(type, payload);
    status.textContent = result.ok && result.data?.ok
      ? `Submitted. Review ID: ${result.data.id}`
      : `Submission failed: ${result.data?.error || result.status}`;
    if (result.ok && result.data?.ok) form.reset();
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initApiBrief();
      initSubmissionForm();
    });
  } else {
    initApiBrief();
    initSubmissionForm();
  }
}
