/* ============================================================
   attendance.js — reuses shared Quran DB from app.js
   ============================================================ */

let surahCache = [];

function getLinesOnPage(pageNumber) {
  return (pageNumber === 1 || pageNumber === 2) ? 8 : 16;
}

async function initDatabase() {
  const statusEl = document.getElementById('db-status');
  try {
    // Reuse the already-loaded shared DB from app.js
    await window.ensureQuranDb();

    if (statusEl) {
      statusEl.className = 'flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-lg text-emerald-200 text-xs font-semibold backdrop-blur-sm';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>Engine Ready';
    }

    loadSurahDropdowns();
  } catch (err) {
    console.error('Attendance init error:', err);
    if (statusEl) {
      statusEl.className = 'flex items-center gap-2 bg-rose-500/20 border border-rose-400/30 px-3 py-1.5 rounded-lg text-rose-200 text-xs font-semibold backdrop-blur-sm';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400"></span>Wasm Load Failed';
    }
  }
}

function queryRows(sqlStatement, params) {
  return window.quranQueryRows(sqlStatement, params || []);
}

function loadSurahDropdowns() {
  surahCache = queryRows('SELECT id, surah_number, name_arabic FROM surah ORDER BY surah_number ASC');

  const startSelect = document.getElementById('start-surah');
  const endSelect   = document.getElementById('end-surah');
  if (!startSelect || !endSelect) return;

  let htmlOptions = '<option value="" disabled selected>سورۃ منتخب فرمائیں۔۔۔</option>';
  for (let i = 0; i < surahCache.length; i++) {
    const s = surahCache[i];
    htmlOptions += `<option value="${s.id}">${s.surah_number}. ${s.name_arabic}</option>`;
  }

  startSelect.innerHTML = htmlOptions;
  endSelect.innerHTML   = htmlOptions;
  startSelect.disabled  = false;
  endSelect.disabled    = false;
}

function populateAyahs(prefix) {
  const surahId  = document.getElementById(prefix + '-surah').value;
  const ayahSel  = document.getElementById(prefix + '-ayah');
  const verses   = queryRows(
    'SELECT id, verse_number, verse_key FROM verse WHERE surah_id = ? ORDER BY id ASC',
    [surahId]
  );

  let html = '<option value="" disabled selected>آیت نمبر منتخب فرمائیں ۔۔</option>';
  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    let displayName = 'آیت نمبر :  ' + v.verse_number;
    if (v.verse_number === 0) {
      displayName = v.verse_key.indexOf(':00') !== -1 ? 'بسم اللہ والی لائن' : 'سورۃ کے نام والی لائن';
    }
    html += `<option value="${v.id}">${displayName} (${v.verse_key})</option>`;
  }

  ayahSel.innerHTML = html;
  ayahSel.disabled  = false;
}

function calculateLessonLines() {
  const startVerseId  = parseInt(document.getElementById('start-ayah').value);
  const endVerseId    = parseInt(document.getElementById('end-ayah').value);
  const outputWrapper = document.getElementById('output-wrapper');
  const outputText    = document.getElementById('output-text');

  if (!startVerseId || !endVerseId) {
    alert('Please select both starting and ending verse parameters before trying to calculate.');
    return;
  }
  if (startVerseId > endVerseId) {
    alert('Invalid Range Selection: The selected Starting lesson comes after the Selected Ending Lesson boundaries.');
    return;
  }

  const startData = queryRows('SELECT * FROM verse WHERE id = ?', [startVerseId])[0];
  const endData   = queryRows('SELECT * FROM verse WHERE id = ?', [endVerseId])[0];

  const startPara = queryRows('SELECT para_number FROM para WHERE id = ?', [startData.para_id])[0].para_number;
  const endPara   = queryRows('SELECT para_number FROM para WHERE id = ?', [endData.para_id])[0].para_number;

  const startParaRukuCount = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [startData.para_id, startData.ruku_id]
  )[0].local_count;

  const endParaRukuCount = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [endData.para_id, endData.ruku_id]
  )[0].local_count;

  const startPg = startData.start_page, endPg = endData.end_page;
  const startLn = startData.start_line, endLn = endData.end_line;
  let totalLines = 0;

  if (startPg === endPg) {
    totalLines = (endLn - startLn) + 1;
  } else {
    totalLines += (getLinesOnPage(startPg) - startLn) + 1;
    for (let p = startPg + 1; p < endPg; p++) totalLines += getLinesOnPage(p);
    totalLines += endLn;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  outputText.textContent =
    'Para # ' + pad(startPara) + ' To ' + pad(endPara) +
    ' --- Ruku # ' + pad(startParaRukuCount) + ' To ' + pad(endParaRukuCount) +
    ' --- Ayah # ' + pad(startData.verse_number) + ' To ' + pad(endData.verse_number) +
    ' (Total Lines = ' + pad(totalLines) + ') ';

  outputWrapper.classList.remove('hidden');
}

