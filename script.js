const SUPPORTED_LANGUAGES = ["en", "de"];
const STORAGE_KEY = "preferredLanguage";
let currentLocale = null;
let activeProjectId = null;

const PROJECT_ACTIONS = {
  esp32: [{ href: "https://github.com/leonlatsch/HT611-01_ESP32", labelKey: "home.projects.github" }],
  photok: [
    { href: "https://github.com/leonlatsch/photok", labelKey: "home.projects.github" },
    {
      href: "https://play.google.com/store/apps/details?id=dev.leonlatsch.photok&utm_source=website",
      labelKey: "home.projects.downloadGooglePlay"
    },
    { href: "https://f-droid.org/packages/dev.leonlatsch.photok", labelKey: "home.projects.downloadFdroid" }
  ],
  kolibriSuite: [
    { href: "https://github.com/leonlatsch/kolibri", labelKey: "home.projects.githubApp" },
    { href: "https://github.com/leonlatsch/kolibri-server", labelKey: "home.projects.githubServer" },
    { href: "https://kolibri.leonlatsch.dev", labelKey: "home.projects.website" },
    { href: "https://github.com/leonlatsch/kolibri/releases/latest", labelKey: "home.projects.downloadApp" },
    { href: "https://github.com/leonlatsch/kolibri-server/releases/latest", labelKey: "home.projects.downloadServer" }
  ],
  godaddy: [{ href: "https://github.com/leonlatsch/godaddy-dyndns", labelKey: "home.projects.github" }],
  scrypt: [
    { href: "https://github.com/leonlatsch/scrypt", labelKey: "home.projects.github" },
    { href: "https://github.com/leonlatsch/scrypt/releases/latest", labelKey: "home.projects.download" }
  ],
  scryptLite: [
    { href: "https://github.com/leonlatsch/scrypt-lite", labelKey: "home.projects.github" },
    { href: "https://github.com/leonlatsch/scrypt-lite/releases/latest", labelKey: "home.projects.download" }
  ],
  pc2mqtt: [{ href: "https://github.com/leonlatsch/pc2mqtt", labelKey: "home.projects.github" }],
  goResolve: [{ href: "https://github.com/leonlatsch/go-resolve", labelKey: "home.projects.github" }]
};

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function detectLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }

  const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  const match = candidates
    .map((lang) => String(lang).toLowerCase())
    .find((lang) => lang.startsWith("de") || lang.startsWith("en"));

  if (!match) {
    return "en";
  }

  return match.startsWith("de") ? "de" : "en";
}

async function loadLocale(language) {
  const response = await fetch(`./locales/${language}.json`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load locale: ${language}`);
  }
  return response.json();
}

function applyMeta(locale) {
  const page = document.body.dataset.page;
  const meta = locale.meta && locale.meta[page];
  if (!meta) return;

  if (meta.title) {
    document.title = meta.title;
  }

  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag && meta.description) {
    descriptionTag.setAttribute("content", meta.description);
  }
}

function applyTranslations(locale) {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const value = getNestedValue(locale, key);
    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const key = element.dataset.i18nHtml;
    const value = getNestedValue(locale, key);
    if (typeof value === "string") {
      element.innerHTML = value;
    }
  });
}

function updateLanguageButtons(language) {
  document.querySelectorAll(".lang-switcher button[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === language);
  });
}

function t(key, fallback = "") {
  const value = getNestedValue(currentLocale, key);
  return typeof value === "string" ? value : fallback;
}

function renderProjectModal(projectId) {
  const modal = document.getElementById("project-modal");
  if (!modal || !currentLocale) return;

  const title = t(`home.projectDetails.${projectId}.title`, t(`home.projects.${projectId}.title`, ""));
  const text = t(`home.projectDetails.${projectId}.text`, t(`home.projects.${projectId}.description`, ""));

  const titleEl = document.getElementById("project-modal-title");
  const bodyEl = document.getElementById("project-modal-body");
  const linksEl = document.getElementById("project-modal-links");

  if (!titleEl || !bodyEl || !linksEl) return;

  titleEl.textContent = title;
  bodyEl.textContent = text;
  linksEl.innerHTML = "";

  (PROJECT_ACTIONS[projectId] || []).forEach((action) => {
    const a = document.createElement("a");
    a.href = action.href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = t(action.labelKey, "Open");
    linksEl.appendChild(a);
  });
}

function openProjectModal(projectId) {
  const modal = document.getElementById("project-modal");
  if (!modal) return;

  modal.classList.remove("is-closing");
  activeProjectId = projectId;
  renderProjectModal(projectId);

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "open");
  }
}

function closeProjectModal() {
  const modal = document.getElementById("project-modal");
  if (!modal) return;
  if (modal.classList.contains("is-closing")) return;

  activeProjectId = null;
  modal.classList.add("is-closing");

  window.setTimeout(() => {
    if (typeof modal.close === "function") {
      modal.close();
    } else {
      modal.removeAttribute("open");
    }
    modal.classList.remove("is-closing");
  }, 160);
}

function initProjectModal() {
  const modal = document.getElementById("project-modal");
  if (!modal) return;

  document.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => {
      openProjectModal(button.getAttribute("data-open-project"));
    });
  });

  const closeButton = document.getElementById("project-modal-close");
  if (closeButton) {
    closeButton.addEventListener("click", closeProjectModal);
  }

  modal.addEventListener("click", (event) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      closeProjectModal();
    }
  });

  modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProjectModal();
  });
}

async function setLanguage(language) {
  const normalized = SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  const locale = await loadLocale(normalized);

  document.body.classList.add("is-lang-transition");
  currentLocale = locale;
  document.documentElement.lang = normalized;
  localStorage.setItem(STORAGE_KEY, normalized);

  applyMeta(locale);
  applyTranslations(locale);
  updateLanguageButtons(normalized);

  if (activeProjectId) {
    renderProjectModal(activeProjectId);
  }

  window.setTimeout(() => {
    document.body.classList.remove("is-lang-transition");
  }, 300);
}

function initLanguageSwitcher() {
  document.querySelectorAll(".lang-switcher button[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.lang).catch(() => {
        // Keep current language when switching fails.
      });
    });
  });
}

function initRevealAnimation() {
  const revealTargets = document.querySelectorAll(".hero, .section");
  if (!revealTargets.length) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  revealTargets.forEach((element) => {
    element.classList.add("reveal");
  });

  if (reduceMotion) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  revealTargets.forEach((element, index) => {
    window.setTimeout(() => {
      element.classList.add("is-visible");
    }, 120 + index * 130);
  });
}

function resetScrollOnReload() {
  if (document.body.dataset.page !== "home") return;

  const navEntry = performance.getEntriesByType("navigation")[0];
  const isReload = navEntry && navEntry.type === "reload";
  if (!isReload) return;

  if (window.location.hash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

async function init() {
  resetScrollOnReload();
  initLanguageSwitcher();
  initProjectModal();

  const initialLanguage = detectLanguage();
  try {
    await setLanguage(initialLanguage);
  } catch {
    await setLanguage("en");
  }

  initRevealAnimation();
}

init();
