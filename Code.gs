/* ═══════════════════════════════════════════
  PMG War Room v13.37 — Code.gs (Backend)
  Added: เคลือบแก้ว tab with ปี68 vs ปี69 comparison
  ═══════════════════════════════════════════ */
var SS_KEY = '1rqD0cIuCK5dU2uNjafx1qJRpeY7Bc69-jXN2FB1JK2c';
var SH_NAME = 'D1_DTA1';
var CACHE_PREFIX = 'pmgv1345_';
var CACHE_TTL = 300;

function getSh() {
  return SpreadsheetApp.openById(SS_KEY).getSheetByName(SH_NAME);
}
function ck(key) { return CacheService.getScriptCache().get(CACHE_PREFIX + key); }
function cs(key, val) { CacheService.getScriptCache().put(CACHE_PREFIX + key, JSON.stringify(val), CACHE_TTL); }
function cv(key) { var c = ck(key); return c ? JSON.parse(c) : null; }

function doGet(e) {
  if (e && e.parameter && e.parameter.debug4) {
    var ss = SpreadsheetApp.openById(SS_KEY);
    var sh = ss.getSheetByName('Monitor');
    if (!sh) {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getSheetId() === 1645350915) { sh = sheets[i]; break; }
      }
    }
    if (sh) {
      var out = {};
      out.monitorRaw = sh.getRange('E182:X217').getValues();
      // Also try the first few rows to see actual structure
      out.monitorFirst3Rows = sh.getRange('E182:X184').getValues();
      return ContentService.createTextOutput(JSON.stringify(out))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({error: 'Monitor sheet not found'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.debug3) {
    var sh = getSh();
    var out = { version: 'v13.37' };
    out.rows67_83 = sh.getRange('A67:N83').getValues();
    out.rows276_288 = sh.getRange('C276:J288').getValues();
    // Also read row 67 header and nearby context
    out.rows65_70 = sh.getRange('A65:N70').getValues();
    out.rows270_280 = sh.getRange('A270:M280').getValues();
    out.saDetail = sh.getRange('W6:BS21').getValues();
    out.saHeader = sh.getRange('A144:H151').getValues();
    out.saMonthLabels = sh.getRange('V7:V21').getValues();
    try { out.rtype = getRepairTypeData(); } catch(err) { out.rtype_err = err.message; }
    try { out.smix = getServiceMixData(); } catch(err) { out.smix_err = err.message; }
    try { out.supp = getSupplementData(); } catch(err) { out.supp_err = err.message; }
    // Read new SC data from supplement spreadsheet
    try {
      var scSS = SpreadsheetApp.openById('1Yr2-vXEI64BRfA_K8muqg4Gij3Un6QXKoi7LWIGt5tg');
      var scSh = scSS.getSheetByName('สรุป_เชียร์เคลมเพิ่ม');
      if (scSh) {
        out.scNewRows = scSh.getRange('A17:AS62').getValues();
      } else {
        out.scNewErr = 'Sheet not found: สรุป_เชียร์เคลมเพิ่ม';
      }
    } catch(err2) { out.scNewErr = err2.message; }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.debug) {
    var sh = getSh();
    var out = { version: 'v13.37' };
    // Debug: read SC area more broadly
    out.sc_rows_158_180 = sh.getRange('A158:N180').getValues();
    // Also read rows 140-170 to find where SC data actually starts
    out.sc_search = sh.getRange('A140:A200').getValues().map(function(r, i) { return { row: 140+i, val: String(r[0] || '').trim() }; }).filter(function(r) { return r.val; });
    try { out.okr = getOKRData(); } catch(err) { out.okr_err = err.message; }
    try { out.bct = getBCTData(); } catch(err) { out.bct_err = err.message; }
    try { out.fin = getFinData(); } catch(err) { out.fin_err = err.message; }
    try { out.sc = getShareClaimData(); } catch(err) { out.sc_err = err.message; }
    try { out.yoy = getYoYData(); } catch(err) { out.yoy_err = err.message; }
    try { out.hist = getHistoricalData(); } catch(err) { out.hist_err = err.message; }
    try { out.supp = getSupplementData(); } catch(err) { out.supp_err = err.message; }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.debug2) {
    var out = { version: 'v13.37' };
    try {
      var histSS = SpreadsheetApp.openById('1c98G2xTADv66xHdXappjUf4ydCeXJ2NTA2EQWfC6UNQ');
      var sheets = histSS.getSheets();
      out.sheetNames = sheets.map(function(s) { return { name: s.getName(), gid: s.getSheetId() }; });
      var histSh = histSS.getSheetById(397436804);
      if (histSh) {
        out.histSheetName = histSh.getSheetName();
        out.histRows = histSh.getRange('A1:Z25').getValues();
        out.histRows50_70 = histSh.getRange('A50:Z70').getValues();
        out.histRows90_105 = histSh.getRange('A90:Z105').getValues();
      } else {
        out.histErr = 'Sheet with GID 397436804 not found, trying by name';
        for (var si = 0; si < sheets.length; si++) {
          out['sheet_'+si] = { name: sheets[si].getName(), gid: sheets[si].getSheetId() };
        }
      }
      // Also read 2025 sheet
      var sh2025 = histSS.getSheetByName('2025');
      if (sh2025) {
        out.sh2025_rows = sh2025.getRange('A1:Z25').getValues();
        out.sh2025_rows50_70 = sh2025.getRange('A50:Z70').getValues();
        out.sh2025_rows90_105 = sh2025.getRange('A90:Z105').getValues();
        out.sh2025_ch = sh2025.getRange('B108:Y120').getValues();
      }
    } catch(err) { out.hist_err = err.message; }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }
  /* ═══ API endpoint: return ALL data as JSON for fetch() ═══ */
  if (e && e.parameter && e.parameter.api) {
    var out = { version: 'v13.37' };
    var allFns = [
      ['okr', getOKRData], ['bct', getBCTData], ['fin', getFinData],
      ['ins', getInsData], ['ch', getChData], ['sa', getSAData],
      ['sc', getShareClaimData], ['yoy', getYoYData], ['dta', getDTAData],
      ['hist', getHistoricalData], ['rtype', getRepairTypeData],
      ['smix', getServiceMixData], ['supp', getSupplementData],
      ['monitor', getMonitorData]
    ];
    for (var fi = 0; fi < allFns.length; fi++) {
      try {
        out[allFns[fi][0]] = allFns[fi][1]();
      } catch(err) {
        out[allFns[fi][0] + '_err'] = err.message;
      }
    }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }
  /* ═══ Main page: simple HtmlOutput — data loaded via google.script.run ═══ */
  var output = HtmlService.createHtmlOutputFromFile('Index');
  return output
    .setTitle('PMG War Room v13.45')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width,initial-scale=1');
}

/* ─── OKR/KPI ─── */
function getOKRData() {
  var k = 'okr';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var d = {
    carTarget: Number(sh.getRange('D3').getValue()) || 0,
    carActual: Number(sh.getRange('G3').getValue()) || 0,
    carRemaining: Number(sh.getRange('L3').getValue()) || 0,
    revTarget: Number(sh.getRange('D4').getValue()) || 0,
    revActual: Number(sh.getRange('G4').getValue()) || 0,
    revRemaining: Number(sh.getRange('L4').getValue()) || 0,
    avgRevPerCar: Number(sh.getRange('F5').getValue()) || 0,
    avgLaborPerCar: Number(sh.getRange('L5').getValue()) || 0,
    date: String(sh.getRange('I1').getValue() || ''),
    months: sh.getRange('B9:D20').getValues().map(function(r) {
      return { m: String(r[0] || ''), target: Number(r[1]) || 0, actual: Number(r[2]) || 0 };
    }).filter(function(r) { return r.m; })
  };
  d.carPct = d.carTarget ? Math.round(d.carActual / d.carTarget * 1000) / 10 : 0;
  d.revPct = d.revTarget ? Math.round(d.revActual / d.revTarget * 1000) / 10 : 0;
  cs(k, d);
  return d;
}

/* ─── BCT ─── */
function getBCTData() {
  var k = 'bct';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var rows = sh.getRange('A9:T20').getValues();
  var bct = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var m = String(r[1] || '').trim();
    if (!m) continue;
    bct.push({
      m: m, tc: Number(r[2]) || 0, ac: Number(r[3]) || 0,
      td: Number(r[5]) || 0, ad: Number(r[8]) || 0,
      ins: Number(r[6]) || 0, cashT: Number(r[7]) || 0, cashA: Number(r[14]) || 0,
      isz: Number(r[10]) || 0, opk: Number(r[11]) || 0,
      sdn: Number(r[12]) || 0, big: Number(r[13]) || 0
    });
  }
  var cum = {
    tc: bct.reduce(function(s,r){return s+r.tc;},0),
    ac: bct.reduce(function(s,r){return s+r.ac;},0),
    td: bct.reduce(function(s,r){return s+r.td;},0),
    ad: bct.reduce(function(s,r){return s+r.ad;},0),
    ins: bct.reduce(function(s,r){return s+r.ins;},0),
    cashT: bct.reduce(function(s,r){return s+r.cashT;},0),
    cashA: bct.reduce(function(s,r){return s+r.cashA;},0),
    opk: bct.reduce(function(s,r){return s+r.opk;},0),
    sdn: bct.reduce(function(s,r){return s+r.sdn;},0),
    big: bct.reduce(function(s,r){return s+r.big;},0)
  };
  cs(k, { bct: bct, cum: cum, selectedMonth: bct.length > 0 ? bct[bct.length-1].m : '' });
  return cv(k);
}

