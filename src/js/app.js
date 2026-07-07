/* ============================================================
   FOA Quran — app.js  (core router & shared engine)
   ============================================================ */

// ── Routes ────────────────────────────────────────────────────
const routes = {
  "/": "src/pages/quran.html",
  "/dashboard": "src/pages/dashboard.html",
  "/quran": "src/pages/quran.html",
  "/attendance": "src/pages/attendance.html",
  "/homework": "src/pages/homework.html",
  "/planner": "src/pages/planner.html",
  "/students": "src/pages/students.html",
};

// ── Global shared state ───────────────────────────────────────
let currentLayout = "grid";
let activeTab = "surah";

// Shared Quran DB — loaded ONCE, reused by all pages
window.quranDb = null; // SQL.Database instance
window.quranSqlJs = null; // SQL constructor (initSqlJs result)
window.quranSurahList = [];
window.quranParaList = [];
window.quranRukuList = [];

// Promise guards — prevent double-init
let _sqlJsInitPromise = null;
let _dbInitPromise = null;

// Page HTML fetch cache — avoid re-fetching on every navigation
const _pageCache = new Map();

// Script load promise cache — fix race condition
const _scriptPromises = new Map();

// ── Arabic surah names (for dashboard cards) ──────────────────
const surahNamesArabic = [
  "الفاتحة",
  "البقرة",
  "آل عمران",
  "النساء",
  "المائدة",
  "الأنعام",
  "الأعراف",
  "الأنفال",
  "التوبة",
  "يونس",
  "هود",
  "يوسف",
  "الرعد",
  "إبراهيم",
  "الحجر",
  "النحل",
  "الإسراء",
  "الكهف",
  "مريم",
  "طه",
  "الأنبياء",
  "الحج",
  "المؤمنون",
  "النور",
  "الفرقان",
  "الشعراء",
  "النمل",
  "القصص",
  "العنكبوت",
  "الروم",
  "لقمان",
  "السجدة",
  "الأحزاب",
  "سبأ",
  "فاطر",
  "يس",
  "الصافات",
  "ص",
  "الزمر",
  "غافر",
  "فصلت",
  "الشورى",
  "الزخرف",
  "الدخان",
  "الجاثية",
  "الأحقاف",
  "محمد",
  "الفتح",
  "الحجرات",
  "ق",
  "الذاريات",
  "الطور",
  "النجم",
  "القمر",
  "الرحمن",
  "الواقعة",
  "الحديد",
  "المجادلة",
  "الحشر",
  "الممتحنة",
  "الصف",
  "الجمعة",
  "المنافقون",
  "التغابن",
  "الطلاق",
  "التحريم",
  "الملك",
  "القلم",
  "الحاقة",
  "المعارج",
  "نوح",
  "الجن",
  "المزمل",
  "المدثر",
  "القيامة",
  "الإنسان",
  "المرسلات",
  "النبأ",
  "النازعات",
  "عبس",
  "التكوير",
  "الانفطار",
  "المطففين",
  "الانشقاق",
  "البروج",
  "الطارق",
  "الأعلى",
  "الغاشية",
  "الفجر",
  "البلد",
  "الشمس",
  "الليل",
  "الضحى",
  "الشرح",
  "التين",
  "العلق",
  "القدر",
  "البينة",
  "الزلزلة",
  "العاديات",
  "القارعة",
  "التكاثر",
  "العصر",
  "الهمزة",
  "الفيل",
  "قريش",
  "الماعون",
  "الكوثر",
  "الكافرون",
  "النصر",
  "المسد",
  "الإخلاص",
  "الفلق",
  "الناس",
];

// ── Utilities ─────────────────────────────────────────────────

function sanitizeHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((s) => s.remove());
  const walker = doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_COMMENT,
    null,
    false,
  );
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => {
    if (/live-server|live reload/i.test(c.data)) c.remove();
  });
  return doc.body.innerHTML;
}

function getRoutePath(route) {
  const raw = (route || window.location.hash || "#/dashboard").replace(
    /^#/,
    "",
  );
  const path = raw.split("?")[0] || "/dashboard";
  return path === "/" ? "/dashboard" : path;
}

function getQueryParams() {
  const hash = window.location.hash || "";
  const qi = hash.indexOf("?");
  if (qi === -1) return {};
  return Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
}

