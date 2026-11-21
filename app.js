const fallbackUpdates = [
  {
    category: "education",
    region: "Bluegrass",
    title: "County library AI Basics curriculum",
    body:
      "Starter lesson plans for libraries, schools, churches, and community colleges covering prompts, privacy, citations, scams, and responsible use.",
  },
  {
    category: "workforce",
    region: "Louisville",
    title: "Main Street workflow clinics",
    body:
      "Hands-on training for local teams that want to use AI for operations, customer support, grant writing, marketing, and internal documentation.",
  },
  {
    category: "policy",
    region: "Statewide",
    title: "Frankfort and county policy notes",
    body:
      "A community-maintained log of AI-related public meetings, procurement activity, school guidance, and statewide policy conversations.",
  },
  {
    category: "research",
    region: "Lexington",
    title: "University and lab research watch",
    body:
      "A place to track Kentucky AI research, grants, papers, student projects, startup spinouts, and public datasets worth sharing.",
  },
  {
    category: "events",
    region: "Northern Kentucky",
    title: "Meetups, library workshops, and public talks",
    body:
      "Community-submitted listings for free workshops, school events, library sessions, business clinics, and civic AI conversations.",
  },
  {
    category: "education",
    region: "Eastern Kentucky",
    title: "Rural access and digital readiness",
    body:
      "Workshops focused on practical AI access, broadband realities, local workforce transition, and student opportunity in Appalachian Kentucky.",
  },
];

let regions = {
  statewide: {
    label: "Statewide",
    metric: "All lanes",
    focus: "News, research, schools, workforce, policy, events, infrastructure, and people.",
    bullets: ["Daily digest", "Public source links", "County-by-county leads"],
  },
  western: {
    label: "Western Kentucky",
    metric: "Industry + energy",
    focus: "Data centers, agriculture, logistics, river industry, workforce, and regional campuses.",
    bullets: ["Paducah and Purchase area", "Bowling Green corridor", "Power and site readiness"],
  },
  louisville: {
    label: "Louisville",
    metric: "Metro pilots",
    focus: "City policy, private AI adoption, health systems, startups, events, and accelerator activity.",
    bullets: ["TALK and civic tech", "Healthcare and logistics", "Startup ecosystem"],
  },
  bluegrass: {
    label: "Bluegrass",
    metric: "Research core",
    focus: "University of Kentucky, Lexington employers, public-sector pilots, healthcare, and campus talent.",
    bullets: ["Research signals", "Student pipelines", "Applied AI programs"],
  },
  appalachia: {
    label: "Appalachia",
    metric: "Access + resilience",
    focus: "Rural access, small business tools, broadband realities, workforce transition, and community trust.",
    bullets: ["Pikeville and eastern counties", "Local business clinics", "Energy transition"],
  },
  northern: {
    label: "Northern Kentucky",
    metric: "Talent corridor",
    focus: "Cincinnati-region talent, logistics, manufacturing, higher education, and cross-border AI activity.",
    bullets: ["NKY schools", "Advanced manufacturing", "Regional events"],
  },
  southcentral: {
    label: "South Central",
    metric: "Career pathways",
    focus: "K-12 career pathways, community colleges, manufacturing, small business, and public workshops.",
    bullets: ["Bowling Green", "Career and technical education", "Employer training"],
  },
};

const seedThreads = [
  {
    type: "News lead",
    place: "Statewide",
    status: "Looking for sources",
    votes: 18,
    topic: "Where should KYAI listen first across Kentucky?",
    context:
      "Suggested starting lanes: schools, universities, workforce boards, local government, health systems, startups, and public library programs.",
  },
  {
    type: "Research note",
    place: "Bluegrass",
    status: "Needs contributor",
    votes: 12,
    topic: "Build a public Kentucky AI research map",
    context:
      "Collect university labs, faculty work, student projects, public datasets, grants, and applied AI pilots in one open directory.",
  },
  {
    type: "Workshop request",
    place: "Eastern Kentucky",
    status: "Workshop requested",
    votes: 9,
    topic: "AI basics session for Appalachian small businesses",
    context:
      "A practical workshop on using AI for quotes, inventory notes, customer messages, grant drafts, and fraud-aware research would be useful.",
  },
];

