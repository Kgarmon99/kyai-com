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
    status: "Needs maintainers",
    action: "Claim a research lane",
  },
  {
    type: "Workforce",
    name: "AI degree and pathway programs",
    region: "Statewide",
    detail: "Follow public university AI degrees, K-12 pathways, IBM certificates, and employer training.",
    icon: "graduation-cap",
    status: "Open profile",
    action: "Add a program",
  },
  {
    type: "Infrastructure",
    name: "Data center and energy corridor",
    region: "Eastern / Western KY",
    detail: "Watch site selection, local moratoriums, power use, water impact, taxes, and public meetings.",
    icon: "server",
    status: "Source watch",
    action: "Submit context",
  },
  {
    type: "Community",
    name: "Local workshop hosts",
    region: "County-level",
    detail: "Libraries, schools, chambers, churches, nonprofits, and civic groups that can host practical AI sessions.",
    icon: "map-pin",
    status: "Claimable",
    action: "List an org",
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

const rolePlaybooks = {
  business: {
    label: "Business owner",
    headline: "Local AI moves that affect customers, operations, hiring, and trust.",
    priorities: ["Main Street workflow clinics", "Fraud-aware AI guides", "Local chambers and workshop hosts"],
    nextStep: "Request a practical AI clinic for your chamber or team.",
  },
  teacher: {
    label: "Teacher or school leader",
    headline: "School policy, classroom use, academic integrity, and student readiness.",
    priorities: ["K-12 AI guidance", "Teacher workshop decks", "Student pathway programs"],
    nextStep: "Follow education signals and request a school-facing session.",
  },
  student: {
    label: "Student",
    headline: "Programs, scholarships, workshops, projects, and people building nearby.",
    priorities: ["AI degree pathways", "University research", "Beginner project ideas"],
    nextStep: "Find nearby programs and add a student project to the map.",
  },
  founder: {
    label: "Founder or builder",
    headline: "Customers, talent, infrastructure, policy, and organizations to know.",
    priorities: ["Startup ecosystem signals", "Research collaborators", "Data center and compute activity"],
    nextStep: "Share what you are building or claim a founder profile.",
  },
  civic: {
    label: "Public leader",
    headline: "Public trust, procurement, transparency, workforce, and community access.",
    priorities: ["Policy watch", "Public meeting checklist", "County workshop demand"],
    nextStep: "Submit public meetings and request a civic AI briefing.",
  },
  journalist: {
    label: "Journalist or researcher",
    headline: "Sourced, regional AI leads with people, institutions, and follow-up threads.",
    priorities: ["Verified source links", "Regional momentum", "People and institution graph"],
    nextStep: "Use signal pages as a reporting queue and add missing context.",
  },
};

const toolkits = [
  {
    title: "AI Policy Starter Kit for Schools",
    audience: "Districts, principals, teachers, board members",
    detail: "A practical outline for classroom use, privacy, academic integrity, parent communication, and staff training.",
    icon: "school",
    status: "Priority",
  },
  {
    title: "Library AI Basics Deck",
    audience: "Libraries, seniors, adult learners, students",
    detail: "A community-session deck covering prompting, citations, hallucinations, scams, privacy, and daily tasks.",
    icon: "library",
    status: "Shareable",
  },
  {
    title: "Main Street AI Workflow Templates",
    audience: "Small business owners and local teams",
    detail: "Reusable templates for customer replies, estimates, inventory notes, hiring drafts, grant research, and SOPs.",
    icon: "store",
    status: "Useful now",
  },
  {
    title: "Public Meeting AI Checklist",
    audience: "Cities, counties, nonprofits, reporters",
    detail: "Questions for procurement, public records, explainability, data rights, bias review, and resident impact.",
    icon: "landmark",
    status: "Civic",
  },
  {
    title: "AI Scam and Fraud Guide",
    audience: "Families, churches, banks, schools, local media",
    detail: "A plain-language guide to voice scams, fake invoices, phishing, deepfakes, and verification habits.",
    icon: "shield-alert",
    status: "High trust",
  },
  {
    title: "Kentucky AI Opportunity Map",
    audience: "Students, founders, workforce groups, funders",
    detail: "A region-by-region view of programs, labs, employers, workshops, events, and gaps worth filling.",
    icon: "map",
    status: "Network fuel",
  },
];

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
const nearMeForm = document.querySelector("#nearMeForm");
const roleSelect = document.querySelector("#roleSelect");
const nearRegionSelect = document.querySelector("#nearRegionSelect");
const placeInput = document.querySelector("#placeInput");
const nearMePanel = document.querySelector("#nearMePanel");
const nearMeCards = document.querySelector("#nearMeCards");
const leaderboardGrid = document.querySelector("#leaderboardGrid");
const weeklyShareBullets = document.querySelector("#weeklyShareBullets");
const weeklyLinkedIn = document.querySelector("#weeklyLinkedIn");
const weeklyText = document.querySelector("#weeklyText");
const copyDigestButton = document.querySelector("#copyDigestButton");
const miniShareGrid = document.querySelector("#miniShareGrid");
const toolkitGrid = document.querySelector("#toolkitGrid");

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

function getRegionLabel(regionKey = "statewide") {
  return regions[regionKey]?.label || "Statewide";
}

function getSiteUrl(path = "") {
  const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "https://kyai-flax.vercel.app";
  return `${origin}${path}`;
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
      (update) => {
        const shareUrl = getSignalUrl(update);
        const shareText = buildShareText(update);
        return `
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
          <div class="card-actions">
            <a class="button neutral small-button" href="${escapeHtml(shareUrl)}">
              <span data-lucide="external-link" aria-hidden="true"></span>
              Signal page
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

function getRoleMatches(roleKey, regionKey) {
  const categoryMap = {
    business: ["workforce", "industry", "events"],
    teacher: ["education", "policy", "events"],
    student: ["education", "research", "events"],
    founder: ["industry", "research", "workforce"],
    civic: ["policy", "workforce", "education"],
    journalist: ["policy", "industry", "research"],
  };
  const categories = categoryMap[roleKey] || CATEGORY_PRIORITY;
  const matchingRegion = updates.filter((item) => regionKey === "statewide" || normalizeRegion(item.region) === regionKey);
  const source = matchingRegion.length ? matchingRegion : updates;
  const ranked = source
    .filter((item) => categories.includes(item.category))
    .concat(source.filter((item) => !categories.includes(item.category)));

  return getBalancedUpdates(ranked).slice(0, 3);
}

function renderNearMe() {
  const roleKey = roleSelect?.value || "business";
  const regionKey = nearRegionSelect?.value || "statewide";
  const place = placeInput?.value?.trim();
  const role = rolePlaybooks[roleKey] || rolePlaybooks.business;
  const regionLabel = place || getRegionLabel(regionKey);
  const matches = getRoleMatches(roleKey, regionKey);

  nearMePanel.innerHTML = `
    <p class="kicker">${escapeHtml(role.label)} lens</p>
    <h3>${escapeHtml(regionLabel)} AI watch</h3>
    <p>${escapeHtml(role.headline)}</p>
    <ul>
      ${role.priorities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
    <a class="button primary" href="#lead-form">
      <span data-lucide="send" aria-hidden="true"></span>
      ${escapeHtml(role.nextStep)}
    </a>
  `;

  nearMeCards.innerHTML = matches
    .map(
      (item) => `
        <article class="near-me-card">
          <span>${escapeHtml(item.region || "Kentucky")} / ${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
          <a href="${escapeHtml(getSignalUrl(item))}">Open signal</a>
        </article>
      `,
    )
    .join("");
}

function getRegionScores() {
  const scoreMap = new Map();
  const communityThreads = getThreads();

  for (const key of Object.keys(regions)) {
    scoreMap.set(key, {
      key,
      label: getRegionLabel(key),
      signals: 0,
      events: 0,
      people: 0,
      threads: 0,
    });
  }

  for (const item of updates) {
    const key = normalizeRegion(item.region);
    const bucket = scoreMap.get(key) || scoreMap.get("statewide");
    bucket.signals += 1;
    if (item.category === "events") bucket.events += 1;
    bucket.people += (item.people || []).length + (item.institutions || []).length;
  }

  for (const thread of communityThreads) {
    const key = normalizeRegion(thread.place);
    const bucket = scoreMap.get(key) || scoreMap.get("statewide");
    bucket.threads += 1;
  }

  return [...scoreMap.values()]
    .map((item) => ({
      ...item,
      score: item.signals * 3 + item.events * 4 + item.people + item.threads * 5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function renderLeaderboard() {
  leaderboardGrid.innerHTML = getRegionScores()
    .map(
      (region, index) => `
        <article class="leaderboard-card">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(region.label)}</h3>
          <strong>${region.score} momentum pts</strong>
          <dl>
            <div><dt>Signals</dt><dd>${region.signals}</dd></div>
            <div><dt>Threads</dt><dd>${region.threads}</dd></div>
            <div><dt>People/orgs</dt><dd>${region.people}</dd></div>
          </dl>
        </article>
      `,
    )
    .join("");
}

function buildWeeklyShareText() {
  const bullets = getBalancedUpdates(updates)
    .slice(0, 5)
    .map((item) => `- ${item.region || "Kentucky"}: ${item.title}`);

  return ["Kentucky AI week in 5 signals", ...bullets, "", "Follow KYAI: https://kyai-flax.vercel.app"].join("\n");
}

function renderShareKit() {
  const weeklyPost = buildWeeklyShareText();
  const balanced = getBalancedUpdates(updates);
  weeklyShareBullets.innerHTML = balanced
    .slice(0, 5)
    .map((item) => `<p><strong>${escapeHtml(item.region || "Kentucky")}</strong> ${escapeHtml(item.title)}</p>`)
    .join("");

  const encodedWeekly = encodeURIComponent(weeklyPost);
  weeklyLinkedIn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getSiteUrl("/#share"))}`;
  weeklyText.href = `sms:?&body=${encodedWeekly}`;

  miniShareGrid.innerHTML = getRegionScores()
    .slice(0, 4)
    .map((region) => {
      const topItem = updates.find((item) => normalizeRegion(item.region) === region.key) || balanced[0];
      const text = `${region.label} AI watch: ${topItem?.title || "new Kentucky AI signals"} via KYAI`;
      return `
        <article class="mini-share-card">
          <span>${escapeHtml(region.label)}</span>
          <h3>${escapeHtml(topItem?.title || "Kentucky AI signal")}</h3>
          <p>${region.signals} tracked signals / ${region.threads} community threads</p>
          <div class="card-actions">
            <button class="button neutral small-button" data-copy="${escapeHtml(`${text} ${getSiteUrl("/#share")}`)}" type="button">Copy</button>
            <button class="button neutral small-button" data-share-url="${escapeHtml(getSiteUrl("/#share"))}" data-share-title="${escapeHtml(`${region.label} AI watch`)}" data-share-text="${escapeHtml(text)}" type="button">Share</button>
          </div>
        </article>
      `;
    })
    .join("");
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
          <div class="profile-status">
            <strong>${escapeHtml(item.status)}</strong>
            <a href="#lead-form">${escapeHtml(item.action)}</a>
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

function renderToolkits() {
  toolkitGrid.innerHTML = toolkits
    .map(
      (toolkit) => `
        <article class="toolkit-card">
          <span data-lucide="${escapeHtml(toolkit.icon)}" aria-hidden="true"></span>
          <p>${escapeHtml(toolkit.status)} / ${escapeHtml(toolkit.audience)}</p>
          <h3>${escapeHtml(toolkit.title)}</h3>
          <strong>${escapeHtml(toolkit.detail)}</strong>
          <div class="card-actions">
            <button class="button neutral small-button" data-copy="${escapeHtml(`${toolkit.title}: ${toolkit.detail} https://kyai-flax.vercel.app/#toolkits`)}" type="button">
              <span data-lucide="copy" aria-hidden="true"></span>
              Copy
            </button>
            <a class="button neutral small-button" href="#lead-form">
              <span data-lucide="send" aria-hidden="true"></span>
              Request
            </a>
          </div>
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
    renderNearMe();
    renderLeaderboard();
    renderShareKit();
  } catch {
    const fallbackFeed = {
      updatedAt: null,
      items: fallbackUpdates,
      sources: [],
    };
    renderPulse(fallbackFeed);
    renderIntelligence(fallbackFeed);
    renderRegion(activeRegion);
    renderNearMe();
    renderLeaderboard();
    renderShareKit();
  }
  iconize();
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

nearMeForm.addEventListener("input", () => {
  renderNearMe();
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
        renderShareKit();
        renderToolkits();
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

  const weeklyShareButton = event.target.closest("[data-share='weekly']");
  if (weeklyShareButton) {
    const text = buildWeeklyShareText();
    const url = getSiteUrl("/#share");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Kentucky AI week in 5 signals", text, url });
      } catch {
        await copyText(text);
      }
    } else {
      await copyText(text);
      weeklyShareButton.textContent = "Copied";
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
      renderLeaderboard();
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

copyDigestButton.addEventListener("click", async () => {
  try {
    await copyText(buildWeeklyShareText());
    copyDigestButton.textContent = "Copied weekly post";
    setTimeout(() => {
      copyDigestButton.innerHTML = '<span data-lucide="copy" aria-hidden="true"></span>Copy weekly post';
      iconize();
    }, 1200);
  } catch {
    copyDigestButton.textContent = "Copy failed";
  }
});

threadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(threadForm);
  const threads = getThreads();
  threads.unshift({
    type: formData.get("type"),
    place: "Community submitted",
    status: "Pending review",
    votes: 1,
    topic: formData.get("topic"),
    context: formData.get("context"),
  });
  localStorage.setItem("kyai-threads", JSON.stringify(threads));
  threadStatus.textContent = "Signal saved locally. The next build can back this with accounts and moderation.";
  threadForm.reset();
  renderThreads();
  renderLeaderboard();
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
renderToolkits();
renderThreads();
renderNewsletterCount();
loadIntelligence();
iconize();