/** Load an external script — deduplicated, race-condition-safe */
function loadScript(src, attributes = {}) {
  if (_scriptPromises.has(src)) return _scriptPromises.get(src);

  const p = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing._loaded) return resolve(existing);
      existing.addEventListener("load", () => {
        existing._loaded = true;
        resolve(existing);
      });
      existing.addEventListener("error", () =>
        reject(new Error(`Script load error: ${src}`)),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    Object.keys(attributes).forEach((k) =>
      script.setAttribute(k, attributes[k]),
    );
    script.onload = () => {
      script._loaded = true;
      resolve(script);
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });

  _scriptPromises.set(src, p);
  return p;
}

// ── Shared sql.js + DB initialisation ────────────────────────

/** Ensure sql.js WASM is loaded (only once). Returns SQL constructor. */
function ensureSqlJs() {
  if (_sqlJsInitPromise) return _sqlJsInitPromise;

  _sqlJsInitPromise = loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js",
    { "data-sqljs": "true" },
  )
    .then(() =>
      initSqlJs({
        locateFile: (f) =>
          "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/" + f,
      }),
    )
    .then((SQL) => {
      window.quranSqlJs = SQL;
      return SQL;
    });

  return _sqlJsInitPromise;
}

/** Ensure the Quran DB is loaded (only once). Returns DB instance. */
function ensureQuranDb() {
  if (_dbInitPromise) return _dbInitPromise;

  _dbInitPromise = ensureSqlJs().then(async (SQL) => {
    if (window.quranDb) return window.quranDb;

    const resp = await fetch("res/database/quran_database.db");
    if (!resp.ok) throw new Error("Cannot fetch quran_database.db");

    const buf = await resp.arrayBuffer();
    window.quranDb = new SQL.Database(new Uint8Array(buf));

    // Populate shared lists
    window.quranSurahList = quranQueryRows(
      "SELECT id, surah_number, name_arabic, name_english, total_verses FROM surah ORDER BY surah_number ASC",
    );
    window.quranParaList = quranQueryRows(
      "SELECT id, para_number, start_verse_id, end_verse_id, total_verses FROM para ORDER BY para_number ASC",
    );
    window.quranRukuList = quranQueryRows(
      "SELECT id, ruku_number, surah_id, para_id, start_verse_id, end_verse_id FROM ruku ORDER BY para_id ASC, ruku_number ASC",
    );

    return window.quranDb;
  });

  return _dbInitPromise;
}

