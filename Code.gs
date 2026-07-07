/* PMG Debt Monitor - GAS Backend v16
   v14 changes:
   - "เกินวงเงิน" column now shows: total outstanding - limit with +/- sign
     + (เกิน) = red, - (ไม่เกิน) = green
   - Each aging column also shows vs limit: e.g. "548,616 / 2,451,384-" 
     where the second number = aging amount subtracted from remaining limit
   - Chart changed to horizontal bar showing % used vs limit, with 100% line
   - Status verification: badge logic cross-checked with data
*/
var SS_ID = '1F4Y_bhBkEqdA_4pomwz4i-BmJvNf3bP-AY1Y7h-hP3M';
var SHEET_NAME = 'สรุปลูกหนี้ 69';
var DAILY_SHEET = 'สรุปรายวัน';

function doGet(e) {
  var maskData = true;
  if (e && e.parameter && e.parameter.maskData === 'false') maskData = false;

  if (e && e.parameter && e.parameter.api === '1') {
    var data = getDebtData();
    if (maskData) data = applyMasking_(data);
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.daily === '1') {
    var summary = generateDailySummary();
    if (maskData) summary.text = maskDetailText_(summary.text);
    return ContentService.createTextOutput(summary.text)
      .setMimeType(ContentService.MimeType.PLAIN_TEXT);
  }
  if (e && e.parameter && e.parameter.save === '1') {
    var result = saveDailySummary();
    return ContentService.createTextOutput(JSON.stringify({status:'ok', date:result.date}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && (e.parameter.read === '1' || e.parameter.tab)) {
    return readChecklistData(e);
  }
  if (e && e.parameter && e.parameter.checklist === '1') {
    return serveChecklist(maskData);
  }

  var data = getDebtData();
  if (maskData) data = applyMasking_(data);
  var dailySummaries = getDailySummaries();
  var html = buildHtml(data, dailySummaries);
  return HtmlService.createHtmlOutput(html)
    .setTitle('PMG Debt Monitor');
}

function pn(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  var s = v.toString().replace(/,/g, '').replace(/บาท/g, '').trim();
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}

// ===== PDPA Masking =====
var PDPA_BADGE = '<span style="position:fixed;top:8px;right:16px;background:#dc2626;color:white;font-size:.65rem;padding:3px 8px;border-radius:10px;font-weight:700;letter-spacing:.5px;z-index:9999;box-shadow:0 2px 8px rgba(220,38,38,.3)">🔒 PDPA ข้อมูลลับ</span>';
var PDPA_FOOTER = '<div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;text-align:center;font-size:.7rem;padding:4px 0;font-weight:700;letter-spacing:1px;z-index:9999">⛔ ข้อมูลลับ — ห้ามเผยแพร่ หรือ ส่งออกโดยไม่ได้รับอนุญาต (PDPA)</div>';

function maskName_(name) {
  if (!name || typeof name !== 'string') return name;
  var trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  var isThai = /[\u0E00-\u0E7F]/.test(trimmed);
  var mask = isThai ? '\u25CF\u25CF' : '***';
  var words = trimmed.split(/\s+/);
  var masked = words.map(function(w) {
    if (w.length <= 2) return w;
    return w.substring(0, 2) + mask;
  });
  return masked.join(' ');
}

function maskNamesRecursive_(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      if (obj[i] && typeof obj[i] === 'object') maskNamesRecursive_(obj[i]);
    }
  } else {
    for (var key in obj) {
      if (key === 'name' && typeof obj[key] === 'string') {
        obj[key] = maskName_(obj[key]);
      } else if (obj[key] && typeof obj[key] === 'object') {
        maskNamesRecursive_(obj[key]);
      }
    }
  }
}

function applyMasking_(data) {
  var cloned = JSON.parse(JSON.stringify(data));
  maskNamesRecursive_(cloned);
  return cloned;
}

function maskDetailText_(text) {
  if (!text || typeof text !== 'string') return text;
  var parts = text.split(', ');
  var masked = parts.map(function(p) {
    // Handle "Name:100%" format
    var idx = p.lastIndexOf(':');
    if (idx > 0) {
      return maskName_(p.substring(0, idx)) + p.substring(idx);
    }
    // Handle "Name 100%" format (daily summary item lists)
    var pctMatch = p.match(/^(.+?)\s+(\d+%)/);
    if (pctMatch) {
      return maskName_(pctMatch[1]) + ' ' + pctMatch[2];
    }
    return maskName_(p);
  });
  return masked.join(', ');
}

function getDebtData() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var values = sheet.getRange('A1:M44').getValues();
  
  var result = {
    timestamp: new Date().toISOString(),
    summary: {},
    invoiceSection: {
      limit: 0,
      riskFromOverLimit: 0,
      items: [],
      total: {}
    },
    insuranceSection: {
      headers: [],
      items: [],
      total: {},
      overdueInterest: 0
    },
    bottomSummary: {}
  };
  
  result.summary = {
    notYetDueAmount: pn(values[2][3]),
    overdueAmount: pn(values[3][3]),
    totalDebt: pn(values[4][3])
  };
  
  result.invoiceSection = {
    limit: pn(values[8][0]),
    riskFromOverLimit: pn(values[8][1]),
    items: [],
    total: {}
  };
  
  result.invoiceSection.items.push({
    name: values[9][2],
    limit: pn(values[9][0]),
    riskFromOver: pn(values[9][1]),
    aging: { '1-30': pn(values[9][3]), '31-60': pn(values[9][4]), '61-90': pn(values[9][5]), '90+': pn(values[9][6]) },
    dailyInterest: 0, overdueDays: ''
  });
  result.invoiceSection.items.push({
    name: values[10][2],
    limit: pn(values[10][0]),
    riskFromOver: pn(values[10][1]),
    aging: { '1-30': pn(values[10][3]), '31-60': pn(values[10][4]), '61-90': pn(values[10][5]), '90+': pn(values[10][6]) },
    dailyInterest: 0, overdueDays: ''
  });
  result.invoiceSection.items.push({
    name: values[11][2],
    limit: pn(values[11][0]),
    riskFromOver: pn(values[11][1]),
    aging: { '1-30': pn(values[11][3]), '31-60': pn(values[11][4]), '61-90': pn(values[11][5]), '90+': pn(values[11][6]) },
    dailyInterest: 0, overdueDays: ''
  });
  result.invoiceSection.total = {
    name: values[12][2],
    limit: pn(values[12][0]),
    riskFromOver: pn(values[12][1]),
    aging: { '1-30': pn(values[12][3]), '31-60': pn(values[12][4]), '61-90': pn(values[12][5]), '90+': pn(values[12][6]) },
    dailyInterest: 0, overdueDays: ''
  };
  
  for (var i = 19; i <= 38; i++) {
    if (values[i][2] && values[i][2].toString().trim() !== '') {
      result.insuranceSection.items.push({
        name: values[i][2],
        limit: pn(values[i][0]),
        riskFromOver: pn(values[i][1]),
        aging: { '1-30': pn(values[i][3]), '31-60': pn(values[i][4]), '61-90': pn(values[i][5]), '90+': pn(values[i][6]) },
        dailyInterest: pn(values[i][7]),
        overdueDays: values[i][8]
      });
    }
  }
  
  result.insuranceSection.total = {
    name: values[39][2],
    limit: pn(values[39][0]),
    riskFromOver: pn(values[39][1]),
    aging: { '1-30': pn(values[39][3]), '31-60': pn(values[39][4]), '61-90': pn(values[39][5]), '90+': pn(values[39][6]) },
    dailyInterest: pn(values[39][7]),
    overdueDays: values[39][8]
  };
  
  result.insuranceSection.overdueInterest = pn(values[40][9]);
  
  result.bottomSummary = {
    limitLabel: values[42][1],
    usedLimit: pn(values[43][2]),
    riskFromOver: pn(values[43][3]),
    totalLimit: pn(values[43][1])
  };
  
  return result;
}

// Get last N daily summaries from sheet
function getDailySummaries(count) {
  if (!count) count = 7;
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(DAILY_SHEET);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var startRow = Math.max(2, lastRow - count + 1);
  var numRows = lastRow - startRow + 1;
  var rows = sheet.getRange(startRow, 1, numRows, 12).getValues();
  var results = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0]) {
      results.push({
        date: rows[i][0].toString ? rows[i][0].toString() : rows[i][0],
        totalDebt: Number(rows[i][1]) || 0,
        overdue: Number(rows[i][2]) || 0,
        notYetDue: Number(rows[i][3]) || 0,
        totalLimit: Number(rows[i][4]) || 0,
        limitPct: Number(rows[i][5]) || 0,
        totalOver: Number(rows[i][6]) || 0,
        countOk: Number(rows[i][7]) || 0,
        countWarn: Number(rows[i][8]) || 0,
        countAlert: Number(rows[i][9]) || 0,
        countDanger: Number(rows[i][10]) || 0,
        detail: rows[i][11] || ''
      });
    }
  }
  return results;
}

function fmtJs(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'ล้าน';
  if (n >= 1e5) return (n/1e5).toFixed(1) + 'แสน';
  if (n >= 1e4) return (n/1e4).toFixed(1) + 'หมื่น';
  if (n >= 1e3) return Math.round(n/1e3) + ',' + String(Math.round(n%1e3));
  return n.toFixed(0);
}

