const fallbackNews = [
  {
    title: "Libraries teaching AI basics",
    body: "Some Kentucky libraries are teaching people how to use AI in safe, simple ways.",
    region: "Kentucky",
    category: "education",
    kind: "tip",
    url: "",
  },
  {
    title: "Data centers reshaping rural Kentucky",
    body: "Big computing sites are moving into Kentucky towns, with questions about power, land, and jobs.",
    region: "Kentucky",
    category: "industry",
    kind: "news",
    url: "",
  },
  {
    title: "Schools talking about AI rules",
    body: "Teachers and school leaders are writing clear rules for AI in class.",
    region: "Kentucky",
    category: "education",
    kind: "tip",
    url: "",
  },
];

const PAGE_SIZE = 12;
const NEWSLETTER_ENDPOINT =
  window.KYAI_NEWSLETTER_ENDPOINT ||
  (window.location.protocol.startsWith("http") ? "/api/newsletter-signup" : "");
const NEWSLETTER_STORAGE_KEY = "kyai-newsletter-subscribers";
const TIP_STORAGE_KEY = "kyai-tips";

const newsList = document.querySelector("#newsList");
const feedMeta = document.querySelector("#feedMeta");
const laneTitle = document.querySelector("#laneTitle");
const showMoreButton = document.querySelector("#showMore");
const tipForm = document.querySelector("#tipForm");
const tipStatus = document.querySelector("#tipStatus");
const emailForm = document.querySelector("#emailForm");
const emailStatus = document.querySelector("#emailStatus");
const filterChips = document.querySelectorAll(".filters .chip");

let news = fallbackNews;
let feedUpdatedAt = "";
let visibleCount = PAGE_SIZE;
let activeRegion = "all";
let activeLane = "tech";

const AI_TERMS =
  /\bai\b|artificial intelligence|machine learning|chatgpt|llm|generative|neural|deep learning|robotics|computer vision|data science|algorithm|automation|chatbot/;
