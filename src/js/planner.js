/* ============================================================
   planner.js — reuses shared Quran DB from app.js
   ============================================================ */

let academyPlansJson = null;

// Custom Quranic page line validation map
function getLinesOnPage(pageNumber) {
  return (pageNumber === 1 || pageNumber === 2) ? 8 : 16;
}

async function initPlannerSystem() {
  const statusEl = document.getElementById('engine-status');
  try { 
    // 1. Fetch JSON plan rules
    const jsonResponse = await fetch('res/database/academic_plans.json');
    if (!jsonResponse.ok) throw new Error('Could not find academic_plans.json');
    academyPlansJson = await jsonResponse.json();

    // 2. Reuse the already-loaded shared DB from app.js
    await window.ensureQuranDb();

    if (statusEl) {
      statusEl.className = 'ml-auto flex items-center gap-2 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-bold';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>All Systems Sync Ready';
    }

    buildParaDropdown();
    setDefaultDate();
  } catch (err) {
    console.error('Planner init error:', err);
    if (statusEl) {
      statusEl.className = 'ml-auto flex items-center gap-2 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 text-xs font-bold';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span>Initialization Interrupted';
    }
  }
}

function buildParaDropdown() {
  const paraSelect = document.getElementById('plan-para');
  if (!paraSelect) return;
  let html = '';
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(2, '0');
    html += `<option value="${i}">Para / Juz ${pad}</option>`;
  }
  paraSelect.innerHTML = html;
}

function setDefaultDate() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const el    = document.getElementById('plan-date');
  if (el) el.value = `${yyyy}-${mm}-${dd}`;
}

function queryRows(sqlStatement, params) {
  return window.quranQueryRows(sqlStatement, params || []);
}

function getLocalizedRuku(paraId, rukuId) {
  const rows = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [paraId, rukuId]
  );
  return rows[0] ? rows[0].local_count : 1;
}

function calculateVerseLines(startData, endData) {
  const startPg = startData.start_page;
  const endPg   = endData.end_page;
  const startLn = startData.start_line;
  const endLn   = endData.end_line;

  if (startPg === endPg) return (endLn - startLn) + 1;

  let total = (getLinesOnPage(startPg) - startLn) + 1;
  for (let p = startPg + 1; p < endPg; p++) total += getLinesOnPage(p);
  total += endLn;
  return total;
}

function standardPad(num) {
  return String(num).padStart(2, '0');
}

