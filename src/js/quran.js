(function () {
  // ============================================================
  // 1. UTILITY FUNCTIONS
  // ============================================================
  let currentAudio = null;
  let currentAudioVerseData = null;

  function getQueryParams() {
    const hash = window.location.hash || "";
    const qi = hash.indexOf("?");
    if (qi === -1) return {};
    return Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
  }

  function getQuranScrollContainer() {
    return (
      document.querySelector("main") ||
      document.scrollingElement ||
      document.documentElement ||
      window
    );
  }

  function scrollToQuranAnchor(anchorId, offset = 110) {
    const tryScroll = (retriesLeft = 20) => {
      const el = document.getElementById(anchorId);
      if (!el) {
        if (retriesLeft > 0) {
          requestAnimationFrame(() => tryScroll(retriesLeft - 1));
        }
        return;
      }

      const container = getQuranScrollContainer();
      const containerRect = container?.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();

      if (
        container &&
        container !== window &&
        container !== document.documentElement
      ) {
        const targetTop = Math.max(
          0,
          container.scrollTop +
            elementRect.top -
            (containerRect?.top || 0) -
            offset,
        );
        container.scrollTo({ top: targetTop, behavior: "smooth" });
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    requestAnimationFrame(() => tryScroll());
  }

  // ============================================================
  // 2. AUDIO PLAYER
  // ============================================================
  function createAudioPlayer() {
    let playerContainer = document.getElementById("quran-audio-player");
    if (playerContainer) {
      playerContainer.style.display = "flex";
      return;
    }

    playerContainer = document.createElement("div");
    playerContainer.id = "quran-audio-player";
    playerContainer.className =
      "fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-900/95 via-emerald-800/95 to-emerald-900/95 backdrop-blur-lg shadow-2xl border-t border-emerald-600/30 z-50 transform transition-transform duration-500 translate-y-0";
    playerContainer.innerHTML = `
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center gap-3 md:gap-4">
          <button onclick="window.closeAudioPlayer()" class="text-emerald-300 hover:text-white transition-colors flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <button id="audio-play-btn" onclick="window.toggleAudioPlay()" class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shadow-lg flex-shrink-0">
            <svg id="audio-play-icon" class="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-emerald-300 text-xs font-urdu">𖤍</span>
              <span id="audio-ayah-info" class="text-white text-xs md:text-sm font-urdu truncate">آیت پڑھی جا رہی ہے</span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span id="audio-current-time" class="text-emerald-300 text-[10px] font-mono min-w-[32px]">0:00</span>
              <div class="flex-1 h-1.5 bg-emerald-700/50 rounded-full cursor-pointer relative group" onclick="window.seekAudio(event)">
                <div id="audio-progress-bar" class="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-100" style="width: 0%"></div>
              </div>
              <span id="audio-duration" class="text-emerald-300 text-[10px] font-mono min-w-[32px]">0:00</span>
            </div>
          </div>
          <div class="flex-shrink-0 hidden sm:block">
            <select id="audio-reciter-select" onchange="window.changeReciter(this.value)" class="bg-emerald-700/30 text-emerald-100 text-xs rounded-lg px-2 py-1 border border-emerald-500/30 focus:outline-none focus:border-emerald-400">
              <option value="hadar">🎙️ حدر آڈیو</option>
              <option value="tarteel">🎙️ ترتیل آڈیو</option>
            </select>
          </div>
          <div class="flex-shrink-0 hidden md:flex items-center gap-1">
            <svg class="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3z"/>
            </svg>
            <input type="range" id="audio-volume" min="0" max="1" step="0.1" value="0.8" onchange="window.changeAudioVolume(this.value)" class="w-16 h-1 bg-emerald-700/50 rounded-full appearance-none cursor-pointer">
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(playerContainer);
  }

  window.playVerseAudio = function (
    verseId,
    verseText,
    hadarUrl,
    tarteelUrl,
    forceType,
  ) {
    createAudioPlayer();

    // Cache the original verse data context
    currentAudioVerseData = {
      id: verseId,
      verse_text: verseText,
      hadar_audio_url: hadarUrl,
      tarteel_audio_url: tarteelUrl,
    };

    const infoEl = document.getElementById("audio-ayah-info");
    if (infoEl && window.quranQueryRows) {
      const verseNum = window.quranQueryRows(
        "SELECT verse_number FROM verse WHERE id = ?",
        [verseId],
      )[0];
      infoEl.textContent = `آیت ${verseNum ? verseNum.verse_number : ""}`;
    }

    const selectEl = document.getElementById("audio-reciter-select");
    if (selectEl && forceType) {
      selectEl.value = forceType;
    }

    const reciter = selectEl?.value || "hadar";
    const audioUrl = reciter === "hadar" ? hadarUrl : tarteelUrl;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    if (!audioUrl || audioUrl === "NULL") {
      alert("اس آیت کے لیے آڈیو دستیاب نہیں ہے");
      return;
    }

    currentAudio = new Audio(audioUrl);
    currentAudio.volume = parseFloat(
      document.getElementById("audio-volume")?.value || 0.8,
    );

    currentAudio.addEventListener("timeupdate", () => {
      const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
      const progressBar = document.getElementById("audio-progress-bar");
      const currentTimeEl = document.getElementById("audio-current-time");
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (currentTimeEl)
        currentTimeEl.textContent = formatTime(currentAudio.currentTime);
    });

    currentAudio.addEventListener("loadedmetadata", () => {
      const durationEl = document.getElementById("audio-duration");
      if (durationEl)
        durationEl.textContent = formatTime(currentAudio.duration);
    });

    currentAudio.addEventListener("ended", () => {
      const icon = document.getElementById("audio-play-icon");
      if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    });

    currentAudio.play();
    const icon = document.getElementById("audio-play-icon");
    if (icon) icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  };

  window.toggleAudioPlay = function () {
    if (!currentAudio) return;
    const icon = document.getElementById("audio-play-icon");
    if (currentAudio.paused) {
      currentAudio.play();
      if (icon) icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
      currentAudio.pause();
      if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
  };

  window.closeAudioPlayer = function () {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    const player = document.getElementById("quran-audio-player");
    if (player) player.style.display = "none";
  };

  window.seekAudio = function (event) {
    if (!currentAudio) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    currentAudio.currentTime = x * currentAudio.duration;
  };

  window.changeReciter = function (value) {
    if (!currentAudio || !currentAudioVerseData) return;
    const verse = currentAudioVerseData;
    const url =
      value === "hadar" ? verse.hadar_audio_url : verse.tarteel_audio_url;
    if (url && url !== "NULL") {
      const currentTime = currentAudio.currentTime;
      currentAudio.pause();
      currentAudio = new Audio(url);
      currentAudio.currentTime = currentTime;
      currentAudio.volume = parseFloat(
        document.getElementById("audio-volume")?.value || 0.8,
      );
      currentAudio.play();

      currentAudio.addEventListener("timeupdate", () => {
        const progress =
          (currentAudio.currentTime / currentAudio.duration) * 100;
        const progressBar = document.getElementById("audio-progress-bar");
        const currentTimeEl = document.getElementById("audio-current-time");
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (currentTimeEl)
          currentTimeEl.textContent = formatTime(currentAudio.currentTime);
      });
      currentAudio.addEventListener("loadedmetadata", () => {
        const durationEl = document.getElementById("audio-duration");
        if (durationEl)
          durationEl.textContent = formatTime(currentAudio.duration);
      });
    }
  };

  window.changeAudioVolume = function (value) {
    if (currentAudio) currentAudio.volume = parseFloat(value);
  };

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  

  // ============================================================
  // 3. SIDEBAR BUILDING
  // ============================================================
  function buildQuranSidebarList() {
    const surahContainer = document.getElementById(
      "sidebar-surah-list-container",
    );
    const paraContainer = document.getElementById(
      "sidebar-para-list-container",
    );
    if (!surahContainer || !paraContainer) return;

    if (!window.quranSurahList || !window.quranSurahList.length) {
      surahContainer.innerHTML =
        '<div class="text-center py-6 text-xs text-[#6c757d] font-urdu">قرآن لوڈ ہو رہا ہے...</div>';
      paraContainer.innerHTML =
        '<div class="text-center py-6 text-xs text-[#6c757d] font-urdu">قرآن لوڈ ہو رہا ہے...</div>';
      return;
    }

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
      "الملک",
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
      "الکوثر",
      "الكافرون",
      "النصر",
      "المسد",
      "الإخلاص",
      "الفلق",
      "الناس",
    ];

    surahContainer.innerHTML = window.quranSurahList
      .map((s) => {
        const arabicName =
          s.name_arabic || surahNamesArabic[s.surah_number - 1];
        return `
        <div class="border-b border-[#f1f3f5] py-1.5">
          <div class="flex items-center justify-between hover:bg-[#f8f9fa] rounded-lg px-2 py-1 smooth-transition">
            <button onclick="window.openQuranSurah(${s.surah_number})" class="flex-1 text-right text-xs font-urdu font-semibold text-[#19232a] hover:text-[#4b7c3d] smooth-transition cursor-pointer pr-1">
              ${s.surah_number}. ${arabicName}
            </button>
            <button onclick="window.toggleSidebarAyahList(${s.id}, this)" class="p-1 text-[#6c757d] hover:text-[#4b7c3d] cursor-pointer focus:outline-none">
              <svg class="w-3.5 h-3.5 transform transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          <div id="sidebar-ayahs-${s.id}" class="hidden pl-2 pr-6 py-1 bg-[#fcfdfd] rounded-lg mt-1 max-h-48 overflow-y-auto no-scrollbar space-y-1 border-r-2 border-[#4b7c3d]/25 text-right">
            <div class="text-[10px] text-gray-400 font-urdu py-1">آیات لوڈ ہو رہی ہیں...</div>
          </div>
        </div>`;
      })
      .join("");

    const paraArabicNames = [
      "",
      "",
      " ",
      " ",
      "",
      "  ",
      " ",
      " ",
      " ",
      "",
      "",
      "  ",
      " ",
      "",
      " ",
      " ",
      "",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      "",
      "  ",
      "  ",
      " ",
      "",
    ];

    paraContainer.innerHTML = window.quranParaList
      .map((p) => {
        const arabicName = paraArabicNames[p.para_number - 1] || ``;
        return `
        <div class="border-b border-[#f1f3f5] py-1.5">
          <div class="flex items-center justify-between hover:bg-[#f8f9fa] rounded-lg px-2 py-1 smooth-transition">
            <button onclick="window.openQuranPara(${p.para_number})" class="flex-1 text-right text-xs font-urdu font-semibold text-[#19232a] hover:text-[#ae8422] smooth-transition cursor-pointer pr-1">
              پارہ نمبر : ${p.para_number}  ${arabicName}
            </button>
            <button onclick="window.toggleSidebarRukuList(${p.id}, ${p.para_number}, this)" class="p-1 text-[#6c757d] hover:text-[#ae8422] cursor-pointer focus:outline-none">
              <svg class="w-3.5 h-3.5 transform transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          <div id="sidebar-rukus-${p.id}" class="hidden pl-2 pr-6 py-1 bg-[#fcfdfd] rounded-lg mt-1 max-h-48 overflow-y-auto no-scrollbar space-y-1 border-r-2 border-[#ae8422]/25 text-right">
            <div class="text-[10px] text-gray-400 font-urdu py-1">رکوع لوڈ ہو رہے ہیں...</div>
          </div>
        </div>`;
      })
      .join("");
  }

  window.toggleSidebarAyahList = function (surahId, btnEl) {
    const container = document.getElementById(`sidebar-ayahs-${surahId}`);
    const svg = btnEl.querySelector("svg");
    if (!container || !svg) return;

    const isHidden = container.classList.contains("hidden");
    if (isHidden) {
      container.classList.remove("hidden");
      svg.classList.add("rotate-180");
      if (container.dataset.loaded !== "true" && window.quranQueryRows) {
        const verses = window.quranQueryRows(
          "SELECT id, verse_number FROM verse WHERE surah_id = ? AND verse_number > 0 ORDER BY verse_number ASC",
          [surahId],
        );
        const surah = window.quranSurahList.find((s) => s.id === surahId);
        container.innerHTML = verses
          .map(
            (v) => `
          <button onclick="window.jumpToSidebarAyah(${surah.surah_number}, ${v.id})" class="block w-full text-right text-[11px] font-urdu text-[#6c757d] hover:text-[#4b7c3d] py-1 border-b border-[#f8f9fa] cursor-pointer">
            آیت ${v.verse_number}
          </button>`,
          )
          .join("");
        container.dataset.loaded = "true";
      }
    } else {
      container.classList.add("hidden");
      svg.classList.remove("rotate-180");
    }
  };

  window.toggleSidebarRukuList = function (paraId, paraNumber, btnEl) {
    const container = document.getElementById(`sidebar-rukus-${paraId}`);
    const svg = btnEl.querySelector("svg");
    if (!container || !svg) return;

    const isHidden = container.classList.contains("hidden");
    if (isHidden) {
      container.classList.remove("hidden");
      svg.classList.add("rotate-180");
      if (container.dataset.loaded !== "true") {
        const rukus = window.quranRukuList.filter((r) => r.para_id === paraId);
        container.innerHTML = rukus
          .map((r, index) => {
            const rukuNumberInPara = index + 1;
            return `
          <button onclick="window.jumpToSidebarRuku(${paraNumber}, ${r.id}, ${r.start_verse_id})" class="block w-full text-right text-[11px] font-urdu text-[#6c757d] hover:text-[#ae8422] py-1 border-b border-[#f8f9fa] cursor-pointer">
            رکوع ${rukuNumberInPara}
          </button>`;
          })
          .join("");
        container.dataset.loaded = "true";
      }
    } else {
      container.classList.add("hidden");
      svg.classList.remove("rotate-180");
    }
  };

  window.jumpToSidebarAyah = function (surahNumber, verseId) {
    window.history.replaceState(null, "", `#/quran?surah=${surahNumber}`);
    window.renderQuranReader(surahNumber, null);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToQuranAnchor("verse-anchor-" + verseId, 90);
      });
    });
  };

  window.jumpToSidebarRuku = function (paraNumber, rukuId) {
    window.history.replaceState(null, "", `#/quran?para=${paraNumber}`);
    window.renderQuranReader(null, paraNumber);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToQuranAnchor("ruku-anchor-" + rukuId, 90);
      });
    });
  };

  function setupSidebarTabs() {
    const tabSurah = document.getElementById("sidebar-tab-surah");
    const tabPara = document.getElementById("sidebar-tab-para");
    const surahList = document.getElementById("sidebar-surah-list-container");
    const paraList = document.getElementById("sidebar-para-list-container");
    if (!tabSurah || !tabPara || !surahList || !paraList) return;

    tabSurah.onclick = function () {
      tabSurah.className =
        "flex-1 py-3 text-xs font-urdu font-bold text-center border-b-2 border-[#4b7c3d] text-[#4b7c3d] cursor-pointer focus:outline-none";
      tabPara.className =
        "flex-1 py-3 text-xs font-urdu font-bold text-center border-b-2 border-transparent text-[#6c757d] hover:text-[#4b7c3d] cursor-pointer focus:outline-none";
      surahList.classList.remove("hidden");
      paraList.classList.add("hidden");
    };

    tabPara.onclick = function () {
      tabPara.className =
        "flex-1 py-3 text-xs font-urdu font-bold text-center border-b-2 border-[#ae8422] text-[#ae8422] cursor-pointer focus:outline-none";
      tabSurah.className =
        "flex-1 py-3 text-xs font-urdu font-bold text-center border-b-2 border-transparent text-[#6c757d] hover:text-[#4b7c3d] cursor-pointer focus:outline-none";
      paraList.classList.remove("hidden");
      surahList.classList.add("hidden");
    };
  }

  window.buildQuranSidebar = function () {
    buildQuranSidebarList();
    setupSidebarTabs();
  };

  // ============================================================
  // 4. NAVIGATION FUNCTIONS
  // ============================================================
  window.openQuranSurah = function (surahNumber) {
    const currentRoute = window.location.hash.split("?")[0] || "#/dashboard";
    const nextHash = `#/quran?surah=${surahNumber}`;

    if (currentRoute === "#/quran") {
      renderQuranReader(surahNumber, null);
      window.history.replaceState(null, "", nextHash);
    } else {
      window.location.hash = nextHash;
      if (window.activateRoute) {
        window.activateRoute(nextHash);
      }
    }
  };

  window.openQuranPara = function (paraNumber) {
    const currentRoute = window.location.hash.split("?")[0] || "#/dashboard";
    const nextHash = `#/quran?para=${paraNumber}`;

    if (currentRoute === "#/quran") {
      renderQuranReader(null, paraNumber);
      window.history.replaceState(null, "", nextHash);
    } else {
      window.location.hash = nextHash;
      if (window.activateRoute) {
        window.activateRoute(nextHash);
      }
    }
  };

  // ============================================================
  // 5. MAIN QURAN RENDERER
  // ============================================================
  window.renderQuranReader = function (
    selectedSurahNumber,
    selectedParaNumber,
  ) {
    const reader = document.getElementById("quran-reader");
    if (!reader) return;

    if (!window.quranDb || !window.quranQueryRows) {
      reader.innerHTML =
        '<div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 font-urdu text-sm">قرآن ڈیٹا لوڈ نہیں ہو سکا۔ براہِ کرم صفحہ ریفریش کریں۔</div>';
      return;
    }

    const query = getQueryParams();
    const selectedAyahId = query.ayah ? parseInt(query.ayah, 10) : null;
    const selectedRukuId = query.ruku ? parseInt(query.ruku, 10) : null;
    const requestedSurahNumber =
      selectedSurahNumber ?? (query.surah ? parseInt(query.surah, 10) : null);
    const requestedParaNumber =
      selectedParaNumber ?? (query.para ? parseInt(query.para, 10) : null);

    let verses = [];
    let scrollTarget = null;
    let surahInfo = null;
    let paraInfo = null;
    let isParaView = false;

    if (selectedAyahId) {
      const verse = window.quranQueryRows("SELECT * FROM verse WHERE id = ?", [
        selectedAyahId,
      ])[0];
      if (verse) {
        verses = window.quranQueryRows(
          "SELECT * FROM verse WHERE surah_id = ? ORDER BY id ASC",
          [verse.surah_id],
        );
        scrollTarget = "verse-anchor-" + selectedAyahId;
        surahInfo = window.quranSurahList.find((s) => s.id === verse.surah_id);
        isParaView = false;
      }
    } else if (selectedRukuId) {
      const ruku = window.quranRukuList.find((r) => r.id === selectedRukuId);
      if (ruku) {
        verses = window.quranQueryRows(
          "SELECT * FROM verse WHERE id >= ? AND id <= ? ORDER BY id ASC",
          [ruku.start_verse_id, ruku.end_verse_id],
        );
        scrollTarget = "ruku-anchor-" + selectedRukuId;
        surahInfo = window.quranSurahList.find((s) => s.id === ruku.surah_id);
        paraInfo = window.quranParaList.find((p) => p.id === ruku.para_id);
        isParaView = true;
      }
    } else if (requestedParaNumber !== null) {
      paraInfo = window.quranParaList.find(
        (p) => p.para_number === requestedParaNumber,
      );
      if (paraInfo) {
        verses = window.quranQueryRows(
          "SELECT * FROM verse WHERE para_id = ? ORDER BY id ASC",
          [paraInfo.id],
        );
        if (verses.length) {
          scrollTarget = "para-header-" + requestedParaNumber;
          surahInfo = window.quranSurahList.find(
            (s) => s.id === verses[0].surah_id,
          );
        }
        isParaView = true;
      }
    } else if (requestedSurahNumber !== null) {
      surahInfo = window.quranSurahList.find(
        (s) => s.surah_number === requestedSurahNumber,
      );
      if (surahInfo) {
        verses = window.quranQueryRows(
          "SELECT * FROM verse WHERE surah_id = ? ORDER BY id ASC",
          [surahInfo.id],
        );
        if (verses.length)
          scrollTarget = "surah-header-" + surahInfo.surah_number;
        isParaView = false;
      }
    }

    if (!verses.length) {
      const def = window.quranSurahList[0];
      if (def) {
        verses = window.quranQueryRows(
          "SELECT * FROM verse WHERE surah_id = ? ORDER BY id ASC",
          [def.id],
        );
        if (verses.length) scrollTarget = "surah-header-" + def.surah_number;
        surahInfo = def;
        isParaView = false;
      }
    }

    if (!verses.length) {
      reader.innerHTML =
        '<div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-700 font-urdu text-sm">کوئی آیات دستیاب نہیں ہیں۔</div>';
      return;
    }

    let html = [];

    // ---- HEADER (Physical Mushaf Frame Header Effect) ----
    if (isParaView && paraInfo) {
      html.push(`
        <div id="para-header-${paraInfo.para_number}" class="quran-reader-header" style="text-align:center; background: radial-gradient(circle, #fffdf5 0%, #fef3c7 100%); border: 2px double #d97706; border-radius: 12px; padding: 1.5rem 1rem; margin-bottom: 1.5rem; box-shadow: 0 4px 15px rgba(217,119,6,0.06); position: relative; overflow: hidden; scroll-margin-top: 110px;">
          <div style="position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 1px solid rgba(217,119,6,0.15); border-radius: 8px; pointer-events: none;"></div>
          <div class="quran-reader-header-label" style="color:#b45309; font-size: 0.95rem; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">پارہ</div>
          <div class="quran-reader-header-title" style="font-size:2.8rem; color:#78350f; font-family:'Jameel Noori','Amiri',serif; margin: 0.25rem 0; text-shadow: 1px 1px 1px rgba(255,255,255,0.8);">
            پارہ نمبر ${paraInfo.para_number}
          </div>
          <div class="quran-reader-header-sub" style="color:#b45309; font-size: 0.9rem; font-weight: 500;">
             کل ${verses.filter((v) => v.verse_number > 0).length} آیات 
          </div>
        </div>
      `);
    } else if (surahInfo) {
      html.push(`
        <div id="surah-header-${surahInfo.surah_number}" class="quran-reader-header" style="text-align:center; background: radial-gradient(circle, #fffdf5 0%, #fef3c7 100%); border: 2px double #d97706; border-radius: 12px; padding: 1.5rem 1rem; margin-bottom: 1.5rem; box-shadow: 0 4px 15px rgba(217,119,6,0.06); position: relative; overflow: hidden; scroll-margin-top: 110px;">
          <div style="position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 1px solid rgba(217,119,6,0.15); border-radius: 8px; pointer-events: none;"></div>
          <div class="quran-reader-header-label" style="color:#b45309; font-size: 0.95rem; font-weight: bold;">سورۃ</div>
          <div class="quran-reader-header-title" style="font-size:3rem; color:#78350f; font-family:'Jameel Noori','Amiri',serif; margin: 0.25rem 0; text-shadow: 1px 1px 1px rgba(255,255,255,0.8);">${surahInfo.name_arabic}</div>
          <div class="quran-reader-header-sub" style="color:#b45309; font-size: 0.9rem; font-weight: 500;">
            سورۃ ${surahInfo.surah_number} <span style="color:#d97706; margin: 0 0.25rem;">•</span> ${surahInfo.total_verses} آیات
            ${surahInfo.revelation_place ? `<span style="color:#d97706; margin: 0 0.25rem;">•</span> ${surahInfo.revelation_place === "Makkah" ? "مکیہ" : "مدنیہ"}` : ""}
          </div>
        </div>
      `);
    }

    // ---- BODY Frame Top & Bottom Boundaries to match a Real Mushaf ----
    let bodyContent = `
  <div class="quran-physical-body" style="background: #fffdf9; border: 1px solid #f3ebd4; border-radius: 16px; padding: 2rem 1.5rem; box-shadow: inset 0 0 40px rgba(245,158,11,0.03), 0 4px 20px rgba(0,0,0,0.02); position: relative;">
`;

    let lastRukuId = null;
    let currentParaId = paraInfo ? paraInfo.id : null;
    const rukusInPara =
      currentParaId && window.quranRukuList
        ? window.quranRukuList.filter((r) => r.para_id === currentParaId)
        : [];
    let rukuCounterMap = {};
    rukusInPara.forEach((r, idx) => {
      rukuCounterMap[r.id] = idx + 1;
    });

    const bismillahVerses = verses.filter((v) => v.verse_number === 0);
    const regularVerses = verses.filter((v) => v.verse_number > 0);

    // ── Process Regular Verses ──
    regularVerses.forEach((verse) => {
      // ── Ruku Marker ──
      if (isParaView && lastRukuId !== verse.ruku_id && verse.ruku_id) {
        const rukuNumberInPara = rukuCounterMap[verse.ruku_id] || 1;
        bodyContent += `
      <div id="ruku-anchor-${verse.ruku_id}" style="text-align:center; margin: 0.5rem 0; padding: 0; user-select: none; scroll-margin-top: 110px; line-height: var(--quran-line-height, 5rem); background-image: linear-gradient(transparent 96%, #cbd5e1 96%); background-size: 100% var(--quran-line-height, 5rem);">
        <span style="font-family:'Jameel Noori','Amiri',serif; color: #78350f; font-size: 0.7rem; font-weight: 600; background: #fef3c7; padding: 0.1rem 0.8rem; border: 1px solid #f59e0b; border-radius: 4px; display: inline-block;">
          ✦ رکوع ${rukuNumberInPara} ✦
        </span>
      </div>
    `;
        lastRukuId = verse.ruku_id;
      }

      // ── Audio Buttons ──
      const hasHadar =
        verse.hadar_audio_url &&
        verse.hadar_audio_url !== "NULL" &&
        verse.hadar_audio_url !== null;
      const hasTarteel =
        verse.tarteel_audio_url &&
        verse.tarteel_audio_url !== "NULL" &&
        verse.tarteel_audio_url !== null;

      let audioButtons = "";
      if (hasHadar || hasTarteel) {
        audioButtons = `
      <span style="display:inline-flex; align-items:center; gap:2px; margin: 0 3px; vertical-align:middle; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1px 4px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        ${
          hasHadar
            ? `
          <button onclick="event.stopPropagation();window.playVerseAudio(${verse.id}, '${verse.verse_text.replace(/'/g, "\\'").replace(/\n/g, " ")}', '${verse.hadar_audio_url || ""}', '${verse.tarteel_audio_url || ""}', 'hadar')" 
                  style="background:none; border:none; cursor:pointer; color:#059669; padding:1px; display:inline-flex; align-items:center; transition: transform 0.2s, color 0.2s;"
                  title="ہدار ریڈنگ"
                  onmouseover="this.style.transform='scale(1.15)'; this.style.color='#047857';"
                  onmouseout="this.style.transform='scale(1)'; this.style.color='#059669';">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </button>
        `
            : ""
        }
        ${
          hasTarteel
            ? `
          <button onclick="event.stopPropagation();window.playVerseAudio(${verse.id}, '${verse.verse_text.replace(/'/g, "\\'").replace(/\n/g, " ")}', '${verse.hadar_audio_url || ""}', '${verse.tarteel_audio_url || ""}', 'tarteel')" 
                  style="background:none; border:none; cursor:pointer; color:#d97706; padding:1px; display:inline-flex; align-items:center; transition: transform 0.2s, color 0.2s;"
                  title="ترتیل ریڈنگ"
                  onmouseover="this.style.transform='scale(1.15)'; this.style.color='#b45309';"
                  onmouseout="this.style.transform='scale(1)'; this.style.color='#d97706';">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </button>
        `
            : ""
        }
      </span>
    `;
      }

      // ── Verse with Mushaf Lines ──
      bodyContent += `
    <span id="verse-anchor-${verse.id}" class="quran-verse-inline" style="display: inline; font-family: 'QuranLocalFont', 'Amiri', serif; font-size: var(--quran-font-size, 2.5rem); line-height: var(--quran-line-height, 5rem); color: #1e293b; scroll-margin-top: 110px; background-image: linear-gradient(transparent 96%, #cbd5e1 96%); background-size: 100% var(--quran-line-height, 5rem);">
      ${audioButtons}
      ${verse.verse_text}
      <span class="quran-verse-number-inline" style="display: inline-flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif !important; font-size: 0.8rem; font-weight: bold; color: #19232a; border: 1.5px solid #19232a; width: 2rem; height: 2rem; border-radius: 50%; margin: 0 0.5rem; vertical-align: middle; line-height: 1; background: #fffdf5;">
        ${verse.verse_number}
      </span>
    </span>
  `;
    });

    // ── Close Container ──
    bodyContent += `
  </div>
`;

    html.push(bodyContent);

    // ---- FOOTER ----
    html.push(`
      <div style="text-align:center; margin-top: 2.5rem; padding: 1.5rem 0; border-top: 1px double #e5e7eb;">
        <span style="font-family:'Jameel Noori','Amiri',serif; color:#4b5563; font-size:1.2rem; letter-spacing: 1px;">
            ﴿ صدق اللہ العظیم ﴾
        </span>
      </div>
    `);

    reader.innerHTML = html.join("");

    if (scrollTarget) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToQuranAnchor(scrollTarget, 90);
        });
      });
    }

    if (
      requestedSurahNumber === null &&
      requestedParaNumber === null &&
      surahInfo
    ) {
      const currentHash = window.location.hash || "";
      if (!currentHash.includes("surah=") && !currentHash.includes("para=")) {
        window.history.replaceState(
          null,
          "",
          `#/quran?surah=${surahInfo.surah_number}`,
        );
      }
    }
  };

  // ============================================================
  // 6. QURAN READER SETTINGS (Floating FAB & Bottom Toolbar)
  // ============================================================

  const QS_KEY = "quranReaderSettings";
  const QS_DEFAULTS = {
    wordSpacing: 0,
    bgColor: "#fffdf9",
    textColor: "#1e293b",
    autoScroll: false,
    scrollSpeed: 2,
  };
  let qSettings = { ...QS_DEFAULTS };
  let scrollRafId = null;

  function loadQS() {
    try {
      const s = localStorage.getItem(QS_KEY);
      if (s) qSettings = { ...QS_DEFAULTS, ...JSON.parse(s) };
    } catch (e) {}
  }
  function saveQS() {
    localStorage.setItem(QS_KEY, JSON.stringify(qSettings));
  }

  function applyQS() {
    // Apply Text Color & Spacing ONLY to Arabic Text, ignoring Ayah Numbers
    document.querySelectorAll(".quran-verse-inline").forEach((el) => {
      el.style.letterSpacing = qSettings.wordSpacing + "px";
      el.style.color = qSettings.textColor;
      el.style.transition = "all 0.3s ease";

      // Force normal spacing on English Ayah Numbers
      const numEl = el.querySelector(".quran-verse-number-inline");
      if (numEl) numEl.style.letterSpacing = "normal";

      // Force normal spacing on Audio Buttons wrapper
      const audioWrapper = el.querySelector('span[style*="inline-flex"]');
      if (audioWrapper) audioWrapper.style.letterSpacing = "normal";
    });

    // Apply Background Color to FULL CONTAINER
    const container = document.querySelector(".quran-physical-body");
    if (container) {
      container.style.backgroundColor = qSettings.bgColor;
      container.style.transition = "background-color 0.3s ease";
    }

    // Auto Scroll Control (Only start if not already running to prevent freezing)
    if (qSettings.autoScroll) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  }

  function startAutoScroll() {
    stopAutoScroll();
    const step = () => {
      const c = getQuranScrollContainer();
      const target =
        c === window || c === document.documentElement
          ? document.scrollingElement || document.documentElement
          : c;

      if (target) {
        const maxScroll = target.scrollHeight - target.clientHeight;
        if (maxScroll <= 0) {
          stopAutoScroll();
          return;
        }

        if (target.scrollTop >= maxScroll) {
          stopAutoScroll();
          return;
        }

        target.scrollTop = Math.min(
          maxScroll,
          target.scrollTop + qSettings.scrollSpeed,
        );
      }

      scrollRafId = requestAnimationFrame(step);
    };
    // Start immediately
    scrollRafId = requestAnimationFrame(step);
  }

  function stopAutoScroll() {
    if (scrollRafId) {
      cancelAnimationFrame(scrollRafId);
      scrollRafId = null;
    }
  }

  // --- Smart Dragging (Distinguishes between Click and Drag perfectly) ---
  function makeDraggable(el, onClick) {
    let isDragging = false,
      startX,
      startY,
      initialLeft,
      initialTop,
      hasMoved = false;

    const onStart = (e) => {
      isDragging = true;
      hasMoved = false;
      const pos = e.touches ? e.touches[0] : e;
      startX = pos.clientX;
      startY = pos.clientY;
      const rect = el.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const pos = e.touches ? e.touches[0] : e;
      if (
        Math.abs(pos.clientX - startX) > 5 ||
        Math.abs(pos.clientY - startY) > 5
      )
        hasMoved = true;
      if (hasMoved) {
        el.style.left = initialLeft + pos.clientX - startX + "px";
        el.style.top = initialTop + pos.clientY - startY + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
      }
    };

    const onEnd = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      if (!hasMoved) onClick();
    };

    el.addEventListener("mousedown", onStart);
    el.addEventListener("touchstart", onStart, { passive: false });
  }

  function toggleSettingsBar() {
    const bar = document.getElementById("quran-settings-bar");
    if (!bar) return;
    const isOpen = !bar.classList.contains("translate-y-full");
    bar.classList.toggle("translate-y-full", isOpen);
    bar.classList.toggle("translate-y-0", !isOpen);
  }

  function initSettingsUI() {
    loadQS();

    // 1. Create Floating Action Button (FAB)
    if (!document.getElementById("qs-fab")) {
      const fab = document.createElement("div");
      fab.id = "qs-fab";
      fab.innerHTML = `<i class="fa-solid fa-palette text-white text-lg drop-shadow-md"></i>`;
      fab.className =
        "fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-xl shadow-indigo-500/40 flex items-center justify-center z-[70] cursor-pointer hover:scale-110 active:scale-95 transition-transform border border-white/20";
      makeDraggable(fab, toggleSettingsBar);
      document.body.appendChild(fab);
    }

    // 2. Create Full Width Bottom Toolbar (Light Mode)
    if (!document.getElementById("quran-settings-bar")) {
      const bar = document.createElement("div");
      bar.id = "quran-settings-bar";
      bar.className =
        "fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[60] transform translate-y-full transition-transform duration-300 ease-out";

      bar.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap text-sm text-gray-700 font-urdu">
          
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-500 whitespace-nowrap">الفاظ کے مابین فاصلہ:</span>
            <input type="range" id="set-spacing" min="-5" max="20" value="${qSettings.wordSpacing}" class="w-20 h-1.5 accent-indigo-600 cursor-pointer">
            <span id="val-spacing" class="text-xs font-mono text-indigo-600 w-6">${qSettings.wordSpacing}</span>
          </div>

          <div class="w-px h-6 bg-gray-200 hidden sm:block"></div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-500 whitespace-nowrap">قرآن مواد:</span>
            <input type="color" id="set-text-color" value="${qSettings.textColor}" class="w-7 h-7 rounded-md border-2 border-gray-300 cursor-pointer p-0.5 bg-white">
          </div>

          <div class="w-px h-6 bg-gray-200 hidden sm:block"></div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-500 whitespace-nowrap">قرآن بیک گراؤنڈ :</span>
            <input type="color" id="set-bg-color" value="${qSettings.bgColor}" class="w-7 h-7 rounded-md border-2 border-gray-300 cursor-pointer p-0.5 bg-white">
          </div>

          <div class="w-px h-6 bg-gray-200 hidden sm:block"></div>

          <div class="flex items-center gap-2">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="set-auto-scroll" class="sr-only peer" ${qSettings.autoScroll ? "checked" : ""}>
              <div class="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <input type="range" id="set-speed" min="1" max="10" value="${qSettings.scrollSpeed}" class="w-16 h-1.5 accent-indigo-600 cursor-pointer ${qSettings.autoScroll ? "" : "opacity-30 pointer-events-none"} transition-opacity">
            <span class="text-xs font-bold text-gray-500">آٹو اسکرول</span>
          </div>

          <div class="w-px h-6 bg-gray-200 hidden sm:block"></div>

          <button onclick="window.resetQS()" class="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            <i class="fa-solid fa-rotate-left mr-1"></i>  Reset
          </button>

        </div>
      `;
      document.body.appendChild(bar);

      // --- Live Preview Listeners ---
      bar.querySelector("#set-spacing").addEventListener("input", (e) => {
        qSettings.wordSpacing = parseInt(e.target.value);
        bar.querySelector("#val-spacing").textContent = qSettings.wordSpacing;
        applyQS();
      });

      bar.querySelector("#set-text-color").addEventListener("input", (e) => {
        qSettings.textColor = e.target.value;
        applyQS();
      });

      bar.querySelector("#set-bg-color").addEventListener("input", (e) => {
        qSettings.bgColor = e.target.value;
        applyQS();
      });

      bar.querySelector("#set-auto-scroll").addEventListener("change", (e) => {
        qSettings.autoScroll = e.target.checked;
        const speedSlider = bar.querySelector("#set-speed");
        speedSlider.classList.toggle("opacity-30", !qSettings.autoScroll);
        speedSlider.classList.toggle(
          "pointer-events-none",
          !qSettings.autoScroll,
        );
        applyQS(); // Starts or stops auto scroll immediately
      });

      bar.querySelector("#set-speed").addEventListener("input", (e) => {
        qSettings.scrollSpeed = parseInt(e.target.value);
        // No need to call applyQS here, the active RAF loop will automatically pick up the new speed
      });
    }

    // Handle Page Visibility (Hide FAB when leaving Quran page)
    handleVis();
    window.addEventListener("hashchange", handleVis);

    // Observe Quran reader to apply settings automatically when Surah/Para changes
    const reader = document.getElementById("quran-reader");
    if (reader) {
      new MutationObserver(() => applyQS()).observe(reader, {
        childList: true,
        subtree: false,
      });
    }
  }

  function handleVis() {
    const fab = document.getElementById("qs-fab");
    const bar = document.getElementById("quran-settings-bar");
    if (!fab || !bar) return;

    if (window.location.hash.startsWith("#/quran")) {
      fab.style.display = "flex";
      applyQS(); // Apply instantly when returning to page
    } else {
      fab.style.display = "none";
      bar.classList.add("translate-y-full"); // Close toolbar when leaving page
      bar.classList.remove("translate-y-0");
      stopAutoScroll(); // Stop scrolling when leaving page
    }
  }

  window.resetQS = function () {
    stopAutoScroll(); // Stop scroll before resetting
    qSettings = { ...QS_DEFAULTS };
    saveQS();

    // Update UI inputs manually to reflect reset
    const bar = document.getElementById("quran-settings-bar");
    if (bar) {
      bar.querySelector("#set-spacing").value = qSettings.wordSpacing;
      bar.querySelector("#val-spacing").textContent = qSettings.wordSpacing;
      bar.querySelector("#set-text-color").value = qSettings.textColor;
      bar.querySelector("#set-bg-color").value = qSettings.bgColor;
      bar.querySelector("#set-auto-scroll").checked = qSettings.autoScroll;
      bar.querySelector("#set-speed").value = qSettings.scrollSpeed;
      bar
        .querySelector("#set-speed")
        .classList.add("opacity-30", "pointer-events-none");
    }
    applyQS();
  };

  // Save settings when clicking outside the toolbar to close it
  document.addEventListener("click", (e) => {
    const bar = document.getElementById("quran-settings-bar");
    const fab = document.getElementById("qs-fab");
    if (
      bar &&
      !bar.classList.contains("translate-y-full") &&
      !bar.contains(e.target) &&
      !fab?.contains(e.target)
    ) {
      bar.classList.add("translate-y-full");
      bar.classList.remove("translate-y-0");
      saveQS();
    }
  });

  // Initialize
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initSettingsUI);
  else initSettingsUI();
})();