function fmtNumJs(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('th-TH');
}

function getOutstanding(item) {
  return item.aging['1-30'] + item.aging['31-60'] + item.aging['61-90'] + item.aging['90+'];
}

// Badge with % and 4 tiers
function getBadge(limit, outstanding) {
  if (!limit || limit === 0) {
    if (outstanding > 0) return '<span class="badge badge-danger">เกินวงเงิน ' + Math.round(outstanding / outstanding * 100) + '%</span>';
    return '<span class="badge badge-ok">ปลอดภัย</span>';
  }
  var pct = Math.round(outstanding / limit * 100);
  if (pct <= 70) return '<span class="badge badge-ok">ในวงเงิน ' + pct + '%</span>';
  if (pct <= 80) return '<span class="badge badge-warn">เสี่ยง ' + pct + '%</span>';
  if (pct <= 100) return '<span class="badge badge-alert">เฝ้าระวัง ' + pct + '%</span>';
  return '<span class="badge badge-danger">เกินวงเงิน ' + pct + '%</span>';
}

function getRiskColor(limit, outstanding) {
  if (!limit || limit === 0) return outstanding > 0 ? '#c62828' : '#2e7d32';
  var pct = outstanding / limit * 100;
  if (pct <= 70) return '#2e7d32';
  if (pct <= 80) return '#e65100';
  if (pct <= 100) return '#f9a825';
  return '#c62828';
}

