/* ═══════════════════════════════════════════════════
   PMG GM Dashboard — กำไรขั้นต้น (Gross Margin)
   - ธุรกิจขาย vs ธุรกิจหลังการขาย
   - รายละเอียดย่อยทุกสาขา
   - เปรียบเทียบข้ามปี + รายเดือน
   - สัดส่วน GM ขาย vs หลังการขาย
   ═══════════════════════════════════════════════════ */

var GM_SS_ID = '18CPvbyFzV5TQNKw_N9MxPEYeG0OsP5yigsWcp7Q0EbE';

function doGet(e) {
  var p = e.parameter || {};
  var view = p.view || 'gm';
  if (view === 'data') return serveGmData_(p);
  return serveGmDashboard_(p);
}

/* ── Serve data as JSON ── */
function serveGmData_(p) {
  var data = parseGmData_();
  var cType = ContentService.MimeType.JSON;
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(cType);
}

/* ── Serve HTML dashboard ── */
function serveGmDashboard_(p) {
  var tpl = HtmlService.createTemplateFromFile('GM_Index');
  var data = parseGmData_();
  tpl.data = JSON.stringify(data);
  // Replace the DATA_PLACEHOLDER in the HTML with actual data
  var html = tpl.evaluate()
    .setTitle('PMG GM Dashboard — กำไรขั้นต้น')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/* ═════════════════════════════════════
   PARSE GM DATA FROM SPREADSHEET
   ═══════════════════════════════════ */
function parseGmData_() {
  var ss = SpreadsheetApp.openById(GM_SS_ID);
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf('GMG') >= 0 || sheets[i].getName().indexOf('GM ค่าแรง') >= 0) {
      sheet = sheets[i];
      break;
    }
  }
  if (!sheet) sheet = ss.getSheets()[0];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var raw = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  var result = {
    summary: [],      // ตารางสรุป GM ขาย vs หลังการขาย ปี 2551-2569
    monthly: {},      // ข้อมูลรายเดือนแยกสาขา
    products: [],     // สัดส่วนรายผลิตภัณฑ์ (GMG% per product)
    afterSalesRatio: 0,
    salesRatio: 0
  };
  
  // ── Parse summary table (rows 473-493) ──
  // Headers at row 474 (index 473): ปี, GM ขาย, GM หลังการขาย, GM รวม, สัดส่วนขาย, สัดส่วนหลังการขาย
  for (var r = 473; r < Math.min(493, raw.length); r++) {
    var row = raw[r];
    if (!row) continue;
    var yearVal = pv_(row[5]);
    if (yearVal === null) continue;
    var year = Math.round(yearVal);
    if (year < 2540 || year > 2580) continue;
    
    result.summary.push({
      year: year,
      gmSales: pv_(row[6]),           // กำไรขั้นต้นจากงานขาย
      gmAfterSales: pv_(row[7]),      // กำไรขั้นต้นจากงานผู้ใช้รถยนต์
      gmTotal: pv_(row[8]),           // กำไรขั้นต้นรวม
      salesRatio: pv_(row[9]),         // สัดส่วนขาย
      afterSalesRatio: pv_(row[10])    // สัดส่วนหลังการขาย
    });
  }
  
  // ── Parse product breakdown (rows 14-22) ──
  for (var r = 13; r <= 21; r++) {
    var row = raw[r];
    if (!row) continue;
    var no = pv_(row[0]);
    var desc = String(row[2] || '').trim();
    if (!desc || no === null) continue;
    
    result.products.push({
      no: no,
      desc: desc,
      avgY66: pv_(row[3]),        // เฉลี่ยปี 66
      targetY69: pv_(row[4]),     // เป้าหมายปี 69
      gmgPct: pv_(row[5]),        // GMG %
      y68Avg: pv_(row[6]),        // เฉลี่ยปี 68
      diffVsY68: pv_(row[7]),     // เปรียบเทียบกับปี 68
      gmgPctVsY68: pv_(row[8])    // GMG% vs ปี 68
    });
  }
  
  // ── Parse ratios (row 26-27) ──
  for (var r = 25; r <= 27; r++) {
    var row = raw[r];
    if (!row) continue;
    var desc = String(row[2] || '').trim();
    if (desc.indexOf('หลังการขาย') >= 0 || desc.indexOf('บริการผู้ใช้รถ') >= 0) {
      result.afterSalesRatio = pv_(row[3]) || pv_(row[4]);
    }
    if (desc.indexOf('ขาย') >= 0 && desc.indexOf('หลัง') < 0) {
      result.salesRatio = pv_(row[3]) || pv_(row[4]);
    }
  }
  
  // ── Parse monthly data for each sub-business ──
  // อะไหล่และประดับยนต์ (rows ~148-166)
  result.monthly.parts = parseMonthlySection_(raw, 'อะไหล่', 147, 19);
  // ค่าแรงบริการ (rows ~168-186)
  result.monthly.service = parseMonthlySection_(raw, 'บริการ', 167, 19);
  // พ่นกันสนิม (rows ~187-205)
  result.monthly.antirust = parseMonthlySection_(raw, 'พ่นกันสนิม', 186, 19);
  // ประกันภัยต่ออายุ (rows ~223-238)
  result.monthly.insurance = parseMonthlySection_(raw, 'ประกันภัย(ต่ออายุ)', 222, 19);
  // ขายของเก่า (rows ~255-270)
  result.monthly.usedGoods = parseMonthlySection_(raw, 'ของเก่า', 254, 19);
  // PMG Service ค่าแรง (rows ~271-280)
  result.monthly.pmgServiceLabor = parseMonthlySection_(raw, 'PMG Service', 270, 19);
  // PMG Service อะไหล่ (rows ~281-290)
  result.monthly.pmgServiceParts = parseMonthlySection_(raw, 'PMG Service', 280, 19);
  // ขายรถยนต์ (rows ~91-109)
  result.monthly.carSales = parseMonthlySection_(raw, 'ขายรถยนต์', 90, 19);
  // ทะเบียนรถใหม่ (rows ~110-128)
  result.monthly.carReg = parseMonthlySection_(raw, 'ทะเบียนรถ', 109, 19);
  // ประกันภัยรถใหม่ (rows ~129-147)
  result.monthly.newCarIns = parseMonthlySection_(raw, 'ประกันภัยรถใหม่', 128, 19);
  // ศูนย์ซ่อมตัวถัง (rows ~206-222)
  result.monthly.bodyRepair = parseMonthlySection_(raw, 'ศูนย์ซ่อมตัวถัง', 205, 19);
  // หลังการขาย รวม (rows ~327-345)
  result.monthly.afterSalesTotal = parseMonthlySection_(raw, 'หลังการขาย', 326, 19);
  // GM ขาย (rows ~308-326)
  result.monthly.gmSalesMonthly = parseMonthlySection_(raw, 'GM ขาย', 307, 19);
  // กำไรขั้นต้น (rows ~292-304)
  result.monthly.grossProfit = parseMonthlySection_(raw, 'กำไรขั้นต้น', 291, 19);
  // โครงการฝากรถ (row 20 in products)
  
  return result;
}