/** Run a SELECT query against the shared Quran DB */
function quranQueryRows(sql, params = []) {
  if (!window.quranDb) return [];
  const stmt = window.quranDb.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// Expose globally so sub-modules can call it
window.quranQueryRows = quranQueryRows;
window.ensureQuranDb = ensureQuranDb;
window.ensureSqlJs = ensureSqlJs;

// ── Page loading ──────────────────────────────────────────────

async function loadPage(route) {
  const pageContainer = document.getElementById("page-content");
  const routePath = getRoutePath(route);
  const pageFile = routes[routePath] || routes["/dashboard"];

  try {
    let html;
    if (_pageCache.has(pageFile)) {
      html = _pageCache.get(pageFile);
    } else {
      const resp = await fetch(`${pageFile}?_=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      html = sanitizeHtml(await resp.text());
      _pageCache.set(pageFile, html);
    }

    pageContainer.innerHTML = html;

    // Route-specific init
    if (routePath === "/dashboard") {
      await ensurePageModule(routePath);
      await initDashboardPage();
    } else if (routePath === "/quran") {
      await ensurePageModule(routePath);
      await initQuranPage();
    } else if (routePath === "/attendance") await initAttendancePage();
    else if (routePath === "/homework") await initHomeworkPage();
    else if (routePath === "/planner") await initPlannerPage();
  } catch (err) {
    console.error("Page load failed:", err);
    if (pageContainer) {
      pageContainer.innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 font-urdu">
        صفحہ لوڈ نہیں ہو سکا: ${err.message}
      </div>`;
    }
  }
}

// ── Page modules ─────────────────────────────────────────────

async function ensurePageModule(routePath) {
  if (routePath === "/dashboard") {
    if (!window.__dashboardModuleLoaded) {
      await loadScript("src/js/dashboard.js", {
        "data-dashboard-script": "true",
      });
      window.__dashboardModuleLoaded = true;
    }
    return;
  }

  if (routePath === "/quran") {
    if (!window.__quranModuleLoaded) {
      await loadScript("src/js/quran.js", { "data-quran-script": "true" });
      window.__quranModuleLoaded = true;
    }
    return;
  }
}

// ── Corrected Page Initializations ─────────────────────────────

async function initDashboardPage() {
  if (typeof window.initDashboardPage === "function") {
    return window.initDashboardPage();
  }

  if (typeof window.renderDashboard === "function") {
    return window.renderDashboard();
  }

  console.log("Dashboard module loaded successfully.");
}

async function initQuranPage() {
  // Call the distinct functions exposed by our Quran module script
  if (
    typeof window.buildQuranSidebar === "function" &&
    typeof window.renderQuranReader === "function"
  ) {
    window.buildQuranSidebar();
    window.renderQuranReader();
    return;
  }
  throw new Error("Quran script components are not loaded properly");
}

// ── Attendance Page ───────────────────────────────────────────

async function initAttendancePage() {
  if (!window.attendanceAssetsLoaded) {
    window.attendanceAssetsLoaded = true;
    if (!document.querySelector("link[data-attendance-fa]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      l.dataset.attendanceFa = "true";
      document.head.appendChild(l);
    }
    await loadScript("src/js/attendance.js", {
      "data-attendance-script": "true",
    });
  }
  // Ensure DB ready, then init
  try {
    await ensureQuranDb();
  } catch (_) {}
  if (typeof initDatabase === "function") initDatabase();
}

// ── Homework Page ─────────────────────────────────────────────

async function initHomeworkPage() {
  if (!window.homeworkAssetsLoaded) {
    window.homeworkAssetsLoaded = true;
    try {
      if (!document.querySelector("link[data-homework-fa]")) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href =
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        l.dataset.homeworkFa = "true";
        document.head.appendChild(l);
      }
      /*My Noraml And Firs tHTML2Canvas CDN Link Wich Is Working Fine For Image Generation */
      if (!document.querySelector("script[data-homework-html2canvas]")) {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
          { "data-homework-html2canvas": "true" },
        );
      }
      await loadScript("src/js/homework.js", {
        "data-homework-script": "true",
      });
    } catch (err) {
      console.error("Homework init failed:", err);
      window.homeworkAssetsLoaded = false;
      const s = document.getElementById("engine-status");
      if (s) {
        s.className =
          "ml-auto flex items-center gap-2 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 text-xs font-bold";
        s.innerHTML =
          '<span class="w-2 h-2 rounded-full bg-rose-500"></span>Load Error';
      }
      return;
    }
  }
  try {
    await ensureQuranDb();
  } catch (_) {}
  if (typeof initLessonViewer === "function") initLessonViewer();
}

// ── Planner Page ──────────────────────────────────────────────

async function initPlannerPage() {
  if (!window.plannerAssetsLoaded) {
    window.plannerAssetsLoaded = true;
    try {
      if (!document.querySelector("link[data-planner-fa]")) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href =
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        l.dataset.plannerFa = "true";
        document.head.appendChild(l);
      }
      if (!document.querySelector("script[data-planner-html2canvas]")) {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
          { "data-planner-html2canvas": "true" },
        );
      }
      await loadScript("src/js/planner.js", { "data-planner-script": "true" });
    } catch (err) {
      console.error("Planner init failed:", err);
      window.plannerAssetsLoaded = false;
      const s = document.getElementById("engine-status");
      if (s) {
        s.className =
          "ml-auto flex items-center gap-2 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 text-xs font-bold";
        s.innerHTML =
          '<span class="w-2 h-2 rounded-full bg-rose-500"></span>Load Error';
      }
      return;
    }
  }
  try {
    await ensureQuranDb();
  } catch (_) {}
  if (typeof initPlannerSystem === "function") initPlannerSystem();
}

// ── Routing & Sidebar toggle ──────────────────────────────────

function toggleSidebar(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("hidden");
}

function activateRoute(route) {
  const norm = getRoutePath(route) || "/dashboard";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.dataset.route === norm;
    link.className = isActive
      ? "nav-link flex items-center gap-3.5 px-4 py-3 rounded-xl bg-[#4b7c3d]/10 text-[#4b7c3d] font-urdu font-bold text-sm border-r-4 border-[#4b7c3d]"
      : "nav-link flex items-center gap-3.5 px-4 py-3 rounded-xl text-[#6c757d] hover:bg-[#f8f9fa] hover:text-[#4b7c3d] text-sm font-urdu font-medium smooth-transition border-r-4 border-transparent";
  });
  loadPage(norm);
}

window.addEventListener("hashchange", () => {
  activateRoute(window.location.hash || "#/dashboard");
});

// ── App bootstrap ─────────────────────────────────────────────