function buildHtml(data, dailySummaries) {
  var s = data.summary;
  var inv = data.invoiceSection;
  var ins = data.insuranceSection;
  var bs = data.bottomSummary;
  
  // Calculate overall totals
  var allItems = [];
  for (var ii = 0; ii < inv.items.length; ii++) {
    allItems.push({ name: inv.items[ii].name, limit: inv.items[ii].limit, outstanding: getOutstanding(inv.items[ii]), aging: inv.items[ii].aging, dailyInterest: inv.items[ii].dailyInterest || 0, overdueDays: inv.items[ii].overdueDays || '', section: 'inv' });
  }
  for (var jj = 0; jj < ins.items.length; jj++) {
    allItems.push({ name: ins.items[jj].name, limit: ins.items[jj].limit, outstanding: getOutstanding(ins.items[jj]), aging: ins.items[jj].aging, dailyInterest: ins.items[jj].dailyInterest || 0, overdueDays: ins.items[jj].overdueDays || '', section: 'ins' });
  }
  
  // Summary cards
  var totalAllOutstanding = 0;
  for (var k = 0; k < allItems.length; k++) { totalAllOutstanding += allItems[k].outstanding; }
  var totalOver = totalAllOutstanding - bs.totalLimit;
  var totalOverStr = totalOver > 0 ? '+' + fmtNumJs(totalOver) : fmtNumJs(totalOver);
  var totalOverColor = totalOver > 0 ? '#c62828' : '#2e7d32';
  
  var bsPct = bs.totalLimit > 0 ? Math.min(150, Math.round(bs.usedLimit / bs.totalLimit * 100)) : 0;
  var bsRiskColor = '#2e7d32';
  if (bsPct > 100) bsRiskColor = '#c62828';
  else if (bsPct > 80) bsRiskColor = '#f9a825';
  else if (bsPct > 70) bsRiskColor = '#e65100';
  
  var totalDebtStr = fmtJs(s.totalDebt);
  var overdueStr = fmtJs(s.overdueAmount);
  var notYetDueStr = fmtJs(s.notYetDueAmount);
  var totalLimitStr = fmtJs(bs.totalLimit);
  var usedLimitStr = fmtJs(bs.usedLimit);
  var remainLimitStr = fmtJs(bs.totalLimit - bs.usedLimit);
  
  var cardsHtml = '';
  cardsHtml += '<div class="card"><h3>รวมลูกหนี้ทั้งหมด</h3><div class="value red">' + totalDebtStr + ' บาท</div><div class="sub">เกินดิว ' + overdueStr + ' บาท</div></div>';
  cardsHtml += '<div class="card"><h3>ลูกหนี้ยังไม่ครบกำหนด</h3><div class="value blue">' + notYetDueStr + ' บาท</div><div class="sub">1-30 วัน</div></div>';
  cardsHtml += '<div class="card"><h3>วงเงินกำกับความเสี่ยง</h3><div class="value" style="color:' + bsRiskColor + '">' + totalLimitStr + ' บาท</div><div class="sub">ใช้ไป ' + usedLimitStr + ' | <span style="color:' + totalOverColor + '">เกินวงเงิน ' + totalOverStr + '</span></div><div class="risk-bar"><div class="fill" style="width:' + Math.min(100, bsPct) + '%;background:' + bsRiskColor + ';"></div><div class="bar-marker" style="left:70%"></div><div class="bar-marker warn80" style="left:80%"></div><div class="bar-marker" style="left:100%"></div></div><div class="bar-labels"><span>0%</span><span>70%</span><span>80%</span><span>100%</span></div></div>';
  
  // Build table - NEW: "เกินกำหนด" column shows outstanding per aging bucket minus credit limit
  // เกินกำหนด = total outstanding - limit: ถ้า +เกิน (แดง), -ไม่เกิน (เขียว)
  // Single unified table: ใบแจ้งหนี้ + ประกันภัย รวมกัน
  var tableHtml = '<table><tr><th>รายการ</th><th class="nr">วงเงิน</th><th class="nr">1-30วัน<br><small>(สะสม-วงเงิน)</small></th><th class="nr">31-60วัน<br><small>(สะสม-วงเงิน)</small></th><th class="nr">61-90วัน<br><small>(สะสม-วงเงิน)</small></th><th class="nr">&gt;90วัน<br><small>(สะสม-วงเงิน)</small></th><th class="nr">ลูกหนี้รวม</th><th class="nr">เกินวงเงิน</th><th class="nr">ดอกเบี้ย/วัน</th><th>วันเกิน</th><th>สถานะ</th></tr>';
  
  // Invoice items (light blue background)
  for (var a = 0; a < inv.items.length; a++) {
    tableHtml += buildRow(inv.items[a], false, false, 'inv');
  }
  // Invoice total
  tableHtml += buildRow(inv.total, false, true, 'inv');
  
  // Insurance items
  for (var b = 0; b < ins.items.length; b++) {
    tableHtml += buildRow(ins.items[b], true, false, 'ins');
  }
  // Insurance total
  tableHtml += buildRow(ins.total, true, true, 'ins');
  
  // Overdue interest
  if (ins.overdueInterest > 0) {
    tableHtml += '<tr><td colspan="11" style="text-align:right;color:#c62828;font-weight:bold">ยอดรับผิดชอบดอกเบี้ยเกินดิว: ' + fmtNumJs(ins.overdueInterest) + ' บาท</td></tr>';
  }
  tableHtml += '</table>';
  
  // Chart data - stacked bar: within limit (green) + over limit (red) + วงเงิน line
  var chartNames = [];
  var chartWithins = [];
  var chartOvers = [];
  var chartLimits = [];
  var chartPcts = [];
  for (var c = 0; c < ins.items.length; c++) {
    var ci = ins.items[c];
    var cOut = getOutstanding(ci);
    var cLimit = ci.limit > 0 ? ci.limit : 1;
    var withinAmt = Math.min(cOut, cLimit);
    var overAmt = Math.max(0, cOut - cLimit);
    chartNames.push(maskName_(ci.name));
    chartWithins.push(withinAmt);
    chartOvers.push(overAmt);
    chartLimits.push(ci.limit);
    chartPcts.push(ci.limit > 0 ? Math.round(cOut / ci.limit * 100) : 0);
  }
  var chartDataJson = JSON.stringify({ names: chartNames, withins: chartWithins, overs: chartOvers, limits: chartLimits, pcts: chartPcts });
  
  // Build daily summary section (last 7 days)
  var dailySummaryHtml = '';
  if (dailySummaries && dailySummaries.length > 0) {
    dailySummaryHtml += '<div class="section"><div class="section-title">สรุปรายวัน (7 วันล่าสุด)</div>';
    dailySummaryHtml += '<div class="table-wrap"><table><tr><th>วันที่</th><th class="nr">ลูกหนี้รวม</th><th class="nr">เกินดิว</th><th class="nr">วงเงินกำกับ</th><th class="nr">ใช้ไป%</th><th class="nr">เกินวงเงิน</th><th>สถานะ</th><th>รายละเอียด</th></tr>';
    for (var d = dailySummaries.length - 1; d >= 0; d--) {
      var ds = dailySummaries[d];
      var statusEmoji = '✅';
      if (ds.countDanger > 0) statusEmoji = '🔴';
      else if (ds.countAlert > 0) statusEmoji = '🟡';
      else if (ds.countWarn > 0) statusEmoji = '🟠';
      dailySummaryHtml += '<tr><td>' + ds.date + '</td><td class="nr">' + fmtNumJs(ds.totalDebt) + '</td><td class="nr" style="color:#c62828">' + fmtNumJs(ds.overdue) + '</td><td class="nr">' + fmtNumJs(ds.totalLimit) + '</td><td class="nr">' + ds.limitPct + '%</td><td class="nr" style="color:' + (ds.totalOver > 0 ? '#c62828' : '#2e7d32') + '">' + (ds.totalOver > 0 ? '+' + fmtNumJs(ds.totalOver) : fmtNumJs(Math.abs(ds.totalOver))) + '</td><td>' + statusEmoji + ' เตือน' + ds.countDanger + ' เฝ้าระวัง' + ds.countAlert + ' เสี่ยง' + ds.countWarn + ' ปลอดภัย' + ds.countOk + '</td><td style="font-size:0.7rem">' + maskDetailText_(ds.detail) + '</td></tr>';
    }
    dailySummaryHtml += '</table></div></div>';
  }
  
  var html = '<!DOCTYPE html><html><head><base target="_top"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PMG Debt Monitor</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js">' + '</' + 'script><script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js">' + '</' + 'script><style>' +
    '* { margin:0; padding:0; box-sizing:border-box; }' +
    'body { font-family:"Segoe UI",Tahoma,sans-serif; background:#f0f4f8; color:#333; min-height:100vh; padding-bottom:28px; }' +
    '.container { max-width:1200px; margin:0 auto; padding:14px; }' +
    'h1 { text-align:center; font-size:1.3rem; color:#1a237e; margin:4px 0; }' +
    '.subtitle { text-align:center; font-size:0.8rem; color:#666; margin-bottom:14px; }' +
    '.top-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }' +
    '.card { background:#fff; border-radius:12px; padding:16px; border:1px solid #e0e0e0; box-shadow:0 2px 8px rgba(0,0,0,0.06); }' +
    '.card h3 { font-size:0.75rem; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; }' +
    '.card .value { font-size:1.4rem; font-weight:bold; }' +
    '.card .sub { font-size:0.7rem; color:#999; margin-top:2px; }' +
    '.green { color:#2e7d32; } .orange { color:#e65100; } .red { color:#c62828; } .blue { color:#1565c0; }' +
    '.section { margin-bottom:16px; }' +
    '.section-title { font-size:0.95rem; font-weight:bold; color:#1a237e; margin-bottom:8px; padding-bottom:4px; border-bottom:2px solid #1a237e; }' +
    '.risk-bar { height:8px; border-radius:4px; background:#e0e0e0; overflow:hidden; margin-top:4px; position:relative; }' +
    '.risk-bar .fill { height:100%; border-radius:4px; }' +
    '.bar-marker { position:absolute; top:0; bottom:0; width:1px; background:#e65100; opacity:0.6; }' +
    '.bar-marker.warn80 { background:#f9a825; }' +
    '.bar-labels { display:flex; justify-content:space-between; font-size:0.55rem; color:#999; margin-top:1px; }' +
    'table { width:100%; border-collapse:collapse; font-size:0.78rem; background:#fff; }' +
    'th { background:#e8eaf6; color:#1a237e; padding:7px 5px; text-align:left; border-bottom:2px solid #1a237e; font-size:0.7rem; }' +
    'th small { font-weight:normal; color:#888; }' +
    'td { padding:6px 5px; border-bottom:1px solid #eee; }' +
    'tr:hover { background:#f5f5ff; }' +
    '.nr { text-align:right; font-family:"Courier New",monospace; }' +
    '.badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:0.65rem; font-weight:bold; white-space:nowrap; }' +
    '.badge-ok { background:#e8f5e9; color:#2e7d32; } .badge-warn { background:#fff3e0; color:#e65100; } .badge-alert { background:#fff9c4; color:#f57f17; font-weight:bold; } .badge-danger { background:#ffebee; color:#c62828; }' +
    '.table-wrap { background:#fff; border-radius:12px; padding:10px; border:1px solid #e0e0e0; overflow:auto; max-height:80vh; box-shadow:0 2px 8px rgba(0,0,0,0.06); }' +
    '.overdue { background:#ffebee !important; } .warn-row { background:#fff8e1 !important; } .alert-row { background:#fffde7 !important; } .total-row { font-weight:bold; background:#e8eaf6; } .section-header td { background:#c5cae9; color:#1a237e; font-weight:bold; font-size:0.8rem; padding:6px 8px; }' +
    '.over-plus { color:#c62828; font-weight:bold; }' +
    '.over-minus { color:#2e7d32; }' +
    '.chart-container { position:relative; height:500px; margin:8px 0; background:#fff; border-radius:12px; padding:12px; border:1px solid #e0e0e0; }' +
    '.legend { display:flex; gap:16px; justify-content:center; margin:8px 0; font-size:0.75rem; }' +
    '.legend-item { display:flex; align-items:center; gap:4px; }' +
    '.legend-swatch { width:14px; height:14px; border-radius:3px; }' +
    '@media(max-width:600px) { .top-cards { grid-template-columns:1fr; } .card .value { font-size:1.1rem; } h1 { font-size:1rem; } table { font-size:0.7rem; } }' +
    '</style></head><body>' +
    PDPA_BADGE +
    '<div class="container">' +
    '<h1>PMG กำกับลูกหนี้</h1>' +
    '<div class="subtitle">วงเงิน • ความเสี่ยง • เกินดิวส์ &nbsp;|&nbsp; อัปเดต: ' + new Date().toLocaleDateString('th-TH') + '</div>' +
    '<div class="top-cards">' + cardsHtml + '</div>' +
    '<div class="section"><div class="section-title">รายการลูกหนี้ทั้งหมด — ใบแจ้งหนี้ + ประกันภัย</div>' +
    '<div class="legend"><span class="legend-item"><span class="legend-swatch" style="background:#43a047"></span> ในวงเงิน</span><span class="legend-item"><span class="legend-swatch" style="background:#e53935"></span> เกินวงเงิน</span><span class="legend-item"><span style="color:#1a237e;font-weight:bold">━━</span> วงเงิน</span><span class="legend-item"><small>ตัวเลขในช่องอายุลูกหนี้ = ยอดคงค้างสะสม − วงเงิน (เขียว=ไม่เกิน, แดง=เกิน)</small></span></div>' +
    '<div class="chart-container"><canvas id="riskChart"></canvas></div>' +
    '<div class="table-wrap">' + tableHtml + '</div></div>' +
    dailySummaryHtml +
    '</div>' +
    '<scr' + 'ipt>' +
    'var cd=' + chartDataJson + ';' +
    'var ctx=document.getElementById("riskChart").getContext("2d");' +
    // Stacked horizontal bar: within-limit (green) + over-limit (red)
    'new Chart(ctx,{' +
    '  type:"bar",' +
    '  data:{' +
    '    labels:cd.names,' +
    '    datasets:[' +
    '      {label:"ในวงเงิน",data:cd.withins,backgroundColor:"rgba(67,160,71,0.75)",borderColor:"#2e7d32",borderWidth:1},' +
    '      {label:"เกินวงเงิน",data:cd.overs,backgroundColor:"rgba(229,57,53,0.8)",borderColor:"#c62828",borderWidth:1}' +
    '    ]' +
    '  },' +
    '  plugins:[{' +
    '    id:"limitLine",' +
    '    afterDraw:function(chart){' +
    '      var yScale=chart.scales.y;var xScale=chart.scales.x;' +
    '      var ctx2=chart.ctx;' +
    '      ctx2.save();' +
    '      for(var i=0;i<cd.names.length;i++){' +
    '        var xLim=xScale.getPixelForValue(cd.limits[i]);' +
    '        var yTop=yScale.getPixelForValue(i)-yScale.height/cd.names.length*0.45;' +
    '        var yBot=yScale.getPixelForValue(i)+yScale.height/cd.names.length*0.45;' +
    '        ctx2.beginPath();ctx2.moveTo(xLim,yTop);ctx2.lineTo(xLim,yBot);' +
    '        ctx2.lineWidth=2;ctx2.strokeStyle="#1a237e";ctx2.setLineDash([]);ctx2.stroke();' +
    '      }' +
    '      ctx2.restore();' +
    '    }' +
    '  }],' +
    '  options:{' +
    '    indexAxis:"y",' +
    '    responsive:true,' +
    '    maintainAspectRatio:false,' +
    '    plugins:{' +
    '      legend:{position:"bottom"},' +
    '      tooltip:{' +
    '        callbacks:{' +
    '          label:function(ctx2){' +
    '            var idx=ctx2.dataIndex;' +
    '            var pct=cd.pcts[idx];' +
    '            var out=cd.withins[idx]+cd.overs[idx];' +
    '            var lim=cd.limits[idx];' +
    '            var over=out-lim;' +
    '            var overStr=over>0?"+":"";' +
    '            return [ctx2.dataset.label+": "+Number(ctx2.raw).toLocaleString("th-TH")+" บ.",' +
    '              "ลูกหนี้รวม: "+Number(out).toLocaleString("th-TH")+" บ.",' +
    '              "วงเงิน: "+Number(lim).toLocaleString("th-TH")+" บ.",' +
    '              "ใช้วงเงิน: "+pct+"%",' +
    '              "เกินวงเงิน: "+overStr+Number(Math.abs(over)).toLocaleString("th-TH")+" บ."];' +
    '          }' +
    '        }' +
    '      }' +
    '    },' +
    '    scales:{' +
    '      x:{stacked:true,grid:{color:"#e0e0e0"},ticks:{color:"#666",callback:function(v){if(v>=1e6)return (v/1e6).toFixed(1)+"ล.";if(v>=1e3)return (v/1e3).toFixed(0)+"พ.";return v;}}},' +
    '      y:{stacked:true,grid:{display:false},ticks:{color:"#333",font:{size:11}}}' +
    '    }' +
    '  }' +
    '});' +
    '</' + 'script>' +
    PDPA_FOOTER +
    '</body></html>';
  
  return html;
}

