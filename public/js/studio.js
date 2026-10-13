import { buildQaPairs, validateContent } from "/src/dialogue.mjs";
import { esc, safeLogoUrl } from "/js/html.js";

const COPY = {
  ar: {
    title: "إعداد المؤسسة",
    close: "إغلاق",
    save: "حفظ",
    identity: "الهوية البصرية",
    nameAr: "اسم الجامعة بالعربية",
    nameEn: "اسم الجامعة بالإنجليزية",
    tagAr: "السطر التعريفي بالعربية",
    tagEn: "السطر التعريفي بالإنجليزية",
    robotAr: "اسم الروبوت بالعربية",
    robotEn: "اسم الروبوت بالإنجليزية",
    logo: "الشعار",
    primary: "اللون الأساسي",
    accent: "لون التمييز",
    surface: "لون الخلفية",
    story: "التعريف والرؤية والخدمات",
    aboutAr: "التعريف بالعربية",
    aboutEn: "التعريف بالإنجليزية",
    visionAr: "الرؤية بالعربية",
    visionEn: "الرؤية بالإنجليزية",
    missionAr: "الرسالة بالعربية",
    missionEn: "الرسالة بالإنجليزية",
    hoursAr: "ساعات العمل بالعربية",
    hoursEn: "ساعات العمل بالإنجليزية",
    phone: "الهاتف",
    email: "البريد",
    services: "الخدمات",
    colleges: "الكليات والأقسام",
    facilities: "المرافق",
    welcomes: "رسائل الترحيب والوداع",
    visitorAr: "ترحيب الزائر بالعربية",
    visitorEn: "ترحيب الزائر بالإنجليزية",
    studentAr: "ترحيب الطالب بالعربية",
    studentEn: "ترحيب الطالب بالإنجليزية",
    byeVisitorAr: "وداع الزائر بالعربية",
    byeVisitorEn: "وداع الزائر بالإنجليزية",
    byeStudentAr: "وداع الطالب بالعربية",
    byeStudentEn: "وداع الطالب بالإنجليزية",
    file: "الملف والتجربة",
    sample: "إظهار شريط المحتوى التجريبي",
    simulator: "إظهار أزرار اقتراب الزائر والطالب",
    idle: "العودة للترحيب بعد ثوانٍ من التوقف",
    pin: "رمز الموظفين",
    addService: "إضافة خدمة",
    addCollege: "إضافة كلية",
    addDepartment: "إضافة قسم",
    addFacility: "إضافة مرفق",
    remove: "حذف",
    titleAr: "الاسم بالعربية",
    titleEn: "الاسم بالإنجليزية",
    bodyAr: "النص بالعربية",
    bodyEn: "النص بالإنجليزية",
    summaryAr: "النبذة بالعربية",
    summaryEn: "النبذة بالإنجليزية",
    whereAr: "الموقع بالعربية",
    whereEn: "الموقع بالإنجليزية",
    exportContent: "تصدير المحتوى",
    exportQa: "تصدير قاعدة المعرفة",
    importContent: "استيراد",
    reset: "استعادة النموذج",
    logoBig: "الشعار أكبر من المسموح. استخدم صورة أصغر من 350 كيلوبايت.",
    hint: "استخدم {name} و {robot} داخل رسائل الترحيب ليُستبدل اسم الجامعة والروبوت.",
  },
  en: {
    title: "University setup",
    close: "Close",
    save: "Save",
    identity: "Visual identity",
    nameAr: "University name in Arabic",
    nameEn: "University name in English",
    tagAr: "Tagline in Arabic",
    tagEn: "Tagline in English",
    robotAr: "Robot name in Arabic",
    robotEn: "Robot name in English",
    logo: "Logo",
    primary: "Primary color",
    accent: "Accent color",
    surface: "Background color",
    story: "Introduction, vision, and services",
    aboutAr: "Introduction in Arabic",
    aboutEn: "Introduction in English",
    visionAr: "Vision in Arabic",
    visionEn: "Vision in English",
    missionAr: "Mission in Arabic",
    missionEn: "Mission in English",
    hoursAr: "Hours in Arabic",
    hoursEn: "Hours in English",
    phone: "Phone",
    email: "Email",
    services: "Services",
    colleges: "Colleges and departments",
    facilities: "Facilities",
    welcomes: "Welcome and farewell",
    visitorAr: "Visitor welcome in Arabic",
    visitorEn: "Visitor welcome in English",
    studentAr: "Student welcome in Arabic",
    studentEn: "Student welcome in English",
    byeVisitorAr: "Visitor farewell in Arabic",
    byeVisitorEn: "Visitor farewell in English",
    byeStudentAr: "Student farewell in Arabic",
    byeStudentEn: "Student farewell in English",
    file: "File and trial",
    sample: "Show the sample-content banner",
    simulator: "Show visitor and student approach buttons",
    idle: "Return to the welcome screen after this many idle seconds",
    pin: "Staff code",
    addService: "Add service",
    addCollege: "Add college",
    addDepartment: "Add department",
    addFacility: "Add facility",
    remove: "Remove",
    titleAr: "Name in Arabic",
    titleEn: "Name in English",
    bodyAr: "Text in Arabic",
    bodyEn: "Text in English",
    summaryAr: "Summary in Arabic",
    summaryEn: "Summary in English",
    whereAr: "Location in Arabic",
    whereEn: "Location in English",
    exportContent: "Export content",
    exportQa: "Export knowledge base",
    importContent: "Import",
    reset: "Restore sample",
    logoBig: "The logo is too large. Use an image under 350 KB.",
    hint: "Use {name} and {robot} inside welcome lines. They are replaced with the university and robot names.",
  },
};

