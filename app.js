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
    category: "education",
    region: "Eastern Kentucky",
    title: "Rural access and digital readiness",
    body:
      "Workshops focused on practical AI access, broadband realities, local workforce transition, and student opportunity in Appalachian Kentucky.",
  },
];

const updateList = document.querySelector("#updateList");
const filterButtons = document.querySelectorAll(".filter-button");
const joinForm = document.querySelector("#joinForm");
const formStatus = document.querySelector("#formStatus");

function iconize() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2.2,
      },
    });
  }
}

function renderUpdates(filter = "all") {
  updateList.innerHTML = updates
    .map(
      (update) => `
        <article class="update-card" data-category="${update.category}" data-hidden="${
          filter !== "all" && update.category !== filter
        }">
          <div class="update-meta">
            <span>${update.region}</span>
            <span>${update.category}</span>
          </div>
          <h3>${update.title}</h3>
          <p>${update.body}</p>
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
iconize();