function buildRow(item, hasInterest, isTotal, section) {
  var out = getOutstanding(item);
  // เกินวงเงิน = ลูกหนี้รวม - วงเงิน
  // + = เกินวงเงิน (สีแดง), - = ไม่เกิน (สีเขียว)
  var over = out - item.limit;
  var overClass = over > 0 ? 'over-plus' : 'over-minus';
  var overPrefix = over > 0 ? '+' : '';
  var hasOverdue = (item.aging['31-60'] > 0 || item.aging['61-90'] > 0 || item.aging['90+'] > 0);
  var pct = item.limit > 0 ? Math.round(out / item.limit * 100) : (out > 0 ? 999 : 0);
  
  // Row class based on status
  var cls = isTotal ? 'total-row' : '';
  if (!isTotal) {
    if (pct > 100) cls = 'overdue';
    else if (pct > 80) cls = 'alert-row';
    else if (pct > 70 || hasOverdue) cls = 'warn-row';
  }
  
  var badge = getBadge(item.limit, out);
  var di = hasInterest && item.dailyInterest > 0 ? fmtNumJs(item.dailyInterest) : '-';
  var od = hasInterest && item.overdueDays ? item.overdueDays : '-';
  
  // Cumulative aging for each bucket minus limit
  var cum1 = item.aging['1-30'];
  var cum2 = cum1 + item.aging['31-60'];
  var cum3 = cum2 + item.aging['61-90'];
  var cum4 = cum3 + item.aging['90+'];
  var cl1 = cum1 - item.limit;
  var cl2 = cum2 - item.limit;
  var cl3 = cum3 - item.limit;
  var cl4 = cum4 - item.limit;
  
  function cumCell(val, cumOverLimit, hasLimit) {
    if (!hasLimit) {
      // No limit set - just show the amount
      return '<td class="nr">' + (val > 0 ? fmtNumJs(val) : '-') + '</td>';
    }
    var mainVal = val > 0 ? fmtNumJs(val) : '-';
    var cumStr = cumOverLimit > 0 ? '+' + fmtNumJs(Math.abs(cumOverLimit)) : fmtNumJs(Math.abs(cumOverLimit)) + '-';
    var cumColor = cumOverLimit > 0 ? '#c62828' : '#2e7d32';
    var cumFontWeight = cumOverLimit > 0 ? 'bold' : 'normal';
    return '<td class="nr"><div style="font-size:0.82rem">' + mainVal + '</div><div style="font-size:0.65rem;color:' + cumColor + ';font-weight:' + cumFontWeight + '">' + cumStr + '</div></td>';
  }
  
  var html = '<tr class="' + cls + '">';
  var sectionIcon = section === 'inv' ? '📄 ' : '';
  html += '<td>' + sectionIcon + item.name + '</td>';
  if (item.limit > 0) {
    html += '<td class="nr">' + fmtNumJs(item.limit) + '</td>';
  } else {
    html += '<td class="nr" style="color:#999">-</td>';
  }
  // Aging columns with cumulative-limit in each cell
  var hasLimit = item.limit > 0;
  html += cumCell(item.aging['1-30'], cl1, hasLimit);
  html += cumCell(item.aging['31-60'], cl2, hasLimit);
  html += cumCell(item.aging['61-90'], cl3, hasLimit);
  html += cumCell(item.aging['90+'], cl4, hasLimit);
  // ลูกหนี้รวม (total outstanding)
  html += '<td class="nr" style="font-weight:bold">' + fmtNumJs(out) + '</td>';
  // เกินวงเงิน column
  if (item.limit > 0) {
    html += '<td class="nr ' + overClass + '" style="font-weight:bold">' + overPrefix + fmtNumJs(Math.abs(over)) + '</td>';
  } else {
    html += '<td class="nr over-plus" style="font-weight:bold">+' + fmtNumJs(out) + '</td>';
  }
  html += '<td class="nr">' + di + '</td>';
  html += '<td>' + od + '</td>';
  html += '<td>' + badge + '</td>';
  html += '</tr>';
  return html;
}

// Generate daily summary text and structured data// Generate daily summary text and structured data
function generateDailySummary() {
  var data = getDebtData();
  var s = data.summary;
  var ins = data.insuranceSection;
  var inv = data.invoiceSection;
  var bs = data.bottomSummary;
  
  // Count items by status
  var allItems = [];
  for (var i = 0; i < inv.items.length; i++) {
    allItems.push({ name: inv.items[i].name, limit: inv.items[i].limit, outstanding: getOutstanding(inv.items[i]), aging: inv.items[i].aging, dailyInterest: inv.items[i].dailyInterest || 0, overdueDays: inv.items[i].overdueDays || '', section: 'inv' });
  }
  for (var j = 0; j < ins.items.length; j++) {
    allItems.push({ name: ins.items[j].name, limit: ins.items[j].limit, outstanding: getOutstanding(ins.items[j]), aging: ins.items[j].aging, dailyInterest: ins.items[j].dailyInterest || 0, overdueDays: ins.items[j].overdueDays || '', section: 'ins' });
  }
  
  var countOk = 0, countWarn = 0, countAlert = 0, countDanger = 0;
  var dangerItems = [], alertItems = [], warnItems = [];
  var totalOutstanding = 0, totalOver = 0;
  
  for (var k = 0; k < allItems.length; k++) {
    var item = allItems[k];
    totalOutstanding += item.outstanding;
    var pct = item.limit > 0 ? Math.round(item.outstanding / item.limit * 100) : (item.outstanding > 0 ? 999 : 0);
    var over = item.limit > 0 ? item.outstanding - item.limit : item.outstanding;
    if (over > 0) totalOver += over;
    
    if (pct > 100) { countDanger++; dangerItems.push(item.name + ' ' + pct + '%'); }
    else if (pct > 80) { countAlert++; alertItems.push(item.name + ' ' + pct + '%'); }
    else if (pct > 70) { countWarn++; warnItems.push(item.name + ' ' + pct + '%'); }
    else { countOk++; }
  }
  
  var totalLimitPct = bs.totalLimit > 0 ? Math.round(bs.usedLimit / bs.totalLimit * 100) : 0;
  var now = new Date();
  var dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  
  // Build text summary
  var text = '📊 PMG กำกับลูกหนี้ ประจำวัน ' + dateStr + '\n';
  text += '────────────────\n';
  text += '💰 ลูกหนี้รวม: ' + fmtNumJs(s.totalDebt) + ' บาท\n';
  text += '🔴 เกินดิว: ' + fmtNumJs(s.overdueAmount) + ' บาท\n';
  text += '🟢 ยังไม่ครบกำหนด: ' + fmtNumJs(s.notYetDueAmount) + ' บาท\n';
  text += '📊 วงเงินกำกับความเสี่ยง: ' + fmtNumJs(bs.totalLimit) + ' บาท (' + totalLimitPct + '%)\n';
  if (totalOver > 0) {
    text += '⚠️ เกินวงเงินรวม: +' + fmtNumJs(totalOver) + ' บาท\n';
  }
  text += '────────────────\n';
  text += '📋 สถานะรายการ:\n';
  if (countDanger > 0) text += '🔴 เกินวงเงิน ' + countDanger + 'ราย: ' + dangerItems.join(', ') + '\n';
  if (countAlert > 0) text += '🟡 เฝ้าระวัง ' + countAlert + 'ราย: ' + alertItems.join(', ') + '\n';
  if (countWarn > 0) text += '🟠 เสี่ยง ' + countWarn + 'ราย: ' + warnItems.join(', ') + '\n';
  text += '🟢 ในวงเงิน ' + countOk + 'ราย\n';
  
  if (ins.overdueInterest > 0) {
    text += '💸 ยอดรับผิดชอบดอกเบี้ยเกินดิว: ' + fmtNumJs(ins.overdueInterest) + ' บาท/วัน\n';
  }
  
  var result = {
    text: text,
    date: dateStr,
    totalDebt: s.totalDebt,
    overdue: s.overdueAmount,
    notYetDue: s.notYetDueAmount,
    totalLimit: bs.totalLimit,
    usedLimit: bs.usedLimit,
    limitPct: totalLimitPct,
    totalOver: totalOver,
    countOk: countOk,
    countWarn: countWarn,
    countAlert: countAlert,
    countDanger: countDanger,
    dangerItems: dangerItems,
    alertItems: alertItems,
    warnItems: warnItems,
    overdueInterest: ins.overdueInterest,
    items: allItems.map(function(x) {
      return { name: x.name, limit: x.limit, outstanding: x.outstanding, pct: x.limit > 0 ? Math.round(x.outstanding / x.limit * 100) : 0, over: x.limit > 0 ? x.outstanding - x.limit : x.outstanding };
    })
  };
  return result;
}