/* ─── การเงิน ─── */
function getFinData() {
  var k = 'fin';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var rows = sh.getRange('A91:N102').getValues();
  var fin = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var m = String(r[1] || '').trim();
    if (!m) continue;
    fin.push({
      m: m,
      rT: Number(r[2]) || 0,
      rA: Number(r[3]) || 0,
      sal: Number(r[6]) || 0,
      pts: Number(r[7]) || 0,
      gm: Number(r[9]) || 0,
      rpC: 0,
      spC: 0
    });
  }
  var bctData = cv('bct');
  if (!bctData) bctData = getBCTData();
  var bctMap = {};
  if (bctData && bctData.bct) {
    bctData.bct.forEach(function(b) { bctMap[b.m] = b.ad; });
  }
  fin.forEach(function(f) {
    var delivered = bctMap[f.m] || 0;
    if (delivered > 0) {
      f.rpC = Math.round(f.sal / delivered);
      f.spC = Math.round(f.pts / delivered);
    }
  });
  var cumFin = {
    rT: fin.reduce(function(s,r){return s+r.rT;},0),
    rA: fin.reduce(function(s,r){return s+r.rA;},0),
    gm: fin.reduce(function(s,r){return s+r.gm;},0),
    sal: fin.reduce(function(s,r){return s+r.sal;},0),
    pts: fin.reduce(function(s,r){return s+r.pts;},0),
    rpC: 0, spC: 0
  };
  var totalDelivered = (bctData && bctData.cum) ? bctData.cum.ad : 0;
  if (totalDelivered > 0) {
    cumFin.rpC = Math.round(cumFin.sal / totalDelivered);
    cumFin.spC = Math.round(cumFin.pts / totalDelivered);
  }
  cumFin.pct = cumFin.rT ? Math.round(cumFin.rA / cumFin.rT * 1000) / 10 : 0;
  cs(k, { fin: fin, cumFin: cumFin });
  return cv(k);
}

/* ─── ประกันภัย ─── */
function getInsData() {
  var k = 'ins';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var names = sh.getRange('C29:AC29').getValues()[0]
    .filter(function(v){return String(v).trim()&&String(v).trim()!=='เดือน';})
    .map(function(v){return String(v).trim();});
  var pcts = sh.getRange('C30:AC30').getValues()[0];
  var totals = sh.getRange('C31:AC31').getValues()[0];
  var monthlyRows = sh.getRange('A32:AC43').getValues();
  var companies = [];
  for (var i = 0; i < names.length; i++) {
    var monthly = [];
    for (var j = 0; j < monthlyRows.length; j++) { monthly.push(Number(monthlyRows[j][i+2]) || 0); }
    companies.push({ name: names[i], pct: Number(String(pcts[i]).replace('%',''))||0, total: Number(totals[i])||0, monthly: monthly });
  }
  var monthLabels = monthlyRows.map(function(r){return String(r[1]||'');}).filter(function(m){return m;});
  cs(k, { ins: companies, monthLabels: monthLabels });
  return cv(k);
}

