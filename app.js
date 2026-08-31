const updates = [
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

function renderUpdates(filter = "all") {
  updateList.innerHTML = updates
    .map(
      (update) => `
        <article class="update-card" data-category="${update.category}" data-hidden="${
          filter !== "all" && update.category !== filter
        }">
          <div class="update-meta">
            <span>${escapeHtml(update.region)}</span>
            <span>${escapeHtml(update.category)}</span>
          </div>
          <h3>${escapeHtml(update.title)}</h3>
          <p>${escapeHtml(update.body)}</p>
        </article>
      `,
    )
    .join("");
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
    renderUpdates(button.dataset.filter);
  });
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
iconize();