let regionalPages = Object.entries(regions)
  .filter(([key]) => key !== "statewide")
  .map(([id, region]) => ({
    id,
    slug: id,
    name: region.label,
    shortName: region.label,
    headline: region.focus,
    summary: region.focus,
    status: region.metric,
    nextWin: region.bullets.join(" / "),
    focusAreas: region.bullets,
    openQuestions: [],
    partnerAsks: [],
    recommendedToolkits: [],
  }));

let publicProfiles = [];

let publicEvents = [
  {
    id: "library-ai-basics-host-slot",
    title: "Library AI Basics host slot",
    date: "Open",
    time: "75 minutes",
    region: "Statewide",
    location: "Kentucky libraries and community rooms",
    host: "Open host",
    type: "Workshop",
    status: "Claimable",
    sourceUrl: "https://github.com/Kgarmon99/kyai-com/issues/new?template=event.yml",
    whyItMatters: "Libraries are a fast path to practical AI literacy for adults, seniors, students, and local families.",
  },
];

let updates = fallbackUpdates;
let activeFilter = "all";
const INITIAL_VISIBLE_COUNT = 12;
let visibleUpdateCount = INITIAL_VISIBLE_COUNT;
let searchQuery = "";

const UPDATE_BATCH_SIZE = 6;
const NEWSLETTER_STORAGE_KEY = "kyai-newsletter-subscribers";
const NEWSLETTER_ENDPOINT =
  window.KYAI_NEWSLETTER_ENDPOINT ||
  (window.location.protocol.startsWith("http") ? "/api/newsletter-signup" : "");

const updateList = document.querySelector("#updateList");
const filterButtons = document.querySelectorAll(".filter-button");
const newsletterForm = document.querySelector("#newsletterForm");
const newsletterStatus = document.querySelector("#newsletterStatus");
const newsletterCount = document.querySelector("#newsletterCount");
const joinForm = document.querySelector("#joinForm");
const formStatus = document.querySelector("#formStatus");
const threadList = document.querySelector("#threadList");
const threadForm = document.querySelector("#threadForm");
const threadStatus = document.querySelector("#threadStatus");
const newestSignalLine = document.querySelector("#newestSignalLine");
const showMoreButton = document.querySelector("#showMoreUpdates");
const intelSearch = document.querySelector("#intelSearch");
const regionalPageGrid = document.querySelector("#regionalPageGrid");
const eventCalendar = document.querySelector("#eventCalendar");