// Save daily summary to spreadsheet (called by cron/GAS trigger)
function saveDailySummary() {
  var summary = generateDailySummary();
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(DAILY_SHEET);
  
  // Create sheet if not exists
  if (!sheet) {
    sheet = ss.insertSheet(DAILY_SHEET);
    sheet.appendRow(['วันที่', 'ลูกหนี้รวม', 'เกินดิว', 'ยังไม่ครบ', 'วงเงินกำกับ', 'ใช้ไป%', 'เกินวงเงิน', 'ในวงเงิน', 'เสี่ยง', 'เฝ้าระวัง', 'เกินวงเงิน', 'รายละเอียด']);
    // Bold header
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#e8eaf6');
  }
  
  // Build detail string for items that are over limit or alert
  var detailParts = [];
  var items = summary.items;
  for (var d = 0; d < items.length; d++) {
    if (items[d].pct > 70) {
      detailParts.push(items[d].name + ':' + items[d].pct + '%');
    }
  }
  var detailStr = detailParts.join(', ');
  
  sheet.appendRow([
    summary.date,
    summary.totalDebt,
    summary.overdue,
    summary.notYetDue,
    summary.totalLimit,
    summary.limitPct,
    summary.totalOver,
    summary.countOk,
    summary.countWarn,
    summary.countAlert,
    summary.countDanger,
    detailStr
  ]);
  
  return summary;
}

// ===== PM/WI Checklist Web App =====

function serveChecklist(maskData) {
  var data = getChecklistData();
  var html = buildChecklistHtml(data);
  return HtmlService.createHtmlOutput(html)
    .setTitle('PMG \u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E15\u0E4C PM/WI')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getChecklistData() {
  var ss = SpreadsheetApp.openById(CHECKLIST_SS_ID_API);
  var pmSheet = ss.getSheetByName('\u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08');
  var pmValues = pmSheet ? pmSheet.getRange(1, 1, pmSheet.getLastRow(), pmSheet.getLastColumn()).getValues() : [];
  var wiSheet = ss.getSheetByName('\u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E08\u0E49\u0E07');
  var wiValues = wiSheet ? wiSheet.getRange(1, 1, wiSheet.getLastRow(), wiSheet.getLastColumn()).getValues() : [];
  return { pm: parsePM(pmValues), wi: parseWI(wiValues) };
}

function parsePM(v) {
  var r = { pre:[], check:[], post:[], safety:[], docs:[] };
  var ds = {};
  for (var i=3; i<=7 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.pre.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], doc:v[i][4]||''});
      if(v[i][4]) ds[String(v[i][4]).trim()] = 1;
    }
  }
  var lastCat = '';
  for (var i=9; i<=21 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      if(v[i][0]) lastCat = v[i][0];
      r.check.push({cat:lastCat, item:v[i][1], doc:v[i][4]||''});
      if(v[i][4]) ds[String(v[i][4]).trim()] = 1;
    }
  }
  for (var i=23; i<=27 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.post.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3]});
    }
  }
  var sec = '';
  for (var i=39; i<v.length; i++) {
    if(!v[i][0] || String(v[i][0]).trim()==='') continue;
    var t = String(v[i][0]).trim();
    if(t.indexOf('\u0E2D\u0E31\u0E19\u0E15\u0E23\u0E32\u0E22')>=0 || t.indexOf('\u0E21\u0E32\u0E15\u0E23\u0E01\u0E23')>=0 || t.indexOf('\u0E15\u0E23\u0E27\u0E08')>=0 || t.indexOf('\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48')>=0 || t.indexOf('\u0E1D\u0E36\u0E01')>=0 || t.indexOf('\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33')>=0 || t.indexOf('\u0E41\u0E1C\u0E19')>=0 || t.indexOf('\u0E42\u0E23\u0E07\u0E07\u0E32\u0E19')>=0) sec = t;
    r.safety.push({sec:sec, text:t});
  }
  r.docs = Object.keys(ds);
  return r;
}

