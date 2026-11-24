const fallbackNews = [
  {
    title: "Libraries teaching AI basics",
    body: "Some Kentucky libraries are teaching people how to use AI in safe, simple ways.",
    region: "Kentucky",
    url: "",
  },
  {
    title: "Schools talking about AI rules",
    body: "Teachers and school leaders are writing clear rules for AI in class.",
    region: "Kentucky",
    url: "",
  },
  {
    title: "People building AI tools here",
    body: "Students, teachers, and workers across Kentucky are trying AI for real jobs.",
    region: "Kentucky",
    url: "",
  },
];

const REGION_LABELS = {
  all: "all of Kentucky",
  western: "West Kentucky",
  southcentral: "South Central Kentucky",
  louisville: "Louisville",
  bluegrass: "the Bluegrass",
  appalachia: "East Kentucky",
  northern: "North Kentucky",
};

const NEWSLETTER_ENDPOINT =
  window.KYAI_NEWSLETTER_ENDPOINT ||
  (window.location.protocol.startsWith("http") ? "/api/newsletter-signup" : "");
const NEWSLETTER_STORAGE_KEY = "kyai-newsletter-subscribers";
const TIP_STORAGE_KEY = "kyai-tips";
const PAGE_SIZE = 10;

const newsList = document.querySelector("#newsList");
const newsSub = document.querySelector("#newsSub");
const feedMeta = document.querySelector("#feedMeta");
const showMoreButton = document.querySelector("#showMore");
const tipForm = document.querySelector("#tipForm");
const tipStatus = document.querySelector("#tipStatus");
const tipWhere = tipForm?.querySelector('input[name="where"]');
const emailForm = document.querySelector("#emailForm");
const emailStatus = document.querySelector("#emailStatus");
const mapStatus = document.querySelector("#mapStatus");
const placeCount = document.querySelector("#placeCount");
const placeDots = document.querySelector("#placeDots");
const placeLabels = document.querySelector("#placeLabels");
const placeSearch = document.querySelector("#placeSearch");
const placesList = document.querySelector("#kyPlaces");
const mapRegions = document.querySelectorAll(".ky-map .region");
const mapChips = document.querySelectorAll(".map-controls .chip");
const aiFocusChips = document.querySelectorAll("[data-ai-focus]");
const laneSelect = tipForm?.querySelector('select[name="lane"]');
const aiFocusField = document.querySelector("#aiFocusField");

const AI_FOCUS_LABELS = {
  all: "all AI topics",
  schools: "schools",
  research: "research",
  business: "business",
  rules: "rules & policy",
  tips: "local tips",
};

const MAJOR_LABELS = new Set([
  "Louisville",
  "Lexington",
  "Bowling Green",
  "Paducah",
  "Ashland",
  "Covington",
  "Owensboro",
  "Frankfort",
  "Hopkinsville",
  "Elizabethtown",
  "Richmond",
  "Florence",
  "Georgetown",
  "Nicholasville",
  "Pikeville",
  "Somerset",
  "London",
  "Murray",
  "Danville",
  "Newport",
  "Madisonville",
  "Winchester",
  "Shelbyville",
  "Bardstown",
  "Morehead",
  "Hazard",
  "Mayfield",
  "Maysville",
  "Berea",
  "Corbin",
]);

let news = fallbackNews;
let places = [];
let visibleCount = PAGE_SIZE;
let activeRegion = "all";
let activePlace = null;
let activeAiFocus = "all";

function getAiFocus(item) {
  const category = String(item.category || "").toLowerCase();
  const kind = String(item.kind || "").toLowerCase();
  const text = `${item.title || ""} ${item.body || ""} ${item.lane || ""}`.toLowerCase();

  // Data-center / hyperscaler stories belong in KY-Tech Data Centers, not AI focus.
  if (
    /data center|hyperscaler|anthropic.*site|power plant|substation/.test(text) &&
    !/classroom|school|student|curriculum|teacher/.test(text)
  ) {
    return "infra";
  }
  if (kind === "tip" || item.aiFocus === "tips") return "tips";
  if (category === "education" || item.aiFocus === "schools") return "schools";
  if (category === "research" || kind === "research" || item.aiFocus === "research") return "research";
  if (category === "policy" || item.aiFocus === "rules") return "rules";
  if (
    category === "workforce" ||
    category === "industry" ||
    category === "business" ||
    item.aiFocus === "business"
  ) {
    return "business";
  }
  if (category === "events" && /workshop|class|training|library|school/.test(text)) return "schools";
  return "business";
}

