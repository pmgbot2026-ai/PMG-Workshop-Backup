/**
 * PMG Repair Flow — ระบบบริหารงานซ่อมแบบ Real-time
 * ช่างคลิกรับงาน/จบงานเอง ไม่ต้องเดินสถานะ
 * แยกสาขา CNB / CSK
 */

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════
var CNB_SS_ID = '1CJPSDffh41nSncbZIf5ehopbZxfBQGtgJcuXpn90Z_4';
var CSK_SS_ID = '1qAtQ9yM4RYFbmnLHG1YVkXsLlsGPmo8i5D6UFa7_uWs';
var MAIN_SS_ID = '1eVb6UmvwFGQVDkvEDGXxAa91DDm-BcigcSwJSqyYwP0';

// DB Sheet (ใช้ชีทหลักของโปรเจ็คเดิม เพื่อให้ทุกคนเข้าถึงได้)
var DB_SS_ID = MAIN_SS_ID;

// สถานีซ่อม 8 สถานี (ตามเดิม)
var STATIONS = [
  { key: 'knock',    name: 'เคาะ',    color: '#dc2626', icon: '🔨' },
  { key: 'patch',    name: 'โป๊ว',    color: '#ea580c', icon: '🧱' },
  { key: 'squirt',   name: 'พ่น',     color: '#d97706', icon: '🎨' },
  { key: 'assemble', name: 'ประกอบ',  color: '#059669', icon: '🔧' },
  { key: 'polish',   name: 'ขัดสี',   color: '#2563eb', icon: '✨' },
  { key: 'wash',     name: 'ล้าง',    color: '#7c3aed', icon: '🧽' },
  { key: 'supQC',    name: 'SUP QC',  color: '#db2777', icon: '✅' },
  { key: 'deliver',  name: 'ส่งมอบ',  color: '#16a34a', icon: '🚗' }
];

var BRANCHES = {
  cnb: { id: CNB_SS_ID, name: 'มหาราช (CNB)', short: 'CNB' },
  csk: { id: CSK_SS_ID, name: 'ซีเอสเค (CSK)', short: 'CSK' }
};

// ═══════════════════════════════════════════════════
// ROUTE
// ═══════════════════════════════════════════════════
function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};

  // API endpoints
  if (p.api === '1') {
    return handleApi(p);
  }

  // Views
  if (p.mechanic === '1') {
    return renderHtmlFile('Mechanic', '🔧 ช่างซ่อม — รับ/จบงาน');
  }
  if (p.plan === '1') {
    return renderHtmlFile('PlanBoard', '📋 วางแผนซ่อม — หัวหน้าโรงซ่อม');
  }
  if (p.dash === '1') {
    return renderHtmlFile('Dashboard', '📊 Dashboard — Real-time');
  }
  if (p.receive === '1') {
    return renderHtmlFile('Receive', '🚗 รับรถเข้าซ่อม');
  }

  // Default: landing page
  return renderHtmlFile('Index', 'PMG Repair Flow');
}

function doPost(e) {
  return doGet(e);
}