/* ─── ช่องทาง ─── */
function getChData() {
  var k = 'ch';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var namesRow = sh.getRange('B108:Y108').getValues()[0];
  var names = [], nameIndices = [];
  for (var i = 0; i < namesRow.length; i++) {
    var v = String(namesRow[i]).trim();
    if (v && v!=='รวม' && v!=='ช่องทางonline' && v!=='เดือน/ช่องทาง') { names.push(v); nameIndices.push(i); }
  }
  var monthlyRows = sh.getRange('B109:Y120').getValues();
  var channels = [];
  for (var i = 0; i < names.length; i++) {
    var colIdx = nameIndices[i];
    var monthly = [];
    for (var j = 0; j < monthlyRows.length; j++) { monthly.push(Number(monthlyRows[j][colIdx]) || 0); }
    channels.push({ name: names[i], monthly: monthly });
  }
  var monthLabels = monthlyRows.map(function(r){return String(r[0]||'');}).filter(function(m){return m;});
  cs(k, { ch: channels, names: names, monthLabels: monthLabels });
  return cv(k);
}

/* ─── SA ─── */
function getSAData() {
  var k = 'sa';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var saRows = sh.getRange('A144:H151').getValues();
  var persons = [];
  for (var i = 0; i < saRows.length; i++) {
    var r = saRows[i];
    var name = String(r[0]||'').trim();
    if (!name||name==='SA รับลูกค้าใหม่'||name==='แนน') continue;
    persons.push({
      name: name, target: Number(r[1])||0, delivered: Number(r[2])||0,
      waiting: Number(r[3])||0, needAdd: Number(r[4])||0,
      pct: (Number(r[1])||0)>0?Math.floor(Number(r[2])/Number(r[1])*1000)/10:0,
      online: Number(r[5])||0, soi: Number(r[6])||0, mrCenter: Number(r[7])||0
    });
  }
  var detailRows = sh.getRange('W7:BS21').getValues();
  var monthCellValues = sh.getRange('B9:B20').getValues();
  var monthLabels = [];
  for (var mi = 0; mi < monthCellValues.length; mi++) {
    var ml = String(monthCellValues[mi][0] || '').trim();
    if (!ml) ml = MN[mi] || ('M'+(mi+1));
    monthLabels.push(ml);
  }
  var personOrder = ['บอม','นก','เหน่ง','สร้อย','สอง','แนน','พลอย'];
  var catNames = ['การรับลูกค้า (จำนวนคัน)','การส่งมอบ (จำนวนคัน)','การรับลูกค้า (ค่าแรง)','การส่งมอบ (ค่าแรง)','การส่งมอบ (ค่าอะไหล่)','การส่งมอบ (ค่าแรง/คัน)','การส่งมอบ (ค่าอะไหล่/คัน)'];
  var catLabels = ['รับรถ (คัน)','ส่งมอบ (คัน)','รับรถ (ค่าแรง)','ส่งมอบ ค่าแรงรายคน','ส่งมอบ ค่าอะไหล่รายคน','ค่าแรง/คัน','ค่าอะไหล่/คัน'];
  var catOrder = [0,1,3,4,5,6,2]; // reordered per user request
  var MN = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var monthly = [];
  // detailRows: [0]=categories, [1]=person names, [2]-[13]=month data, [14]=totals
  for (var ri = 2; ri < detailRows.length - 1; ri++) {
    var row = detailRows[ri];
    var monthData = { month: ri - 1, label: monthLabels[ri - 2] || MN[ri - 2] || ('M' + (ri - 1)), data: {} };
    for (var cat = 0; cat < 7; cat++) {
      var catName = catNames[cat]; monthData.data[catName] = {};
      for (var p = 0; p < 7; p++) {
        var pname = personOrder[p];
        if (pname==='แนน') continue;
        var val = row[cat*7+p];
        // Skip #DIV/0! errors
        if (String(val).indexOf('#') >= 0) { monthData.data[catName][pname] = 0; continue; }
        monthData.data[catName][pname] = Number(val) || 0;
      }
    }
    monthly.push(monthData);
  }
  var activePersons = personOrder.filter(function(n){return n!=='แนน';});
  cs(k, { persons: persons, detail: { categories: catNames, catLabels: catLabels, catOrder: catOrder, persons: activePersons, monthly: monthly }, date: String(sh.getRange('I1').getValue()||'') });
  return cv(k);
}

