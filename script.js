const SUPPORTED_LANGUAGES = ["en", "de"];
const STORAGE_KEY = "preferredLanguage";
let currentLocale = null;

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

  document.querySelectorAll(".lang-switcher").forEach((switcher) => {
    switcher.dataset.active = language;
    requestAnimationFrame(() => switcher.classList.add("is-ready"));
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
  const revealTargets = document.querySelectorAll("main > section, .legal-card");
  if (!revealTargets.length) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );

  revealTargets.forEach((element) => {
    element.classList.add("reveal");
    observer.observe(element);
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

  const initialLanguage = detectLanguage();
  try {
    await setLanguage(initialLanguage);
  } catch {
    await setLanguage("en");
  }

  initRevealAnimation();
}

init();
