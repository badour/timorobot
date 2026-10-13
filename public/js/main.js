import { answer, farewell, greeting, showTopic, validateContent } from "/src/dialogue.mjs";
import { createListener, hasNativeNavigation, navigate, speak, stopSpeaking } from "/js/bridge.js";
import { esc, safeLogoUrl } from "/js/html.js";
import { mountStudio } from "/js/studio.js";

const STORAGE_KEY = "timo-university-content-v1";
const params = new URLSearchParams(location.search);

const state = {
  bundled: null,
  content: null,
  lang: params.get("lang") === "en" ? "en" : (sessionStorage.getItem("timo-lang") || "ar"),
  audience: "visitor",
  screen: "home",
  article: null,
  articleKey: "",
  line: "",
  said: "",
  listening: false,
  speaking: false,
  native: params.has("native"),
  modal: "",
  pinError: false,
};

const UI = {
  ar: {
    help: "كيف أقدر أساعدك؟",
    ask: "اسأل عن الجامعة أو الكلية أو المرفق",
    send: "إرسال",
    listen: "تحدث",
    stop: "إيقاف",
    back: "الرجوع",
    guide: "ابدأ المرافقة",
    about: "عن الجامعة",
    aboutHint: "التعريف والرؤية والخدمات",
    vision: "الرؤية والرسالة",
    visionHint: "ما الذي تسعى إليه الجامعة",
    services: "الخدمات",
    servicesHint: "ماذا نقدم للطلبة والزوار",
    colleges: "الكليات والأقسام",
    collegesHint: "التخصصات ومواقع الكليات",
    facilities: "المرافق الجامعية",
    facilitiesHint: "المكتبة والعيادة وطريق الوصول",
    contact: "التواصل",
    contactHint: "عمادة القبول وبيانات الاتصال",
    visitor: "زائر",
    student: "طالب",
    simVisitor: "اقتراب زائر",
    simStudent: "اقتراب طالب",
    simLeave: "مغادرة",
    staff: "إعداد المؤسسة",
    sample: "محتوى تجريبي. استبدلوا بيانات {name} من إعداد المؤسسة.",
    said: "قلت",
    navOn: "سأنطلق إلى هذه النقطة على خريطة تيمو.",
    navOff: "الاتجاه ظاهر على الشاشة. حركة الروبوت تبدأ بعد ربط نقطة الخريطة في تطبيق تيمو.",
    pinTitle: "إعداد المؤسسة",
    pinHint: "أدخل رمز الموظفين المكوّن من أربع خانات.",
    pinError: "الرمز غير صحيح",
    confirm: "دخول",
    cancel: "إلغاء",
    micMissing: "الميكروفون غير متاح هنا. اكتب السؤال في الحقل.",
    saved: "تم حفظ محتوى الجامعة على هذا الجهاز.",
    reset: "عادت البيانات إلى النموذج التجريبي.",
    imported: "تم استيراد محتوى الجامعة.",
  },
  en: {
    help: "How can I help?",
    ask: "Ask about the university, a college, or a facility",
    send: "Send",
    listen: "Speak",
    stop: "Stop",
    back: "Back",
    guide: "Start guiding",
    about: "About",
    aboutHint: "Introduction, vision, and services",
    vision: "Vision and mission",
    visionHint: "What the university aims for",
    services: "Services",
    servicesHint: "What we offer students and visitors",
    colleges: "Colleges and departments",
    collegesHint: "Programs and where to find them",
    facilities: "Facilities",
    facilitiesHint: "Library, clinic, and directions",
    contact: "Contact",
    contactHint: "Admissions and contact details",
    visitor: "Visitor",
    student: "Student",
    simVisitor: "Visitor approaches",
    simStudent: "Student approaches",
    simLeave: "Visitor leaves",
    staff: "University setup",
    sample: "Sample content for {name}. Replace it in University setup.",
    said: "You said",
    navOn: "I will go to this point on the Timo map.",
    navOff: "The direction is on screen. The robot moves after this map point is linked in the Timo app.",
    pinTitle: "University setup",
    pinHint: "Enter the four-digit staff code.",
    pinError: "Incorrect code",
    confirm: "Enter",
    cancel: "Cancel",
    micMissing: "The microphone is unavailable here. Type the question instead.",
    saved: "University content was saved on this device.",
    reset: "The sample university content is restored.",
    imported: "University content was imported.",
  },
};

const TILES = [
  ["topic:about", "about", "aboutHint"],
  ["topic:vision", "vision", "visionHint"],
  ["topic:services", "services", "servicesHint"],
  ["topic:colleges", "colleges", "collegesHint"],
  ["topic:facilities", "facilities", "facilitiesHint"],
  ["topic:contact", "contact", "contactHint"],
];

function t(key) {
  return UI[state.lang][key] || key;
}

