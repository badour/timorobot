import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  answer,
  buildQaPairs,
  detectLanguage,
  farewell,
  greeting,
  normalize,
  showTopic,
  validateContent,
} from "./dialogue.mjs";

const content = JSON.parse(readFileSync(new URL("../content/university.json", import.meta.url), "utf8"));

test("normalizes Arabic letters and diacritics", () => {
  assert.equal(normalize("أَهْلاً بالجامعة"), "اهلا بالجامعه");
  assert.equal(normalize("المكتبة"), "المكتبه");
});

test("the sample university content is valid", () => {
  const result = validateContent(content);
  assert.equal(result.ok, true, result.errors.join(" | "));
});

test("rejects a university profile without a name", () => {
  const broken = structuredClone(content);
  broken.identity.name.ar = "";
  const result = validateContent(broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("introduces the university in Arabic", () => {
  const result = answer({ content, text: "عرفني عن الجامعة", lang: "ar" });
  assert.equal(result.intent, "about");
  assert.equal(result.lang, "ar");
  assert.match(result.speech, /جامعة المعرفة/);
  assert.match(result.speech, /تيمو/);
});

test("answers the vision in English", () => {
  const result = answer({ content, text: "What is the vision", lang: "ar" });
  assert.equal(result.intent, "vision");
  assert.equal(result.lang, "en");
  assert.match(result.speech, /learning/i);
});

test("lists services", () => {
  const result = answer({ content, text: "ما خدمات الجامعة", lang: "ar" });
  assert.equal(result.intent, "services");
  assert.ok(result.items.some((item) => item.key === "service:admission"));
});

test("lists colleges and opens engineering", () => {
  const list = answer({ content, text: "ما الكليات والأقسام", lang: "ar" });
  assert.equal(list.intent, "colleges");
  assert.ok(list.items.length >= 5);
  const college = answer({ content, text: "كلميني عن كلية الهندسة", lang: "ar" });
  assert.equal(college.intent, "college");
  assert.equal(college.focus.id, "engineering");
  assert.equal(college.focus.mapPoint, "college-engineering");
});

test("finds the computer department and the college of medicine", () => {
  const department = answer({ content, text: "قسم الحاسب", lang: "ar" });
  assert.equal(department.intent, "department");
  assert.equal(department.focus.id, "computer");
  assert.equal(department.focus.parentId, "engineering");
  const college = answer({ content, text: "كلية الطب", lang: "ar" });
  assert.equal(college.intent, "college");
  assert.equal(college.focus.id, "medicine");
});

test("guides to the library and the clinic", () => {
  const library = answer({ content, text: "وين المكتبة", lang: "ar", canNavigate: true });
  assert.equal(library.intent, "guide");
  assert.equal(library.focus.id, "library");
  assert.equal(library.focus.mapPoint, "facility-library");
  assert.match(library.speech, /سأرافقك/);
  assert.match(library.speech, /المبنى الأوسط/);

  const clinic = answer({ content, text: "where is the clinic", lang: "ar", canNavigate: false });
  assert.equal(clinic.intent, "guide");
  assert.equal(clinic.lang, "en");
  assert.equal(clinic.focus.id, "clinic");
  assert.match(clinic.speech, /east gate/i);
  assert.doesNotMatch(clinic.speech, /come with me/i);
});

test("guides a department to its college point", () => {
  const result = answer({ content, text: "وين قسم الحاسب", lang: "ar", canNavigate: true });
  assert.equal(result.intent, "guide");
  assert.equal(result.focus.id, "computer");
  assert.equal(result.focus.mapPoint, "college-engineering");
});

test("treats the campus question as the main gate", () => {
  const result = answer({ content, text: "اين الجامعة", lang: "ar", canNavigate: true });
  assert.equal(result.intent, "guide");
  assert.equal(result.focus.id, "main-gate");
});

test("asks for a destination when the guest only asks to be guided", () => {
  const result = answer({ content, text: "دلني", lang: "ar" });
  assert.equal(result.intent, "clarify");
  assert.ok(result.items.some((item) => item.key === "facility:library"));
});

test("switches language without hijacking the English department", () => {
  assert.equal(answer({ content, text: "english please", lang: "ar" }).intent, "language");
  assert.equal(answer({ content, text: "بالعربي", lang: "en" }).lang, "ar");
  const department = answer({ content, text: "قسم اللغة الإنجليزية", lang: "en" });
  assert.equal(department.intent, "department");
  assert.equal(department.focus.id, "english");
  assert.equal(department.lang, "ar");
});

test("welcomes visitors and students and says farewell", () => {
  const morning = new Date("2026-10-13T08:30:00");
  const evening = new Date("2026-10-13T20:00:00");
  const visitor = greeting({ content, audience: "visitor", lang: "ar", now: morning });
  assert.equal(visitor.intent, "welcome");
  assert.match(visitor.speech, /^صباح الخير/);
  assert.match(visitor.speech, /جامعة المعرفة/);
  const student = greeting({ content, audience: "student", lang: "en", now: evening });
  assert.match(student.speech, /^Good evening/);
  assert.match(student.speech, /Welcome back/);
  assert.match(farewell({ content, audience: "visitor", lang: "ar" }).speech, /زيارتكم/);
  assert.match(farewell({ content, audience: "student", lang: "en" }).speech, /Timo/);
  assert.match(answer({ content, text: "مع السلامة", lang: "ar" }).speech, /زيارتكم/);
  assert.equal(answer({ content, text: "hello", lang: "en" }).intent, "welcome");
  assert.equal(answer({ content, text: "شكراً", lang: "ar" }).intent, "thanks");
});

test("falls back when the question is outside the university", () => {
  const result = answer({ content, text: "asdf qwer", lang: "ar" });
  assert.equal(result.intent, "fallback");
  assert.ok(result.suggestions.length >= 3);
});

test("detects language and builds a bilingual knowledge export", () => {
  assert.equal(detectLanguage("وين المكتبة", "en"), "ar");
  assert.equal(detectLanguage("Where is the library", "ar"), "en");
  const pairs = buildQaPairs(content);
  assert.ok(pairs.some((pair) => pair.lang === "ar" && pair.intent === "about"));
  assert.ok(pairs.some((pair) => pair.lang === "en" && pair.mapPoint === "facility-library"));
  const library = showTopic(content, "facility:library", "ar", { guide: true, canNavigate: true });
  assert.equal(library.intent, "guide");
  assert.match(library.speech, /المكتبة المركزية/);
});