function setPath(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function mergeById(previous, items) {
  return items.map((item) => {
    const old = (previous || []).find((entry) => entry.id === item.id) || {};
    return { ...old, ...item, aliases: old.aliases || item.aliases || { ar: [], en: [] }, keywords: old.keywords || item.keywords };
  });
}

export function mountStudio(root, options) {
  const lang = options.lang === "en" ? "en" : "ar";
  const tr = COPY[lang];
  let draft = structuredClone(options.content);
  root.replaceChildren();
  const host = document.createElement("div");
  host.className = "studio-wrap";
  root.append(host);

  const field = (row, name) => row.querySelector(`[data-field="${name}"]`)?.value ?? "";

  function collect() {
    const next = structuredClone(draft);
    host.querySelectorAll("[data-path]").forEach((el) => {
      const value = el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) : el.value;
      setPath(next, el.dataset.path.split("."), value);
    });
    next.services = mergeById(draft.services, [...host.querySelectorAll('[data-kind="service"]')].map((row) => ({
      id: field(row, "id"),
      title: { ar: field(row, "title-ar"), en: field(row, "title-en") },
      body: { ar: field(row, "body-ar"), en: field(row, "body-en") },
    })));
    next.facilities = mergeById(draft.facilities, [...host.querySelectorAll('[data-kind="facility"]')].map((row) => {
      const id = field(row, "id");
      const old = (draft.facilities || []).find((item) => item.id === id) || {};
      return {
        id,
        mapPoint: field(row, "mapPoint") || old.mapPoint || id,
        title: { ar: field(row, "title-ar"), en: field(row, "title-en") },
        where: { ar: field(row, "where-ar"), en: field(row, "where-en") },
        summary: { ar: field(row, "summary-ar"), en: field(row, "summary-en") },
      };
    }));
    next.colleges = [...host.querySelectorAll('[data-kind="college"]')].map((row) => {
      const id = field(row, "id");
      const old = (draft.colleges || []).find((college) => college.id === id) || {};
      const departments = [...row.querySelectorAll('[data-kind="department"]')].map((dept) => {
        const deptId = field(dept, "id");
        const oldDept = (old.departments || []).find((item) => item.id === deptId) || {};
        return {
          ...oldDept,
          id: deptId,
          title: { ar: field(dept, "title-ar"), en: field(dept, "title-en") },
          summary: { ar: field(dept, "summary-ar"), en: field(dept, "summary-en") },
          aliases: oldDept.aliases || { ar: [], en: [] },
        };
      });
      return {
        ...old,
        id,
        mapPoint: field(row, "mapPoint") || old.mapPoint || `college-${id}`,
        title: { ar: field(row, "title-ar"), en: field(row, "title-en") },
        where: { ar: field(row, "where-ar"), en: field(row, "where-en") },
        summary: { ar: field(row, "summary-ar"), en: field(row, "summary-en") },
        departments,
        aliases: old.aliases || { ar: [], en: [] },
        keywords: old.keywords,
      };
    });
    next.behavior = next.behavior || {};
    if (!next.behavior.idleSeconds || next.behavior.idleSeconds < 15) next.behavior.idleSeconds = 90;
    return next;
  }

  function paint() {
    const logo = safeLogoUrl(draft.identity?.logoUrl);
    host.innerHTML = `
      <form id="studio-form">
        <div class="studio-bar">
          <h2>${esc(tr.title)}</h2>
          <div class="studio-actions">
            <button type="button" class="btn" data-action="close">${esc(tr.close)}</button>
            <button type="submit" class="btn gold">${esc(tr.save)}</button>
          </div>
        </div>
        <nav class="studio-nav">
          <a href="#sec-identity">${esc(tr.identity)}</a>
          <a href="#sec-story">${esc(tr.story)}</a>
          <a href="#sec-services">${esc(tr.services)}</a>
          <a href="#sec-colleges">${esc(tr.colleges)}</a>
          <a href="#sec-facilities">${esc(tr.facilities)}</a>
          <a href="#sec-welcome">${esc(tr.welcomes)}</a>
          <a href="#sec-file">${esc(tr.file)}</a>
        </nav>
        <p class="errors" id="studio-errors"></p>
        <section class="studio-section" id="sec-identity">
          <h3>${esc(tr.identity)}</h3>
          <div class="grid">
            ${scalar("identity.name.ar", tr.nameAr, draft.identity.name.ar)}
            ${scalar("identity.name.en", tr.nameEn, draft.identity.name.en)}
            ${scalar("identity.tagline.ar", tr.tagAr, draft.identity.tagline.ar)}
            ${scalar("identity.tagline.en", tr.tagEn, draft.identity.tagline.en)}
            ${scalar("identity.robotName.ar", tr.robotAr, draft.identity.robotName?.ar || "")}
            ${scalar("identity.robotName.en", tr.robotEn, draft.identity.robotName?.en || "")}
          </div>
          <div class="colors">
            ${color("theme.primary", tr.primary, draft.theme.primary)}
            ${color("theme.accent", tr.accent, draft.theme.accent)}
            ${color("theme.surface", tr.surface, draft.theme.surface)}
          </div>
          <label class="check">${esc(tr.logo)} <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <input type="hidden" data-path="identity.logoUrl" value="${esc(draft.identity.logoUrl || "")}" />
          ${logo ? `<img class="logo-img" alt="" src="${esc(logo)}" />` : ""}
        </section>
        <section class="studio-section" id="sec-story">
          <h3>${esc(tr.story)}</h3>
          <div class="grid">
            ${area("about.body.ar", tr.aboutAr, draft.about.body.ar)}
            ${area("about.body.en", tr.aboutEn, draft.about.body.en)}
            ${area("vision.body.ar", tr.visionAr, draft.vision.body.ar)}
            ${area("vision.body.en", tr.visionEn, draft.vision.body.en)}
            ${area("mission.body.ar", tr.missionAr, draft.mission.body.ar)}
            ${area("mission.body.en", tr.missionEn, draft.mission.body.en)}
            ${area("hours.body.ar", tr.hoursAr, draft.hours?.body?.ar || "")}
            ${area("hours.body.en", tr.hoursEn, draft.hours?.body?.en || "")}
            ${scalar("contact.phone", tr.phone, draft.contact?.phone || "")}
            ${scalar("contact.email", tr.email, draft.contact?.email || "")}
          </div>
        </section>
        <section class="studio-section" id="sec-services">
          <h3>${esc(tr.services)}</h3>
          ${(draft.services || []).map((service) => `
            <div class="block" data-kind="service">
              <input type="hidden" data-field="id" value="${esc(service.id)}" />
              <div class="grid">
                ${box("title-ar", tr.titleAr, service.title.ar)}
                ${box("title-en", tr.titleEn, service.title.en)}
                ${box("body-ar", tr.bodyAr, service.body.ar, true)}
                ${box("body-en", tr.bodyEn, service.body.en, true)}
              </div>
              <button type="button" class="btn" data-remove="service">${esc(tr.remove)}</button>
            </div>`).join("")}
          <button type="button" class="btn gold" data-add="service">${esc(tr.addService)}</button>
        </section>
        <section class="studio-section" id="sec-colleges">
          <h3>${esc(tr.colleges)}</h3>
          ${(draft.colleges || []).map((college) => `
            <fieldset class="block" data-kind="college">
              <input type="hidden" data-field="id" value="${esc(college.id)}" />
              <input type="hidden" data-field="mapPoint" value="${esc(college.mapPoint || "")}" />
              <div class="grid">
                ${box("title-ar", tr.titleAr, college.title.ar)}
                ${box("title-en", tr.titleEn, college.title.en)}
                ${box("where-ar", tr.whereAr, college.where?.ar || "")}
                ${box("where-en", tr.whereEn, college.where?.en || "")}
                ${box("summary-ar", tr.summaryAr, college.summary?.ar || "", true)}
                ${box("summary-en", tr.summaryEn, college.summary?.en || "", true)}
              </div>
              ${(college.departments || []).map((dept) => `
                <div class="subrow" data-kind="department">
                  <input type="hidden" data-field="id" value="${esc(dept.id)}" />
                  <div class="grid">
                    ${box("title-ar", tr.titleAr, dept.title.ar)}
                    ${box("title-en", tr.titleEn, dept.title.en)}
                    ${box("summary-ar", tr.summaryAr, dept.summary?.ar || "")}
                    ${box("summary-en", tr.summaryEn, dept.summary?.en || "")}
                  </div>
                  <button type="button" class="btn" data-remove="department">${esc(tr.remove)}</button>
                </div>`).join("")}
              <button type="button" class="btn" data-add="department">${esc(tr.addDepartment)}</button>
              <button type="button" class="btn" data-remove="college">${esc(tr.remove)}</button>
            </fieldset>`).join("")}
          <button type="button" class="btn gold" data-add="college">${esc(tr.addCollege)}</button>
        </section>
        <section class="studio-section" id="sec-facilities">
          <h3>${esc(tr.facilities)}</h3>
          ${(draft.facilities || []).map((facility) => `
            <div class="block" data-kind="facility">
              <input type="hidden" data-field="id" value="${esc(facility.id)}" />
              <input type="hidden" data-field="mapPoint" value="${esc(facility.mapPoint || "")}" />
              <div class="grid">
                ${box("title-ar", tr.titleAr, facility.title.ar)}
                ${box("title-en", tr.titleEn, facility.title.en)}
                ${box("where-ar", tr.whereAr, facility.where?.ar || "")}
                ${box("where-en", tr.whereEn, facility.where?.en || "")}
                ${box("summary-ar", tr.summaryAr, facility.summary?.ar || "", true)}
                ${box("summary-en", tr.summaryEn, facility.summary?.en || "", true)}
              </div>
              <button type="button" class="btn" data-remove="facility">${esc(tr.remove)}</button>
            </div>`).join("")}
          <button type="button" class="btn gold" data-add="facility">${esc(tr.addFacility)}</button>
        </section>
        <section class="studio-section" id="sec-welcome">
          <h3>${esc(tr.welcomes)}</h3>
          <p>${esc(tr.hint)}</p>
          <div class="grid">
            ${area("welcomes.visitor.ar", tr.visitorAr, draft.welcomes.visitor.ar)}
            ${area("welcomes.visitor.en", tr.visitorEn, draft.welcomes.visitor.en)}
            ${area("welcomes.student.ar", tr.studentAr, draft.welcomes.student.ar)}
            ${area("welcomes.student.en", tr.studentEn, draft.welcomes.student.en)}
            ${area("farewells.visitor.ar", tr.byeVisitorAr, draft.farewells.visitor.ar)}
            ${area("farewells.visitor.en", tr.byeVisitorEn, draft.farewells.visitor.en)}
            ${area("farewells.student.ar", tr.byeStudentAr, draft.farewells.student.ar)}
            ${area("farewells.student.en", tr.byeStudentEn, draft.farewells.student.en)}
          </div>
        </section>
        <section class="studio-section" id="sec-file">
          <h3>${esc(tr.file)}</h3>
          <label class="check"><input type="checkbox" data-path="sample" ${draft.sample ? "checked" : ""} /> ${esc(tr.sample)}</label>
          <label class="check"><input type="checkbox" data-path="behavior.showSimulator" ${draft.behavior?.showSimulator !== false ? "checked" : ""} /> ${esc(tr.simulator)}</label>
          <div class="grid">
            ${scalar("behavior.idleSeconds", tr.idle, draft.behavior?.idleSeconds || 90, "number")}
            ${scalar("staffPin", tr.pin, draft.staffPin || "2468")}
          </div>
          <div class="file-actions">
            <button type="button" class="btn" data-action="export">${esc(tr.exportContent)}</button>
            <button type="button" class="btn" data-action="qa">${esc(tr.exportQa)}</button>
            <button type="button" class="btn" data-action="import">${esc(tr.importContent)}</button>
            <button type="button" class="btn" data-action="reset">${esc(tr.reset)}</button>
            <input id="import-file" type="file" accept="application/json" hidden />
          </div>
        </section>
      </form>
    `;
  }

  function scalar(path, label, value, type = "text") {
    return `<label>${esc(label)}<input data-path="${esc(path)}" type="${type}" value="${esc(value)}" /></label>`;
  }
  function area(path, label, value) {
    return `<label class="wide">${esc(label)}<textarea data-path="${esc(path)}">${esc(value)}</textarea></label>`;
  }
  function color(path, label, value) {
    return `<label>${esc(label)}<input data-path="${esc(path)}" type="color" value="${esc(value)}" /></label>`;
  }
  function box(name, label, value, wide = false) {
    const control = wide
      ? `<textarea data-field="${name}">${esc(value)}</textarea>`
      : `<input data-field="${name}" value="${esc(value)}" />`;
    return `<label class="${wide ? "wide" : ""}">${esc(label)}${control}</label>`;
  }

  function showErrors(errors) {
    const el = host.querySelector("#studio-errors");
    if (el) el.textContent = errors.join("\n");
  }

  host.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = collect();
    const check = validateContent(next);
    if (!check.ok) {
      showErrors(check.errors);
      return;
    }
    options.onSave(next);
  });

  host.addEventListener("input", (event) => {
    if (!event.target.dataset.path?.startsWith("theme.")) return;
    options.onTheme?.({
      ...draft.theme,
      primary: host.querySelector('[data-path="theme.primary"]')?.value,
      accent: host.querySelector('[data-path="theme.accent"]')?.value,
      surface: host.querySelector('[data-path="theme.surface"]')?.value,
    });
  });

  host.addEventListener("change", (event) => {
    if (event.target.id === "logo-file") {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 350000) {
        options.onError?.(tr.logoBig);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        draft = collect();
        draft.identity.logoUrl = String(reader.result || "");
        paint();
      };
      reader.readAsDataURL(file);
    }
    if (event.target.id === "import-file") {
      const file = event.target.files?.[0];
      if (!file) return;
      file.text().then((raw) => {
        const parsed = JSON.parse(raw);
        const check = validateContent(parsed);
        if (!check.ok) {
          showErrors(check.errors);
          return;
        }
        options.onSave(parsed);
      }).catch(() => showErrors([lang === "ar" ? "ملف JSON غير صالح" : "Invalid JSON file"]));
    }
  });

  host.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    const add = event.target.closest("[data-add]")?.dataset.add;
    const remove = event.target.closest("[data-remove]")?.dataset.remove;
    if (!action && !add && !remove) return;
    event.preventDefault();
    if (action === "close") {
      options.onClose?.();
      return;
    }
    if (action === "reset") {
      options.onReset?.();
      return;
    }
    if (action === "import") {
      host.querySelector("#import-file").click();
      return;
    }
    if (action === "export" || action === "qa") {
      const next = collect();
      const check = validateContent(next);
      if (!check.ok) {
        showErrors(check.errors);
        return;
      }
      if (action === "export") download("university.json", JSON.stringify(next, null, 2), "application/json");
      else download("knowledge-base.json", JSON.stringify(buildQaPairs(next), null, 2), "application/json");
      return;
    }
    draft = collect();
    if (add === "service") {
      draft.services.push({ id: `service-${Date.now()}`, title: { ar: "", en: "" }, body: { ar: "", en: "" } });
    }
    if (add === "facility") {
      const id = `facility-${Date.now()}`;
      draft.facilities.push({ id, mapPoint: id, title: { ar: "", en: "" }, where: { ar: "", en: "" }, summary: { ar: "", en: "" } });
    }
    if (add === "college") {
      const id = `college-${Date.now()}`;
      draft.colleges.push({
        id,
        mapPoint: id,
        title: { ar: "", en: "" },
        where: { ar: "", en: "" },
        summary: { ar: "", en: "" },
        departments: [{ id: `dept-${Date.now()}`, title: { ar: "", en: "" }, summary: { ar: "", en: "" } }],
      });
    }
    if (add === "department") {
      const collegeId = event.target.closest('[data-kind="college"]').querySelector('[data-field="id"]').value;
      const college = draft.colleges.find((item) => item.id === collegeId);
      college.departments.push({ id: `dept-${Date.now()}`, title: { ar: "", en: "" }, summary: { ar: "", en: "" } });
    }
    if (remove === "service" || remove === "facility" || remove === "college") {
      const id = event.target.closest(`[data-kind="${remove}"]`).querySelector('[data-field="id"]').value;
      const key = remove === "service" ? "services" : remove === "facility" ? "facilities" : "colleges";
      draft[key] = draft[key].filter((item) => item.id !== id);
    }
    if (remove === "department") {
      const collegeId = event.target.closest('[data-kind="college"]').querySelector('[data-field="id"]').value;
      const deptId = event.target.closest('[data-kind="department"]').querySelector('[data-field="id"]').value;
      const college = draft.colleges.find((item) => item.id === collegeId);
      college.departments = college.departments.filter((item) => item.id !== deptId);
    }
    paint();
  });

  paint();
}