/* ─── Supplement Products (ผลิตภัณฑ์เสริม) ─── */
function getSupplementData() {
  var k = 'supp';
  var c = cv(k); if (c) return c;
  var ss = SpreadsheetApp.openById('1Yr2-vXEI64BRfA_K8muqg4Gij3Un6QXKoi7LWIGt5tg');
  var sh = ss.getSheetByName('ตารางวัดผล') || ss.getSheetByName('วัดผล');
  if (!sh) { cs(k, {error:'Sheet not found'}); return cv(k); }
  var rows = sh.getRange('A90:AB138').getValues();

  // ── Section 1: GM per person (rows 2-13 = months Jan-Dec) ──
  var saNames = [];
  for (var c = 6; c <= 14; c++) {
    var nm = rows[1][c]; // Row 91 = index 1
    if (nm && String(nm).trim()) saNames.push(String(nm).trim());
  }
  var gmTarget = Number(rows[2][2]) || 0; // Row 92 total target
  var gmAchieved = Number(rows[2][3]) || 0; // Row 92 total achieved
  var gmPct = gmTarget > 0 ? gmAchieved / gmTarget : 0;

  var personTotals = [];
  for (var ci = 0; ci < saNames.length; ci++) {
    personTotals.push(Number(rows[2][6+ci]) || 0);
  }

  var saMonthly = [];
  for (var mi = 3; mi <= 14; mi++) { // rows 93-104 = Jan-Dec
    var month = String(rows[mi][1] || '').trim();
    var mTarget = Number(rows[mi][2]) || 0;
    var mAchieved = Number(rows[mi][3]) || 0;
    var mPct = mTarget > 0 ? mAchieved / mTarget : 0;
    var mDiff = Number(rows[mi][5]) || 0;
    var mPersons = {};
    for (var ci = 0; ci < saNames.length; ci++) {
      mPersons[saNames[ci]] = Number(rows[mi][6+ci]) || 0;
    }
    saMonthly.push({month: month, target: mTarget, achieved: mAchieved, pct: mPct, diff: mDiff, persons: mPersons});
  }

  // ── Section 2: GM by product (rows 18-29 = Jan-Dec) ──
  var productNames = [];
  for (var c = 3; c <= 27; c++) {
    var nm = rows[17][c]; // Row 107 headers
    if (nm && String(nm).trim()) productNames.push({name: String(nm).trim(), col: c});
  }

  var prodTotalsGM = {};
  for (var pi = 0; pi < productNames.length; pi++) {
    var v = Number(rows[18][productNames[pi].col]) || 0;
    if (v > 0) prodTotalsGM[productNames[pi].name] = v;
  }

  var prodGMMonthly = [];
  for (var mi = 0; mi < 12; mi++) {
    var r = 19 + mi; // rows 109-120
    var month = String(rows[r][1] || '').trim();
    var gmTotal = Number(rows[r][2]) || 0;
    var byProd = {};
    for (var pi = 0; pi < productNames.length; pi++) {
      var v = Number(rows[r][productNames[pi].col]) || 0;
      if (v > 0) byProd[productNames[pi].name] = v;
    }
    prodGMMonthly.push({month: month, total: gmTotal, byProduct: byProd});
  }

  // ── Section 3: Car count by product (rows 35-46 = Jan-Dec) ──
  var carTotals = {};
  for (var pi = 0; pi < productNames.length; pi++) {
    var v = Number(rows[34][productNames[pi].col]) || 0;
    if (v > 0) carTotals[productNames[pi].name] = v;
  }
  var totalCarsAll = Number(rows[34][2]) || 0;

  var carMonthly = [];
  for (var mi = 0; mi < 12; mi++) {
    var r = 35 + mi; // rows 125-136
    var month = String(rows[r][1] || '').trim();
    var totalCars = Number(rows[r][2]) || 0;
    var byProd = {};
    for (var pi = 0; pi < productNames.length; pi++) {
      var v = Number(rows[r][productNames[pi].col]) || 0;
      if (v > 0) byProd[productNames[pi].name] = v;
    }
    carMonthly.push({month: month, total: totalCars, byProduct: byProd});
  }

  cs(k, {
    gmTarget: gmTarget,
    gmAchieved: gmAchieved,
    gmPct: gmPct,
    saNames: saNames,
    personTotals: personTotals,
    saMonthly: saMonthly,
    productNames: productNames.map(function(p){return p.name;}),
    prodTotalsGM: prodTotalsGM,
    prodGMMonthly: prodGMMonthly,
    totalCarsAll: totalCarsAll,
    carTotals: carTotals,
    carMonthly: carMonthly
  });
  return cv(k);
}