function isAiRelevant(item) {
  return getAiFocus(item) !== "infra";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plainBody(item) {
  const body = String(item.body || "").trim();
  if (!body) return "A new AI tip from Kentucky.";
  if (body.length <= 180) return body;
  return `${body.slice(0, 177).trim()}…`;
}

function formatDate(value) {
  if (!value) return "Date unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatRelative(value) {
  const parsed = Date.parse(value || "");
  if (Number.isNaN(parsed)) return "";
  const deltaSec = Math.round((parsed - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60 * 60 * 24) return rtf.format(Math.round(deltaSec / 3600), "hour");
  if (abs < 60 * 60 * 24 * 14) return rtf.format(Math.round(deltaSec / 86400), "day");
  return formatDate(value);
}

function sourceLabel(item) {
  return item.source || item.lane || (item.kind === "research" ? "Research" : "KY-Tech");
}

function sortNewest(items) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.publishedAt || "") || 0;
    const bTime = Date.parse(b.publishedAt || "") || 0;
    return bTime - aTime;
  });
}

function normalizeRegion(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("western") || text.includes("west") || text.includes("paducah") || text.includes("murray")) {
    return "western";
  }
  if (text.includes("louisville")) return "louisville";
  if (text.includes("northern") || text.includes("covington") || text.includes("nky")) return "northern";
  if (text.includes("lexington") || text.includes("bluegrass") || text.includes("frankfort")) return "bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("ashland") || text.includes("pikeville")) {
    return "appalachia";
  }
  if (text.includes("south") || text.includes("bowling")) return "southcentral";
  return "statewide";
}

function matchesActiveRegion(item) {
  const regionText = String(item.region || "");
  if (activePlace) {
    const needle = activePlace.toLowerCase();
    const hay = [regionText, item.title, item.body, item.kentuckyConnection]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (hay.includes(needle)) return true;
    // Keep statewide tips visible so local picks never feel empty.
    return normalizeRegion(regionText) === "statewide";
  }
  if (activeRegion === "all") return true;
  const key = normalizeRegion(regionText);
  if (key === activeRegion) return true;
  return key === "statewide";
}

function matchesAiFocus(item) {
  if (!isAiRelevant(item)) return false;
  if (activeAiFocus === "all") return true;
  return getAiFocus(item) === activeAiFocus;
}

function buildIssueUrl(title, body) {
  const url = new URL("https://github.com/Kgarmon99/kyai-com/issues/new");
  url.searchParams.set("template", "signal.yml");
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}

function filteredNews() {
  return sortNewest(news.filter((item) => matchesActiveRegion(item) && matchesAiFocus(item)));
}

