// ═══════════════════════════════════════════════════════════════
// PMG Calendar — ปฏิทินบริหารงานซ่อม (Standalone)
// Separated from PMG War Room v2 for independence
// ═══════════════════════════════════════════════════════════════

var CAL_SS_KEY = '1IYbJTLSjABzbX4Etv6y-Db_bI5x7IkDhim6Ys8usFu0';
var CAL_SH_NAME = 'C1_ปฎิทิน';
var CACHE_KEY = 'calendarData';
var CACHE_TTL = 300; // 5 minutes

// ─── PDPA Masking Functions ───────────────────────────────────

/**
 * Mask a Thai license plate for PDPA compliance.
 * Dash format:   "กร-4423" → "ก**-4**3"
 * No-dash format: "1ขฌ9235" → "1ข**92**"
 */
function maskPlate_(plate) {
  if (!plate) return plate;
  plate = String(plate).trim();
  if (plate.length <= 2 || plate.indexOf('**') >= 0 || plate.indexOf('●') >= 0) return plate;

  // Format with dash (e.g., "กร-4423")
  if (plate.indexOf('-') >= 0) {
    var dashIdx = plate.indexOf('-');
    var left = plate.substring(0, dashIdx);
    var right = plate.substring(dashIdx + 1);

    var maskedLeft = left.charAt(0) + '**';

    var maskedRight;
    if (right.length <= 2) {
      maskedRight = right.charAt(0) + (right.length > 1 ? '*' : '');
    } else {
      maskedRight = right.charAt(0) + '**' + right.charAt(right.length - 1);
    }

    return maskedLeft + '-' + maskedRight;
  }

  // No dash format (e.g., "1ขฌ9235")
  if (plate.length <= 4) {
    return plate.charAt(0) + '**';
  }
  // length >= 5: keep first 2, mask(**), show 2 chars at positions 3-4, mask rest(**)
  var shown2 = plate.substring(3, Math.min(5, plate.length));
  var hasTrailing = plate.length > 5;
  return plate.substring(0, 2) + '**' + shown2 + (hasTrailing ? '**' : '');
}

/**
 * Mask a short name for PDPA compliance.
 * "บอม" → "บ●●", "นก" → "น●"
 */
function maskName_(name) {
  if (!name) return name;
  name = String(name).trim();
  if (name.length <= 1 || name.indexOf('●') >= 0) return name;
  return name.charAt(0) + '●'.repeat(name.length - 1);
}

/**
 * Mask a cell value containing plate + optional tech info.
 * Handles formats: "PLATE", "PLATE JOBTTYPE_NAME", "PLATE_NAME_SUP"
 */
function maskVal_(val) {
  if (!val) return val;
  val = String(val).trim();
  if (val.indexOf('**') >= 0 || val.indexOf('●') >= 0) return val; // already masked

  // Split by space: "PLATE JOBTTYPE_NAME" or just "PLATE"
  var spaceParts = val.split(/\s+/);
  var plate = spaceParts[0];
  var maskedPlate = maskPlate_(plate);

  if (spaceParts.length === 1) {
    // Could be just plate, or "PLATE_NAME" / "PLATE_NAME_SUP" format
    if (plate.indexOf('_') >= 0) {
      var uParts = plate.split('_');
      uParts[0] = maskPlate_(uParts[0]);   // plate part
      for (var j = 1; j < uParts.length; j++) {
        uParts[j] = maskName_(uParts[j]);  // name/sup parts
      }
      return uParts.join('_');
    }
    return maskedPlate;
  }

  // Has space: first part is plate, rest is tech info
  // Join remaining space-parts (in case of multiple spaces)
  var rest = spaceParts.slice(1).join(' ');

  if (rest.indexOf('_') >= 0) {
    // Format: "JOBTTYPE_NAME" or "JOBTTYPE_NAME_SUP"
    var rParts = rest.split('_');
    // First part is job type (not personal data), rest are names
    var maskedRParts = [rParts[0]]; // keep job type unmasked
    for (var k = 1; k < rParts.length; k++) {
      maskedRParts.push(maskName_(rParts[k]));
    }
    return maskedPlate + ' ' + maskedRParts.join('_');
  }

  // No underscore — the rest is a plain name
  return maskedPlate + ' ' + maskName_(rest);
}

/**
 * Deep-clone data and apply PDPA masking to all cell values.
 */
function applyMasking_(data) {
  if (!data || !data.sections) return data;
  var masked = JSON.parse(JSON.stringify(data));
  masked.sections.forEach(function(sec) {
    sec.entries.forEach(function(entry) {
      entry.cells.forEach(function(cell) {
        cell.val = maskVal_(cell.val);
      });
    });
  });
  return masked;
}