function renderHtmlFile(fileName, title) {
  var html = HtmlService.createHtmlOutputFromFile(fileName);
  var url = ScriptApp.getService().getUrl();
  var content = html.getContent();
  content = content.split('SCRIPT_URL_PLACEHOLDER').join(url);
  return HtmlService.createHtmlOutput(content)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ═══════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════
function handleApi(p) {
  var action = p.action || '';
  var data = p.data ? JSON.parse(p.data) : {};

  var result = {};
  try {
    if (action === 'getVehicles') {
      result = getVehiclesFromB2(data.branch || 'cnb');
    }
    else if (action === 'getRepairOrders') {
      result = getRepairOrders(data.branch || 'cnb');
    }
    else if (action === 'createRepairOrder') {
      result = createRepairOrder(data);
    }
    else if (action === 'assignStations') {
      result = assignStations(data);
    }
    else if (action === 'getMechanicJobs') {
      result = getMechanicJobs(data.branch || 'cnb', data.station || '');
    }
    else if (action === 'acceptJob') {
      result = acceptJob(data);
    }
    else if (action === 'finishJob') {
      result = finishJob(data);
    }
    else if (action === 'getDashboard') {
      result = getDashboard(data.branch || 'cnb');
    }
    else if (action === 'getMechanics') {
      result = getMechanicList(data.branch || 'cnb');
    }
    else if (action === 'saveMechanic') {
      result = saveMechanic(data);
    }
    else {
      result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════
// DB HELPERS — ชีท RepairFlow (สร้างอัตโนมัติใน MAIN_SS_ID)
// ═══════════════════════════════════════════════════
function getDBSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(DB_SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    // Format header
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1e3a5f').setFontColor('#fff').setFontWeight('bold');
  }
  return sheet;
}

function getRepairOrdersSheet_() {
  return getDBSheet_('RF_Orders', [
    'orderId', 'branch', 'plate', 'customerName', 'phone', 'sa',
    'insurance', 'brand', 'model', 'repairDate', 'dueDate',
    'status', 'currentStation', 'stations', 'damageDesc',
    'createdAt', 'createdBy'
  ]);
}

function getStationLogSheet_() {
  return getDBSheet_('RF_StationLog', [
    'logId', 'orderId', 'branch', 'plate', 'station', 'mechanicName',
    'acceptTime', 'finishTime', 'durationMin', 'status', 'notes'
  ]);
}

function getMechanicsSheet_() {
  return getDBSheet_('RF_Mechanics', [
    'mechanicId', 'name', 'branch', 'station', 'phone', 'active', 'createdAt'
  ]);
}

// ═══════════════════════════════════════════════════
// ดึงรถจาก B2 (ชีทเดิม)
// ═══════════════════════════════════════════════════
function getVehiclesFromB2(branch) {
  var ssId = BRANCHES[branch] ? BRANCHES[branch].id : CNB_SS_ID;
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = findB2Sheet_(ss);
  if (!sheet) return { success: false, error: 'B2 sheet not found' };

  var lr = sheet.getLastRow();
  var lc = Math.min(sheet.getLastColumn(), 68);
  var startRow = 34;
  var numRows = Math.min(lr - startRow + 1, 200);
  var data = sheet.getRange(startRow, 1, numRows, lc).getValues();

  var vehicles = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var plate = String(row[4] || '').trim();
    if (!plate) continue;
    var status = String(row[3] || '').trim();
    // ข้ามรถที่ส่งมอบแล้ว
    if (status.indexOf('ส่งมอบ') >= 0) continue;

    vehicles.push({
      plate: plate,
      status: status,
      jobId: String(row[5] || '').trim(),
      repairDate: fmtDate(row[6]),
      sa: String(row[9] || '').trim(),
      brand: String(row[63] || '').trim(),
      model: String(row[64] || '').trim(),
      insurer: String(row[65] || '').trim(),
      totalDays: toNum(row[8]),
      completedDate: fmtDate(row[7])
    });
  }
  return { success: true, vehicles: vehicles, branch: branch, count: vehicles.length };
}

function findB2Sheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf('B2') >= 0 || name.indexOf('สถานี') >= 0) return sheets[i];
  }
  // fallback
  return ss.getSheets()[0];
}

// ═══════════════════════════════════════════════════
// Repair Orders
// ═══════════════════════════════════════════════════
function createRepairOrder(data) {
  var sheet = getRepairOrdersSheet_();
  var orderId = 'RF' + new Date().getTime().toString().slice(-8);
  var now = new Date().toISOString();

  sheet.appendRow([
    orderId,
    data.branch || 'cnb',
    data.plate || '',
    data.customerName || '',
    data.phone || '',
    data.sa || '',
    data.insurance || '',
    data.brand || '',
    data.model || '',
    data.repairDate || fmtDate(new Date()),
    data.dueDate || '',
    'waiting',          // status
    '',                 // currentStation
    (data.stations || []).join(','),
    data.damageDesc || '',
    now,
    data.createdBy || ''
  ]);

  return { success: true, orderId: orderId };
}

function getRepairOrders(branch) {
  var sheet = getRepairOrdersSheet_();
  var lr = sheet.getLastRow();
  if (lr < 2) return { success: true, orders: [], branch: branch };

  var data = sheet.getRange(2, 1, lr - 1, 17).getValues();
  var orders = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    if (branch && String(row[1] || '').trim() !== branch) continue;
    orders.push({
      orderId: String(row[0] || ''),
      branch: String(row[1] || ''),
      plate: String(row[2] || ''),
      customerName: String(row[3] || ''),
      phone: String(row[4] || ''),
      sa: String(row[5] || ''),
      insurance: String(row[6] || ''),
      brand: String(row[7] || ''),
      model: String(row[8] || ''),
      repairDate: String(row[9] || ''),
      dueDate: String(row[10] || ''),
      status: String(row[11] || ''),
      currentStation: String(row[12] || ''),
      stations: String(row[13] || '').split(',').filter(function(s){return s;}),
      damageDesc: String(row[14] || ''),
      createdAt: String(row[15] || '')
    });
  }
  return { success: true, orders: orders, branch: branch };
}