/* Attendance Copy Functionality */ 
function calculateLessonLines() {
  const startVerseId  = parseInt(document.getElementById('start-ayah').value);
  const endVerseId    = parseInt(document.getElementById('end-ayah').value);
  const outputWrapper = document.getElementById('output-wrapper');
  const outputText    = document.getElementById('output-text');

  if (!startVerseId || !endVerseId) {
    alert('Please select both starting and ending verse parameters before trying to calculate.');
    return;
  }
  if (startVerseId > endVerseId) {
    alert('Invalid Range Selection: The selected Starting lesson comes after the Selected Ending Lesson boundaries.');
    return;
  }

  const startData = queryRows('SELECT * FROM verse WHERE id = ?', [startVerseId])[0];
  const endData   = queryRows('SELECT * FROM verse WHERE id = ?', [endVerseId])[0];

  const startPara = queryRows('SELECT para_number FROM para WHERE id = ?', [startData.para_id])[0].para_number;
  const endPara   = queryRows('SELECT para_number FROM para WHERE id = ?', [endData.para_id])[0].para_number;

  const startParaRukuCount = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [startData.para_id, startData.ruku_id]
  )[0].local_count;

  const endParaRukuCount = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [endData.para_id, endData.ruku_id]
  )[0].local_count;

  const startPg = startData.start_page, endPg = endData.end_page;
  const startLn = startData.start_line, endLn = endData.end_line;
  let totalLines = 0;

  if (startPg === endPg) {
    totalLines = (endLn - startLn) + 1;
  } else {
    totalLines += (getLinesOnPage(startPg) - startLn) + 1;
    for (let p = startPg + 1; p < endPg; p++) totalLines += getLinesOnPage(p);
    totalLines += endLn;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  outputText.textContent =
    'Para # ' + pad(startPara) + ' To ' + pad(endPara) +
    ' --- Ruku # ' + pad(startParaRukuCount) + ' To ' + pad(endParaRukuCount) +
    ' --- Ayah # ' + pad(startData.verse_number) + ' To ' + pad(endData.verse_number) +
    ' (Total Lines = ' + pad(totalLines) + ') ';

  outputWrapper.classList.remove('hidden');

   // --- DYNAMIC COPY BUTTON INJECTION ---
  let copyBtn = document.getElementById('copy-attendance-btn');
  if (!copyBtn) {
    copyBtn = document.createElement('button');
    copyBtn.id = 'copy-attendance-btn';
    copyBtn.onclick = copyAttendanceText;
    
    // Ultra Attractive Design for White Background
    copyBtn.style.marginTop = '14px';
    copyBtn.style.padding = '10px 22px';
    copyBtn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)'; // Indigo to Violet
    copyBtn.style.color = '#ffffff';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '10px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.fontSize = '13px';
    copyBtn.style.fontWeight = '700';
    copyBtn.style.display = 'inline-flex';
    copyBtn.style.alignItems = 'center';
    copyBtn.style.gap = '8px';
    copyBtn.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
    copyBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    copyBtn.style.letterSpacing = '0.4px';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Lesson';
    
    // Hover Effects
    copyBtn.onmouseenter = () => {
      copyBtn.style.transform = 'translateY(-3px) scale(1.03)';
      copyBtn.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.5)';
      copyBtn.style.background = 'linear-gradient(135deg, #4338ca, #6d28d9)';
    };
    copyBtn.onmouseleave = () => {
      copyBtn.style.transform = 'translateY(0) scale(1)';
      copyBtn.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
      copyBtn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
    };
    
    outputText.insertAdjacentElement('afterend', copyBtn);
  } else {
    // Reset design if calculating again
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Lesson';
    copyBtn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
    copyBtn.style.transform = 'translateY(0) scale(1)';
    copyBtn.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
  }
}

async function copyAttendanceText() {
  const textToCopy = document.getElementById('output-text').textContent;
  const btn = document.getElementById('copy-attendance-btn');
  
  if (!textToCopy) return;

  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Attractive Success State (Turns Green)
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Copied!';
    btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
    btn.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.45)';
    btn.style.transform = 'translateY(0) scale(1)';
    
    setTimeout(() => {
      // Revert to Original Attractive State
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Lesson';
      btn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
      btn.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
    }, 2000);
    
  } catch (err) {
    console.error('Copy failed:', err);
    alert('Unable to copy. Please select the text and copy manually.');
  }
}