function initializeApp() {
  document
    .getElementById("toggle-left-sidebar")
    ?.addEventListener("click", () => toggleSidebar("left-sidebar"));
  document
    .getElementById("toggle-right-sidebar")
    ?.addEventListener("click", () => toggleSidebar("right-sidebar"));

  // Kick off sql.js + DB preload immediately in the background
  ensureQuranDb()
    .then(() => ensurePageModule("/quran"))
    .then(() => {
      if (typeof window.buildQuranSidebar === "function") {
        window.buildQuranSidebar();
      }
    })
    .catch((err) => console.warn("DB preload failed:", err));

  let initialHash = window.location.hash;
  if (!initialHash || initialHash === "#") {
    initialHash = "#/dashboard";
    window.history.replaceState(null, "", initialHash);
  }

  activateRoute(initialHash);
}

window.initializeApp = initializeApp;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}






// ── Profile Modal System ─────────────────────────────────────

function initProfileSystem() {
  const btn = document.getElementById('open-profile-btn');
  if (btn) {
    btn.addEventListener('click', openProfileModal);
  }
}

function openProfileModal() {
  if (document.getElementById('profile-modal-overlay')) {
    document.getElementById('profile-modal-overlay').classList.remove('hidden');
    return;
  }

  // Load existing data from LocalStorage
  const profile = JSON.parse(localStorage.getItem('userProfile')) || {};

  const modalHTML = `
    <div id="profile-modal-overlay" onclick="if(event.target===this)closeProfileModal()" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-stone-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10">
          <h2 class="text-xl font-urdu font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-user-pen text-[#14f08b]"></i> پروفائل بنائیں
          </h2>
          <button onclick="closeProfileModal()" class="text-white/50 hover:text-white smooth-transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Form -->
        <form id="profile-form" class="p-6 space-y-5" dir="rtl">
          
          <div>
            <label class="block text-xs font-urdu font-semibold text-white/70 mb-2">نام</label>
            <input type="text" id="profile-name" value="${profile.name || ''}" required placeholder="اپنا نام لکھیں" class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#14f08b]/50 font-urdu text-sm placeholder-white/30 smooth-transition">
          </div>

          <div>
            <label class="block text-xs font-urdu font-semibold text-white/70 mb-2">منصب</label>
            <select id="profile-designation" required class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#14f08b]/50 font-urdu text-sm smooth-transition">
              <option value="" disabled class="bg-stone-900">منتخب کریں</option>
              <option value="مدرس" class="bg-stone-900" ${profile.designation === 'مدرس' ? 'selected' : ''}>مدرس</option>
              <option value="ذمہ دار" class="bg-stone-900" ${profile.designation === 'ذمہ دار' ? 'selected' : ''}>ذمہ دار</option>
              <option value="منتظم" class="bg-stone-900" ${profile.designation === 'منتظم' ? 'selected' : ''}>منتظم</option>
            </select>
          </div>

          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-xs font-urdu font-semibold text-white/70 mb-2">عمر</label>
              <input type="number" id="profile-age" value="${profile.age || ''}" required placeholder="مثلاً 25" class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#14f08b]/50 font-urdu text-sm placeholder-white/30 smooth-transition">
            </div>
            <div class="flex-1">
              <label class="block text-xs font-urdu font-semibold text-white/70 mb-2">شہر</label>
              <input type="text" id="profile-city" value="${profile.city || ''}" required placeholder="شہر کا نام" class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#14f08b]/50 font-urdu text-sm placeholder-white/30 smooth-transition">
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-2" dir="ltr">
            <button type="submit" class="flex-1 bg-[#14f08b] hover:bg-[#10d47a] text-stone-900 font-urdu font-bold py-3 rounded-xl shadow-lg smooth-transition cursor-pointer">Save Profile</button>
            <button type="button" onclick="closeProfileModal()" class="flex-1 bg-white/10 hover:bg-white/20 text-white font-urdu font-bold py-3 rounded-xl smooth-transition cursor-pointer">Cancel</button>
          </div>

        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal-overlay');
  if (modal) modal.classList.add('hidden');
}

function saveProfile(e) {
  e.preventDefault();
  
  const profileData = {
    name: document.getElementById('profile-name').value.trim(),
    designation: document.getElementById('profile-designation').value,
    age: document.getElementById('profile-age').value.trim(),
    city: document.getElementById('profile-city').value.trim()
  };

  // Save to Local Storage
  localStorage.setItem('userProfile', JSON.stringify(profileData));
  
  // Visual feedback on button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
  submitBtn.classList.remove('bg-[#14f08b]');
  submitBtn.classList.add('bg-emerald-600', 'text-white');
  
  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.classList.add('bg-[#14f08b]');
    submitBtn.classList.remove('bg-emerald-600', 'text-white');
    closeProfileModal();
  }, 1000);
}

// Initialize the profile button listener
document.addEventListener('DOMContentLoaded', initProfileSystem);




// ── Global Quran Search System ─────────────────────────────────

(function() {
  const searchInput = document.getElementById('global-search-input');
  const resultsDropdown = document.getElementById('search-results-dropdown');
  if (!searchInput || !resultsDropdown) return;

  let searchTimeout;
  let searchIndexCache = null; // Caches the database to make searching instant

  // Remove Arabic Tashkeel/Diacritics for accurate matching
  function stripTashkeel(text) {
    return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
  }

  // Debounce to prevent lag on fast typing
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length < 2) {
      resultsDropdown.classList.add('hidden');
      resultsDropdown.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(() => performSearch(query), 200); // Made it slightly faster
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.classList.add('hidden');
    }
  });

  async function performSearch(query) {
    if (!window.quranDb || !window.quranQueryRows) {
      resultsDropdown.innerHTML = '<div class="p-4 text-center text-xs text-gray-500 font-urdu">ڈیٹابیس لوڈ نہیں ہوئی۔</div>';
      resultsDropdown.classList.remove('hidden');
      return;
    }

    resultsDropdown.innerHTML = '<div class="p-4 text-center text-xs text-gray-400 font-urdu"><i class="fa-solid fa-spinner fa-spin mr-2"></i>تلاش جاری ہے...</div>';
    resultsDropdown.classList.remove('hidden');

    // Build cache ONLY once for ultimate speed and accurate Urdu matching
    if (!searchIndexCache) {
      searchIndexCache = window.quranQueryRows(`
        SELECT v.id, v.verse_number, v.verse_text, s.surah_number, s.name_arabic 
        FROM verse v 
        JOIN surah s ON v.surah_id = s.id
      `).map(v => ({
        ...v,
        // Pre-strip tashkeel so we don't do it 6000 times on every keystroke
        clean_text: stripTashkeel(v.verse_text) 
      }));
    }

    const strippedQuery = stripTashkeel(query);

    // Search purely from the clean, tashkeel-free cache
    const results = searchIndexCache
      .filter(v => v.clean_text.includes(strippedQuery))
      .slice(0, 20); // Limit to 20 results

    if (results.length === 0) {
      resultsDropdown.innerHTML = '<div class="p-4 text-center text-xs text-gray-500 font-urdu">کوئی نتیجہ نہیں ملا۔</div>';
      return;
    }

    let html = '';
    results.forEach(verse => {
      // Extract a small snippet around the matched word from ORIGINAL text (to show beauty)
      let snippet = verse.verse_text;
      if (snippet.length > 100) {
        const matchIndex = verse.clean_text.indexOf(strippedQuery);
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(snippet.length, matchIndex + strippedQuery.length + 40);
        snippet = (start > 0 ? '... ' : '') + snippet.substring(start, end) + (end < snippet.length ? ' ...' : '');
      }

      html += `
        <button onclick="window.handleGlobalSearchClick(${verse.surah_number}, ${verse.id})" 
                class="w-full text-right p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-start gap-3 cursor-pointer group">
          
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:bg-emerald-100 transition-colors">
            ${verse.verse_number}
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="text-[11px] text-gray-400 font-urdu mb-1 flex items-center gap-2">
              <span class="font-bold text-gray-600">سورۃ ${verse.name_arabic}</span>
              <span class="text-gray-300">•</span>
              <span>آیت نمبر ${verse.verse_number}</span>
            </div>
            <div class="text-xs text-gray-700 font-urdu leading-relaxed truncate" style="font-family: 'QuranLocalFont', 'Amiri', serif;">
              ${snippet}
            </div>
          </div>

        </button>
      `;
    });

    resultsDropdown.innerHTML = html;
  }

  // Global function to handle navigation
  window.handleGlobalSearchClick = function(surahNumber, verseId) {
    // Clear search state
    searchInput.value = '';
    resultsDropdown.classList.add('hidden');
    resultsDropdown.innerHTML = '';
    
    // Remove focus from input
    searchInput.blur();

    // Navigate to Quran Page
    const targetHash = `#/quran?surah=${surahNumber}&ayah=${verseId}`;
    
    if (window.location.hash.startsWith('#/quran')) {
      // If already on Quran page, render directly to avoid reload flash
      if (window.renderQuranReader) window.renderQuranReader(surahNumber, null);
      window.history.replaceState(null, "", targetHash);
      
      // Smooth scroll to the ayah after a tiny delay to let DOM render
      setTimeout(() => {
        const anchorId = "verse-anchor-" + verseId;
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);

    } else {
      // If on another page, change hash (SPA Router will handle the rest)
      window.location.hash = targetHash;
    }
  };

})();