const INFRA_TERMS =
  /data center|datacenter|hyperscale|terawulf|anthropic.*campus|power plant|substation|transmission line/;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plainBody(item) {
  let body = String(item.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "Open the story for details.";
  if (body.length <= 120) return body;
  return `${body.slice(0, 117).trim()}…`;
}

function plainTitle(item) {
  let title = String(item.title || "Kentucky story").replace(/\s+/g, " ").trim();
  // Drop trailing " - Outlet" / " | Outlet" noise from aggregators.
  title = title.replace(/\s+[-–—|]\s+[^-–—|]{2,48}$/u, "").trim();
  if (title.length <= 96) return title;
  return `${title.slice(0, 93).trim()}…`;
}

function plainSource(item) {
  const raw = String(item.source || item.lane || "KY-Tech").trim();
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  const cleaned = raw.replace(/^Google News\s*[—–-]\s*/i, "").trim() || raw;
  if (cleaned.length <= 28) return cleaned;
  return `${cleaned.slice(0, 25).trim()}…`;
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatRelative(value) {
  const parsed = Date.parse(value || "");
  if (Number.isNaN(parsed)) return formatDate(value);
  const deltaSec = Math.round((parsed - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60 * 60 * 24) return rtf.format(Math.round(deltaSec / 3600), "hour");
  if (abs < 60 * 60 * 24 * 14) return rtf.format(Math.round(deltaSec / 86400), "day");
  return formatDate(value);
}

function itemText(item) {
  return `${item.title || ""} ${item.body || ""} ${item.lane || ""} ${item.category || ""} ${item.kind || ""}`.toLowerCase();
}

function isInfraHeavy(item) {
  const text = itemText(item);
  return INFRA_TERMS.test(text) && !AI_TERMS.test(text);
}

function isAiStory(item) {
  const text = itemText(item);
  const title = String(item.title || "").toLowerCase();

  // Pure (or mostly) data-center builds stay on Tech, not KY-AI.
  if (/data center|datacenter|hyperscale|terawulf/.test(title) && !/school|student|classroom|research|chatbot|tool/.test(title)) {
    return false;
  }
  if (isInfraHeavy(item)) return false;
  if (item.kind === "research" || item.kind === "curated") return true;
  return AI_TERMS.test(text);
}

function matchesLane(item) {
  if (activeLane === "ai") return isAiStory(item);
  return true;
}

function itemPlaceBlob(item) {
  return `${item.region || ""} ${item.title || ""} ${item.body || ""} ${item.source || ""} ${item.lane || ""}`.toLowerCase();
}

function normalizeRegion(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("bowling green") || text.includes("warren county")) return "bowling-green";
  if (text.includes("paducah") || text.includes("mccracken")) return "paducah";
  if (text.includes("covington") || text.includes("kenton")) return "covington";
  if (text.includes("western") || text.includes("west") || text.includes("murray") || text.includes("owensboro")) {
    return "western";
  }
  if (text.includes("louisville")) return "louisville";
  if (text.includes("northern") || text.includes("nky") || text.includes("florence") || text.includes("erlanger")) {
    return "northern";
  }
  if (text.includes("lexington") || text.includes("bluegrass") || text.includes("frankfort")) return "bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("ashland") || text.includes("pikeville")) {
    return "appalachia";
  }
  if (text.includes("south") || text.includes("bowling")) return "southcentral";
  return "statewide";
}

function matchesCityFilter(blob, city) {
  if (city === "bowling-green") {
    return /bowling green|warren county|\bwku\b/.test(blob);
  }
  if (city === "paducah") {
    return /paducah|mccracken/.test(blob);
  }
  if (city === "covington") {
    return /covington|kenton county|northern kentucky|\bnky\b|florence|erlanger/.test(blob);
  }
  return false;
}

function matchesRegion(item) {
  if (activeRegion === "all") return true;
  const blob = itemPlaceBlob(item);
  if (activeRegion === "bowling-green" || activeRegion === "paducah" || activeRegion === "covington") {
    return matchesCityFilter(blob, activeRegion);
  }
  const key = normalizeRegion(item.region || "");
  // Also catch city-tagged stories inside broader regional chips.
  if (activeRegion === "western" && (key === "paducah" || /paducah|murray|owensboro|hopkinsville/.test(blob))) {
    return true;
  }
  if (activeRegion === "southcentral" && (key === "bowling-green" || /bowling green|warren|wku/.test(blob))) {
    return true;
  }
  if (activeRegion === "northern" && (key === "covington" || /covington|nky|northern kentucky|florence|erlanger/.test(blob))) {
    return true;
  }
  return key === activeRegion || key === "statewide";
}

function itemTime(item) {
  return (
    Date.parse(item.publishedAt || "") ||
    Date.parse(item.updatedAt || "") ||
    Date.parse(item.capturedAt || "") ||
    0
  );
}

function filteredNews() {
  // Newest stories always float to the top of the first screen.
  return [...news]
    .filter((item) => matchesLane(item) && matchesRegion(item))
    .sort((a, b) => itemTime(b) - itemTime(a));
}

function feedAgeHours() {
  const parsed = Date.parse(feedUpdatedAt || "");
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 36e5;
}

function updateLaneChrome() {
  const ai = activeLane === "ai";
  const eyebrow = document.querySelector("#laneEyebrow");
  if (laneTitle) laneTitle.textContent = "What’s new";
  if (eyebrow) eyebrow.textContent = ai ? "KY-AI live feed" : "KY-Tech live feed";
  document.title = ai ? "KY-AI · What’s new" : "KY-Tech · What’s new";
  const items = filteredNews();
  if (feedMeta) {
    const updated = feedUpdatedAt ? formatRelative(feedUpdatedAt) : "recently";
    const label = ai ? "AI stories" : "tech stories";
    const age = feedAgeHours();
    const stale = age != null && age > 36;
    const newest = items[0] ? formatRelative(items[0].publishedAt || items[0].updatedAt || feedUpdatedAt) : "";
    feedMeta.textContent = stale
      ? `${items.length} ${label} · last update ${updated} · may be stale`
      : newest
        ? `${items.length} ${label} · newest ${newest} · feed ${updated}`
        : `${items.length} ${label} · updated ${updated}`;
    feedMeta.classList.toggle("is-stale", stale);
  }
}

function renderNews() {
  if (!newsList) return;
  updateLaneChrome();
  const items = filteredNews().slice(0, visibleCount);

  if (!items.length) {
    newsList.innerHTML = `<p class="empty">${
      activeLane === "ai" ? "No KY-AI stories here yet." : "No tech stories here yet."
    }</p>`;
    if (showMoreButton) showMoreButton.hidden = true;
    return;
  }

  newsList.innerHTML = items
    .map((item, index) => {
      const where = item.region || "Kentucky";
      const when = formatRelative(item.publishedAt) || "Recently";
      const title = plainTitle(item);
      const body = plainBody(item);
      const source = plainSource(item);
      const href = item.url || (item.id ? `./signals/${encodeURIComponent(item.id)}/` : "");
      const featured = index === 0 && visibleCount <= PAGE_SIZE ? " is-featured" : "";
      const external = Boolean(item.url);
      const badge = activeLane === "tech" && isAiStory(item) ? `<span class="badge">AI</span>` : "";
      const heading = href
        ? `<h2 class="news-title"><a href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noreferrer"' : ""}>${escapeHtml(title)}</a></h2>`
        : `<h2 class="news-title">${escapeHtml(title)}</h2>`;
      const action = href
        ? `<a class="news-read" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noreferrer"' : ""}>Read</a>`
        : "";

      return `
        <article class="news-card${featured}">
          <div class="news-inner">
            <p class="meta">
              <span class="where">${escapeHtml(where)}</span>
              ${badge}
              <span class="when">${escapeHtml(when)}</span>
            </p>
            ${heading}
            <p class="news-dek">${escapeHtml(body)}</p>
            <div class="news-foot">
              <span class="source">${escapeHtml(source)}</span>
              ${action}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (showMoreButton) {
    showMoreButton.hidden = visibleCount >= filteredNews().length;
  }
}

function setRegion(regionKey) {
  activeRegion = regionKey || "all";
  visibleCount = PAGE_SIZE;
  filterChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.region === activeRegion);
  });
  renderNews();
}

async function loadNews() {
  try {
    const response = await fetch("./data/intelligence-feed.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await response.json();
    if (feed.items?.length) news = feed.items;
    feedUpdatedAt = feed.updatedAt || "";
  } catch {
    news = fallbackNews;
    feedUpdatedAt = "";
  }
  renderNews();
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function buildIssueUrl(title, body) {
  const url = new URL("https://github.com/Kgarmon99/kyai-com/issues/new");
  url.searchParams.set("template", "signal.yml");
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}

showMoreButton?.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderNews();
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => setRegion(chip.dataset.region));
});

tipForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(tipForm);
  const what = String(formData.get("what") || "").trim();
  const where = String(formData.get("where") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const lane = String(formData.get("lane") || "ai").trim();

  const tip = { what, where, link, lane, createdAt: new Date().toISOString() };
  const tips = readLocalJson(TIP_STORAGE_KEY, []);
  tips.unshift(tip);
  localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(tips));

  const issueBody = [`Lane: ${lane}`, `Where: ${where}`, "", what, "", link ? `Link: ${link}` : "Link: (none)"].join(
    "\n",
  );
  const reviewUrl = buildIssueUrl(`[${lane}] tip: ${where}`, issueBody);
  tipStatus.innerHTML = `Saved. <a href="${escapeHtml(reviewUrl)}">Open for editors</a>.`;
  tipForm.reset();
});

emailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(emailForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const entry = {
    email,
    name: "",
    region: "Statewide",
    role: "reader",
    interests: ["weekly-pulse"],
    createdAt: new Date().toISOString(),
    source: "ky-tech-home",
  };

  emailStatus.textContent = "Saving…";

  try {
    if (!NEWSLETTER_ENDPOINT) throw new Error("No endpoint");
    const response = await fetch(NEWSLETTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Signup failed");
    const result = await response.json().catch(() => ({}));
    emailStatus.textContent = result.stored ? "You’re on the list." : "Something went wrong. Try again.";
    if (result.stored) emailForm.reset();
  } catch {
    const subscribers = readLocalJson(NEWSLETTER_STORAGE_KEY, []);
    const next = subscribers.filter((item) => item.email !== email);
    next.unshift(entry);
    localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(next));
    emailStatus.textContent = "Saved on this device.";
  }
});

const VIEWS = new Set(["tech", "ai", "help", "email"]);
const FEED_VIEWS = new Set(["tech", "ai"]);

function showView(viewId) {
  const id = VIEWS.has(viewId) ? viewId : "tech";
  const feedMode = FEED_VIEWS.has(id);

  if (feedMode) {
    activeLane = id;
    visibleCount = PAGE_SIZE;
  }

  document.querySelectorAll(".panel").forEach((panel) => {
    const active = feedMode ? panel.id === "feed" : panel.id === id;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const active = btn.dataset.view === id;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  history.replaceState(null, "", id === "tech" ? location.pathname + location.search : `#${id}`);
  window.scrollTo(0, 0);

  if (feedMode) renderNews();
}

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (event) => {
    const view = el.dataset.view;
    if (!VIEWS.has(view)) return;
    event.preventDefault();
    showView(view);
  });
});

