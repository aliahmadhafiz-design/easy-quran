(function () {
  function initDashboardPage() {
    // 1. Set global structural default options if blank
    if (!window.activeTab) window.activeTab = "surah";
    if (!window.currentLayout) window.currentLayout = "grid";

    // 2. Setup dynamic click handlers for the main Tabs Index toggles
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      // Synchronize component look instantly on bootstrap load matching state
      if (btn.dataset.tab === window.activeTab) {
        btn.className =
          "tab-btn smooth-transition px-5 py-2 rounded-xl text-xs font-urdu font-bold cursor-pointer bg-[#4b7c3d] text-white shadow-xs focus:outline-none";
      }

      btn.addEventListener("click", () => {
        window.activeTab = btn.dataset.tab;
        tabBtns.forEach((b) => {
          b.className =
            b.dataset.tab === window.activeTab
              ? "tab-btn smooth-transition px-5 py-2 rounded-xl text-xs font-urdu font-bold cursor-pointer bg-[#4b7c3d] text-white shadow-xs focus:outline-none"
              : "tab-btn smooth-transition px-5 py-2 rounded-xl text-xs font-urdu font-bold cursor-pointer text-[#6c757d] hover:text-[#4b7c3d] focus:outline-none";
        });
        applyDashboardState();
      });
    });

    // 3. Setup dynamic click triggers for layout controllers (Grid vs List)
    const layoutBtns = document.querySelectorAll(".layout-btn");
    layoutBtns.forEach((btn) => {
      if (btn.dataset.layout === window.currentLayout) {
        btn.className =
          "layout-btn p-2 bg-white text-[#4b7c3d] shadow-xs rounded-lg cursor-pointer transition-all focus:outline-none";
      }

      btn.addEventListener("click", () => {
        window.currentLayout = btn.dataset.layout;
        layoutBtns.forEach((b) => {
          b.className =
            b.dataset.layout === window.currentLayout
              ? "layout-btn p-2 bg-white text-[#4b7c3d] shadow-xs rounded-lg cursor-pointer transition-all focus:outline-none"
              : "layout-btn p-2 text-[#6c757d] rounded-lg cursor-pointer transition-all focus:outline-none";
        });
        applyDashboardState();
      });
    });

    // Trigger state setup on load
    applyDashboardState();
  }

  function applyDashboardState() {
    const surahPanel = document.getElementById("panel-surah");
    const paraPanel = document.getElementById("panel-para");
    if (!surahPanel || !paraPanel) return;

    const isGrid = window.currentLayout === "grid";

    // --- Tab Content Toggle Manager ---
    if (window.activeTab === "surah") {
      surahPanel.classList.remove("hidden");
      paraPanel.classList.add("hidden");
    } else {
      paraPanel.classList.remove("hidden");
      surahPanel.classList.add("hidden");
    }

    // --- Dynamic Class Injection: Grid View Mode vs List Row Layout Mode ---
    const containers = [surahPanel, paraPanel];
    containers.forEach((panel) => {
      const isSurah = panel.id === "panel-surah";
      const isHidden = panel.classList.contains("hidden");

      if (isGrid) {
        panel.className = isHidden
          ? "w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 hidden"
          : "w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 block";
      } else {
        panel.className = isHidden
          ? "w-full flex flex-col gap-2.5 hidden"
          : "w-full flex flex-col gap-2.5 block";
      }

      // Read all card structures inside this panel container dynamically
      const cards = panel.querySelectorAll(".dashboard-card");
      cards.forEach((card) => {
        if (isGrid) {
          // --- Restore Beautiful Grid Styles ---
          card.className = isSurah
            ? "dashboard-card border border-gray-200 bg-white rounded-2xl p-4 flex flex-col gap-2 text-right shadow-xs hover:scale-[1.02] hover:border-[#4b7c3d]/40 transition duration-150 cursor-pointer block w-full"
            : "dashboard-card border border-gray-200 bg-white rounded-2xl p-4 flex flex-col gap-2 text-center shadow-xs hover:scale-[1.02] hover:border-[#ae8422]/50 transition duration-150 cursor-pointer block w-full";

          // Read individual elements inside cards and structure alignment back to normal
          const topWrap = card.querySelector(".card-top");
          if (topWrap)
            topWrap.className =
              "flex justify-between items-center w-full card-top";

          const titleEl = card.querySelector(".card-title");
          if (titleEl)
            titleEl.className =
              "text-xl font-bold text-gray-800 font-urdu-kasheeda card-title";

          const engWrap = card.querySelector(".card-eng");
          if (engWrap)
            engWrap.className =
              "text-[10px] font-mono text-gray-400 uppercase text-left card-eng";

          const badgeEl = card.querySelector(".card-badge");
          if (badgeEl)
            badgeEl.className =
              "text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full card-badge";

          const numEl = card.querySelector(".card-num");
          if (numEl)
            numEl.className =
              "text-3xl font-mono font-bold text-[#ae8422] card-num";

          const versesEl = card.querySelector(".card-verses");
          if (versesEl)
            versesEl.className = isSurah
              ? "text-[10px] text-[#ae8422] font-semibold card-verses"
              : "text-[10px] text-gray-400 card-verses";
        } else {
          // --- Switch layout into a beautiful row list row structure ---
          card.className = isSurah
            ? "dashboard-card border border-gray-200 bg-white rounded-xl px-5 py-3 flex items-center justify-between shadow-xs hover:border-[#4b7c3d]/40 transition duration-150 cursor-pointer w-full text-right"
            : "dashboard-card border border-gray-200 bg-white rounded-xl px-5 py-3 flex items-center justify-between shadow-xs hover:border-[#ae8422]/40 transition duration-150 cursor-pointer w-full text-right";

          // Rearrange internal sub-components layout style classes smoothly
          const topWrap = card.querySelector(".card-top");
          if (topWrap) topWrap.className = "flex items-center gap-4 card-top";

          const titleEl = card.querySelector(".card-title");
          if (titleEl)
            titleEl.className =
              "text-base font-bold text-gray-800 font-urdu card-title";

          const engWrap = card.querySelector(".card-eng");
          if (engWrap)
            engWrap.className = "text-xs font-mono text-gray-400 ml-4 card-eng";

          const badgeEl = card.querySelector(".card-badge");
          if (badgeEl)
            badgeEl.className =
              "text-xs font-mono font-bold text-gray-400 w-8 text-left card-badge";

          const numEl = card.querySelector(".card-num");
          if (numEl)
            numEl.className =
              "text-lg font-mono font-bold text-[#ae8422] w-10 text-left card-num";

          const versesEl = card.querySelector(".card-verses");
          if (versesEl)
            versesEl.className =
              "text-xs text-[#ae8422] bg-[#ae8422]/10 px-2 py-0.5 rounded-full card-verses";
        }
      });
    });
  }

  function openQuranSurah(surahNumber) {
    window.history.pushState(null, "", `#/quran?surah=${surahNumber}`);
    if (window.activateRoute)
      window.activateRoute(`#/quran?surah=${surahNumber}`);
  }

  function openQuranPara(paraNumber) {
    window.history.pushState(null, "", `#/quran?para=${paraNumber}`);
    if (window.activateRoute)
      window.activateRoute(`#/quran?para=${paraNumber}`);
  }

  window.initDashboardPage = initDashboardPage;
  window.renderDashboardCards = applyDashboardState;
  window.openQuranSurah = openQuranSurah;
  window.openQuranPara = openQuranPara;
})();