function generatePlan() {
  const paraNum   = parseInt(document.getElementById('plan-para').value);
  const stream    = document.getElementById('plan-stream').value;
  const tier      = document.getElementById('plan-tier').value;
  const dateInput = document.getElementById('plan-date').value;

  if (!dateInput) { alert('Please pick a valid start date.'); return; }
  if (!window.quranDb) { alert('Database not loaded yet. Please wait a moment and try again.'); return; }

  const paraRules      = academyPlansJson[paraNum];
  const targetActiveDays = stream === 'nazrah'
    ? paraRules.nazrah_para_days[tier]
    : paraRules.hifz_para_days[tier];

  const paraDataRow = queryRows('SELECT id FROM para WHERE para_number = ?', [paraNum])[0];
  if (!paraDataRow) { alert('Para data missing from database.'); return; }
  const paraIdInDb = paraDataRow.id;

  const allVerses = queryRows(
    'SELECT v.*, s.name_english FROM verse v JOIN surah s ON v.surah_id = s.id WHERE v.para_id = ? ORDER BY v.id ASC',
    [paraIdInDb]
  );
  if (!allVerses.length) { alert('No verse datasets found for this Para inside your database.'); return; }

  const totalParaLines = calculateVerseLines(allVerses[0], allVerses[allVerses.length - 1]);

  document.getElementById('banner-subtitle').textContent =
    stream + ' Track — Status: ' + tier + ' (Strict Plan: ' + targetActiveDays + ' Active Days)';
  document.getElementById('banner-timestamp').textContent =
    'Generated: ' + new Date().toLocaleDateString();

  let currentDate = new Date(dateInput);
  let verseIndex  = 0;
  let htmlRows    = '';

  for (let dayCounter = 1; dayCounter <= targetActiveDays; dayCounter++) {
    // Skip Sundays
    while (currentDate.getDay() === 0) {
      htmlRows += '<tr class="bg-amber-50/70 font-semibold text-amber-800 text-xs">';
      htmlRows += '<td class="p-3 text-slate-400">—</td>';
      htmlRows += '<td class="p-3">' + formatDateString(currentDate) + '</td>';
      htmlRows += '<td class="p-3 text-center uppercase tracking-wider col-span-2" colspan="2"><i class="fa-solid fa-sun-plant-wilt mr-1.5"></i>Academy Closed — Sunday Holiday</td>';
      htmlRows += '<td class="p-3 text-center text-slate-400">00</td>';
      htmlRows += '</tr>';
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let dayStartVerse  = allVerses[verseIndex];
    let dayEndVerse    = dayStartVerse;
    let targetCumLines = Math.round((dayCounter * totalParaLines) / targetActiveDays);

    while (verseIndex < allVerses.length) {
      const tempEnd    = allVerses[verseIndex];
      const cumLines   = calculateVerseLines(allVerses[0], tempEnd);
      dayEndVerse      = tempEnd;
      verseIndex++;

      if (cumLines >= targetCumLines) break;

      if (dayCounter < targetActiveDays) {
        const nextTarget = Math.round(((dayCounter + 1) * totalParaLines) / targetActiveDays);
        if (verseIndex < allVerses.length) {
          if (calculateVerseLines(allVerses[0], allVerses[verseIndex]) > nextTarget) break;
        }
      }
    }

    if (dayCounter === targetActiveDays && verseIndex < allVerses.length) {
      dayEndVerse = allVerses[allVerses.length - 1];
      verseIndex  = allVerses.length;
    }

    const linesToday    = calculateVerseLines(dayStartVerse, dayEndVerse);
    const startSurah    = dayStartVerse.name_english;
    const endSurah      = dayEndVerse.name_english;
    const startRukuLoc  = getLocalizedRuku(paraIdInDb, dayStartVerse.ruku_id);
    const endRukuLoc    = getLocalizedRuku(paraIdInDb, dayEndVerse.ruku_id);

    const startStr = startSurah + ' [Ayah: ' + standardPad(dayStartVerse.verse_number) + ' | Ruku: ' + standardPad(startRukuLoc) + ']';
    const endStr   = endSurah   + ' [Ayah: ' + standardPad(dayEndVerse.verse_number)   + ' | Ruku: ' + standardPad(endRukuLoc)   + ']';

    htmlRows += '<tr class="hover:bg-[#f8fafc] transition-colors">';
    htmlRows += '<td class="p-3 font-bold text-[#19232a]">Day ' + standardPad(dayCounter) + '</td>';
    htmlRows += '<td class="p-3 font-semibold text-[#4b7c3d]">' + formatDateString(currentDate) + '</td>';
    htmlRows += '<td class="p-3 text-[#0f6f93] text-xs font-mono font-bold">' + startStr + '</td>';
    htmlRows += '<td class="p-3 text-[#45773d] text-xs font-mono font-bold">' + endStr + '</td>';
    htmlRows += '<td class="p-3 text-center font-bold text-[#19232a]"><span class="px-2.5 py-1 bg-[#f8fafc] rounded-md border border-[#e2e8f0]">' + standardPad(linesToday) + '</span></td>';
    htmlRows += '</tr>';

    currentDate.setDate(currentDate.getDate() + 1);
  }

  document.getElementById('planner-table-rows').innerHTML = htmlRows;
    document.getElementById('print-area-wrapper').setAttribute('dir', 'ltr');
  document.getElementById('print-area-wrapper').classList.remove('hidden');
  document.getElementById('download-btn').classList.remove('hidden');
  document.getElementById('print-area-wrapper').scrollIntoView({ behavior: 'smooth' });
}

function formatDateString(dateObj) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[dateObj.getDay()] + ', ' + String(dateObj.getDate()).padStart(2,'0') + '-' +
    months[dateObj.getMonth()] + '-' + dateObj.getFullYear();
}





