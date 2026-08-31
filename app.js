const fallbackUpdates = [
  {
    category: "education",
    region: "Bluegrass",
    title: "Free AI Basics curriculum",
    body:
      "Starter lesson plans for libraries, schools, churches, and community colleges covering prompts, privacy, citations, and responsible use.",
  },
  {
    category: "workforce",
    region: "Louisville",
    title: "Small business workflow clinics",
    body:
      "Hands-on training for local teams that want to use AI for operations, customer support, grant writing, marketing, and internal documentation.",
  },
  {
    category: "policy",
    region: "Statewide",
    title: "Public meetings and policy notes",
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
    title: "AI meetups, workshops, and public talks",
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

let updates = fallbackUpdates;
let activeFilter = "all";
let visibleUpdateCount = 6;
const UPDATE_BATCH_SIZE = 6;
const CATEGORY_PRIORITY = ["industry", "research", "education", "policy", "workforce", "events", "news"];

const seedThreads = [
  {
    type: "News lead",
    place: "Statewide",
    topic: "Where should KYAI track Kentucky AI news first?",
    context:
      "Suggested starting lanes: schools, universities, workforce boards, local government, health systems, startups, and public library programs.",
  },
  {
    type: "Research note",
    place: "Bluegrass",
    topic: "Build a public Kentucky AI research index",
    context:
      "Collect university labs, faculty work, student projects, public datasets, grants, and applied AI pilots in one open directory.",
  },
  {
    type: "Workshop request",
    place: "Eastern Kentucky",
    topic: "AI basics session for rural small businesses",
    context:
      "A practical workshop on using AI for quotes, inventory notes, customer messages, grant drafts, and fraud-aware research would be useful.",
  },
];

const updateList = document.querySelector("#updateList");
const filterButtons = document.querySelectorAll(".filter-button");
const joinForm = document.querySelector("#joinForm");
const formStatus = document.querySelector("#formStatus");
const threadList = document.querySelector("#threadList");
const threadForm = document.querySelector("#threadForm");
const threadStatus = document.querySelector("#threadStatus");
const intelUpdatedAt = document.querySelector("#intelUpdatedAt");
const intelItemsCount = document.querySelector("#intelItemsCount");
const intelSources = document.querySelector("#intelSources");
const digestPreview = document.querySelector("#digestPreview");
const watchList = document.querySelector("#watchList");
const showMoreButton = document.querySelector("#showMoreUpdates");

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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Seed data";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function renderUpdates(filter = "all") {
  activeFilter = filter;
  const filteredUpdates =
    filter === "all"
      ? getBalancedUpdates(updates)
      : updates.filter((update) => update.category === filter);
  const visibleUpdates = filteredUpdates.slice(0, visibleUpdateCount);

  updateList.innerHTML = visibleUpdates
    .map(
      (update) => `
        <article class="update-card" data-category="${update.category}">
          <div class="update-meta">
            <span>${escapeHtml(update.region)}</span>
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
          ${
            update.people?.length
              ? `<p class="people-line">People: ${escapeHtml(update.people.join(", "))}</p>`
              : ""
          }
          ${
            update.source
              ? `<p class="source-line">Source: ${escapeHtml(update.source)}</p>`
              : ""
          }
        </article>
      `,
    )
    .join("");

  if (!visibleUpdates.length) {
    updateList.innerHTML = `
      <article class="update-card">
        <div class="update-meta">
          <span>Kentucky</span>
          <span>${escapeHtml(filter)}</span>
        </div>
        <h3>No items in this lane yet</h3>
        <p>The automation will add relevant public leads as they show up.</p>
      </article>
    `;
  }

  if (showMoreButton) {
    showMoreButton.hidden = visibleUpdateCount >= filteredUpdates.length;
  }
}

function renderIntelligence(feed) {
  intelUpdatedAt.textContent = formatDate(feed.updatedAt);
  intelItemsCount.textContent = String(feed.items?.length || 0);
  intelSources.textContent = String(feed.sources?.length || 0);

  digestPreview.innerHTML = getBalancedUpdates(feed.items || [])
    .slice(0, 4)
    .map(
      (item) => `
        <article>
          <span>${escapeHtml(item.category)}</span>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
        </article>
      `,
    )
    .join("");

  watchList.innerHTML = (feed.watchlist || [])
    .map(
      (item) => `
        <article>
          <span>${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.focus)}</p>
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
      renderUpdates(activeFilter);
    }
    renderIntelligence(feed);
  } catch {
    renderIntelligence({
      updatedAt: null,
      items: fallbackUpdates,
      sources: [],
      watchlist: [
        {
          type: "Seed",
          name: "Kentucky AI tracker",
          focus: "The public automation feed will appear here after the first refresh.",
        },
      ],
    });
  }
}

function getThreads() {
  return JSON.parse(localStorage.getItem("kyai-threads") || "null") || seedThreads;
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    visibleUpdateCount = 6;
    renderUpdates(button.dataset.filter);
  });
});

showMoreButton.addEventListener("click", () => {
  visibleUpdateCount += UPDATE_BATCH_SIZE;
  renderUpdates(activeFilter);
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
  threadStatus.textContent = "Thread saved locally. The next build can back this with accounts and moderation.";
  threadForm.reset();
  renderThreads();
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
  const existing = JSON.parse(localStorage.getItem("kyai-interest") || "[]");
  existing.push(entry);
  localStorage.setItem("kyai-interest", JSON.stringify(existing));
  formStatus.textContent = "Interest saved. KYAI can connect this to email, CRM, or GitHub next.";
  joinForm.reset();
});

renderUpdates();
renderThreads();
loadIntelligence();
iconize();