function renderNews() {
  if (!newsList) return;

  const items = filteredNews().slice(0, visibleCount);
  const place = REGION_LABELS[activeRegion] || "Kentucky";

  if (newsSub) {
    const focus = AI_FOCUS_LABELS[activeAiFocus] || "AI";
    if (activePlace || activeRegion !== "all") {
      newsSub.textContent = `${focus} near ${place}. Tap Whole state to see more of Kentucky.`;
    } else if (activeAiFocus === "all") {
      newsSub.textContent = "AI stories and tips from around Kentucky — schools, labs, and local use.";
    } else {
      newsSub.textContent = `Showing ${focus} only.`;
    }
  }

  if (!items.length) {
    newsList.innerHTML = `<p class="empty">No news here yet. Add a tip for ${escapeHtml(place)}.</p>`;
    if (showMoreButton) showMoreButton.hidden = true;
    return;
  }

  newsList.innerHTML = items
    .map((item, index) => {
      const where = item.region || "Kentucky";
      const when = formatRelative(item.publishedAt) || formatDate(item.publishedAt);
      const focus = AI_FOCUS_LABELS[getAiFocus(item)] || "AI";
      const title = item.title || "Kentucky AI tip";
      const body = plainBody(item);
      const source = sourceLabel(item);
      const href = item.url || (item.id ? `./signals/${encodeURIComponent(item.id)}/` : "");
      const featured = index === 0 && visibleCount <= PAGE_SIZE ? " is-featured" : "";
      const heading = href
        ? `<h3><a href="${escapeHtml(href)}" ${item.url ? 'target="_blank" rel="noreferrer"' : ""}>${escapeHtml(title)}</a></h3>`
        : `<h3>${escapeHtml(title)}</h3>`;
      const action = href
        ? `<a class="news-read" href="${escapeHtml(href)}" ${item.url ? 'target="_blank" rel="noreferrer"' : ""}>Read story →</a>`
        : "";

      return `
        <article class="news-card${featured}">
          <div class="news-rail" aria-hidden="true"></div>
          <div class="news-body">
            <p class="meta">
              <span class="pill">${escapeHtml(focus)}</span>
              <span class="where">${escapeHtml(where)}</span>
              <span class="when">${escapeHtml(when)}</span>
            </p>
            ${heading}
            <p>${escapeHtml(body)}</p>
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

function clearPlaceDotActive() {
  placeDots?.querySelectorAll(".place-dot.is-active").forEach((dot) => dot.classList.remove("is-active"));
}

function setRegion(regionKey, { scrollToNews = true } = {}) {
  activeRegion = regionKey || "all";
  activePlace = null;
  visibleCount = PAGE_SIZE;
  clearPlaceDotActive();
  if (placeSearch) placeSearch.value = "";

  mapChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.region === activeRegion);
  });

  mapRegions.forEach((region) => {
    region.classList.toggle("is-active", region.dataset.region === activeRegion);
  });

  const label = REGION_LABELS[activeRegion] || "Kentucky";
  if (mapStatus) {
    mapStatus.textContent =
      activeRegion === "all"
        ? "Showing KY-AI news for all of Kentucky."
        : `Showing KY-AI news for ${label}.`;
  }

  if (tipWhere && activeRegion !== "all") {
    tipWhere.value = label;
  }

  renderNews();

  if (scrollToNews) {
    document.querySelector("#news")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function selectPlace(place, { scrollToNews = true } = {}) {
  if (!place) return;
  activePlace = place.label;
  activeRegion = "place";
  visibleCount = PAGE_SIZE;

  mapChips.forEach((chip) => chip.classList.remove("is-active"));
  mapRegions.forEach((region) => region.classList.remove("is-active"));
  clearPlaceDotActive();

  const match = placeDots?.querySelector(`[data-place-id="${CSS.escape(place.id)}"]`);
  match?.classList.add("is-active");

  if (placeSearch) placeSearch.value = place.search || place.label;
  if (tipWhere) tipWhere.value = place.search || place.label;
  if (mapStatus) {
    mapStatus.textContent = `Showing KY-AI news near ${place.search || place.label}.`;
  }

  renderNews();

  if (scrollToNews) {
    document.querySelector("#news")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderPlaces() {
  if (!placeDots || !places.length) return;

  placeDots.innerHTML = places
    .map((place) => {
      const major = MAJOR_LABELS.has(place.label);
      const radius = major ? 3.4 : 2.2;
      return `<circle class="place-dot${major ? " is-major" : ""}" data-place-id="${escapeHtml(place.id)}" data-label="${escapeHtml(place.label)}" cx="${place.x}" cy="${place.y}" r="${radius}" tabindex="0" role="button" aria-label="${escapeHtml(place.search || place.label)}"><title>${escapeHtml(place.search || place.label)}</title></circle>`;
    })
    .join("");

  if (placeLabels) {
    placeLabels.innerHTML = places
      .filter((place) => MAJOR_LABELS.has(place.label))
      .map((place) => {
        const anchor = place.x > 480 ? "end" : "start";
        const dx = place.x > 480 ? -6 : 6;
        return `<text x="${place.x + dx}" y="${place.y + 4}" text-anchor="${anchor}">${escapeHtml(place.label)}</text>`;
      })
      .join("");
  }

  if (placesList) {
    const options = [];
    const seen = new Set();
    for (const place of places) {
      for (const value of [place.search, place.label, place.county ? `${place.county} County` : ""]) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        options.push(`<option value="${escapeHtml(value)}"></option>`);
      }
    }
    placesList.innerHTML = options.join("");
  }

  if (placeCount) {
    const counties = places.filter((p) => p.kind === "county-seat").length;
    const cities = places.filter((p) => p.kind === "city").length;
    placeCount.textContent = `${counties} county seats · ${cities + counties} cities & towns on the map`;
  }

  placeDots.querySelectorAll(".place-dot").forEach((dot) => {
    const activate = () => {
      const place = places.find((item) => item.id === dot.dataset.placeId);
      selectPlace(place);
    };
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      activate();
    });
    dot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function findPlace(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  return (
    places.find((place) => place.search.toLowerCase() === q) ||
    places.find((place) => place.label.toLowerCase() === q) ||
    places.find((place) => `${place.county} county`.toLowerCase() === q) ||
    places.find((place) => place.search.toLowerCase().includes(q)) ||
    places.find((place) => place.label.toLowerCase().includes(q))
  );
}

async function loadPlaces() {
  try {
    const response = await fetch("./data/kentucky-places.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Places unavailable");
    const data = await response.json();
    const seats = (data.counties || []).map((place) => ({
      id: `seat-${place.county}`,
      label: place.seat || place.label,
      search: place.search,
      county: place.county,
      x: place.x,
      y: place.y,
      kind: "county-seat",
    }));
    const cities = (data.cities || []).map((place) => ({
      id: `city-${place.county}-${place.city || place.label}`,
      label: place.city || place.label,
      search: place.search,
      county: place.county,
      x: place.x,
      y: place.y,
      kind: "city",
    }));
    places = [...seats, ...cities].filter((place) => Number.isFinite(place.x) && Number.isFinite(place.y));
  } catch {
    places = [];
  }
  renderPlaces();
}

async function loadNews() {
  try {
    const response = await fetch("./data/intelligence-feed.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await response.json();
    if (feed.items?.length) news = feed.items;
    if (feedMeta) {
      const updated = feed.updatedAt ? formatRelative(feed.updatedAt) || formatDate(feed.updatedAt) : "recently";
      const total = feed.summary?.totalItems || feed.items?.length || 0;
      const sources = feed.sources?.length || 0;
      feedMeta.textContent = `${total} stories · ${sources} sources · updated ${updated}`;
    }
  } catch {
    news = fallbackNews;
    if (feedMeta) feedMeta.textContent = "Showing starter stories while the live feed loads.";
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

showMoreButton?.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderNews();
});

mapChips.forEach((chip) => {
  chip.addEventListener("click", () => setRegion(chip.dataset.region));
});

aiFocusChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeAiFocus = chip.dataset.aiFocus || "all";
    visibleCount = PAGE_SIZE;
    aiFocusChips.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.aiFocus === activeAiFocus);
    });
    renderNews();
    document.querySelector("#news")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function syncAiFocusField() {
  if (!aiFocusField || !laneSelect) return;
  aiFocusField.hidden = laneSelect.value !== "ai";
}

laneSelect?.addEventListener("change", syncAiFocusField);
syncAiFocusField();

mapRegions.forEach((region) => {
  const activate = () => setRegion(region.dataset.region);
  region.addEventListener("click", activate);
  region.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
});

placeSearch?.addEventListener("change", () => {
  const place = findPlace(placeSearch.value);
  if (place) selectPlace(place);
});

placeSearch?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const place = findPlace(placeSearch.value);
  if (place) selectPlace(place);
});

tipForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(tipForm);
  const what = String(formData.get("what") || "").trim();
  const where = String(formData.get("where") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const email = String(formData.get("email") || "").trim();

  const lane = String(formData.get("lane") || "ai").trim();
  const aiFocus = lane === "ai" ? String(formData.get("aiFocus") || "tips").trim() : "";

  const tip = {
    what,
    where,
    lane,
    aiFocus,
    category: aiFocus === "schools" ? "education" : aiFocus === "research" ? "research" : aiFocus === "rules" ? "policy" : "events",
    kind: "tip",
    link,
    email,
    createdAt: new Date().toISOString(),
  };

  const tips = readLocalJson(TIP_STORAGE_KEY, []);
  tips.unshift(tip);
  localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(tips));

  const issueBody = [
    `Lane: ${lane}`,
    aiFocus ? `AI focus: ${aiFocus}` : "",
    `Where: ${where}`,
    "",
    "What happened?",
    what,
    "",
    link ? `Link: ${link}` : "Link: (none)",
    email ? `Email: ${email}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const reviewUrl = buildIssueUrl(`[${lane}] Tip: ${where}`, issueBody);
  tipStatus.innerHTML = `Thanks! We saved your tip. <a href="${escapeHtml(reviewUrl)}">Open it for editors</a>.`;
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
    role: "student",
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
    emailStatus.textContent = result.stored
      ? "You are on the list. Watch your inbox."
      : "Something went wrong. Please try again.";
    if (result.stored) emailForm.reset();
  } catch {
    const subscribers = readLocalJson(NEWSLETTER_STORAGE_KEY, []);
    const next = subscribers.filter((item) => item.email !== email);
    next.unshift(entry);
    localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(next));
    emailStatus.textContent = "Saved on this device. Email sending may be offline right now.";
  }
});

function startMatrixRain() {
  const canvas = document.querySelector("#matrixRain");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const glyphs = "アイウエオカキクケコサシスセソKYAI01ネバーフォゲット青草";
  const fontSize = 14;
  let columns = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const colCount = Math.ceil(width / fontSize);
    columns = Array.from({ length: colCount }, () => Math.random() * -40);
  }

  function draw() {
    frame += 1;
    ctx.fillStyle = "rgba(3, 8, 5, 0.08)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(57, 255, 120, 0.55)";
    ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;

    for (let i = 0; i < columns.length; i += 1) {
      const x = i * fontSize;
      const y = columns[i] * fontSize;
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillText(char, x, y);
      if (y > height && Math.random() > 0.975) columns[i] = 0;
      else columns[i] += 0.65;
    }

    // Soft bluegrass spark every few frames
    if (frame % 7 === 0) {
      ctx.fillStyle = "rgba(110, 182, 255, 0.35)";
      const i = Math.floor(Math.random() * columns.length);
      ctx.fillText("◆", i * fontSize, columns[i] * fontSize);
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  draw();
}

setRegion("all", { scrollToNews: false });
loadPlaces();
loadNews();
startMatrixRain();