function iconize() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2.2,
      },
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateOnly(value) {
  if (!value) return "Seed data";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getItemDate(item) {
  const parsed = Date.parse(item.publishedAt || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getRecentUpdates(items) {
  return [...items].sort((a, b) => getItemDate(b) - getItemDate(a));
}

function isPastEvent(event) {
  const parsed = Date.parse(event.date || "");
  if (Number.isNaN(parsed)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today.getTime();
}

function normalizeRegion(value = "") {
  const text = value.toLowerCase();
  if (text.includes("western") || text.includes("west") || text.includes("paducah")) return "western";
  if (text.includes("louisville")) return "louisville";
  if (text.includes("lexington") || text.includes("bluegrass")) return "bluegrass";
  if (text.includes("eastern") || text.includes("appalachia") || text.includes("pikeville")) return "appalachia";
  if (text.includes("northern")) return "northern";
  if (text.includes("south") || text.includes("bowling")) return "southcentral";
  return "statewide";
}

function getSiteUrl(path = "") {
  const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "https://ky-ai.vercel.app";
  return `${origin}${path}`;
}

function buildIssueUrl(template, title = "", body = "") {
  const url = new URL("https://github.com/Kgarmon99/kyai-com/issues/new");
  url.searchParams.set("template", template);
  if (title) url.searchParams.set("title", title);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

function getSignalUrl(update) {
  return update.id ? getSiteUrl(`/signals/${encodeURIComponent(update.id)}`) : getSiteUrl("/#intelligence");
}

function buildShareText(update) {
  const region = update.region || "Kentucky";
  return `${update.title} - ${region} ${update.category || "AI"} signal via KYAI`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function readLocalJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

async function fetchLocalJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${path} unavailable`);
    return await response.json();
  } catch {
    return fallback;
  }
}

function restoreHashScroll() {
  if (!window.location.hash) return;
  const targetId = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(targetId);
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

function syncRegionPages(nextRegions = []) {
  if (!nextRegions.length) return;

  regionalPages = nextRegions;
  const nextRegionMap = { ...regions };
  for (const region of nextRegions) {
    nextRegionMap[region.id] = {
      label: region.shortName || region.name,
      metric: region.status || "Regional brief",
      focus: region.headline || region.summary,
      bullets: region.focusAreas?.length ? region.focusAreas : region.partnerAsks || [],
      slug: region.slug,
      summary: region.summary,
      nextWin: region.nextWin,
    };
  }
  regions = nextRegionMap;
}

function getRegionUrl(regionKey) {
  const region = regionalPages.find((item) => item.id === regionKey);
  return region?.slug ? `/regions/${region.slug}/` : "/#regions";
}

function getFilteredUpdates() {
  const laneItems = activeFilter === "all" ? updates : updates.filter((update) => update.category === activeFilter);
  const query = searchQuery.trim().toLowerCase();
  const searched = query
    ? laneItems.filter((update) =>
        [update.title, update.body, update.region, update.source, update.category, update.kentuckyConnection]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : laneItems;
  return getRecentUpdates(searched);
}

function renderUpdates() {
  const filteredUpdates = getFilteredUpdates();
  const visibleUpdates = filteredUpdates.slice(0, visibleUpdateCount);

  updateList.innerHTML = visibleUpdates
    .map(
      (update) => {
        const shareUrl = getSignalUrl(update);
        const shareText = buildShareText(update);
        const regionKey = normalizeRegion(update.region);
        const trustLabel = update.reviewStatus || (update.kind === "curated" ? "Curated source" : "Needs editor pass");
        const confidence = update.confidence || (update.kind === "curated" ? "high" : "review");
        return `
        <article class="update-card" data-category="${escapeHtml(update.category)}">
          <div class="update-meta">
            <span>${escapeHtml(update.region || "Kentucky")}</span>
            <span>${escapeHtml(update.category)}</span>
            ${update.publishedAt ? `<span>${escapeHtml(update.publishedAt.slice(0, 10))}</span>` : ""}
            <span>${escapeHtml(trustLabel)}</span>
            <span>${escapeHtml(confidence)} confidence</span>
          </div>
          <h3>
            ${
              update.url
                ? `<a href="${escapeHtml(update.url)}" target="_blank" rel="noreferrer">${escapeHtml(update.title)}</a>`
                : escapeHtml(update.title)
            }
          </h3>
          <p>${escapeHtml(update.body)}</p>
          ${
            update.kentuckyConnection
              ? `<p class="people-line">Kentucky connection: ${escapeHtml(update.kentuckyConnection)}</p>`
              : ""
          }
          ${update.people?.length ? `<p class="people-line">People: ${escapeHtml(update.people.join(", "))}</p>` : ""}
          ${update.source ? `<p class="source-line">Source: ${escapeHtml(update.source)}</p>` : ""}
          <div class="card-actions">
            <a class="button neutral small-button" href="${escapeHtml(shareUrl)}">
              <span data-lucide="external-link" aria-hidden="true"></span>
              Signal page
            </a>
            <a class="button neutral small-button" href="${escapeHtml(getRegionUrl(regionKey))}">
              <span data-lucide="map-pin" aria-hidden="true"></span>
              Region brief
            </a>
            <button class="button neutral small-button" data-copy="${escapeHtml(`${shareText} ${shareUrl}`)}" type="button">
              <span data-lucide="copy" aria-hidden="true"></span>
              Copy
            </button>
            <button class="button neutral small-button" data-share-url="${escapeHtml(shareUrl)}" data-share-title="${escapeHtml(update.title)}" data-share-text="${escapeHtml(shareText)}" type="button">
              <span data-lucide="share-2" aria-hidden="true"></span>
              Share
            </button>
          </div>
        </article>
      `;
      },
    )
    .join("");

  if (!visibleUpdates.length) {
    const emptyHeading = searchQuery.trim() ? "No signals match that search" : "No items in this lane yet";
    const emptyBody = searchQuery.trim()
      ? "Try a different word, or clear the search to see everything again."
      : "The automation will add relevant public leads as they show up.";
    updateList.innerHTML = `
      <article class="update-card">
        <div class="update-meta">
          <span>Kentucky</span>
          <span>${escapeHtml(activeFilter)}</span>
        </div>
        <h3>${emptyHeading}</h3>
        <p>${emptyBody}</p>
      </article>
    `;
  }

  showMoreButton.hidden = visibleUpdateCount >= filteredUpdates.length;
}

function renderNewestSignal(feed) {
  if (!newestSignalLine) return;
  const items = feed.items || [];
  const newest = getRecentUpdates(items)[0];
  newestSignalLine.textContent = newest?.publishedAt
    ? `Newest signal: ${formatDateOnly(newest.publishedAt)}`
    : "Newest signal: seed data";
}

function renderRegionalPages() {
  if (!regionalPageGrid) return;

  regionalPageGrid.innerHTML = regionalPages
    .map((region) => {
      const regionKey = region.id;
      const signalCount = updates.filter((item) => normalizeRegion(item.region) === regionKey).length;
      const eventCount = publicEvents.filter((event) => normalizeRegion(event.region) === regionKey).length;
      const profileCount = publicProfiles.filter((profile) => normalizeRegion(profile.region) === regionKey).length;
      return `
        <article class="regional-page-card">
          <div class="mission-meta">
            <span>${escapeHtml(region.status || "Regional brief")}</span>
            <span>${signalCount} signals</span>
            <span>${eventCount} events</span>
            <span>${profileCount} profiles</span>
          </div>
          <h3>${escapeHtml(region.name)}</h3>
          <p>${escapeHtml(region.headline || region.summary)}</p>
          <strong>${escapeHtml(region.nextWin || "Claim a local win and keep the page current.")}</strong>
          <div class="regional-focus-list">
            ${(region.focusAreas || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="card-actions">
            <a class="button primary small-button" href="${escapeHtml(getRegionUrl(regionKey))}">
              <span data-lucide="arrow-up-right" aria-hidden="true"></span>
              Open page
            </a>
            <a class="button neutral small-button" href="${escapeHtml(
              buildIssueUrl(
                "signal.yml",
                `[${region.shortName || region.name}]: local AI signal`,
                `Region: ${region.name}\n\nWhat happened?\n\nWhy it matters:`,
              ),
            )}">
              <span data-lucide="send" aria-hidden="true"></span>
              Add signal
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderEventCalendar() {
  if (!eventCalendar) return;

  const renderEventCard = (event, isPast) => `
    <article class="event-card${isPast ? " is-past" : ""}">
      <div class="event-date">
        <strong>${escapeHtml(event.date)}</strong>
        <span>${escapeHtml(event.time || event.type || "Event")}</span>
      </div>
      <div>
        <div class="mission-meta">
          <span>${escapeHtml(event.region || "Kentucky")}</span>
          <span>${escapeHtml(event.status || "Submitted")}</span>
          <span>${escapeHtml(event.type || "Event")}</span>
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.whyItMatters || event.location || "")}</p>
        <div class="event-foot">
          <span>${escapeHtml(event.host || "Open host")}</span>
          <span>${escapeHtml(event.location || "Kentucky")}</span>
        </div>
      </div>
      <a class="button neutral small-button" href="${escapeHtml(event.sourceUrl || "#lead-form")}">
        <span data-lucide="calendar-plus" aria-hidden="true"></span>
        Open
      </a>
    </article>
  `;

  const upcoming = publicEvents.filter((event) => !isPastEvent(event));
  const past = publicEvents.filter((event) => isPastEvent(event));
  const pastHeading = past.length ? `<h3 class="past-events-heading">Past events</h3>` : "";

  eventCalendar.innerHTML = [
    ...upcoming.map((event) => renderEventCard(event, false)),
    pastHeading,
    ...past.map((event) => renderEventCard(event, true)),
  ].join("");
}

async function loadProductData() {
  const [regionData, profileData, eventData] = await Promise.all([
    fetchLocalJson("./data/regions.json", { regions: regionalPages }),
    fetchLocalJson("./data/profiles.json", { profiles: publicProfiles }),
    fetchLocalJson("./data/events.json", { events: publicEvents }),
  ]);

  syncRegionPages(regionData.regions || []);
  publicProfiles = profileData.profiles || publicProfiles;
  publicEvents = eventData.events || publicEvents;

  renderRegionalPages();
  renderEventCalendar();
  iconize();
}

async function loadIntelligence() {
  try {
    const response = await fetch("./data/intelligence-feed.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await response.json();
    if (feed.items?.length) {
      updates = feed.items;
    }
    renderNewestSignal(feed);
    renderUpdates();
    renderRegionalPages();
    renderEventCalendar();
  } catch {
    const fallbackFeed = {
      updatedAt: null,
      items: fallbackUpdates,
      sources: [],
    };
    renderNewestSignal(fallbackFeed);
    renderUpdates();
    renderRegionalPages();
    renderEventCalendar();
  }
  iconize();
  restoreHashScroll();
}

function getThreads() {
  return readLocalJson("kyai-threads", seedThreads);
}

function renderThreads() {
  threadList.innerHTML = getThreads()
    .map(
      (thread, index) => `
        <article class="thread-card" data-thread-index="${index}">
          <div class="thread-meta">
            <span>${escapeHtml(thread.place || "Kentucky")}</span>
            <span>${escapeHtml(thread.type)}</span>
            <span>${escapeHtml(thread.status || "Open")}</span>
          </div>
          <h3>${escapeHtml(thread.topic)}</h3>
          <p>${escapeHtml(thread.context)}</p>
          <div class="thread-actions">
            <button class="button neutral small-button" data-thread-vote="${index}" type="button">
              <span data-lucide="arrow-up" aria-hidden="true"></span>
              ${Number(thread.votes || 0)} useful
            </button>
            <button class="button neutral small-button" data-thread-help="${index}" type="button">
              <span data-lucide="handshake" aria-hidden="true"></span>
              I can help
            </button>
          </div>
        </article>
      `,
    )
    .join("");
  iconize();
}

function getNewsletterSubscribers() {
  return readLocalJson(NEWSLETTER_STORAGE_KEY, []);
}

function renderNewsletterCount() {
  const total = getNewsletterSubscribers().length;
  newsletterCount.textContent = total
    ? "Preferences saved for this browser"
    : "Weekly digest plus regional alerts";
}

async function postNewsletterSignup(entry) {
  if (!NEWSLETTER_ENDPOINT) throw new Error("Newsletter endpoint unavailable");

  const response = await fetch(NEWSLETTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    throw new Error("Newsletter endpoint rejected signup");
  }

  return response.json().catch(() => {
    throw new Error("Newsletter endpoint returned an unreadable response");
  });
}

function saveNewsletterSignup(entry) {
  const subscribers = getNewsletterSubscribers();
  const withoutDuplicate = subscribers.filter((subscriber) => subscriber.email !== entry.email);
  withoutDuplicate.unshift(entry);
  localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(withoutDuplicate));
  renderNewsletterCount();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    activeFilter = button.dataset.filter;
    visibleUpdateCount = INITIAL_VISIBLE_COUNT;
    renderUpdates();
  });
});

intelSearch?.addEventListener("input", () => {
  searchQuery = intelSearch.value;
  visibleUpdateCount = INITIAL_VISIBLE_COUNT;
  renderUpdates();
});

showMoreButton.addEventListener("click", () => {
  visibleUpdateCount += UPDATE_BATCH_SIZE;
  renderUpdates();
  iconize();
});

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    try {
      await copyText(copyButton.dataset.copy);
      copyButton.classList.add("is-copied");
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.classList.remove("is-copied");
        renderUpdates();
        iconize();
      }, 1100);
    } catch {
      copyButton.textContent = "Copy failed";
    }
  }

  const shareButton = event.target.closest("[data-share-url]");
  if (shareButton) {
    const shareData = {
      title: shareButton.dataset.shareTitle || "KYAI",
      text: shareButton.dataset.shareText || "Kentucky AI signal via KYAI",
      url: shareButton.dataset.shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        await copyText(`${shareData.text} ${shareData.url}`);
      }
    } else {
      await copyText(`${shareData.text} ${shareData.url}`);
      shareButton.textContent = "Copied";
    }
  }

  const voteButton = event.target.closest("[data-thread-vote]");
  if (voteButton) {
    const threads = getThreads();
    const index = Number(voteButton.dataset.threadVote);
    if (threads[index]) {
      threads[index].votes = Number(threads[index].votes || 0) + 1;
      localStorage.setItem("kyai-threads", JSON.stringify(threads));
      renderThreads();
    }
  }

  const helpButton = event.target.closest("[data-thread-help]");
  if (helpButton) {
    const threads = getThreads();
    const index = Number(helpButton.dataset.threadHelp);
    if (threads[index]) {
      threads[index].status = "Has helper";
      localStorage.setItem("kyai-threads", JSON.stringify(threads));
      renderThreads();
    }
  }
});

threadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(threadForm);
  const topic = String(formData.get("topic") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const context = String(formData.get("context") || "").trim();
  const threads = getThreads();
  threads.unshift({
    type,
    place: "Community submitted",
    status: "Pending review",
    votes: 1,
    topic,
    context,
  });
  localStorage.setItem("kyai-threads", JSON.stringify(threads));
  const reviewUrl = buildIssueUrl("signal.yml", `[Signal]: ${topic}`, `Type: ${type}\n\nContext:\n${context}`);
  threadStatus.innerHTML = `Signal saved locally. <a href="${escapeHtml(reviewUrl)}">Open the editor review issue</a>.`;
  threadForm.reset();
  renderThreads();
});

newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(newsletterForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const interests = formData.getAll("interest");
  const entry = {
    email,
    name: String(formData.get("name") || "").trim(),
    region: formData.get("region"),
    role: formData.get("role"),
    interests: interests.length ? interests : ["weekly-pulse"],
    createdAt: new Date().toISOString(),
    source: "kyai-newsletter",
  };

  newsletterStatus.textContent = "Saving newsletter preferences...";

  try {
    const result = await postNewsletterSignup(entry);
    if (result.stored && result.welcomeSent) {
      newsletterStatus.textContent = "You're in! A welcome email is on its way.";
    } else if (result.stored) {
      newsletterStatus.textContent = "You're on the list.";
    } else {
      newsletterStatus.textContent = "Something went wrong, please try again.";
    }
    if (result.stored) newsletterForm.reset();
  } catch {
    saveNewsletterSignup(entry);
    newsletterStatus.textContent = "Saved on this device. The email service did not respond yet.";
  }
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(joinForm);
  const interests = formData.getAll("interest");
  const entry = {
    name: formData.get("name"),
    email: formData.get("email"),
    region: formData.get("region"),
    interests,
    createdAt: new Date().toISOString(),
  };
  const existing = readLocalJson("kyai-interest", []);
  existing.push(entry);
  localStorage.setItem("kyai-interest", JSON.stringify(existing));
  if (interests.includes("newsletter")) {
    saveNewsletterSignup({
      email: String(entry.email || "").trim().toLowerCase(),
      name: String(entry.name || "").trim(),
      region: entry.region,
      interests: ["weekly-pulse", "workshops"],
      createdAt: entry.createdAt,
      source: "kyai-partner-form",
    });
  }
  const missionUrl = buildIssueUrl(
    "mission.yml",
    `[Mission]: ${entry.region || "Kentucky"} contributor interest`,
    `Name: ${entry.name}\nRegion: ${entry.region}\nInterests: ${interests.join(", ") || "General KYAI contribution"}`,
  );
  formStatus.innerHTML = `Interest saved. <a href="${escapeHtml(missionUrl)}">Open a contributor mission issue</a>.`;
  joinForm.reset();
});

async function init() {
  renderThreads();
  renderNewsletterCount();
  await loadProductData();
  await loadIntelligence();
  iconize();
}

init();