function text(block) {
  return block?.[state.lang] || block?.ar || "";
}

if (state.native) {
  window.TimoHost = window.TimoHost || {
    navigate(id) {
      window.__timoNav = id;
      const log = document.getElementById("native-log");
      if (log) log.textContent = `${log.textContent}\nnavigate: ${id}`.trim();
    },
    speak(line, lang) {
      window.__timoSpeak = { text: line, lang };
      const log = document.getElementById("native-log");
      if (log) log.textContent = `${log.textContent}\n${lang}: ${line}`.trim();
    },
  };
}

const listener = createListener({
  onResult: (textHeard) => handleHear(textHeard),
  onEnd: () => {
    state.listening = false;
    const mic = document.getElementById("mic");
    if (mic) mic.textContent = t("listen");
  },
  onError: () => {
    state.listening = false;
    toast(t("micMissing"));
  },
});

function applyTheme(theme = {}) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary || "#14352c");
  root.style.setProperty("--accent", theme.accent || "#a6843d");
  root.style.setProperty("--surface", theme.surface || "#f3eee4");
  root.style.setProperty("--ink", theme.ink || "#1c1914");
  root.style.setProperty("--card", theme.card || "#fffcf7");
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  sessionStorage.setItem("timo-lang", state.lang);
}

function logoMarkup() {
  const src = safeLogoUrl(state.content.identity.logoUrl);
  if (src) return `<img class="logo-img" alt="" src="${esc(src)}" />`;
  return `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 50h36M20 50V28M44 50V28M20 28a12 12 0 0 1 24 0" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`;
}

function ensureShell() {
  const app = document.getElementById("app");
  if (document.getElementById("kiosk")) return;
  app.className = "";
  app.innerHTML = `<div id="kiosk"></div><div id="studio" hidden></div><div id="toast" role="status" hidden></div>`;
}

function renderKiosk() {
  ensureShell();
  applyTheme(state.content.theme);
  applyLanguage();
  const name = text(state.content.identity.name);
  document.title = `${name} — ${text(state.content.identity.robotName)}`;
  const showSim = state.content.behavior?.showSimulator !== false;
  document.getElementById("kiosk").innerHTML = `
    <div class="frame ${state.speaking ? "is-speaking" : ""}">
      ${state.content.sample ? `<div class="sample">${esc(t("sample").replace("{name}", name))}</div>` : ""}
      <div class="stage">
        <aside class="rail">
          <div class="brand">
            <div class="logo-tile">${logoMarkup()}</div>
            <div>
              <p class="brand-kicker">${esc(text(state.content.identity.robotName))}</p>
              <h1>${esc(name)}</h1>
              <p class="tagline">${esc(text(state.content.identity.tagline))}</p>
            </div>
          </div>
          <div class="langs" role="group" aria-label="language">
            <button type="button" data-lang="ar" aria-pressed="${state.lang === "ar"}">العربية</button>
            <button type="button" data-lang="en" aria-pressed="${state.lang === "en"}">English</button>
          </div>
          <p class="hero" aria-live="polite">${esc(state.line)}</p>
          <div class="rail-foot">
            <p class="clock" id="clock"></p>
            <p class="audience">${esc(t(state.audience))}</p>
          </div>
        </aside>
        <section class="panel">
          ${state.screen === "article" ? articleMarkup() : homeMarkup()}
        </section>
      </div>
      <form id="ask" class="ask">
        <input id="q" name="q" autocomplete="off" placeholder="${esc(t("ask"))}" />
        <button class="btn" type="submit">${esc(t("send"))}</button>
        <button class="btn gold" id="mic" type="button">${esc(state.listening ? t("stop") : t("listen"))}</button>
      </form>
      <div class="sim">
        ${showSim ? `<button type="button" data-approach="visitor">${esc(t("simVisitor"))}</button><button type="button" data-approach="student">${esc(t("simStudent"))}</button><button type="button" data-leave>${esc(t("simLeave"))}</button>` : ""}
        <button type="button" class="staff" data-studio>${esc(t("staff"))}</button>
      </div>
      ${state.native ? `<p class="native-log" id="native-log"></p>` : ""}
    </div>
    ${state.modal === "pin" ? pinMarkup() : ""}
  `;
  tickClock();
  bindKiosk();
}

function homeMarkup() {
  return `
    <div class="panel-head"><h2>${esc(t("help"))}</h2></div>
    <div class="tiles">
      ${TILES.map(([key, title, hint]) => `<button type="button" class="tile" data-key="${key}"><strong>${esc(t(title))}</strong><span>${esc(t(hint))}</span></button>`).join("")}
    </div>
  `;
}