function assignStations(data) {
  var sheet = getRepairOrdersSheet_();
  var lr = sheet.getLastRow();
  var allData = sheet.getRange(1, 1, lr, 17).getValues();

  for (var r = 1; r < allData.length; r++) {
    if (String(allData[r][0]) === data.orderId) {
      var stations = (data.stations || []).join(',');
      sheet.getRange(r + 1, 12).setValue('assigned');    // status
      sheet.getRange(r + 1, 13).setValue(data.stations[0] || ''); // currentStation
      sheet.getRange(r + 1, 14).setValue(stations);     // stations list
      return { success: true, orderId: data.orderId, stations: data.stations };
    }
  }
  return { success: false, error: 'Order not found: ' + data.orderId };
}

// ═══════════════════════════════════════════════════
// ช่าง: รับงาน / จบงาน
// ═══════════════════════════════════════════════════
function getMechanicJobs(branch, station) {
  var ordersSheet = getRepairOrdersSheet_();
  var lr = ordersSheet.getLastRow();
  if (lr < 2) return { success: true, jobs: [], branch: branch, station: station };

  var data = ordersSheet.getRange(2, 1, lr - 1, 17).getValues();
  var logSheet = getStationLogSheet_();
  var logLr = logSheet.getLastRow();
  var logData = logLr >= 2 ? logSheet.getRange(2, 1, logLr - 1, 11).getValues() : [];

  // Build map of active logs (accepted but not finished)
  var activeLogs = {};
  for (var i = 0; i < logData.length; i++) {
    if (String(logData[i][9]) === 'accepted') {
      activeLogs[String(logData[i][1])] = logData[i]; // orderId -> log row
    }
  }

  var jobs = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var oBranch = String(row[1] || '').trim();
    if (oBranch !== branch) continue;

    var status = String(row[11] || '').trim();
    var currentStation = String(row[12] || '').trim();
    var stationsList = String(row[13] || '').split(',').filter(function(s){return s;});

    // If station specified, filter by currentStation
    if (station && currentStation !== station) continue;

    // Skip completed/delivered
    if (status === 'completed' || status === 'delivered') continue;

    var orderId = String(row[0]);
    var activeLog = activeLogs[orderId];
    var acceptedBy = activeLog ? String(activeLog[5]) : '';
    var acceptTime = activeLog ? String(activeLog[6]) : '';

    jobs.push({
      orderId: orderId,
      plate: String(row[2] || ''),
      customerName: String(row[3] || ''),
      sa: String(row[5] || ''),
      insurance: String(row[6] || ''),
      brand: String(row[7] || ''),
      model: String(row[8] || ''),
      repairDate: String(row[9] || ''),
      dueDate: String(row[10] || ''),
      status: status,
      currentStation: currentStation,
      stations: stationsList,
      damageDesc: String(row[14] || ''),
      acceptedBy: acceptedBy,
      acceptTime: acceptTime,
      isAccepted: !!activeLog
    });
  }
  return { success: true, jobs: jobs, branch: branch, station: station };
}

function acceptJob(data) {
  var logSheet = getStationLogSheet_();
  var logId = 'LG' + new Date().getTime().toString().slice(-8);
  var now = new Date();

  // Check if already accepted
  var logLr = logSheet.getLastRow();
  var logData = logLr >= 2 ? logSheet.getRange(2, 1, logLr, 11).getValues() : [];
  for (var i = 0; i < logData.length; i++) {
    if (String(logData[i][1]) === data.orderId && String(logData[i][9]) === 'accepted') {
      return { success: false, error: 'งานนี้ถูกรับไปแล้วโดย ' + logData[i][5] };
    }
  }

  logSheet.appendRow([
    logId,
    data.orderId,
    data.branch || '',
    data.plate || '',
    data.station || '',
    data.mechanicName || '',
    now.toISOString(),
    '',                 // finishTime
    '',                 // durationMin
    'accepted',
    data.notes || ''
  ]);

  // Update order status
  var ordersSheet = getRepairOrdersSheet_();
  var ordersLr = ordersSheet.getLastRow();
  var ordersData = ordersSheet.getRange(1, 1, ordersLr, 17).getValues();
  for (var r = 1; r < ordersData.length; r++) {
    if (String(ordersData[r][0]) === data.orderId) {
      ordersSheet.getRange(r + 1, 12).setValue('in_progress');
      break;
    }
  }

  return { success: true, logId: logId, acceptTime: now.toISOString() };
}

