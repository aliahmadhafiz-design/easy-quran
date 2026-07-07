/* ============================================================
   homework.js — reuses shared Quran DB from app.js
   ============================================================ */

let surahListMap = [];

async function initLessonViewer() {
  const statusEl = document.getElementById('engine-status');
  try { 
    // Reuse the already-loaded shared DB (loaded in app.js)
    await window.ensureQuranDb();

    if (statusEl) {
      statusEl.className = 'ml-auto flex items-center gap-2 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-bold';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>Engine Active';
    }

    loadSurahDropdowns();
  } catch (err) {
    console.error('Homework init error:', err);
    if (statusEl) {
      statusEl.className = 'ml-auto flex items-center gap-2 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 text-xs font-bold';
      statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span>Sync Connection Error';
    }
  }
}

function queryRows(sqlStatement, params) {
  return window.quranQueryRows(sqlStatement, params || []);
}

function loadSurahDropdowns() {
  surahListMap = queryRows('SELECT id, surah_number, name_arabic, total_verses FROM surah ORDER BY surah_number ASC');

  const startSelect = document.getElementById('start-surah');
  const endSelect   = document.getElementById('end-surah');
  if (!startSelect || !endSelect) return;

  let html = '';
  for (let i = 0; i < surahListMap.length; i++) {
    const s = surahListMap[i];
    html += `<option value="${s.id}">${s.surah_number}. ${s.name_arabic}</option>`;
  }
  startSelect.innerHTML = html;
  endSelect.innerHTML   = html;

  updateAyahLimits('start');
  updateAyahLimits('end');
}

function updateAyahLimits(targetPrefix) {
  const surahId   = parseInt(document.getElementById(targetPrefix + '-surah').value);
  const ayahInput = document.getElementById(targetPrefix + '-ayah');
  const targetSurah = surahListMap.find(s => s.id === surahId);
  if (targetSurah) {
    ayahInput.max = targetSurah.total_verses;
    if (parseInt(ayahInput.value) > targetSurah.total_verses) {
      ayahInput.value = targetSurah.total_verses;
    }
  }
}

function getLocalizedRuku(paraId, rukuId) {
  const rows = queryRows(
    'SELECT COUNT(id) as local_count FROM ruku WHERE para_id = ? AND id <= ?',
    [paraId, rukuId]
  );
  return rows[0] ? rows[0].local_count : 1;
}