function articleMarkup() {
  const article = state.article;
  const paragraphs = String(article.body || "").split(/\n\n+/).filter(Boolean).map((part) => `<p>${esc(part)}</p>`).join("");
  const cards = (article.items || []).map((item) => `<button type="button" class="card" data-key="${esc(item.key)}"><strong>${esc(item.title)}</strong><span>${esc(item.subtitle || "")}</span></button>`).join("");
  const chips = (article.suggestions || []).map((item) => `<button type="button" class="chip" data-query="${esc(item.query)}">${esc(item.label)}</button>`).join("");
  const direction = article.focus?.where ? `
    <div class="direction">
      <p class="where">${esc(article.focus.where)}</p>
      <button type="button" class="btn gold" data-go="${esc(article.focus.mapPoint || "")}">${esc(t("guide"))}</button>
      <p class="nav-note" id="nav-note">${esc(hasNativeNavigation() ? t("navOn") : t("navOff"))}</p>
    </div>` : "";
  return `
    <button type="button" class="back" data-home>${esc(t("back"))}</button>
    ${state.said ? `<p class="said">${esc(t("said"))}: ${esc(state.said)}</p>` : ""}
    <article class="article">
      <p class="kicker">${esc(text(state.content.identity.robotName))}</p>
      <h2>${esc(article.title)}</h2>
      ${paragraphs}
      ${cards ? `<div class="cards">${cards}</div>` : ""}
      ${direction}
      <div class="chips">${chips}</div>
    </article>
  `;
}

function pinMarkup() {
  return `
    <div class="modal">
      <form class="dialog" id="pin-form">
        <h2>${esc(t("pinTitle"))}</h2>
        <p>${esc(t("pinHint"))}</p>
        <input id="pin" inputmode="numeric" maxlength="4" autocomplete="off" />
        <p class="pin-error">${state.pinError ? esc(t("pinError")) : ""}</p>
        <div class="actions">
          <button type="button" class="btn" id="pin-cancel">${esc(t("cancel"))}</button>
          <button type="submit" class="btn gold">${esc(t("confirm"))}</button>
        </div>
      </form>
    </div>
  `;
}

function bindKiosk() {
  document.getElementById("kiosk").querySelectorAll("[data-lang]").forEach((button) => {
    button.onclick = () => setLanguage(button.dataset.lang);
  });
  document.getElementById("kiosk").querySelectorAll("[data-key]").forEach((button) => {
    button.onclick = () => openKey(button.dataset.key, true);
  });
  document.getElementById("kiosk").querySelectorAll("[data-query]").forEach((button) => {
    button.onclick = () => handleHear(button.dataset.query);
  });
  const home = document.querySelector("[data-home]");
  if (home) home.onclick = () => showHome(false);
  const go = document.querySelector("[data-go]");
  if (go) go.onclick = () => startGuide(go.dataset.go);
  document.querySelectorAll("[data-approach]").forEach((button) => {
    button.onclick = () => handleApproach(button.dataset.approach);
  });
  const leave = document.querySelector("[data-leave]");
  if (leave) leave.onclick = () => handleLeave();
  const staff = document.querySelector("[data-studio]");
  if (staff) staff.onclick = () => askPin();
  document.getElementById("ask").onsubmit = (event) => {
    event.preventDefault();
    const input = document.getElementById("q");
    const value = input.value.trim();
    if (!value) return;
    handleHear(value);
  };
  document.getElementById("mic").onclick = toggleMic;
  const pinForm = document.getElementById("pin-form");
  if (pinForm) {
    pinForm.onsubmit = (event) => {
      event.preventDefault();
      const entered = document.getElementById("pin").value.trim();
      if (entered === String(state.content.staffPin || "2468")) {
        sessionStorage.setItem("timo-staff", entered);
        state.modal = "";
        state.pinError = false;
        openStudio();
      } else {
        state.pinError = true;
        renderKiosk();
      }
    };
    document.getElementById("pin-cancel").onclick = () => {
      state.modal = "";
      state.pinError = false;
      renderKiosk();
    };
    document.getElementById("pin").focus();
  }
}

function showResult(result, said = "") {
  state.lang = result.lang || state.lang;
  state.article = result;
  state.articleKey = result.key || "";
  state.screen = "article";
  state.line = result.speech;
  state.said = said;
  renderKiosk();
  utter(result.speech, result.lang);
  if (result.intent === "guide" && result.focus && hasNativeNavigation()) navigate(result.focus.mapPoint);
}

function openKey(key, withSpeech) {
  const result = showTopic(state.content, key, state.lang, { canNavigate: hasNativeNavigation() });
  state.article = result;
  state.articleKey = key;
  state.screen = "article";
  state.line = result.speech;
  state.said = "";
  renderKiosk();
  if (withSpeech) utter(result.speech, result.lang);
}

function showHome(withSpeech) {
  const hello = greeting({ content: state.content, audience: state.audience, lang: state.lang });
  state.screen = "home";
  state.article = null;
  state.articleKey = "";
  state.line = hello.speech;
  state.said = "";
  renderKiosk();
  if (withSpeech) utter(hello.speech, hello.lang);
}