function finishJob(data) {
  var logSheet = getStationLogSheet_();
  var logLr = logSheet.getLastRow();
  var logData = logSheet.getRange(1, 1, logLr, 11).getValues();
  var now = new Date();

  for (var r = 1; r < logData.length; r++) {
    if (String(logData[r][1]) === data.orderId && String(logData[r][9]) === 'accepted') {
      var acceptTime = new Date(logData[r][6]);
      var durationMin = Math.round((now - acceptTime) / 60000);

      logSheet.getRange(r + 1, 8).setValue(now.toISOString());  // finishTime
      logSheet.getRange(r + 1, 9).setValue(durationMin);          // durationMin
      logSheet.getRange(r + 1, 10).setValue('finished');          // status

      // Update order: advance to next station
      var ordersSheet = getRepairOrdersSheet_();
      var ordersLr = ordersSheet.getLastRow();
      var ordersData = ordersSheet.getRange(1, 1, ordersLr, 17).getValues();

      for (var or = 1; or < ordersData.length; or++) {
        if (String(ordersData[or][0]) === data.orderId) {
          var stations = String(ordersData[or][13]).split(',').filter(function(s){return s;});
          var currentIdx = stations.indexOf(String(ordersData[or][12]));

          if (currentIdx >= 0 && currentIdx < stations.length - 1) {
            // Move to next station
            var nextStation = stations[currentIdx + 1];
            ordersSheet.getRange(or + 1, 13).setValue(nextStation); // currentStation
            ordersSheet.getRange(or + 1, 12).setValue('assigned');   // status
          } else {
            // Last station done
            ordersSheet.getRange(or + 1, 12).setValue('completed');
            ordersSheet.getRange(or + 1, 13).setValue('deliver');
          }
          break;
        }
      }

      return { success: true, durationMin: durationMin, finishTime: now.toISOString() };
    }
  }
  return { success: false, error: 'ไม่พบงานที่ยังไม่ได้จบสำหรับ order: ' + data.orderId };
}

