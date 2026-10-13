const STOP = new Set([
  "عن", "في", "من", "على", "الى", "الي", "ما", "هي", "هو", "وش", "ايش", "كيف",
  "كليه", "قسم", "عماده", "مبنى", "الجامعه", "جامعه", "للجامعه", "بالجامعه",
  "the", "of", "and", "college", "faculty", "department", "a", "to", "for",
]);

const GUIDE_PHRASES = [
  "وين", "اين", "فين", "خذني", "دلني", "ارشدني", "وصلني", "وجهني",
  "كيف اصل", "وين اروح", "طريق",
  "where", "where is", "take me", "guide me", "directions", "navigate",
  "how do i get", "how can i get",
];

const DEFAULT_SUGGESTIONS = {
  ar: [
    { label: "عن الجامعة", query: "عرفني عن الجامعة" },
    { label: "الرؤية", query: "ما رؤية الجامعة" },
    { label: "الخدمات", query: "ما خدمات الجامعة" },
    { label: "الكليات", query: "ما الكليات والأقسام" },
    { label: "المكتبة", query: "وين المكتبة" },
  ],
  en: [
    { label: "About", query: "Tell me about the university" },
    { label: "Vision", query: "What is the vision" },
    { label: "Services", query: "What services do you offer" },
    { label: "Colleges", query: "List the colleges" },
    { label: "Library", query: "Where is the library" },
  ],
};

export function normalize(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(input) {
  return normalize(input).split(" ").filter(Boolean);
}

function stripAl(token) {
  return token.startsWith("ال") && token.length > 4 ? token.slice(2) : token;
}

function sameToken(a, b) {
  if (a === b) return true;
  const left = stripAl(a);
  const right = stripAl(b);
  return left.length >= 3 && left === right;
}

function keywordScore(queryNorm, queryTokens, keyword) {
  const normalized = normalize(keyword);
  if (!normalized) return 0;
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 1) {
    const word = parts[0];
    const hit = queryTokens.some((token) => sameToken(token, word));
    return hit ? 40 + word.length : 0;
  }
  if (queryNorm === normalized) return 100 + normalized.length;
  if (queryNorm.includes(normalized)) return 55 + normalized.length;
  const all = parts.every((word) => queryTokens.some((token) => sameToken(token, word)));
  return all ? 34 + normalized.length : 0;
}

function titleScore(queryTokens, title) {
  const name = [];
  for (const token of tokens(title || "")) {
    const stem = stripAl(token);
    if (stem.length < 3 || STOP.has(stem) || STOP.has(token)) continue;
    if (!name.includes(stem)) name.push(stem);
  }
  const matched = name.filter((token) => queryTokens.some((query) => sameToken(query, token)));
  if (!matched.length) return 0;
  let score = 46 + matched.length * 8;
  if (matched.length === name.length) score += 30;
  return score;
}

function phraseList(...groups) {
  return groups.flat().filter(Boolean);
}

