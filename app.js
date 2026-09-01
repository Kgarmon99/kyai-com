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

const regions = {
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

const directoryItems = [
  {
    type: "Research",
    name: "University research watch",
    region: "Bluegrass / Louisville",
    detail: "Track AI papers, grants, labs, student work, public datasets, and faculty projects.",
    icon: "microscope",
  },
  {
    type: "Workforce",
    name: "AI degree and pathway programs",
    region: "Statewide",
    detail: "Follow public university AI degrees, K-12 pathways, IBM certificates, and employer training.",
    icon: "graduation-cap",
  },
  {
    type: "Infrastructure",
    name: "Data center and energy corridor",
    region: "Eastern / Western KY",
    detail: "Watch site selection, local moratoriums, power use, water impact, taxes, and public meetings.",
    icon: "server",
  },
  {
    type: "Community",
    name: "Local workshop hosts",
    region: "County-level",
    detail: "Libraries, schools, chambers, churches, nonprofits, and civic groups that can host practical AI sessions.",
    icon: "map-pin",
  },
];

const workshops = [
  {
    title: "AI Basics for County Libraries",
    audience: "Libraries, adult learners, seniors, students",
    outcome: "Prompts, privacy, citations, hallucinations, scams, and useful everyday tasks.",
    duration: "75 min",
    icon: "library",
  },
  {
    title: "AI for Main Street Business",
    audience: "Small businesses, chambers, local teams",
    outcome: "Customer messages, operations notes, marketing drafts, grant research, and fraud-aware workflows.",
    duration: "90 min",
    icon: "store",
  },
  {
    title: "AI for Teachers and Schools",
    audience: "Educators, principals, school boards",
    outcome: "Classroom policy, lesson support, academic integrity, accessibility, and student readiness.",
    duration: "90 min",
    icon: "school",
  },
  {
    title: "Civic AI and Public Trust",
    audience: "Cities, counties, agencies, nonprofits",
    outcome: "Procurement, transparency, public meetings, risk, data rights, and community benefit.",
    duration: "60 min",
    icon: "landmark",
  },
];

const seedThreads = [
  {
    type: "News lead",
    place: "Statewide",
    topic: "Where should KYAI listen first across Kentucky?",
    context:
      "Suggested starting lanes: schools, universities, workforce boards, local government, health systems, startups, and public library programs.",
  },
  {
    type: "Research note",
    place: "Bluegrass",
    topic: "Build a public Kentucky AI research map",
    context:
      "Collect university labs, faculty work, student projects, public datasets, grants, and applied AI pilots in one open directory.",
  },
  {
    type: "Workshop request",
    place: "Eastern Kentucky",
    topic: "AI basics session for Appalachian small businesses",
    context:
      "A practical workshop on using AI for quotes, inventory notes, customer messages, grant drafts, and fraud-aware research would be useful.",
  },
];

let updates = fallbackUpdates;
let activeFilter = "all";
let activeRegion = "statewide";
let visibleUpdateCount = 6;

const UPDATE_BATCH_SIZE = 6;
const CATEGORY_PRIORITY = ["industry", "research", "education", "policy", "workforce", "events", "news"];
const NEWSLETTER_STORAGE_KEY = "kyai-newsletter-subscribers";
const NEWSLETTER_ENDPOINT = window.KYAI_NEWSLETTER_ENDPOINT || "";

const updateList = document.querySelector("#updateList");
const filterButtons = document.querySelectorAll(".filter-button");
const regionButtons = document.querySelectorAll(".region-button");
const mapRegions = document.querySelectorAll(".ky-region-map");
const newsletterForm = document.querySelector("#newsletterForm");
const newsletterStatus = document.querySelector("#newsletterStatus");
const newsletterCount = document.querySelector("#newsletterCount");
const joinForm = document.querySelector("#joinForm");
const formStatus = document.querySelector("#formStatus");
const threadList = document.querySelector("#threadList");
const threadForm = document.querySelector("#threadForm");
const threadStatus = document.querySelector("#threadStatus");
const intelUpdatedAt = document.querySelector("#intelUpdatedAt");
const intelItemsCount = document.querySelector("#intelItemsCount");
const intelSources = document.querySelector("#intelSources");
const digestPreview = document.querySelector("#digestPreview");
const showMoreButton = document.querySelector("#showMoreUpdates");
const pulseLead = document.querySelector("#pulseLead");
const pulseCards = document.querySelector("#pulseCards");
const regionPanel = document.querySelector("#regionPanel");
const directoryGrid = document.querySelector("#directoryGrid");
const workshopGrid = document.querySelector("#workshopGrid");

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

function formatDate(value) {
  if (!value) return "Seed data";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function readLocalJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function getBalancedUpdates(items) {
  const selected = [];
  const selectedIds = new Set();

  for (const category of CATEGORY_PRIORITY) {
    const item = items.find((candidate) => candidate.category === category && !selectedIds.has(candidate.id || candidate.title));
    if (item) {
      selected.push(item);
      selectedIds.add(item.id || item.title);
    }
  }

  for (const item of items) {
    const key = item.id || item.title;
    if (selectedIds.has(key)) continue;
    selected.push(item);
    selectedIds.add(key);
  }

  return selected;
}

function getFilteredUpdates() {
  const laneItems = activeFilter === "all" ? updates : updates.filter((update) => update.category === activeFilter);
  if (activeRegion === "statewide") return getBalancedUpdates(laneItems);
  const regional = laneItems.filter((update) => normalizeRegion(update.region) === activeRegion);
  return regional.length ? regional : getBalancedUpdates(laneItems).slice(0, 4);
}

function renderPulse(feed = {}) {
  const balanced = getBalancedUpdates(feed.items?.length ? feed.items : updates);
  const lead = balanced[0] || fallbackUpdates[0];
  const supporting = balanced.slice(1, 4);

  pulseLead.innerHTML = `
    <span>${escapeHtml(lead.region || "Kentucky")} / ${escapeHtml(lead.category || "signal")}</span>
    <h3>${lead.url ? `<a href="${escapeHtml(lead.url)}" target="_blank" rel="noreferrer">${escapeHtml(lead.title)}</a>` : escapeHtml(lead.title)}</h3>
    <p>${escapeHtml(lead.body)}</p>
  `;

  pulseCards.innerHTML = supporting
    .map(
      (item) => `
        <article>
          <span>${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.region || "Kentucky")}</small>
        </article>
      `,
    )
    .join("");
}

function renderUpdates() {
  const filteredUpdates = getFilteredUpdates();
  const visibleUpdates = filteredUpdates.slice(0, visibleUpdateCount);

  updateList.innerHTML = visibleUpdates
    .map(
      (update) => `
        <article class="update-card" data-category="${escapeHtml(update.category)}">
          <div class="update-meta">
            <span>${escapeHtml(update.region || "Kentucky")}</span>
            <span>${escapeHtml(update.category)}</span>
            ${update.publishedAt ? `<span>${escapeHtml(update.publishedAt.slice(0, 10))}</span>` : ""}
          </div>
          <h3>
            ${
              update.url
                ? `<a href="${escapeHtml(update.url)}" target="_blank" rel="noreferrer">${escapeHtml(update.title)}</a>`
                : escapeHtml(update.title)
            }
          </h3>
          <p>${escapeHtml(update.body)}</p>
          ${update.people?.length ? `<p class="people-line">People: ${escapeHtml(update.people.join(", "))}</p>` : ""}
          ${update.source ? `<p class="source-line">Source: ${escapeHtml(update.source)}</p>` : ""}
        </article>
      `,
    )
    .join("");

  if (!visibleUpdates.length) {
    updateList.innerHTML = `
      <article class="update-card">
        <div class="update-meta">
          <span>Kentucky</span>
          <span>${escapeHtml(activeFilter)}</span>
        </div>
        <h3>No items in this lane yet</h3>
        <p>The automation will add relevant public leads as they show up.</p>
      </article>
    `;
  }

  showMoreButton.hidden = visibleUpdateCount >= filteredUpdates.length;
}

function renderIntelligence(feed) {
  intelUpdatedAt.textContent = formatDate(feed.updatedAt);
  intelItemsCount.textContent = String(feed.items?.length || 0);
  intelSources.textContent = String(feed.sources?.length || 0);

  digestPreview.innerHTML = getBalancedUpdates(feed.items || [])
    .slice(0, 5)
    .map(
      (item) => `
        <article>
          <span>${escapeHtml(item.category)}</span>
          <a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
        </article>
      `,
    )
    .join("");
}

function renderRegion(regionKey = "statewide") {
  const region = regions[regionKey] || regions.statewide;
  activeRegion = regionKey;

  regionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.region === regionKey);
  });
  mapRegions.forEach((regionShape) => {
    regionShape.classList.toggle("is-active", regionShape.dataset.region === regionKey);
  });

  regionPanel.innerHTML = `
    <p class="kicker">Regional lens</p>
    <h3>${escapeHtml(region.label)}</h3>
    <strong>${escapeHtml(region.metric)}</strong>
    <p>${escapeHtml(region.focus)}</p>
    <ul>
      ${region.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;

  visibleUpdateCount = 6;
  renderUpdates();
}

function renderDirectory() {
  directoryGrid.innerHTML = directoryItems
    .map(
      (item) => `
        <article class="directory-card">
          <span data-lucide="${escapeHtml(item.icon)}" aria-hidden="true"></span>
          <div>
            <p>${escapeHtml(item.type)} / ${escapeHtml(item.region)}</p>
            <h3>${escapeHtml(item.name)}</h3>
            <span>${escapeHtml(item.detail)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderWorkshops() {
  workshopGrid.innerHTML = workshops
    .map(
      (workshop) => `
        <article class="workshop-card">
          <span data-lucide="${escapeHtml(workshop.icon)}" aria-hidden="true"></span>
          <p>${escapeHtml(workshop.duration)} / ${escapeHtml(workshop.audience)}</p>
          <h3>${escapeHtml(workshop.title)}</h3>
          <strong>${escapeHtml(workshop.outcome)}</strong>
        </article>
      `,
    )
    .join("");
}

async function loadIntelligence() {
  try {
    const response = await fetch("./data/intelligence-feed.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await response.json();
    if (feed.items?.length) {
      updates = feed.items;
    }
    renderPulse(feed);
    renderIntelligence(feed);
    renderRegion(activeRegion);
  } catch {
    const fallbackFeed = {
      updatedAt: null,
      items: fallbackUpdates,
      sources: [],
    };
    renderPulse(fallbackFeed);
    renderIntelligence(fallbackFeed);
    renderRegion(activeRegion);
  }
  iconize();
}

function getThreads() {
  return readLocalJson("kyai-threads", seedThreads);
}

function renderThreads() {
  threadList.innerHTML = getThreads()
    .map(
      (thread) => `
        <article class="thread-card">
          <div class="thread-meta">
            <span>${escapeHtml(thread.place || "Kentucky")}</span>
            <span>${escapeHtml(thread.type)}</span>
          </div>
          <h3>${escapeHtml(thread.topic)}</h3>
          <p>${escapeHtml(thread.context)}</p>
        </article>
      `,
    )
    .join("");
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
  if (!NEWSLETTER_ENDPOINT) return { savedRemotely: false };

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

  return { savedRemotely: true };
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
    visibleUpdateCount = 6;
    renderUpdates();
  });
});