function startMatrixRain() {
  const canvas = document.querySelector("#matrixRain");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Soft KY Matrix: green rain + occasional bluegrass sparks.
  const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01KY◆◇✦ブルーグラス";
  const fontSize = 13;
  let columns = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let raf = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.width = Math.floor(window.innerWidth * dpr);
    height = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colCount = Math.max(8, Math.ceil(window.innerWidth / fontSize));
    columns = Array.from({ length: colCount }, () => Math.random() * -50);
  }

  function draw() {
    frame += 1;
    ctx.fillStyle = "rgba(3, 8, 5, 0.085)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = `${fontSize}px "IBM Plex Mono", "Public Sans", monospace`;

    for (let i = 0; i < columns.length; i += 1) {
      const x = i * fontSize;
      const y = columns[i] * fontSize;
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      const head = Math.random() > 0.92;
      ctx.fillStyle = head ? "rgba(157, 255, 184, 0.55)" : "rgba(57, 255, 120, 0.28)";
      ctx.fillText(char, x, y);

      if (y > window.innerHeight && Math.random() > 0.975) columns[i] = 0;
      else columns[i] += 0.45 + Math.random() * 0.25;
    }

    if (frame % 11 === 0) {
      ctx.fillStyle = "rgba(110, 182, 255, 0.28)";
      const i = Math.floor(Math.random() * columns.length);
      ctx.fillText("◆", i * fontSize, columns[i] * fontSize);
    }

    raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(draw);
  });
  raf = requestAnimationFrame(draw);
}

const startView = String(location.hash || "").replace(/^#/, "");
showView(VIEWS.has(startView) ? startView : "tech");
setRegion("all");
loadNews();
startMatrixRain();
