import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { buildQaPairs, farewell, greeting } from "../src/dialogue.mjs";

const content = JSON.parse(readFileSync(new URL("../content/university.json", import.meta.url), "utf8"));
const pairs = buildQaPairs(content);
mkdirSync(new URL("../dist", import.meta.url), { recursive: true });

const csv = ["\uFEFFlanguage,intent,mapPoint,question,answer"];
for (const pair of pairs) {
  const cells = [pair.lang, pair.intent, pair.mapPoint, pair.question, pair.answer].map((value) => `"${String(value || "").replace(/"/g, '""')}"`);
  csv.push(cells.join(","));
}

const morning = new Date("2026-01-06T09:00:00");
const lines = ["# رسائل الترحيب والوداع", ""];
for (const lang of ["ar", "en"]) {
  lines.push(`## ${lang}`);
  lines.push(`- زائر / visitor: ${greeting({ content, audience: "visitor", lang, now: morning }).speech}`);
  lines.push(`- طالب / student: ${greeting({ content, audience: "student", lang, now: morning }).speech}`);
  lines.push(`- وداع زائر / visitor farewell: ${farewell({ content, audience: "visitor", lang }).speech}`);
  lines.push(`- وداع طالب / student farewell: ${farewell({ content, audience: "student", lang }).speech}`);
  lines.push("");
}

const points = [
  ...(content.colleges || []).map((college) => ({
    mapPoint: college.mapPoint,
    kind: "college",
    ar: college.title.ar,
    en: college.title.en,
    whereAr: college.where?.ar || "",
    whereEn: college.where?.en || "",
  })),
  ...(content.facilities || []).map((facility) => ({
    mapPoint: facility.mapPoint,
    kind: "facility",
    ar: facility.title.ar,
    en: facility.title.en,
    whereAr: facility.where?.ar || "",
    whereEn: facility.where?.en || "",
  })),
];

writeFileSync(new URL("../dist/knowledge-base.json", import.meta.url), JSON.stringify(pairs, null, 2));
writeFileSync(new URL("../dist/knowledge-base.csv", import.meta.url), csv.join("\n"));
writeFileSync(new URL("../dist/welcome-scripts.md", import.meta.url), lines.join("\n"));
writeFileSync(new URL("../dist/waypoints.json", import.meta.url), JSON.stringify(points, null, 2));
writeFileSync(new URL("../dist/theme.json", import.meta.url), JSON.stringify({
  identity: content.identity,
  theme: content.theme,
}, null, 2));

console.log(`Exported ${pairs.length} knowledge pairs and ${points.length} map points.`);