function fill(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function varsOf(content, lang, extra = {}) {
  return {
    name: content.identity?.name?.[lang] || "",
    robot: content.identity?.robotName?.[lang] || (lang === "ar" ? "تيمو" : "Timo"),
    ...extra,
  };
}

function join(lang, list) {
  return list.filter(Boolean).join(lang === "ar" ? "، " : ", ");
}

function suggestions(content, lang) {
  const custom = content.suggestions?.[lang];
  return Array.isArray(custom) && custom.length ? custom : DEFAULT_SUGGESTIONS[lang];
}

function withSpeech(content, lang, result) {
  const vars = varsOf(content, lang);
  return {
    ...result,
    lang,
    title: fill(result.title, vars),
    body: fill(result.body, vars),
    speech: fill(result.speech, vars),
    suggestions: result.suggestions || suggestions(content, lang),
  };
}

function guideSpeech(lang, focus, canNavigate) {
  if (canNavigate) {
    return lang === "ar"
      ? `تفضل، سأرافقك إلى ${focus.title}. ${focus.where}.`
      : `Please come with me to ${focus.title}. ${focus.where}.`;
  }
  return lang === "ar"
    ? `${focus.title}: ${focus.where}.`
    : `${focus.title}: ${focus.where}.`;
}

export function indexContent(content) {
  const items = [];
  const add = (item) => items.push(item);

  add({
    key: "topic:about",
    kind: "topic",
    id: "about",
    intent: "about",
    phrases: phraseList(content.about?.keywords?.ar, content.about?.keywords?.en, content.about?.title?.ar, content.about?.title?.en),
    titles: [],
    present(lang) {
      return {
        intent: "about",
        title: content.about.title[lang],
        body: content.about.body[lang],
        speech: content.about.body[lang],
        items: [
          { key: "topic:vision", title: content.vision.title[lang], subtitle: content.vision.body[lang] },
          { key: "topic:mission", title: content.mission.title[lang], subtitle: content.mission.body[lang] },
          { key: "topic:services", title: lang === "ar" ? "الخدمات" : "Services", subtitle: lang === "ar" ? "خدمات الجامعة للطلبة والزوار" : "University services for students and visitors" },
        ],
        focus: null,
      };
    },
  });

  add({
    key: "topic:vision",
    kind: "topic",
    id: "vision",
    intent: "vision",
    phrases: phraseList(content.vision?.keywords?.ar, content.vision?.keywords?.en),
    titles: [],
    present(lang) {
      return {
        intent: "vision",
        title: content.vision.title[lang],
        body: content.vision.body[lang],
        speech: content.vision.body[lang],
        items: [{ key: "topic:mission", title: content.mission.title[lang], subtitle: content.mission.body[lang] }],
        focus: null,
      };
    },
  });

  add({
    key: "topic:mission",
    kind: "topic",
    id: "mission",
    intent: "mission",
    phrases: phraseList(content.mission?.keywords?.ar, content.mission?.keywords?.en),
    titles: [],
    present(lang) {
      return {
        intent: "mission",
        title: content.mission.title[lang],
        body: content.mission.body[lang],
        speech: content.mission.body[lang],
        items: [{ key: "topic:vision", title: content.vision.title[lang], subtitle: content.vision.body[lang] }],
        focus: null,
      };
    },
  });

  add({
    key: "topic:services",
    kind: "topic",
    id: "services",
    intent: "services",
    phrases: ["الخدمات", "خدمات الجامعة", "ما خدمات الجامعة", "services", "what services do you offer", "your services"],
    titles: [],
    present(lang) {
      const cards = content.services.map((service) => ({
        key: `service:${service.id}`,
        title: service.title[lang],
        subtitle: service.body[lang],
      }));
      const intro = lang === "ar" ? "هذه خدمات الجامعة:" : "These are the university services:";
      return {
        intent: "services",
        title: lang === "ar" ? "خدمات الجامعة" : "University services",
        body: "",
        speech: `${intro} ${join(lang, cards.map((card) => card.title))}.`,
        items: cards,
        focus: null,
      };
    },
  });

  for (const service of content.services || []) {
    add({
      key: `service:${service.id}`,
      kind: "service",
      id: service.id,
      intent: "service",
      phrases: phraseList([service.title.ar, service.title.en], service.aliases?.ar, service.aliases?.en, service.keywords?.ar, service.keywords?.en),
      titles: [service.title.ar, service.title.en],
      present(lang) {
        return {
          intent: "service",
          title: service.title[lang],
          body: service.body[lang],
          speech: `${service.title[lang]}. ${service.body[lang]}`,
          items: [],
          focus: null,
        };
      },
    });
  }

  add({
    key: "topic:colleges",
    kind: "topic",
    id: "colleges",
    intent: "colleges",
    phrases: ["الكليات", "الاقسام", "الكليات والاقسام", "ما الكليات والاقسام", "colleges", "faculties", "departments", "list the colleges"],
    titles: [],
    present(lang) {
      const cards = (content.colleges || []).map((college) => ({
        key: `college:${college.id}`,
        title: college.title[lang],
        subtitle: join(lang, (college.departments || []).map((dept) => dept.title[lang])),
      }));
      const intro = lang === "ar" ? "تضم الجامعة هذه الكليات:" : "The university includes these colleges:";
      return {
        intent: "colleges",
        title: lang === "ar" ? "الكليات والأقسام" : "Colleges and departments",
        body: "",
        speech: `${intro} ${join(lang, cards.map((card) => card.title))}.`,
        items: cards,
        focus: null,
      };
    },
  });

  for (const college of content.colleges || []) {
    add({
      key: `college:${college.id}`,
      kind: "college",
      id: college.id,
      intent: "college",
      phrases: phraseList([college.title.ar, college.title.en], college.aliases?.ar, college.aliases?.en, college.keywords?.ar, college.keywords?.en),
      titles: [college.title.ar, college.title.en],
      present(lang) {
        const cards = (college.departments || []).map((dept) => ({
          key: `department:${college.id}:${dept.id}`,
          title: dept.title[lang],
          subtitle: dept.summary?.[lang] || "",
        }));
        const where = college.where?.[lang] || "";
        const summary = college.summary?.[lang] || "";
        return {
          intent: "college",
          title: college.title[lang],
          body: summary,
          speech: `${college.title[lang]}. ${summary} ${where}`,
          items: cards,
          focus: {
            kind: "college",
            id: college.id,
            parentId: "",
            mapPoint: college.mapPoint || `college-${college.id}`,
            title: college.title[lang],
            where,
          },
        };
      },
    });

    for (const dept of college.departments || []) {
      add({
        key: `department:${college.id}:${dept.id}`,
        kind: "department",
        id: dept.id,
        parentId: college.id,
        intent: "department",
        phrases: phraseList([dept.title.ar, dept.title.en], dept.aliases?.ar, dept.aliases?.en),
        titles: [dept.title.ar, dept.title.en],
        present(lang) {
          const where = college.where?.[lang] || "";
          const summary = dept.summary?.[lang] || "";
          const place = lang === "ar"
            ? `${dept.title.ar} في ${college.title.ar}`
            : `${dept.title.en} is in the ${college.title.en}`;
          return {
            intent: "department",
            title: dept.title[lang],
            body: [summary, college.title[lang]].filter(Boolean).join("\n\n"),
            speech: `${place}. ${summary} ${where}`,
            items: [],
            focus: {
              kind: "department",
              id: dept.id,
              parentId: college.id,
              mapPoint: college.mapPoint || `college-${college.id}`,
              title: dept.title[lang],
              where,
            },
          };
        },
      });
    }
  }

  add({
    key: "topic:facilities",
    kind: "topic",
    id: "facilities",
    intent: "facilities",
    phrases: ["المرافق", "مرافق الجامعة", "facilities", "campus facilities", "places"],
    titles: [],
    present(lang) {
      const cards = (content.facilities || []).map((facility) => ({
        key: `facility:${facility.id}`,
        title: facility.title[lang],
        subtitle: facility.where?.[lang] || "",
      }));
      const intro = lang === "ar" ? "أقدر أدلك على هذه المرافق:" : "I can direct you to these facilities:";
      return {
        intent: "facilities",
        title: lang === "ar" ? "المرافق الجامعية" : "University facilities",
        body: "",
        speech: `${intro} ${join(lang, cards.map((card) => card.title))}.`,
        items: cards,
        focus: null,
      };
    },
  });

  for (const facility of content.facilities || []) {
    add({
      key: `facility:${facility.id}`,
      kind: "facility",
      id: facility.id,
      intent: "facility",
      phrases: phraseList(
        [facility.title.ar, facility.title.en],
        facility.aliases?.ar,
        facility.aliases?.en,
        facility.keywords?.ar,
        facility.keywords?.en,
      ),
      titles: [facility.title.ar, facility.title.en],
      present(lang) {
        const where = facility.where?.[lang] || "";
        const summary = facility.summary?.[lang] || "";
        return {
          intent: "facility",
          title: facility.title[lang],
          body: summary,
          speech: `${facility.title[lang]}. ${where}. ${summary}`,
          items: [],
          focus: {
            kind: "facility",
            id: facility.id,
            parentId: "",
            mapPoint: facility.mapPoint || `facility-${facility.id}`,
            title: facility.title[lang],
            where,
          },
        };
      },
    });
  }

  add({
    key: "topic:hours",
    kind: "topic",
    id: "hours",
    intent: "hours",
    phrases: phraseList(content.hours?.keywords?.ar, content.hours?.keywords?.en),
    titles: [],
    present(lang) {
      const body = content.hours?.body?.[lang] || "";
      return {
        intent: "hours",
        title: lang === "ar" ? "ساعات العمل" : "Opening hours",
        body,
        speech: body,
        items: [],
        focus: null,
      };
    },
  });

  add({
    key: "topic:contact",
    kind: "topic",
    id: "contact",
    intent: "contact",
    phrases: ["التواصل", "رقم التواصل", "رقم الهاتف", "البريد", "contact", "phone number", "email"],
    titles: [],
    present(lang) {
      const phone = String(content.contact?.phone || "").trim();
      const email = String(content.contact?.email || "").trim();
      const bits = [];
      if (phone) bits.push(lang === "ar" ? `الرقم ${phone}` : `phone ${phone}`);
      if (email) bits.push(lang === "ar" ? `البريد ${email}` : `email ${email}`);
      const speech = bits.length
        ? (lang === "ar"
          ? `يمكنكم التواصل عبر ${bits.join(" و")}. وأقدر أرافقكم إلى عمادة القبول والتسجيل.`
          : `You can reach us via ${bits.join(" and ")}. I can also walk you to the admissions office.`)
        : (lang === "ar"
          ? "للتواصل، توجهوا إلى عمادة القبول والتسجيل، وأنا أقدر أرافقكم إليها."
          : "For contact, please visit the admissions office. I can walk you there.");
      return {
        intent: "contact",
        title: lang === "ar" ? "التواصل" : "Contact",
        body: speech,
        speech,
        items: [{ key: "facility:admissions", title: lang === "ar" ? "عمادة القبول والتسجيل" : "Admissions office", subtitle: "" }],
        focus: null,
      };
    },
  });

  return items;
}

function scoreItem(queryNorm, queryTokens, item) {
  let phrase = 0;
  for (const candidate of item.phrases || []) {
    phrase = Math.max(phrase, keywordScore(queryNorm, queryTokens, candidate));
  }
  let named = 0;
  for (const title of item.titles || []) named = Math.max(named, titleScore(queryTokens, title));
  return Math.max(phrase, named);
}

const KIND_RANK = { department: 5, college: 4, facility: 3, service: 2, topic: 1 };

function presentItem(item, lang) {
  return { ...item.present(lang), key: item.key };
}

function best(items, queryNorm, queryTokens, kinds) {
  let winner = null;
  let winnerScore = 0;
  for (const item of items) {
    if (kinds && !kinds.has(item.kind)) continue;
    const score = scoreItem(queryNorm, queryTokens, item);
    if (score < 40) continue;
    const rank = KIND_RANK[item.kind] || 0;
    if (!winner || score > winnerScore || (score === winnerScore && rank > (KIND_RANK[winner.kind] || 0))) {
      winner = item;
      winnerScore = score;
    }
  }
  return { item: winner, score: winnerScore };
}

function languageRequest(text) {
  let normalized = normalize(text)
    .replace(/\b(please|speak|talk|in|to|switch|language)\b/g, " ")
    .replace(/(من فضلك|تكلم|تحدث|حول الى|حول إلي)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (["english", "انجليزي", "انجليزيه", "بالانجليزي"].includes(normalized)) return "en";
  if (["arabic", "عربي", "عربيه", "بالعربي", "العربيه"].includes(normalized)) return "ar";
  return null;
}

function fallback(content, lang) {
  const speech = lang === "ar"
    ? "أستطيع تعريفك بالجامعة ورؤيتها وخدماتها، أو بالكليات والأقسام والمرافق. ماذا تحب أن تعرف؟"
    : "I can introduce the university, its vision and services, or its colleges, departments, and facilities. What would you like to know?";
  return withSpeech(content, lang, {
    intent: "fallback",
    title: lang === "ar" ? "كيف أساعدك؟" : "How can I help?",
    body: speech,
    speech,
    items: [],
    focus: null,
  });
}

export function showTopic(content, key, lang, options = {}) {
  const item = indexContent(content).find((entry) => entry.key === key);
  if (!item) return fallback(content, lang);
  const presented = presentItem(item, lang);
  if (options.guide && presented.focus) {
    presented.intent = "guide";
    presented.speech = `${guideSpeech(lang, presented.focus, Boolean(options.canNavigate))} ${presented.body}`.trim();
  }
  return withSpeech(content, lang, presented);
}

export function detectLanguage(text, fallbackLang = "ar") {
  const arabic = (String(text || "").match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (String(text || "").match(/[A-Za-z]/g) || []).length;
  if (arabic === 0 && latin === 0) return fallbackLang;
  if (arabic > 0 && latin === 0) return "ar";
  if (latin > 0 && arabic === 0) return "en";
  return arabic >= latin ? "ar" : "en";
}

export function answer({ content, text, lang, canNavigate = false, audience = "visitor" }) {
  const spoken = String(text || "").trim();
  const resolved = detectLanguage(spoken, lang || "ar");
  if (!spoken) return fallback(content, resolved);

  const requested = languageRequest(spoken);
  if (requested) {
    const speech = requested === "ar" ? "حاضر، سأتحدث بالعربية." : "Sure, I will speak English.";
    return withSpeech(content, requested, {
      intent: "language",
      title: requested === "ar" ? "العربية" : "English",
      body: speech,
      speech,
      items: [],
      focus: null,
    });
  }

  const queryNorm = normalize(spoken);
  const queryTokens = tokens(spoken);
  const items = indexContent(content);
  const guideHit = GUIDE_PHRASES.some((phrase) => keywordScore(queryNorm, queryTokens, phrase) > 0);
  const place = best(items, queryNorm, queryTokens, new Set(["department", "college", "facility"]));

  if (guideHit && place.item) {
    const presented = presentItem(place.item, resolved);
    presented.intent = "guide";
    presented.speech = guideSpeech(resolved, presented.focus, canNavigate);
    return withSpeech(content, resolved, presented);
  }

  if (guideHit && !place.item) {
    const choices = showTopic(content, "topic:facilities", resolved);
    const speech = resolved === "ar"
      ? "إلى أين تحب أن أرافقك؟"
      : "Where would you like me to take you?";
    return withSpeech(content, resolved, {
      intent: "clarify",
      title: resolved === "ar" ? "اختر الجهة" : "Choose a destination",
      body: speech,
      speech,
      items: choices.items,
      focus: null,
    });
  }

  const winner = best(items, queryNorm, queryTokens);
  if (winner.item) return withSpeech(content, resolved, presentItem(winner.item, resolved));

  if (keywordScore(queryNorm, queryTokens, "مع السلامه") || ["bye", "goodbye"].some((word) => queryTokens.includes(word))) {
    return farewell({ content, audience, lang: resolved });
  }
  if (["مرحبا", "اهلا", "السلام عليكم", "hello", "hi", "hey"].some((word) => keywordScore(queryNorm, queryTokens, word) > 0)) {
    return greeting({ content, audience, lang: resolved });
  }
  if (["شكرا", "شكرا لك", "thanks", "thank you"].some((word) => keywordScore(queryNorm, queryTokens, word) > 0)) {
    const speech = resolved === "ar"
      ? "على الرحب والسعة. أقدر أساعدك في شيء آخر؟"
      : "You are welcome. Can I help with anything else?";
    return withSpeech(content, resolved, {
      intent: "thanks",
      title: resolved === "ar" ? "على الرحب والسعة" : "You are welcome",
      body: speech,
      speech,
      items: [],
      focus: null,
    });
  }

  return fallback(content, resolved);
}

function periodGreeting(lang, now) {
  const hour = now.getHours();
  if (lang === "ar") {
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "طاب يومكم";
    return "مساء الخير";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function greeting({ content, audience = "visitor", lang = "ar", now = new Date() }) {
  const who = audience === "student" ? "student" : "visitor";
  const line = content.welcomes?.[who]?.[lang]
    || (lang === "ar" ? "أهلاً بكم في {name}." : "Welcome to {name}.");
  const speech = `${periodGreeting(lang, now)}. ${line}`;
  return withSpeech(content, lang, {
    intent: "welcome",
    title: lang === "ar" ? "الترحيب" : "Welcome",
    body: speech,
    speech,
    items: [],
    focus: null,
    audience: who,
  });
}

export function farewell({ content, audience = "visitor", lang = "ar" }) {
  const who = audience === "student" ? "student" : "visitor";
  const speech = content.farewells?.[who]?.[lang]
    || (lang === "ar" ? "سعدنا بزيارتكم." : "Thank you for visiting.");
  return withSpeech(content, lang, {
    intent: "farewell",
    title: lang === "ar" ? "إلى اللقاء" : "Goodbye",
    body: speech,
    speech,
    items: [],
    focus: null,
    audience: who,
  });
}

function bilingualText(value, path, errors) {
  if (!value || typeof value.ar !== "string" || !value.ar.trim() || typeof value.en !== "string" || !value.en.trim()) {
    errors.push(`${path} يحتاج نصاً بالعربية والإنجليزية`);
  }
}

export function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== "object") {
    return { ok: false, errors: ["ملف المحتوى غير صالح"] };
  }
  bilingualText(content.identity?.name, "اسم الجامعة", errors);
  bilingualText(content.about?.body, "التعريف بالجامعة", errors);
  bilingualText(content.vision?.body, "الرؤية", errors);
  bilingualText(content.mission?.body, "الرسالة", errors);
  for (const [key, label] of [["primary", "اللون الأساسي"], ["accent", "لون التمييز"], ["surface", "لون الخلفية"]]) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(content.theme?.[key] || "")) errors.push(`${label} يجب أن يكون لوناً بصيغة #RRGGBB`);
  }
  if (!Array.isArray(content.services) || content.services.length === 0) errors.push("أضف خدمة واحدة على الأقل");
  if (!Array.isArray(content.colleges) || content.colleges.length === 0) errors.push("أضف كلية واحدة على الأقل");
  if (!Array.isArray(content.facilities) || content.facilities.length === 0) errors.push("أضف مرفقاً واحداً على الأقل");
  for (const service of content.services || []) {
    bilingualText(service.title, `خدمة ${service.id || ""}`, errors);
    bilingualText(service.body, `وصف خدمة ${service.id || ""}`, errors);
  }
  for (const college of content.colleges || []) {
    bilingualText(college.title, `كلية ${college.id || ""}`, errors);
    bilingualText(college.summary, `نبذة كلية ${college.id || ""}`, errors);
    bilingualText(college.where, `موقع كلية ${college.id || ""}`, errors);
    if (!Array.isArray(college.departments) || college.departments.length === 0) {
      errors.push(`أضف قسماً واحداً على الأقل في ${college.title?.ar || college.id}`);
    }
    for (const dept of college.departments || []) {
      bilingualText(dept.title, `قسم ${dept.id || ""}`, errors);
    }
  }
  for (const facility of content.facilities || []) {
    bilingualText(facility.title, `مرفق ${facility.id || ""}`, errors);
    bilingualText(facility.where, `موقع مرفق ${facility.id || ""}`, errors);
  }
  bilingualText(content.welcomes?.visitor, "ترحيب الزائر", errors);
  bilingualText(content.welcomes?.student, "ترحيب الطالب", errors);
  bilingualText(content.farewells?.visitor, "وداع الزائر", errors);
  bilingualText(content.farewells?.student, "وداع الطالب", errors);
  if (content.staffPin && !/^\d{4}$/.test(String(content.staffPin))) errors.push("رمز الإعداد من أربع خانات");
  return { ok: errors.length === 0, errors };
}

export function buildQaPairs(content) {
  const pairs = [];
  const seen = new Set();
  const push = (lang, question, answerText, intent, mapPoint = "") => {
    const key = `${lang}::${normalize(question)}`;
    if (!question || seen.has(key)) return;
    seen.add(key);
    pairs.push({ lang, question, answer: answerText, intent, mapPoint });
  };
  const items = indexContent(content);
  for (const lang of ["ar", "en"]) {
    for (const item of items) {
      const presented = item.present(lang);
      const filled = withSpeech(content, lang, presented);
      push(lang, filled.title, filled.speech, filled.intent, filled.focus?.mapPoint || "");
      for (const phrase of item.phrases || []) {
        const phraseLang = detectLanguage(phrase, lang);
        if (phraseLang !== lang) continue;
        push(lang, phrase, filled.speech, filled.intent, filled.focus?.mapPoint || "");
      }
    }
    push(lang, greeting({ content, audience: "visitor", lang }).title, greeting({ content, audience: "visitor", lang, now: new Date("2026-01-06T09:00:00") }).speech, "welcome");
    push(lang, greeting({ content, audience: "student", lang }).title, greeting({ content, audience: "student", lang, now: new Date("2026-01-06T09:00:00") }).speech, "welcome");
  }
  return pairs;
}