function parseWI(v) {
  var r = { pre:[], check:[], post:[], docs:[] };
  var ds = {};
  for (var i=4; i<=8 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.pre.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], note:v[i][4]||'', doc:v[i][5]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  var lastCat = '';
  for (var i=10; i<=16 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      if(v[i][0]) lastCat = v[i][0];
      r.check.push({cat:lastCat, item:v[i][1], doc:v[i][5]||v[i][4]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  for (var i=18; i<=21 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.post.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], note:v[i][4]||'', doc:v[i][5]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  r.docs = Object.keys(ds);
  return r;
}

function escC(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== PM/WI Checklist Web App Builder v2 =====
// Adds: attach file button per step, safety plan split by factory

function buildChecklistHtml(data) {
  var pm = data.pm, wi = data.wi;
  var allDs = {};
  pm.docs.forEach(function(d){if(d&&d.trim())allDs[d]=1;});
  wi.docs.forEach(function(d){if(d&&d.trim())allDs[d]=1;});
  
  var fid = 0;
  function nxtId(){ return 'fid'+(fid++); }
  
  var h = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  h += '<title>PMG \u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E15\u0E4C PM/WI</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,sans-serif;background:#f0f4f8;color:#333;min-height:100vh;padding-bottom:28px}';
  h += '.container{max-width:1100px;margin:0 auto;padding:14px}';
  h += 'h1{text-align:center;font-size:1.4rem;color:#1a237e;margin:8px 0 4px}';
  h += '.subtitle{text-align:center;font-size:0.8rem;color:#666;margin-bottom:12px}';
  h += '.tabs{display:flex;gap:0;margin-bottom:16px;border-radius:8px;overflow:hidden;border:1px solid #c5cae9}';
  h += '.tab-btn{flex:1;padding:10px 8px;border:none;background:#e8eaf6;color:#1a237e;font-size:0.85rem;font-weight:bold;cursor:pointer;transition:all 0.2s;text-align:center}';
  h += '.tab-btn.active{background:#1a237e;color:#fff}';
  h += '.tab-btn:hover:not(.active){background:#c5cae9}';
  h += '.tab-content{display:none}.tab-content.active{display:block}';
  h += '.section{background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e0e0e0;box-shadow:0 2px 8px rgba(0,0,0,0.06)}';
  h += '.section-title{font-size:1rem;font-weight:bold;color:#1a237e;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #1a237e;display:flex;align-items:center;gap:8px}';
  h += '.section-title .icon{font-size:1.2rem}';
  h += '.flow-chart{display:flex;flex-direction:column;align-items:center;gap:0;margin:16px 0}';
  h += '.flow-step{background:#e8eaf6;border-radius:10px;padding:12px 20px;text-align:center;max-width:600px;width:100%;border:2px solid #1a237e;position:relative;transition:transform 0.2s}';
  h += '.flow-step:hover{transform:scale(1.02);box-shadow:0 4px 12px rgba(0,0,0,0.15)}';
  h += '.step-num{font-size:0.7rem;color:#fff;background:#1a237e;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;margin-right:6px;font-weight:bold}';
  h += '.step-detail{font-size:0.85rem;color:#333;margin-top:4px}';
  h += '.step-meta{font-size:0.7rem;color:#666;margin-top:4px}.step-meta span{margin-right:12px}';
  h += '.flow-arrow{width:2px;height:24px;background:#1a237e;position:relative}';
  h += '.flow-arrow::after{content:"\u25BC";position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);color:#1a237e;font-size:12px}';
  h += '.flow-step.pm-pre{border-color:#1565c0;background:#e3f2fd}.flow-step.pm-pre .step-num{background:#1565c0}';
  h += '.flow-step.pm-check{border-color:#2e7d32;background:#e8f5e9}.flow-step.pm-check .step-num{background:#2e7d32}';
  h += '.flow-step.pm-post{border-color:#e65100;background:#fff3e0}.flow-step.pm-post .step-num{background:#e65100}';
  h += '.flow-step.wi-emer{border-color:#c62828;background:#ffebee}.flow-step.wi-emer .step-num{background:#c62828}';
  h += '.flow-step.wi-check{border-color:#6a1b9a;background:#f3e5f5}.flow-step.wi-check .step-num{background:#6a1b9a}';
  h += '.flow-step.wi-post{border-color:#00695c;background:#e0f2f1}.flow-step.wi-post .step-num{background:#00695c}';
  h += 'table{width:100%;border-collapse:collapse;font-size:0.8rem}';
  h += 'th{background:#e8eaf6;color:#1a237e;padding:8px 6px;text-align:left;border-bottom:2px solid #1a237e;font-size:0.75rem}';
  h += 'td{padding:8px 6px;border-bottom:1px solid #eee}tr:hover{background:#f5f5ff}';
  h += '.cat-cell{font-weight:bold;color:#1a237e;background:#c5cae9;border-radius:4px;padding:2px 6px;font-size:0.7rem;white-space:nowrap}';
  h += '.doc-tag{display:inline-block;background:#e3f2fd;color:#1565c0;border-radius:4px;padding:2px 8px;margin:2px;font-size:0.7rem;border:1px solid #90caf9}';
  h += '.doc-card{background:#f5f5ff;border:1px solid #c5cae9;border-radius:8px;padding:12px;margin-bottom:8px}';
  h += '.doc-card h4{color:#1a237e;font-size:0.85rem;margin-bottom:4px}';
  h += '.doc-card p{font-size:0.75rem;color:#555;margin:2px 0}';
  h += '.badge-pm{background:#1565c0;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:bold}';
  h += '.badge-wi{background:#c62828;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:bold}';
  h += '.chk{width:18px;height:18px;accent-color:#1a237e;flex-shrink:0}';
  h += '.phase-label{text-align:center;font-size:0.8rem;font-weight:bold;margin:4px 0;padding:4px 12px;border-radius:4px}';
  h += '.safety-item{font-size:0.8rem;padding:4px 8px;margin:2px 0;background:#fff3e0;border-left:3px solid #e65100;border-radius:2px}';
  h += '.safety-check{font-size:0.8rem;padding:4px 8px;margin:2px 0;background:#e8f5e9;border-left:3px solid #2e7d32;border-radius:2px;display:flex;align-items:center;gap:6px}';
  h += '.safety-check input{accent-color:#2e7d32}';
  h += '.safety-title{font-weight:bold;color:#c62828;font-size:0.9rem;margin-bottom:4px;margin-top:8px}';
  // attachment styles
  h += '.att-area{margin-top:4px;display:flex;flex-wrap:wrap;align-items:center;gap:4px}';
  h += '.att-btn{display:inline-flex;align-items:center;gap:3px;background:#f5f5f5;border:1px dashed #90a4ae;border-radius:4px;padding:2px 8px;font-size:0.7rem;color:#546e7a;cursor:pointer;transition:all 0.2s}';
  h += '.att-btn:hover{background:#e3f2fd;border-color:#1565c0;color:#1565c0}';
  h += '.att-badge{display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;color:#2e7d32;border-radius:4px;padding:2px 8px;font-size:0.7rem;border:1px solid #a5d6a7;max-width:220px}';
  h += '.att-badge a{color:#2e7d32;text-decoration:none;font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;display:inline-block}.att-badge img{transition:transform 0.2s}.att-badge img:hover{transform:scale(1.5);z-index:99;position:relative}';
  h += '.att-badge .del{cursor:pointer;color:#c62828;font-weight:bold;margin-left:2px;font-size:0.8rem}';
  h += '.factory-section{background:linear-gradient(135deg,#fffde7 0%,#fff8e1 100%);border-radius:12px;padding:16px;margin-bottom:12px;border:2px solid #ff8f00}';
  h += '.factory-title{font-size:1.1rem;font-weight:bold;color:#e65100;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #ff8f00}';
  // responsive
  h += '@media(max-width:768px){.tab-btn{font-size:0.75rem;padding:8px 4px}.flow-step{padding:10px 12px;max-width:100%}}';
  h += '.print-btn{background:#1a237e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:0.8rem;margin:8px 2px}';
  h += '.print-btn:hover{background:#283593}';
  h += '.action-btns{text-align:center;margin-bottom:12px}';
  h += '.hidden-input{position:absolute;width:0;height:0;overflow:hidden;opacity:0}';
  h += '@media print{.tabs,.action-btns,.print-btn,.att-btn,.att-area{display:none !important}.section{break-inside:avoid}.tab-content{display:block !important}}';
  h += '</style></head><body>';
  h += PDPA_BADGE;

  h += '<div class="container">';
  h += '<h1>\uD83D\uDD0D PMG \u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E15\u0E4C PM/WI</h1>';
  h += '<div class="subtitle">\u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E15\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08 \u2022 \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 \u2022 Flow Chart \u00A0|\u00A0 \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15: '+new Date().toLocaleDateString('th-TH')+'</div>';
  h += '<div class="action-btns"><button class="print-btn" onclick="window.print()">\uD83D\uDDA8\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E2B\u0E19\u0E49\u0E32\u0E19\u0E35\u0E49</button> ';
  // Drive folder link - use try/catch in case Drive auth not yet granted
  var folderUrl = '#';
  try { var folderInfo = getAttachmentsFolder(); folderUrl = folderInfo.url; } catch(e) {}
  h += '<a href="https://docs.google.com/spreadsheets/d/1uB9ABT9rv68gg14gVpLf_JAN7WelMSeDo1alltnqbaU/edit" target="_blank" style="background:#1565c0;color:#fff;padding:8px 16px;border-radius:6px;font-size:0.8rem;text-decoration:none;display:inline-block">\uD83D\uDCCA \u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E40\u0E1B\u0E23\u0E14\u0E0A\u0E35\u0E15\u0E4C\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A</a> <a id="folderLink" href="'+folderUrl+'" target="_blank" style="background:#2e7d32;color:#fff;padding:8px 16px;border-radius:6px;font-size:0.8rem;text-decoration:none;display:inline-block">\uD83D\uDCC2 \u0E40\u0E1B\u0E34\u0E14\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E44\u0E1F\u0E25\u0E25\u0E4C\u0E41\u0E19\u0E1A</a></div>';

  h += '<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:8px 14px;margin:8px 0;font-size:0.78rem;color:#2e7d32">\uD83D\uDCC2 \u0E44\u0E1F\u0E25\u0E25\u0E4C\u0E41\u0E19\u0E1A\u0E08\u0E30\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49\u0E43\u0E19 <a id="folderBanner" href="'+folderUrl+'" target="_blank" style="color:#1b5e20;font-weight:bold;text-decoration:underline">Google Drive \u2014 PMG Checklist Attachments</a> \u2022 \u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E08\u0E30\u0E41\u0E2A\u0E14\u0E07\u0E20\u0E32\u0E1E\u0E22\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E14\u0E49</div>';

  // Tabs
  h += '<div class="tabs">';
  h += '<button class="tab-btn active" onclick="switchTab(\'pm\')"><span class="badge-pm">PM</span> \u00A0\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08 (\u0E41\u0E08\u0E49\u0E07\u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32)</button>';
  h += '<button class="tab-btn" onclick="switchTab(\'wi\')"><span class="badge-wi">WI</span> \u00A0\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E08\u0E49\u0E07</button>';
  h += '<button class="tab-btn" onclick="switchTab(\'docs\')">\uD83D\uDCCB \u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23</button>';
  h += '</div>';

  // helper: attach button HTML
  function attHtml(id){ 
    return '<div class="att-area"><label class="att-btn" for="'+id+'">\uD83D\uDCC1 \u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23</label><input type="file" id="'+id+'" class="hidden-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.heic,.webp,.mp4,.mov" onchange="doUpload(this)"><span id="att-'+id+'"></span></div>';
  }

  // ============ PM TAB ============
  h += '<div id="tab-pm" class="tab-content active">';
  
  // PM Flow Chart
  h += '<div class="section"><div class="section-title"><span class="icon">\uD83D\uDCCA</span> Flow Chart \u2014 PM \u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08 (\u0E41\u0E08\u0E49\u0E07\u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32)</div>';
  h += '<div class="flow-chart">';
  h += '<div class="phase-label" style="color:#1565c0;background:#e3f2fd">\uD83D\uDD35 \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E23\u0E27\u0E08</div>';
  for(var i=0;i<pm.pre.length;i++){
    var s=pm.pre[i]; var sid=nxtId();
    h += '<div class="flow-step pm-pre"><span class="step-num">'+escC(s.step)+'</span><div class="step-detail">'+escC(s.detail)+'</div><div class="step-meta"><span>\uD83D\uDC64 '+escC(s.resp)+'</span><span>\u23F0 '+escC(s.time)+'</span></div>';
    if(s.doc) h += '<div style="margin-top:4px"><span class="doc-tag">\uD83D\uDCC4 '+escC(s.doc)+'</span></div>';
    h += attHtml(sid);
    h += '</div><div class="flow-arrow"></div>';
  }
  h += '<div class="phase-label" style="color:#2e7d32;background:#e8f5e9">\uD83D\uDFE2 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A</div>';
  var lastPmCat=''; var pmStep=1;
  for(var i=0;i<pm.check.length;i++){
    var c=pm.check[i];
    if(c.cat && c.cat!==lastPmCat){
      lastPmCat=c.cat; var sid=nxtId();
      h += '<div class="flow-step pm-check"><span class="step-num">'+(pmStep++)+'</span><div class="step-detail"><strong>'+escC(c.cat)+'</strong></div><div class="step-meta" style="font-size:0.75rem;color:#555">'+escC(c.item)+'</div>';
      if(c.doc) h += '<div style="margin-top:4px"><span class="doc-tag">\uD83D\uDCC4 '+escC(c.doc)+'</span></div>';
      h += attHtml(sid);
      h += '</div><div class="flow-arrow"></div>';
    }
  }
  h += '<div class="phase-label" style="color:#e65100;background:#fff3e0">\uD83D\uDFE0 \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08</div>';
  for(var i=0;i<pm.post.length;i++){
    var s=pm.post[i]; var sid=nxtId();
    h += '<div class="flow-step pm-post"><span class="step-num">'+escC(s.step)+'</span><div class="step-detail">'+escC(s.detail)+'</div><div class="step-meta"><span>\uD83D\uDC64 '+escC(s.resp)+'</span><span>\u23F0 '+escC(s.time)+'</span></div>';
    h += attHtml(sid);
    h += '</div>';
    if(i<pm.post.length-1) h += '<div class="flow-arrow"></div>';
  }
  h += '</div></div>'; // close flow-chart & section

  // PM Checklist Table with attach
  h += '<div class="section"><div class="section-title"><span class="icon">\u2705</span> \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u2014 PM</div>';
  h += '<table><tr><th style="width:15%">\u0E14\u0E49\u0E32\u0E19</th><th>\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A</th><th style="width:8%">\u0E1C\u0E48\u0E32\u0E19</th><th style="width:20%">\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23/TNR</th><th style="width:15%">\u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23</th></tr>';
  for(var i=0;i<pm.check.length;i++){
    var c=pm.check[i]; var sid=nxtId();
    h += '<tr><td>'+(c.cat?'<span class="cat-cell">'+escC(c.cat)+'</span>':'')+'</td><td class="checklist-text">'+escC(c.item)+'</td><td style="text-align:center"><input type="checkbox" class="chk"></td><td>'+(c.doc?'<span class="doc-tag">\uD83D\uDCC4 '+escC(c.doc)+'</span>':'')+'</td><td>'+attHtml(sid)+'</td></tr>';
  }
  h += '</table></div>';

  // PM Safety sections - SPLIT into 2 factories
  if(pm.safety.length > 0) {
    h += '<div class="section"><div class="section-title"><span class="icon">\uD83D\uDEE1\uFE0F</span> \u0E41\u0E1C\u0E19\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22</div>';
    
    var currentFac = '';
    var currentSec = '';
    var isCheck = false;
    for(var i=0;i<pm.safety.length;i++){
      var sp = pm.safety[i];
      // Detect factory headers
      var factMatch = sp.text.match(/\u0E42\u0E23\u0E07\u0E07\u0E32\u0E19\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E0B\u0E48\u0E2D\u0E21/);
      var factMatch2 = sp.text.match(/\u0E42\u0E23\u0E07\u0E07\u0E32\u0E19\u0E41\u0E1B\u0E23\u0E23\u0E39\u0E1B/);
      if(factMatch || factMatch2) {
        // Close previous factory div if open
        if(currentFac !== '') h += '</div>';
        currentFac = sp.text;
        h += '<div class="factory-section"><div class="factory-title">\uD83C\uDFED '+escC(sp.text)+'</div>';
        currentSec = '';
        continue;
      }
      if(sp.sec !== currentSec){
        currentSec = sp.sec;
        isCheck = currentSec.indexOf('\u0E15\u0E23\u0E27\u0E08')>=0;
        h += '<div class="safety-title">'+escC(currentSec)+'</div>';
      }
      if(sp.text !== currentSec){
        var sid2 = nxtId();
        if(isCheck) {
          h += '<div class="safety-check"><input type="checkbox" class="chk"><span>'+escC(sp.text)+'</span></div>';
        } else {
          h += '<div class="safety-item">'+escC(sp.text)+'</div>';
        }
      }
    }
    if(currentFac !== '') h += '</div>'; // close last factory section
    h += '</div>'; // close section
  }

  h += '</div>'; // end tab-pm

  // ============ WI TAB ============
  h += '<div id="tab-wi" class="tab-content">';
  h += '<div class="section"><div class="section-title"><span class="icon">\uD83D\uDCCA</span> Flow Chart \u2014 WI \u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E08\u0E49\u0E07</div>';
  h += '<div class="flow-chart">';
  h += '<div class="phase-label" style="color:#c62828;background:#ffebee">\uD83D\uDD34 \u0E01\u0E48\u0E2D\u0E19\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08 (\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19)</div>';
  for(var i=0;i<wi.pre.length;i++){
    var s=wi.pre[i]; var sid=nxtId();
    h += '<div class="flow-step wi-emer"><span class="step-num">'+escC(s.step)+'</span><div class="step-detail">'+escC(s.detail)+'</div><div class="step-meta"><span>\uD83D\uDC64 '+escC(s.resp)+'</span><span>\u23F0 '+escC(s.time)+'</span>';
    if(s.note) h += '<span>\uD83D\uDCDD '+escC(s.note)+'</span>';
    h += '</div>';
    if(s.doc) h += '<div style="margin-top:4px"><span class="doc-tag">\uD83D\uDCC4 '+escC(s.doc)+'</span></div>';
    h += attHtml(sid);
    h += '</div><div class="flow-arrow"></div>';
  }
  h += '<div class="phase-label" style="color:#6a1b9a;background:#f3e5f5">\uD83D\uDFE3 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A</div>';
  var lastWiCat=''; var wiStep=1;
  for(var i=0;i<wi.check.length;i++){
    var c=wi.check[i];
    if(c.cat && c.cat!==lastWiCat){
      lastWiCat=c.cat; var sid=nxtId();
      h += '<div class="flow-step wi-check"><span class="step-num">'+(wiStep++)+'</span><div class="step-detail"><strong>'+escC(c.cat)+'</strong></div><div class="step-meta" style="font-size:0.75rem;color:#555">'+escC(c.item)+'</div>';
      if(c.doc) h += '<div style="margin-top:4px"><span class="doc-tag">\uD83D\uDCC4 '+escC(c.doc)+'</span></div>';
      h += attHtml(sid);
      h += '</div><div class="flow-arrow"></div>';
    }
  }
  h += '<div class="phase-label" style="color:#00695c;background:#e0f2f1">\uD83D\uDFE4 \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08</div>';
  for(var i=0;i<wi.post.length;i++){
    var s=wi.post[i]; var sid=nxtId();
    h += '<div class="flow-step wi-post"><span class="step-num">'+escC(s.step)+'</span><div class="step-detail">'+escC(s.detail)+'</div><div class="step-meta"><span>\uD83D\uDC64 '+escC(s.resp)+'</span><span>\u23F0 '+escC(s.time)+'</span>';
    if(s.note) h += '<span>\uD83D\uDCDD '+escC(s.note)+'</span>';
    h += '</div>';
    if(s.doc) h += '<div style="margin-top:4px"><span class="doc-tag">\uD83D\uDCC4 '+escC(s.doc)+'</span></div>';
    h += attHtml(sid);
    h += '</div>';
    if(i<wi.post.length-1) h += '<div class="flow-arrow"></div>';
  }
  h += '</div></div>'; // close flow-chart & section

  // WI Checklist Table with attach
  h += '<div class="section"><div class="section-title"><span class="icon">\u2705</span> \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u2014 WI</div>';
  h += '<table><tr><th style="width:15%">\u0E14\u0E49\u0E32\u0E19</th><th>\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A</th><th style="width:8%">\u0E1C\u0E48\u0E32\u0E19</th><th style="width:20%">\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23/TNR</th><th style="width:15%">\u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23</th></tr>';
  for(var i=0;i<wi.check.length;i++){
    var c=wi.check[i]; var sid=nxtId();
    h += '<tr><td>'+(c.cat?'<span class="cat-cell">'+escC(c.cat)+'</span>':'')+'</td><td class="checklist-text">'+escC(c.item)+'</td><td style="text-align:center"><input type="checkbox" class="chk"></td><td>'+(c.doc?'<span class="doc-tag">\uD83D\uDCC4 '+escC(c.doc)+'</span>':'')+'</td><td>'+attHtml(sid)+'</td></tr>';
  }
  h += '</table></div>';
  h += '</div>'; // end tab-wi

  // ============ DOCS TAB ============
  h += '<div id="tab-docs" class="tab-content">';
  h += '<div class="section"><div class="section-title"><span class="icon">\uD83D\uDCCB</span> \u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E17\u0E35\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07 / \u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 / \u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15</div>';
  h += '<p style="font-size:0.85rem;color:#666;margin-bottom:12px">\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08 \u2014 \u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 \u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2D\u0E31\u0E1B\u0E44\u0E1F\u0E25\u0E4C\u0E02\u0E36\u0E49\u0E19\u0E2A\u0E39\u0E48 Google Drive</p>';
  var allDocsMap = {};
  pm.docs.forEach(function(d){ if(d&&d.trim()) allDocsMap[d]=allDocsMap[d]||[]; if(allDocsMap[d].indexOf('PM')<0) allDocsMap[d].push('PM'); });
  wi.docs.forEach(function(d){ if(d&&d.trim()){ allDocsMap[d]=allDocsMap[d]||[]; if(allDocsMap[d].indexOf('WI')<0) allDocsMap[d].push('WI'); }});
  var docKeys=Object.keys(allDocsMap); docKeys.sort();
  for(var i=0;i<docKeys.length;i++){
    var doc=docKeys[i]; var tags=allDocsMap[doc]; var sid=nxtId();
    h += '<div class="doc-card"><h4>'+escC(doc)+'</h4><p>';
    for(var t=0;t<tags.length;t++){
      if(tags[t]==='PM') h += '<span class="badge-pm">PM</span> ';
      else h += '<span class="badge-wi">WI</span> ';
    }
    h += '</p>';
    h += attHtml(sid);
    h += '</div>';
  }
  h += '</div></div>'; // end tab-docs
  
  // Show existing attachments from Drive folder (loaded asynchronously via google.script.run)
  h += '<div id="existingFiles" style="margin:12px 0;padding:12px;background:#fff3e0;border:1px solid #ffcc80;border-radius:8px;display:none">';
  h += '<div style="font-size:0.9rem;font-weight:bold;color:#e65100;margin-bottom:8px">\uD83D\uDCC2 \u0E44\u0E1F\u0E25\u0E25\u0E4C\u0E17\u0E35\u0E48\u0E41\u0E19\u0E1A\u0E41\u0E25\u0E49\u0E27 <span id="fileCount"></span></div>';
  h += '<div id="fileList"></div>';
  h += '</div>';
  
  h += '</div>'; // close container

  // JavaScript: tab switching + file upload + load existing files + folder link
  h += '<script>';
  h += 'function switchTab(tab){var tabs=document.querySelectorAll(".tab-content");for(var i=0;i<tabs.length;i++)tabs[i].classList.remove("active");var btns=document.querySelectorAll(".tab-btn");for(var i=0;i<btns.length;i++)btns[i].classList.remove("active");document.getElementById("tab-"+tab).classList.add("active");var idx=tab==="pm"?0:tab==="wi"?1:2;btns[idx].classList.add("active")}';
  h += 'function doUpload(inp){if(!inp.files||!inp.files.length)return;var sid=inp.id;var file=inp.files[0];var lbl=inp.parentNode.querySelector(".att-btn");lbl.textContent="\u23F3 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1A...";lbl.style.pointerEvents="none";var reader=new FileReader();reader.onload=function(e){var b64=e.target.result.split(",")[1];google.script.run.withSuccessHandler(function(res){lbl.textContent="\uD83D\uDCC1 \u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23";lbl.style.pointerEvents="auto";if(res&&res.status==="ok"){var attDiv=document.getElementById("att-"+sid);if(res.mimeType&&res.mimeType.indexOf("image")===0){var wrap=document.createElement("div");wrap.style.cssText="display:flex;flex-direction:column;gap:4px;margin:2px 0";var aEl=document.createElement("a");aEl.href=res.url;aEl.target="_blank";var imgEl=document.createElement("img");imgEl.src=res.thumbnail;imgEl.style.cssText="max-width:150px;max-height:100px;border-radius:6px;border:1px solid #c5cae9";aEl.appendChild(imgEl);wrap.appendChild(aEl);var cap=document.createElement("span");cap.style.cssText="font-size:0.65rem";cap.appendChild(document.createTextNode("\uD83D\uDCC1 "+res.name+" "));var delBtn=document.createElement("span");delBtn.textContent="\u2716";delBtn.style.cssText="cursor:pointer;color:#c62828;font-weight:bold";delBtn.onclick=function(){wrap.parentNode.removeChild(wrap)};cap.appendChild(delBtn);wrap.appendChild(cap);attDiv.appendChild(wrap)}else{var badge=document.createElement("span");badge.className="att-badge";var link=document.createElement("a");link.href=res.url;link.target="_blank";link.appendChild(document.createTextNode("\uD83D\uDCC1 "+res.name));badge.appendChild(link);badge.appendChild(document.createTextNode(" "));var del2=document.createElement("span");del2.className="del";del2.textContent="\u2716";del2.style.cssText="cursor:pointer;color:#c62828;font-weight:bold";del2.onclick=function(){badge.parentNode.removeChild(badge)};badge.appendChild(del2);attDiv.appendChild(badge)}}else{alert("\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14: "+(res&&res.message||"Unknown"))}}).withFailureHandler(function(err){lbl.textContent="\uD83D\uDCC1 \u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23";lbl.style.pointerEvents="auto";alert("\u0E2D\u0E31\u0E1A\u0E42\u0E2B\u0E25\u0E14\u0E25\u0E49\u0E21\u0E40\u0E17\u0E48\u0E2D: "+err.message)}).saveAttachment({name:file.name,mimeType:file.type||"application/octet-stream",content:b64})};reader.readAsDataURL(file)}';
  h += 'function loadFolderInfo(){google.script.run.withSuccessHandler(function(res){if(res&&res.url){var fl=document.getElementById("folderLink");var fb=document.getElementById("folderBanner");if(fl)fl.href=res.url;if(fb)fb.href=res.url}}).withFailureHandler(function(){}).getAttachmentsFolder()}';
  h += 'function loadExistingFiles(){google.script.run.withSuccessHandler(function(files){if(!files||!files.length)return;var container=document.getElementById("existingFiles");var list=document.getElementById("fileList");var count=document.getElementById("fileCount");if(!container||!list)return;count.textContent="("+files.length+" \u0E44\u0E1F\u0E25\u0E25\u0E4C)";for(var i=0;i<files.length;i++){var f=files[i];var card=document.createElement("div");card.style.cssText="display:inline-flex;flex-direction:column;gap:2px;margin:4px;padding:6px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;font-size:0.75rem;vertical-align:top";if(f.isImage){var imgA=document.createElement("a");imgA.href=f.url;imgA.target="_blank";var imgEl2=document.createElement("img");imgEl2.src=f.thumbnail;imgEl2.style.cssText="max-width:120px;max-height:80px;border-radius:4px;border:1px solid #e0e0e0";imgA.appendChild(imgEl2);card.appendChild(imgA)}var nameA=document.createElement("a");nameA.href=f.url;nameA.target="_blank";nameA.style.cssText="color:#1565c0;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;display:inline-block";nameA.appendChild(document.createTextNode(f.name));card.appendChild(nameA);var dateSpan=document.createElement("span");dateSpan.style.cssText="color:#999;font-size:0.65rem";dateSpan.appendChild(document.createTextNode(f.date));card.appendChild(dateSpan);list.appendChild(card)}container.style.display="block"}).withFailureHandler(function(){}).listExistingAttachments()}';
  h += 'loadFolderInfo();loadExistingFiles();';
  h += '</script>';
  h += PDPA_FOOTER;
  h += '</body></html>';
  return h;
}

// Server-side file save function called by google.script.run
function saveAttachment(payload) {
  try {
    if(!payload || !payload.content) return {status:'error', message:'No data'};
    var blob = Utilities.newBlob(Utilities.base64Decode(payload.content), payload.mimeType, payload.name);
    var folders = DriveApp.getFoldersByName('PMG Checklist Attachments');
    var folder;
    if(folders.hasNext()) { folder = folders.next(); }
    else { folder = DriveApp.createFolder('PMG Checklist Attachments'); }
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {status:'ok', id:file.getId(), name:file.getName(), url:'https://drive.google.com/file/d/'+file.getId()+'/view', thumbnail:'https://drive.google.com/thumbnail?id='+file.getId()+'&sz=s400', mimeType:payload.mimeType, size:file.getSize()};
  } catch(err) {
    return {status:'error', message:err.toString()};
  }
}

// Get or create the attachments folder and return its URL
function getAttachmentsFolder() {
  var folders = DriveApp.getFoldersByName('PMG Checklist Attachments');
  var folder;
  if(folders.hasNext()) { folder = folders.next(); }
  else { folder = DriveApp.createFolder('PMG Checklist Attachments'); }
  return { id: folder.getId(), url: folder.getUrl() };
}

// List all files in the attachments folder (for showing existing uploads)
function listExistingAttachments() {
  var folders = DriveApp.getFoldersByName('PMG Checklist Attachments');
  if(!folders.hasNext()) return [];
  var folder = folders.next();
  var files = folder.getFiles();
  var result = [];
  while(files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType();
    result.push({
      id: f.getId(),
      name: f.getName(),
      url: 'https://drive.google.com/file/d/' + f.getId() + '/view',
      thumbnail: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=s400',
      mimeType: mime,
      isImage: mime.indexOf('image') === 0,
      size: f.getSize(),
      date: f.getDateCreated().toLocaleDateString('th-TH')
    });
  }
  return result;
}

// ===== API endpoint for reading sheet data =====
var CHECKLIST_SS_ID_API = '1uB9ABT9rv68gg14gVpLf_JAN7WelMSeDo1alltnqbaU';

function readChecklistData(e) {
  try {
    var ss = SpreadsheetApp.openById(CHECKLIST_SS_ID_API);
    if (e && e.parameter && e.parameter.sheets === '1') {
      var sheets = ss.getSheets();
      var info = [];
      for (var i = 0; i < sheets.length; i++) {
        var s = sheets[i];
        info.push({ name: s.getName(), gid: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn() });
      }
      return ContentService.createTextOutput(JSON.stringify(info, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var tab = e && e.parameter && e.parameter.tab ? e.parameter.tab : null;
    if (!tab) {
      return ContentService.createTextOutput('Use ?sheets=1 for list, ?tab=SheetName for data')
        .setMimeType(ContentService.MimeType.PLAIN_TEXT);
    }
    var sheet = ss.getSheetByName(tab);
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var j = 0; j < allSheets.length; j++) {
        if (String(allSheets[j].getSheetId()) === String(tab)) { sheet = allSheets[j]; break; }
      }
    }
    if (!sheet) {
      return ContentService.createTextOutput('Tab not found: ' + tab + '. Available: ' + ss.getSheets().map(function(x){return x.getName()}).join(', '))
        .setMimeType(ContentService.MimeType.PLAIN_TEXT);
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow === 0) {
      return ContentService.createTextOutput('Empty sheet: ' + tab)
        .setMimeType(ContentService.MimeType.PLAIN_TEXT);
    }
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    return ContentService.createTextOutput(JSON.stringify(data, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput('Error: ' + err.toString())
      .setMimeType(ContentService.MimeType.PLAIN_TEXT);
  }
}