// ─── PDPA Badge & Footer HTML ─────────────────────────────────

var PDPA_BADGE_HTML = '<span style="position:fixed;top:8px;right:16px;background:#dc2626;color:white;font-size:.65rem;padding:3px 8px;border-radius:10px;font-weight:700;letter-spacing:.5px;z-index:9999;box-shadow:0 2px 8px rgba(220,38,38,.3)">🔒 PDPA ข้อมูลลับ</span>';

var PDPA_FOOTER_HTML = '<div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;text-align:center;font-size:.7rem;padding:4px 0;font-weight:700;letter-spacing:1px;z-index:9999">⛔ ข้อมูลลับ — ห้ามเผยแพร่ หรือ ส่งออกโดยไม่ได้รับอนุญาต (PDPA)</div>';

// ─── Web App Entry Point ─────────────────────────────────────

function doGet(e) {
  var maskData = true;
  if (e && e.parameter && e.parameter.maskData === 'false') maskData = false;

  // API endpoint
  if (e && e.parameter && e.parameter.api === '1') {
    var data = getCalendarData(maskData);
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Web app — inject PDPA badge + footer into HTML
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('📆 ปฏิทินบริหารงานซ่อม')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  var content = html.getContent();
  content = content.replace('<body>', '<body>' + PDPA_BADGE_HTML);
  content = content.replace('</body>', PDPA_FOOTER_HTML + '</body>');
  html.setContent(content);
  return html;
}

// ─── Cache Helpers ─────────────────────────────────────────────

function cv(key) {
  var c = CacheService.getScriptCache().get(key);
  return c ? JSON.parse(c) : null;
}
function cs(key, val) {
  CacheService.getScriptCache().put(key, JSON.stringify(val), CACHE_TTL);
}

// ─── Data Fetch ────────────────────────────────────────────────

function getCalendarData(maskData) {
  if (maskData === undefined || maskData === null) maskData = true;

  var data = cv(CACHE_KEY);
  if (!data) {
    try {
      var ss = SpreadsheetApp.openById(CAL_SS_KEY);
      var sh = ss.getSheetByName(CAL_SH_NAME);
      if (!sh) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getSheetId() === 1457101115) { sh = sheets[i]; break; }
        }
      }
      if (!sh) return { error: 'Sheet C1_ปฎิทิน not found' };

      var raw = sh.getRange('A1:AF211').getValues();

      var sections = [];
      var sectionDefs = [
        { startRow: 0,  key: 'c11', name: 'ปฏิทินการนัดหมายเข้าซ่อม',        icon: '📅' },
        { startRow: 35, key: 'c12', name: 'ปฏิทินการรับรถเข้าซ่อมจริง',       icon: '🚗' },
        { startRow: 78, key: 'c13', name: 'ปฏิทินการนัดหมายช่าง',             icon: '🔧' },
        { startRow: 108, key: 'c14', name: 'ปฏิทินการนัดหมายส่งมอบ',           icon: '📤' },
        { startRow: 147, key: 'c15a', name: 'ปฏิทินการส่งมอบรถจริงประจำวัน',    icon: '✅' },
        { startRow: 179, key: 'c15b', name: 'ปฏิทินการเปิด JOB ประจำวัน',        icon: '📋' }
      ];

      for (var si = 0; si < sectionDefs.length; si++) {
        var sd = sectionDefs[si];
        var endRow = (si < sectionDefs.length - 1) ? sectionDefs[si + 1].startRow : raw.length;

        var dateRow = raw[sd.startRow + 1];
        var dates = [];
        for (var c = 1; c < dateRow.length; c++) {
          if (dateRow[c]) {
            var d = new Date(dateRow[c]);
            dates.push(Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'));
          }
        }

        var entries = [];
        for (var r = sd.startRow + 2; r < endRow; r++) {
          var rowNum = raw[r][0];
          var hasData = false;
          var cells = [];
          for (var c2 = 1; c2 < raw[r].length; c2++) {
            var v = raw[r][c2];
            if (v && String(v).trim()) {
              cells.push({ dt: dates[c2 - 1], val: String(v).trim() });
              hasData = true;
            }
          }
          if (hasData) {
            entries.push({ row: rowNum, cells: cells });
          }
        }

        sections.push({
          key: sd.key,
          name: sd.name,
          icon: sd.icon,
          dates: dates,
          entries: entries,
          totalRows: entries.length
        });
      }

      data = { sections: sections };
      cs(CACHE_KEY, data);
    } catch (e) {
      return { error: e.message || String(e) };
    }
  }

  if (maskData) {
    return applyMasking_(data);
  }
  return data;
}