async function downloadPlannerImage() {
  const targetElement = document.getElementById('planner-capture-target');
  const paraNum  = document.getElementById('plan-para').value;
  const stream   = document.getElementById('plan-stream').value;
  const btn      = document.getElementById('download-btn');

  if (!targetElement) {
    alert('Please generate a plan first before exporting.');
    return;
  }

  if (typeof html2canvas === 'undefined') {
    alert('Export library not loaded. Please refresh the page and try again.');
    return;
  }

  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';

  let savedStyles = [];

  try {
    await document.fonts.ready;
    try { await document.fonts.load("1em 'Jameel Noori'"); } catch (_) {}

    // 1. Safe Image Pre-processing
    const images = targetElement.querySelectorAll('img');
    for (const img of images) {
      if (!img.src.startsWith('data:')) {
        await new Promise((resolve) => {
          const tempImg = new Image();
          tempImg.crossOrigin = 'Anonymous';
          tempImg.onload = () => {
            try {
              const c = document.createElement('canvas');
              c.width = tempImg.naturalWidth;
              c.height = tempImg.naturalHeight;
              c.getContext('2d').drawImage(tempImg, 0, 0);
              img.src = c.toDataURL('image/png');
            } catch (e) {}
            resolve();
          };
          tempImg.onerror = () => resolve();
          tempImg.src = img.src;
        });
      }
    }

    // 2. Sanitize modern colors (oklab, oklch) that crash html2canvas
    const unsupportedKeywords = ['oklab', 'oklch', 'lch', 'color-mix'];
    const elementsToFix = [targetElement, ...targetElement.querySelectorAll('*')];
    
    elementsToFix.forEach(el => {
      const original = {};
      try {
        const cs = window.getComputedStyle(el);
        
        if (unsupportedKeywords.some(k => cs.color.includes(k))) {
          original.color = el.style.color;
          el.style.color = '#000000';
        }
        if (unsupportedKeywords.some(k => cs.backgroundColor.includes(k))) {
          original.backgroundColor = el.style.backgroundColor;
          el.style.backgroundColor = '#ffffff';
        }
        ['Top', 'Right', 'Bottom', 'Left'].forEach(dir => {
          const prop = `border${dir}Color`;
          if (unsupportedKeywords.some(k => cs[prop].includes(k))) {
            original[prop] = el.style[prop];
            el.style[prop] = '#d1d5db';
          }
        });
      } catch (e) {}
      if (Object.keys(original).length > 0) savedStyles.push({ el, original });
    });

    // 3. Get exact dimensions safely
    const width = targetElement.scrollWidth || targetElement.offsetWidth;
    const height = targetElement.scrollHeight || targetElement.offsetHeight;

    if (width === 0 || height === 0) {
      throw new Error("Element has 0 dimensions.");
    }

    // 4. Render
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: width,
      height: height
    });

    // 5. Use toBlob for safe download
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("Blob creation failed");
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Para_${paraNum}_${stream}_Syllabus_Plan.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');

  } catch (error) {
    console.error('Planner export failed:', error);
    alert('Unable to export the planner image. Details: ' + error.message);
  } finally {
    // 6. Restore original styles so the UI doesn't break
    savedStyles.forEach(({ el, original }) => {
      Object.keys(original).forEach(prop => {
        if (original[prop] === '') el.style.removeProperty(prop);
        else el.style[prop] = original[prop];
      });
    });

    if (btn) btn.innerHTML = originalText;
  }
}