/* ─── Share Claim (from supplement spreadsheet) ─── */
function getShareClaimData() {
  var k = 'sc';
  var c = cv(k); if (c) return c;
  var SUPP_SS_KEY = '1Yr2-vXEI64BRfA_K8muqg4Gij3Un6QXKoi7LWIGt5tg';
  var suppSS = SpreadsheetApp.openById(SUPP_SS_KEY);
  var sh = suppSS.getSheetByName('สรุป_เชียร์เคลมเพิ่ม');
  if (!sh) { cs(k, {error:'Sheet not found'}); return cv(k); }
  var range = sh.getRange('A17:AS62').getValues();
  var MN_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var MN = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  // ─── Section 1 (rows 0-10): รายได้ GM รวม per SA per month ───
  // Row 0 (row 17): ["", "SA / เดือน", "มกราคม", ..., "รวม"]
  var sumNames = [];
  var sumMonthly = []; // [nameIdx][monthIdx]
  var sumTotals = [];
  for (var i = 1; i <= 6; i++) { // rows 1-6 (บอม, พลอย, นก, สร้อย, อ้อ, เหน่ง)
    var name = String(range[i][1]||'').trim();
    if (!name) continue;
    sumNames.push(name);
    var monthly = [];
    for (var m = 0; m < 12; m++) monthly.push(Number(range[i][2+m])||0);
    sumMonthly.push(monthly);
    sumTotals.push(Number(range[i][14])||0);
  }
  // Row 7 (รวม)
  var sumTotalMonthly = [];
  for (var m = 0; m < 12; m++) sumTotalMonthly.push(Number(range[7][2+m])||0);
  var sumGrandTotal = Number(range[7][14])||0;
  // Row 8 (ยอดรถส่งมอบ)
  var vehCountMonthly = [];
  for (var m = 0; m < 12; m++) vehCountMonthly.push(Number(range[8][2+m])||0);
  // Row 9 (ค่าแรงเฉลี่ย/คัน)
  var avgLaborPerCar = [];
  for (var m = 0; m < 12; m++) { var v = range[9][2+m]; avgLaborPerCar.push(typeof v === 'number' && isFinite(v) ? Math.round(v) : 0); }

  // ─── Section 2: รับรถ เชียร์เคลมเพิ่ม (rows 14-25) ───
  // Row 14 (index): "เชียร์เคลมเพิ่มประจำเดือน" header
  // Row 15: blank
  // Row 16 (index 16): "เดือน / SA", then SA names across columns
  // Row 17: column sub-headers per SA: เชียร์เคลมเพิ่ม(คัน), ค่าแรงทำได้รวม, GM ค่าแรง/คัน, ค่าเฉลี่ยค่าแรง/คัน, ค่าอะไหล่ทำได้, GM ค่าอะไหล่/คัน, ค่าเฉลี่ยค่าอะไหล่/คัน
  // Rows 18-29: monthly data (12 months)
  var saOrder = ['บอม','เหน่ง','พลอย','นก','สร้อย','อ้อ'];
  var saDetail = {}; // { saName: { monthly: [{cars, laborTotal, gmLabor, avgLabor, partsTotal, gmParts, avgParts}] } }
  saOrder.forEach(function(n){ saDetail[n] = { monthly: [] }; });
  for (var m = 0; m < 12; m++) {
    var row = range[17 + m]; // indices 17-28 are months 1-12 for รับรถ
    saOrder.forEach(function(n, idx) {
      var base = 2 + idx * 7;
      var cars = Number(row[base]) || 0;
      var laborTotal = Number(row[base+1]) || 0;
      var gmLabor = Number(row[base+2]) || 0;
      var avgLabor = Number(row[base+3]) || 0;
      var partsTotal = Number(row[base+4]) || 0;
      var gmParts = Number(row[base+5]) || 0;
      var avgParts = Number(row[base+6]) || 0;
      // Handle #DIV/0!
      if (String(row[base+2]).indexOf('DIV') >= 0) gmLabor = 0;
      if (String(row[base+3]).indexOf('DIV') >= 0) avgLabor = 0;
      if (String(row[base+5]).indexOf('DIV') >= 0) gmParts = 0;
      if (String(row[base+6]).indexOf('DIV') >= 0) avgParts = 0;
      saDetail[n].monthly.push({
        cars: cars, laborTotal: Math.round(laborTotal), gmLabor: Math.round(gmLabor), avgLabor: Math.round(avgLabor),
        partsTotal: Math.round(partsTotal), gmParts: Math.round(gmParts), avgParts: Math.round(avgParts)
      });
    });
  }

  // ─── Section 3: ส่งมอบ เชียร์เคลมเพิ่ม (rows 31-43) ───
  // Row 31: section header "ส่งมอบเชียร์เคลมเพิ่มประจำเดือน"
  // Row 32: "เดือน / SA" with SA names
  // Row 33: column sub-headers (same structure)
  // Rows 34-45: monthly data
  var saDeliver = {};
  saOrder.forEach(function(n){ saDeliver[n] = { monthly: [] }; });
  for (var m = 0; m < 12; m++) {
    var row = range[34 + m];
    saOrder.forEach(function(n, idx) {
      var base = 2 + idx * 7;
      var cars = Number(row[base]) || 0;
      var laborTotal = Number(row[base+1]) || 0;
      var gmLabor = Number(row[base+2]) || 0;
      var avgLabor = Number(row[base+3]) || 0;
      var partsTotal = Number(row[base+4]) || 0;
      var gmParts = Number(row[base+5]) || 0;
      var avgParts = Number(row[base+6]) || 0;
      if (String(row[base+2]).indexOf('DIV') >= 0) gmLabor = 0;
      if (String(row[base+3]).indexOf('DIV') >= 0) avgLabor = 0;
      if (String(row[base+5]).indexOf('DIV') >= 0) gmParts = 0;
      if (String(row[base+6]).indexOf('DIV') >= 0) avgParts = 0;
      saDeliver[n].monthly.push({
        cars: cars, laborTotal: Math.round(laborTotal), gmLabor: Math.round(gmLabor), avgLabor: Math.round(avgLabor),
        partsTotal: Math.round(partsTotal), gmParts: Math.round(gmParts), avgParts: Math.round(avgParts)
      });
    });
  }

  cs(k, {
    monthLabels: MN,
    monthLabelsFull: MN_FULL,
    saNames: sumNames,
    saMonthly: sumMonthly,
    saTotals: sumTotals,
    sumTotalMonthly: sumTotalMonthly,
    sumGrandTotal: sumGrandTotal,
    vehCountMonthly: vehCountMonthly,
    avgLaborPerCar: avgLaborPerCar,
    saDetail: saDetail,
    saDeliver: saDeliver,
    saOrder: saOrder
  });
  return cv(k);
}

/* ─── YoY ─── */
function getYoYData() {
  var k = 'yoy';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var yearRow = sh.getRange('B501:N501').getValues()[0];
  var yearHeaders = [];
  for (var i = 0; i < yearRow.length; i++) { var y = Number(yearRow[i]); if (y > 2000) yearHeaders.push(y); }
  var monthlyRows = sh.getRange('A503:N514').getValues();
  var months = [];
  for (var i = 0; i < monthlyRows.length; i++) {
    var r = monthlyRows[i]; var m = String(r[1]||'').trim();
    if (!m) continue;
    var yearData = {};
    for (var j = 0; j < yearHeaders.length; j++) { yearData[yearHeaders[j]] = Number(r[j+2]) || 0; }
    months.push({ month: m, years: yearData });
  }
  var totalRow = sh.getRange('A515:N515').getValues()[0];
  var totals = {};
  for (var j = 0; j < yearHeaders.length; j++) { totals[yearHeaders[j]] = Number(totalRow[j+2]) || 0; }
  cs(k, { yearHeaders: yearHeaders, yearLabels: yearHeaders.map(function(y){return 'ปี '+((y+543)%100);}), months: months, totals: totals });
  return cv(k);
}