function handleHear(text) {
  const heard = String(text || "").trim();
  if (!heard || !state.content) return;
  armIdle();
  const result = answer({
    content: state.content,
    text: heard,
    lang: state.lang,
    canNavigate: hasNativeNavigation(),
    audience: state.audience,
  });
  showResult(result, heard);
}

function handleApproach(audience) {
  if (!state.content) return;
  state.audience = audience === "student" ? "student" : "visitor";
  armIdle();
  showHome(true);
}

function handleLeave() {
  if (!state.content) return;
  const result = farewell({ content: state.content, audience: state.audience, lang: state.lang });
  state.audience = "visitor";
  state.screen = "home";
  state.article = null;
  state.articleKey = "";
  state.line = result.speech;
  state.said = "";
  renderKiosk();
  utter(result.speech, result.lang);
}

function startGuide(mapPoint) {
  const moved = navigate(mapPoint);
  const note = document.getElementById("nav-note");
  if (note) note.textContent = moved ? t("navOn") : t("navOff");
  if (!state.articleKey) return;
  const guided = showTopic(state.content, state.articleKey, state.lang, { guide: true, canNavigate: moved });
  state.line = guided.speech;
  const hero = document.querySelector(".hero");
  if (hero) hero.textContent = guided.speech;
  utter(guided.speech, guided.lang);
}

function setLanguage(lang) {
  state.lang = lang === "en" ? "en" : "ar";
  if (state.screen === "article" && state.articleKey) openKey(state.articleKey, false);
  else showHome(false);
}

function toggleMic() {
  if (state.listening) {
    listener.stop();
    state.listening = false;
    renderKiosk();
    return;
  }
  if (!listener.supported) {
    toast(t("micMissing"));
    return;
  }
  state.listening = true;
  const mic = document.getElementById("mic");
  if (mic) mic.textContent = t("stop");
  listener.start(state.lang);
}

function utter(line, lang, onend) {
  state.speaking = true;
  document.querySelector(".frame")?.classList.add("is-speaking");
  speak(line, lang, {
    onend: () => {
      state.speaking = false;
      document.querySelector(".frame")?.classList.remove("is-speaking");
      onend?.();
    },
  });
}

function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function tickClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  clock.textContent = new Intl.DateTimeFormat(state.lang === "ar" ? "ar" : "en", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function armIdle() {
  window.clearTimeout(state.idle);
  const seconds = Number(state.content?.behavior?.idleSeconds) || 90;
  state.idle = window.setTimeout(() => {
    if (state.screen === "home" || !document.getElementById("studio")?.hidden) return;
    stopSpeaking();
    showHome(false);
  }, seconds * 1000);
}

function askPin() {
  const pin = String(state.content.staffPin || "2468");
  if (sessionStorage.getItem("timo-staff") === pin) {
    openStudio();
    return;
  }
  state.modal = "pin";
  state.pinError = false;
  renderKiosk();
}

function openStudio() {
  state.modal = "";
  const studio = document.getElementById("studio");
  studio.hidden = false;
  mountStudio(studio, {
    content: state.content,
    lang: state.lang,
    onTheme: applyTheme,
    onClose: () => {
      studio.hidden = true;
      renderKiosk();
    },
    onSave: (next) => saveContent(next, t("saved")),
    onReset: () => saveContent(structuredClone(state.bundled), t("reset"), true),
    onError: toast,
  });
}

function saveContent(next, message, reset) {
  const check = validateContent(next);
  if (!check.ok) {
    toast(check.errors[0]);
    return;
  }
  if (reset) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  state.content = next;
  document.getElementById("studio").hidden = true;
  showHome(false);
  toast(message);
}

async function load() {
  const response = await fetch("/content/university.json");
  state.bundled = await response.json();
  const saved = localStorage.getItem(STORAGE_KEY);
  state.content = state.bundled;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (validateContent(parsed).ok) state.content = parsed;
    } catch {
      state.content = state.bundled;
    }
  }
  const hello = greeting({ content: state.content, audience: "visitor", lang: state.lang });
  state.line = hello.speech;
  renderKiosk();
  if (state.content.behavior?.speakOnLoad) utter(hello.speech, hello.lang);
}

window.TimoUniversity = {
  hear: (text) => handleHear(text),
  approach: (audience) => handleApproach(audience),
  leave: () => handleLeave(),
  setLanguage: (lang) => setLanguage(lang),
  getContent: () => state.content,
};

document.addEventListener("pointerdown", () => armIdle(), true);
window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
setInterval(tickClock, 10000);

load().catch((error) => {
  const app = document.getElementById("app");
  app.textContent = `تعذر تشغيل الاستقبال: ${error.message}`;
});