// ═══════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════
function getDashboard(branch) {
  var result = { branch: branch, vehicles: [], stationSummary: {}, stats: {} };

  var ordersSheet = getRepairOrdersSheet_();
  var ordersLr = ordersSheet.getLastRow();
  var orders = ordersLr >= 2 ? ordersSheet.getRange(2, 1, ordersLr - 1, 17).getValues() : [];

  var logSheet = getStationLogSheet_();
  var logLr = logSheet.getLastRow();
  var logData = logLr >= 2 ? logSheet.getRange(2, 1, logLr, 11).getValues() : [];

  // Active logs
  var activeLogs = {};
  var finishedLogs = [];
  for (var i = 0; i < logData.length; i++) {
    if (String(logData[i][9]) === 'accepted') {
      activeLogs[String(logData[i][1])] = logData[i];
    }
    if (String(logData[i][9]) === 'finished') {
      finishedLogs.push(logData[i]);
    }
  }

  // Station summary
  var stnSummary = {};
  STATIONS.forEach(function(s) {
    stnSummary[s.key] = { name: s.name, count: 0, active: 0, waiting: 0, done: 0, color: s.color };
  });

  var totalWaiting = 0, totalActive = 0, totalDone = 0;

  for (var r = 0; r < orders.length; r++) {
    var row = orders[r];
    if (String(row[1]).trim() !== branch) continue;

    var orderId = String(row[0]);
    var status = String(row[11]).trim();
    var currentStation = String(row[12]).trim();
    var stationsList = String(row[13]).split(',').filter(function(s){return s;});

    var activeLog = activeLogs[orderId];
    var mechanicName = activeLog ? String(activeLog[5]) : '';
    var acceptTime = activeLog ? String(activeLog[6]) : '';
    var durationMin = 0;
    if (acceptTime) {
      durationMin = Math.round((new Date() - new Date(acceptTime)) / 60000);
    }

    var vehicle = {
      orderId: orderId,
      plate: String(row[2]),
      customerName: String(row[3]),
      sa: String(row[5]),
      insurance: String(row[6]),
      brand: String(row[7]),
      model: String(row[8]),
      repairDate: String(row[9]),
      dueDate: String(row[10]),
      status: status,
      currentStation: currentStation,
      stations: stationsList,
      mechanicName: mechanicName,
      acceptTime: acceptTime,
      durationMin: durationMin,
      damageDesc: String(row[14])
    };
    result.vehicles.push(vehicle);

    if (currentStation && stnSummary[currentStation]) {
      stnSummary[currentStation].count++;
      if (activeLog) {
        stnSummary[currentStation].active++;
        totalActive++;
      } else if (status === 'assigned') {
        stnSummary[currentStation].waiting++;
        totalWaiting++;
      }
    }
    if (status === 'completed') totalDone++;
  }

  result.stationSummary = stnSummary;
  result.stats = {
    total: result.vehicles.length,
    waiting: totalWaiting,
    inProgress: totalActive,
    completed: totalDone
  };

  // Mechanic performance from finished logs
  var mechPerf = {};
  for (var fi = 0; fi < finishedLogs.length; fi++) {
    var fl = finishedLogs[fi];
    var mName = String(fl[5]);
    if (!mName) continue;
    if (!mechPerf[mName]) mechPerf[mName] = { name: mName, jobs: 0, totalMin: 0, avgMin: 0 };
    mechPerf[mName].jobs++;
    var dur = Number(fl[8]) || 0;
    mechPerf[mName].totalMin += dur;
  }
  for (var mn in mechPerf) {
    if (mechPerf[mn].jobs > 0) mechPerf[mn].avgMin = Math.round(mechPerf[mn].totalMin / mechPerf[mn].jobs);
  }
  result.mechanicPerf = Object.values(mechPerf);

  return { success: true, data: result };
}

// ═══════════════════════════════════════════════════
// Mechanics management
// ═══════════════════════════════════════════════════
function getMechanicList(branch) {
  var sheet = getMechanicsSheet_();
  var lr = sheet.getLastRow();
  if (lr < 2) return { success: true, mechanics: [], branch: branch };

  var data = sheet.getRange(2, 1, lr - 1, 7).getValues();
  var mechanics = [];
  for (var r = 0; r < data.length; r++) {
    if (branch && String(data[r][2]).trim() !== branch) continue;
    mechanics.push({
      mechanicId: String(data[r][0]),
      name: String(data[r][1]),
      branch: String(data[r][2]),
      station: String(data[r][3]),
      phone: String(data[r][4]),
      active: String(data[r][5]) === 'true',
      createdAt: String(data[r][6])
    });
  }
  return { success: true, mechanics: mechanics, branch: branch };
}

function saveMechanic(data) {
  var sheet = getMechanicsSheet_();
  var mechanicId = data.mechanicId || ('MC' + new Date().getTime().toString().slice(-6));
  var now = new Date().toISOString();

  // Check if exists
  var lr = sheet.getLastRow();
  if (lr >= 2) {
    var allData = sheet.getRange(2, 1, lr - 1, 7).getValues();
    for (var r = 0; r < allData.length; r++) {
      if (String(allData[r][0]) === mechanicId) {
        // Update
        sheet.getRange(r + 2, 2).setValue(data.name || '');
        sheet.getRange(r + 2, 3).setValue(data.branch || '');
        sheet.getRange(r + 2, 4).setValue(data.station || '');
        sheet.getRange(r + 2, 5).setValue(data.phone || '');
        sheet.getRange(r + 2, 6).setValue(data.active !== false ? 'true' : 'false');
        return { success: true, mechanicId: mechanicId, updated: true };
      }
    }
  }
  // Insert new
  sheet.appendRow([mechanicId, data.name || '', data.branch || '', data.station || '', data.phone || '', 'true', now]);
  return { success: true, mechanicId: mechanicId, created: true };
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  try {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch(e) {
    return String(d);
  }
}

function toNum(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Test function
function testGetVehicles() {
  var r = getVehiclesFromB2('cnb');
  Logger.log('CNB vehicles: ' + r.count);
  var r2 = getVehiclesFromB2('csk');
  Logger.log('CSK vehicles: ' + r2.count);
}