/* ─── Historical (2024/2025 sheets) ─── */
var HIST_SS_KEY = '1c98G2xTADv66xHdXappjUf4ydCeXJ2NTA2EQWfC6UNQ';
function getHistoricalData() {
  var k = 'hist';
  var c = cv(k); if (c) return c;
  var histSS = SpreadsheetApp.openById(HIST_SS_KEY);
  var result = {};
  var yearSheets = { 2024: '2024', 2025: '2025' };
  for (var yr in yearSheets) {
    var sheetName = yearSheets[yr];
    var sheet = histSS.getSheetByName(sheetName);
    if (!sheet) continue;
    var year = Number(yr);
    // BCT data: rows 9-20 (same layout as current sheet)
    var bctRows = sheet.getRange('A9:T20').getValues();
    var bct = [];
    for (var i = 0; i < bctRows.length; i++) {
      var r = bctRows[i];
      var m = String(r[1] || '').trim();
      if (!m) continue;
      bct.push({
        m: m, tc: Number(r[2]) || 0, ac: Number(r[3]) || 0,
        td: Number(r[5]) || 0, ad: Number(r[8]) || 0,
        ins: Number(r[6]) || 0, cashT: Number(r[7]) || 0, cashA: Number(r[14]) || 0,
        isz: Number(r[10]) || 0, opk: Number(r[11]) || 0,
        sdn: Number(r[12]) || 0, big: Number(r[13]) || 0
      });
    }
    // Finance data: rows 91-102
    var finRows = sheet.getRange('A91:N102').getValues();
    var fin = [];
    for (var i = 0; i < finRows.length; i++) {
      var r = finRows[i];
      var m = String(r[1] || '').trim();
      if (!m) continue;
      var rA = Number(r[3]) || 0;
      var sal = Number(r[6]) || 0;
      var pts = Number(r[7]) || 0;
      var gm = Number(r[9]) || 0;
      var ad = 0;
      // Find matching BCT ad for per-car calc
      for (var bi = 0; bi < bct.length; bi++) {
        if (bct[bi].m === m || bct[bi].m.replace('.','') === m.replace('.','')) {
          ad = bct[bi].ad; break;
        }
      }
      fin.push({
        m: m, rT: Number(r[2]) || 0, rA: rA,
        sal: sal, pts: pts, gm: gm,
        rpC: ad > 0 ? Math.round(sal / ad) : 0,
        spC: ad > 0 ? Math.round(pts / ad) : 0
      });
    }
    result[year] = { bct: bct, fin: fin };
  }
  // Also read channel data from 2025 sheet for YoY comparison
  if (result[2025]) {
    var sh2025 = histSS.getSheetByName('2025');
    if (sh2025) {
      try {
        var chNamesRow = sh2025.getRange('B108:Y108').getValues()[0];
        var chNames = [], chIdx = [];
        for (var ci = 0; ci < chNamesRow.length; ci++) {
          var cv2 = String(chNamesRow[ci]).trim();
          if (cv2 && cv2 !== 'รวม' && cv2 !== 'ช่องทางonline' && cv2 !== 'เดือน/ช่องทาง') {
            chNames.push(cv2); chIdx.push(ci);
          }
        }
        var chMonthly = sh2025.getRange('B109:Y120').getValues();
        var chData = [];
        for (var ci2 = 0; ci2 < chNames.length; ci2++) {
          var col = chIdx[ci2];
          var arr = [];
          for (var mi = 0; mi < chMonthly.length; mi++) {
            arr.push(Number(chMonthly[mi][col]) || 0);
          }
          chData.push({ name: chNames[ci2], monthly: arr });
        }
        var chML = chMonthly.map(function(r){return String(r[0]||'');}).filter(function(m){return m;});
        result[2025].ch = { ch: chData, names: chNames, monthLabels: chML };
      } catch(e2) { /* skip channel hist if error */ }
    }
  }
  cs(k, result);
  return cv(k);
}

/* ─── DTA ─── */
function getDTAData() {
  var k = 'dta';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  var brandRow = sh.getRange('C182:U182').getValues()[0];
  var brands = brandRow.map(function(v){return String(v).trim();}).filter(function(v){return v;});
  var monthlyRows = sh.getRange('B183:U194').getValues();
  var months = [];
  for (var i = 0; i < monthlyRows.length; i++) {
    var r = monthlyRows[i]; var m = String(r[0]||'').trim();
    if (!m) continue;
    var brandData = {};
    for (var j = 0; j < brands.length; j++) { brandData[brands[j]] = Number(r[j+1]) || 0; }
    months.push({ month: m, brands: brandData });
  }
  var cumBrands = {};
  for (var b = 0; b < brands.length; b++) { cumBrands[brands[b]] = months.reduce(function(s,m){return s+(m.brands[brands[b]]||0);},0); }
  cs(k, { brands: brands, months: months, cumBrands: cumBrands });
  return cv(k);
}

/* ─── Repair Type Data (เบา/กลาง/หนัก) ─── */
function getRepairTypeData() {
  var k = 'rtype';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  // Rows 71-82: monthly data (B=month, C=light_qty, D=mid_qty, E=heavy_qty, F=total_qty, G=light_sal, H=mid_sal, I=heavy_sal, J=total_sal, K=light_pts, L=mid_pts, M=heavy_pts, N=total_pts)
  var rows = sh.getRange('A71:N83').getValues();
  var monthly = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var m = String(r[1] || '').trim();
    if (!m) continue;
    var totalQty = Number(r[5]) || 0;
    if (totalQty === 0) continue; // skip empty months
    monthly.push({
      m: m,
      lq: Number(r[2]) || 0, mq: Number(r[3]) || 0, hq: Number(r[4]) || 0, tq: totalQty,
      ls: Number(r[6]) || 0, ms: Number(r[7]) || 0, hs: Number(r[8]) || 0, ts: Number(r[9]) || 0,
      lp: Number(r[10]) || 0, mp: Number(r[11]) || 0, hp: Number(r[12]) || 0, tp: Number(r[13]) || 0
    });
  }
  cs(k, { monthly: monthly });
  return cv(k);
}

/* ─── Service Mix Summary (เบี้ยห้าง/อู่/เงินสด/อีซูซู/ต่างยี่ห้อ) ─── */
function getServiceMixData() {
  var k = 'smix';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  // Row 278: headers (C=ประเภท, D=ปี2024, E=ปี2025, F=ปี2026)
  // Rows 279-288: data
  var rows = sh.getRange('C278:J288').getValues();
  var categories = [];
  for (var i = 1; i < rows.length; i++) { // skip header row
    var r = rows[i];
    var label = String(r[0] || '').trim();
    if (!label) continue;
    categories.push({
      label: label,
      y2024: Number(r[1]) || 0,
      y2025: Number(r[2]) || 0,
      y2026: Number(r[3]) || 0
    });
  }
  cs(k, { categories: categories });
  return cv(k);
}
function getDailyData() {
  var k = 'daily';
  var c = cv(k); if (c) return c;
  var sh = getSh();
  cs(k, { date: String(sh.getRange('I1').getValue()||'') });
  return cv(k);
}