function generateLessonSheet() {
  const studentName  = document.getElementById('student-name').value.trim();
  const startSurahId = parseInt(document.getElementById('start-surah').value);
  const startAyahNum = parseInt(document.getElementById('start-ayah').value) || 1;
  const endSurahId   = parseInt(document.getElementById('end-surah').value);
  const endAyahNum   = parseInt(document.getElementById('end-ayah').value) || 1;

  if (!studentName) {
    alert('Please enter a Student Name to personalise the assignment tracking card.');
    return;
  }

  const startVerseRow = queryRows(
    'SELECT id, verse_number, surah_id, para_id, ruku_id FROM verse WHERE surah_id = ? AND verse_number = ?',
    [startSurahId, startAyahNum]
  )[0];

  const endVerseRow = queryRows(
    'SELECT id, verse_number, surah_id, para_id, ruku_id FROM verse WHERE surah_id = ? AND verse_number = ?',
    [endSurahId, endAyahNum]
  )[0];

  if (!startVerseRow || !endVerseRow) {
    alert('Could not locate the verse configurations inside the database. Please check your inputs.');
    return;
  }

  if (startVerseRow.id > endVerseRow.id) {
    alert('Invalid Range Selection: The starting lesson boundaries must come before your ending lesson point.');
    return;
  }

  const passageVerses = queryRows(
    'SELECT v.*, s.name_english, p.para_number FROM verse v JOIN surah s ON v.surah_id = s.id JOIN para p ON v.para_id = p.id WHERE v.id >= ? AND v.id <= ? ORDER BY v.id ASC',
    [startVerseRow.id, endVerseRow.id]
  );

  if (!passageVerses.length) {
    alert('No structural reading datasets found inside your selection boundaries.');
    return;
  } 

  const startParaNum   = passageVerses[0].para_number;
  const endParaNum     = passageVerses[passageVerses.length - 1].para_number;
  const startRukuLocal = getLocalizedRuku(passageVerses[0].para_id, passageVerses[0].ruku_id);
  const endRukuLocal   = getLocalizedRuku(passageVerses[passageVerses.length - 1].para_id, passageVerses[passageVerses.length - 1].ruku_id);
  const startSurahName = passageVerses[0].name_english;
  const endSurahName   = passageVerses[passageVerses.length - 1].name_english;

  document.getElementById('doc-student-name').textContent  = studentName;
  document.getElementById('doc-date').textContent          = 'Generated: ' + new Date().toLocaleDateString();
  document.getElementById('doc-range-subtitle').textContent =
    'From: ' + startSurahName + ' [Ayah ' + startAyahNum + '] — To: ' + endSurahName + ' [Ayah ' + endAyahNum + ']';

  let metaStr = 'Para Location: ' + startParaNum;
  if (startParaNum !== endParaNum) metaStr += ' to ' + endParaNum;
  metaStr += ' | Local Ruku Range: ' + startRukuLocal;
  if (startRukuLocal !== endRukuLocal || startSurahId !== endSurahId) metaStr += ' to ' + endRukuLocal;
  document.getElementById('doc-meta-subtitle').textContent = metaStr;

  // Build Quran text block (physical Quran style — continuous justified RTL)
  let processedHtmlBlock = '';
  let currentSurahContext = null;

  for (let idx = 0; idx < passageVerses.length; idx++) {
    const verse = passageVerses[idx];

    if (currentSurahContext !== verse.surah_id) {
      currentSurahContext = verse.surah_id;
      processedHtmlBlock +=
        ' <span class="text-[#4b7c3d] font-sans text-xs font-bold mx-2 border border-[#d1fae5] bg-[#ecfdf5] px-2 py-0.5 rounded select-none tracking-normal" dir="ltr">﴾ Surah ' + verse.name_english + ' ﴿</span> ';
    }

    if (verse.verse_number === 0) {
      processedHtmlBlock += ' <span class="text-[#19232a] mx-2 font-normal text-3xl">' + verse.verse_text + '</span> ';
    } else {
      processedHtmlBlock += ' ' + verse.verse_text + ' ';
      processedHtmlBlock +=
        ' <span class="inline-flex items-center justify-center text-xs border border-[#f5d084] font-sans font-bold text-[#b45309] rounded-full w-6 h-6 mx-1 bg-[#ffedd5]/70 select-none align-middle" dir="ltr">' +
        verse.verse_number + '</span>';
    }
  }

  document.getElementById('quran-lined-content').innerHTML = processedHtmlBlock;
    document.getElementById('print-area-wrapper').setAttribute('dir', 'ltr');
  document.getElementById('print-area-wrapper').classList.remove('hidden');
  document.getElementById('download-btn').classList.remove('hidden');
  document.getElementById('print-area-wrapper').scrollIntoView({ behavior: 'smooth' });
}




async function downloadLessonImage() {
  const targetElement = document.getElementById('lesson-capture-target');
  const student = (document.getElementById('student-name').value.trim().replace(/\s+/g, '_')) || 'student';
  const btn = document.getElementById('download-btn');

  if (!targetElement) {
    alert('Unable to locate the lesson sheet. Please generate the sheet first.');
    return;
  }

  if (typeof html2canvas === 'undefined') {
    alert('Export library is not loaded yet. Please refresh the page and try again.');
    return;
  }

  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';

  let savedStyles = [];

  try {
    await document.fonts.ready;
    try { await document.fonts.load("1em 'QuranLocalFont'"); } catch (_) {}

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

    // 2. CRITICAL FIX: Sanitize modern colors (oklab, oklch) that crash html2canvas
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
      link.download = 'Lesson_Sheet_' + student + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');

  } catch (error) {
    console.error('Lesson image export failed:', error);
    alert('Unable to export image. Details: ' + error.message);
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