regionButtons.forEach((button) => {
  button.addEventListener("click", () => renderRegion(button.dataset.region));
});

mapRegions.forEach((regionShape) => {
  const selectRegion = () => renderRegion(regionShape.dataset.region);
  regionShape.addEventListener("click", selectRegion);
  regionShape.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRegion();
    }
  });
});

showMoreButton.addEventListener("click", () => {
  visibleUpdateCount += UPDATE_BATCH_SIZE;
  renderUpdates();
  iconize();
});

threadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(threadForm);
  const threads = getThreads();
  threads.unshift({
    type: formData.get("type"),
    place: "Community submitted",
    topic: formData.get("topic"),
    context: formData.get("context"),
  });
  localStorage.setItem("kyai-threads", JSON.stringify(threads));
  threadStatus.textContent = "Signal saved locally. The next build can back this with accounts and moderation.";
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
    interests: interests.length ? interests : ["weekly-pulse"],
    createdAt: new Date().toISOString(),
    source: "kyai-newsletter",
  };

  newsletterStatus.textContent = "Saving newsletter preferences...";

  try {
    const result = await postNewsletterSignup(entry);
    saveNewsletterSignup(entry);
    newsletterStatus.textContent = result.savedRemotely
      ? "You're on the KYAI update list."
      : "Saved on this device. The email delivery connector is ready to plug in.";
    newsletterForm.reset();
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
  formStatus.textContent = "Interest saved. KYAI can connect this to CRM, email, or GitHub next.";
  joinForm.reset();
});

renderDirectory();
renderWorkshops();
renderThreads();
renderNewsletterCount();
loadIntelligence();
iconize();