/* ─── Monitor (แท็บ Monitor E182:X217) ─── */
function getMonitorData() {
  var k = 'monitor';
  var c = cv(k); if (c) return c;
  // Read from Monitor tab (gid=1645350915)
  var ss = SpreadsheetApp.openById(SS_KEY);
  var sh = ss.getSheetByName('Monitor');
  if (!sh) {
    // Try by GID
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === 1645350915) { sh = sheets[i]; break; }
    }
  }
  if (!sh) { cs(k, {err: 'Monitor sheet not found'}); return cv(k); }
  
  // Read range E182:X217 (rows 182-217, columns E-X)
  var rows = sh.getRange('E182:X217').getValues();
  
  var months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  
  // Helper: parse number from potentially formatted string like "3,409" or "#DIV/0!"
  function pn(v) {
    if (v === null || v === undefined || v === '' || v === '#DIV/0!' || v === 'N/A') return null;
    if (typeof v === 'number') return v;
    var s = String(v).replace(/,/g, '').replace(/%/g, '').trim();
    var n = Number(s);
    return isNaN(n) ? null : n;
  }
  
  // Helper: parse percentage string like "33%" or 0.33
  function pp(v) {
    if (v === null || v === undefined || v === '' || v === 'N/A') return null;
    if (typeof v === 'number') return v; // already a decimal
    var s = String(v).replace(/,/g, '').trim();
    if (s === '#DIV/0!') return null;
    if (s.indexOf('%') >= 0) { return Number(s.replace('%','')) / 100; }
    var n = Number(s);
    return isNaN(n) ? null : n;
  }

  // Map the rows (CSV output indexed from row 1=header)
  // Row 1: ยอดรถส่งมอบงานซ่อมทำสี header
  // Row 2: data header row (ทำได้ 2567, เป้าหมาย 2568, ...)
  // Row 3: ยอดรถรวม
  // Row 4: อีซูซู
  // Row 5: ต่างยี่ห้อ
  // Row 6: รถใหญ่
  // Row 7: ลูกค้าเงินสด
  // Row 8: ค่าแรง/คัน
  // Row 9: ค่าอะไหล่/คัน
  // Row 10: รายได้งานซ่อม header
  // Row 11: GM ค่าแรง
  // Row 12: ยอดอะไหล่(รวมประกันจัด)
  // Row 13: GM อะไหล่ (ในงบ)
  // Row 14: เคลือบแก้ว header
  // Row 15: ยอดรถ (คัน)
  // Row 16: GM รวม(บาท)
  // Row 17: GM/คัน
  // Row 18: ผลิตภัณฑ์เสริม header
  // Row 19: GM รวม
  // Row 20: GM/ คัน
  // Row 21: เชนโมเดล header
  // Row 22: GM ค่าแรง
  // Row 23: GM /คัน
  // Row 24: แสวงหา/สัมพันธ์ header
  // Row 25: โหลด MAPP (URL in col E)
  // Row 26: สร้างกลุ่มรับใช้ (URL in col E)
  // Row 27: ปิด online
  // Row 28: ปิด AI
  // Row 29: ปิด ตรวจเช็คคุณภาพสี
  // Row 30: ปิด MR SA
  // Row 31: ส่งมอบ เชิงรุก
  // Row 32: AI ตรวจรถรอบคัน header
  // Row 33: เปิดเคลม
  // Row 34: เข้าซ่อม
  // Row 35: ส่งมอบ
  
  var d = {};
  
  // Section: ยอดส่งมอบ (คัน) — rows index 2-8 (0-based)
  d.delivery = {};
  d.delivery.total = { thai67: pn(rows[2][1]), target68: pn(rows[2][2]), diff: pn(rows[2][3]), changePct: pp(rows[2][4]), cumPct: pp(rows[2][5]), cum68: pn(rows[2][6]), monthly: [] };
  d.delivery.isuzu = { thai67: pn(rows[3][1]), target68: pn(rows[3][2]), diff: pn(rows[3][3]), changePct: pp(rows[3][4]), cumPct: pp(rows[3][5]), cum68: pn(rows[3][6]), monthly: [] };
  d.delivery.otherBrand = { thai67: pn(rows[4][1]), target68: pn(rows[4][2]), monthly: [] };
  d.delivery.bigTruck = { thai67: pn(rows[5][1]), target68: pn(rows[5][2]), monthly: [] };
  d.delivery.cash = { thai67: pn(rows[6][1]), target68: pn(rows[6][2]), monthly: [] };
  d.delivery.laborPerCar = { thai67: pn(rows[7][1]), target68: pn(rows[7][2]), monthly: [] };
  d.delivery.partsPerCar = { thai67: pn(rows[8][1]), target68: pn(rows[8][2]), monthly: [] };
  
  // Monthly data for delivery (columns 7-17 = index 7 through 17 = month data)
  for (var mi = 0; mi < 12; mi++) {
    var ci = 7 + mi;
    d.delivery.total.monthly.push(pn(rows[2][ci]));
    d.delivery.isuzu.monthly.push(pn(rows[3][ci]));
    d.delivery.otherBrand.monthly.push(pn(rows[4][ci]));
    d.delivery.bigTruck.monthly.push(pn(rows[5][ci]));
    d.delivery.cash.monthly.push(pn(rows[6][ci]));
    d.delivery.laborPerCar.monthly.push(pn(rows[7][ci]));
    d.delivery.partsPerCar.monthly.push(pn(rows[8][ci]));
  }
  
  // Section: รายได้งานซ่อม — rows index 10-12
  d.revenue = {};
  d.revenue.laborGM = { thai67: pn(rows[10][1]), target68: pn(rows[10][2]), diff: pn(rows[10][3]), changePct: pp(rows[10][4]), cumPct: pp(rows[10][5]), cum68: pn(rows[10][6]), monthly: [] };
  d.revenue.partsTotal = { thai67: pn(rows[11][1]), target68: pn(rows[11][2]), diff: pn(rows[11][3]), changePct: pp(rows[11][4]), cumPct: pp(rows[11][5]), cum68: pn(rows[11][6]), monthly: [] };
  d.revenue.partsGM = { thai67: pn(rows[12][1]), target68: pn(rows[12][2]), diff: pn(rows[12][3]), changePct: pp(rows[12][4]), cumPct: pp(rows[12][5]), cum68: pn(rows[12][6]), monthly: [] };
  for (var mi = 0; mi < 12; mi++) {
    d.revenue.laborGM.monthly.push(pn(rows[10][7+mi]));
    d.revenue.partsTotal.monthly.push(pn(rows[11][7+mi]));
    d.revenue.partsGM.monthly.push(pn(rows[12][7+mi]));
  }
  
  // Section: เคลือบแก้ว — rows index 14-16
  d.glassCoat = {};
  d.glassCoat.cars = { thai67: pn(rows[14][1]), target68: pn(rows[14][2]), monthly: [] };
  d.glassCoat.gmTotal = { thai67: pn(rows[15][1]), target68: pn(rows[15][2]), monthly: [] };
  d.glassCoat.gmPerCar = { thai67: pn(rows[16][1]), target68: pn(rows[16][2]), monthly: [] };
  for (var mi = 0; mi < 12; mi++) {
    d.glassCoat.cars.monthly.push(pn(rows[14][7+mi]));
    d.glassCoat.gmTotal.monthly.push(pn(rows[15][7+mi]));
    d.glassCoat.gmPerCar.monthly.push(pn(rows[16][7+mi]));
  }
  
  // Section: ผลิตภัณฑ์เสริม — rows index 18-19
  d.supplement = {};
  d.supplement.gmTotal = { thai67: pn(rows[18][1]), target68: pn(rows[18][2]), diff: pn(rows[18][3]), changePct: pp(rows[18][4]), cumPct: pp(rows[18][5]), cum68: pn(rows[18][6]), monthly: [] };
  d.supplement.gmPerCar = { thai67: pn(rows[19][1]), target68: pn(rows[19][2]), monthly: [] };
  for (var mi = 0; mi < 12; mi++) {
    d.supplement.gmTotal.monthly.push(pn(rows[18][7+mi]));
    d.supplement.gmPerCar.monthly.push(pn(rows[19][7+mi]));
  }
  
  // Section: เชนโมเดล (เชียร์เคลมเพิ่ม) — rows index 21-22
  d.chainModel = {};
  d.chainModel.laborGM = { thai67: pn(rows[21][1]), target68: pn(rows[21][2]), diff: pn(rows[21][3]), changePct: pp(rows[21][4]), cumPct: pp(rows[21][5]), cum68: pn(rows[21][6]), monthly: [] };
  d.chainModel.gmPerCar = { thai67: pn(rows[22][1]), target68: pn(rows[22][2]), monthly: [] };
  for (var mi = 0; mi < 12; mi++) {
    d.chainModel.laborGM.monthly.push(pn(rows[21][7+mi]));
    d.chainModel.gmPerCar.monthly.push(pn(rows[22][7+mi]));
  }
  
  // Section: แสวงหา/สัมพันธ์/ใกล้ชิด/รับใช้ — rows index 24-30
  d.crse = {};
  // Row 24: header, skip
  // Row 25: โหลด MAPP (score format like "82/96") — special handling
  // Row 26: สร้างกลุ่มรับใช้ (cumPct in col5, cum68 in col6, monthly in col7+)
  d.crse.loadMAPP = { monthly: [] };
  d.crse.createGroup = { target68: pn(rows[25][2]), cumPct64: pp(rows[25][5]), cum68: pn(rows[25][6]), monthly: [] };
  d.crse.closeOnline = { thai67: pn(rows[26][1]), target68: pn(rows[26][2]), monthly: [] };
  d.crse.closeAI = { thai67: pn(rows[27][1]), target68: pn(rows[27][2]), monthly: [] };
  d.crse.closePaintQC = { thai67: pn(rows[28][1]), target68: pn(rows[28][2]), monthly: [] };
  d.crse.closeMRSA = { thai67: pn(rows[29][1]), target68: pn(rows[29][2]), monthly: [] };
  d.crse.proactiveDelivery = { thai67: pn(rows[30][1]), target68: pn(rows[30][2]), monthly: [] };
  
  // Parse MAPP scores (format "82/96")
  for (var mi = 0; mi < 12; mi++) {
    var val = rows[24][7+mi];
    if (val !== null && val !== undefined && String(val).indexOf('/') >= 0) {
      d.crse.loadMAPP.monthly.push(String(val));
    } else {
      d.crse.loadMAPP.monthly.push(null);
    }
    d.crse.createGroup.monthly.push(pn(rows[25][7+mi]));
    d.crse.closeOnline.monthly.push(pn(rows[26][7+mi]));
    d.crse.closeAI.monthly.push(pn(rows[27][7+mi]));
    d.crse.closePaintQC.monthly.push(pn(rows[28][7+mi]));
    d.crse.closeMRSA.monthly.push(pn(rows[29][7+mi]));
    d.crse.proactiveDelivery.monthly.push(pn(rows[30][7+mi]));
  }
  
  // Section: AI ตรวจรถรอบคัน — rows index 32-34
  d.aiInspect = {};
  d.aiInspect.openClaim = { thai67: pn(rows[32][1]), target68: pn(rows[32][2]), monthly: [] };
  d.aiInspect.enterRepair = { thai67: pn(rows[33][1]), target68: pn(rows[33][2]), monthly: [] };
  d.aiInspect.delivered = { thai67: pn(rows[34][1]), target68: pn(rows[34][2]), monthly: [] };
  for (var mi = 0; mi < 6; mi++) { // Only 6 months available for AI inspect
    d.aiInspect.openClaim.monthly.push(pn(rows[32][7+mi]));
    d.aiInspect.enterRepair.monthly.push(pn(rows[33][7+mi]));
    d.aiInspect.delivered.monthly.push(pn(rows[34][7+mi]));
  }
  
  cs(k, d);
  return cv(k);
}


// Helper: convert 1-based column index to letter(s)
function columnToLetter(col) {
  var temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter;
}