/* Parse a monthly section - returns array of {year, monthly:[12 values], total} */
function parseMonthlySection_(raw, keyword, startRow, maxYears) {
  var results = [];
  var endRow = Math.min(startRow + maxYears, raw.length);
  
  for (var r = startRow; r < endRow; r++) {
    var row = raw[r];
    if (!row) continue;
    
    var desc = String(row[2] || '').trim();
    if (desc === '' && row[0] === '' && row[1] === '' && row[3] === '' && row[4] === '') continue;
    
    // Extract year from description (e.g., "อะไหล่-ประดับยนต์69" → year 69)
    var yearMatch = desc.match(/(\d{2,4})\s*$/);
    var year = null;
    if (yearMatch) {
      var yr = parseInt(yearMatch[1]);
      year = yr > 2400 ? yr : (yr > 70 ? 2500 + yr : 2543 + yr);
    }
    
    // Monthly values: cols 5-16 (Jan-Dec)
    var monthly = [];
    for (var c = 5; c <= 16 && c < row.length; c++) {
      monthly.push(pv_(row[c]));
    }
    
    // Total/average: col 3 or 4
    var total = pv_(row[3]) || pv_(row[4]);
    
    if (year || total || monthly.some(function(v) { return v !== null && v !== 0; })) {
      results.push({
        desc: desc,
        year: year,
        monthly: monthly,
        total: total
      });
    }
  }
  
  return results;
}

/* Parse numeric value */
function pv_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  var s = String(v).trim().replace(/,/g, '');
  if (s === '' || s === '-' || s.indexOf('===') >= 0) return null;
  if (s.charAt(0) === '(' && s.charAt(s.length-1) === ')') s = '-' + s.substring(1, s.length-1);
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}