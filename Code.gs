/* ═══════════════════════════════════════════════════
   PMG Workshop Dashboard v3 — บริหารงานซ่อม
   - Station-level cycle time from CNB/CSK B2 data
   - Period-based filtering (daily/monthly/yearly)
   - 5 tabs: Overview, Status, Check, Station KPI, Movement
   - Full vehicle data: brand, model, insurance, wage, SA, saCenter
   ═══════════════════════════════════════════════════ */

var SS_ID = '1eVb6UmvwFGQVDkvEDGXxAa91DDm-BcigcSwJSqyYwP0';
var CNB_SS_ID = '1CJPSDffh41nSncbZIf5ehopbZxfBQGtgJcuXpn90Z_4';
var CSK_SS_ID = '1qAtQ9yM4RYFbmnLHG1YVkXsLlsGPmo8i5D6UFa7_uWs';
var INS_SS_ID = '1rqD0cIuCK5dU2uNjafx1qJRpeY7Bc69-jXN2FB1JK2c';
var BCT_SS_ID = '1iy5rYKERWSJwk8m49hNTMr_3CkLBm3PNe27k5zARuCU';

// Temp: read any sheet from any SS
function readForeignSheet_(ssid, sheetName, maxRows) {
  var ss = SpreadsheetApp.openById(ssid);
  if (!sheetName) {
    var sheets = ss.getSheets();
    return {sheets: sheets.map(function(s){ return s.getName(); })};
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {error: 'Sheet not found: ' + sheetName};
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  var rows = Math.min(lr, maxRows || 100);
  if (rows < 1) return {data: [], totalRows: lr, totalCols: lc};
  var data = sheet.getRange(1, 1, rows, lc).getValues();
  return {data: data, totalRows: lr, totalCols: lc};
}

// Temp: read any sheet from any SS
function readForeignSheet_(ssid, sheetName, maxRows) {
  var ss = SpreadsheetApp.openById(ssid);
  if (!sheetName) {
    var sheets = ss.getSheets();
    return {sheets: sheets.map(function(s){ return s.getName(); })};
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {error: 'Sheet not found: ' + sheetName};
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  var rows = Math.min(lr, maxRows || 100);
  if (rows < 1) return {data: [], totalRows: lr, totalCols: lc};
  var data = sheet.getRange(1, 1, rows, lc).getValues();
  return {data: data, totalRows: lr, totalCols: lc};
}

/* ═══ Web App Entry ═══ */


function doGet(e) {
  if (!e) e = { parameter: {} };
  var p = e.parameter || {};
  
  // Force-trigger external_request scope authorization on first run
  try { UrlFetchApp.fetch('https://www.google.com', {muteHttpExceptions: true}); } catch(err) {}
  
  if (p.debug === 'readsheet' && p.ssid) { var r = readForeignSheet_(p.ssid, p.sheet || '', parseInt(p.maxrows) || 0); return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON); }
  if (p.api === '1') {
    // Handle write actions via GET (since GAS Web Apps can't handle POST from external fetch)
    // Actions that don't need data params
    var noDataActions = ['getConfigSettings', 'getRawProps', 'getCalendar', 'getQueue', 'fetchRepairOrder', 'saveBillingSnapshot'];
    if (p.action && (p.data || noDataActions.indexOf(p.action) >= 0)) {
      var actionData;
      if (p.data) {
        try {
          actionData = JSON.parse(p.data);
        } catch(err) {
          return ContentService.createTextOutput(JSON.stringify({success:false,error:'Invalid JSON data'}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } else {
        actionData = {};
      }
      var actionResult;
      if (p.action === 'reschedule') {
        actionResult = saveReschedule(actionData);
      } else if (p.action === 'deliveryDate') {
        actionResult = saveDeliveryDate(actionData);
      } else if (p.action === 'moveStation') {
        actionResult = saveMoveStation(actionData);
      } else if (p.action === 'sendNotification') {
        actionResult = bctSendNotification_(actionData);
      } else if (p.action === 'saveConfig') {
        actionResult = bctSaveConfig_(actionData);
      } else if (p.action === 'getConfigSettings') {
        actionResult = bctGetConfigSettings_();
      } else if (p.action === 'getRawProps') {
        actionResult = bctGetRawProps_();
      } else if (p.action === 'getCalendar') {
        var bctSS = SpreadsheetApp.openById(BCT_SS_ID);
        actionResult = bctGetCalendar_(bctSS, {});
      } else if (p.action === 'getQueue') {
        var bctSS2 = SpreadsheetApp.openById(BCT_SS_ID);
        actionResult = bctGetQueue_(bctSS2, {});
      } else if (p.action === 'fetchRepairOrder') {
        actionResult = fetchRepairOrderProxy_(p.url || '');
      } else if (p.action === 'saveBillingSnapshot') {
        actionResult = billingSaveAllSnapshots_();
      } else {
        actionResult = { success: false, error: 'Unknown action: ' + p.action };
      }
      return ContentService.createTextOutput(JSON.stringify(actionResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var tab = p.tab || 'overview';
    var period = p.period || null;
    var branch = p.branch || null;
    var year = p.year ? parseInt(p.year) : null;
    var month = p.month ? parseInt(p.month) : null;
    var date = p.date || null;
    var dateFrom = p.datefrom || p.dateFrom || null;
    var dateTo = p.dateto || p.dateTo || null;

    if (p.debug) {
      // Debug endpoint: list CSK sheet names and billing headers
      
      
      
    
    
      
      
    if (p.debug === 'csk_headers' || p.debug === 'csk') {
        var cskInfo = listCSKSheets();
        return ContentService.createTextOutput(JSON.stringify(cskInfo, null, 2))
          .setMimeType(ContentService.MimeType.JSON);
      }
      // Debug: list CNB billing headers too
      if (p.debug === 'cnb_headers') {
        var cnbSS = SpreadsheetApp.openById(CNB_SS_ID);
        var cnbSheets = cnbSS.getSheets();
        var cnbResult = { sheetNames: [], billingHeaders: {} };
        for (var si = 0; si < cnbSheets.length; si++) {
          var sname = cnbSheets[si].getName();
          var slr = cnbSheets[si].getLastRow();
          var slc = Math.min(cnbSheets[si].getLastColumn(), 30);
          cnbResult.sheetNames.push(sname + ' (rows: ' + slr + ', cols: ' + slc + ')');
          if (sname.indexOf('วางบิล') === 0 && slr > 1) {
            var hd = cnbSheets[si].getRange(1, 1, Math.min(slr, 4), slc).getValues();
            var hi = { name: sname, rows: [] };
            for (var r = 0; r < hd.length; r++) {
              var ro = {};
              for (var c = 0; c < hd[r].length; c++) {
                var v = hd[r][c];
                if (v !== '' && v !== null && v !== undefined) ro['col' + String.fromCharCode(65 + c)] = v;
              }
              hi.rows.push(ro);
            }
            cnbResult.billingHeaders[sname] = hi;
          }
        }
        return ContentService.createTextOutput(JSON.stringify(cnbResult, null, 2))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({error: 'Unknown debug command'}, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var result = getWorkshopData(tab, period, branch, year, month, date, dateFrom, dateTo);
    var output = ContentService.createTextOutput(safeJson(result));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
  
  // ═══ BCT Glass Coating ═══
  if (p.bct === 'setup') {
    var setupResults = [];
    var needAuth = false;
    // Try triggers
    try {
      var trigResult = bctSetupTriggers_();
      setupResults = setupResults.concat(trigResult);
      for (var ti = 0; ti < trigResult.length; ti++) {
        if (trigResult[ti].status === 'NEED_REAUTH') needAuth = true;
      }
    } catch(e) {
      needAuth = true;
      setupResults.push({trigger: 'dailyMaintenanceCheck', status: 'NEED_REAUTH', message: String(e)});
    }
    // Try form
    try {
      var formResult = bctCreateBookingForm_();
      setupResults.push(formResult);
      if (formResult.status === 'NEED_REAUTH') needAuth = true;
    } catch(e) {
      needAuth = true;
      setupResults.push({form: 'NEED_REAUTH', message: String(e)});
    }
    // If auth is needed, show HTML page with authorize link
    if (needAuth) {
      var authUrl = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationUrl();
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
      html += '<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;background:#1a1a2e;color:#e0e0e0}';
      html += '.card{background:#16213e;border-radius:12px;padding:24px;margin:16px 0;border:1px solid #0f3460}';
      html += 'h1{color:#e94560;text-align:center}h2{color:#53d8fb}.ok{color:#4ecca3}.err{color:#e94560}';
      html += 'a.btn{display:block;text-align:center;background:#e94560;color:#fff;padding:16px;border-radius:8px;text-decoration:none;font-size:18px;margin:20px 0}';
      html += 'a.btn:hover{background:#c81e45}.step{background:#0f3460;padding:12px 16px;border-radius:8px;margin:8px 0}</style></head>';
      html += '<body><h1>⚙️ BCT ตั้งค่าระบบ</h1>';
      html += '<div class="card"><h2>📋 ผลการตรวจสอบ</h2>';
      for (var ri = 0; ri < setupResults.length; ri++) {
        var r = setupResults[ri];
        if (r.status === 'NEED_REAUTH') {
          html += '<p class="err">⚠️ ' + (r.trigger || r.form || 'item') + ': ต้องอนุญาตสิทธิ์ก่อน</p>';
        } else {
          html += '<p class="ok">✅ ' + JSON.stringify(r) + '</p>';
        }
      }
      html += '</div>';
      if (authUrl) {
        html += '<div class="card"><h2>🔑 อนุญาตสิทธิ์ Google</h2>';
        html += '<p>กดปุ่มด้านล่างเพื่ออนุญาตสิทธิ์ที่จำเป็น (ปฏิทิน, แบบฟอร์ม, ไดรฟ์)</p>';
        html += '<a class="btn" href="' + authUrl + '" target="_blank">🔑 อนุญาตสิทธิ์ (Authorize)</a>';
        html += '<p>หลังอนุญาตแล้ว กลับมาหน้านี้อีกครั้ง</p>';
      } else {
        html += '<div class="card"><h2>🔑 อนุญาตสิทธิ์ Google</h2>';
        html += '<p>เปิด Apps Script Editor → เลือก function ใดๆ → กด Run → กด Allow</p>';
        html += '<a class="btn" href="https://script.google.com/d/1uLcIjLf-7LS0LqBXKTidED99WTFgccB6VK8KdYn-9mmIm565wF0UPS7s/edit" target="_blank">📝 เปิด Apps Script Editor</a>';
      }
      html += '</div>';
      html += '<div class="card"><h2>📖 ขั้นตอน</h2>';
      html += '<div class="step">1. กดปุ่ม "อนุญาตสิทธิ์" ด้านบน</div>';
      html += '<div class="step">2. เลือกบัญชี Google ของคุณ</div>';
      html += '<div class="step">3. กด "Advanced" → "Go to PMG Workshop" (ถ้าเห็น warning)</div>';
      html += '<div class="step">4. กด "Allow" ให้สิทธิ์ทั้งหมด</div>';
      html += '<div class="step">5. กลับมาหน้านี้ กดปุ่มด้านล่างเพื่อตั้งค่าอีกครั้ง</div>';
      html += '<a class="btn" href="' + ScriptApp.getService().getUrl() + '?bct=setup">🔄 ตั้งค่าอีกครั้ง (หลังอนุญาตแล้ว)</a>';
      html += '</div></body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('BCT ตั้งค่าระบบ');
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, results: setupResults}, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (p.bct === 'ui') {
    // Serve BCT Glass Coating UI
    var html = HtmlService.createHtmlOutputFromFile('BCT_Index');
    return html.setTitle('BCT เคลือบแก้ว 2569')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (p.bct === '1') {
    var bctResult = handleBctRequest(p);
    return ContentService.createTextOutput(safeJson(bctResult)).setMimeType(ContentService.MimeType.JSON);
  }

  // Standard Time — มาตรฐานเวลางานซ่อม
  if (p.stdtime === '1') {
    // Print mode: render a FULL printable work order (no iframe, no JS needed)
    if (p.print === '1') {
      var urlParam = p.url || '';
      var plateParam = p.plate || '';
      var data = {};
      if (urlParam) {
        try { data = fetchRepairOrderProxy_(urlParam) || {}; } catch(e) { data = {error: e.message}; }
      }
      var plate = data.plate || plateParam || '';
      var brand = data.brand || '-';
      var model = data.model || '-';
      var insurance = data.insurance || '-';
      var insuranceLevel = data.insuranceLevel || '-';
      var sa = data.sa || '-';
      var claimNo = data.claimNo || '-';
      var totalWage = data.totalWage || 0;
      // Calculate stdTime from totalWage (same logic as Standard_Time.html)
      var stdTime = lookupStdTimeGS_(totalWage);
      var now = new Date();
      var thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      var orderDate = thaiMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);
      var repairDate = data.repairDate ? Utilities.formatDate(new Date(data.repairDate), 'Asia/Bangkok', 'dd/MM/') + (new Date(data.repairDate).getFullYear() + 543) : orderDate;
      
      // Station data (same as Standard_Time.html)
      var stations = [
        {key:'remove',name:'ถอดชิ้นส่วน',icon:'🔧'},
        {key:'body_repair',name:'เคาะ',icon:'🔨'},
        {key:'frame_repair',name:'ดัดแชสซี',icon:'⚙️'},
        {key:'putty',name:'โป๊ว',icon:'🧴'},
        {key:'putty_drying',name:'รอสีโป๊วเช็ดตัว',icon:'⏳',isWait:true},
        {key:'putty_prep',name:'ขัดโป๊ว/พ่นสีพื้น',icon:'📋'},
        {key:'primary_drying',name:'รอสีพื้นเช็ดตัว',icon:'⏳',isWait:true},
        {key:'primary_prep',name:'ขัดสีพื้น/ติดกระดาษ',icon:'📋'},
        {key:'mixing',name:'ผสมสี',icon:'🎨'},
        {key:'painting',name:'พ่น',icon:'🖌️'},
        {key:'bake',name:'อบสี',icon:'🔥'},
        {key:'paint_drying',name:'รอสีเช็ดตัว',icon:'⏳',isWait:true},
        {key:'assembly',name:'ประกอบ',icon:'🔩'},
        {key:'polish',name:'ขัดสี',icon:'✨'},
        {key:'washing',name:'ล้าง',icon:'🚿'},
        {key:'final_check',name:'เก็บงานตรวจขั้นสุดท้าย',icon:'✅'}
      ];
      var checklists = {
        'remove': ['ความครบถ้วนงานประเมินรายการเพิ่มเติม','ความครบถ้วนครอบคลุมชิ้นส่วนงานซ่อม','ตรวจเช็กชิ้นส่วนอะไหล่ถอดครบถ้วน','ตรวจเช็กอะไหล่ใหม่ ไม่ผิดรุ่น','ตรวจเช็กอะไหล่ใหม่ ไม่ติด Back Order','ตรวจเช็กอะไหล่ใหม่ ไม่ล่าช้า','ตรวจเช็กความพร้อมของอะไหล่ใหม่','ตรวจเช็กอะไหล่ใหม่ ไม่เป็นรอย'],
        'body_repair': ['ตรวจเช็กไม่มีผิวงานเคาะสูงกว่าผิวเดิม','ตรวจเช็กไม่มีผิวงานเคาะต่ำกว่าผิวเดิม','ตรวจเช็กไม่มีผิวงานเคาะเป็นคลื่น','ตรวจเช็กรอยเชื่อม CO2 มีสภาพปกติ','ตรวจเช็กรอยสปอตมีขนาดและระยะปกติ','ตรวจเช็กรอยเชื่อมกระตุกมีสภาพปกติ','ตรวจเช็กมีการป้องกันสนิมภายใน','ตรวจเช็กมีการเซ็ทงานและติดตั้งชิ้นส่วนทดลอง'],
        'putty': ['ตรวจเช็กไม่มีรอยกระดาษทรายจากบล็อกขัด','ตรวจเช็กไม่มีรอยกระดาษทรายจากเครื่องขัด','ตรวจเช็กไม่มีรอยเส้นจากสก๊อตไบร์ท','ตรวจเช็กไม่มีรอยตามด','ตรวจเช็กไม่มีผิวคลื่นสูง','ตรวจเช็กไม่มีผิวคลื่นต่ำ','ตรวจเช็กไม่มีผิวเป็นหลุม','ตรวจเช็กไม่มีคราบสีพื้นติดชิ้นส่วนที่ไม่เกี่ยวข้อง'],
        'painting': ['ตรวจเช็กแผ่นพ่นเทียบสีกับตัวรถเหมือนสีเดิม','ตรวจเช็กไม่มีเม็ดฝุ่นจากสิ่งสกปรก','ตรวจเช็กไม่มีเม็ดฝุ่นจากละอองสี','ตรวจเช็กไม่มีสีไหล','ตรวจเช็กไม่มีคราบแวกซ์','ตรวจเช็กสภาพผิวไม่เป็นคลื่น','ตรวจเช็กไม่มีรอยเส้นกระดาษทราย','ตรวจเช็กไม่มีผิวส้มทั้งชั้นสีและเคลียร์','ตรวจเช็กไม่มีผิวโตทั้งชั้นสีและเคลียร์','ตรวจเช็กสภาพซ่อมสีเหมือนกับสีเดิม'],
        'assembly': ['ตรวจเช็กระยะห่างชิ้นส่วนตามค่ามาตรฐาน','ตรวจเช็กไม่เกิดรอยจากการประกอบชิ้นส่วน','ตรวจเช็กประกอบอะไหล่ตรงรุ่น','ตรวจเช็กความครบถ้วนของชิ้นส่วนประกอบ','ตรวจเช็กมีการพ่นสีหัวน็อต','ตรวจเช็กไม่มีการรอชิ้นส่วนงานพ่นสี','ตรวจเช็กการทำงานของระบบไฟและอุปกรณ์'],
        'polish': ['ตรวจเช็กสภาพผิวสีเงางามหลังจากขัด','ตรวจเช็กไม่มีรอยขนเกาะ','ตรวจเช็กไม่มีรอยขัดแตก','ตรวจเช็กไม่มีรอยสก๊อตไบร์ท','ตรวจเช็กไม่มีรอยขัดหนักเกินไป','ตรวจเช็กไม่มีรอยขัดบางเกินไป']
      };
      
      // Calculate standard time values
      var mechanicWorkHr = stdTime.mechanic_work_hr || 0;
      var mechanicDays = stdTime.mechanic_days || 0;
      var parkingDays = stdTime.parking_days || 0;
      var workHrPerDay = 7;
      
      // Fetch movement data for actual dates (from repair order proxy which now includes movement)
      var mvmtMap = {};
      var mvmtRows = data.movement || [];
      if (mvmtRows.length) {
        var mvmtToStd = { knock: 'body_repair', patch: 'putty', squirt: '__paint_group__', assemble: 'assembly', polish: 'polish', wash: 'washing' };
          var paintSubStations = ['putty_drying','putty_prep','primary_drying','primary_prep','mixing','painting','bake','paint_drying'];
          var paintGroup = null;
          for (var mi = 0; mi < mvmtRows.length; mi++) {
            var mr = mvmtRows[mi];
            var msk = mvmtToStd[mr.stationKey];
            if (!msk) continue;
            if (msk === '__paint_group__') {
              paintGroup = { start: mr.startDate, end: mr.endDate, name: mr.station };
            } else {
              if (!mvmtMap[msk]) mvmtMap[msk] = {};
              if (mr.startDate) mvmtMap[msk].start = mr.startDate;
              if (mr.endDate) mvmtMap[msk].end = mr.endDate;
            }
          }
          // Distribute paint group across sub-stations
          if (paintGroup && paintGroup.start && paintGroup.end && stdTime) {
            var pStart = new Date(paintGroup.start);
            var pEnd = new Date(paintGroup.end);
            var totalPaintMs = pEnd.getTime() - pStart.getTime();
            if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime()) || totalPaintMs <= 0) {
              // Date strings may be dd/MM/yyyy — just use start/end as-is for all sub-stations
              for (var ps2 = 0; ps2 < paintSubStations.length; ps2++) {
                mvmtMap[paintSubStations[ps2]] = { start: paintGroup.start, end: paintGroup.end };
              }
            } else {
              var totalPaintHrs = 0;
              var subHrs = {};
              for (var si = 0; si < paintSubStations.length; si++) {
                var hrs = stdTime[paintSubStations[si]] || 0;
                subHrs[paintSubStations[si]] = hrs;
                totalPaintHrs += hrs;
              }
              var cumHrs2 = 0;
              for (var si2 = 0; si2 < paintSubStations.length; si2++) {
                cumHrs2 += subHrs[paintSubStations[si2]];
                var fraction = totalPaintHrs > 0 ? cumHrs2 / totalPaintHrs : 0;
                var subEndDate = new Date(pStart.getTime() + totalPaintMs * fraction);
                mvmtMap[paintSubStations[si2]] = { start: fmtDate(pStart), end: fmtDate(subEndDate) };
              }
              mvmtMap[paintSubStations[0]].start = fmtDate(pStart);
              mvmtMap[paintSubStations[paintSubStations.length - 1]].end = fmtDate(pEnd);
            }
          }
          // Implied dates: if later station has start, previous station's end = that start
          var stOrder = ['remove','body_repair','frame_repair','putty','putty_drying','putty_prep','primary_drying','primary_prep','mixing','painting','bake','paint_drying','assembly','polish','washing','final_check'];
          for (var soi = stOrder.length - 1; soi >= 1; soi--) {
            if (mvmtMap[stOrder[soi]] && mvmtMap[stOrder[soi]].start) {
              if (!mvmtMap[stOrder[soi-1]]) mvmtMap[stOrder[soi-1]] = {};
              if (!mvmtMap[stOrder[soi-1]].end) {
                mvmtMap[stOrder[soi-1]].end = mvmtMap[stOrder[soi]].start;
              }
            }
          }
        }
      
      // If movement data is empty, try to use order dates for first station
      var baseDateForCalc = data.baseDate || data.dateIn || data.repairDate || '';
      if (Object.keys(mvmtMap).length === 0 && baseDateForCalc) {
        mvmtMap['remove'] = { start: fmtDate(new Date(baseDateForCalc)) };
      }
      
      // Build station rows
      var stationRows = '';
      var cumHrs = 0;
      for (var i = 0; i < stations.length; i++) {
        var st = stations[i];
        var hrs = stdTime[st.key] || 0;
        cumHrs += hrs;
        var dayNo = Math.ceil(cumHrs / workHrPerDay);
        var bgStyle = st.isWait ? ' style="background:#fffbeb"' : '';
        var mvmt = mvmtMap[st.key] || {};
        var startCell = mvmt.start ? fmtDateThaiGS_(mvmt.start) : '&nbsp;';
        var endCell = mvmt.end ? fmtDateThaiGS_(mvmt.end) : '&nbsp;';
        var actualHrs = '&nbsp;';
        var actualDateCell = '&nbsp;';
        if (mvmt.start && mvmt.end) {
          // Calculate actual working hours (7hr/day, exclude Sunday)
          try {
            var dS2 = new Date(mvmt.start);
            var dE2 = new Date(mvmt.end);
            if (!isNaN(dS2.getTime()) && !isNaN(dE2.getTime())) {
              var workDays = countWorkingDaysGS_(dS2, dE2);
              actualHrs = (workDays * workHrPerDay).toFixed(1) + ' ชม.';
              actualDateCell = fmtDateThaiGS_(mvmt.end);
            }
          } catch(e3) {}
        }
        // Calculate target completion date: baseDate + dayNo working days
        var targetDateCell = '&nbsp;';
        if (baseDateForCalc) {
          try {
            var bd = new Date(baseDateForCalc);
            if (!isNaN(bd.getTime())) {
              var targetDate = addWorkingDaysGS_(bd, dayNo);
              targetDateCell = fmtDateThaiGS_(targetDate);
            }
          } catch(e4) {}
        }
        stationRows += '<tr' + bgStyle + '>';
        stationRows += '<td>' + st.icon + ' ' + st.name + '</td>';
        stationRows += '<td style="text-align:center;font-weight:700">' + hrs.toFixed(2) + '</td>';
        stationRows += '<td style="text-align:center">วันที่ ' + dayNo + '</td>';
        stationRows += '<td style="text-align:center">' + targetDateCell + '</td>';
        stationRows += '<td style="text-align:center">' + startCell + '</td>';
        stationRows += '<td style="text-align:center">' + endCell + '</td>';
        stationRows += '<td style="text-align:center">' + actualHrs + '</td>';
        stationRows += '<td style="text-align:center">' + actualDateCell + '</td>';
        stationRows += '<td style="text-align:center"><input type="checkbox"></td>';
        stationRows += '</tr>';
        // QC checklist
        var cl = checklists[st.key];
        if (cl && cl.length) {
          stationRows += '<tr><td colspan="9" style="background:#fafbfc;padding:4px 12px"><ol style="margin:2px 0;padding-left:18px;font-size:.8rem">';
          for (var j = 0; j < cl.length; j++) {
            stationRows += '<li>' + cl[j] + '</li>';
          }
          stationRows += '</ol></td></tr>';
        }
      }
      
      // Items table
      var items = data.items || [];
      var itemsHtml = '';
      if (items.length) {
        itemsHtml = '<h3 style="margin-top:12px">รายการค่าแรง</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#e8f0fe"><th style="border:1px solid #333;padding:6px">รายการ</th><th style="border:1px solid #333;padding:6px">จำนวนเต็ม</th><th style="border:1px solid #333;padding:6px">ส่วนลด</th><th style="border:1px solid #333;padding:6px">หลังลด</th></tr>';
        for (var k = 0; k < items.length; k++) {
          itemsHtml += '<tr><td style="border:1px solid #333;padding:6px">' + (items[k].desc||'') + '</td><td style="border:1px solid #333;padding:6px;text-align:right">' + (items[k].amount||0) + '</td><td style="border:1px solid #333;padding:6px;text-align:center">' + (items[k].discount||0) + '%</td><td style="border:1px solid #333;padding:6px;text-align:right">' + (items[k].net||0) + '</td></tr>';
        }
        itemsHtml += '</table>';
      }
      
      var htmlContent = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ใบควบคุมเวลาฯ — ' + plate + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">' +
        '<style>body{font-family:"Sarabun",sans-serif;font-size:14px;margin:20px;padding:10px;max-width:210mm;margin:0 auto}' +
        'table.std{width:100%;border-collapse:collapse;margin:8px 0}table.std th,table.std td{padding:6px 10px;border:1px solid #333;font-size:.85rem}table.std th{background:#e8f0fe;font-weight:600}table.std td{background:#fff}' +
        '.wo-header{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.wo-header .field{padding:4px 8px;border:1px solid #ccc;border-radius:4px;background:#fafafa}.wo-header .field label{font-weight:700;color:#475569}' +
        '.wo-summary{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:12px;padding:12px;background:#eff6ff;border-radius:8px}' +
        'h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}' +
        '.sign-line{border-top:1px solid #999;padding-top:8px;display:flex;justify-content:space-between;margin-top:16px;font-size:.9rem}' +
        '@media print{.no-print{display:none!important}button{display:none!important}}</style></head><body>' +
        '<h2>📋 ใบควบคุมเวลาและตรวจสอบคุณภาพงานซ่อม</h2>' +
        '<div class="wo-header">' +
        '<div class="field"><label>เดือน/ปี:</label> <strong>' + orderDate + '</strong></div>' +
        '<div class="field"><label>ทะเบียน:</label> <strong>' + plate + '</strong></div>' +
        '<div class="field"><label>วันที่ใบสั่งซ่อม:</label> <strong>' + repairDate + '</strong></div>' +
        '<div class="field"><label>ระดับ:</label> <strong>' + insuranceLevel + '</strong></div>' +
        '<div class="field"><label>ประกันภัย:</label> <strong>' + insurance + '</strong></div>' +
        '<div class="field"><label>ยี่ห้อ/รุ่น:</label> <strong>' + brand + ' ' + model + '</strong></div>' +
        '<div class="field"><label>SA:</label> <strong>' + sa + '</strong></div>' +
        '<div class="field"><label>เลขคลม:</label> <strong>' + claimNo + '</strong></div>' +
        '<div class="field"><label>รวมค่าแรง:</label> <strong>' + totalWage + ' ฿</strong></div>' +
        '</div>' +
        itemsHtml +
        '<h3 style="margin-top:16px">📋 ตารางขั้นตอนการซ่อม</h3>' +
        '<table class="std"><tr><th>ขั้นตอน</th><th>เวลามาตรฐาน (ชม.)</th><th>กำหนด (วัน)</th><th>กำหนดเสร็จ</th><th>วันเริ่ม</th><th>วันเสร็จ</th><th>เวลาจริง</th><th>วันที่จริง</th><th>ตรวจ</th></tr>' +
        stationRows +
        '</table>' +
        '<div class="wo-summary">' +
        '<div><label>ชม.งานมาตรฐาน:</label><br><strong>' + mechanicWorkHr.toFixed(1) + '</strong> ชม.</div>' +
        '<div><label>วันทำงานช่าง:</label><br><strong>' + mechanicDays.toFixed(1) + '</strong> วัน</div>' +
        '<div><label>วันจอดรถ:</label><br><strong>' + parkingDays.toFixed(1) + '</strong> วัน</div>' +
        '<div><label>ประสิทธิภาพ:</label><br>______ %</div>' +
        '</div>' +
        '<div class="sign-line">' +
        '<span>☐ ไม่ต้องทดสอบรถ &nbsp;&nbsp; ☐ ต้องทดสอบรถ &nbsp; ผู้ทดสอบ: ___________________</span>' +
        '<span>ผู้จัดการโรงซ่อม: ___________________ (ลงชื่อปิดงาน)</span>' +
        '</div>' +
        '<div class="no-print" style="text-align:center;margin-top:24px">' +
        '<button onclick="window.print()" style="padding:12px 40px;font-size:20px;cursor:pointer;background:#2563eb;color:#fff;border:none;border-radius:8px;margin:0 8px">🖨️ พิมพ์ใบสั่งงาน</button>' +
        '<button onclick="window.close()" style="padding:12px 30px;font-size:20px;cursor:pointer;background:#64748b;color:#fff;border:none;border-radius:8px;margin:0 8px">ปิด</button>' +
        '</div></body></html>';
      
      return HtmlService.createHtmlOutput(htmlContent)
        .setTitle('ใบควบคุมเวลาฯ — ' + plate)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    // Normal mode: render the full Standard Time page
    var urlParam = p.url || '';
    var plateParam = p.plate || '';
    var html = HtmlService.createHtmlOutputFromFile('Standard_Time');
    if (urlParam || plateParam) {
      html.setContent(html.getContent().replace(
        '/*[[AUTO_PARAMS]]*/',
        'var AUTO_URL = ' + JSON.stringify(urlParam) + '; var AUTO_PLATE = ' + JSON.stringify(plateParam) + ';'
      ));
    }
    return html.setTitle('Standard Time | มาตรฐานเวลางานซ่อม PMG')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // ═══ ENVR Oil Stock Monitor ═══
  if (p.envr === '1') {
    var EnvrSS = SpreadsheetApp.openById('1S6S3KEeX1k17wEuMQHtPzti8BzNnBxP_OwG9uAbCniA');
    var envrData = envrFetchData_(EnvrSS);
    var envrHtml = HtmlService.createHtmlOutputFromFile('ENVR_Index');
    var envrContent = envrHtml.getContent();
    envrContent = envrContent.replace('ENVR_DATA_PLACEHOLDER', JSON.stringify(envrData));
    return HtmlService.createHtmlOutput(envrContent)
      .setTitle('ENVR | ระบบบริหารจัดการน้ำมัน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // PM/WI (Procedure Manual / Work Instruction) — ISO 9001
  if (p.pmwi === '1') {
    var html = HtmlService.createHtmlOutputFromFile('PM_WI');
    return html.setTitle('PM/WI | กระบวนการทำงาน PMG Workshop')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // วางบิล — Cross-reference billing duplicates (CNB + CSK)
  if (p.billing === '1') {
    var billingHtml = buildBillingPage_(p);
    return HtmlService.createHtmlOutput(billingHtml)
      .setTitle('วางบิล | กระทบข้อมูลซ้ำ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // เผยแพร่ Workshop Dashboard
  if (p.workshop === '1') {
    var html = HtmlService.createHtmlOutputFromFile('Index');
    var scriptUrl = ScriptApp.getService().getUrl();
    var content = html.getContent();
    content = content.replaceAll('SCRIPT_URL_PLACEHOLDER', scriptUrl);
    return HtmlService.createHtmlOutput(content)
      .setTitle('PMG Workshop | บริหารงานซ่อม')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default: show PMG Workshop Dashboard
  var html = HtmlService.createHtmlOutputFromFile('Index');
  var scriptUrl = ScriptApp.getService().getUrl();
  var content = html.getContent();
  content = content.replaceAll('SCRIPT_URL_PLACEHOLDER', scriptUrl);
  return HtmlService.createHtmlOutput(content)
    .setTitle('PMG Workshop | บริหารงานซ่อม')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ═══ POST handler — write-back API ═══ */
function doPost(e) {
  // Handle CORS preflight
  if (!e) e = { postData: { contents: '{}' } };
  if (e.method === 'OPTIONS') {
    var optionsOutput = ContentService.createTextOutput('');
    optionsOutput.setMimeType(ContentService.MimeType.JSON);
    return optionsOutput;
  }
  try {
    var p = JSON.parse(e.postData.contents);
    var action = p.action;
    var result;
    
    if (action === 'reschedule') {
      result = saveReschedule(p);
    } else if (action === 'deliveryDate') {
      result = saveDeliveryDate(p);
    } else if (action === 'moveStation') {
      result = saveMoveStation(p);
    } else {
      result = { success: false, error: 'Unknown action: ' + action };
    }
    
    var output = ContentService.createTextOutput(JSON.stringify(result));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch(err) {
    var output = ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}

/* ═══ Reschedule appointment (เลื่อนนัด) ═══ */
function saveReschedule(p) {
  // Required: p.plate, p.branch ('cnb' or 'csk'), p.date (YYYY-MM-DD)
  // Optional: p.reason
  if (!p.plate) return { success: false, error: 'Missing required field: plate' };
  if (!p.branch) return { success: false, error: 'Missing required field: branch' };
  if (!p.date) return { success: false, error: 'Missing required field: date' };
  
  var branchKey = p.branch.toLowerCase();
  if (branchKey !== 'cnb' && branchKey !== 'csk') {
    return { success: false, error: 'Invalid branch: must be cnb or csk' };
  }
  
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('สถานะรถอยู่ระหว่างซ่อมภาพรวม');
  if (!sheet) { sheet = ss.getSheetByName('ภาพรวม'); }
  if (!sheet) return { success: false, error: 'Status sheet not found' };
  
  // Find the row by plate (C3 = idx 2)
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(27, sheet.getLastColumn());
  if (lastRow < 5) return { success: false, error: 'No data rows in status sheet' };
  
  var data = sheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
  var targetRow = -1;
  var targetIdx = -1;
  
  for (var r = 2; r < data.length; r++) {
    var license = String(data[r][2] || '').trim();
    if (license === p.plate) {
      targetRow = r + 4; // 1-based row number in sheet (data starts at row 4, index r is offset from row 4)
      targetIdx = r;
      break;
    }
  }
  
  if (targetIdx < 0) return { success: false, error: 'Plate not found in main sheet: ' + p.plate };
  
  // Reschedule columns: idx 16/17 (ครั้งที่ 1), 18/19 (ครั้งที่ 2), 20/21 (ครั้งที่ 3)
  // Find first empty slot
  var slotFound = -1;
  var dateCols = [17, 19, 21]; // 1-based column numbers for dates
  var reasonCols = [18, 20, 22]; // 1-based column numbers for reasons
  var dateIdxs = [16, 18, 20]; // 0-based indices in data array
  
  for (var s = 0; s < 3; s++) {
    var existingDate = String(data[targetIdx][dateIdxs[s]] || '').trim();
    if (!existingDate) {
      slotFound = s;
      break;
    }
  }
  
  if (slotFound < 0) return { success: false, error: 'All 3 reschedule slots are filled for plate: ' + p.plate };
  
  // Write to main sheet
  var dateValue = new Date(p.date + 'T00:00:00');
  sheet.getRange(targetRow, dateCols[slotFound]).setValue(dateValue);
  if (p.reason) {
    sheet.getRange(targetRow, reasonCols[slotFound]).setValue(p.reason);
  }
  SpreadsheetApp.flush();
  
  // Also write to B2 sheet
  var b2SsId = branchKey === 'cnb' ? CNB_SS_ID : CSK_SS_ID;
  var b2Ss = SpreadsheetApp.openById(b2SsId);
  var b2Sheet = findB2Sheet_(b2Ss);
  
  if (b2Sheet) {
    var b2Lr = b2Sheet.getLastRow();
    var b2Lc = Math.min(b2Sheet.getLastColumn(), 68);
    var b2StartRow = 34;
    var b2NumRows = Math.min(b2Lr - b2StartRow + 1, 200);
    var b2Data = b2Sheet.getRange(b2StartRow, 1, b2NumRows, b2Lc).getValues();
    
    // Find the plate row in B2 (C5 = idx 4)
    var b2RowOffset = -1;
    for (var br = 0; br < b2Data.length; br++) {
      var b2Plate = String(b2Data[br][4] || '').trim();
      if (b2Plate === p.plate) {
        b2RowOffset = br;
        break;
      }
    }
    
    if (b2RowOffset >= 0) {
      // B2 reschedule columns (0-based from data start):
      // เลื่อนนัดครั้งที่ 1: date=idx11 (col 12), reason=idx12 (col 13)
      // เลื่อนนัดครั้งที่ 2: date=idx14 (col 15), reason=idx15 (col 16)
      // เลื่อนนัดครั้งที่ 3: date=idx17 (col 18), reason=idx18 (col 19)
      var b2DateCols = [12, 15, 18]; // 1-based column numbers
      var b2ReasonCols = [13, 16, 19]; // 1-based column numbers
      var b2SheetRow = b2StartRow + b2RowOffset; // 1-based row number
      
      b2Sheet.getRange(b2SheetRow, b2DateCols[slotFound]).setValue(dateValue);
      if (p.reason) {
        b2Sheet.getRange(b2SheetRow, b2ReasonCols[slotFound]).setValue(p.reason);
      }
      SpreadsheetApp.flush();
    }
    // If plate not found in B2, still succeed (main sheet was updated)
  }
  
  return { success: true, row: targetRow, slot: slotFound + 1 };
}

/* ═══ New delivery appointment (นัดหมายส่งมอบใหม่) ═══ */
function saveDeliveryDate(p) {
  // Required: p.plate, p.deliveryDate (YYYY-MM-DD)
  if (!p.plate) return { success: false, error: 'Missing required field: plate' };
  if (!p.deliveryDate) return { success: false, error: 'Missing required field: deliveryDate' };
  
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('B3_สรุปการตรวจ FinalCheck');
  if (!sheet) return { success: false, error: 'B3 sheet not found' };
  
  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr < 5) return { success: false, error: 'B3 sheet has no data rows' };
  
  var data = sheet.getRange(1, 1, lr, Math.min(lc, 20)).getValues();
  
  // B3: C3 (idx 2) = ทะเบียน, C16 (idx 15) = นัดหมายส่งมอบ
  // Data starts at row 5 (0-based index 4)
  var targetRow = -1;
  
  for (var r = 4; r < data.length; r++) {
    var plate = String(data[r][2] || '').trim();
    if (plate === p.plate) {
      targetRow = r + 1; // 1-based row number
      break;
    }
  }
  
  if (targetRow < 0) return { success: false, error: 'Plate not found in B3 sheet: ' + p.plate };
  
  // Write delivery date to C16 (column 16)
  var dateValue = new Date(p.deliveryDate + 'T00:00:00');
  sheet.getRange(targetRow, 16).setValue(dateValue);
  SpreadsheetApp.flush();
  
  return { success: true, row: targetRow };
}

/* ═══ Move vehicle station (เคลื่อนสถานะงานซ่อม) ═══ */
function saveMoveStation(p) {
  // Required: p.plate, p.branch ('cnb' or 'csk'), p.currentStation, p.newStation
  // Optional: p.date (defaults to today)
  if (!p.plate) return { success: false, error: 'Missing required field: plate' };
  if (!p.branch) return { success: false, error: 'Missing required field: branch' };
  if (!p.currentStation) return { success: false, error: 'Missing required field: currentStation' };
  if (!p.newStation) return { success: false, error: 'Missing required field: newStation' };
  
  var branchKey = p.branch.toLowerCase();
  if (branchKey !== 'cnb' && branchKey !== 'csk') {
    return { success: false, error: 'Invalid branch: must be cnb or csk' };
  }
  
  var moveDate = p.date ? new Date(p.date + 'T00:00:00') : new Date();
  
  // Station name to column index mapping in main sheet (0-based from data start)
  var stationMap = {
    'knocker': { mainIdx: 3, name: 'เคาะ' },
    'filler': { mainIdx: 4, name: 'โป๊ว' },
    'spray': { mainIdx: 5, name: 'พ่น' },
    'assemble': { mainIdx: 6, name: 'ประกอบ' },
    'polish': { mainIdx: 7, name: 'ขัดสี' },
    'wash': { mainIdx: 8, name: 'ล้าง' },
    'supQc': { mainIdx: 9, name: 'SUP QC' },
    'supFix': { mainIdx: 10, name: 'SUP แก้ไขงาน' },
    'waitDelivery': { mainIdx: 11, name: 'รอส่งมอบ' },
    'delivered': { mainIdx: 12, name: 'ส่งมอบแล้ว' }
  };
  
  // Also support Thai names as aliases
  var thaiStationMap = {
    'เคาะ': 'knocker',
    'โป๊ว': 'filler',
    'พ่น': 'spray',
    'ประกอบ': 'assemble',
    'ขัดสี': 'polish',
    'ล้าง': 'wash',
    'SUP QC': 'supQc',
    'SUP แก้ไข': 'supFix',
    'SUP แก้ไขงาน': 'supFix',
    'รอส่งมอบ': 'waitDelivery',
    'ส่งมอบ': 'delivered',
    'ส่งมอบแล้ว': 'delivered'
  };
  
  // Resolve station names
  var currentKey = thaiStationMap[p.currentStation] || p.currentStation;
  var newKey = thaiStationMap[p.newStation] || p.newStation;
  
  if (!stationMap[currentKey]) return { success: false, error: 'Unknown currentStation: ' + p.currentStation };
  if (!stationMap[newKey]) return { success: false, error: 'Unknown newStation: ' + p.newStation };
  
  // Update main sheet
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('สถานะรถอยู่ระหว่างซ่อมภาพรวม');
  if (!sheet) { sheet = ss.getSheetByName('ภาพรวม'); }
  if (!sheet) return { success: false, error: 'Status sheet not found' };
  
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(27, sheet.getLastColumn());
  if (lastRow < 5) return { success: false, error: 'No data rows in status sheet' };
  
  var data = sheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
  var targetRow = -1;
  var targetIdx = -1;
  
  for (var r = 2; r < data.length; r++) {
    var license = String(data[r][2] || '').trim();
    if (license === p.plate) {
      targetRow = r + 4; // 1-based row number
      targetIdx = r;
      break;
    }
  }
  
  if (targetIdx < 0) return { success: false, error: 'Plate not found in main sheet: ' + p.plate };
  
  // Set current station column to 0 and new station column to 1
  var currentCol = stationMap[currentKey].mainIdx + 1; // 1-based column
  var newCol = stationMap[newKey].mainIdx + 1;
  
  sheet.getRange(targetRow, currentCol).setValue(0);
  sheet.getRange(targetRow, newCol).setValue(1);
  
  // Update delivery date if moving to waitDelivery or delivered
  if (newKey === 'waitDelivery' || newKey === 'delivered') {
    // Write completion date (C15 = idx 14, column 15)
    sheet.getRange(targetRow, 15).setValue(moveDate);
  }
  
  SpreadsheetApp.flush();
  
  // Update B2 sheet: set station end date for current station, start date for new station
  var b2SsId = branchKey === 'cnb' ? CNB_SS_ID : CSK_SS_ID;
  var b2Ss = SpreadsheetApp.openById(b2SsId);
  var b2Sheet = findB2Sheet_(b2Ss);
  
  if (b2Sheet) {
    var b2Lr = b2Sheet.getLastRow();
    var b2Lc = Math.min(b2Sheet.getLastColumn(), 68);
    var b2StartRow = 34;
    var b2NumRows = Math.min(b2Lr - b2StartRow + 1, 200);
    var b2Data = b2Sheet.getRange(b2StartRow, 1, b2NumRows, b2Lc).getValues();
    
    // Find the plate row in B2 (C5 = idx 4)
    var b2RowOffset = -1;
    for (var br = 0; br < b2Data.length; br++) {
      var b2Plate = String(b2Data[br][4] || '').trim();
      if (b2Plate === p.plate) {
        b2RowOffset = br;
        break;
      }
    }
    
    if (b2RowOffset >= 0) {
      var b2SheetRow = b2StartRow + b2RowOffset; // 1-based
      
      // B2 station columns (0-based from data, 1-based for sheet):
      // เคาะ: wait=i21(C22), start=i22(C23), end=i24(C25)
      // โป๊ว: wait=i27(C28), start=i28(C29), end=i30(C31)
      // พ่น: wait=i33(C34), start=i34(C35), end=i36(C37)
      // ประกอบ: wait=i39(C40), start=i40(C41), end=i42(C43)
      // ขัดสี: wait=i45(C46), start=i46(C47), end=i48(C49)
      var b2StationCols = {
        'knock':   { startCol: 23, endCol: 25 },
        'patch':   { startCol: 29, endCol: 31 },
        'squirt':  { startCol: 35, endCol: 37 },
        'assemble': { startCol: 41, endCol: 43 },
        'polish':  { startCol: 47, endCol: 49 }
      };
      
      // Map station keys to B2 keys
      var b2KeyMap = {
        'knocker': 'knock',
        'filler': 'patch',
        'spray': 'squirt',
        'assemble': 'assemble',
        'polish': 'polish'
      };
      
      // Set end date for current station (if it's a tracked station)
      var currentB2Key = b2KeyMap[currentKey];
      if (currentB2Key && b2StationCols[currentB2Key]) {
        b2Sheet.getRange(b2SheetRow, b2StationCols[currentB2Key].endCol).setValue(moveDate);
      }
      
      // Set start date for new station (if it's a tracked station)
      var newB2Key = b2KeyMap[newKey];
      if (newB2Key && b2StationCols[newB2Key]) {
        b2Sheet.getRange(b2SheetRow, b2StationCols[newB2Key].startCol).setValue(moveDate);
      }
      
      // For wash, supQC, deliver — just set the end date column in B2
      // ล้าง: endCol=52 (C52), SUP QC: endCol=53 (C54), ส่งมอบ: endCol=54 (C55)
      var b2SimpleStationEndCols = {
        'wash': 52,
        'supQc': 53,
        'delivered': 54
      };
      
      if (b2SimpleStationEndCols[newKey]) {
        b2Sheet.getRange(b2SheetRow, b2SimpleStationEndCols[newKey]).setValue(moveDate);
      }
      
      SpreadsheetApp.flush();
    }
    // If plate not found in B2, still succeed (main sheet was updated)
  }
  
  return { success: true, row: targetRow, currentStation: currentKey, newStation: newKey };
}

/* ═══ Helpers ═══ */
function toNum(v) {
  if (v === null || v === undefined) return 0;
  var s = String(v).trim();
  if (s === '' || s === '#N/A' || s === '#VALUE!' || s === '#DIV/0!' || s === '#REF!') return 0;
  var n = Number(s);
  // Filter negative Excel serial dates (garbage values like -46153)
  if (n < -40000) return 0;
  return isNaN(n) ? 0 : n;
}

function fmtDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  if (d instanceof Date) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  return String(d).substring(0, 10);
}

function parseDateStr(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  if (typeof s === 'string') {
    var p = s.split('-');
    if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
  }
  return null;
}

function isDateInRange(dateVal, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  var d = dateVal instanceof Date ? dateVal : parseDateStr(String(dateVal));
  if (!d || isNaN(d.getTime())) return true;
  var from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
  var to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function getPeriodDates(period) {
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dateFrom = null, dateTo = null;
  if (period === 'daily' || period === 'วัน') {
    dateFrom = fmtDate(today);
    dateTo = fmtDate(today);
  } else if (period === 'monthly' || period === 'เดือน') {
    dateFrom = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-01';
    dateTo = fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  } else if (period === 'yearly' || period === 'ปี') {
    dateFrom = now.getFullYear() + '-01-01';
    dateTo = now.getFullYear() + '-12-31';
  }
  return { dateFrom: dateFrom, dateTo: dateTo };
}

/* ═══ Main data function ═══ */
function getWorkshopData(tab, period, branch, year, month, date, dateFrom, dateTo) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var result = { version: '3.65', timestamp: new Date().toISOString(), tab: tab, period: period || 'yearly' };
  // Source links for each data origin
  result.sourceLinks = {
    main: 'https://docs.google.com/spreadsheets/d/' + SS_ID,
    cnb: 'https://docs.google.com/spreadsheets/d/' + CNB_SS_ID,
    csk: 'https://docs.google.com/spreadsheets/d/' + CSK_SS_ID
  };
  try {
    if (!tab || tab === 'overview') {
      result.summary = getOverviewData(ss);
    }
    if (tab === 'status' || tab === 'workflow') {
      if (!dateFrom && !dateTo && period) {
        var pd = getPeriodDates(period);
        dateFrom = pd.dateFrom;
        dateTo = pd.dateTo;
      }
      if (period === 'yearly' || period === 'ปี' || !period) {
        dateFrom = null;
        dateTo = null;
      }
      var statusResult = getStatusDetail(ss, branch, dateFrom, dateTo);
      result.summary = statusResult.summary;
      result.vehicles = statusResult.vehicles;
      
      // ═══ Supplement with station KPI data (CNB_SS_ID + CSK_SS_ID) for completeness ═══
      // Station KPI reads from B2 sheets which have MORE vehicles than the main status sheet
      if (tab === 'workflow') {
        try {
          var stnKpi = getStationKpiData(period, dateFrom, dateTo);
          var existingPlates = {};
          for (var ei = 0; ei < result.vehicles.length; ei++) {
            existingPlates[result.vehicles[ei].plate] = ei;
          }
          // ═══ Phase 1: Enrich existing vehicles with reschedule data from Station KPI ═══
          // Main status sheet often missing reschedule columns — B2 has it
          for (var bk2 = 0; bk2 < 2; bk2++) {
            var bKey2 = bk2 === 0 ? 'cnb' : 'csk';
            var stnVehicles2 = stnKpi[bKey2] ? stnKpi[bKey2].vehicles : [];
            for (var vi2 = 0; vi2 < stnVehicles2.length; vi2++) {
              var sv2 = stnVehicles2[vi2];
              var svPlate2 = sv2.plate || '';
              if (svPlate2 && existingPlates.hasOwnProperty(svPlate2)) {
                var wfIdx = existingPlates[svPlate2];
                var wfVehicle = result.vehicles[wfIdx];
                // Enrich reschedules if main sheet has none but B2 has data
                if (wfVehicle.rescheduleCount === 0 && sv2.rescheduleCount > 0) {
                  wfVehicle.reschedules = sv2.reschedules || [];
                  wfVehicle.rescheduleCount = sv2.rescheduleCount || 0;
                }
                // Enrich deliveryDate/dueDate from B2 reschedule if main has none
                if (!wfVehicle.deliveryDate && sv2.reschedules && sv2.reschedules.length > 0) {
                  // Latest reschedule date = new delivery appointment
                  var latestResch = sv2.reschedules[sv2.reschedules.length - 1];
                  if (latestResch && latestResch.date) {
                    wfVehicle.dueDate = latestResch.date;
                    // Don't overwrite deliveryDate — that should come from actual delivery
                  }
                }
                // Enrich brand/model/insurer if missing
                if (!wfVehicle.brand && sv2.brand) wfVehicle.brand = sv2.brand;
                if (!wfVehicle.model && sv2.model) wfVehicle.model = sv2.model;
                if (!wfVehicle.insurance && sv2.insurer) wfVehicle.insurance = sv2.insurer;
              }
            }
          }
          // ═══ Phase 2: Add NEW vehicles from Station KPI not in main list ═══
          for (var bk = 0; bk < 2; bk++) {
            var bKey = bk === 0 ? 'cnb' : 'csk';
            var stnVehicles = stnKpi[bKey] ? stnKpi[bKey].vehicles : [];
            for (var vi = 0; vi < stnVehicles.length; vi++) {
              var sv = stnVehicles[vi];
              var svPlate = sv.plate || '';
              if (svPlate && !existingPlates.hasOwnProperty(svPlate)) {
                // Convert station KPI vehicle to workflow format
                var wfV = convertStationToWorkflowVehicle(sv, bKey);
                result.vehicles.push(wfV);
                existingPlates[svPlate] = result.vehicles.length - 1;
              }
            }
          }
          // ═══ Phase 3: Enrich นัดหมายส่งมอบ from B3 for vehicles without deliveryDate ═══
          try {
            var b3Sheet = ss.getSheetByName('B3_สรุปการตรวจ FinalCheck');
            if (b3Sheet) {
              var b3lr = b3Sheet.getLastRow();
              var b3lc = b3Sheet.getLastColumn();
              if (b3lr >= 5 && b3lc >= 16) {
                var b3Data = b3Sheet.getRange(1, 1, b3lr, Math.min(b3lc, 20)).getValues();
                // B3 headers: C3(idx2)=ทะเบียน, C16(idx15)=นัดหมายส่งมอบ, C15(idx14)=นัดช่างแล้วเสร็จ
                var b3DeliveryMap = {};
                for (var b3r = 4; b3r < b3Data.length; b3r++) {
                  var b3Plate = String(b3Data[b3r][2] || '').trim();
                  if (!b3Plate) continue;
                  var b3Appt = fmtDate(b3Data[b3r][15]); // นัดหมายส่งมอบ (col P)
                  var b3Complete = fmtDate(b3Data[b3r][14]); // นัดช่างแล้วเสร็จ (col O)
                  if (b3Appt || b3Complete) {
                    b3DeliveryMap[b3Plate] = { deliveryAppt: b3Appt, completionAppt: b3Complete };
                  }
                }
                // Apply to vehicles missing deliveryDate
                for (var wfi = 0; wfi < result.vehicles.length; wfi++) {
                  var wfv = result.vehicles[wfi];
                  if (!wfv.deliveryDate && b3DeliveryMap[wfv.plate]) {
                    var b3info = b3DeliveryMap[wfv.plate];
                    if (b3info.deliveryAppt) {
                      wfv.deliveryDate = b3info.deliveryAppt;
                    }
                    // If dueDate also empty, use the delivery appointment
                    if (!wfv.dueDate && b3info.deliveryAppt) {
                      wfv.dueDate = b3info.deliveryAppt;
                    }
                  }
                }
              }
            }
          } catch(b3Err) {
            // B3 enrichment failed — continue with existing data
          }
        } catch(stnErr) {
          // If station KPI fails, continue with existing data
        }
      }
      
      result.periodInfo = { dateFrom: dateFrom, dateTo: dateTo, totalVehicles: result.vehicles.length };
    }
    if (tab === 'check') {
      if (!dateFrom && !dateTo && period) {
        var pdChk = getPeriodDates(period);
        dateFrom = pdChk.dateFrom;
        dateTo = pdChk.dateTo;
      }
      // Only clear dateFrom/dateTo if user didn't explicitly set them AND period is yearly
      if ((!dateFrom && !dateTo) && (period === 'yearly' || period === 'ปี' || !period)) {
        dateFrom = null;
        dateTo = null;
      }
      result = Object.assign(result, getCheckData(ss, period, dateFrom, dateTo));
    }
    if (tab === 'station') {
      result = Object.assign(result, getStationKpiData(period, dateFrom, dateTo));
    }
    if (tab === 'vehicles') {
      // Detailed vehicle data with station cycle times
      if (!dateFrom && !dateTo && period) {
        var pd2 = getPeriodDates(period);
        dateFrom = pd2.dateFrom;
        dateTo = pd2.dateTo;
      }
      result.vehicles = getDetailedVehicles(branch, dateFrom, dateTo);
    }
    if (tab === 'summary') {
      // Daily summary: reschedules, completions, finalcheck, at-risk
      if (!dateFrom && !dateTo) {
        var pdSm = getPeriodDates(period || 'daily');
        dateFrom = pdSm.dateFrom;
        dateTo = pdSm.dateTo;
      }
      result = Object.assign(result, getDailySummaryData(ss, dateFrom, dateTo));
    }
    if (tab === 'movement') {
      // Only derive dateFrom/dateTo from period if user didn't explicitly set them
      if (!dateFrom && !dateTo && period) {
        var pd3 = getPeriodDates(period);
        dateFrom = pd3.dateFrom;
        dateTo = pd3.dateTo;
      }
      // For yearly with no explicit date range, show all data (no filter)
      // But if user explicitly set dateFrom/dateTo, respect them — do NOT clear
      if ((!dateFrom && !dateTo) && (period === 'yearly' || period === 'ปี' || !period)) {
        dateFrom = null;
        dateTo = null;
      }
      result = Object.assign(result, getStationMovementData(period, dateFrom, dateTo, branch));
    }
  } catch(err) {
    result.error = err.toString() + '\n' + err.stack;
  }
  return result;
}

/* ═══ Safe JSON: strip control chars from string values ═══ */
function safeJson(obj) {
  var raw = JSON.stringify(obj);
  // Replace raw control chars that break JSON parsing  
  // GAS V8 should handle this regex, but use explicit char codes as fallback
  var cleaned = '';
  for (var i = 0; i < raw.length; i++) {
    var c = raw.charCodeAt(i);
    if (c < 32) {
      switch(c) {
        case 10: cleaned += '\\n'; break;  // \n
        case 13: cleaned += '\\r'; break;  // \r
        case 9:  cleaned += '\\t'; break;  // \t
        case 8:  cleaned += '\\b'; break;  // \b
        case 12: cleaned += '\\f'; break;  // \f
        default: cleaned += '\\u' + ('0000' + c.toString(16)).slice(-4); break;
      }
    } else {
      cleaned += raw.charAt(i);
    }
  }
  return cleaned;
}

/* ═══ Overview data ═══ */
function getOverviewData(ss) {
  var result = getSummaryData(ss);
  // Get live vehicle counts from status sheet
  var statusAll = getStatusDetail(ss, null, null, null);
  var vlist = statusAll.vehicles || [];
  var cnbLive = { total: 0, knocker: 0, filler: 0, spray: 0, assemble: 0, polish: 0, wash: 0, supQC: 0, supFix: 0, waitDelivery: 0, delivered: 0 };
  var cskLive = { total: 0, knocker: 0, filler: 0, spray: 0, assemble: 0, polish: 0, wash: 0, supQC: 0, supFix: 0, waitDelivery: 0, delivered: 0 };
  for (var vi = 0; vi < vlist.length; vi++) {
    var vv = vlist[vi];
    var br = vv.branch === 'CNB' || vv.branch === 'SUP1' ? 'cnb' : vv.branch === 'CSK' || vv.branch === 'SUP2' ? 'csk' : '';
    if (!br) continue;
    var tgt = br === 'cnb' ? cnbLive : cskLive;
    tgt.total++;
    tgt.knocker += (vv.knocker || 0);
    tgt.filler += (vv.filler || 0);
    tgt.spray += (vv.spray || 0);
    tgt.assemble += (vv.assemble || 0);
    tgt.polish += (vv.polish || 0);
    tgt.wash += (vv.wash || 0);
    tgt.supQC += (vv.supQC || 0);
    tgt.supFix += (vv.supFix || 0);
    tgt.waitDelivery += (vv.waitDelivery || 0);
    tgt.delivered += (vv.delivered || 0);
  }
  result.vehicleStatus = { cnb: cnbLive, csk: cskLive };
  // Use B3 section 2 delivery data
  var dl = result.delivery || {};
  result.delivery = {
    onTime: (dl.cnOnTime || 0) + (dl.cskOnTime || 0),
    overdue: (dl.cnLate || 0) + (dl.cskLate || 0),
    onTimeSUP1: dl.cnOnTime || 0,
    overdueSUP1: dl.cnLate || 0,
    onTimeSUP2: dl.cskOnTime || 0,
    overdueSUP2: dl.cskLate || 0,
    cnLikelyLate: dl.cnLikelyLate || 0,
    cskLikelyLate: dl.cskLikelyLate || 0
  };
  return result;
}

/* ═══ Daily Summary — 4 sections for สรุปสั้น tab ═══ */
function getDailySummaryData(ss, dateFrom, dateTo) {
  var result = {};
  // Report covers YESTERDAY's data (for 8:15 morning briefing)
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = fmtDate(yesterday);
  var todayStr = fmtDate(new Date());

  // ─── Section 1: เลื่อนนัดเมื่อวาน ───
  // Find vehicles where ANY reschedule date = yesterday
  // (meaning someone clicked "เลื่อนนัด" yesterday)
  var statusResult = getStatusDetail(ss, null, null, null);
  var allVehicles = statusResult.vehicles || [];

  // Also get station KPI data for more complete reschedule info
  var stnKpi = getStationKpiData('yearly', null, null);

  // Merge reschedule data from station KPI
  var existingPlates = {};
  for (var ei = 0; ei < allVehicles.length; ei++) {
    existingPlates[allVehicles[ei].plate] = ei;
  }
  for (var bk2 = 0; bk2 < 2; bk2++) {
    var bKey2 = bk2 === 0 ? 'cnb' : 'csk';
    var stnVehicles2 = stnKpi[bKey2] ? stnKpi[bKey2].vehicles : [];
    for (var vi2 = 0; vi2 < stnVehicles2.length; vi2++) {
      var sv2 = stnVehicles2[vi2];
      if (sv2.plate && existingPlates.hasOwnProperty(sv2.plate)) {
        var wfIdx = existingPlates[sv2.plate];
        var wfV = allVehicles[wfIdx];
        // Merge: if station KPI has more reschedules, use them
        if (wfV.rescheduleCount === 0 && sv2.rescheduleCount > 0) {
          wfV.reschedules = sv2.reschedules || [];
          wfV.rescheduleCount = sv2.rescheduleCount || 0;
        } else if (sv2.rescheduleCount > wfV.rescheduleCount) {
          wfV.reschedules = sv2.reschedules || [];
          wfV.rescheduleCount = sv2.rescheduleCount || 0;
        }
      } else if (sv2.plate && !existingPlates.hasOwnProperty(sv2.plate)) {
        // Add ALL vehicles from B2 not in main sheet (not just those with reschedules)
        // They may be at-risk based on completionDate even without reschedules
        var convV = convertStationToWorkflowVehicle(sv2, bKey2);
        allVehicles.push(convV);
        existingPlates[sv2.plate] = allVehicles.length - 1;
      }
    }
  }

  // Enrich นัดหมายส่งมอบ from B3
  try {
    var b3Sheet = ss.getSheetByName('B3_สรุปการตรวจ FinalCheck');
    if (b3Sheet) {
      var b3Lr = b3Sheet.getLastRow();
      if (b3Lr >= 5) {
        var b3Data = b3Sheet.getRange(1, 1, b3Lr, b3Sheet.getLastColumn()).getValues();
        for (var b3r = 4; b3r < b3Data.length; b3r++) {
          var b3Plate = String(b3Data[b3r][2] || '').trim();
          if (!b3Plate) continue;
          if (existingPlates.hasOwnProperty(b3Plate)) {
            var b3Appt = fmtDate(b3Data[b3r][15]); // นัดหมาย ส่งมอบ
            if (b3Appt && b3Appt !== '-') {
              var target = allVehicles[existingPlates[b3Plate]];
              if (!target.deliveryDate || target.deliveryDate === '-') target.deliveryDate = b3Appt;
              if (!target.dueDate || target.dueDate === '-') target.dueDate = b3Appt;
            }
            // นัดช่างเสร็จ from col 14
            var b3Comp = fmtDate(b3Data[b3r][14]);
            if (b3Comp && b3Comp !== '-') {
              var target2 = allVehicles[existingPlates[b3Plate]];
              if (!target2.completionDate || target2.completionDate === '-') target2.completionDate = b3Comp;
            }
          }
        }
      }
    }
  } catch(e) {}

  // Find vehicles rescheduled YESTERDAY
  var rescheduleList = [];
  for (var ri = 0; ri < allVehicles.length; ri++) {
    var v = allVehicles[ri];
    if (v.delivered > 0) continue;
    if (!v.reschedules || v.reschedules.length === 0) continue;

    // Check if any reschedule date = yesterday
    var rescheduledYesterday = false;
    var newRescheduleIndex = -1;
    for (var rsi = 0; rsi < v.reschedules.length; rsi++) {
      var rsDate = String(v.reschedules[rsi].date || '');
      if (rsDate.indexOf('#') >= 0) continue;
      if (rsDate === yesterdayStr) {
        rescheduledYesterday = true;
        newRescheduleIndex = rsi;
        break;
      }
    }
    if (!rescheduledYesterday) continue;

    var latestResch = v.reschedules[v.reschedules.length - 1];
    if (!latestResch || !latestResch.date) continue;
    var rDate = String(latestResch.date);
    if (rDate.indexOf('#') >= 0) continue;

    // Build all reschedule history (for display)
    var rescheduleHistory = [];
    for (var rhi = 0; rhi < v.reschedules.length; rhi++) {
      var rh = v.reschedules[rhi];
      var rhDate = String(rh.date || '');
      if (rhDate.indexOf('#') >= 0) continue;
      rescheduleHistory.push({
        no: rhi + 1,
        date: rhDate,
        reason: rh.reason || ''
      });
    }

    rescheduleList.push({
      plate: v.plate,
      branch: v.branch,
      status: v.status,
      completionDate: v.completionDate || '-',
      deliveryDate: v.deliveryDate || v.dueDate || '-',
      newRescheduleNo: newRescheduleIndex + 1,
      newRescheduleDate: yesterdayStr,
      totalRescheduleCount: v.reschedules.length,
      latestRescheduleDate: rDate,
      latestReason: latestResch.reason || '-',
      allReschedules: rescheduleHistory,
      sa: v.sa || '-',
      insurance: v.insurance || '-'
    });
  }
  rescheduleList.sort(function(a, b) { return (a.latestRescheduleDate || '').localeCompare(b.latestRescheduleDate || ''); });
  result.reschedules = { count: rescheduleList.length, vehicles: rescheduleList, reportDate: yesterdayStr };

  // ─── Section 2: งานเสร็จประจำวัน (แยกสถานี + Sub) ───
  // Use station KPI data: find vehicles where station.endDate = yesterday
  var stationNameMap = {
    'knock': 'เคาะ', 'patch': 'โป๊ว', 'squirt': 'พ่น',
    'assemble': 'ประกอบ', 'polish': 'ขัดสี', 'wash': 'ล้าง',
    'supQC': 'SUP QC', 'deliver': 'ส่งมอบ'
  };
  var stationOrder2 = ['knock', 'patch', 'squirt', 'assemble', 'polish', 'wash', 'supQC', 'deliver'];

  var completionByStation = {};
  for (var bk3 = 0; bk3 < 2; bk3++) {
    var branchKey = bk3 === 0 ? 'cnb' : 'csk';
    var branchName = bk3 === 0 ? 'CNB' : 'CSK';
    var stnV = stnKpi[branchKey] ? stnKpi[branchKey].vehicles : [];
    for (var sv3 = 0; sv3 < stnV.length; sv3++) {
      var stnVehicle = stnV[sv3];
      var stnMap = stnVehicle.stations || {};
      for (var sk3 = 0; sk3 < stationOrder2.length; sk3++) {
        var stnKey = stationOrder2[sk3];
        var stnInfo = stnMap[stnKey];
        if (!stnInfo) continue;
        var endDate = stnInfo.endDate || '';
        if (!endDate || endDate !== yesterdayStr) continue;
        var stnLabel = stationNameMap[stnKey] || stnKey;
        if (!completionByStation[stnLabel]) {
          completionByStation[stnLabel] = { cnb: { count: 0, wage: 0, vehicles: [] }, csk: { count: 0, wage: 0, vehicles: [] }, total: 0, totalWage: 0 };
        }
        completionByStation[stnLabel][branchKey].count++;
        var netW = stnVehicle.netWage || 0;
        completionByStation[stnLabel][branchKey].wage += netW;
        completionByStation[stnLabel][branchKey].vehicles.push({
          plate: stnVehicle.plate,
          brand: stnVehicle.brand || '',
          model: stnVehicle.model || '',
          netWage: netW,
          man: stnInfo.man || '',
          workDays: stnInfo.workDays || 0,
          waitDays: stnInfo.waitDays || 0
        });
        completionByStation[stnLabel].total++;
        completionByStation[stnLabel].totalWage += netW;
      }
    }
  }

  // Build ordered summary
  var completionSummary = [];
  var stationDisplayOrder = ['เคาะ', 'โป๊ว', 'พ่น', 'ประกอบ', 'ขัดสี', 'ล้าง', 'SUP QC', 'ส่งมอบ'];
  for (var so2 = 0; so2 < stationDisplayOrder.length; so2++) {
    var sLabel = stationDisplayOrder[so2];
    var compStn = completionByStation[sLabel];
    if (!compStn) continue;
    completionSummary.push({
      station: sLabel,
      cnb: { count: compStn.cnb.count, wage: Math.round(compStn.cnb.wage * 100) / 100 },
      csk: { count: compStn.csk.count, wage: Math.round(compStn.csk.wage * 100) / 100 },
      total: compStn.total,
      totalWage: Math.round(compStn.totalWage * 100) / 100
    });
  }
  // ─── Section 2b: Cumulative monthly completions (month-to-date) ───
  // Count vehicles where station.endDate falls within current month (1st to now)
  var monthStartStr = todayStr.substring(0, 8) + '01';
  var monthlyCompletionByStation = {};
  for (var bk4 = 0; bk4 < 2; bk4++) {
    var bKey4 = bk4 === 0 ? 'cnb' : 'csk';
    var mStnV = stnKpi[bKey4] ? stnKpi[bKey4].vehicles : [];
    for (var mi = 0; mi < mStnV.length; mi++) {
      var mVeh = mStnV[mi];
      var mStnMap = mVeh.stations || {};
      for (var mk2 = 0; mk2 < stationOrder2.length; mk2++) {
        var mStnKey = stationOrder2[mk2];
        var mStnInfo = mStnMap[mStnKey];
        if (!mStnInfo) continue;
        var mEndDate = mStnInfo.endDate || '';
        if (!mEndDate || mEndDate < monthStartStr || mEndDate > todayStr) continue;
        var mStnLabel = stationNameMap[mStnKey] || mStnKey;
        if (!monthlyCompletionByStation[mStnLabel]) {
          monthlyCompletionByStation[mStnLabel] = { cnb: { count: 0, wage: 0 }, csk: { count: 0, wage: 0 }, total: 0, totalWage: 0 };
        }
        monthlyCompletionByStation[mStnLabel][bKey4].count++;
        var mNetW = mVeh.netWage || 0;
        monthlyCompletionByStation[mStnLabel][bKey4].wage += mNetW;
        monthlyCompletionByStation[mStnLabel].total++;
        monthlyCompletionByStation[mStnLabel].totalWage += mNetW;
      }
    }
  }
  // Build ordered monthly summary
  var monthlyCompletionSummary = [];
  for (var so3 = 0; so3 < stationDisplayOrder.length; so3++) {
    var mLabel = stationDisplayOrder[so3];
    var mCompStn = monthlyCompletionByStation[mLabel];
    if (!mCompStn) continue;
    monthlyCompletionSummary.push({
      station: mLabel,
      cnb: { count: mCompStn.cnb.count, wage: Math.round(mCompStn.cnb.wage * 100) / 100 },
      csk: { count: mCompStn.csk.count, wage: Math.round(mCompStn.csk.wage * 100) / 100 },
      total: mCompStn.total,
      totalWage: Math.round(mCompStn.totalWage * 100) / 100
    });
  }

  result.completions = { summary: completionSummary, detail: completionByStation, reportDate: yesterdayStr, monthlySummary: monthlyCompletionSummary };

  // ─── Section 3: FinalCheck เมื่อวาน ───
  // Read FC data specifically for yesterday
  var fcResult = {};
  try {
    var fcFromB3 = countFCFromB3(ss, yesterdayStr, yesterdayStr);
    if (fcFromB3) {
      fcResult.b3 = fcFromB3;
    }
  } catch(e) {}
  try {
    var fcFrom2026 = readFC2026Data(ss, yesterdayStr, yesterdayStr);
    if (fcFrom2026) {
      fcResult.fc2026 = fcFrom2026;
    }
  } catch(e) {}

  // Use FC2026 if available (more detailed), else B3
  var primaryFC = fcResult.fc2026 || fcResult.b3 || {};
  // Also get monthly summary (month-to-date)
  var monthStart = todayStr.substring(0, 8) + '01';
  var monthlyFC = null;
  try { monthlyFC = countFCFromB3(ss, monthStart, yesterdayStr); } catch(e) {}
  try { if (!monthlyFC || monthlyFC.total === 0) monthlyFC = readFC2026Data(ss, monthStart, yesterdayStr); } catch(e) {}

  result.finalCheck = {
    daily: {
      date: yesterdayStr,
      total: primaryFC.total || 0,
      pass: primaryFC.pass || 0,
      fail: primaryFC.fail || 0,
      passPct: primaryFC.passPct || 0,
      supQcCount: primaryFC.supQcCount || 0,
      supFixCount: primaryFC.supFixCount || 0,
      deliveredCount: primaryFC.deliveredCount || 0,
      failDetail: primaryFC.causes || {},
      dataSource: primaryFC.dataSource || primaryFC.computedFromB3 ? 'B3' : '-'
    },
    monthly: monthlyFC ? {
      total: monthlyFC.total || 0,
      pass: monthlyFC.pass || 0,
      fail: monthlyFC.fail || 0,
      passPct: monthlyFC.passPct || 0,
      supDelivered: monthlyFC.supDelivered || monthlyFC.deliveredCount || 0,
      supOnTime: monthlyFC.supOnTime || 0,
      supOverDue: monthlyFC.supOverDue || 0
    } : null
  };

  // ─── Section 4: รถที่คาดว่าจะเสร็จไม่ทัน ───
  // Same logic as workflow tab's at-risk calculation
  var STATION_ORDER_ARR = ['รับรถเข้าซ่อมแล้ว รอเคาะ','รับรถเข้าซ่อมแล้ว รอโป๊ว','เคาะ','เคาะแล้ว รอโป๊ว','เคาะเสร็จแล้ว รอโป๊ว','โป๊ว','โป๊วแล้ว รอพ่น','พ่น','พ่นสีแล้ว รอประกอบ','ประกอบ','ประกอบแล้ว รอขัดสี','ขัดสี','ขัดสีแล้ว รอล้าง','ล้าง','SUP QC','SUP แก้ไขงาน','รอส่งมอบ'];
  var POLISH_IDX2 = 11; // 'ขัดสี' index
  var atRiskList = [];
  for (var ai = 0; ai < allVehicles.length; ai++) {
    var av = allVehicles[ai];
    if (av.delivered > 0) continue;
    var compDateStr = av.completionDate || '';
    if (!compDateStr || compDateStr === '-') continue;
    var compDate = parseDateStr(compDateStr);
    if (!compDate) continue;
    var stIdx = STATION_ORDER_ARR.indexOf(av.status);
    if (stIdx < 0) stIdx = 0;
    // At risk: completion date is within 2 days from now AND not yet at ขัดสี
    var todayDt = new Date();
    todayDt = new Date(todayDt.getFullYear(), todayDt.getMonth(), todayDt.getDate());
    var daysToGo = Math.round((compDate.getTime() - todayDt.getTime()) / 86400000);
    if (daysToGo <= 2 && stIdx < POLISH_IDX2) {
      // Calculate overdue days from delivery date
      var dueDtStr = av.deliveryDate || av.dueDate || '';
      var dueDt = dueDtStr ? parseDateStr(dueDtStr) : null;
      var daysOverdue = 0;
      if (dueDt) {
        daysOverdue = Math.round((todayDt.getTime() - dueDt.getTime()) / 86400000);
      }

      // Build reschedule details
      var arReschedules = [];
      if (av.reschedules && av.reschedules.length > 0) {
        for (var ari = 0; ari < av.reschedules.length; ari++) {
          var arRs = av.reschedules[ari];
          var arRsDate = String(arRs.date || '');
          if (arRsDate.indexOf('#') >= 0) continue;
          arReschedules.push({ no: ari + 1, date: arRsDate, reason: arRs.reason || '' });
        }
      }

      atRiskList.push({
        plate: av.plate,
        branch: av.branch,
        status: av.status,
        statusIdx: stIdx,
        completionDate: compDateStr,
        dueDate: av.deliveryDate || av.dueDate || '-',
        rescheduleCount: av.rescheduleCount || 0,
        reschedules: arReschedules,
        sa: av.sa || '-',
        insurance: av.insurance || '-',
        daysOverdue: daysOverdue,
        daysToGo: daysToGo
      });
    }
  }
  atRiskList.sort(function(a, b) { return a.daysToGo - b.daysToGo; });
  result.atRisk = { count: atRiskList.length, vehicles: atRiskList };

  result.reportDate = todayStr;
  result.yesterday = yesterdayStr;
  result.sourceLinks = {
    main: 'https://docs.google.com/spreadsheets/d/' + SS_ID,
    cnb: 'https://docs.google.com/spreadsheets/d/' + CNB_SS_ID,
    csk: 'https://docs.google.com/spreadsheets/d/' + CSK_SS_ID
  };
  return result;
}

/* ═══ Summary from B3 ═══ */
function getSummaryData(ss) {
  var result = {};
  try {
    var sheet = ss.getSheetByName('B3_สรุปสั้นการตรวจ FinalCheck');
    if (!sheet) return { error: 'B3 sheet not found' };
    var data = sheet.getRange(1, 1, Math.min(65, sheet.getLastRow()), Math.min(25, sheet.getLastColumn())).getValues();

    result.dailyPeriod = fmtDate(data[7] ? data[7][4] : null);
    result.monthlyPeriod = data[7] ? String(data[7][5] || '') : '';
    result.yearlyPeriod = data[7] ? String(data[7][9] || '') : '';
    var monthlyMonth = data[23] ? toNum(data[23][3]) : 0;

    result.daily = {
      total: toNum(data[9][3]), pass: toNum(data[10][3]), passPct: toNum(data[10][4]),
      fail: toNum(data[11][3]), failPct: toNum(data[11][4]),
      causes: { assembly: {count:toNum(data[13][3]),pct:toNum(data[13][4])}, paint: {count:toNum(data[14][3]),pct:toNum(data[14][4])}, body: {count:toNum(data[15][3]),pct:toNum(data[15][4])}, polish: {count:toNum(data[16][3]),pct:toNum(data[16][4])}, cleaning: {count:toNum(data[17][3]),pct:toNum(data[17][4])}, other: {count:toNum(data[18][3]),pct:toNum(data[18][4])}, noCause: {count:toNum(data[19][3]),pct:toNum(data[19][4])} }
    };
    result.monthly = {
      total: toNum(data[9][5]), pass: toNum(data[10][5]), passPct: toNum(data[10][6]),
      fail: toNum(data[11][5]), failPct: toNum(data[11][6]), month: monthlyMonth,
      causes: { assembly: {count:toNum(data[13][5]),pct:toNum(data[13][6])}, paint: {count:toNum(data[14][5]),pct:toNum(data[14][6])}, body: {count:toNum(data[15][5]),pct:toNum(data[15][6])}, polish: {count:toNum(data[16][5]),pct:toNum(data[16][6])}, cleaning: {count:toNum(data[17][5]),pct:toNum(data[17][6])}, other: {count:toNum(data[18][5]),pct:toNum(data[18][6])}, noCause: {count:toNum(data[19][5]),pct:toNum(data[19][6])} }
    };
    result.yearly = {
      total: toNum(data[9][9]), pass: toNum(data[10][9]), passPct: toNum(data[10][10]),
      fail: toNum(data[11][9]), failPct: toNum(data[11][10]), year: toNum(data[7][10]),
      causes: { assembly: {count:toNum(data[13][9]),pct:toNum(data[13][10])}, paint: {count:toNum(data[14][9]),pct:toNum(data[14][10])}, body: {count:toNum(data[15][9]),pct:toNum(data[15][10])}, polish: {count:toNum(data[16][9]),pct:toNum(data[16][10])}, cleaning: {count:toNum(data[17][9]),pct:toNum(data[17][10])}, other: {count:toNum(data[18][9]),pct:toNum(data[18][10])}, noCause: {count:toNum(data[19][9]),pct:toNum(data[19][10])} }
    };

    result.cn = {
      total: toNum(data[48][3]), knocker: toNum(data[50][3]), filler: toNum(data[51][3]),
      spray: toNum(data[52][3]), assemble: toNum(data[53][3]), polish: toNum(data[54][3]),
      wash: toNum(data[55][3]), waitDelivery: toNum(data[56][3]), delivered: toNum(data[57][3])
    };
    result.csk = {
      total: toNum(data[48][5]), knocker: toNum(data[50][5]), filler: toNum(data[51][5]),
      spray: toNum(data[52][5]), assemble: toNum(data[53][5]), polish: toNum(data[54][5]),
      wash: toNum(data[55][5]), waitDelivery: toNum(data[56][5]), delivered: toNum(data[57][5])
    };
    var s1cnOnTime = toNum(data[37][3]);
    var s1cnLate = toNum(data[39][3]);
    var s1cskOnTime = toNum(data[37][5]);
    var s1cskLate = toNum(data[39][5]);
    result.delivery = {
      cnOnTime: toNum(data[59][3]) || s1cnOnTime,
      cnLikelyLate: toNum(data[38][3]),
      cnLate: toNum(data[59][3]) === 0 ? s1cnLate : 0,
      cskOnTime: toNum(data[59][5]) || s1cskOnTime,
      cskLikelyLate: toNum(data[38][5]),
      cskLate: toNum(data[59][5]) === 0 ? s1cskLate : 0
    };
  } catch(err) { result.error = err.toString(); }
  return result;
}

/* ═══ Status detail from สถานะรถอยู่ระหว่างซ่อมภาพรวม ═══ */
function getStatusDetail(ss, branch, dateFrom, dateTo) {
  var result = { vehicles: [], summary: {} };
  var sheet = ss.getSheetByName('สถานะรถอยู่ระหว่างซ่อมภาพรวม');
  if (!sheet) { sheet = ss.getSheetByName('ภาพรวม'); }
  if (!sheet) return { error: 'Status sheet not found', vehicles: [], summary: {} };

  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(27, sheet.getLastColumn());
  if (lastRow < 6) return result;

  var data = sheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
  var s = { total: 0, cnb: 0, csk: 0, delivered: 0, knocker: 0, filler: 0, spray: 0, assemble: 0, polish: 0, wash: 0, supQC: 0, supFix: 0, waitDelivery: 0 };

  for (var r = 2; r < data.length; r++) {
    var row = data[r];
    if (!row) continue;
    var license = String(row[2] || '').trim();
    if (!license || license === 'รวมจำนวน (คัน)') continue;

    var branchVal = String(row[22] || '').trim();
    if (branch === 'cnb' && branchVal !== 'SUP1') continue;
    if (branch === 'csk' && branchVal !== 'SUP2') continue;

    var repairDateStr = fmtDate(row[13]);
    if (!isDateInRange(repairDateStr, dateFrom, dateTo)) continue;

    var knocker = toNum(row[3]);
    var filler = toNum(row[4]);
    var spray = toNum(row[5]);
    var assemble = toNum(row[6]);
    var polish = toNum(row[7]);
    var wash = toNum(row[8]);
    var supQc = toNum(row[9]);
    var supFix = toNum(row[10]);
    var waitDelivery = toNum(row[11]);
    var delivered = toNum(row[12]);

    var status = 'อื่นๆ';
    if (delivered > 0) status = 'ส่งมอบแล้ว';
    else if (waitDelivery > 0) status = 'รอส่งมอบ';
    else if (supQc > 0) status = 'SUP QC';
    else if (supFix > 0) status = 'SUP แก้ไขงาน';
    else if (wash > 0) status = 'ล้าง';
    else if (polish > 0) status = 'ขัดสี';
    else if (assemble > 0) status = 'ประกอบ';
    else if (spray > 0) status = 'พ่น';
    else if (filler > 0) status = 'โป๊ว';
    else if (knocker > 0) status = 'เคาะ';

    var branchDisplay = branchVal === 'SUP1' ? 'CNB' : branchVal === 'SUP2' ? 'CSK' : branchVal;

    s.total++;
    if (branchDisplay === 'CNB') s.cnb++;
    if (branchDisplay === 'CSK') s.csk++;
    s.knocker += knocker; s.filler += filler; s.spray += spray;
    s.assemble += assemble; s.polish += polish; s.wash += wash;
    s.supQC += supQc; s.supFix += supFix;
    s.waitDelivery += waitDelivery; s.delivered += delivered;

    // Reschedule data: idx 16-21 = เลื่อนนัดหมายครั้งที่ 1-3 + สาเหตุ
    var reschedules = [];
    for (var ri = 0; ri < 3; ri++) {
      var rDate = fmtDate(row[16 + ri * 2]);
      var rReason = String(row[17 + ri * 2] || '').trim();
      if (rDate || rReason) {
        reschedules.push({ date: rDate, reason: rReason });
      }
    }
    
    result.vehicles.push({
      plate: license, license: license, branch: branchDisplay,
      sup: branchDisplay, status: status,
      repairDate: repairDateStr, dateIn: repairDateStr,
      completionDate: fmtDate(row[14]), deliveryDate: fmtDate(row[15]),
      dueDate: fmtDate(row[15]),
      reschedules: reschedules,
      rescheduleCount: reschedules.length,
      knocker: knocker, filler: filler, spray: spray,
      assemble: assemble, polish: polish, wash: wash,
      supQc: supQc, supFix: supFix,
      waitDelivery: waitDelivery, delivered: delivered,
      sa: String(row[23] || '').trim(),
      saCenter: String(row[24] || '').trim(),
      insurance: String(row[26] || '').trim()
    });
  }
  result.summary = s;
  result.totalCount = result.vehicles.length;
  return result;
}

/* ═══ Convert Station KPI vehicle to Workflow format ═══ */
/* Station KPI vehicles come from CNB/CSK B2 sheets and have: 
   plate, status, repairDate, completedDate, totalDays, sa, branch, stations, reschedules...
   Workflow needs: plate, license, branch, sup, status, repairDate, dateIn, 
   completionDate, deliveryDate, dueDate, reschedules, rescheduleCount,
   knocker, filler, spray, assemble, polish, wash, supQc, supFix, waitDelivery, delivered,
   sa, saCenter, insurance */
function convertStationToWorkflowVehicle(sv, branchKey) {
  // Map station KPI status to workflow station status
  var status = sv.status || 'อื่นๆ';
  // Branch display: cnb→CNB, csk→CSK
  var branchDisplay = branchKey === 'cnb' ? 'CNB' : 'CSK';
  
  // Determine station counters from status text
  var knocker = 0, filler = 0, spray = 0, assemble2 = 0, polish = 0, wash = 0;
  var supQc = 0, supFix = 0, waitDelivery = 0, delivered = 0;
  if (status.indexOf('เคาะ') >= 0) knocker = 1;
  else if (status.indexOf('โป๊ว') >= 0) filler = 1;
  else if (status.indexOf('พ่น') >= 0) spray = 1;
  else if (status.indexOf('ประกอบ') >= 0) assemble2 = 1;
  else if (status.indexOf('ขัดสี') >= 0) polish = 1;
  else if (status.indexOf('ล้าง') >= 0) wash = 1;
  else if (status.indexOf('SUP QC') >= 0 || status.indexOf('QC') >= 0) supQc = 1;
  else if (status.indexOf('SUP แก้') >= 0 || status.indexOf('แก้ไข') >= 0) supFix = 1;
  else if (status.indexOf('รอส่ง') >= 0 || status.indexOf('ส่งมอบ') >= 0) waitDelivery = 1;
  else if (status.indexOf('ส่งมอบแล้ว') >= 0) delivered = 1;
  
  return {
    plate: sv.plate, license: sv.plate, branch: branchDisplay,
    sup: branchDisplay, status: status,
    repairDate: sv.repairDate || '', dateIn: sv.repairDate || '',
    completionDate: sv.completedDate || '', 
    deliveryDate: '', dueDate: '',
    reschedules: sv.reschedules || [], rescheduleCount: sv.rescheduleCount || 0,
    knocker: knocker, filler: filler, spray: spray,
    assemble: assemble2, polish: polish, wash: wash,
    supQc: supQc, supFix: supFix,
    waitDelivery: waitDelivery, delivered: delivered,
    sa: sv.sa || '', saCenter: sv.saCenter || '',
    insurance: sv.insurer || '',
    brand: sv.brand || '', model: sv.model || '',
    totalDays: sv.totalDays || 0,
    _source: 'stationKpi'
  };
}

/* ═══ Check data — reads from B1 (daily) and B2 (monthly/yearly) ═══ */
function getCheckData(ss, period, dateFrom, dateTo) {
  var result = {};

  // Read B1 daily data — pass dateFrom/dateTo to trigger recalc
  var dailyData = readFCDailyData(ss, dateFrom, dateTo);
  // Read B2 monthly/yearly data — pass dateFrom/dateTo to trigger recalc
  var b2Data = readFCMonthlyData(ss, dateFrom, dateTo);

  // Build dailyCheck from B1
  if (dailyData && !dailyData.error) {
    result.dailyCheck = dailyData;
  } else {
    result.dailyCheck = { total: 0, pass: 0, fail: 0, passPct: 0, failPct: 0, causes: {}, error: dailyData ? dailyData.error : 'No B1 data' };
  }

  // Build monthlyCheck from B2 left section
  if (b2Data && b2Data.monthly && !b2Data.monthly.error) {
    result.monthlyCheck = b2Data.monthly;
  } else {
    result.monthlyCheck = { total: 0, pass: 0, fail: 0, passPct: 0, failPct: 0, causes: {}, error: 'No B2 monthly data' };
  }

  // Build yearlyCheck from B2 right section
  if (b2Data && b2Data.yearly && !b2Data.yearly.error) {
    result.yearlyCheck = b2Data.yearly;
  } else {
    result.yearlyCheck = { total: 0, pass: 0, fail: 0, passPct: 0, failPct: 0, causes: {}, error: 'No B2 yearly data' };
  }

  // If custom date range, compute from B1/B2
  if (dateFrom && dateTo) {
    var fcData = getFinalCheckDetail(ss, dateFrom, dateTo);
    if (fcData) result.checkData = fcData;
  }

  var sections = ['dailyCheck', 'monthlyCheck', 'yearlyCheck', 'checkData'];

  // ═══ PRIORITY: B3 sheet is the most complete source for FC data ═══
  // B3 has ALL vehicles with delivery/inspection status (277+ entries).
  // DB query (BCT library) only gets 14 rows because it can't refresh from database
  // without userinfo.email scope. FC2026 sheet is also stale (QUERY won't recalculate).
  // So B3 is now PRIMARY, DB/FC2026 are secondary supplements only if they have MORE data.

  var b3Counts = countFCFromB3(ss, dateFrom, dateTo);
  var dbFC = queryFCFromDB(dateFrom, dateTo);
  var fc2026Data = readFC2026Data(ss, dateFrom, dateTo);

  // Determine the best data source per section
  for (var si = 0; si < sections.length; si++) {
    var sec = result[sections[si]];
    if (!sec) continue;

    var bestTotal = sec.total || 0;
    var bestPass = sec.pass || 0;
    var bestFail = sec.fail || 0;
    var bestPassPct = sec.passPct || 0;
    var bestFailPct = sec.failPct || 0;
    var bestCauses = sec.causes || {};
    var bestSource = sec.dataSource || 'B1B2';

    // B3 has the most complete data (all vehicles with delivery dates)
    if (b3Counts && b3Counts.total > bestTotal) {
      bestTotal = b3Counts.total;
      bestPass = b3Counts.pass;
      bestFail = b3Counts.fail;
      bestPassPct = b3Counts.passPct;
      bestFailPct = b3Counts.failPct;
      bestCauses = b3Counts.causes;
      bestSource = 'B3';
    }

    // DB data overrides only if it has MORE entries (database has actual FC results)
    if (dbFC && dbFC.total > bestTotal) {
      bestTotal = dbFC.total;
      bestPass = dbFC.pass;
      bestFail = dbFC.fail;
      bestPassPct = dbFC.passPct;
      bestFailPct = dbFC.failPct;
      if (dbFC.causes) bestCauses = dbFC.causes;
      bestSource = 'database';
    }

    // FC2026 data overrides only if it has MORE entries (has actual FC pass/fail per vehicle)
    if (fc2026Data && fc2026Data.total > bestTotal) {
      bestTotal = fc2026Data.total;
      bestPass = fc2026Data.pass;
      bestFail = fc2026Data.fail;
      bestPassPct = fc2026Data.passPct;
      bestFailPct = fc2026Data.failPct;
      if (fc2026Data.causes) bestCauses = fc2026Data.causes;
      bestSource = 'FC2026';
    }

    sec.total = bestTotal;
    sec.pass = bestPass;
    sec.fail = bestFail;
    sec.passPct = bestPassPct;
    sec.failPct = bestFailPct;
    sec.causes = bestCauses;
    sec.dataSource = bestSource;
  }

  // For yearly without date range, prefer B2 yearly aggregate if it has more data
  if (!dateFrom && !dateTo) {
    var yr = result.yearlyCheck;
    if (b2Data && b2Data.yearly && b2Data.yearly.total > yr.total) {
      yr.pass = b2Data.yearly.pass;
      yr.fail = b2Data.yearly.fail;
      yr.total = b2Data.yearly.total;
      yr.passPct = b2Data.yearly.passPct;
      yr.failPct = b2Data.yearly.failPct;
      yr.dataSource = 'B2-yearly';
    }
  }

  // Add vehicle status
  var statusForCheck = getStatusDetail(ss, null, null, null);
  var vlistC = statusForCheck.vehicles || [];
  var cnbC = { total: 0, knocker: 0, filler: 0, spray: 0, assemble: 0, polish: 0, wash: 0, waitDelivery: 0, delivered: 0 };
  var cskC = { total: 0, knocker: 0, filler: 0, spray: 0, assemble: 0, polish: 0, wash: 0, waitDelivery: 0, delivered: 0 };
  for (var ci = 0; ci < vlistC.length; ci++) {
    var cv = vlistC[ci];
    var br = cv.branch === 'CNB' || cv.branch === 'SUP1' ? 'cnb' : cv.branch === 'CSK' || cv.branch === 'SUP2' ? 'csk' : '';
    if (!br) continue;
    var tgtC = br === 'cnb' ? cnbC : cskC;
    tgtC.total++;
    tgtC.knocker += (cv.knocker || 0); tgtC.filler += (cv.filler || 0);
    tgtC.spray += (cv.spray || 0); tgtC.assemble += (cv.assemble || 0);
    tgtC.polish += (cv.polish || 0); tgtC.wash += (cv.wash || 0);
    tgtC.waitDelivery += (cv.waitDelivery || 0); tgtC.delivered += (cv.delivered || 0);
  }
  result.vehicleStatus = { cnb: cnbC, csk: cskC };
  result.periodInfo = { period: period || 'yearly', dateFrom: dateFrom, dateTo: dateTo };
  result.sourceLinks = {
    main: 'https://docs.google.com/spreadsheets/d/' + SS_ID,
    cnb: 'https://docs.google.com/spreadsheets/d/' + CNB_SS_ID,
    csk: 'https://docs.google.com/spreadsheets/d/' + CSK_SS_ID
  };
  return result;
}

/* ═══ Insurance Comparison Data — reads from "ประกันภัย อะไหล่ ศูนย์สี" sheet ═══ */
function getInsuranceComparison(ss) {
  var SHEET_NAME = 'ประกันภัย อะไหล่ ศูนย์สี';
  var result = {
    yearly: {},
    monthly: [],
    sourceLinks: {
      insurance: 'https://docs.google.com/spreadsheets/d/' + INS_SS_ID
    }
  };

  try {
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      result.error = 'Sheet "' + SHEET_NAME + '" not found';
      return result;
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 7 || lastCol < 25) {
      result.error = 'Sheet "' + SHEET_NAME + '" has insufficient data';
      return result;
    }

    // Read entire sheet at once for performance
    var numRows = Math.min(lastRow, 574);
    var data = sheet.getRange(1, 1, numRows, Math.min(lastCol, 25)).getValues();

    // ─── Helper: parse a company data row (25 columns) ───
    function parseCompanyRow(row) {
      if (!row || !row[1]) return null;
      var name = String(row[1] || '').trim();
      if (!name) return null;

      var rpCars = toNum(row[2]);   // C3: ป้ายแดง (คัน)
      var rpGM = toNum(row[4]);      // C5: GM ป้ายแดง
      var rnCars = toNum(row[5]);    // C6: ต่ออายุ (คัน)
      var rnGM = toNum(row[7]);      // C8: GM ต่ออายุ
      var pRev = toNum(row[9]);      // C10: อะไหล่ revenue
      var pGM = toNum(row[10]);      // C11: อะไหล่ GM
      var rcvCars = toNum(row[11]);  // C12: ศูนย์สี (คัน)
      var rcvLabor = toNum(row[12]); // C13: ค่าแรง
      var rcvParts = toNum(row[13]); // C14: ค่าอะไหล่
      var rcvGM = toNum(row[14]);    // C15: GM ค่าแรง

      // C16-C25 may be empty for monthly rows — compute from available data
      var totalSentCars = rpCars + rnCars;
      var sentTotalRev = toNum(row[6]) || (rpCars > 0 ? 0 : 0); // C7: รายได้ส่งต่ออายุ
      if (row[15] !== '' && row[15] !== null && row[15] !== undefined) {
        sentTotalRev = toNum(row[15]); // Use C16 if available (yearly only)
      } else {
        sentTotalRev = toNum(row[3]) + toNum(row[6]); // C4 + C7 = ป้ายแดงรายได้ + ต่ออายุรายได้
      }

      var ourRevenue = toNum(row[16]);
      if (!ourRevenue) ourRevenue = rcvLabor + rcvParts + pRev; // revenue we get = what we earn from work

      var ratioVal = toNum(row[17]);
      if (!ratioVal && sentTotalRev > 0) ratioVal = ourRevenue / sentTotalRev;

      var diffVal = toNum(row[18]);
      if (!diffVal && diffVal !== 0) diffVal = ourRevenue - sentTotalRev;

      var sCars = toNum(row[19]);
      if (!sCars) sCars = totalSentCars;

      var rCars = toNum(row[20]);
      if (!rCars) rCars = rcvCars;

      var netDiff = toNum(row[21]);
      if (!netDiff && netDiff !== 0) netDiff = rCars - sCars;

      var srRatio = toNum(row[22]);
      if (!srRatio && sCars > 0) srRatio = rCars / sCars;

      var avgSent = toNum(row[23]);
      if (!avgSent && sCars > 0) avgSent = sentTotalRev / sCars;

      var avgRecv = toNum(row[24]);
      if (!avgRecv && rCars > 0) avgRecv = ourRevenue / rCars;

      return {
        name: name,
        sent: {
          redPlate: rpCars,
          redPlateGM: rpGM,
          renewal: rnCars,
          renewalGM: rnGM
        },
        parts: {
          revenue: pRev,
          gm: pGM
        },
        received: {
          cars: rcvCars,
          laborRevenue: rcvLabor,
          partsRevenue: rcvParts,
          laborGM: rcvGM
        },
        summary: {
          sentTotal: sentTotalRev,
          ourRevenue: ourRevenue,
          ratio: ratioVal,
          difference: diffVal,
          sentCars: sCars,
          receivedCars: rCars,
          netDiff: netDiff,
          sentReceivedRatio: srRatio,
          avgPerSent: avgSent,
          avgPerReceived: avgRecv
        }
      };
    }

    // ─── Yearly totals: rows 7-32 (0-based indices 6-31) ───
    // Row 4 (0-based idx 3): C1=2025, C2="ยอดสะสมทั้งปี 2568"
    var yearRow = data[3]; // R4
    var yearVal = toNum(yearRow[0]);
    var yearCompanies = [];

    for (var yr = 6; yr <= 31; yr++) { // R7-R32 → 0-based 6-31
      if (yr >= data.length) break;
      var row = data[yr];
      if (!row || !row[1]) continue;
      var companyName = String(row[1] || '').trim();
      if (!companyName) continue;
      var company = parseCompanyRow(row);
      if (company) yearCompanies.push(company);
    }

    result.yearly = {
      year: yearVal > 0 ? yearVal : 2568,
      companies: yearCompanies
    };

    // ─── Monthly sections ───
    // Dynamic scan: find ALL month headers by looking for pattern C2 = "ม.ค.", "ก.พ." etc.
    var thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var monthStarts = [];

    for (var si = 33; si < data.length; si++) {
      var cell2 = String(data[si][1] || '').trim();
      for (var tm = 0; tm < thaiMonths.length; tm++) {
        if (cell2.indexOf(thaiMonths[tm]) >= 0) {
          // Verify it's a month header: C1 should be a season number (1-12)
          var cell1 = toNum(data[si][0]);
          if (cell1 >= 1 && cell1 <= 12) {
            monthStarts.push({ rowIdx: si, name: cell2, num: parseInt(cell1) });
          }
          break;
        }
      }
    }

    var monthlyData = [];

    for (var mi = 0; mi < monthStarts.length; mi++) {
      var mInfo = monthStarts[mi];
      var headerIdx = mInfo.rowIdx;

      // Data starts 3 rows after header (skip sub-header + subheader2)
      var dataStartIdx = headerIdx + 3;
      // End: next month's header or at most 33 rows
      var dataEndIdx;
      if (mi + 1 < monthStarts.length) {
        dataEndIdx = monthStarts[mi + 1].rowIdx;
      } else {
        dataEndIdx = Math.min(headerIdx + 33, data.length);
      }

      var monthCompanies = [];
      for (var di = dataStartIdx; di < dataEndIdx; di++) {
        if (di >= data.length) break;
        var dRow = data[di];
        if (!dRow || !String(dRow[1] || '').trim()) break;
        // Skip if this looks like another section header
        var dSeason = toNum(dRow[0]);
        var dName = String(dRow[1] || '').trim();
        if (dSeason >= 1 && dSeason <= 12 && thaiMonths.some(function(m){ return dName.indexOf(m) >= 0; })) break;

        var comp = parseCompanyRow(dRow);
        if (comp) monthCompanies.push(comp);
      }

      monthlyData.push({
        month: mInfo.name,
        monthNum: mInfo.num,
        companies: monthCompanies
      });
    }

    result.monthly = monthlyData;

  } catch (err) {
    result.error = err.toString() + '\n' + (err.stack || '');
  }

  return result;
}

/* ═══ Read FinalCheck data from B1 (รายวัน) sheet ═══ */
function readFCDailyData(ss, dateFrom, dateTo) {
  var sheetNames = [
    'B1_สรุปการตรวจ FinalCheck (รายวัน)',
    'B1_สรุปการตรวจ FinalCheck(รายวัน)'
  ];
  var sheet = null;
  for (var i = 0; i < sheetNames.length; i++) {
    sheet = ss.getSheetByName(sheetNames[i]);
    if (sheet) break;
  }
  if (!sheet) return { error: 'B1 daily FC sheet not found' };

  // Write trigger date to force formula recalculation
  var triggerDate = dateFrom || fmtDate(new Date());
  try {
    var dateVal = new Date(triggerDate);
    if (!isNaN(dateVal.getTime())) {
      sheet.getRange(3, 3).setValue(dateVal);   // R3 C3 = dateFrom
      if (dateTo) {
        sheet.getRange(3, 5).setValue(new Date(dateTo)); // R3 C5 = dateTo
      } else {
        sheet.getRange(3, 5).setValue(dateVal); // same day
      }
      SpreadsheetApp.flush(); // force recalc
      Utilities.sleep(3000);  // wait for formulas to compute
    }
  } catch(e) { /* non-critical: proceed with cached values */ }

  var lr = Math.min(sheet.getLastRow(), 50);
  var lc = Math.min(sheet.getLastColumn(), 9); // cols A-I
  var data = sheet.getRange(1, 1, lr, lc).getValues();
  var result = parseFCSection(data, 0);
  result.readFromB1B2 = true;
  return result;
}

/* ═══ Read FinalCheck data from B2 (รายเดือน) sheet ═══ */
function readFCMonthlyData(ss, dateFrom, dateTo) {
  var sheetNames = [
    'B2_สรุปการตรวจ FinalCheck(รายเดือน)',
    'B2_สรุปการตรวจ FinalCheck (รายเดือน)',
    ' B2_สรุปการตรวจ FinalCheck(รายเดือน)'
  ];
  var sheet = null;
  for (var i = 0; i < sheetNames.length; i++) {
    sheet = ss.getSheetByName(sheetNames[i]);
    if (sheet) break;
  }
  if (!sheet) return { error: 'B2 monthly FC sheet not found' };

  // Write trigger dates to force formula recalculation
  var triggerFrom = dateFrom || fmtDate(new Date(new Date().getFullYear(), 0, 1));
  var triggerTo = dateTo || fmtDate(new Date());
  try {
    var fromVal = new Date(triggerFrom);
    var toVal = new Date(triggerTo);
    if (!isNaN(fromVal.getTime()) && !isNaN(toVal.getTime())) {
      // Monthly section: R3 C3/C5
      sheet.getRange(3, 3).setValue(fromVal);
      sheet.getRange(3, 5).setValue(toVal);
      SpreadsheetApp.flush();
      Utilities.sleep(3000);
    }
  } catch(e) { /* non-critical */ }

  var lr = Math.min(sheet.getLastRow(), 50);
  var lc = Math.min(sheet.getLastColumn(), 15); // cols A-N + buffer
  var data = sheet.getRange(1, 1, lr, lc).getValues();
  var monthly = parseFCSection(data, 0);
  monthly.readFromB1B2 = true;
  var yearly = parseFCSection(data, 8);
  yearly.readFromB1B2 = true;
  return { monthly: monthly, yearly: yearly };
}

/* ═══ Parse a FinalCheck section from B1/B2 sheet data ═══
   B1/B2 layout (1-based row/col → 0-based array index):
   R3  C3/C5  : dateFrom / dateTo
   R5  C4     : ยอดรถส่งมอบทั้งหมด (totalDelivered)
   R6  C4     : Sup ส่งมอบรถให้ PMG (supDelivered)
   R7  C7     : Sup ส่งมอบงานตามกำหนด (supOnTime)
   R10 C4     : Sup ส่งมอบงานเกินกำหนด (supOverDue)
   R25 C4     : ส่งมอบแล้วรอตั้งเบิกทั้งหมด (waitClaimTotal)
   R28 C4/C7  : จำนวนรถที่เกมตรวจทั้งหมด / ผ่าน
   R29 C4     : จำนวนรถที่ตรวจผ่าน ครั้ง1 (pass)
   R31 C4     : จำนวนรถที่ตรวจไม่ผ่าน (fail)
   R38 C4     : งานประกอบ (assembly)
   R39 C4     : งานสี (paint)
   R40 C4     : งานตัวถัง (body)
   R41 C4     : เก็บงานขัดสี (polish)
   R42 C4     : ความสะอาด (cleaning)
   R43 C4     : อื่นๆ (other)
   colOffset shifts columns for B2 yearly section (+8) */
function parseFCSection(data, colOffset) {
  var c = colOffset;
  var result = {};

  result.dateFrom = safeFmtDate(data, 2, 2 + c); // R3 C3
  result.dateTo = safeFmtDate(data, 2, 4 + c);   // R3 C5
  result.totalDelivered = safeGetNum(data, 4, 3 + c);  // R5 C4
  result.supDelivered = safeGetNum(data, 5, 3 + c);     // R6 C4
  result.supOnTime = safeGetNum(data, 6, 6 + c);        // R7 C7 (Sup ส่งมอบงานตามกำหนด)
  result.supOverDue = safeGetNum(data, 9, 3 + c);       // R10 C4
  result.waitClaimTotal = safeGetNum(data, 24, 3 + c);  // R25 C4

  var totalInspected = safeGetNum(data, 27, 3 + c); // R28 C4
  var passCount = safeGetNum(data, 28, 3 + c);       // R29 C4
  var failCount = safeGetNum(data, 30, 3 + c);       // R31 C4

  result.total = totalInspected;
  result.pass = passCount;
  result.fail = failCount;
  result.passPct = totalInspected > 0 ? Math.round(passCount / totalInspected * 1000) / 1000 : 0;
  result.failPct = totalInspected > 0 ? Math.round(failCount / totalInspected * 1000) / 1000 : 0;
  result.passAtTarget = safeGetNum(data, 27, 6 + c); // R28 C7 (ผ่าน at 80% target)

  // Causes R38-R43 C4
  var failTotal = failCount > 0 ? failCount : 1;
  result.causes = {
    assembly: { count: safeGetNum(data, 37, 3 + c), pct: 0 }, // R38 งานประกอบ
    paint:    { count: safeGetNum(data, 38, 3 + c), pct: 0 }, // R39 งานสี
    body:     { count: safeGetNum(data, 39, 3 + c), pct: 0 }, // R40 งานตัวถัง
    polish:   { count: safeGetNum(data, 40, 3 + c), pct: 0 }, // R41 เก็บงานขัดสี
    cleaning: { count: safeGetNum(data, 41, 3 + c), pct: 0 }, // R42 ความสะอาด
    other:    { count: safeGetNum(data, 42, 3 + c), pct: 0 }  // R43 อื่นๆ
  };
  result.causes.assembly.pct = result.causes.assembly.count / failTotal;
  result.causes.paint.pct = result.causes.paint.count / failTotal;
  result.causes.body.pct = result.causes.body.count / failTotal;
  result.causes.polish.pct = result.causes.polish.count / failTotal;
  result.causes.cleaning.pct = result.causes.cleaning.count / failTotal;
  result.causes.other.pct = result.causes.other.count / failTotal;

  result.readFromB1B2 = true;
  return result;
}

/* ═══ Safe getNum from 2D array ═══ */
function safeGetNum(data, row, col) {
  if (!data || row < 0 || row >= data.length) return 0;
  if (!data[row] || col < 0 || col >= data[row].length) return 0;
  return toNum(data[row][col]);
}

/* ═══ Safe fmtDate from 2D array ═══ */
function safeFmtDate(data, row, col) {
  if (!data || row < 0 || row >= data.length) return '';
  if (!data[row] || col < 0 || col >= data[row].length) return '';
  return fmtDate(data[row][col]);
}

/* ═══ FinalCheck detail from B1/B2 (for custom date ranges) ═══ */
function getFinalCheckDetail(ss, dateFrom, dateTo) {
  var result = { total: 0, pass: 0, fail: 0, passPct: 0, failPct: 0, causes: {}, readFromB1B2: true };

  // Determine best B1/B2 section for the date range
  var now = new Date();
  var todayStr = fmtDate(now);
  var monthStart = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-01';
  var monthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Same-day range → B1 daily (with date trigger)
  if (dateFrom && dateTo && dateFrom === dateTo) {
    var dailyData = readFCDailyData(ss, dateFrom, dateTo);
    if (dailyData && !dailyData.error) {
      result = dailyData;
      result.dateFrom = dateFrom;
      result.dateTo = dateTo;
      return result;
    }
  }

  // Month range → B2 monthly (with date trigger)
  if (dateFrom && dateTo && dateFrom === monthStart && dateTo === monthEnd) {
    var b2m = readFCMonthlyData(ss, dateFrom, dateTo);
    if (b2m && b2m.monthly && !b2m.monthly.error) {
      result = b2m.monthly;
      result.dateFrom = dateFrom;
      result.dateTo = dateTo;
      return result;
    }
  }

  // Year range or any other range → try B2 yearly, then monthly, then B1 (with date trigger)
  var b2Data = readFCMonthlyData(ss, dateFrom, dateTo);
  if (b2Data) {
    if (b2Data.yearly && !b2Data.yearly.error && b2Data.yearly.total > 0) {
      result = b2Data.yearly;
    } else if (b2Data.monthly && !b2Data.monthly.error && b2Data.monthly.total > 0) {
      result = b2Data.monthly;
    }
  }

  // Last resort: try B1 daily
  if (result.total === 0) {
    var dailyFallback = readFCDailyData(ss, dateFrom, dateTo);
    if (dailyFallback && !dailyFallback.error && dailyFallback.total > 0) {
      result = dailyFallback;
    }
  }

  if (dateFrom) result.dateFrom = dateFrom;
  if (dateTo) result.dateTo = dateTo;
  if (result.total === 0) result.error = 'No B1/B2 FC data available for this range';
  return result;
}

/* ═══ Classify cause text into cause categories (utility) ═══ */
function classifyCause(text, causes) {
  if (!text) { causes.noCause.count++; return; }
  var t = text.toLowerCase();
  if (t.indexOf('ประกอบ') >= 0) { causes.assembly.count++; return; }
  if (t.indexOf('สี') >= 0 && t.indexOf('ขัด') < 0) { causes.paint.count++; return; }
  if (t.indexOf('ตัวถัง') >= 0) { causes.body.count++; return; }
  if (t.indexOf('ขัด') >= 0) { causes.polish.count++; return; }
  if (t.indexOf('สะอาด') >= 0 || t.indexOf('ความสะอาด') >= 0) { causes.cleaning.count++; return; }
  causes.other.count++;
}

/* ═══ Station KPI data from CNB/CSK B2 ═══ */
function getStationKpiData(period, dateFrom, dateTo) {
  var result = { cnb: { vehicles: [], stationStats: [] }, csk: { vehicles: [], stationStats: [] } };
  var ssIds = [{ id: CNB_SS_ID, key: 'cnb', name: 'มหาราช' }, { id: CSK_SS_ID, key: 'csk', name: 'ซีเอสเค' }];

  // B2 station column mapping
  var fullStations_B2 = [
    { key: 'knock', waitI: 21, startI: 22, manI: 23, endI: 24, workI: 25 },
    { key: 'patch', waitI: 27, startI: 28, manI: 29, endI: 30, workI: 31 },
    { key: 'squirt', waitI: 33, startI: 34, manI: 35, endI: 36, workI: 37 },
    { key: 'assemble', waitI: 39, startI: 40, manI: 41, endI: 42, workI: 43 },
    { key: 'polish', waitI: 45, startI: 46, manI: 47, endI: 48, workI: 49 }
  ];
  // C1 station column mapping (different column layout)
  var fullStations_C1 = [
    { key: 'knock', waitI: 15, startI: 16, manI: 17, endI: 18, workI: 19 },
    { key: 'patch', waitI: 20, startI: 21, manI: 22, endI: 23, workI: 24 },
    { key: 'squirt', waitI: 25, startI: 26, manI: 27, endI: 28, workI: 29 },
    { key: 'assemble', waitI: 30, startI: 31, manI: 32, endI: 33, workI: 34 },
    { key: 'polish', waitI: 35, startI: 36, manI: 37, endI: 38, workI: 39 }
  ];

  // B2 meta column mapping
  var colMeta_B2 = { saCenter: 59, brand: 63, model: 64, insurer: 65, wageTotal: 56, deductLabor: 57, netWage: 58,
                     washEnd: 51, supQCEnd: 52, deliverEnd: 53 };
  // C1 meta column mapping
  var colMeta_C1 = { saCenter: 44, brand: 48, model: 49, insurer: 50, wageTotal: 42, deductLabor: 58, netWage: 42,
                     washEnd: 40, supQCEnd: -1, deliverEnd: 41 };

  // postpone pairs
  var postponePairs_B2 = [
    { dateIdx: 11, reasonIdx: 12 },
    { dateIdx: 14, reasonIdx: 15 },
    { dateIdx: 17, reasonIdx: 18 }
  ];
  var postponePairs_C1 = [
    { dateIdx: 9, reasonIdx: 10 },
    { dateIdx: 11, reasonIdx: 12 },
    { dateIdx: 13, reasonIdx: 14 }
  ];

  var processedJobs = {};

  function processKpiSheet(sheet, startRow, fullStations, colMeta, postponePairs, branchKey, branchName) {
    if (!sheet) return [];
    var lr = sheet.getLastRow();
    var lc = Math.min(sheet.getLastColumn(), 68);
    var numRows = Math.min(lr - startRow + 1, 300);
    if (numRows <= 0) return [];
    var data = sheet.getRange(startRow, 1, numRows, lc).getValues();

    var vehicles = [];
    var stationNames = ['เคาะ', 'โป๊ว', 'พ่น', 'ประกอบ', 'ขัดสี', 'ล้าง', 'SUP QC', 'ส่งมอบ'];
    var stationKeys = ['knock', 'patch', 'squirt', 'assemble', 'polish', 'wash', 'supQC', 'deliver'];

    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var plate = String(row[4] || '').trim();
      var status = String(row[3] || '').trim();
      var repairDate = row[6];
      if (!plate || plate === '') continue;

      // Dedup by jobId
      var jobId = String(row[5] || '').trim();
      var dedupKey = branchKey + '_' + jobId;
      if (jobId && processedJobs[dedupKey]) continue;
      if (jobId) processedJobs[dedupKey] = true;

      // Filter by date range if provided
      var repairDateStr = fmtDate(repairDate);
      if (!isDateInRange(repairDateStr, dateFrom, dateTo)) continue;

      var v = {
        plate: plate, status: status,
        jobId: jobId,
        repairDate: repairDateStr,
        completedDate: fmtDate(row[7]),
        totalDays: toNum(row[8]),
        sa: String(row[9] || '').trim(),
        saCenter: String(row[colMeta.saCenter] || '').trim(),
        branch: branchKey,
        branchName: branchName,
        brand: String(row[colMeta.brand] || '').trim(),
        model: String(row[colMeta.model] || '').trim(),
        insurer: String(row[colMeta.insurer] || '').trim(),
        wageTotal: toNum(row[colMeta.wageTotal]),
        deductLabor: toNum(row[colMeta.deductLabor]),
        netWage: toNum(row[colMeta.netWage]),
        stations: {},
        reschedules: [],
        rescheduleCount: 0
      };

      // Build reschedule array
      for (var pi = 0; pi < postponePairs.length; pi++) {
        var pDate = fmtDate(row[postponePairs[pi].dateIdx]);
        var pReason = String(row[postponePairs[pi].reasonIdx] || '').replace(/[\r\n\t]+/g, ' ').trim();
        if (pDate || pReason) {
          v.reschedules.push({ date: pDate, reason: pReason });
        }
      }
      v.rescheduleCount = v.reschedules.length;

      for (var si2 = 0; si2 < fullStations.length; si2++) {
        var stn = fullStations[si2];
        var waitD = toNum(row[stn.waitI]);
        var workD = toNum(row[stn.workI]);
        v.stations[stn.key] = {
          waitDays: waitD,
          startDate: fmtDate(row[stn.startI]),
          man: String(row[stn.manI] || '').trim(),
          endDate: fmtDate(row[stn.endI]),
          workDays: workD
        };
      }

      // ล้าง
      var washEnd = colMeta.washEnd >= 0 ? fmtDate(row[colMeta.washEnd]) : '';
      v.stations.wash = { endDate: washEnd, man: '', workDays: 0, waitDays: 0 };

      // SUP QC
      var supQCEnd = colMeta.supQCEnd >= 0 ? fmtDate(row[colMeta.supQCEnd]) : '';
      v.stations.supQC = { endDate: supQCEnd, man: '', workDays: 0, waitDays: 0 };

      // ส่งมอบ PMG
      var deliverEnd = colMeta.deliverEnd >= 0 ? fmtDate(row[colMeta.deliverEnd]) : '';
      v.stations.deliver = { endDate: deliverEnd, man: '', workDays: 0, waitDays: 0 };

      vehicles.push(v);
    }
    return vehicles;
  }

  for (var s = 0; s < ssIds.length; s++) {
    try {
      var ss = SpreadsheetApp.openById(ssIds[s].id);
      var stationNames = ['เคาะ', 'โป๊ว', 'พ่น', 'ประกอบ', 'ขัดสี', 'ล้าง', 'SUP QC', 'ส่งมอบ'];
      var stationKeys = ['knock', 'patch', 'squirt', 'assemble', 'polish', 'wash', 'supQC', 'deliver'];

      // Process B2 — in-progress vehicles
      var b2Sheet = findB2Sheet_(ss);
      var b2Vehicles = b2Sheet ? processKpiSheet(b2Sheet, 34, fullStations_B2, colMeta_B2, postponePairs_B2, ssIds[s].key, ssIds[s].name) : [];

      // Process C1 — completed/delivered vehicles
      var c1Sheet = findC1Sheet_(ss);
      var c1Vehicles = c1Sheet ? processKpiSheet(c1Sheet, 31, fullStations_C1, colMeta_C1, postponePairs_C1, ssIds[s].key, ssIds[s].name) : [];

      var vehicles = b2Vehicles.concat(c1Vehicles);

      // Rebuild stationAccum from merged vehicles
      var stationAccum = {};
      for (var si = 0; si < stationKeys.length; si++) {
        stationAccum[stationKeys[si]] = { name: stationNames[si], count: 0, waitDays: [], workDays: [], avgWait: 0, avgWork: 0, maxWork: 0, totalVehicles: 0 };
      }

      for (var vi = 0; vi < vehicles.length; vi++) {
        var v = vehicles[vi];
        for (var si2 = 0; si2 < stationKeys.length; si2++) {
          var sKey = stationKeys[si2];
          if (v.stations[sKey]) {
            var stData = v.stations[sKey];
            if (stData.workDays > 0 && stData.workDays < 999) stationAccum[sKey].workDays.push(stData.workDays);
            if (stData.waitDays > 0 && stData.waitDays < 999) stationAccum[sKey].waitDays.push(stData.waitDays);
            if (stData.startDate || stData.endDate) stationAccum[sKey].count++;
          }
        }
      }

      // Compute averages
      var statSummary = [];
      for (var si3 = 0; si3 < stationKeys.length; si3++) {
        var acc = stationAccum[stationKeys[si3]];
        var avgWork = acc.workDays.length > 0 ? (acc.workDays.reduce(function(a,b){return a+b;},0) / acc.workDays.length) : 0;
        var avgWait = acc.waitDays.length > 0 ? (acc.waitDays.reduce(function(a,b){return a+b;},0) / acc.waitDays.length) : 0;
        var maxWork = acc.workDays.length > 0 ? Math.max.apply(null, acc.workDays) : 0;
        statSummary.push({
          station: stationKeys[si3],
          name: acc.name,
          vehiclesProcessed: acc.count,
          avgWorkDays: Math.round(avgWork * 10) / 10,
          avgWaitDays: Math.round(avgWait * 10) / 10,
          maxWorkDays: maxWork,
          totalDataPoints: acc.workDays.length
        });
      }

      result[ssIds[s].key] = { vehicles: vehicles, stationStats: statSummary, totalVehicles: vehicles.length };
    } catch(err) {
      result[ssIds[s].key] = { error: err.toString(), vehicles: [], stationStats: [], totalVehicles: 0 };
    }
  }
  return result;
}

/* ═══ Station Movement data (for Movement tab) ═══ */
/* v5: Group by date → station, count vehicles per station + detail list (plate, SA, saCenter, netWage) */
function getStationMovementData(period, dateFrom, dateTo, branch) {
  var result = { period: period || 'yearly' };

  var ssIds = [];
  if (!branch || branch === 'cnb') ssIds.push({ id: CNB_SS_ID, key: 'cnb', name: 'มหาราช' });
  if (!branch || branch === 'csk') ssIds.push({ id: CSK_SS_ID, key: 'csk', name: 'ซีเอสเค' });

  // Station completion columns: end date for each station — different per sheet type (B2 vs C1)
  var stationEndCols_B2 = [
    { key: 'knock', name: 'เคาะ', endI: 24 },
    { key: 'patch', name: 'โป๊ว', endI: 30 },
    { key: 'squirt', name: 'พ่น', endI: 36 },
    { key: 'assemble', name: 'ประกอบ', endI: 42 },
    { key: 'polish', name: 'ขัดสี', endI: 48 },
    { key: 'wash', name: 'ล้าง', endI: 51 },
    { key: 'deliver', name: 'ส่งมอบ', endI: 53 }
  ];
  var stationEndCols_C1 = [
    { key: 'knock', name: 'เคาะ', endI: 18 },
    { key: 'patch', name: 'โป๊ว', endI: 23 },
    { key: 'squirt', name: 'พ่น', endI: 28 },
    { key: 'assemble', name: 'ประกอบ', endI: 33 },
    { key: 'polish', name: 'ขัดสี', endI: 38 },
    { key: 'wash', name: 'ล้าง', endI: 40 },
    { key: 'deliver', name: 'ส่งมอบ', endI: 41 }
  ];

  // Column mapping for vehicle meta fields — different per sheet type
  // B2:  sa=9, saCenter=59, brand=63, model=64, insurer=65, status=3, wageCol=58, wageTotalCol=56
  // C1:  sa=9, saCenter=44, brand=48, model=49, insurer=50, status=3, wageCol=42, wageTotalCol=42
  var colMap_B2 = { sa: 9, saCenter: 59, brand: 63, model: 64, insurer: 65, status: 3, netWage: 58, wageTotal: 56 };
  var colMap_C1 = { sa: 9, saCenter: 44, brand: 48, model: 49, insurer: 50, status: 3, netWage: 42, wageTotal: 42 };

  // allDates: dateStr -> { date, cnb: { station -> {count, vehicles:[], wages} }, csk: { same } }
  var allDates = {};
  // track processed jobIds to avoid duplicates between B2 and C1
  var processedJobs = {};

  function processSheet(sheet, startRow, stationCols, colMap, branchKey) {
    if (!sheet) return;
    var lr = sheet.getLastRow();
    var maxCol = colMap.brand > 60 ? 68 : 54; // B2 needs cols 63-65, C1 only needs ~51
    var lc = Math.min(sheet.getLastColumn(), maxCol);
    var numRows = Math.min(lr - startRow + 1, 300);
    if (numRows <= 0) return;
    var data = sheet.getRange(startRow, 1, numRows, lc).getValues();

    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var plate = String(row[4] || '').trim();
      if (!plate) continue;

      // Dedup by jobId — avoid counting same vehicle from both B2 and C1
      var jobId = String(row[5] || '').trim();
      var dedupKey = branchKey + '_' + jobId;
      if (jobId && processedJobs[dedupKey]) continue;
      if (jobId) processedJobs[dedupKey] = true;

      var vehicleSa = String(row[colMap.sa] || '').trim();
      var vehicleSaCenter = String(row[colMap.saCenter] || '').trim() || 'ไม่ระบุ';
      var vehicleBrand = String(row[colMap.brand] || '').trim();
      var vehicleModel = String(row[colMap.model] || '').trim();
      var vehicleInsurer = String(row[colMap.insurer] || '').trim();
      var vehicleStatus = String(row[colMap.status] || '').trim();
      var netWage = toNum(row[colMap.netWage]);
      var wageTotal = toNum(row[colMap.wageTotal]);
      var vehicleWage = netWage > 0 ? netWage : wageTotal;

      // Check each station's completion date
      for (var si = 0; si < stationCols.length; si++) {
        var stn = stationCols[si];
        var endVal = row[stn.endI];
        if (!endVal) continue;

        var endDateStr = fmtDate(endVal);
        if (!endDateStr) continue;

        // Filter by completion date range
        if (dateFrom && endDateStr < dateFrom) continue;
        if (dateTo && endDateStr > dateTo) continue;

        // Build date entry
        if (!allDates[endDateStr]) {
          allDates[endDateStr] = { date: endDateStr, cnb: {}, csk: {} };
        }
        var dateObj = allDates[endDateStr];
        var branchData = dateObj[branchKey];
        if (!branchData[stn.key]) {
          branchData[stn.key] = { count: 0, wages: 0, vehicles: [] };
        }
        branchData[stn.key].count++;
        branchData[stn.key].wages += vehicleWage;
        branchData[stn.key].vehicles.push({
          plate: plate,
          sa: vehicleSa,
          saCenter: vehicleSaCenter,
          brand: vehicleBrand,
          model: vehicleModel,
          insurer: vehicleInsurer,
          netWage: vehicleWage,
          status: vehicleStatus,
          station: stn.key,
          stationName: stn.name,
          endDate: endDateStr,
          branch: branchKey
        });
      }
    }
  }

  for (var s = 0; s < ssIds.length; s++) {
    var branchKey = ssIds[s].key;
    try {
      var ss = SpreadsheetApp.openById(ssIds[s].id);

      // Read B2 — in-progress vehicles (startRow=34)
      var b2Sheet = findB2Sheet_(ss);
      if (!b2Sheet) { result[branchKey + '_b2_error'] = 'B2 sheet not found'; }
      else { processSheet(b2Sheet, 34, stationEndCols_B2, colMap_B2, branchKey); }

      // Read C1 — completed/delivered vehicles (startRow=31)
      var c1Sheet = findC1Sheet_(ss);
      if (!c1Sheet) { result[branchKey + '_c1_error'] = 'C1 sheet not found'; }
      else { processSheet(c1Sheet, 31, stationEndCols_C1, colMap_C1, branchKey); }

    } catch(err) {
      result[branchKey + '_error'] = err.toString();
    }
  }

  // Convert allDates to sorted array
  var dateKeys = Object.keys(allDates).sort().reverse(); // newest first
  var dailyData = [];
  for (var d = 0; d < dateKeys.length; d++) {
    var dk = dateKeys[d];
    var dd = allDates[dk];
    dailyData.push({ date: dk, cnb: dd.cnb, csk: dd.csk });
  }

  // Compute totals per station
  var stationTotals = {};
  for (var sk = 0; sk < stationEndCols_B2.length; sk++) {
    stationTotals[stationEndCols_B2[sk].key] = {
      name: stationEndCols_B2[sk].name,
      cnbCount: 0, cskCount: 0, cnbWages: 0, cskWages: 0
    };
  }
  for (var di = 0; di < dailyData.length; di++) {
    var dayData = dailyData[di];
    for (var stk = 0; stk < stationEndCols_B2.length; stk++) {
      var sKey = stationEndCols_B2[stk].key;
      if (dayData.cnb[sKey]) {
        stationTotals[sKey].cnbCount += dayData.cnb[sKey].count;
        stationTotals[sKey].cnbWages += dayData.cnb[sKey].wages;
      }
      if (dayData.csk[sKey]) {
        stationTotals[sKey].cskCount += dayData.csk[sKey].count;
        stationTotals[sKey].cskWages += dayData.csk[sKey].wages;
      }
    }
  }

  result.dailyData = dailyData;
  result.stationTotals = stationTotals;
  result.stationKeys = stationEndCols_B2.map(function(s) { return s.key; });
  result.stationNames = {};
  for (var sni = 0; sni < stationEndCols_B2.length; sni++) {
    result.stationNames[stationEndCols_B2[sni].key] = stationEndCols_B2[sni].name;
  }
  result.totalDays = dailyData.length;
  return result;
}

/* ═══ Detailed vehicles with cycle times (for table view) ═══ */
function getDetailedVehicles(branch, dateFrom, dateTo) {
  var statusData = getStatusDetail(SpreadsheetApp.openById(SS_ID), branch, dateFrom, dateTo);
  var baseVehicles = statusData.vehicles || [];

  // Enrich with B2 + C1 data
  var ssIds = [];
  if (!branch || branch === 'cnb') ssIds.push({ id: CNB_SS_ID, key: 'cnb' });
  if (!branch || branch === 'csk') ssIds.push({ id: CSK_SS_ID, key: 'csk' });

  var b2Data = {};
  var c1Data = {};
  for (var s = 0; s < ssIds.length; s++) {
    try {
      var ss = SpreadsheetApp.openById(ssIds[s].id);
      // Read B2 — in-progress vehicles
      var b2Sheet = findB2Sheet_(ss);
      if (b2Sheet) {
        var b2Lr = b2Sheet.getLastRow();
        var b2Lc = Math.min(b2Sheet.getLastColumn(), 68);
        var b2Rows = b2Sheet.getRange(34, 1, Math.min(b2Lr - 33, 200), b2Lc).getValues();
        for (var r = 0; r < b2Rows.length; r++) {
          var plate = String(b2Rows[r][4] || '').trim();
          if (!plate) continue;
          b2Data[plate + '_' + ssIds[s].key] = b2Rows[r];
        }
      }
      // Read C1 — completed/delivered vehicles
      var c1Sheet = findC1Sheet_(ss);
      if (c1Sheet) {
        var c1Lr = c1Sheet.getLastRow();
        var c1Lc = Math.min(c1Sheet.getLastColumn(), 68);
        var c1Rows = c1Sheet.getRange(31, 1, Math.min(c1Lr - 30, 500), c1Lc).getValues();
        for (var r = 0; r < c1Rows.length; r++) {
          var plate = String(c1Rows[r][4] || '').trim();
          if (!plate) continue;
          c1Data[plate + '_' + ssIds[s].key] = c1Rows[r];
        }
      }
    } catch(e) {}
  }

  // B2 column indices for enrichment
  var b2Col = { brand: 63, model: 64, insurer: 65, appraiser: 59, wageTotal: 56,
    knock: { days: 25, wait: 21, man: 23 },
    patch: { days: 31, wait: 27, man: 29 },
    squirt: { days: 37, wait: 33, man: 35 },
    assemble: { days: 43, wait: 39, man: 41 },
    polish: { days: 49, wait: 45, man: 47 }
  };
  // C1 column indices for enrichment
  var c1Col = { brand: 48, model: 49, insurer: 50, appraiser: 44, wageTotal: 42,
    knock: { days: 19, wait: 15, man: 17 },
    patch: { days: 24, wait: 20, man: 22 },
    squirt: { days: 29, wait: 25, man: 27 },
    assemble: { days: 34, wait: 30, man: 32 },
    polish: { days: 39, wait: 35, man: 37 }
  };

  function enrichFromRow(v, row, col) {
    v.brand = String(row[col.brand] || '').trim();
    v.model = String(row[col.model] || '').trim();
    v.insurer = String(row[col.insurer] || '').trim();
    v.appraiser = String(row[col.appraiser] || '').trim();
    v.wageTotal = toNum(row[col.wageTotal]);
    if (!v.saCenter) v.saCenter = String(row[col.appraiser] || '').trim();
    v.cycleStations = {
      knock: { days: toNum(row[col.knock.days]), wait: toNum(row[col.knock.wait]), man: String(row[col.knock.man] || '').trim() },
      patch: { days: toNum(row[col.patch.days]), wait: toNum(row[col.patch.wait]), man: String(row[col.patch.man] || '').trim() },
      squirt: { days: toNum(row[col.squirt.days]), wait: toNum(row[col.squirt.wait]), man: String(row[col.squirt.man] || '').trim() },
      assemble: { days: toNum(row[col.assemble.days]), wait: toNum(row[col.assemble.wait]), man: String(row[col.assemble.man] || '').trim() },
      polish: { days: toNum(row[col.polish.days]), wait: toNum(row[col.polish.wait]), man: String(row[col.polish.man] || '').trim() }
    };
  }

  // Merge B2/C1 data into status vehicles
  for (var vi = 0; vi < baseVehicles.length; vi++) {
    var v = baseVehicles[vi];
    var bKey = (v.branch === 'CNB' ? 'cnb' : v.branch === 'CSK' ? 'csk' : '') 
               ? (v.plate + '_' + (v.branch === 'CNB' ? 'cnb' : 'csk')) 
               : null;
    var bRow = bKey ? b2Data[bKey] : null;
    var cRow = bKey && !bRow ? c1Data[bKey] : null;
    if (bRow) {
      enrichFromRow(v, bRow, b2Col);
    } else if (cRow) {
      enrichFromRow(v, cRow, c1Col);
    }
  }
  return baseVehicles;
}

/* ═══ Debug helpers (moved from Code.gs) ═══ */
function dumpSheetList() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheets = ss.getSheets();
  var r = [];
  for (var i = 0; i < sheets.length; i++) r.push(sheets[i].getName() + ' (R:' + sheets[i].getLastRow() + ' C:' + sheets[i].getLastColumn() + ')');
  return ContentService.createTextOutput(r.join('\n'));
}

function dumpB3Cells() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('B3_สรุปสั้นการตรวจ FinalCheck');
  if (!sheet) return ContentService.createTextOutput('B3 not found');
  var data = sheet.getRange(1, 1, Math.min(65, sheet.getLastRow()), Math.min(25, sheet.getLastColumn())).getValues();
  var r = [];
  for (var row = 0; row < data.length; row++) {
    for (var c = 0; c < data[row].length; c++) {
      var v = data[row][c];
      if (v !== '' && v !== null && v !== undefined) r.push('R' + (row+1) + 'C' + (c+1) + ': ' + String(v).substring(0, 60));
    }
  }
  return ContentService.createTextOutput(r.join('\n'));
}
/* ═══ Count FinalCheck pass/fail directly from B3 per-vehicle data ═══ */
function countFCFromB3(ss, dateFrom, dateTo) {
  var sheet = ss.getSheetByName('B3_สรุปการตรวจ FinalCheck');
  if (!sheet) return null;
  
  // B3 uses R3C3 as month selector (e.g., 3=March, 5=May)
  // To get data for a specific month, write the month number to C3
  // This triggers the sheet's QUERY to filter by month
  var originalMonth = null;
  var targetMonth = null;
  
  if (dateFrom) {
    var dFrom = new Date(dateFrom);
    targetMonth = dFrom.getMonth() + 1; // JavaScript months are 0-based, Thai months are 1-based
  }
  
  if (targetMonth) {
    try {
      // Save original month value
      originalMonth = sheet.getRange(3, 3).getValue();
      // Only change if different from target
      if (originalMonth !== targetMonth) {
        sheet.getRange(3, 3).setValue(targetMonth);
        SpreadsheetApp.flush();
        Utilities.sleep(2000); // Wait for QUERY recalculation
      }
    } catch(e) {
      // If writing fails, continue with whatever data is available
    }
  }
  
  var lr = sheet.getLastRow();
  if (lr < 6) {
    // Restore original month if we changed it
    if (originalMonth !== null && originalMonth !== targetMonth) {
      try { sheet.getRange(3, 3).setValue(originalMonth); SpreadsheetApp.flush(); } catch(e) {}
    }
    return null;
  }
  var lc = sheet.getLastColumn();
  var data = sheet.getRange(1, 1, lr, lc).getValues();
  
  // Headers at R4: C3=ทะเบียน, C10=SUP QC, C11=SUP แก้ไขงาน, C12=รอส่งมอบPMG, C13=ส่งมอบให้PMGแล้ว
  // C14=วันแจ้งซ่อม, C15=นัดช่างแล้วเสร็จ, C16=นัดหมาย ส่งมอบ
  // Data starts R5, col indices (0-based): plate=2, supqc=9, supfix=10, waitpmg=11, delivered=12
  
  var totalInspected = 0, passCount = 0, failCount = 0;
  var causes = { assembly: 0, paint: 0, body: 0, polish: 0, cleaning: 0, other: 0 };
  var supQcCount = 0, supFixCount = 0, waitPmgCount = 0, deliveredCount = 0;
  var dateFromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
  var dateToTs = dateTo ? new Date(dateTo).getTime() + 86400000 : 9999999999999;
  
  for (var r = 4; r < data.length; r++) {
    var plate = String(data[r][2] || '').trim();
    if (!plate) continue;
    
    // Use นัดหมาย ส่งมอบ (col P = idx 15) as the primary date for FC counting
    // This is closer to the actual FinalCheck date than วันแจ้งซ่อม
    // Fallback: นัดช่างแล้วเสร็จ (col O = idx 14), then วันแจ้งซ่อม (col N = idx 13)
    var dateCell = data[r][15]; // C16 นัดหมาย ส่งมอบ (idx 15)
    if (!dateCell || !(dateCell instanceof Date)) {
      dateCell = data[r][14]; // C15 นัดช่างแล้วเสร็จ (idx 14)
    }
    if (!dateCell || !(dateCell instanceof Date)) {
      dateCell = data[r][13]; // C14 วันแจ้งซ่อม (idx 13)
    }
    var rowTs = (dateCell instanceof Date) ? dateCell.getTime() : 0;
    
    // Filter by date range if provided — skip rows with no date when filtering by date
    if (dateFrom && dateTo) {
      if (rowTs === 0) continue; // No date, can't determine if in range
      if (rowTs < dateFromTs || rowTs > dateToTs) continue;
    }
    
    var supQc = toNum(data[r][9]);    // SUP QC
    var supFix = toNum(data[r][10]);  // SUP แก้ไขงาน
    var waitPmg = toNum(data[r][11]); // รอส่งมอบPMG
    var delivered = toNum(data[r][12]); // ส่งมอบให้PMGแล้ว
    
    supQcCount += supQc;
    supFixCount += supFix;
    waitPmgCount += waitPmg;
    deliveredCount += delivered;
    
    // A car is "inspected" if it has any QC activity or delivery
    if (delivered > 0 || supQc > 0 || supFix > 0 || waitPmg > 0) {
      totalInspected++;
      if (delivered > 0) {
        passCount++;
      } else if (supFix > 0) {
        failCount++;
        // TODO: classify cause if available
      }
    }
  }
  
  // Restore original month value
  if (originalMonth !== null && originalMonth !== targetMonth) {
    try { sheet.getRange(3, 3).setValue(originalMonth); SpreadsheetApp.flush(); } catch(e) {}
  }
  
  return {
    total: totalInspected,
    pass: passCount,
    fail: failCount,
    passPct: totalInspected > 0 ? Math.round(passCount / totalInspected * 1000) / 10 : 0,
    failPct: totalInspected > 0 ? Math.round(failCount / totalInspected * 1000) / 10 : 0,
    supQcCount: supQcCount,
    supFixCount: supFixCount,
    waitPmgCount: waitPmgCount,
    deliveredCount: deliveredCount,
    computedFromB3: true,
    causes: {
      assembly: { count: causes.assembly, pct: totalInspected > 0 ? Math.round(causes.assembly / totalInspected * 1000) / 10 : 0 },
      paint: { count: causes.paint, pct: 0 },
      body: { count: causes.body, pct: 0 },
      polish: { count: causes.polish, pct: 0 },
      cleaning: { count: causes.cleaning, pct: 0 },
      other: { count: causes.other, pct: 0 }
    }
  };
}

/* ═══ Query FinalCheck directly from RDS database via BCT Library ═══
 * Uses the same BCT library that the spreadsheet's bound script uses.
 * This avoids the UrlFetchApp scope issue since the BCT library handles 
 * the database connection internally.
 */
function queryFCFromDB(dateFrom, dateTo) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19 FinalCheck2026'); // รายงาน FinalCheck2026
    if (!sheet) return null;
    
    // Skip writing trigger dates and BCT library call — 
    // BCT loadJSONQuery_lambda_datas doesn't actually refresh data (userinfo.email scope missing)
    // and the sleep adds 10+ seconds to every request.
    // Just read whatever data is already in the FC2026 sheet.
    var fcData = readFC2026Data(ss, dateFrom, dateTo);
    if (fcData && fcData.total > 0) {
      fcData.dataSource = 'FC2026-sheet';
      return fcData;
    }
    
    return { total: 0, pass: 0, fail: 0, bctError: bctError };
  } catch(e) {
    return null;
  }
}

/* ═══ Read FC2026 per-vehicle data by triggering QUERY with date range ═══ */
function readFC2026Data(ss, dateFrom, dateTo) {
  var sheet = ss.getSheetByName('\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19 FinalCheck2026'); // รายงาน FinalCheck2026
  if (!sheet) return null;
  
  try {
    // Write date trigger to force QUERY recalculation for the desired date range
    // The QUERY condition cells are likely in row 23 (ช่วงวันที่) 
    // Based on the sheet structure:
    // R23 C5 = start date, R23 C7 = end date
    var startDate = dateFrom ? new Date(dateFrom) : null;
    var endDate = dateTo ? new Date(dateTo) : null;
    
    if (startDate && endDate) {
      // Write trigger dates: start in E23, end in G23
      // (These cells hold the date range shown in ช่วงวันที่)
      // Actually the condition cells are likely E5/E7 or C23/E23
      // Based on dump: R23 C5=Fri May 15, C7=Fri May 15
      // But these are FORMULA results, not input cells
      // The actual input cells are in the condition area:
      // R18-R21 define the condition structure
      // Let's try writing to C5 area of row 5 or use the existing trigger approach
      
      // Write start date to a trigger cell and end date
      // Based on how B1/B2 triggers work, we write to specific cells
      // For FC2026, the QUERY likely references specific cells for start/end dates
      // Try: write startDate to E5 and endDate to G5 (or nearby condition cells)
      
      // The safest approach: write to the same cells that hold current date values
      // Skip writing trigger dates — QUERY/COUNTIFS formulas don't recalculate 
      // from programmatic writes, and we don't need to wait 3 seconds.
      // The FC2026 sheet data is read as-is (whatever BCT library last refreshed).
    }
    
    // Now read the FC data from the sheet
    var lr = sheet.getLastRow();
    var lc = sheet.getLastColumn();
    if (lr < 30 || lc < 30) return null; // Need at least header + data rows
    
    var data = sheet.getRange(1, 1, lr, lc).getValues();
    
    // Headers at R26/R29:
    // C5=ทะเบียนรถ, C30=สรุปภาพรวมการตรวจ (final_chk), C35=ประทับเวลา, C37=create_time
    // Data starts at R31 (after headers)
    // C30 values: ผ่าน, ไม่ผ่าน
    // C35 = FC inspection timestamp
    
    var totalFC = 0, passFC = 0, failFC = 0;
    var causeAssembly = 0, causePaint = 0, causeBody = 0, causePolish = 0, causeCleaning = 0, causeOther = 0;
    var tsFrom = startDate ? startDate.getTime() : 0;
    var tsTo = endDate ? endDate.getTime() + 86400000 : 9999999999999;
    
    for (var r = 30; r < data.length; r++) { // Data starts at row 31 (idx 30)
      var plate = String(data[r][4] || '').trim(); // C5 = ทะเบียนรถ (idx 4)
      if (!plate || plate === 'car_reg') continue; // Skip header row
      
      var finalChk = String(data[r][29] || '').trim(); // C30 = สรุปภาพรวมการตรวจ (idx 29)
      if (!finalChk) continue;
      
      // Filter by date: use ประทับเวลา (C35=idx34) or create_time (C37=idx36)
      var fcDate = data[r][34]; // C35 = ประทับเวลา (idx 34)
      if (!fcDate || !(fcDate instanceof Date)) {
        fcDate = data[r][36]; // C37 = create_time (idx 36)
      }
      
      if (dateFrom && dateTo && fcDate instanceof Date) {
        var fcTs = fcDate.getTime();
        if (fcTs < tsFrom || fcTs > tsTo) continue;
      }
      
      totalFC++;
      if (finalChk === '\u0E1C\u0E48\u0E32\u0E19' || finalChk.toLowerCase() === 'pass' || finalChk === '1') {
        passFC++;
      } else {
        failFC++;
        // Classify cause from C31 (สาเหตุไม่ผ่าน) idx 30
        var cause = String(data[r][30] || '').trim().toLowerCase();
        if (cause.indexOf('\u0E07\u0E32\u0E19\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A') >= 0 || cause.indexOf('\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A') >= 0) causeAssembly++;
        else if (cause.indexOf('\u0E07\u0E32\u0E19\u0E2A\u0E35') >= 0 || cause.indexOf('\u0E2A\u0E35') >= 0) causePaint++;
        else if (cause.indexOf('\u0E15\u0E31\u0E27\u0E16\u0E07') >= 0) causeBody++;
        else if (cause.indexOf('\u0E40\u0E01\u0E47\u0E1A') >= 0) causePolish++;
        else if (cause.indexOf('\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E30\u0E2D\u0E32\u0E14') >= 0) causeCleaning++;
        else causeOther++;
      }
    }
    
    if (totalFC === 0) return null;
    
    return {
      total: totalFC,
      pass: passFC,
      fail: failFC,
      passPct: totalFC > 0 ? Math.round(passFC / totalFC * 1000) / 10 : 0,
      failPct: totalFC > 0 ? Math.round(failFC / totalFC * 1000) / 10 : 0,
      computedFromFC2026: true,
      causes: {
        assembly: { count: causeAssembly, pct: totalFC > 0 ? Math.round(causeAssembly / totalFC * 1000) / 10 : 0 },
        paint: { count: causePaint, pct: totalFC > 0 ? Math.round(causePaint / totalFC * 1000) / 10 : 0 },
        body: { count: causeBody, pct: totalFC > 0 ? Math.round(causeBody / totalFC * 1000) / 10 : 0 },
        polish: { count: causePolish, pct: totalFC > 0 ? Math.round(causePolish / totalFC * 1000) / 10 : 0 },
        cleaning: { count: causeCleaning, pct: totalFC > 0 ? Math.round(causeCleaning / totalFC * 1000) / 10 : 0 },
        other: { count: causeOther, pct: totalFC > 0 ? Math.round(causeOther / totalFC * 1000) / 10 : 0 }
      }
    };
  } catch(e) {
    return null;
  }
}

/* ═══ BCT Glass Coating Data Reader ═══ */
/* ═══════════════════════════════════════════════════
   BCT Glass Coating System — Backend Functions
   ═══════════════════════════════════════════════════ */

// google.script.run callable entry point
function getBctData(action, params) {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  switch(action) {
    case 'listSheets': return bctListSheets_(ss);
    case 'getCustomers': return bctGetCustomers_(ss, params);
    case 'getMaintenance': return bctGetMaintenance_(ss, params);
    case 'getCalendar': return bctGetCalendar_(ss, params);
    case 'getQueue': return bctGetQueue_(ss, params);
    case 'getDashboard': return bctGetDashboard_(ss);
    case 'getCustomerByPlate': return bctGetCustomerByPlate_(ss, params);
    case 'getConfig': return bctGetConfig_(ss);
    case 'saveAppointment': return bctSaveAppointment_(ss, params);
    case 'saveMaintenanceNote': return bctSaveMaintNote_(ss, params);
    case 'sendNotification': return bctSendNotification_(params);
    case 'saveConfig': return bctSaveConfig_(params);
    case 'getConfigSettings': return bctGetConfigSettings_();
    case 'saveCustomer': return bctSaveCustomer_(ss, params);
    case 'saveQueue': return bctSaveQueue_(ss, params);
    case 'cleanC2Duplicates': return bctCleanC2Duplicates_();
    case 'debugCleanC2Duplicates': return debugCleanC2Duplicates_();
    case 'debugC2Headers': return bctDebugC2Headers_();
    case 'debugC2': return bctDebugC2();
    case 'debugB2NEW': return bctDebugB2NEW();
    case 'deleteBadRows': return bctDeleteRow_();
    case 'rollbackFKP184v2': return bctRollbackFKP184v2_();
    case 'rollbackFKP184': return bctRollbackFKP184_();
    case 'sendNotification': return bctSendNotification_(params);
    case 'createBookingForm': return bctCreateBookingForm_();
    case 'setupTriggers': return bctSetupTriggers_();
    case 'setupEditLogTriggers': return setupBillingEditTriggers_();
    case 'editLog': return getBillingEditLog_(params);
    case 'saveBillingSnapshot': return billingSaveAllSnapshots_();
    case 'setConfig': return bctSetConfig_(params);
    default: return {error: 'Unknown action: ' + action};
  }
}

// REST API endpoint handler (called via ?bct=1&action=...)
function handleBctRequest(p) {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  
  // If specific sheet requested, return raw data
  if (p.sheet) {
    var sheet = ss.getSheetByName(p.sheet);
    if (!sheet) return { error: 'Sheet not found: ' + p.sheet };
    var data = sheet.getDataRange().getValues();
    var formulas = sheet.getDataRange().getFormulas();
    return {
      name: sheet.getName(),
      totalRows: data.length,
      totalCols: data[0] ? data[0].length : 0,
      headers: data.slice(0, 10).map(function(row, ri) {
        return row.map(function(cell, i) {
          var f = formulas[ri] ? formulas[ri][i] : '';
          return { value: cell instanceof Date ? cell.toISOString() : String(cell), formula: f || '' };
        });
      }),
      data: data.map(function(row) {
        return row.map(function(cell) {
          if (cell instanceof Date) return cell.toISOString();
          return String(cell);
        });
      })
    };
  }
  
  // If action requested, delegate to getBctData
  if (p.action) {
    return getBctData(p.action, p);
  }
  
  // Default: list all sheets
  return bctListSheets_(ss);
}

/* ─── List sheets ─── */
function bctListSheets_(ss) {
  var sheets = ss.getSheets();
  return sheets.map(function(s) {
    return {name: s.getName(), sheetId: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn()};
  });
}

/* ─── Get B1 customers ─── */
function bctGetCustomers_(ss, params) {
  var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  if (!sheet) return {error: 'Sheet not found'};
  var data = sheet.getDataRange().getValues();
  var result = [];
  var startRow = params && params.startRow ? params.startRow : 6;
  var maxRows = params && params.maxRows ? parseInt(params.maxRows) : 200;
  
  // Pre-load B2NEW maintenance data for customer maintenance info
  var maintMap = bctBuildMaintenanceMap_(ss);
  
  for (var i = startRow; i < Math.min(data.length, startRow + maxRows); i++) {
    var row = data[i];
    if (!row[4] && !row[7]) continue;
    var plate = String(row[7] || '').toUpperCase().replace(/\s/g, '');
    var maintInfo = maintMap[plate] || null;
    
    result.push({
      row: i + 1, status: String(row[0] || ''), order: row[1],
      date: bctFmtDate_(row[2]), receiver: row[3], name: bctMaskName_(row[4]),
      address: bctMaskAddress_(row[5]), phone: bctMaskPhone_(row[6]), plate: String(row[7] || ''),
      brand: row[8], model: row[9], carType: row[10],
      coatingType: row[11], channel: row[12], member: row[13],
      mr: row[14], price: row[15],
      appointmentDate: bctFmtDate_(row[25]),
      realDeliverDate: bctFmtDate_(row[31]),
      summary: row[27], closeReason: row[28],
      lineGroup: maintInfo ? (maintInfo.lineGroup || '') : '',
      maintenanceNote: maintInfo ? (maintInfo.maintenanceNote || '') : '',
      maintenance: maintInfo ? { services: maintInfo.services, nextDueDate: maintInfo.nextDueDate, nextDueCycle: maintInfo.nextDueCycle, maintenanceNote: maintInfo.maintenanceNote || '' } : null,
      _realName: row[4], _realPhone: row[6], _realAddress: row[5]
    });
  }
  return {total: result.length, customers: result};
}

/* ─── Helper: Build B2NEW plate→maintenance map ─── */
function bctBuildMaintenanceMap_(ss) {
  var sheet = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    if (!row[1] && !row[2]) continue;
    var plate = String(row[1] || '').toUpperCase().replace(/\s/g, '');
    if (!plate) continue;
    var services = [];
    for (var s = 0; s < 9; s++) {
      var baseCol = 26 + (s * 6);
      var dueDate = row[baseCol];
      var maintenanceDate = row[baseCol + 5];
      var callStatus = row[baseCol + 3];
      var callDate = row[baseCol + 1] ? bctFmtDate_(row[baseCol + 1]) : '';
      if (dueDate || maintenanceDate) {
        services.push({
          cycle: s + 1,
          dueDate: dueDate ? bctFmtDate_(dueDate) : '',
          callDate: callDate,
          maintenanceDate: maintenanceDate ? bctFmtDate_(maintenanceDate) : '',
          callStatus: String(callStatus || '')
        });
      }
    }
    var nextDueDate = '';
    var nextDueCycle = 0;
    for (var s2 = 0; s2 < services.length; s2++) {
      if (services[s2].dueDate && !services[s2].maintenanceDate) {
        if (services[s2].callStatus !== 'เข้าใช้บริการแล้ว') {
          nextDueDate = services[s2].dueDate;
          nextDueCycle = services[s2].cycle;
          break;
        }
      }
    }
    // Check col 26 for "ไม่แถมบำรุงผิวแก้ว" note
    var col26Val = String(row[26] || '').trim();
    var maintenanceNote = '';
    if (col26Val.indexOf('ไม่แถม') >= 0) maintenanceNote = col26Val;
    map[plate] = { services: services, nextDueDate: nextDueDate, nextDueCycle: nextDueCycle, lineGroup: String(row[94] || ''), maintenanceNote: maintenanceNote };
  }
  return map;
}

/* ─── Get B2_แจ้งเตือนครบบำรุง maintenance data (CURRENT, with formulas) ─── */
/* B2 structure (row 3 = headers, row 8+ = data):
   Col 0=สถานะ, 1=รหัส, 2=ทะเบียน, 3=ชื่อ, 4=ที่อยู่, 5=เบอร์, 6=ยี่ห้อ, 7=รุ่น, 8=ประเภทรถ, 9=เคลือบแก้ว, 10=ช่องทาง, 11=สมาชิก, 12=MR,
   Col 13=นัดเข้าทำ, 14=นัดส่งมอบ, 15=วันรับจริง, 16=ผู้รับ, 17=รายได้, 18=ต้นทุน, 19=MRเงินรางวัล, 20=ของแถม, 21=กำไร,
   Col 22=วันส่งมอบจริง, 23=ผู้ส่ง, 24=เลขใบเสร็จ, 25=วันออกใบเสร็จ, 26=ผู้ออก
   SERVICE cycles start at col 27, each 6 cols: วันครบกำหนด, วันที่โทร, ผู้โทร, สถานะการติดต่อ, รายละเอียด, วันเข้าบำรุง
   Col 27(S1-due), 28(S1-call), 29(S1-caller), 30(S1-status), 31(S1-detail), 32(S1-maint)
   Col 33(S2-due), ...38(S2-maint)   Col 39(S3-due), ...44(S3-maint)   up to Col 80(S9-maint)
*/

function normPlateGS_(p) {
  p = String(p||'').trim().toUpperCase();
  // Remove province suffixes
  p = p.replace(/\s*(จบ|กทม|กท|ฯลฯ|ทัน|เลข|ที่|รย\.)\s*$/gi, '');
  p = p.replace(/\s*\.+\s*$/g, ''); // trailing dots
  p = p.replace(/\s+/g, ''); // all spaces
  // Remove (ป้ายแดง) etc
  p = p.replace(/\s*\([^)]*\)/g, '');
  // Normalize hyphens — Thai plates often have inconsistent hyphen/space usage
  // e.g., "3ขง-2250 กท" and "3ขง2250" should match
  p = p.replace(/[-]+/g, '');
  return p;
}

function bctGetMaintenance_(ss, params) {
  // Read from B2_แจ้งเตือนครบบำรุง (current data with formulas)
  var sheet = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
  if (!sheet) return {error: 'Sheet B2_แจ้งเตือนครบบำรุง not found'};
  var data = sheet.getDataRange().getValues();
  
  // ALSO read แจ้งเตือนบำรุงผิวแก้วNEW! for cross-reference (alert status, queue appointments)
  var sheet2 = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
  var b2newData = sheet2 ? sheet2.getDataRange().getValues() : [];
  // Build lookup: normPlate → {alertCycles, queueDates}
  var b2newMap = {};
  for (var bi = 4; bi < b2newData.length; bi++) {
    var brow = b2newData[bi];
    var bplate = String(brow[1]||'').trim();
    if (!bplate) continue;
    var key = normPlateGS_(bplate);
    var bCycles = [];
    for (var bs = 0; bs < 9; bs++) {
      var bbc = 26 + (bs * 6);
      var bDue = brow[bbc] ? new Date(brow[bbc]) : null;
      var bCallDate = brow[bbc+1] ? bctFmtDate_(brow[bbc+1]) : '';
      var bCaller = String(brow[bbc+2]||'');
      var bStatus = String(brow[bbc+3]||'');
      var bDetail = String(brow[bbc+4]||'');
      var bMaint = brow[bbc+5] ? bctFmtDate_(brow[bbc+5]) : '';
      if (bDue && (isNaN(bDue.getTime()) || bDue < new Date('2000-01-01'))) bDue = null;
      bCycles.push({dueDate: bDue ? bctFmtDate_(bDue) : '', callDate: bCallDate, caller: bCaller, alertStatus: bStatus, detail: bDetail, maintDate: bMaint});
    }
    // col AA (idx 26): "ไม่แถมบำรุงผิวแก้ว" = no free maintenance, Date = SERVICE 1 due (has maintenance), empty = no data
    var colAA = brow[26];
    var maintNoteStr = '';
    if (typeof colAA === 'string' && colAA.indexOf('ไม่แถม') >= 0) {
      maintNoteStr = colAA.trim();
    } else if (colAA instanceof Date && !isNaN(colAA.getTime())) {
      // This is a SERVICE 1 due date (has free maintenance) — not a note
      maintNoteStr = '';
    } else {
      maintNoteStr = String(colAA||'').trim();
      // If it looks like a date string, clear it (not a note)
      if (maintNoteStr && maintNoteStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) maintNoteStr = '';
    }
    b2newMap[key] = {cycles: bCycles, lineGroup: String(brow[93]||''), maintenanceNote: maintNoteStr};
  }
  
  // Read C2_จองคิว for queue appointments cross-reference
  var c2sheet = ss.getSheetByName('C2_จองคิว');
  var c2appointments = [];
  if (c2sheet) {
    var c2data = c2sheet.getDataRange().getValues();
    // Quick scan for plate references in C2 data cells
    for (var ci = 0; ci < c2data.length; ci++) {
      for (var cj = 0; cj < c2data[ci].length; cj++) {
        var cv = String(c2data[ci][cj]||'').trim();
        if (cv && cv.length > 5) c2appointments.push(cv);
      }
    }
  }
  var result = [];
  var maxRows = params && params.maxRows ? parseInt(params.maxRows) : 500;
  var upcomingOnly = params && (params.upcoming === '1' || params.upcoming === true);
  var today = new Date();
  
  // B2 data starts at row index 8 (row 9 in sheet) after 8 header rows
  // But scan from row 8 and look for plates
  for (var i = 8; i < Math.min(data.length, 8 + maxRows); i++) {
    var row = data[i];
    if (!row[2]) continue; // no plate
    
    var plate = String(row[2] || '').trim();
    if (!plate || plate.indexOf('หากต้องการ') >= 0) continue;
    var nextDueDate = null;
    var nextDueCycle = 0;
    var lastContactStatus = '';
    
    // Parse up to 9 service cycles — B2 cycles start at col 27, each 6 cols
    // Col 27(S1-due),28(S1-call),29(S1-caller),30(S1-status),31(S1-detail),32(S1-maint)
    // Col 33(S2-due)...
    var b2newInfo = b2newMap[normPlateGS_(plate)];
    for (var s = 0; s < 9; s++) {
      var baseCol = 27 + (s * 6);
      var dueDate = row[baseCol];
      var maintenanceDate = row[baseCol + 5];
      
      if (dueDate && !maintenanceDate) {
        var dd = new Date(dueDate);
        if (!nextDueDate || dd < nextDueDate) {
          nextDueDate = dd;
          nextDueCycle = s + 1;
        }
      }
      // Always read contact status from ALL cycles (not just pending ones)
      // This ensures we capture "นัดหมายแล้ว", "แจ้งเตือนแล้ว" etc. even from completed cycles
      var csAll = String(row[baseCol + 3] || '');
      if (!csAll && b2newInfo && b2newInfo.cycles && b2newInfo.cycles[s]) {
        csAll = b2newInfo.cycles[s].alertStatus || '';
      }
      if (csAll) lastContactStatus = csAll;
    }
    
    // Filter out Excel epoch bug dates (1899-1900)
    if (nextDueDate && nextDueDate < new Date('2000-01-01')) {
      nextDueDate = null; nextDueCycle = 0;
    }
    
    if (upcomingOnly && !nextDueDate) continue;
    // For upcoming: show due within 90 days (future + slightly overdue)
    if (upcomingOnly && nextDueDate) {
      var daysDiff = (nextDueDate - today) / (1000*60*60*24);
      if (daysDiff > 90) continue; // Too far in the future
    }
    
    // Skip customers with "ไม่แถมบำรุงผิวแก้ว" - they don't qualify for maintenance
    var b2newInfo2 = b2newMap[normPlateGS_(plate)];
    var maintNote2 = b2newInfo2 ? b2newInfo2.maintenanceNote : '';
    if (maintNote2 && maintNote2.indexOf('ไม่แถม') >= 0) {
      if (upcomingOnly) continue; // Skip from alerts/dashboard entirely
      // For full list: still include but mark clearly
    }
    
    // Determine status
    var status = 'unknown';
    if (nextDueDate) {
      var daysUntilDue = (nextDueDate - today) / (1000*60*60*24);
      if (daysUntilDue < -7) {
        status = 'overdue';
      } else if (daysUntilDue <= 7) {
        status = 'upcoming';
      } else {
        status = 'scheduled';
      }
    } else {
      // No due date = all maintenance done
      status = 'done';
    }
    
    // Collect all cycles data for detailed view
    var cycles = [];
    for (var s2 = 0; s2 < 9; s2++) {
      var bc = 27 + (s2 * 6);
      var cycDueDate = row[bc] ? new Date(row[bc]) : null;
      var cycContactPerson = row[bc + 2] ? String(row[bc + 2]) : '';
      var cycContactStatus = row[bc + 3] ? String(row[bc + 3]) : '';
      var cycCallDate = row[bc + 1] ? bctFmtDate_(row[bc + 1]) : '';
      var cycMaintenanceDate = row[bc + 5] ? new Date(row[bc + 5]) : null;
      // Merge B2NEW alert status if B2 contact status is empty
      if (!cycContactStatus && b2newInfo && b2newInfo.cycles && b2newInfo.cycles[s2]) {
        var alertCyc = b2newInfo.cycles[s2];
        cycContactStatus = alertCyc.alertStatus || '';
        if (!cycContactPerson && alertCyc.caller) cycContactPerson = alertCyc.caller;
        if (!cycCallDate && alertCyc.callDate) cycCallDate = alertCyc.callDate;
      }
      // Filter out invalid/Excel epoch dates
      if (cycDueDate && (isNaN(cycDueDate.getTime()) || cycDueDate < new Date('2000-01-01'))) cycDueDate = null;
      if (cycMaintenanceDate && (isNaN(cycMaintenanceDate.getTime()) || cycMaintenanceDate < new Date('2000-01-01'))) cycMaintenanceDate = null;
      // Skip empty cycles
      if (!cycDueDate && !cycMaintenanceDate) continue;
      var cycStatus = 'pending';
      if (cycMaintenanceDate) cycStatus = 'done';
      else if (cycDueDate) {
        var cycDaysUntil = (cycDueDate - today) / (1000*60*60*24);
        if (cycDaysUntil < -7) cycStatus = 'overdue';
        else if (cycDaysUntil <= 7) cycStatus = 'upcoming';
        else cycStatus = 'due';
      }
      cycles.push({
        cycle: s2 + 1,
        dueDate: cycDueDate ? bctFmtDate_(cycDueDate) : '',
        maintenanceDate: cycMaintenanceDate ? bctFmtDate_(cycMaintenanceDate) : '',
        callDate: cycCallDate,
        contactPerson: cycContactPerson,
        contactStatus: cycContactStatus,
        status: cycStatus
      });
    }
    
    // Cross-reference with B2NEW (alert status) and C2 (queue)
    var np = normPlateGS_(plate);
    var b2newInfo = b2newMap[np] || null;
    var alertCycles = b2newInfo ? b2newInfo.cycles : [];
    // Check if this plate appears in C2 queue
    var queueAppts = [];
    for (var qi = 0; qi < c2appointments.length; qi++) {
      if (c2appointments[qi].indexOf(plate) >= 0 || c2appointments[qi].indexOf(np) >= 0) {
        queueAppts.push(c2appointments[qi].substring(0, 80));
      }
    }
    
    result.push({
      row: i + 1, code: row[1], plate: plate, name: bctMaskName_(row[3]),
      address: bctMaskAddress_(row[4]), phone: bctMaskPhone_(row[5]), brand: row[6], model: row[7],
      carType: row[8], coatingType: row[9], channel: row[10],
      member: row[11], mr: row[12],
      appointmentDate: bctFmtDate_(row[13]),
      deliverDate: bctFmtDate_(row[14]),
      realDeliverDate: bctFmtDate_(row[22]),
      nextDueDate: bctFmtDate_(nextDueDate),
      nextDueCycle: nextDueCycle,
      status: status,
      lastContactStatus: lastContactStatus,
      maintenanceNote: (b2newInfo && b2newInfo.maintenanceNote) ? b2newInfo.maintenanceNote : '',
      lineGroup: (b2newInfo && b2newInfo.lineGroup) ? b2newInfo.lineGroup : (row[94] || ''),
      income: row[17], cost: row[18], profit: row[21],
      cycles: cycles,
      alertCycles: alertCycles,
      queueAppointments: queueAppts
    });
  }
  return {total: result.length, maintenance: result};
}

/* ─── Get Calendar events ─── */
function bctGetCalendar_(ss, params) {
  var events = [];
  
  // 1. Read B2 (maintenance tracking) for maintenance due/done + B2 appointments
  var sheet = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    
    // Build ไม่แถมบำรุงผิวแก้ว lookup from B2NEW
    var sheetB2NEW = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
    var b2newM = {};
    if (sheetB2NEW) {
      var b2nd = sheetB2NEW.getDataRange().getValues();
      for (var ni = 4; ni < b2nd.length; ni++) {
        var nplate = String(b2nd[ni][1]||'').trim();
        if (!nplate) continue;
        b2newM[normPlateGS_(nplate)] = String(b2nd[ni][26]||'');
      }
    }
    
    for (var i = 8; i < data.length; i++) {
      var row = data[i];
      if (!row[2]) continue;
      var plate = String(row[2] || '').trim();
      if (!plate || plate.indexOf('หากต้องการ') >= 0) continue;
      var name = String(row[3] || '');
      var coatingType = String(row[9] || '');
      var skipMaint = (b2newM[normPlateGS_(plate)] || '').indexOf('ไม่แถม') >= 0;
      
      // Appointment date (col 13=นัดเข้าทำ)
      if (row[13]) {
        events.push({type:'coating_appointment', title:'เคลือบแก้ว: '+plate, plate:plate, name:bctMaskName_(name), date:bctFmtDate_(row[13]), coatingType:coatingType, phone:bctMaskPhone_(row[5]), lineGroup:row[94]||''});
      }
      // Deliver date (col 14=นัดส่งมอบ)
      if (row[14]) {
        events.push({type:'deliver_car', title:'ส่งมอบรถ: '+plate, plate:plate, name:bctMaskName_(name), date:bctFmtDate_(row[14]), phone:bctMaskPhone_(row[5])});
      }
      // Real deliver date (col 22=วันส่งมอบจริง)
      if (row[22]) {
        events.push({type:'real_deliver', title:'ส่งมอบจริง: '+plate, plate:plate, name:bctMaskName_(name), date:bctFmtDate_(row[22]), phone:bctMaskPhone_(row[5])});
      }
      // Maintenance due dates — B2 cycles start col 27, each 6 cols
      // Skip ไม่แถมบำรุงผิวแก้ว
      if (!skipMaint) {
        for (var s = 0; s < 9; s++) {
          var baseCol = 27 + (s * 6);
          var dueDate = row[baseCol];
          var maintenanceDate = row[baseCol + 5];
          if (dueDate && !maintenanceDate) {
            var dd = new Date(dueDate);
            if (dd > new Date('2020-01-01')) {
              events.push({type:'maintenance_due', title:'บำรุง ครั้งที่ '+(s+1)+': '+plate, plate:plate, name:bctMaskName_(name), date:bctFmtDate_(dueDate), coatingType:coatingType, cycle:s+1, phone:bctMaskPhone_(row[5]), lineGroup:row[94]||''});
            }
          }
          if (maintenanceDate) {
            var md = new Date(maintenanceDate);
            if (md > new Date('2020-01-01')) {
              events.push({type:'maintenance_done', title:'บำรุงเสร็จ ครั้งที่ '+(s+1)+': '+plate, plate:plate, name:bctMaskName_(name), date:bctFmtDate_(maintenanceDate), coatingType:coatingType, cycle:s+1});
            }
          }
        }
      }
    }
  }
  
  // 2. Read B1 (coating appointments) — col Z (index 25) = appointment date
  var b1 = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  if (b1) {
    var b1data = b1.getDataRange().getValues();
    for (var bi = 6; bi < b1data.length; bi++) {
      var b1row = b1data[bi];
      if (!b1row[4] && !b1row[7]) continue; // no name/plate
      var b1plate = String(b1row[7] || '').trim();
      var b1name = String(b1row[4] || '');
      var b1phone = String(b1row[6] || '');
      var b1coating = String(b1row[11] || ''); // coating type
      // col 25 (0-indexed) = appointment date (col Z = col 26 in 1-indexed)
      var b1aptDate = b1row[25];
      if (b1aptDate && b1plate) {
        // Check if this appointment date is already in events from B2
        var b1dateStr = bctFmtDate_(b1aptDate);
        var alreadyInB2 = false;
        for (var ei = 0; ei < events.length; ei++) {
          if (events[ei].plate && normPlateGS_(events[ei].plate) === normPlateGS_(b1plate) 
              && events[ei].date === b1dateStr 
              && events[ei].type === 'coating_appointment') {
            alreadyInB2 = true;
            break;
          }
        }
        if (!alreadyInB2) {
          events.push({type:'coating_appointment', title:'เคลือบแก้ว: '+b1plate, plate:b1plate, name:bctMaskName_(b1name), date:b1dateStr, coatingType:b1coating, phone:bctMaskPhone_(b1phone)});
        }
      }
      // col 24 (0-indexed) = นัดส่งมอบ
      var b1deliverDate = b1row[24];
      if (b1deliverDate && b1plate) {
        var b1delStr = bctFmtDate_(b1deliverDate);
        events.push({type:'deliver_car', title:'ส่งมอบรถ: '+b1plate, plate:b1plate, name:bctMaskName_(b1name), date:b1delStr, phone:bctMaskPhone_(b1phone)});
      }
    }
  }
  
  // 3. Read C2 queue data via getQueue and convert to calendar events
  var queueResult = bctGetQueue_(ss, {});
  if (queueResult && queueResult.weeks) {
    var existingPlateDates = {};
    for (var ei2 = 0; ei2 < events.length; ei2++) {
      var evKey = normPlateGS_(events[ei2].plate || '') + '|' + events[ei2].date + '|' + events[ei2].type;
      existingPlateDates[evKey] = true;
    }
    queueResult.weeks.forEach(function(wk) {
      var dates = wk.dates || {};
      ['queue1','queue2','special'].forEach(function(qKey) {
        var qData = wk[qKey] || {};
        Object.keys(qData).forEach(function(dayName) {
          var text = String(qData[dayName] || '').trim();
          if (!text) return;
          var dateStr = dates[dayName];
          if (!dateStr) return;
          // Parse Thai date DD/MM/YYYY to YYYY-MM-DD
          var dm = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!dm) return;
          var c2Day = parseInt(dm[1]);
          var c2Month = parseInt(dm[2]);
          var c2Year = parseInt(dm[3]) - 543;
          var isoDate = c2Year + '-' + (c2Month < 10 ? '0' : '') + c2Month + '-' + (c2Day < 10 ? '0' : '') + c2Day;
          // Format for display: DD/MM/YYYY (CE)
          var displayDate = (c2Day < 10 ? '0' : '') + c2Day + '/' + (c2Month < 10 ? '0' : '') + c2Month + '/' + c2Year;
          // Extract plates from multi-line queue text (may contain multiple entries separated by newlines)
          var lines = text.split(/\n/);
          lines.forEach(function(line) {
            var lineText = line.trim();
            if (!lineText) return;
            // Extract plate number
            var pMatch = lineText.match(/(\d[^\s\/]*?(?:ขง|กง|งก|ทส|นน|บม|ขม|ชน|นค|คร|รง|ขฬ|ขฉ|กล|ผค|ผก|กว|ก-|FF|FG|FM|FN|F[KSZ])\S*)/);
            if (pMatch) {
              var qPlate = pMatch[1].replace(/[,\s].*$/, '').trim();
              var qType = lineText.indexOf('[บำรุง]') >= 0 ? 'maintenance_appointment' : 
                          lineText.indexOf('บำรุง') >= 0 && lineText.indexOf('บำรุง') > lineText.indexOf(pMatch[1]) ? 'maintenance_appointment' : 'coating_appointment';
              var dedupKey = normPlateGS_(qPlate) + '|' + displayDate + '|' + qType;
              if (!existingPlateDates[dedupKey]) {
                existingPlateDates[dedupKey] = true;
                events.push({
                  type: qType,
                  title: (qType === 'maintenance_appointment' ? 'นัดบำรุง: ' : 'นัดเคลือบ: ') + qPlate,
                  plate: qPlate,
                  date: displayDate,
                  source: 'C2_จองคิว',
                  queueType: qKey
                });
              }
            }
          });
        });
      });
    });
  }
  
  events.sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  return {total: events.length, events: events};
}

/* ─── Get Queue ─── */
/* ─── Get Queue (C2_จองคิว) - multi-month weekly calendar ─── */
/* C2 layout: Multiple months in one sheet. Each month starts with a header row.
   Month header at col 4: "มกราคม 2026", "กุมภาพันธ์ 2026", etc.
   Within each month: weekly blocks with date numbers → queue slots.
   Each day = 2 cols: label col (คิว N HH.00 น. / dates), data col (customer info)
*/
function bctGetQueue_(ss, params) {
  var sheet = ss.getSheetByName('C2_จองคิว');
  if (!sheet) return {error: 'Sheet not found'};
  var data = sheet.getDataRange().getValues();
  var result = {month: '', weeks: []};
  
  // C2 layout (0-indexed):
  // Each week has 3 rows:
  //   Row 1: Date numbers in cols 4,6,8,10,12,14 (Mon-Sat) — data cols 5,7,9,11,13,15 empty
  //   Row 2: คิว 1 9.00 น. : in cols 4,6,8,10,12,14 — queue1 data in cols 5,7,9,11,13,15
  //   Row 3: คิว 2 13.00 น. : in cols 4,6,8,10,12,14 — queue2 data in cols 5,7,9,11,13,15
  // Sometimes: Row 4: พิเศษ row
  
  var thaiMonths = {'มกราคม':0,'กุมภาพันธ์':1,'มีนาคม':2,'เมษายน':3,'พฤษภาคม':4,'มิถุนายน':5,
    'กรกฎาคม':6,'สิงหาคม':7,'กันยายน':8,'ตุลาคม':9,'พฤศจิกายน':10,'ธันวาคม':11};
  
  var calMonth = new Date().getMonth();
  var calYear = new Date().getFullYear();
  result.month = '';
  
  // Helper: format day number with current month/year context
  function fmtDate(day, monthOverride, yearOverride) {
    if (!day) return '';
    var m = monthOverride !== undefined ? monthOverride : calMonth;
    var y = yearOverride !== undefined ? yearOverride : calYear;
    var d = parseInt(String(day), 10);
    if (isNaN(d) || d < 1 || d > 31) return String(day);
    var thaiYear = y + 543;
    return (d < 10 ? '0' : '') + d + '/' + (m < 9 ? '0' : '') + (m + 1) + '/' + thaiYear;
  }
  
  // Helper: check if cell is a date number (1-31)
  function isDateNum(val) {
    if (typeof val === 'number' && val >= 1 && val <= 31) return true;
    if (val instanceof Date) return true;
    var s = String(val).trim();
    if (/^\d+$/.test(s) && parseInt(s) >= 1 && parseInt(s) <= 31) return true;
    return false;
  }
  
  var i = 0;
  while (i < data.length) {
    var row = data[i];
    var colE = String(row[4] || '').trim();
    
    // Check for month header
    var isMonthHeader = false;
    for (var m in thaiMonths) {
      if (colE.indexOf(m) === 0) {
        var yearMatch = colE.match(/(\d{4})/);
        if (yearMatch) {
          var parsedYear = parseInt(yearMatch[1]);
          if (parsedYear > 2500) parsedYear -= 543;
          calMonth = thaiMonths[m];
          calYear = parsedYear;
        }
        if (!result.month) result.month = colE;
        isMonthHeader = true;
        break;
      }
    }
    if (isMonthHeader) { i++; continue; }
    
    // Skip day-name rows
    if (colE === 'Monday' || colE === 'Tuesday' || colE === 'Wednesday' || 
        colE === 'Thursday' || colE === 'Friday' || colE === 'Saturday') {
      i++; continue;
    }
    
    // Check if this is a date row (start of a week block)
    if (isDateNum(row[4])) {
      // Read date numbers and format them
      var week = {
        dates: {
          mon: fmtDate(row[4]), tue: fmtDate(row[6]), wed: fmtDate(row[8]),
          thu: fmtDate(row[10]), fri: fmtDate(row[12]), sat: fmtDate(row[14])
        },
        queue1: {mon:'', tue:'', wed:'', thu:'', fri:'', sat:''},
        queue2: {mon:'', tue:'', wed:'', thu:'', fri:'', sat:''},
        special: {mon:'', tue:'', wed:'', thu:'', fri:'', sat:''}
      };
      
      // Also read queue1 data from the date row itself (some formats put data here)
      var dayKeys = ['mon','tue','wed','thu','fri','sat'];
      var dataCols = [5, 7, 9, 11, 13, 15];
      for (var dc = 0; dc < 6; dc++) {
        var val = String(row[dataCols[dc]] || '').trim();
        if (val && val.indexOf('คิว') < 0) {
          week.queue1[dayKeys[dc]] = val;
        }
      }
      
      i++;
      
      // Read following rows for คิว 1, คิว 2, พิเศษ
      while (i < data.length) {
        var nextRow = data[i];
        var nextE = String(nextRow[4] || '').trim();
        
        // If next row is a date row or month header, break
        if (isDateNum(nextRow[4]) || !nextE) { break; }
        
        var isNextMonth = false;
        for (var nm in thaiMonths) {
          if (nextE.indexOf(nm) === 0) { isNextMonth = true; break; }
        }
        if (nextE === 'Monday' || nextE === 'Tuesday' || nextE === 'Wednesday' || 
            nextE === 'Thursday' || nextE === 'Friday' || nextE === 'Saturday') {
          isNextMonth = true;
        }
        if (isNextMonth) break;
        
        // คิว 1 row
        if (nextE.indexOf('คิว 1') >= 0 || nextE.indexOf('09:00') >= 0 || nextE.indexOf('9:00') >= 0) {
          for (var q1c = 0; q1c < 6; q1c++) {
            var q1val = String(nextRow[dataCols[q1c]] || '').trim();
            if (q1val) {
              // Strip queue label if present in data cell
              q1val = q1val.replace(/^คิว\s*\d+\s*\d+[.:]\d+\s*น\.?\s*:?\s*/, '').trim();
              if (q1val) week.queue1[dayKeys[q1c]] = week.queue1[dayKeys[q1c]] ? week.queue1[dayKeys[q1c]] + ' / ' + q1val : q1val;
            }
          }
          i++;
          continue;
        }
        
        // คิว 2 row
        if (nextE.indexOf('คิว 2') >= 0 || nextE.indexOf('13:00') >= 0) {
          for (var q2c = 0; q2c < 6; q2c++) {
            var q2val = String(nextRow[dataCols[q2c]] || '').trim();
            if (q2val) {
              q2val = q2val.replace(/^คิว\s*\d+\s*\d+[.:]\d+\s*น\.?\s*:?\s*/, '').trim();
              if (q2val) week.queue2[dayKeys[q2c]] = q2val;
            }
          }
          i++;
          continue;
        }
        
        // พิเศษ row
        if (nextE.indexOf('พิเศษ') >= 0 || nextE.indexOf('เช้ารับเย็น') >= 0) {
          for (var spc = 0; spc < 6; spc++) {
            var spval = String(nextRow[dataCols[spc]] || '').trim();
            if (spval) week.special[dayKeys[spc]] = spval;
          }
          i++;
          continue;
        }
        
        // Unknown row with data — treat as additional queue1 data
        var hasData = false;
        for (var uc = 0; uc < 6; uc++) {
          var uval = String(nextRow[dataCols[uc]] || '').trim();
          if (uval) {
            if (week.queue1[dayKeys[uc]]) {
              week.queue1[dayKeys[uc]] += ' / ' + uval;
            } else {
              week.queue1[dayKeys[uc]] = uval;
            }
            hasData = true;
          }
        }
        if (!hasData) break; // Empty row = end of week block
        i++;
      }
      
      result.weeks.push(week);
    } else {
      i++;
    }
  }
  
  return result;
}

/* ─── Get Dashboard ─── */
function bctGetDashboard_(ss) {
  var b1 = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  var b2n = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
  
  var r = {
    customers: {total:0, closed:0, open:0, newCar:0, usedCar:0},
    maintenance: {total:0, upcoming:0, overdue:0, done:0},
    coating: {spray1y:0, spray3y:0, diamond:0},
    revenue: {total:0, cost:0, profit:0}
  };
  
  if (b1) {
    var d = b1.getDataRange().getValues();
    for (var i = 6; i < d.length; i++) {
      if (!d[i][4] && !d[i][7]) continue;
      r.customers.total++;
      var st = String(d[i][0]||'');
      if (st.indexOf('ปิดได้')>=0) r.customers.closed++; else r.customers.open++;
      var ct = String(d[i][10]||'');
      if (ct.indexOf('รถใหม่')>=0) r.customers.newCar++; else r.customers.usedCar++;
      var c = String(d[i][11]||'');
      if (c.indexOf('พ่น 1')>=0) r.coating.spray1y++;
      else if (c.indexOf('พ่น 3')>=0) r.coating.spray3y++;
      else if (c.indexOf('Diamond')>=0||c.indexOf('ไดมอน')>=0) r.coating.diamond++;
    }
  }
  
  if (b2n) {
    var d = b2n.getDataRange().getValues();
    // Also read B2NEW to check "ไม่แถมบำรุงผิวแก้ว"
    var sheetB2NEW = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
    var b2newM = {};
    if (sheetB2NEW) {
      var b2nd = sheetB2NEW.getDataRange().getValues();
      for (var ni = 4; ni < b2nd.length; ni++) {
        var nplate = String(b2nd[ni][1]||'').trim();
        if (!nplate) continue;
        b2newM[normPlateGS_(nplate)] = String(b2nd[ni][26]||'');
      }
    }
    var today = new Date();
    for (var i = 8; i < d.length; i++) {
      if (!d[i][2]) continue;
      var plate = String(d[i][2]||'').trim();
      if (!plate || plate.indexOf('หากต้องการ')>=0) continue;
      // Skip ไม่แถมบำรุงผิวแก้ว
      var mnote = b2newM[normPlateGS_(plate)] || '';
      var skipMaint = mnote.indexOf('ไม่แถม') >= 0;
      r.maintenance.total++;
      if (skipMaint) continue; // Don't count towards upcoming/overdue/done
      for (var s = 0; s < 9; s++) {
        var bc = 27 + (s * 6);
        var due = d[i][bc]; var done = d[i][bc+5];
        if (due && !done) {
          var dd = new Date(due);
          if (dd < today) r.maintenance.overdue++;
          else if (dd <= new Date(today.getTime() + 30*24*60*60*1000)) r.maintenance.upcoming++;
          break;
        }
        if (done) { r.maintenance.done++; break; }
      }
      if (d[i][17]) r.revenue.total += Number(d[i][17]) || 0;
      if (d[i][18]) r.revenue.cost += Number(d[i][18]) || 0;
      if (d[i][21]) r.revenue.profit += Number(d[i][21]) || 0;
    }
  }
  return r;
}

/* ─── Get Customer by Plate (autocomplete) ─── */
function bctGetCustomerByPlate_(ss, params) {
  var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  if (!sheet) return {error: 'Sheet not found'};
  var plate = (params.plate || '').toUpperCase().replace(/\s/g, '');
  if (!plate) return {found: false};
  var data = sheet.getDataRange().getValues();
  for (var i = 6; i < data.length; i++) {
    var rp = String(data[i][7]||'').toUpperCase().replace(/\s/g, '');
    if (rp.indexOf(plate) >= 0) {
      return {found:true, row:i+1, name:bctMaskName_(data[i][4]), address:bctMaskAddress_(data[i][5]), phone:bctMaskPhone_(data[i][6]), plate:data[i][7], brand:data[i][8], model:data[i][9], carType:data[i][10], coatingType:data[i][11], channel:data[i][12], member:data[i][13], mr:data[i][14], price:data[i][15], _realName:data[i][4], _realPhone:data[i][6], _realAddress:data[i][5]};
    }
  }
  return {found: false};
}

/* ─── Get Config ─── */
function bctGetConfig_(ss) {
  var sheet = ss ? ss.getSheetByName('A4_config') : null;
  var cfg = {bu:[], channels:[], statuses:[], callStatuses:[], smsTemplate:'', lineToken:'', lineNotifyToken:'', smsUsername:'', smsSender:'', bookingFormUrl:'', triggers:[]};
  if (sheet) {
    var d = sheet.getDataRange().getValues();
    for (var i = 9; i < d.length; i++) {
      if (d[i][1]) cfg.bu.push(d[i][1]);
      if (d[i][2]) cfg.callStatuses.push(d[i][2]);
      if (d[i][4]) cfg.channels.push(d[i][4]);
      if (d[i][6]) cfg.statuses.push(d[i][6]);
    }
  }
  // Also get Script Properties (sensitive ones masked)
  var props = PropertiesService.getScriptProperties().getProperties();
  if (props['LINE_NOTIFY_TOKEN']) cfg.lineNotifyToken = '•••••' + props['LINE_NOTIFY_TOKEN'].slice(-4);
  if (props['SMS_USERNAME']) { cfg.smsUsername = props['SMS_USERNAME']; cfg.smsSender = props['SMS_SENDER'] || 'PRACHAKIJ'; }
  if (props['BCT_BOOKING_FORM_URL']) cfg.bookingFormUrl = props['BCT_BOOKING_FORM_URL'];
  // List BCT triggers (may fail if script.scriptapp scope not yet authorized)
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var j = 0; j < triggers.length; j++) {
      if (String(triggers[j].getHandlerFunction()).indexOf('bct') === 0) {
        cfg.triggers.push({fn: triggers[j].getHandlerFunction(), type: triggers[j].getEventType()});
      }
    }
  } catch(te) {
    cfg.triggers = [{fn: 'NEED_REAUTH', type: 'Open Apps Script editor and run any function to authorize new scopes (calendar, forms, scriptapp)'}];
  }
  return cfg;
}

/* ─── Save Appointment ─── */
function bctSaveAppointment_(ss, params) {
  try {
    var results = {};
    var aptDate = params.appointmentDate ? new Date(params.appointmentDate) : null;
    var aptType = params.appointmentType || 'coating';
    var typeLabel = aptType === 'maintenance' ? 'บำรุงผิวแก้ว' : aptType === 'both' ? 'เคลือบ+บำรุง' : 'เคลือบแก้ว';
    
    var plate = String(params.plate || '').trim().toUpperCase().replace(/\s/g, '');
    
    // ─── Step 1: For MAINTENANCE type, do NOT create/update B1 row ───
    // Only write to B1 for NEW coating appointments
    if (aptType !== 'maintenance') {
      var b1 = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
      var b1Row = 0;
      if (b1 && plate) {
        var b1data = b1.getDataRange().getValues();
        for (var i = 5; i < b1data.length; i++) {
          var rp = String(b1data[i][7] || '').trim().toUpperCase().replace(/\s/g, '');
          if (rp === plate) { b1Row = i + 1; break; }
        }
        
        if (b1Row > 0) {
          // UPDATE existing row (key-once principle)
          if (aptDate) b1.getRange(b1Row, 26).setValue(aptDate); // col Z = appointment date
          if (!b1data[b1Row-1][4] && params.name) b1.getRange(b1Row, 5).setValue(params.name);
          if (!b1data[b1Row-1][6] && params.phone) b1.getRange(b1Row, 7).setValue(params.phone);
          if (!b1data[b1Row-1][8] && params.brand) b1.getRange(b1Row, 9).setValue(params.brand);
          results.b1 = {status: 'updated', row: b1Row, plate: String(b1data[b1Row-1][7] || plate)};
        } else {
          // NEW customer — create new row
          var newRow = b1.getLastRow() + 1;
          var rowData = [
            '', newRow - 6, new Date(),
            params.receiver || '', params.name || '', params.address || '', params.phone || '',
            params.plate || '', params.brand || '', params.model || '', params.carType || 'รถใหม่ PMS',
            params.coatingType || 'พ่น 1 ปี', params.channel || '', params.member || '', params.mr || '', params.price || '',
            '', '', '', '', '', '', '', '', '',
            aptDate || '', '', typeLabel, '', typeLabel + ' ' + (aptDate ? bctFmtDate_(aptDate) : ''), '', '', '', ''
          ];
          b1.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
          results.b1 = {status: 'created', row: newRow, plate: params.plate || ''};
        }
      }
    } else {
      results.b1 = {status: 'skipped_maintenance', note: 'บำรุงผิวแก้วไม่บันทึก B1'};
    }
    
    // ─── Step 2: Update B2 maintenance cycle (สถานะการติดต่อ + รายละเอียด + วันเข้าบำรุง) ───
    var b2 = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
    var b2Row = 0;
    var b2Cycle = 0;
    if (b2 && plate) {
      var b2data = b2.getDataRange().getValues();
      for (var bi = 8; bi < b2data.length; bi++) {
        var bp = String(b2data[bi][2] || '').trim().toUpperCase().replace(/\s/g, '');
        if (bp === plate) {
          b2Row = bi + 1;
          // For maintenance: update first cycle that has a due date but no maint date and not yet completed
          if (aptType === 'maintenance' && aptDate) {
            for (var sc = 0; sc < 9; sc++) {
              var baseCol = 27 + (sc * 6); // 0-indexed
              var dueVal = b2data[bi][baseCol];
              var maintVal = b2data[bi][baseCol + 5];
              var contactVal = String(b2data[bi][baseCol + 3] || '').trim();
              // Only update if: has due date, no maintenance date, and not already completed
              if (dueVal && !maintVal && contactVal !== 'เข้าใช้บริการแล้ว') {
                // Update: status → นัดหมายแล้ว (col+4, 1-indexed), detail → typeLabel (col+5), maintenance date (col+6)
                b2.getRange(b2Row, baseCol + 4).setValue('นัดหมายแล้ว'); // สถานะการติดต่อ
                b2.getRange(b2Row, baseCol + 5).setValue(typeLabel + ' ' + bctFmtDate_(aptDate)); // รายละเอียด
                b2.getRange(b2Row, baseCol + 6).setValue(aptDate); // วันเข้าบำรุง
                b2Cycle = sc + 1;
                break;
              }
            }
          }
          break;
        }
      }
    }
    results.b2 = b2Row > 0 ? {status: 'updated', row: b2Row, cycle: b2Cycle || 0, cycleLabel: b2Cycle > 0 ? 'ครั้งที่ ' + b2Cycle : 'ไม่พบรอบที่ต้องอัพเดท', plate: plate} : {status: 'not_found', plate: plate};
    
    // ─── Step 3: Write to C2_จองคิว ───
    if (aptDate) {
      var c2 = ss.getSheetByName('C2_จองคิว');
      if (c2) {
        var c2Result = bctWriteQueueEntry_(c2, aptDate, plate, params.name || '', params.phone || '', aptType);
        results.c2 = c2Result;
      } else {
        results.c2 = {status: 'skipped', reason: 'C2 sheet not found'};
      }
    }
    
    // ─── Step 4: Update appointment date in B1 ─── (already done in step 1)
    
    // ─── Step 5: Send notification if requested ───
    if (params.sendNotification) {
      results.notification = bctSendNotification_({name:params.name, phone:params.phone, plate:params.plate, appointmentDate:aptDate ? bctFmtDate_(aptDate) : '', lineGroup:params.lineGroup, type:'appointment'});
    }
    return {success: true, results: results, plate: plate, name: bctMaskName_(params.name) || '', appointmentDate: aptDate ? bctFmtDate_(aptDate) : ''};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Write appointment to C2_จองคิว ─── */
function bctWriteQueueEntry_(c2, aptDate, plate, name, phone, aptType) {
  try {
    var dayOfWeek = aptDate.getDay(); // 0=Sun, 1=Mon...6=Sat
    if (dayOfWeek === 0) return {status: 'skipped', reason: 'Sunday - no queue'};
    
    var c2data = c2.getDataRange().getValues();
    var monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    var thaiMonths = {'มกราคม':0,'กุมภาพันธ์':1,'มีนาคม':2,'เมษายน':3,'พฤษภาคม':4,'มิถุนายน':5,'กรกฎาคม':6,'สิงหาคม':7,'กันยายน':8,'ตุลาคม':9,'พฤศจิกายน':10,'ธันวาคม':11};
    
    var targetMonth = aptDate.getMonth();
    var targetYear = aptDate.getFullYear();
    var targetDay = aptDate.getDate();
    var typeTag = aptType === 'maintenance' ? 'บำรุง' : aptType === 'both' ? 'เคลือบ+บำรุง' : 'เคลือบ';
    var entry = plate + ' ' + name + (phone ? '/' + phone : '') + ' [' + typeTag + ']';
    
    // C2 layout (0-indexed):
    // Date row: col 4(E)=Mon date, 6(G)=Tue date, 8(I)=Wed date, 10(K)=Thu date, 12(M)=Fri date, 14(O)=Sat date
    // Queue rows: col 5(F)=Mon data, 7(H)=Tue data, 9(J)=Wed data, 11(L)=Thu data, 13(N)=Fri data, 15(P)=Sat data
    var dayColMap = {1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 14}; // dayOfWeek -> date col (0-indexed)
    var dataColMap = {1: 5, 2: 7, 3: 9, 4: 11, 5: 13, 6: 15}; // dayOfWeek -> data col (0-indexed)
    var dateCol = dayColMap[dayOfWeek];
    var dataCol = dataColMap[dayOfWeek];
    if (dateCol === undefined) return {status: 'skipped', reason: 'Invalid day: ' + dayOfWeek};
    
    // Step 1: Find the month section
    var monthStartRow = -1;
    var monthEndRow = c2data.length;
    for (var r = 0; r < c2data.length; r++) {
      var cellVal = String(c2data[r][4] || '').trim(); // col E = month header
      if (!cellVal) continue;
      for (var m in thaiMonths) {
        if (cellVal.indexOf(m) === 0) {
          // Also match year — support Thai years (2569) and CE years (2026)
          var yr = cellVal.match(/(\d{4})/);
          if (yr) {
            var cellYear = parseInt(yr[1]) > 2400 ? parseInt(yr[1]) - 543 : parseInt(yr[1]);
            if (thaiMonths[m] === targetMonth && cellYear === targetYear) {
              monthStartRow = r;
              break; // Found the matching month — stop searching
            }
          }
          break; // Not our target month, skip to next row
        }
      }
      if (monthStartRow >= 0) break; // Found target month, stop scanning
    }
    
    if (monthStartRow < 0) {
      // Month not found — create it
      var newMonth = bctCreateMonthInC2_(c2, aptDate, c2data);
      if (newMonth && newMonth.monthStartRow >= 0) {
        monthStartRow = newMonth.monthStartRow;
        c2data = c2.getDataRange().getValues();
      } else {
        return {status: 'skipped', reason: 'Month not in C2 and auto-create failed'};
      }
    }
    
    // Find end of this month section
    for (var er = monthStartRow + 1; er < c2data.length; er++) {
      var ecVal = String(c2data[er][4] || '').trim();
      if (ecVal) {
        for (var em in thaiMonths) {
          if (ecVal.indexOf(em) === 0) {
            monthEndRow = er;
            er = c2data.length;
            break;
          }
        }
      }
    }
    
    // Step 2: Find the date row (row with target day number in the correct column)
    var dateRow = -1;
    for (var dr = monthStartRow + 1; dr < monthEndRow && dr < c2data.length; dr++) {
      var dateVal = c2data[dr][dateCol];
      // Date column can be a number or a Date object
      var dayNum = -1;
      if (typeof dateVal === 'number' && dateVal >= 1 && dateVal <= 31) {
        dayNum = dateVal;
      } else if (dateVal instanceof Date) {
        dayNum = dateVal.getDate();
      } else if (!isNaN(parseInt(String(dateVal)))) {
        dayNum = parseInt(String(dateVal));
      }
      if (dayNum === targetDay) {
        dateRow = dr;
        break;
      }
    }
    
    if (dateRow < 0) return {status: 'skipped', reason: 'Date ' + targetDay + '/' + (targetMonth+1) + ' not found in C2'};
    
    // Step 3: Find first empty queue slot after the date row
    // Queue format: rows after date row contain "คิว 1 9.00 น." / "คิว 2 13.00 น." / "คิวพิเศษ"
    // Or special entries. Look for empty data cell or line to append
    var targetRow = -1;
    
    // Check rows from dateRow+1 to next date row or next week
    for (var qr = dateRow + 1; qr < Math.min(dateRow + 10, monthEndRow); qr++) {
      if (qr >= c2data.length) break;
      var existingData = String(c2data[qr][dataCol] || '').trim();
      
      // If we hit another date row, stop
      var isDateRow = false;
      for (var dc = 0; dc < 16; dc += 2) {
        var dv = c2data[qr][dc + 4]; // check cols 4,6,8,10,12,14
        if (typeof dv === 'number' && dv >= 1 && dv <= 31) { isDateRow = true; break; }
      }
      if (isDateRow) break;
      
      // If this row has a queue label (คิว), check if there's room
      var labelVal = String(c2data[qr][4] || '').trim(); // col E
      if (labelVal.indexOf('คิว') >= 0 || existingData) {
        // This is a queue row — check if the data cell already has content for this day
        if (!existingData || existingData === 'คิว 1 9.00 น. :' || existingData === 'คิว 2 13.00 น. :') {
          // Empty slot for this day — write here
          targetRow = qr;
          break;
        } else {
          // Has existing content — append to it
          targetRow = qr;
          break;
        }
      }
      
      // If no label and no data, skip
      if (!labelVal && !existingData) continue;
    }
    
    // If still not found, look for an empty slot anywhere after date row
    if (targetRow < 0) {
      for (var qr2 = dateRow + 1; qr2 < Math.min(dateRow + 10, monthEndRow); qr2++) {
        if (qr2 >= c2data.length) break;
        var existing = String(c2data[qr2][dataCol] || '').trim();
        if (!existing) {
          targetRow = qr2;
          break;
        }
      }
    }
    
    if (targetRow < 0) return {status: 'skipped', reason: 'No available slot for ' + bctFmtDate_(aptDate)};
    
    // Step 4: Write or append the entry — check for duplicate first
    var currentVal = String(c2data[targetRow][dataCol] || '').trim();
    
    // Check duplicate: if this plate is already in the cell, don't add again
    if (currentVal.indexOf(plate) >= 0) {
      return {status: 'duplicate', row: targetRow + 1, col: dataCol + 1, entry: entry, date: bctFmtDate_(aptDate), note: 'ทะเบียนนี้มีในคิวแล้ว'};
    }
    
    var newVal;
    if (!currentVal || currentVal.startsWith('คิว 1') || currentVal.startsWith('คิว 2')) {
      newVal = entry;
    } else {
      newVal = currentVal + '\n' + entry;
    }
    c2.getRange(targetRow + 1, dataCol + 1).setValue(newVal);
    
    return {status: 'saved', row: targetRow + 1, col: dataCol + 1, entry: entry, date: bctFmtDate_(aptDate)};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Create new month section in C2_จองคิว ─── */
function bctCreateMonthInC2_(c2, aptDate, c2data) {
  try {
    var monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    var monthEng = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var targetMonth = aptDate.getMonth();
    var targetYear = aptDate.getFullYear();
    var monthLabel = monthNames[targetMonth] + ' ' + targetYear;
    var daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    // C2 layout (1-indexed cols):
    // E(5)=Mon, G(7)=Tue, I(9)=Wed, K(11)=Thu, M(13)=Fri, O(15)=Sat
    // Date nums go in E,G,I,K,M,O (0-indexed: 4,6,8,10,12,14)
    // Queue data goes in F,H,J,L,N,P (0-indexed: 5,7,9,11,13,15)
    
    var lastRow = c2.getLastRow();
    var startRow = lastRow + 2; // Leave 1 blank row
    
    // Row 1: Month header in col E
    c2.getRange(startRow, 5).setValue(monthLabel);
    
    // Row 2: Day names
    var dayRow = [];
    dayRow[4] = 'Monday'; dayRow[6] = 'Tuesday'; dayRow[8] = 'Wednesday';
    dayRow[10] = 'Thursday'; dayRow[12] = 'Friday'; dayRow[14] = 'Saturday';
    c2.getRange(startRow + 1, 1, 1, 16).setValues([dayRow]);
    
    // Generate weeks
    var currentRow = startRow + 2;
    var weekDates = []; // dates for current week
    var d = 1;
    var firstDow = new Date(targetYear, targetMonth, 1).getDay(); // 0=Sun
    
    while (d <= daysInMonth) {
      weekDates = [];
      // Figure out which dates fall on Mon-Sat this week
      var weekDayNums = [];
      for (var dow = 1; dow <= 6; dow++) { // Mon=1 to Sat=6
        if (d > daysInMonth) break;
        var testDate = new Date(targetYear, targetMonth, d);
        if (testDate.getDay() === dow) {
          weekDayNums.push({day: d, dow: dow, col: 4 + (dow - 1) * 2}); // 0-indexed col
          d++;
        }
      }
      
      if (weekDayNums.length === 0) {
        // Sunday — skip
        if (new Date(targetYear, targetMonth, d).getDay() === 0) d++;
        if (d > daysInMonth) break;
        continue;
      }
      
      // Write date row
      var dateRowVals = [];
      for (var wi = 0; wi < weekDayNums.length; wi++) {
        dateRowVals[weekDayNums[wi].col] = weekDayNums[wi].day;
      }
      c2.getRange(currentRow, 1, 1, 16).setValues([dateRowVals]);
      currentRow++;
      
      // Write คิว 1 row
      var q1Row = new Array(16).fill('');
      for (var wi2 = 0; wi2 < weekDayNums.length; wi2++) {
        q1Row[weekDayNums[wi2].col] = 'คิว 1 9.00 น. :';
      }
      c2.getRange(currentRow, 1, 1, 16).setValues([q1Row]);
      currentRow++;
      
      // Write คิว 2 row
      var q2Row = new Array(16).fill('');
      for (var wi3 = 0; wi3 < weekDayNums.length; wi3++) {
        q2Row[weekDayNums[wi3].col] = 'คิว 2 13.00 น. :';
      }
      c2.getRange(currentRow, 1, 1, 16).setValues([q2Row]);
      currentRow++;
      
      // Blank row for คิวพิเศษ (optional)
      // Skip — users will add manually
      
      // Skip Sunday
      if (d <= daysInMonth && new Date(targetYear, targetMonth, d).getDay() === 0) d++;
    }
    
    // Re-read C2 data
    var newData = c2.getDataRange().getValues();
    var monthStartRow = -1;
    for (var nr = 0; nr < newData.length; nr++) {
      var ncv = String(newData[nr][4] || '').trim();
      if (ncv.indexOf(monthNames[targetMonth]) === 0) {
        monthStartRow = nr;
        break;
      }
    }
    
    return {monthStartRow: monthStartRow, monthEndRow: newData.length, created: true};
  } catch(e) {
    return {monthStartRow: -1, error: String(e)};
  }
}

/* ─── Google Calendar Integration (graceful: write to sheet if no calendar scope) ─── */
function bctCreateCalendarEvent_(params) {
  var eventType = params.appointmentType || 'coating';
  var typeLabel = eventType === 'maintenance' ? 'บำรุงผิวแก้ว' : 
                  eventType === 'both' ? 'เคลือบ+บำรุง' : 'เคลือบแก้ว';
  var title = '🔎 ' + typeLabel + ' — ' + params.plate + ' (' + (params.name || '') + ')';
  var desc = 'ประเภท: ' + typeLabel + '\n';
  desc += 'ทะเบียน: ' + params.plate + '\n';
  desc += 'ชื่อลูกค้า: ' + (params.name || '') + '\n';
  desc += 'เบอร์โทร: ' + (params.phone || '') + '\n';
  desc += 'ยี่ห้อ/รุ่น: ' + (params.brand || '') + ' ' + (params.model || '') + '\n';
  desc += 'ประเภทเคลือบ: ' + (params.coatingType || '') + '\n';
  desc += 'รับรถ: ' + (params.receiver || '') + '\n';
  desc += 'ราคา: ' + (params.price || '') + '\n';
  desc += '— BCT เคลือบแก้ว PMS Auto Guarantee —';
  
  var aptDate = new Date(params.appointmentDate);
  var deliverDate = params.deliverDate ? new Date(params.deliverDate) : null;
  var mainResult = null;
  var deliverResult = null;
  
  // Try Calendar API — skip if not authorized
  try {
    var cal = CalendarApp.getDefaultCalendar();
    var event = cal.createAllDayEvent(title, aptDate, {description: desc});
    mainResult = {id: event.getId(), title: title, date: bctFmtDate_(aptDate), source: 'calendar'};
    if (deliverDate && deliverDate.toDateString() !== aptDate.toDateString()) {
      var deliverTitle = '🚗 ส่งมอบรถ — ' + params.plate + ' (' + (params.name || '') + ')';
      var deliverDesc = 'ทะเบียน: ' + params.plate + '\nชื่อ: ' + (params.name || '') + '\nเคลือบ: ' + (params.coatingType || '') + '\n— BCT เคลือบแก้ว PMS Auto Guarantee —';
      var deliverEvent = cal.createAllDayEvent(deliverTitle, deliverDate, {description: deliverDesc});
      deliverResult = {id: deliverEvent.getId(), title: deliverTitle, date: bctFmtDate_(deliverDate), source: 'calendar'};
    }
  } catch(calErr) {
    // No calendar scope — write to appointment sheet instead
    Logger.log('Calendar not available, writing to sheet: ' + calErr.message);
  }
  
  // Always write to appointment log sheet (fallback + audit trail)
  try {
    var ss = SpreadsheetApp.openById(BCT_SS_ID);
    var logSheet = ss.getSheetByName('C2_จองคิว') || ss.getSheetByName('Log_นัดหมาย');
    if (logSheet) {
      var logRow = [
        new Date(), params.plate || '', params.name || '', params.phone || '',
        typeLabel, bctFmtDate_(aptDate), deliverDate ? bctFmtDate_(deliverDate) : '',
        params.brand || '', params.coatingType || '', params.receiver || '', params.price || '',
        mainResult ? '✅ Calendar' : '📋 Sheet only', title
      ];
      logSheet.appendRow(logRow);
    }
  } catch(logErr) {
    Logger.log('Log sheet error: ' + logErr.message);
  }
  
  var result = {appointment: mainResult || {title: title, date: bctFmtDate_(aptDate), source: 'sheet'}};
  if (deliverResult) result.delivery = deliverResult;
  else if (deliverDate) result.delivery = {title: '🚗 ส่งมอบรถ — ' + params.plate, date: bctFmtDate_(deliverDate), source: 'sheet'};
  return result;
}

/* ─── Google Form for Appointment Booking (graceful — skip if not authorized) ─── */
function bctCreateBookingForm_() {
  try {
    var ss = SpreadsheetApp.openById(BCT_SS_ID);
    var formTitle = 'BCT เคลือบแก้ว — ลงนัดหมาย';
    
    var props = PropertiesService.getScriptProperties();
    var existingFormId = props.getProperty('BCT_BOOKING_FORM_ID');
    var form;
    
    if (existingFormId) {
      try {
        form = FormApp.openById(existingFormId);
        var items = form.getItems();
        for (var i = items.length - 1; i >= 0; i--) {
          form.deleteItem(items[i]);
        }
      } catch(e) {
        form = FormApp.create(formTitle);
        props.setProperty('BCT_BOOKING_FORM_ID', form.getId());
      }
    } else {
      form = FormApp.create(formTitle);
      props.setProperty('BCT_BOOKING_FORM_ID', form.getId());
    }
    
    form.setTitle(formTitle)
        .setDescription('กรุณากรอกข้อมูลเพื่อนัดหมายเคลือบแก้ว / บำรุงผิวแก้ว\nระบบจะบันทึกปฏิทินและส่งแจ้งเตือนอัตโนมัติ')
        .setIsQuiz(false)
        .setAllowResponseEdits(true)
        .setProgressBar(true);
    
    form.addPageBreakItem().setTitle('📋 ข้อมูลลูกค้า');
    form.addTextItem().setTitle('ทะเบียนรถ').setHelpText('เช่น กข1234').setRequired(true);
    form.addTextItem().setTitle('ชื่อ-นามสกุล').setRequired(true);
    form.addTextItem().setTitle('เบอร์โทรศัพท์').setHelpText('10 หลัก เช่น 0891234567').setRequired(true);
    form.addTextItem().setTitle('ที่อยู่').setRequired(false);
    
    form.addPageBreakItem().setTitle('🚗 ข้อมูลรถและประเภท');
    form.addTextItem().setTitle('ยี่ห้อรถ').setRequired(false);
    form.addTextItem().setTitle('รุ่นรถ').setRequired(false);
    var carTypeItem = form.addMultipleChoiceItem().setTitle('ประเภทรถ').setRequired(false);
    carTypeItem.setChoices([
      carTypeItem.createChoice('รถใหม่ PMS'),
      carTypeItem.createChoice('รถใหม่อื่นๆ'),
      carTypeItem.createChoice('รถเก่า')
    ]);
    var coatingItem = form.addMultipleChoiceItem().setTitle('ประเภทเคลือบ').setRequired(true);
    coatingItem.setChoices([
      coatingItem.createChoice('พ่น 1 ปี'),
      coatingItem.createChoice('พ่น 3 ปี'),
      coatingItem.createChoice('Diamond'),
      coatingItem.createChoice('บำรุงผิวแก้ว')
    ]);
    form.addTextItem().setTitle('ช่องทาง').setRequired(false);
    form.addTextItem().setTitle('ผู้รับรถ (MR)').setRequired(false);
    form.addTextItem().setTitle('ราคา').setRequired(false);
    
    form.addPageBreakItem().setTitle('📅 วันนัดหมาย');
    form.addDateTimeItem().setTitle('วันที่นัดเข้าทำ').setRequired(true);
    form.addDateTimeItem().setTitle('วันที่นัดส่งมอบรถ').setRequired(false);
    form.addTextItem().setTitle('Line Group URL (ถ้ามี)').setHelpText('https://line.me/R/ti/g/...').setRequired(false);
    
    form.setDestination(FormApp.DestinationType.SPREADSHEET, BCT_SS_ID);
    
    var formUrl = form.getPublishedUrl();
    var editUrl = form.getEditUrl();
    props.setProperty('BCT_BOOKING_FORM_URL', formUrl);
    props.setProperty('BCT_BOOKING_FORM_EDIT_URL', editUrl);
    
    // Setup onFormSubmit trigger
    try {
      bctSetupFormTrigger_();
    } catch(triggerErr) {
      Logger.log('Trigger setup skipped: ' + triggerErr.message);
    }
    
    return {formId: form.getId(), formUrl: formUrl, editUrl: editUrl, status: 'created'};
  } catch(e) {
    // FormApp not authorized — return form-less mode
    return {status: 'NEED_REAUTH', message: 'Open Apps Script Editor → Run bctCreateBookingForm_ → click Allow to authorize Forms scope', url: 'https://script.google.com/d/1uLcIjLf-7LS0LqBXKTidED99WTFgccB6VK8KdYn-9mmIm565wF0UPS7s/edit'};
  }
}

/* ─── On Form Submit Handler ─── */
function bctOnFormSubmit_(e) {
  try {
    var response = e.response;
    var itemResponses = response.getItemResponses();
    var data = {};
    for (var i = 0; i < itemResponses.length; i++) {
      var ir = itemResponses[i];
      data[ir.getItem().getTitle()] = ir.getResponse();
    }
    
    // Map form fields to appointment params
    var params = {
      plate: (data['ทะเบียนรถ'] || '').toUpperCase().trim(),
      name: bctMaskName_(data['ชื่อ-นามสกุล']) || '',
      phone: bctMaskPhone_(data['เบอร์โทรศัพท์']) || '',
      address: bctMaskAddress_(data['ที่อยู่']) || '',
      brand: data['ยี่ห้อรถ'] || '',
      model: data['รุ่นรถ'] || '',
      carType: data['ประเภทรถ'] || 'รถใหม่ PMS',
      coatingType: data['ประเภทเคลือบ'] || 'พ่น 1 ปี',
      channel: data['ช่องทาง'] || '',
      receiver: data['ผู้รับรถ (MR)'] || '',
      mr: data['ผู้รับรถ (MR)'] || '',
      price: data['ราคา'] || '',
      appointmentDate: data['วันที่นัดเข้าทำ'] || '',
      deliverDate: data['วันที่นัดส่งมอบรถ'] || '',
      lineGroup: data['Line Group URL (ถ้ามี)'] || '',
      appointmentType: (data['ประเภทเคลือบ'] || '').indexOf('บำรุง') >= 0 ? 'maintenance' : 'coating',
      sendNotification: true  // always send notification on form submit
    };
    
    if (!params.plate || !params.name || !params.appointmentDate) return;
    
    var ss = SpreadsheetApp.openById(BCT_SS_ID);
    
    // Save to B1
    var b1 = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
    if (b1) {
      var lastRow = b1.getLastRow();
      var newRow = lastRow + 1;
      var rowData = [
        params.plate + '_นัดหมาย',
        newRow - 6, new Date(),
        params.receiver || '', params.name, params.address, params.phone,
        params.plate, params.brand, params.model, params.carType,
        params.coatingType, params.channel, '', params.mr, params.price,
        '', '', '', '', '', '', '', '', '',
        new Date(params.appointmentDate),
        new Date(params.deliverDate || params.appointmentDate),
        'นัดหมาย(Form)', '', 'เคลือบแก้ว ' + bctFmtDate_(new Date(params.appointmentDate)),
        '', '', '', ''
      ];
      b1.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    }
    
    // Create calendar event
    bctCreateCalendarEvent_(params);
    
    // Send notification (Line + SMS) — use REAL name/phone for actual delivery
    bctSendNotification_({
      type: 'appointment',
      name: params.name,
      phone: params.phone,
      plate: params.plate,
      appointmentDate: bctFmtDate_(new Date(params.appointmentDate)),
      lineGroup: params.lineGroup
    });
    
  } catch(e) {
    // Log error but don't fail the form submit
    Logger.log('bctOnFormSubmit_ error: ' + e);
  }
}

/* ─── Setup Form Submit Trigger (graceful — skip if not authorized) ─── */
function bctSetupFormTrigger_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
          triggers[i].getHandlerFunction() === 'bctOnFormSubmit_') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    ScriptApp.newTrigger('bctOnFormSubmit_')
      .forSpreadsheet(SpreadsheetApp.openById(BCT_SS_ID))
      .onFormSubmit()
      .create();
    return {status: 'created'};
  } catch(e) {
    return {status: 'NEED_REAUTH', message: 'Open Apps Script Editor → Run bctSetupFormTrigger_ → click Allow'};
  }
}

/* ─── Setup Triggers (graceful — skip if not authorized) ─── */
function bctSetupTriggers_() {
  var results = [];
  // Try to setup triggers — skip if ScriptApp not authorized
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var fn = String(triggers[i].getHandlerFunction());
      if (fn.indexOf('bct') === 0 || fn.indexOf('billing') === 0) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    // Daily maintenance check trigger
    ScriptApp.newTrigger('bctCheckMaintenanceDue_')
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .create();
    results.push({trigger: 'dailyMaintenanceCheck', status: 'created'});
    
    // Monthly billing snapshot trigger — runs on the 29th of each month at 9:00 AM
    // Using onMonthDay(29) for monthly execution
    ScriptApp.newTrigger('billingMonthlySnapshotTrigger_')
      .timeBased()
      .onMonthDay(29)
      .atHour(9)
      .create();
    results.push({trigger: 'monthlyBillingSnapshot', status: 'created'});
  } catch(e) {
    results.push({trigger: 'dailyMaintenanceCheck', status: 'NEED_REAUTH', message: 'Open Apps Script Editor → Run any function → click Allow to authorize', url: 'https://script.google.com/d/1uLcIjLf-7LS0LqBXKTidED99WTFgccB6VK8KdYn-9mmIm565wF0UPS7s/edit'});
  }
  return results;
}

/* ─── Get/Set Config (Script Properties) ─── */
function bctSetConfig_(params) {
  var props = PropertiesService.getScriptProperties();
  if (params.lineNotifyToken) props.setProperty('LINE_NOTIFY_TOKEN', params.lineNotifyToken);
  if (params.smsUsername) props.setProperty('SMS_USERNAME', params.smsUsername);
  if (params.smsPassword) props.setProperty('SMS_PASSWORD', params.smsPassword);
  if (params.smsSender) props.setProperty('SMS_SENDER', params.smsSender);
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  return bctGetConfig_(ss);
}

/* ─── Save Maintenance Note ─── */
function bctSaveMaintNote_(ss, params) {
  try {
    var sheet = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
    if (!sheet) return {error: 'Sheet not found'};
    var row = params.row;
    var cycle = params.cycle || 1;
    // B2 cycles start at col 27 (1-indexed: col AB), each 6 cols
    var baseCol = 27 + ((cycle - 1) * 6); // 0-indexed
    // getRange uses 1-indexed row and col
    if (params.callDate) sheet.getRange(row, baseCol + 2).setValue(new Date(params.callDate));  // วันที่โทร
    if (params.caller) sheet.getRange(row, baseCol + 3).setValue(params.caller);  // ผู้โทร
    if (params.callStatus) sheet.getRange(row, baseCol + 4).setValue(params.callStatus);  // สถานะการติดต่อ
    if (params.callDetail) sheet.getRange(row, baseCol + 5).setValue(params.callDetail);  // รายละเอียด
    if (params.maintenanceDate) sheet.getRange(row, baseCol + 6).setValue(new Date(params.maintenanceDate));  // วันเข้าบำรุง
    return {success: true, row: row, cycle: cycle};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Save Customer ─── */
function bctSaveCustomer_(ss, params) {
  try {
    var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
    if (!sheet) return {error: 'Sheet not found'};
    if (params.row) {
      if (params.name) sheet.getRange(params.row, 5).setValue(params.name);
      if (params.address) sheet.getRange(params.row, 6).setValue(params.address);
      if (params.phone) sheet.getRange(params.row, 7).setValue(params.phone);
      if (params.plate) sheet.getRange(params.row, 8).setValue(params.plate);
      if (params.brand) sheet.getRange(params.row, 9).setValue(params.brand);
      if (params.coatingType) sheet.getRange(params.row, 12).setValue(params.coatingType);
      if (params.appointmentDate) sheet.getRange(params.row, 26).setValue(new Date(params.appointmentDate));
      return {success: true, action: 'updated'};
    }
    return {error: 'Missing row'};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Save Queue ─── */
function bctSaveQueue_(ss, params) {
  try {
    var sheet = ss.getSheetByName('C2_จองคิว');
    if (!sheet) return {error: 'Sheet not found'};
    if (params.row && params.col && params.text) {
      var cur = sheet.getRange(params.row, params.col).getValue();
      sheet.getRange(params.row, params.col).setValue(cur ? cur + '\n' + params.text : params.text);
      return {success: true};
    }
    return {error: 'Missing params'};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Send Notification (Line + SMS) ─── */
function bctSendNotification_(params) {
  var results = {};
  var message = '';
  
  // PDPA: Look up real name/phone from spreadsheet by plate
  // Frontend sends masked data — we need real data for sending notifications
  if (params.plate && (!params.name || params.name.indexOf('●') >= 0 || !params.phone || params.phone.indexOf('●') >= 0)) {
    try {
      var ss = SpreadsheetApp.openById(BCT_SS_ID);
      var b1sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
      if (b1sheet) {
        var b1data = b1sheet.getDataRange().getValues();
        var np = normPlateGS_(String(params.plate));
        for (var ri = 5; ri < b1data.length; ri++) {
          var rp = String(b1data[ri][7]||'').toUpperCase().replace(/\s/g, '');
          if (rp === np || rp.indexOf(np) >= 0 || np.indexOf(rp) >= 0) {
            if (!params.name || params.name.indexOf('●') >= 0) params.name = String(b1data[ri][4]||'');
            if (!params.phone || params.phone.indexOf('●') >= 0) params.phone = String(b1data[ri][6]||'');
            if (params.lineGroup === undefined || params.lineGroup === '') params.lineGroup = String(b1data[ri][94]||'');
            break;
          }
        }
      }
    } catch(lookupErr) {
      // Fall through — use whatever name/phone we have
    }
  }
  
  if (params.type === 'appointment') {
    message = 'รถของท่านครบกำหนดบำรุงผิวแก้ว แล้วค่ะ ติดต่อจองคิว 089-9399371\n';
    message += 'ทะเบียน: ' + params.plate + '\nชื่อ: ' + params.name;
    if (params.appointmentDate) message += '\nวันนัด: ' + params.appointmentDate;
    message += '\n- BCT เคลือบแก้ว PMS Auto Guarantee -';
  } else if (params.type === 'maintenance_reminder') {
    message = 'แจ้งเตือนครบกำหนดบำรุงผิวแก้ว\nทะเบียน: ' + params.plate + '\nชื่อ: ' + params.name;
    if (params.dueDate) message += '\nครบกำหนด: ' + params.dueDate;
    message += '\nติดต่อจองคิว: 089-9399371\n- BCT เคลือบแก้ว PMS Auto Guarantee -';
  } else if (params.customMessage) {
    message = params.customMessage;
  }
  
  // PDPA: create masked version for API response (real message sent to customer)
  var maskedMessage = message.replace(params.name, bctMaskName_(params.name));
  if (params.phone) maskedMessage = maskedMessage.replace(params.phone, bctMaskPhone_(String(params.phone)));
  
  // LINE — try LINE Messaging API first (notify-api.line.me is discontinued), fallback to Notify
  var lineSent = false;
  var lineChannelToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var lineNotifyToken = PropertiesService.getScriptProperties().getProperty('LINE_NOTIFY_TOKEN');
  
  // Try LINE Messaging API (v2 bot) if channel token available
  if (lineChannelToken) {
    try {
      var lineGroupId = PropertiesService.getScriptProperties().getProperty('LINE_GROUP_ID') || '';
      var lineTarget = lineGroupId || params.lineGroup || '';
      if (lineTarget) {
        var linePayload = {
          to: lineTarget,
          messages: [{type: 'text', text: message}]
        };
        var lmr = null;
        var lineAttempts = 0;
        while (lineAttempts < 3 && !lmr) {
          try {
            lineAttempts++;
            lmr = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
              method: 'post',
              headers: {'Authorization': 'Bearer ' + lineChannelToken, 'Content-Type': 'application/json'},
              payload: JSON.stringify(linePayload),
              muteHttpExceptions: true
            });
          } catch(fetchErr) {
            if (lineAttempts >= 3) throw fetchErr;
            Utilities.sleep(2000 * lineAttempts);
          }
        }
        if (lmr) {
          var lineOk = lmr.getResponseCode() === 200;
          results.line = {status: lmr.getResponseCode(), sent: lineOk, group: 'BCT เคลือบแก้ว', method: 'Messaging API', message: maskedMessage, attempts: lineAttempts};
          if (!lineOk) results.line.detail = lmr.getContentText();
          lineSent = lineOk;
        }
      } else {
        results.line = {sent: false, reason: 'No LINE_GROUP_ID in Script Properties for Messaging API', message: maskedMessage};
      }
    } catch(e) {
      results.line = {error: String(e), sent: false, method: 'Messaging API', message: maskedMessage};
    }
  }
  
  // Fallback: try LINE Notify (may still work if domain revived)
  if (!lineSent && lineNotifyToken) {
    try {
      var lr = null;
      var lineAttempts = 0;
      while (lineAttempts < 3 && !lr) {
        try {
          lineAttempts++;
          lr = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
            method: 'post',
            headers: {'Authorization': 'Bearer ' + lineNotifyToken, 'Content-Type': 'application/x-www-form-urlencoded'},
            payload: {message: message},
            muteHttpExceptions: true
          });
        } catch(fetchErr) {
          if (lineAttempts >= 3) throw fetchErr;
          Utilities.sleep(2000 * lineAttempts);
        }
      }
      if (lr) {
        var lineOk = lr.getResponseCode() === 200;
        results.line = {status: lr.getResponseCode(), sent: lineOk, group: 'BCT เคลือบแก้ว', method: 'Notify', message: maskedMessage, attempts: lineAttempts};
        if (!lineOk) results.line.detail = lr.getContentText();
        lineSent = lineOk;
      }
    } catch(e) {
      if (!results.line) results.line = {error: String(e), sent: false, method: 'Notify', message: maskedMessage};
    }
  }
  
  if (!lineSent && !results.line) {
    results.line = {sent: false, reason: 'No LINE_CHANNEL_ACCESS_TOKEN or LINE_NOTIFY_TOKEN in Script Properties', message: maskedMessage};
  }
  
  // SMS — ThaiBulkSMS v2 API (Basic Auth + JSON) with fallback to legacy endpoint
  if (params.phone) {
    try {
      var smsUser = PropertiesService.getScriptProperties().getProperty('SMS_USERNAME');
      var smsPass = PropertiesService.getScriptProperties().getProperty('SMS_PASSWORD');
      var smsSender = PropertiesService.getScriptProperties().getProperty('SMS_SENDER') || 'PRACHAKIJ';
      if (!smsUser || !smsPass) {
        results.sms = {sent: false, reason: 'Set SMS_USERNAME and SMS_PASSWORD in Script Properties', phone: bctMaskPhone_(String(params.phone).replace(/[^0-9]/g, ''))};
      } else {
        var cleanPhone = String(params.phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 10) {
          var sr = null;
          var smsOk = false;
          var smsMethod = '';
          var smsDetail = '';
          
          // Try v2 API first (api-v2.thaibulksms.com/sms — Basic Auth + JSON)
          try {
            var basicAuth = Utilities.base64Encode(smsUser + ':' + smsPass);
            var v2Payload = JSON.stringify({
              msisdn: [cleanPhone],
              message: message.substring(0, 160),
              sender: smsSender,
              force: 'standardsms'
            });
            sr = UrlFetchApp.fetch('https://api-v2.thaibulksms.com/sms', {
              method: 'post',
              headers: {
                'Authorization': 'Basic ' + basicAuth,
                'Content-Type': 'application/json'
              },
              payload: v2Payload,
              muteHttpExceptions: true
            });
            var v2Code = sr.getResponseCode();
            var v2Body = sr.getContentText();
            if (v2Code === 200 || v2Code === 201) {
              var v2Json = null;
              try { v2Json = JSON.parse(v2Body); } catch(je) {}
              // Check if response contains an error object (auth failed etc)
              if (v2Json && v2Json.error) {
                smsMethod = 'v2-auth-fail';
                smsDetail = v2Body;
              } else {
                smsOk = true;
                smsMethod = 'v2';
              }
            } else if (v2Code === 401) {
              smsMethod = 'v2-auth-fail';
              smsDetail = v2Body;
            } else {
              smsMethod = 'v2-fail';
              smsDetail = v2Body;
            }
          } catch(v2Err) {
            smsMethod = 'v2-dns-fail';
            smsDetail = String(v2Err);
          }
          
          // Fallback: legacy endpoint (portal.thaibulksms.com/sms_api — form-encoded)
          if (!smsOk) {
            try {
              sr = UrlFetchApp.fetch('https://portal.thaibulksms.com/sms_api', {
                method: 'post',
                payload: {username: smsUser, password: smsPass, sender: smsSender, msisdn: cleanPhone, message: message.substring(0, 160), force: 'standard'},
                muteHttpExceptions: true
              });
              var legCode = sr.getResponseCode();
              if (legCode === 200 || legCode === 201) {
                smsOk = true;
                smsMethod = smsMethod ? smsMethod + '+legacy' : 'legacy';
              } else {
                smsMethod = smsMethod ? smsMethod + '+legacy-fail' : 'legacy-fail';
                smsDetail = sr.getContentText();
              }
            } catch(legErr) {
              smsMethod = smsMethod ? smsMethod + '+legacy-dns-fail' : 'legacy-dns-fail';
              smsDetail = smsDetail + ' | ' + String(legErr);
            }
          }
          
          results.sms = {sent: smsOk, phone: bctMaskPhone_(cleanPhone), message: message.substring(0, 160), method: smsMethod};
          if (!smsOk) results.sms.detail = smsDetail;
        } else {
          results.sms = {sent: false, reason: 'Invalid phone', phone: bctMaskPhone_(cleanPhone)};
        }
      }
    } catch(e) {
      results.sms = {error: String(e), sent: false, phone: bctMaskPhone_(String(params.phone).replace(/[^0-9]/g, ''))};
    }
  }
  
  // Include the masked message text in results for frontend display (PDPA)
  results.sentMessage = maskedMessage;

  // EMAIL — send notification email via MailApp (now authorized)
  var emailRecipient = params.email || '';
  var teamEmail = PropertiesService.getScriptProperties().getProperty('BCT_TEAM_EMAIL') || '';
  var emailSubject = '';
  if (params.type === 'appointment') {
    emailSubject = '📅 นัดหมายบำรุงผิวแก้ว - ทะเบียน ' + (params.plate || '');
  } else if (params.type === 'maintenance_reminder') {
    emailSubject = '🔔 แจ้งเตือนครบกำหนดบำรุงผิวแก้ว - ทะเบียน ' + (params.plate || '');
  } else {
    emailSubject = '📋 แจ้งเตือน BCT - ทะเบียน ' + (params.plate || '');
  }
  try {
    var emailTo = (emailRecipient && emailRecipient.indexOf('@') > 0) ? emailRecipient : teamEmail;
    if (emailTo) {
      GmailApp.sendEmail(emailTo, emailSubject, message);
      results.email = { sent: true, to: bctMaskAddress_(emailTo), subject: emailSubject };
    } else {
      results.email = { sent: false, reason: 'No email recipient configured (BCT_TEAM_EMAIL not set)' };
    }
  } catch(e) {
    results.email = { sent: false, error: String(e), to: bctMaskAddress_(teamEmail), subject: emailSubject };
  }
  
  return results;
}

/* ─── Format Date helper ─── */
function bctFmtDate_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) { try { d = new Date(d); } catch(e) { return ''; } }
  if (isNaN(d.getTime())) return '';
  var dd = d.getDate(), mm = d.getMonth() + 1, yy = d.getFullYear();
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + yy;
}

/* ─── PDPA helpers: mask personal data ─── */
function bctMaskName_(name) {
  if (!name) return '';
  name = String(name).trim();
  if (name.length <= 2) return name.charAt(0) + '●';
  // Show first 2 chars, rest masked: สมศักดิ์ → สม●●●● or สมศักดิ์ ผ่องโสภา → สม●●●● ผ●●●●●●
  var parts = name.split(' ');
  return parts.map(function(p) {
    if (p.length <= 1) return p;
    return p.charAt(0) + '●'.repeat(p.length - 1);
  }).join(' ');
}
function bctMaskPhone_(phone) {
  if (!phone) return '';
  var p = String(phone).replace(/\D/g, '');
  if (p.length < 7) return '●●●●●●●';
  // Show first 3 and last 2: 0891234567 → 089●●●●67
  return p.substring(0, 3) + '●'.repeat(p.length - 5) + p.substring(p.length - 2);
}
function bctMaskAddress_(addr) {
  if (!addr) return '';
  var a = String(addr).trim();
  if (a.length <= 5) return '●●●●●';
  return a.substring(0, 5) + '●'.repeat(Math.min(a.length - 5, 20));
}

/* ─── Daily trigger: check maintenance due ─── */
function bctCheckMaintenanceDue_() {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  var sheet = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var today = new Date();
  var soon = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  for (var i = 8; i < data.length; i++) {
    var row = data[i];
    if (!row[2]) continue;
    var plate = String(row[2]||'').trim();
    if (!plate || plate.indexOf('หากต้องการ')>=0) continue;
    for (var s = 0; s < 9; s++) {
      var bc = 27 + (s * 6);
      var dueDate = row[bc];
      var callDate = row[bc + 1];
      var done = row[bc + 5];
      if (dueDate && !done) {
        var dd = new Date(dueDate);
        if (dd <= soon && dd >= today) {
          var alreadyCalled = false;
          if (callDate) {
            var cd = new Date(callDate);
            if ((today - cd) / (1000*60*60*24) < 3) alreadyCalled = true;
          }
          if (!alreadyCalled) {
            // Send notification (Line + SMS)
            bctSendNotification_({type:'maintenance_reminder', plate:plate, name:row[3], phone:row[5], dueDate:bctFmtDate_(dueDate), lineGroup:row[94]||''});
            // Auto-create Calendar event for maintenance due (skip if no calendar scope)
            try {
              var cal = CalendarApp.getDefaultCalendar();
              var calTitle = '🛡️ ครบกำหนดบำรุง — ' + plate + ' (' + (row[3]||'') + ')';
              var calDesc = 'ทะเบียน: ' + plate + '\nชื่อ: ' + (row[3]||'') + '\nเบอร์โทร: ' + (row[5]||'') + '\nครบกำหนด: ' + bctFmtDate_(dueDate) + '\nครั้งที่: ' + (s+1) + '\n— BCT เคลือบแก้ว PMS Auto Guarantee —';
              cal.createAllDayEvent(calTitle, dd, {description: calDesc});
            } catch(ce) { /* calendar not authorized — logged to sheet only */ }
            sheet.getRange(i + 1, bc + 2).setValue(today);
            break;
          }
        }
      }
    }
  }
}

function bctDebugC2Headers_() {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  var c2 = ss.getSheetByName('C2_จองคิว');
  var data = c2.getDataRange().getValues();
  var headers = [];
  var thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  for (var i = 0; i < data.length; i++) {
    var v = String(data[i][4] || '').trim(); // col E
    for (var m = 0; m < thaiMonths.length; m++) {
      if (v.indexOf(thaiMonths[m]) >= 0) {
        headers.push({row: i+1, text: v, month: thaiMonths[m]});
        break;
      }
    }
  }
  return {totalRows: data.length, headers: headers};
}function debugCleanC2Duplicates_() {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  var c2 = ss.getSheetByName('C2_จองคิว');
  var data = c2.getDataRange().getValues();
  var thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  
  // Find all month headers
  var headers = [];
  for (var i = 0; i < data.length; i++) {
    var v = String(data[i][4] || '').trim();
    for (var m = 0; m < thaiMonths.length; m++) {
      if (v.indexOf(thaiMonths[m]) >= 0) {
        headers.push({row1: i+1, row0: i, text: v, month: thaiMonths[m]});
        break;
      }
    }
  }
  
  // Find duplicates of พฤษภาคม
  var mayHeaders = headers.filter(function(h) { return h.month === 'พฤษภาคม'; });
  var deleted = [];
  if (mayHeaders.length > 1) {
    // Keep the first one (row 133), delete rows after the last real data row
    var lastRealRow = 320; // กันยายน header is at row 270, data extends to ~320
    for (var mh = 1; mh < mayHeaders.length; mh++) {
      var startRow = mayHeaders[mh].row1;
      // Delete from startRow to the next header or end of data
      var endRow = (mh + 1 < mayHeaders.length) ? mayHeaders[mh+1].row1 - 1 : c2.getLastRow();
      // Delete these rows (from bottom to top to preserve row numbers)
      deleted.push('Would delete rows ' + startRow + ' to ' + endRow);
    }
  }
  
  return {totalRows: data.length, mayHeaders: mayHeaders, headers: headers, wouldDelete: deleted};
}function bctCleanC2Duplicates_() {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  var c2 = ss.getSheetByName('C2_จองคิว');
  var lastRow = c2.getLastRow();
  
  // Delete rows from 358 to lastRow (these are auto-created duplicates)
  // Also remove the stale FKP184 entry at row 392
  var deletedRanges = [];
  
  // Row 320 has a false month header "กท-6655 จบ/เพลินพิศ ยุทธสุขประเสริฐ /0835264999/วันที่ 4 มกราคม 70 เวลา 09.00 น."
  // This is NOT a header - it's queue data. Don't delete it.
  
  // The real C2 data ends around row 330 (after กันยายน section)
  // Rows 358+ are auto-created duplicates that need to be removed
  
  if (lastRow >= 358) {
    // Delete from row 358 to lastRow (delete from bottom)
    var numRowsToDelete = lastRow - 358 + 1;
    c2.deleteRows(358, numRowsToDelete);
    deletedRanges.push('Deleted rows 358-' + lastRow + ' (' + numRowsToDelete + ' rows)');
  }
  
  return {deleted: deletedRanges, newLastRow: c2.getLastRow()};
}function bctRollbackFKP184v2_() {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  var b2 = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
  var data = b2.getDataRange().getValues();
  
  for (var bi = 8; bi < data.length; bi++) {
    var bp = String(data[bi][2] || '').trim().toUpperCase();
    if (bp === 'FKP184' || normPlateGS_(bp) === 'FKP184') {
      // Clear wrong data from our tests for ALL 3 cycles
      // Cycle cols: scBase = 27, 33, 39 (0-indexed)
      // Contact status = scBase + 3 (0-indexed) = 30, 36, 42
      // Maintenance date = scBase + 5 (0-indexed) = 32, 38, 44
      // getRange uses 1-indexed: contact status = scBase + 4, maint date = scBase + 6
      for (var sc = 0; sc < 3; sc++) {
        var scBase = 27 + (sc * 6);
        b2.getRange(bi + 1, scBase + 4).clearContent(); // contact status
        b2.getRange(bi + 1, scBase + 6).clearContent(); // maintenance date
      }
      return {found: true, row: bi + 1, plate: bp, cleared: 'cycles 1-3 contactStatus+maintDate'};
    }
  }
  return {found: false};
}
/* ─── Save Config Settings (Script Properties) ─── */
function bctSaveConfig_(params) {
  var props = PropertiesService.getScriptProperties();
  if (params.lineNotifyToken !== undefined) props.setProperty('LINE_NOTIFY_TOKEN', params.lineNotifyToken);
  if (params.lineChannelAccessToken !== undefined) props.setProperty('LINE_CHANNEL_ACCESS_TOKEN', params.lineChannelAccessToken);
  if (params.lineGroupId !== undefined) props.setProperty('LINE_GROUP_ID', params.lineGroupId);
  if (params.smsUsername !== undefined) props.setProperty('SMS_USERNAME', params.smsUsername);
  if (params.smsPassword !== undefined) props.setProperty('SMS_PASSWORD', params.smsPassword);
  if (params.smsSender !== undefined) props.setProperty('SMS_SENDER', params.smsSender || 'PRACHAKIJ');
  return {success: true};
}

/* ─── Get Config Settings (masked for security) ─── */
function bctGetConfigSettings_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var result = {};
  if (props['LINE_NOTIFY_TOKEN']) result.lineNotifyToken = '••••' + props['LINE_NOTIFY_TOKEN'].slice(-4);
  else result.lineNotifyToken = '';
  if (props['LINE_CHANNEL_ACCESS_TOKEN']) result.lineChannelAccessToken = '••••' + props['LINE_CHANNEL_ACCESS_TOKEN'].slice(-4);
  else result.lineChannelAccessToken = '';
  if (props['LINE_GROUP_ID']) result.lineGroupId = props['LINE_GROUP_ID'];
  else result.lineGroupId = '';
  if (props['SMS_USERNAME']) { result.smsUsername = props['SMS_USERNAME']; result.smsSender = props['SMS_SENDER'] || 'PRACHAKIJ'; result.hasSmsPass = !!props['SMS_PASSWORD']; }
  else { result.smsUsername = ''; result.smsSender = 'PRACHAKIJ'; result.hasSmsPass = false; }
  return result;
}

/* ─── Test Notification (manual run from editor) ─── */
function testNotification() {
  var params = {
    type: 'maintenance_reminder',
    plate: '3ขง-2250กท',
    name: 'บริษัท ประชากิจมอเตอร์เซลส์ จำกัด',
    phone: '0865555245',
    dueDate: '31/05/2026'
  };
  var result = bctSendNotification_(params);
  Logger.log('Notification result: ' + JSON.stringify(result));
  return result;
}

/* ═══ Public wrapper for google.script.run ═══ */
function fetchRepairOrderProxy(url) {
  return fetchRepairOrderProxy_(url);
}

/* ═══ Helper: Find B2 sheet in any spreadsheet ═══ */
// B2 sheet has different IDs in different spreadsheets
// Find by: 1) sheetId match, 2) sheet name containing 'B2', 3) sheet index
function findB2Sheet_(ss) {
  var sheets = ss.getSheets();
  // 1. Try exact sheetId (for SS_ID main spreadsheet)
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() == 1172838230) return sheets[i];
  }
  // 2. Try exact name "B2" first (work tracking sheet)
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === 'B2') return sheets[i];
  }
  // 3. Try name starting with 'B2' but NOT 'B2_' (avoids B2_แจ้งเตือนครบบำรุง)
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf('B2') === 0 && name.indexOf('B2_') !== 0) return sheets[i];
  }
  // 4. Try name containing 'B2' (fallback)
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf('B2') >= 0 || name.indexOf('b2') >= 0) return sheets[i];
  }
  // 5. Try by sheet index (B2 is typically sheet index 1)
  if (sheets.length > 1) return sheets[1];
  return null;
}

/* ═══ Helper: Find C1 sheet (completed/delivered vehicles) in any spreadsheet ═══ */
function findC1Sheet_(ss) {
  var sheets = ss.getSheets();
  // C1 tab name pattern: "C1_ตรวจรายงานใบวางบิล" (exact match first)
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf('C1') === 0 && name.indexOf('ตรวจ') >= 0) return sheets[i];
  }
  // Fallback: any tab starting with 'C1'
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf('C1') === 0) return sheets[i];
  }
  return null;
}

/* ═══ Fetch Workshop Data for Standard Time (direct spreadsheet, no self-call) ═══ */
function fetchWorkshopApi(tab, plate, year, month) {
  // This function is called from Standard_Time.html via google.script.run
  // Reads data directly from Spreadsheet to avoid GAS self-call timeout
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    
    if (tab === 'status') {
      // Return vehicle status data for a specific plate (or all)
      var statusData = getStatusDetail(ss, null, null, null);
      if (plate && statusData.vehicles) {
        var filtered = statusData.vehicles.filter(function(v) {
          return v.plate === plate || v.license === plate;
        });
        return { success: true, vehicles: filtered, total: filtered.length };
      }
      return { success: true, vehicles: statusData.vehicles || [], total: statusData.vehicles ? statusData.vehicles.length : 0 };
    }
    
    if (tab === 'overview') {
      // Return overview data with vehicle list
      var overviewData = getOverviewData(ss);
      // Filter by year/month if specified
      if (year || (month !== undefined && month !== null)) {
        var yr = year || new Date().getFullYear();
        var mo = (month !== undefined && month !== null) ? month : (new Date().getMonth() + 1);
        if (overviewData.vehicles) {
          overviewData.vehicles = overviewData.vehicles.filter(function(v) {
            var rd = v.repairDate || v.dateIn || '';
            if (!rd) return false;
            // Parse Thai date dd/M/BBBB or dd/MM/YYYY
            var parts = rd.split('/');
            if (parts.length === 3) {
              var y = parseInt(parts[2]);
              var m = parseInt(parts[1]);
              // BE year conversion
              if (y > 2400) y = y - 543;
              return y === yr && m === mo;
            }
            return false;
          });
        }
      }
      return { success: true, data: overviewData };
    }
    
    if (tab === 'movement') {
      // Return movement data for a specific plate from B2 sheet (both branches)
      if (!plate) return { success: false, error: 'Plate required for movement data' };
      var cleanPlate = plate.replace(/\s/g, '');
      var rows = [];
      
      // Search both CNB and CSK B2 sheets
      var branchIds = [
        { id: CNB_SS_ID, key: 'cnb', name: 'มหาราช' },
        { id: CSK_SS_ID, key: 'csk', name: 'ซีเอสเค' }
      ];
      
      var movementCols_B2 = [
        { key: 'knock',   name: 'เคาะ',   startI: 22, endI: 24 },
        { key: 'patch',   name: 'โป๊ว',   startI: 28, endI: 30 },
        { key: 'squirt',  name: 'พ่น',    startI: 34, endI: 36 },
        { key: 'assemble',name: 'ประกอบ', startI: 40, endI: 42 },
        { key: 'polish',  name: 'ขัดสี',   startI: 46, endI: 48 },
        { key: 'wash',    name: 'ล้าง',   startI: 51, endI: 51 }
      ];
      var movementCols_C1 = [
        { key: 'knock',   name: 'เคาะ',   startI: 16, endI: 18 },
        { key: 'patch',   name: 'โป๊ว',   startI: 21, endI: 23 },
        { key: 'squirt',  name: 'พ่น',    startI: 26, endI: 28 },
        { key: 'assemble',name: 'ประกอบ', startI: 31, endI: 33 },
        { key: 'polish',  name: 'ขัดสี',   startI: 36, endI: 38 },
        { key: 'wash',    name: 'ล้าง',   startI: 40, endI: 40 }
      ];

      function searchSheetForPlate(bSS, sheet, startRow, movementCols, brandIdx, insurerIdx) {
        var found = [];
        if (!sheet) return found;
        var lastRow = sheet.getLastRow();
        if (lastRow < startRow) return found;
        var bRows = Math.min(lastRow - startRow + 1, 500);
        if (bRows <= 0) return found;
        var bData = sheet.getRange(startRow, 1, bRows, 68).getValues();
        for (var r2 = 0; r2 < bData.length; r2++) {
          var row2 = bData[r2];
          var plate2 = String(row2[4] || '').trim().replace(/\s/g, '');
          if (!plate2) continue;
          var normP2 = normPlateGS_(plate2);
          var normClean = normPlateGS_(cleanPlate);
          if (normP2 !== normClean) continue;
          for (var mc = 0; mc < movementCols.length; mc++) {
            var mst = movementCols[mc];
            var startVal = row2[mst.startI];
            var endVal = row2[mst.endI];
            if (!startVal && !endVal) continue;
            found.push({
              station: mst.name,
              stationKey: mst.key,
              startDate: startVal ? fmtDate(startVal) : null,
              endDate: endVal ? fmtDate(endVal) : null,
              plate: plate2,
              branch: bName,
              branchKey: bKey,
              brand: String(row2[brandIdx] || '').trim(),
              insurer: String(row2[insurerIdx] || '').trim()
            });
          }
          break; // Found plate, no need to check more rows
        }
        return found;
      }
      
      for (var bi = 0; bi < branchIds.length; bi++) {
        var bKey = branchIds[bi].key;
        var bName = branchIds[bi].name;
        try {
          var bSS = SpreadsheetApp.openById(branchIds[bi].id);
          
          // Search B2 sheet first (in-progress vehicles)
          var b2S = findB2Sheet_(bSS);
          var b2Found = searchSheetForPlate(bSS, b2S, 34, movementCols_B2, 63, 65);
          if (b2Found.length > 0) {
            rows = rows.concat(b2Found);
            continue; // Found in B2, no need to check C1
          }
          
          // If not found in B2, search C1 sheet (completed/delivered vehicles)
          var c1S = findC1Sheet_(bSS);
          var c1Found = searchSheetForPlate(bSS, c1S, 31, movementCols_C1, 48, 50);
          if (c1Found.length > 0) {
            rows = rows.concat(c1Found);
          }
        } catch(e) {
          // Skip branch if spreadsheet not accessible
        }
        // Continue checking next branch (plate might exist in either CNB or CSK)
      }
      return { success: true, rows: rows, plate: plate };
    }
    
    if (tab === 'billing') {
      var billingResult = getBillingCrossref_(p.selectedTab || '', p.crossMode || 'both');
      return billingResult;
    }
    
    return { success: false, error: 'Unknown tab: ' + tab };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

/* ═══ Debug Billing — test financial totals ═══ */
function debugBilling_() {
  // Read actual spreadsheet rows to understand the total rows structure
  var ss = SpreadsheetApp.openById(CNB_SS_ID);
  var sheets = ss.getSheets();
  var debug = { tabs: [], rawRows: {} };
  
  // Find วางบิล 0469
  var sheet0469 = null;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf('วางบิล') === 0 && sheets[i].getName().indexOf('0469') >= 0) {
      sheet0469 = sheets[i]; break;
    }
  }
  
  if (sheet0469) {
    var lastCol = Math.min(sheet0469.getLastColumn(), 20);
    // Read rows 1-5 (totals + header + first data)
    var data = sheet0469.getRange(1, 1, 5, lastCol).getValues();
    debug.rawRows = {};
    for (var r = 0; r < data.length; r++) {
      debug.rawRows['row' + (r+1)] = {};
      for (var c = 0; c < data[r].length; c++) {
        var v = data[r][c];
        if (v !== '' && v !== null && v !== undefined) {
          debug.rawRows['row' + (r+1)]['col' + String.fromCharCode(65+c)] = v;
        }
      }
    }
    
    // Also read row 4 specifically (the user's reference row)
    var row4 = sheet0469.getRange(4, 1, 1, lastCol).getValues()[0];
    debug.row4specific = {};
    for (var c2 = 0; c2 < row4.length; c2++) {
      if (row4[c2] !== '' && row4[c2] !== null && row4[c2] !== undefined) {
        debug.row4specific['col' + String.fromCharCode(65+c2)] = row4[c2];
      }
    }
    
    // Now also read rows 1-2 (total rows) with column letter references
    var data12 = sheet0469.getRange(1, 1, 2, lastCol).getValues();
    debug.totalRow1 = {};
    debug.totalRow2 = {};
    for (var c3 = 0; c3 < data12[0].length; c3++) {
      var colLetter = String.fromCharCode(65 + c3);
      if (data12[0][c3] !== '' && data12[0][c3] !== null) debug.totalRow1[colLetter] = data12[0][c3];
      if (data12[1][c3] !== '' && data12[1][c3] !== null) debug.totalRow2[colLetter] = data12[1][c3];
    }
  }
  
  debug.sheetName = sheet0469 ? sheet0469.getName() : 'NOT FOUND';
  return debug;
}

/* ═══════════════════════════════════════════════════
   Billing Snapshot System — Auto-save on 29th, change detection
   ═══════════════════════════════════════════════════ */

// Save billing snapshot for all tabs in a spreadsheet
function billingSaveSnapshot_(ssId) {
  var ss = SpreadsheetApp.openById(ssId);
  var sheets = ss.getSheets();
  
  // Ensure BillingSnapshots tab exists
  var snapSheet = ss.getSheetByName('BillingSnapshots');
  if (!snapSheet) {
    snapSheet = ss.insertSheet('BillingSnapshots');
    snapSheet.getRange(1, 1, 1, 4).setValues([['แท็บ', 'วันที่สแนปชอต', 'จำนวนรายการ', 'ข้อมูล JSON']]);
    snapSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e8f0fe');
  }
  
  var now = new Date();
  var snapshotDate = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  var snapshotMonth = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM'); // e.g. 2026-05
  var savedSnapshots = [];
  
  for (var si = 0; si < sheets.length; si++) {
    var sheetName = sheets[si].getName();
    if (sheetName.indexOf('วางบิล') !== 0) continue; // Only billing tabs
    if (sheetName === 'BillingSnapshots') continue; // Skip the snapshot tab itself
    
    var lastRow = sheets[si].getLastRow();
    var lastCol = Math.min(sheets[si].getLastColumn(), 30);
    if (lastRow < 2) continue;
    
    var data = sheets[si].getRange(1, 1, lastRow, lastCol).getValues();
    
    // Detect header row (same logic as getBillingCrossref_)
    var headerRow = data[0];
    var headerOffset = 1;
    for (var hri = 0; hri < Math.min(data.length, 5); hri++) {
      var testRow = data[hri];
      var foundHeader = false;
      for (var hci = 0; hci < testRow.length; hci++) {
        var hh = String(testRow[hci] || '').trim();
        if (hh === 'ทะเบียน' || hh === 'ทะเบียนรถ' || hh.indexOf('เลขที่ JOB') >= 0 || hh === 'JOB') {
          headerRow = testRow;
          headerOffset = hri + 1;
          foundHeader = true;
          break;
        }
      }
      if (foundHeader) break;
    }
    
    // Identify columns
    var plateCol = -1, jobCol = -1, amountCol = -1;
    var khaRangKumCol = -1, khaLamgRotCol = -1, thotLoCol = -1, praMUanCol = -1;
    var khaPrapCol = -1, ruamYotCol = -1, kiPercentCol = -1, kepSuanTangCol = -1;
    for (var ci = 0; ci < headerRow.length; ci++) {
      var h = String(headerRow[ci] || '').trim();
      if (h === 'ทะเบียน' || h === 'ทะเบียนรถ') plateCol = ci;
      if (h.indexOf('เลขที่ JOB') >= 0 || h === 'JOB') jobCol = ci;
      if (h === 'จำนวนเงิน' || h === 'ยอดเงิน' || h === 'รวม' || h.indexOf('รวมยอด') >= 0 || h.indexOf('ตั้งเบิก') >= 0) amountCol = ci;
      if (h.indexOf('ค่าแรงคุม') >= 0 || h === 'SUP') khaRangKumCol = ci;
      if (h === 'ค่าล้างรถ') khaLamgRotCol = ci;
      if (h === 'ถอดล้อ') thotLoCol = ci;
      if (h.indexOf('ประเมินรายการความเสียหาย') >= 0) praMUanCol = ci;
      if (h.indexOf('ค่าปรับเลื่อนนัด') >= 0) khaPrapCol = ci;
      if (h.indexOf('รวมยอดตั้งเบิก') >= 0) ruamYotCol = ci;
      if (h.indexOf('คิดเปอร์เซ็นคุมราคา') >= 0) kiPercentCol = ci;
      if (h.indexOf('เก็บส่วนต่าง') >= 0) kepSuanTangCol = ci;
    }
    
    // Build snapshot JSON
    var plates = [];
    var jobs = [];
    var rows = [];
    function parseNum(v) { var n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    
    // Read subtotal from first data row — use LETTER-BASED columns (D-M) as primary source
    // (user specified E4, K4, M4 as the source of truth; detected columns may point to wrong col)
    var _finSubtotal = null;
    if (headerOffset < data.length && headerOffset > 0) {
      var subRow = data[headerOffset];
      var subD = {};
      for (var sci = 0; sci < Math.min(subRow.length, 20); sci++) {
        var sv = subRow[sci];
        if (sv !== '' && sv !== null && sv !== undefined) {
          subD[String.fromCharCode(65 + sci)] = sv;
        }
      }
      _finSubtotal = {
        khaRaeng: parseNum(subD['D']),
        khaRangKum: parseNum(subD['E']),
        khaLamgRot: parseNum(subD['F']),
        thotLo: parseNum(subD['G']),
        praMUan: parseNum(subD['H']),
        khaPrap: parseNum(subD['I']),
        ruamYot: parseNum(subD['K']),
        kiPercent: parseNum(subD['L']),
        kepSuanTang: parseNum(subD['M'])
      };
    }
    
    for (var ri = headerOffset; ri < data.length; ri++) {
      var rv = data[ri];
      var plate2 = plateCol >= 0 ? String(rv[plateCol] || '').trim().replace(/[\s\-]+/g, '') : '';
      var jobNo2 = jobCol >= 0 ? String(rv[jobCol] || '').trim() : '';
      var hasData = false;
      for (var kci = 0; kci < Math.min(rv.length, 10); kci++) {
        if (String(rv[kci] || '').trim()) { hasData = true; break; }
      }
      if (!plate2 && !jobNo2 && !hasData) continue;
      if (ri === headerOffset && !plate2 && !jobNo2 && _finSubtotal) continue;
      
      if (plate2) plates.push(plate2);
      if (jobNo2) jobs.push(jobNo2);
      rows.push({
        row: ri + 1,
        plate: plate2,
        jobNo: jobNo2,
        amountNum: amountCol >= 0 ? parseNum(rv[amountCol]) : 0,
        khaRangKumNum: khaRangKumCol >= 0 ? parseNum(rv[khaRangKumCol]) : 0,
        khaLamgRotNum: khaLamgRotCol >= 0 ? parseNum(rv[khaLamgRotCol]) : 0,
        thotLoNum: thotLoCol >= 0 ? parseNum(rv[thotLoCol]) : 0,
        praMUanNum: praMUanCol >= 0 ? parseNum(rv[praMUanCol]) : 0,
        khaPrapNum: khaPrapCol >= 0 ? parseNum(rv[khaPrapCol]) : 0,
        ruamYotNum: ruamYotCol >= 0 ? parseNum(rv[ruamYotCol]) : 0,
        kiPercentNum: kiPercentCol >= 0 ? parseNum(rv[kiPercentCol]) : 0,
        kepSuanTangNum: kepSuanTangCol >= 0 ? parseNum(rv[kepSuanTangCol]) : 0
      });
    }
    
    // Financial summary
    var finSum = _finSubtotal || { khaRaeng: 0, khaRangKum: 0, khaLamgRot: 0, thotLo: 0, praMUan: 0, khaPrap: 0, ruamYot: 0, kiPercent: 0, kepSuanTang: 0 };
    if (!_finSubtotal) {
      for (var fi = 0; fi < rows.length; fi++) {
        finSum.khaRaeng += rows[fi].amountNum || 0;
        finSum.khaRangKum += rows[fi].khaRangKumNum || 0;
        finSum.khaLamgRot += rows[fi].khaLamgRotNum || 0;
        finSum.thotLo += rows[fi].thotLoNum || 0;
        finSum.praMUan += rows[fi].praMUanNum || 0;
        finSum.khaPrap += rows[fi].khaPrapNum || 0;
        finSum.ruamYot += rows[fi].ruamYotNum || 0;
        finSum.kiPercent += rows[fi].kiPercentNum || 0;
        finSum.kepSuanTang += rows[fi].kepSuanTangNum || 0;
      }
    }
    finSum.ruamRaai = (finSum.khaRaeng || 0) + (finSum.kepSuanTang || 0);
    finSum.gm = finSum.ruamRaai > 0 ? ((finSum.ruamRaai - finSum.ruamYot) / finSum.ruamRaai * 100) : 0;
    
    var snapshotData = {
      snapshotMonth: snapshotMonth,
      snapshotDate: snapshotDate,
      tabName: sheetName,
      rowCount: rows.length,
      plates: plates,
      jobs: jobs,
      rows: rows,
      financial: finSum
    };
    
    // Check if snapshot for this tab+month already exists, update or insert
    var existingRows = snapSheet.getDataRange().getValues();
    var existingRowIdx = -1;
    for (var eri = 1; eri < existingRows.length; eri++) {
      if (String(existingRows[eri][0]).trim() === sheetName) {
        // Check if it's the same month
        try {
          var existingSnapJson = JSON.parse(String(existingRows[eri][3]));
          if (existingSnapJson.snapshotMonth === snapshotMonth) {
            existingRowIdx = eri + 1; // 1-indexed
            break;
          }
        } catch(e2) {}
      }
    }
    
    var jsonData = JSON.stringify(snapshotData);
    // Check size limit (Google Sheets cell limit ~50K characters is safe)
    if (jsonData.length > 45000) {
      // Compress by removing row-level detail, keep only plates/jobs/financial
      snapshotData.rows = [];
      jsonData = JSON.stringify(snapshotData);
    }
    
    if (existingRowIdx > 0) {
      // Update existing snapshot
      snapSheet.getRange(existingRowIdx, 1, 1, 4).setValues([[sheetName, snapshotDate, rows.length, jsonData]]);
    } else {
      // Append new snapshot
      snapSheet.appendRow([sheetName, snapshotDate, rows.length, jsonData]);
    }
    
    savedSnapshots.push({ tabName: sheetName, rowCount: rows.length, snapshotDate: snapshotDate });
  }
  
  return { success: true, savedSnapshots: savedSnapshots, branch: ssId };
}

// Save snapshots for all branches (called by monthly trigger on 29th)
function billingSaveAllSnapshots_() {
  var results = [];
  try {
    results.push(billingSaveSnapshot_(CNB_SS_ID));
  } catch(e1) {
    results.push({ success: false, branch: CNB_SS_ID, error: e1.message });
  }
  try {
    results.push(billingSaveSnapshot_(CSK_SS_ID));
  } catch(e2) {
    results.push({ success: false, branch: CSK_SS_ID, error: e2.message });
  }
  return results;
}

// Trigger function for monthly snapshot on 29th
function billingMonthlySnapshotTrigger_() {
  billingSaveAllSnapshots_();
}

// Read snapshot data for a specific tab from the BillingSnapshots sheet
function billingGetSnapshot_(ssId, tabName) {
  try {
    var ss = SpreadsheetApp.openById(ssId);
    var snapSheet = ss.getSheetByName('BillingSnapshots');
    if (!snapSheet) return null;
    
    var data = snapSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === tabName) {
        try {
          var snapObj = JSON.parse(String(data[i][3]));
          snapObj._snapshotDate = String(data[i][1]);
          snapObj._rowCount = Number(data[i][2]);
          return snapObj;
        } catch(e) {
          return null;
        }
      }
    }
    return null;
  } catch(e) {
    return null;
  }
}

// Detect changes between snapshot data and current live data
function billingDetectChanges_(ssId, tabName) {
  var snapshot = billingGetSnapshot_(ssId, tabName);
  if (!snapshot) return { hasSnapshot: false, hasChanges: false };
  
  // Read current live data for the tab
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return { hasSnapshot: true, snapshotDate: snapshot.snapshotDate, hasChanges: true, changes: [{ type: 'error', msg: 'Tab not found in spreadsheet' }] };
  
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(sheet.getLastColumn(), 30);
  if (lastRow < 2) {
    return { hasSnapshot: true, snapshotDate: snapshot.snapshotDate, hasChanges: snapshot.rowCount > 0, changes: [{ type: 'removed_all', msg: 'Tab is now empty' }] };
  }
  
  var liveData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  // Detect header
  var headerRow = liveData[0];
  var headerOffset = 1;
  for (var hri = 0; hri < Math.min(liveData.length, 5); hri++) {
    var foundHeader = false;
    for (var hci = 0; hci < liveData[hri].length; hci++) {
      var hh = String(liveData[hri][hci] || '').trim();
      if (hh === 'ทะเบียน' || hh === 'ทะเบียนรถ' || hh.indexOf('เลขที่ JOB') >= 0 || hh === 'JOB') {
        headerOffset = hri + 1;
        foundHeader = true;
        break;
      }
    }
    if (foundHeader) break;
  }
  
  // Find plate and job columns
  var plateCol = -1, jobCol = -1;
  for (var ci = 0; ci < headerRow.length; ci++) {
    var h = String(headerRow[ci] || '').trim();
    if (h === 'ทะเบียน' || h === 'ทะเบียนรถ') plateCol = ci;
    if (h.indexOf('เลขที่ JOB') >= 0 || h === 'JOB') jobCol = ci;
  }
  
  // Collect live plates and jobs
  var livePlates = [];
  var liveJobs = [];
  for (var ri = headerOffset; ri < liveData.length; ri++) {
    var plate = plateCol >= 0 ? String(liveData[ri][plateCol] || '').trim().replace(/[\s\-]+/g, '') : '';
    var job = jobCol >= 0 ? String(liveData[ri][jobCol] || '').trim() : '';
    if (plate) livePlates.push(plate);
    if (job) liveJobs.push(job);
  }
  
  var snapPlates = snapshot.plates || [];
  var snapJobs = snapshot.jobs || [];
  
  // Compare
  var added = [];
  var removed = [];
  
  // Added plates (in live but not in snapshot)
  var snapPlatesSet = {};
  for (var sp = 0; sp < snapPlates.length; sp++) snapPlatesSet[snapPlates[sp]] = true;
  for (var lp = 0; lp < livePlates.length; lp++) {
    if (!snapPlatesSet[livePlates[lp]]) added.push({ type: 'plate', value: livePlates[lp] });
  }
  
  // Removed plates (in snapshot but not in live)
  var livePlatesSet = {};
  for (var lp2 = 0; lp2 < livePlates.length; lp2++) livePlatesSet[livePlates[lp2]] = true;
  for (var sp2 = 0; sp2 < snapPlates.length; sp2++) {
    if (!livePlatesSet[snapPlates[sp2]]) removed.push({ type: 'plate', value: snapPlates[sp2] });
  }
  
  // Added jobs
  var snapJobsSet = {};
  for (var sj = 0; sj < snapJobs.length; sj++) snapJobsSet[snapJobs[sj]] = true;
  for (var lj = 0; lj < liveJobs.length; lj++) {
    if (!snapJobsSet[liveJobs[lj]]) added.push({ type: 'job', value: liveJobs[lj] });
  }
  
  // Removed jobs
  var liveJobsSet = {};
  for (var lj2 = 0; lj2 < liveJobs.length; lj2++) liveJobsSet[liveJobs[lj2]] = true;
  for (var sj2 = 0; sj2 < snapJobs.length; sj2++) {
    if (!liveJobsSet[snapJobs[sj2]]) removed.push({ type: 'job', value: snapJobs[sj2] });
  }
  
  // Count changes
  var rowCountChanged = (liveData.length - headerOffset) !== snapshot.rowCount;
  
  var changes = [];
  if (added.length > 0) changes.push({ type: 'added', count: added.length, items: added.slice(0, 20) }); // Limit items to 20
  if (removed.length > 0) changes.push({ type: 'removed', count: removed.length, items: removed.slice(0, 20) });
  if (rowCountChanged) changes.push({ type: 'row_count_changed', msg: 'จำนวนรายการเปลี่ยน: ' + snapshot.rowCount + ' → ' + (liveData.length - headerOffset) });
  
  // Check financial changes
  if (snapshot.financial) {
    var snapFin = snapshot.financial;
    // We'd need to recalculate financials, but for now just flag if row count changed
    if (rowCountChanged) {
      changes.push({ type: 'financial_possible_change', msg: 'ยอดการเงินอาจเปลี่ยนแปลงเนื่องจากจำนวนรายการเปลี่ยน' });
    }
  }
  
  return {
    hasSnapshot: true,
    snapshotDate: snapshot.snapshotDate,
    snapshotMonth: snapshot.snapshotMonth,
    snapshotRowCount: snapshot.rowCount,
    liveRowCount: liveData.length - headerOffset,
    hasChanges: changes.length > 0,
    changes: changes,
    addedCount: added.length,
    removedCount: removed.length
  };
}

function getBillingCrossref_(selectedTab, crossMode) {
  // crossMode: 'plate' = ทะเบียน only, 'job' = เลขที่ JOB only, 'both' = ทั้งสอง
  if (!crossMode) crossMode = 'both';
  function parseNum(v) { var n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? 0 : n }
  var branches = [
    { id: CNB_SS_ID, key: 'cnb', name: 'มหาราช' },
    { id: CSK_SS_ID, key: 'csk', name: 'ซีเอสเค' }
  ];
  var result = { success: true, cnb: { tabs: [], allRows: {}, currentJobs: [], duplicates: [] }, csk: { tabs: [], allRows: {}, currentJobs: [], duplicates: [] } };
  
  for (var bi = 0; bi < branches.length; bi++) {
    var branch = branches[bi];
    var bResult = result[branch.key];
    
    try {
      var ss = SpreadsheetApp.openById(branch.id);
      var sheets = ss.getSheets();
      var allTabsData = [];
      
      for (var si = 0; si < sheets.length; si++) {
        var sheetName = sheets[si].getName();
        if (sheetName.indexOf('วางบิล') !== 0) continue;
        
        var lastRow = sheets[si].getLastRow();
        var lastCol = Math.min(sheets[si].getLastColumn(), 30);
        if (lastRow < 2) continue;
        
        var data = sheets[si].getRange(1, 1, lastRow, lastCol).getValues();
        // Detect header row: some sheets have 2+ totals/empty rows before the actual header
        // CSK has header at row 10+ (7 empty rows + 2 subtotal rows + header)
        var headerRow = data[0];
        var headerOffset = 1; // data start row (skip header)
        var maxHeaderScan = Math.min(data.length, 15); // scan up to 15 rows
        for (var hri = 0; hri < maxHeaderScan; hri++) {
          var testRow = data[hri];
          var foundHeader = false;
          for (var hci = 0; hci < testRow.length; hci++) {
            var hh = String(testRow[hci] || '').trim();
            if (hh === 'ทะเบียน' || hh === 'ทะเบียนรถ' || hh.indexOf('เลขที่ JOB') >= 0 || hh === 'JOB') {
              headerRow = testRow;
              headerOffset = hri + 1; // data starts after header row
              foundHeader = true;
              break;
            }
          }
          if (foundHeader) break;
        }
        var plateCol = -1, jobCol = -1, nameCol = -1, brandCol = -1, amountCol = -1, dateCol = -1, statusCol = -1, saCol = -1;
        var khaRangKumCol = -1, khaLamgRotCol = -1, thotLoCol = -1, praMUanCol = -1, khaPrapCol = -1, ruamYotCol = -1, kiPercentCol = -1, kepSuanTangCol = -1;
        for (var ci = 0; ci < headerRow.length; ci++) {
          var h = String(headerRow[ci] || '').trim();
          if (h === 'ทะเบียน' || h === 'ทะเบียนรถ') plateCol = ci;
          if (h.indexOf('เลขที่ JOB') >= 0 || h === 'JOB') jobCol = ci;
          if (h === 'ชื่อ' || h === 'ชื่อลูกค้า' || h === 'ชื่อ-นามสกุล' || h === 'ชื่อ สกุล') nameCol = ci;
          if (h === 'ยี่ห้อ' || h === 'รุ่น' || h === 'ยี่ห้อรถ') brandCol = ci;
          if (h === 'จำนวนเงิน' || h === 'ยอดเงิน' || h === 'รวม' || h === 'จำนวนเงิน(บาท)' || h === 'ค่าแรงใบแจ้งหนี้' || h.indexOf('รวมยอด') >= 0 || h.indexOf('ตั้งเบิก') >= 0 || h.indexOf('ยอดเงิน') >= 0) amountCol = ci;
          if (h === 'วันที่' || h === 'วันที่วางบิล' || h === 'วันที่ส่งมอบรถ') dateCol = ci;
          if (h === 'สถานะ' || h === 'status') statusCol = ci;
          if (h === 'SA' || h === 'sa' || h === 'พนักงานขาย') saCol = ci;
          if (h.indexOf('ค่าแรงคุม') >= 0 || h === 'SUP' || h.indexOf('ต่าแรงคุม') >= 0) khaRangKumCol = ci;
          if (h === 'ค่าล้างรถ') khaLamgRotCol = ci;
          if (h === 'ถอดล้อ') thotLoCol = ci;
          if (h.indexOf('ประเมินรายการความเสียหาย') >= 0) praMUanCol = ci;
          if (h.indexOf('ค่าปรับเลื่อนนัด') >= 0) khaPrapCol = ci;
          if (h.indexOf('รวมยอดตั้งเบิก') >= 0) ruamYotCol = ci;
          if (h.indexOf('คิดเปอร์เซ็นคุมราคา') >= 0) kiPercentCol = ci;
          if (h.indexOf('เก็บส่วนต่าง') >= 0) kepSuanTangCol = ci;
        }
        
        // Fallback: scan for plate column by Thai plate pattern
        if (plateCol < 0) {
          for (var ci2 = 0; ci2 < Math.min(headerRow.length, 10); ci2++) {
            for (var ri = headerOffset; ri < Math.min(data.length, headerOffset + 8); ri++) {
              var val = String(data[ri][ci2] || '').trim().replace(/\s+/g, '');
              var platePattern = /^[1-9]?[ก-ฮ]{1,3}[-\s]?\d{1,5}([ก-ฮ]\d)?$/;
              if (platePattern.test(val) || /^[ก-ฮ]{1,3}\d{1,5}$/.test(val)) { plateCol = ci2; break; }
            }
            if (plateCol >= 0) break;
          }
        }
        
        var tabRows = [];
        // Read financial subtotal from first data row — use LETTER-BASED columns (D-M) as primary source
        var _finSubtotal = null;
        if (headerOffset < data.length && headerOffset > 0) {
          var subRow = data[headerOffset];
          var subD = {};
          for (var sci = 0; sci < Math.min(subRow.length, 20); sci++) {
            var sv = subRow[sci];
            if (sv !== '' && sv !== null && sv !== undefined) {
              subD[String.fromCharCode(65 + sci)] = sv;
            }
          }
          _finSubtotal = {
            khaRaeng: parseNum(subD['D']),
            khaRangKum: parseNum(subD['E']),
            khaLamgRot: parseNum(subD['F']),
            thotLo: parseNum(subD['G']),
            praMUan: parseNum(subD['H']),
            khaPrap: parseNum(subD['I']),
            ruamYot: parseNum(subD['K']),
            kiPercent: parseNum(subD['L']),
            kepSuanTang: parseNum(subD['M'])
          };
        }
        for (var ri2 = headerOffset; ri2 < data.length; ri2++) {
          var rv = data[ri2];
          var plate2 = plateCol >= 0 ? String(rv[plateCol] || '').trim().replace(/[\s\-]+/g, '') : '';
          var jobNo2 = jobCol >= 0 ? String(rv[jobCol] || '').trim() : '';
          var hasData = false;
          for (var kci = 0; kci < Math.min(rv.length, 10); kci++) {
            if (String(rv[kci] || '').trim()) { hasData = true; break; }
          }
          if (!plate2 && !jobNo2 && !hasData) continue;
          // Skip subtotal row (first data row with no plate/JOB but large numeric values)
          if (ri2 === headerOffset && !plate2 && !jobNo2 && _finSubtotal) continue;
          tabRows.push({
            row: ri2 + 1,
            plate: plate2,
            jobNo: jobNo2,
            name: nameCol >= 0 ? String(rv[nameCol] || '').trim() : '',
            brand: brandCol >= 0 ? String(rv[brandCol] || '').trim() : '',
            amount: amountCol >= 0 ? String(rv[amountCol] || '').trim() : '',
            date: dateCol >= 0 ? String(rv[dateCol] || '').trim() : '',
            status: statusCol >= 0 ? String(rv[statusCol] || '').trim() : '',
            sa: saCol >= 0 ? String(rv[saCol] || '').trim() : '',
            amountNum: amountCol >= 0 ? parseNum(rv[amountCol]) : 0,
            khaRangKum: khaRangKumCol >= 0 ? String(rv[khaRangKumCol] || '').trim() : '',
            khaRangKumNum: khaRangKumCol >= 0 ? parseNum(rv[khaRangKumCol]) : 0,
            khaLamgRot: khaLamgRotCol >= 0 ? String(rv[khaLamgRotCol] || '').trim() : '',
            khaLamgRotNum: khaLamgRotCol >= 0 ? parseNum(rv[khaLamgRotCol]) : 0,
            thotLo: thotLoCol >= 0 ? String(rv[thotLoCol] || '').trim() : '',
            thotLoNum: thotLoCol >= 0 ? parseNum(rv[thotLoCol]) : 0,
            praMUan: praMUanCol >= 0 ? String(rv[praMUanCol] || '').trim() : '',
            praMUanNum: praMUanCol >= 0 ? parseNum(rv[praMUanCol]) : 0,
            khaPrap: khaPrapCol >= 0 ? String(rv[khaPrapCol] || '').trim() : '',
            khaPrapNum: khaPrapCol >= 0 ? parseNum(rv[khaPrapCol]) : 0,
            ruamYot: ruamYotCol >= 0 ? String(rv[ruamYotCol] || '').trim() : '',
            ruamYotNum: ruamYotCol >= 0 ? parseNum(rv[ruamYotCol]) : 0,
            kiPercent: kiPercentCol >= 0 ? String(rv[kiPercentCol] || '').trim() : '',
            kiPercentNum: kiPercentCol >= 0 ? parseNum(rv[kiPercentCol]) : 0,
            kepSuanTang: kepSuanTangCol >= 0 ? String(rv[kepSuanTangCol] || '').trim() : '',
            kepSuanTangNum: kepSuanTangCol >= 0 ? parseNum(rv[kepSuanTangCol]) : 0
          });
        }
        
        bResult.tabs.push({
          name: sheetName,
          rows: tabRows.length,
          plateCol: plateCol,
          jobCol: jobCol
        });
        bResult.allRows[sheetName] = tabRows;
        allTabsData.push({ tabName: sheetName, rows: tabRows, _financial: _finSubtotal, _headerOffset: headerOffset });
      }
      
      // Snapshot info disabled during page load (too slow - 48 spreadsheet opens)
      bResult.snapshots = {};
      bResult.changes = {};
      
      // Sort tabs by name descending (latest first)
      allTabsData.sort(function(a, b) {
        // Parse MMYY for proper sorting
        var parseMYY = function(s) { var n = (s||'').replace(/[^0-9]/g,''); if (n.length < 3) return 0; var mm = parseInt(n.substring(0, n.length-2),10)||0; var yy = parseInt(n.substring(n.length-2),10)||0; return yy*100+mm; };
        return parseMYY(b.tabName) - parseMYY(a.tabName);
      });
      
      // Determine which tab to cross-reference
      var currentTab = null;
      if (selectedTab && selectedTab.indexOf(':') > 0) {
        // Selected specific tab: format "branchKey:tabName"
        var parts = selectedTab.split(':');
        var selBranchKey = parts[0];
        var selTabName = parts.slice(1).join(':');
        if (selBranchKey === branch.key) {
          for (var st = 0; st < allTabsData.length; st++) {
            if (allTabsData[st].tabName === selTabName) { currentTab = allTabsData[st]; break; }
          }
        }
      }
      // Fallback: use latest tab (highest MMYY)
      if (!currentTab && allTabsData.length > 0) currentTab = allTabsData[0];
      
      if (currentTab) {
        bResult.currentMonth = currentTab.tabName;
        bResult.currentJobs = currentTab.rows;
        
        // Use financial summary from subtotal row (already read during tab scan)
        var finSum = currentTab._financial || null;
        if (!finSum) {
          // Fallback: sum from rows if no subtotal row found
          finSum = {
            khaRaeng: 0, khaRangKum: 0, khaLamgRot: 0, thotLo: 0,
            praMUan: 0, khaPrap: 0, ruamYot: 0, kiPercent: 0, kepSuanTang: 0
          };
          for (var fi = 0; fi < currentTab.rows.length; fi++) {
            var fRow = currentTab.rows[fi];
            finSum.khaRaeng += fRow.amountNum || 0;
            finSum.khaRangKum += fRow.khaRangKumNum || 0;
            finSum.khaLamgRot += fRow.khaLamgRotNum || 0;
            finSum.thotLo += fRow.thotLoNum || 0;
            finSum.praMUan += fRow.praMUanNum || 0;
            finSum.khaPrap += fRow.khaPrapNum || 0;
            finSum.ruamYot += fRow.ruamYotNum || 0;
            finSum.kiPercent += fRow.kiPercentNum || 0;
            finSum.kepSuanTang += fRow.kepSuanTangNum || 0;
          }
        }
        finSum.ruamRaai = (finSum.khaRaeng || 0) + (finSum.kepSuanTang || 0);
        finSum.gm = finSum.ruamRaai > 0 ? ((finSum.ruamRaai - finSum.ruamYot) / finSum.ruamRaai * 100) : 0;
        // Set financial for ALL branches (both should show their own financial data)
        bResult.financial = finSum;
        
        // Total tabs across both branches
        bResult.totalTabs = (result.cnb.tabs || []).length + (result.csk ? (result.csk.tabs || []).length : 0);
        
        // Cross-reference: check each current entry against ALL other tabs
        for (var ci3 = 0; ci3 < currentTab.rows.length; ci3++) {
          var job = currentTab.rows[ci3];
          for (var ti2 = 0; ti2 < allTabsData.length; ti2++) {
            // Only cross-reference with OTHER tabs (exclude same-tab matches)
            if (allTabsData[ti2].tabName === currentTab.tabName) continue;
            for (var ri3 = 0; ri3 < allTabsData[ti2].rows.length; ri3++) {
              var otherJob = allTabsData[ti2].rows[ri3];
              var isDup = false;
              var dupReason = '';
              if (crossMode === 'plate' || crossMode === 'both') {
                if (job.plate && otherJob.plate && job.plate === otherJob.plate) { isDup = true; dupReason = 'ทะเบียน'; }
              }
              if (crossMode === 'job' || crossMode === 'both') {
                if (job.jobNo && otherJob.jobNo && job.jobNo === otherJob.jobNo) { isDup = true; dupReason = dupReason ? dupReason + '+เลขที่ JOB' : 'เลขที่ JOB'; }
              }
              if (isDup) {
                bResult.duplicates.push({
                  currentPlate: job.plate,
                  currentJobNo: job.jobNo,
                  currentRow: job.row,
                  duplicateIn: allTabsData[ti2].tabName,
                  duplicateRow: otherJob.row,
                  duplicatePlate: otherJob.plate,
                  duplicateJobNo: otherJob.jobNo,
                  currentName: job.name,
                  currentAmount: job.amount,
                  duplicateName: otherJob.name,
                  duplicateAmount: otherJob.amount,
                  dupReason: dupReason
                });
              }
            }
          }
        }
        
        // Compute unique duplicate counts by reason (after cross-ref loop)
        var uniquePlate = {}, uniqueJob = {}, uniqueBoth = {};
        for (var di5 = 0; di5 < bResult.duplicates.length; di5++) {
          var dd = bResult.duplicates[di5];
          if (dd.dupReason === 'ทะเบียน') uniquePlate[dd.currentPlate] = true;
          else if (dd.dupReason === 'เลขที่ JOB') uniqueJob[dd.currentJobNo] = true;
          else if (dd.dupReason === 'ทะเบียน+เลขที่ JOB') uniqueBoth[dd.currentPlate] = true;
        }
        bResult.dupCounts = {
          plateCount: Object.keys(uniquePlate).length,
          jobCount: Object.keys(uniqueJob).length,
          bothCount: Object.keys(uniqueBoth).length
        };
      }
    } catch(err2) {
      bResult.error = err2.message;
    }
  }
  return result;
}

/* ═══ Build วางบิล Page HTML ═══ */
function buildBillingPage_(p) {
  // Phase 1: Just load tab list (fast), or Phase 2: cross-ref selected tab
  var selectedTab = p.selectedTab || '';
  var crossMode = p.crossMode || 'both';
  var data;
  try {
    data = getBillingCrossref_(selectedTab, crossMode);
  } catch(e) {
    data = { success: false, cnb: { error: e.message, tabs: [], currentJobs: [], duplicates: [] }, csk: { error: e.message, tabs: [], currentJobs: [], duplicates: [] } };
  }
  // Auto-select first CNB tab if no selectedTab specified  
  // Also set selectedTabCSK so both branches load data
  var selectedTabCSK = '';
  if (!selectedTab) {
    if (data.cnb && data.cnb.currentMonth) {
      selectedTab = 'cnb:' + data.cnb.currentMonth;
    }
    if (data.csk && data.csk.currentMonth) {
      selectedTabCSK = 'csk:' + data.csk.currentMonth;
    }
  }
  
  var branches = ['cnb', 'csk'];
  var branchNames = { cnb: '🏪 มหาราช (CNB)', csk: '🏗️ CSK' };
  var branchColors = { cnb: '#2563eb', csk: '#16a34a' };
  var branchKeys = { cnb: 'cnb', csk: 'csk' };
  
  // Build dropdown options for each branch
  var cnbTabs = (data.cnb && data.cnb.tabs) || [];
  var cskTabs = (data.csk && data.csk.tabs) || [];
  // Sort tabs by name descending (latest first)
  cnbTabs.sort(function(a,b) {
    // Parse MMYY: "วางบิล 0469" → MM=04, YY=69 → sort value = 69*100+4 = 6904
    var parseMYY = function(s) { var n = (s||'').replace(/[^0-9]/g,''); if (n.length < 3) return 0; var mm = parseInt(n.substring(0, n.length-2),10)||0; var yy = parseInt(n.substring(n.length-2),10)||0; return yy*100+mm; };
    return parseMYY(b.name) - parseMYY(a.name);
  });
  cskTabs.sort(function(a,b) {
    var parseMYY = function(s) { var n = (s||'').replace(/[^0-9]/g,''); if (n.length < 3) return 0; var mm = parseInt(n.substring(0, n.length-2),10)||0; var yy = parseInt(n.substring(n.length-2),10)||0; return yy*100+mm; };
    return parseMYY(b.name) - parseMYY(a.name);
  });
  
  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  html += '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">';
  html += '<meta http-equiv="Pragma" content="no-cache">';
  html += '<meta http-equiv="Expires" content="0">';
  html += '<title>วางบิล — กระทบข้อมูลซ้ำ</title>';
  html += '<style>';
  html += '*{box-sizing:border-box}body{font-family:"Sarabun",Tahoma,sans-serif;margin:0;background:#f0f2f5;color:#1e293b;padding-bottom:28px}';
  html += '.header{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px}';
  html += '.header h1{margin:0;font-size:1.3rem}.header .sub{opacity:.85;font-size:.85rem;margin-top:2px}';
  html += '.tabs-bar{display:flex;background:#fff;border-bottom:2px solid #e5e7eb;padding:0}';
  html += '.tab-btn{padding:12px 24px;cursor:pointer;font-weight:700;border:none;border-bottom:3px solid transparent;background:#fff;color:#64748b;font-size:1rem;transition:.2s}';
  html += '.tab-btn:hover{background:#f0f7ff}.tab-btn.active{border-bottom-color:#2563eb;color:#2563eb}';
  html += '.content{padding:20px;max-width:1400px;margin:0 auto}';
  html += '.toolbar{background:#fff;border-radius:10px;padding:16px 20px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}';
  html += '.toolbar label{font-weight:700;font-size:.95rem;min-width:120px}';
  html += '.toolbar select{padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:.95rem;min-width:220px;background:#fff}';
  html += '.toolbar button{padding:10px 24px;border:none;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;transition:.2s}';
  html += '.btn-primary{background:#2563eb;color:#fff}.btn-primary:hover{background:#1d4ed8}';
  html += '.badge{display:inline-block;padding:2px 10px;border-radius:9999px;font-size:.8rem;font-weight:600;color:#fff}';
  html += '.badge-green{background:#16a34a}.badge-red{background:#dc2626}.badge-blue{background:#2563eb}.badge-amber{background:#d97706}.badge-gray{background:#64748b}';
  html += '.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0}';
  html += '.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.05)}';
  html += '.card .num{font-size:1.8rem;font-weight:800}.card .label{font-size:.8rem;color:#64748b;margin-top:4px}';
  html += 'table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:12px}';
  html += 'th{background:#f8fafc;padding:8px 10px;text-align:left;font-weight:700;border-bottom:2px solid #e5e7eb;white-space:nowrap}';
  html += 'td{padding:6px 10px;border-bottom:1px solid #f1f5f9}';
  html += 'tr:hover{background:#f0f7ff}';
  html += '.dup-row{background:#fef2f2 !important}.dup-hl{color:#dc2626;font-weight:700}';
  html += '.dup-plate{border-left:4px solid #dc2626 !important;background:#fef2f2 !important}';
  html += '.dup-job{border-left:4px solid #2563eb !important;background:#eff6ff !important}';
  html += '.dup-both{border-left:4px solid #7c3aed !important;background:#faf5ff !important}';
  html += '.badge-plate{background:#dc2626;color:#fff;padding:4px 14px;font-size:1rem;font-weight:800;border-radius:6px;display:inline-block}.badge-job{background:#2563eb;color:#fff;padding:4px 14px;font-size:1rem;font-weight:800;border-radius:6px;display:inline-block}.badge-both{background:#7c3aed;color:#fff;padding:4px 14px;font-size:1rem;font-weight:800;border-radius:6px;display:inline-block}';
  html += '.ok-row{background:#f0fdf4 !important}.ok-hl{color:#16a34a;font-weight:700}';
  html += '.section{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1)}';
  html += '.section h3{margin:0 0 12px;font-size:1.1rem}';
  html += '.tab-pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}';
  html += '.pill{background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:9999px;font-size:.75rem;font-weight:600}';
  html += '.empty{text-align:center;padding:40px;color:#16a34a;font-weight:700}';
  html += '.fin-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin:12px 0;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:.9rem}';
  html += '.fin-grid .fl{color:#64748b;font-size:.8rem}.fin-grid .fv{font-weight:700;text-align:right}';
  html += '.fin-total{background:#eff6ff;border:2px solid #2563eb;border-radius:10px;padding:12px 16px;margin:8px 0;text-align:center}';
  html += '.fin-gm{background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:12px 16px;margin:8px 0;text-align:center}';
        html += '.changes-section{background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;padding:16px;margin:12px 0}';
  html += '.changes-section h4{margin:0 0 8px;color:#92400e}';
  html += '.changes-list{font-size:.85rem;color:#78350f}';
  html += '.editlog-row:hover{background:#fffbeb !important}';
  html += '@media(max-width:768px){.content{padding:12px}.toolbar{flex-direction:column}table{font-size:.75rem}th,td{padding:4px 6px}}';
  html += '</style></head><body>';
  
  // Header
  html += '<div class="header" style="position:relative"><div><h1>📋 วางบิล — กระทบข้อมูลซ้ำ</h1><span style="position:absolute;top:12px;right:16px;background:#dc2626;color:white;font-size:.65rem;padding:3px 8px;border-radius:10px;font-weight:700;letter-spacing:.5px;z-index:10;box-shadow:0 2px 8px rgba(220,38,38,.3)">🔒 PDPA ข้อมูลลับ</span>';
  html += '<div class="sub">เลือกแท็บวางบิลที่ต้องการกระทบ → ตรวจสอบทะเบียนและเลขที่ JOB ที่ซ้ำกับเดือนอื่น</div></div></div>';
  
  // Branch tabs — set active based on selectedTab
  var cnbActive = (!selectedTab || selectedTab.indexOf('cnb') === 0);
  html += '<div class="tabs-bar">';
  html += '<button class="tab-btn' + (cnbActive ? ' active' : '') + '" id="tab-cnb" onclick="showBranch(\'cnb\')" style="' + (cnbActive ? 'border-bottom-color:' + branchColors.cnb + ';color:' + branchColors.cnb : '') + '">' + branchNames.cnb + '</button>';
  html += '<button class="tab-btn' + (!cnbActive && selectedTab !== 'editlog' ? ' active' : '') + '" id="tab-csk" onclick="showBranch(\'csk\')" style="' + (!cnbActive && selectedTab !== 'editlog' ? 'border-bottom-color:' + branchColors.csk + ';color:' + branchColors.csk : '') + '">' + branchNames.csk + '</button>';
  html += '<button class="tab-btn' + (selectedTab === 'editlog' ? ' active' : '') + '" id="tab-editlog" onclick="showBranch(\'editlog\')" style="' + (selectedTab === 'editlog' ? 'border-bottom-color:#d97706;color:#d97706' : '') + '">📝 บันทึกการแก้ไข</button>';
  html += '</div>';
  
  html += '<div class="content">';
  html += '<div id="loading-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center"><div style="background:#fff;border-radius:12px;padding:24px 40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.3)"><div style="font-size:2rem;margin-bottom:8px">⏳</div><div style="font-weight:700;color:#1e293b">กำลังโหลดข้อมูล...</div><div style="font-size:.85rem;color:#64748b;margin-top:4px">กรุณารอสักครู่</div></div></div>';
  
  for (var bi = 0; bi < branches.length; bi++) {
    var bKey = branches[bi];
    var bData = data[bKey] || { tabs: [], currentJobs: [], duplicates: [] };
    var tabs = bData.tabs || [];
    var curJobs = bData.currentJobs || [];
    var dups = bData.duplicates || [];
    var curMonth = bData.currentMonth || '';
    var hasError = bData.error;
    
    var isDefaultBranch = (bKey === 'cnb' && (!selectedTab || selectedTab.indexOf('cnb') === 0)) || (bKey === 'csk' && selectedTab && selectedTab.indexOf('csk') === 0);
    html += '<div class="section" id="section-' + bKey + '" style="' + (isDefaultBranch ? '' : 'display:none') + '">';
    
    // Toolbar: select tab + cross mode + buttons
    html += '<div class="toolbar">';
    html += '<label>🔍 เลือกแท็บ:</label>';
    html += '<select id="select-' + bKey + '">';
    for (var ti = 0; ti < tabs.length; ti++) {
      var sel = (bKey + ':' + tabs[ti].name === selectedTab || (!selectedTab && ti === 0)) ? ' selected' : '';
      html += '<option value="' + bKey + ':' + escapeHtml(tabs[ti].name) + '"' + sel + '>' + escapeHtml(tabs[ti].name) + ' (' + tabs[ti].rows + ' รายการ)</option>';
    }
    html += '</select>';
    html += '<label style="margin-left:8px">กระทบโดย:</label>';
    html += '<select id="mode-' + bKey + '" style="min-width:160px">';
    html += '<option value="both"' + (crossMode === 'both' ? ' selected' : '') + '>ทะเบียน + เลขที่ JOB</option>';
    html += '<option value="plate"' + (crossMode === 'plate' ? ' selected' : '') + '>ทะเบียน เท่านั้น</option>';
    html += '<option value="job"' + (crossMode === 'job' ? ' selected' : '') + '>เลขที่ JOB เท่านั้น</option>';
    html += '</select>';
    html += '<button class="btn-primary" onclick="doCrossRef(\'' + bKey + '\')">⚡ กระทบข้อมูล</button>';
    html += '<span style="font-size:.85rem;color:#64748b" id="status-' + bKey + '"></span>';
    html += '</div>';
    
    if (hasError) {
      html += '<p style="color:#dc2626">⚠️ เกิดข้อผิดพลาด: ' + escapeHtml(String(hasError)) + '</p>';
    } else if (!curMonth && tabs.length === 0) {
      html += '<div style="text-align:center;padding:40px"><div style="font-size:3rem;margin-bottom:12px">📭</div><div style="font-size:1.1rem;font-weight:700;color:#64748b">ไม่พบแท็บวางบิลในสาขานี้</div><div style="font-size:.9rem;color:#94a3b8;margin-top:4px">กรุณาตรวจสอบว่าสเปรดชีตมีแท็บที่ขึ้นต้นด้วย "วางบิล"</div></div>';
    } else if (!curMonth) {
      html += '<div style="text-align:center;padding:40px"><div style="font-size:3rem;margin-bottom:12px">📊</div><div style="font-size:1.1rem;font-weight:700;color:#1e293b">กด ⚡ กระทบข้อมูล เพื่อโหลดข้อมูลสาขานี้</div><div style="font-size:.9rem;color:#64748b;margin-top:4px">เลือกแท็บวางบิลและกดปุ่มกระทบ</div></div>';
    } else if (curMonth) {
      // Get duplicate counts and financial data
      var dupCounts = bData.dupCounts || { plateCount: 0, jobCount: 0, bothCount: 0 };
      var fin = bData.financial || null;
      var totalTabs = bData.totalTabs || tabs.length;
      
      // Helper to format number with commas and 2 decimal places
      function fmtNum(n) { return Number(n || 0).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
      
      // Summary cards — now include duplicate-type breakdown and total tabs note
      html += '<div class="summary">';
      html += '<div class="card"><div class="num" style="color:#2563eb">' + curJobs.length + '</div><div class="label">รายการในแท็บ<br>' + escapeHtml(curMonth) + '</div></div>';
      html += '<div class="card"><div class="num" style="color:#dc2626">' + dups.length + '</div><div class="label">⚠️ ซ้ำกับเดือนอื่น</div></div>';
      html += '<div class="card"><div class="num" style="color:#dc2626">' + dupCounts.plateCount + '</div><div class="label">🔴 ทะเบียนซ้ำ<br>(คัน)</div></div>';
      html += '<div class="card"><div class="num" style="color:#7c3aed">' + dupCounts.bothCount + '</div><div class="label">🟣 ทะเบียน+JOBซ้ำ<br>(คัน)</div></div>';
      html += '<div class="card"><div class="num" style="color:#2563eb">' + dupCounts.jobCount + '</div><div class="label">🔵 เลขที่ JOBซ้ำ<br>(คัน)</div></div>';
      html += '<div class="card"><div class="num" style="color:#16a34a">' + (curJobs.length - dups.length) + '</div><div class="label">✅ ไม่ซ้ำ</div></div>';
      html += '<div class="card"><div class="num" style="color:#64748b">' + totalTabs + '</div><div class="label">📊 แท็บวางบิลทั้งหมด<br>(สาขาทั้งหมด)</div></div>';
      html += '</div>';
      
      // Tab pills with total tabs note
      html += '<div style="margin:8px 0"><strong>แท็บวางบิล:</strong> <span class="tab-pills">';
      for (var pi = 0; pi < tabs.length; pi++) {
        var isCur = tabs[pi].name === curMonth;
        html += '<span class="pill" style="' + (isCur ? 'background:#2563eb;color:#fff' : '') + '">' + escapeHtml(tabs[pi].name) + ' (' + tabs[pi].rows + ')</span> ';
      }
      html += '</span><span style="margin-left:8px;font-size:.8rem;color:#64748b">📊 ตรวจพบ ' + totalTabs + ' แท็บวางบิลทั้งหมด (CNB + CSK)</span></div>';
      
      // Financial summary section
      if (fin) {
        html += '<div class="section">';
        html += '<h3>💰 สรุปยอดการเงิน</h3>';
        html += '<div class="fin-grid">';
        html += '<div><span class="fl">ค่าแรงใบแจ้งหนี้</span></div><div><span class="fv">' + fmtNum(fin.khaRaeng) + '</span></div>';
        html += '<div><span class="fl">ค่าแรงคุม SUP</span></div><div><span class="fv">' + fmtNum(fin.khaRangKum) + '</span></div>';
        html += '<div><span class="fl">ค่าล้างรถ</span></div><div><span class="fv">' + fmtNum(fin.khaLamgRot) + '</span></div>';
        html += '<div><span class="fl">ถอดล้อ</span></div><div><span class="fv">' + fmtNum(fin.thotLo) + '</span></div>';
        html += '<div><span class="fl">ประเมินรายการความเสียหาย</span></div><div><span class="fv">' + fmtNum(fin.praMUan) + '</span></div>';
        html += '<div><span class="fl">ค่าปรับเลื่อนนัด</span></div><div><span class="fv">' + fmtNum(fin.khaPrap) + '</span></div>';
        html += '<div><span class="fl">รวมยอดตั้งเบิก(หักค่าปรับแล้ว)</span></div><div><span class="fv">' + fmtNum(fin.ruamYot) + '</span></div>';
        html += '<div><span class="fl">คิดเปอร์เซ็นคุมราคา</span></div><div><span class="fv">' + fmtNum(fin.kiPercent) + '</span></div>';
        html += '<div><span class="fl">เก็บส่วนต่าง</span></div><div><span class="fv">' + fmtNum(fin.kepSuanTang) + '</span></div>';
        html += '</div>';
        html += '<div class="fin-total"><div style="font-size:.85rem;color:#2563eb">รวมรายได้</div><div style="font-size:1.5rem;font-weight:800;color:#1e293b">' + fmtNum(fin.ruamRaai) + '</div><div style="font-size:.75rem;color:#64748b">= ค่าแรงใบแจ้งหนี้ + เก็บส่วนต่าง</div></div>';
        html += '<div class="fin-gm"><div style="font-size:.85rem;color:#16a34a">GM กำไรขั้นต้น</div><div style="font-size:1.5rem;font-weight:800;color:#16a34a">' + fin.gm.toFixed(2) + '%</div><div style="font-size:.75rem;color:#64748b">= (รวมรายได้ - รวมยอดตั้งเบิก) / รวมรายได้ × 100</div></div>';
        html += '</div>';
      }
      
      // Duplicate entries table
      if (dups.length > 0) {
        html += '<div class="section">';
        html += '<h3>⚠️ รายการที่ซ้ำกับเดือนอื่น (' + dups.length + ' รายการ)</h3>';
        html += '<p style="font-size:.85rem;color:#64748b;margin-bottom:12px">ตรวจสอบทะเบียนและเลขที่ JOB ที่ซ้ำกับเดือนอื่น — <span style="color:#dc2626">🔴 ทะเบียนซ้ำ</span> <span style="color:#7c3aed">🟣 ทะ+JOBซ้ำ</span> <span style="color:#2563eb">🔵 JOBซ้ำ</span></p>';
        html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem">';
        html += '<thead><tr style="background:#1e3a5f;color:#fff">';
        html += '<th style="padding:8px 12px;text-align:left">ทะเบียน</th>';
        html += '<th style="padding:8px 12px;text-align:left">เลขที่ JOB</th>';
        html += '<th style="padding:8px 12px;text-align:left">ชื่อ</th>';
        html += '<th style="padding:8px 12px;text-align:right">ยอด (' + escapeHtml(curMonth) + ') ฿</th>';
        html += '<th style="padding:8px 12px;text-align:left">ซ้ำในแท็บ</th>';
        html += '<th style="padding:8px 12px;text-align:left">ทะเบียนซ้ำ</th>';
        html += '<th style="padding:8px 12px;text-align:left">JOB ซ้ำ</th>';
        html += '<th style="padding:8px 12px;text-align:right">ยอด (ซ้ำ) ฿</th>';
        html += '<th style="padding:8px 12px;text-align:left">ประเภท</th>';
        html += '</tr></thead><tbody>';
        for (var di = 0; di < dups.length; di++) {
          var dd = dups[di];
          var dupType = 'both';
          if (dd.dupReason === 'ทะเบียน') dupType = 'plate';
          else if (dd.dupReason === 'เลขที่ JOB') dupType = 'job';
          else if (dd.dupReason === 'ทะเบียน+เลขที่ JOB') dupType = 'both';
          else if (dd.dupReason === 'plate') dupType = 'plate';
          else if (dd.dupReason === 'job') dupType = 'job';
          var badgeClass = dupType === 'plate' ? 'badge-plate' : (dupType === 'job' ? 'badge-job' : 'badge-both');
          var badgeLabel = dupType === 'plate' ? '🔴 ทะเบียน' : (dupType === 'job' ? '🔵 JOB' : '🟣 ทะ+JOB');
          html += '<tr class="dup-' + dupType + '">';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.currentPlate) + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.currentJobNo) + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.currentName) + '</td>';
          html += '<td style="padding:6px 12px;text-align:right">' + escapeHtml(dd.currentAmount) + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.duplicateIn) + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.duplicatePlate) + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(dd.duplicateJobNo) + '</td>';
          html += '<td style="padding:6px 12px;text-align:right">' + escapeHtml(dd.duplicateAmount) + '</td>';
          html += '<td style="padding:6px 12px"><span class="' + badgeClass + '">' + badgeLabel + '</span></td>';
          html += '</tr>';
        }
        html += '</tbody></table></div></div>';
      }
      
      // All entries table
      if (curJobs.length > 0) {
        html += '<div class="section">';
        html += '<h3>📋 รายการทั้งหมด (' + curJobs.length + ' รายการ)</h3>';
        html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem">';
        html += '<thead><tr style="background:#1e3a5f;color:#fff">';
        html += '<th style="padding:8px 12px;text-align:left">แถว</th>';
        html += '<th style="padding:8px 12px;text-align:left">ทะเบียน</th>';
        html += '<th style="padding:8px 12px;text-align:left">เลขที่ JOB</th>';
        html += '<th style="padding:8px 12px;text-align:left">ชื่อ</th>';
        html += '<th style="padding:8px 12px;text-align:right">ยอด (฿)</th>';
        html += '<th style="padding:8px 12px;text-align:left">วันที่</th>';
        html += '<th style="padding:8px 12px;text-align:left">สถานะ</th>';
        html += '</tr></thead><tbody>';
        for (var ji = 0; ji < curJobs.length; ji++) {
          var job = curJobs[ji];
          var isDup = false;
          for (var di2 = 0; di2 < dups.length; di2++) {
            if (dups[di2].currentRow === job.row) { isDup = true; break; }
          }
          var rowClass = isDup ? 'dup-row' : 'ok-row';
          html += '<tr class="' + rowClass + '">';
          html += '<td style="padding:6px 12px">' + (job.row || '') + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(job.plate || '') + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(job.jobNo || '') + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(job.name || '') + '</td>';
          html += '<td style="padding:6px 12px;text-align:right">' + escapeHtml(job.amount || '') + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(job.date || '') + '</td>';
          html += '<td style="padding:6px 12px">' + escapeHtml(job.status || '') + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div></div>';
      }
      
  }
    
    html += '</div>';
  }
  
  // ── Edit Log section ──
  var editLogData = null;
  try { editLogData = getBillingEditLog_({limit: 200}); } catch(e) { editLogData = {success: false, logs: [], count: 0, message: 'ไม่สามารถโหลดข้อมูล: ' + e.message}; }
  html += '<div class="section" id="section-editlog" style="' + (selectedTab === 'editlog' ? '' : 'display:none') + '">';
  html += '<h3>📝 บันทึกการแก้ไขแท็บวางบิล</h3>';
  html += '<p style="color:#64748b;font-size:.9rem;margin:4px 0 12px">บันทึกอัตโนมัติทุกครั้งที่มีการแก้ไขข้อมูลในแท็บ "วางบิล" ของ CNB มหาราช และ CSK</p>';
  // Filter bar
  html += '<div class="toolbar" style="margin-bottom:12px">';
  html += '<label>กรองตามสาขา:</label>';
  html += '<select id="log-branch-filter" onchange="filterEditLog()">';
  html += '<option value="">ทั้งหมด</option>';
  html += '<option value="มหาราช">🏪 มหาราช (CNB)</option>';
  html += '<option value="ซีเอสเค">🏗️ CSK</option>';
  html += '</select>';
  html += '<span style="margin-left:12px;font-size:.85rem;color:#64748b" id="log-count">กำลังโหลด...</span>';
  html += '</div>';
  if (editLogData && editLogData.logs && editLogData.logs.length > 0) {
    html += '<div style="overflow-x:auto">';
    html += '<table style="width:100%;font-size:.85rem">';
    html += '<thead><tr style="background:#f8fafc">';
    html += '<th style="white-space:nowrap">⏰ เวลา</th>';
    html += '<th>สาขา</th>';
    html += '<th>แท็บ</th>';
    html += '<th>ทะเบียน/JOB</th>';
    html += '<th>แถว</th>';
    html += '<th>คอลัมน์</th>';
    html += '<th>ค่าเก่า</th>';
    html += '<th>ค่าใหม่</th>';
    html += '<th>ผู้แก้ไข</th>';
    html += '</tr></thead><tbody id="editlog-tbody">';
    var logs = editLogData.logs;
    for (var li = 0; li < logs.length; li++) {
      var log = logs[li];
      var ts = log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 16) : '';
      var branchBadge = log.branch === 'มหาราช' ? '<span class="badge badge-blue">' + escapeHtml(log.branch) + '</span>' : '<span class="badge badge-green">' + escapeHtml(log.branch) + '</span>';
      html += '<tr data-branch="' + escapeHtml(log.branch) + '">';
      html += '<td style="white-space:nowrap">' + ts + '</td>';
      html += '<td>' + branchBadge + '</td>';
      html += '<td>' + escapeHtml(log.tab) + '</td>';
      html += '<td style="font-weight:700">' + escapeHtml(log.identifier) + '</td>';
      html += '<td>' + log.row + '</td>';
      html += '<td>' + escapeHtml(log.colName) + '</td>';
      html += '<td style="color:#dc2626;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(log.oldValue) + '">' + escapeHtml(log.oldValue) + '</td>';
      html += '<td style="color:#16a34a;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(log.newValue) + '">' + escapeHtml(log.newValue) + '</td>';
      html += '<td style="font-size:.8rem;color:#64748b">' + escapeHtml(log.editor) + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';
  } else {
    var msg = (editLogData && editLogData.message) ? editLogData.message : 'ยังไม่มีข้อมูลบันทึกการแก้ไข';
    html += '<div style="text-align:center;padding:40px"><div style="font-size:3rem;margin-bottom:12px">📋</div><div style="font-size:1.1rem;font-weight:700;color:#64748b">' + msg + '</div><div style="font-size:.85rem;color:#94a3b8;margin-top:8px">เมื่อมีการแก้ไขข้อมูลในแท็บ "วางบิล" ระบบจะบันทึกอัตโนมัติ</div></div>';
  }
  html += '</div>';
  
  html += '</div>';
  
  // Script for tab switching and cross-ref
  var scriptUrl = String(ScriptApp.getService().getUrl());
  html += '<script>';
  html += 'function showBranch(key) {';
  html += '  var sections = document.querySelectorAll(".section");';
  html += '  for (var i = 0; i < sections.length; i++) sections[i].style.display = "none";';
  html += '  document.getElementById("section-" + key).style.display = "block";';
  html += '  var btns = document.querySelectorAll(".tab-btn");';
  html += '  var colors = {cnb:"#2563eb",csk:"#16a34a",editlog:"#d97706"};';
  html += '  for (var j = 0; j < btns.length; j++) { btns[j].className = "tab-btn"; btns[j].style.borderBottomColor = "transparent"; btns[j].style.color = "#64748b"; }';
  html += '  var activeBtn = document.getElementById("tab-" + key);';
  html += '  activeBtn.className = "tab-btn active";';
  html += '  activeBtn.style.borderBottomColor = colors[key];';
  html += '  activeBtn.style.color = colors[key];';
  html += '  if (key === "editlog") loadEditLog();';
  html += '}';
  html += 'function filterEditLog() {';
  html += '  var filter = document.getElementById("log-branch-filter").value;';
  html += '  var rows = document.querySelectorAll("#editlog-tbody tr");';
  html += '  var count = 0;';
  html += '  for (var i = 0; i < rows.length; i++) {';
  html += '    var branch = rows[i].getAttribute("data-branch") || "";';
  html += '    if (!filter || branch === filter) { rows[i].style.display = ""; count++; }';
  html += '    else { rows[i].style.display = "none"; }';
  html += '  }';
  html += '  document.getElementById("log-count").textContent = count + " รายการ";';
  html += '}';
  html += 'function loadEditLog() {';
  html += '  var countEl = document.getElementById("log-count");';
  html += '  if (countEl && countEl.textContent === "กำลังโหลด...") {';
  html += '    var rows = document.querySelectorAll("#editlog-tbody tr");';
  html += '    countEl.textContent = rows.length + " รายการ";';
  html += '  }';
  html += '}';
  html += 'function doCrossRef(branch) {';
  html += '  var sel = document.getElementById("select-" + branch);';
  html += '  var modeSel = document.getElementById("mode-" + branch);';
  html += '  var val = sel.value;';
  html += '  var mode = modeSel ? modeSel.value : "both";';
  html += '  if (!val) { alert("กรุณาเลือกแท็บก่อน"); return; }';
  html += '  var overlay = document.getElementById("loading-overlay");';
  html += '  if (overlay) overlay.style.display = "flex";';
  html += '  var statusEl = document.getElementById("status-" + branch);';
  html += '  if (statusEl) statusEl.textContent = "⏳ กำลังโหลดข้อมูล... กรุณารอสักครู่";';
  html += '  document.body.style.opacity = "0.5";';
  html += '  document.body.style.pointerEvents = "none";';
  html += '  var url = "' + scriptUrl + '?billing=1&selectedTab=" + encodeURIComponent(val) + "&crossMode=" + mode + "&_t=" + Date.now();';
  html += '  window.location.href = url;';
  html += '}';
  html += 'window.addEventListener("load", function() {';
  html += '  var overlay = document.getElementById("loading-overlay");';
  html += '  if (overlay) overlay.style.display = "none";';
  html += '});';
  html += '</script>';
  
  html += '<div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;text-align:center;font-size:.7rem;padding:4px 0;font-weight:700;letter-spacing:1px;z-index:9999">⛔ ข้อมูลลับ — ห้ามเผยแพร่ หรือ ส่งออกโดยไม่ได้รับอนุญาต (PDPA)</div>';
  html += '</body></html>';
  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ═══ Fetch Repair Order Proxy ═══ */
function fetchRepairOrderProxy_(url) {
  if (!url) return { success: false, error: 'Missing url parameter' };
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    var html = response.getContentText();
    
    // Parse the HTML to extract repair order data
    var result = { success: true, source: 'proxy' };
    
    // Extract plate number
    var m = html.match(/ทะเบียน\s*[:\s]*([^\n<|]+)/i);
    if (m) result.plate = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract brand
    m = html.match(/ยี่ห้อ\s*[:\s]*([^\n<|]+)/i);
    if (m) result.brand = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract model
    m = html.match(/รุ่นรถ\s*[:\s]*([^\n<|]+)/i);
    if (m) result.model = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract color
    m = html.match(/สีรถ\s*[:\s]*([^\n<|]+)/i);
    if (m) result.color = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract SA (Service Advisor) — be specific to avoid matching "Sarabun" font
    m = html.match(/SA\s*:\s*&nbsp;([^<|\n]+)/i);
    if (m) result.sa = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract insurance
    m = html.match(/ประกันภัย\s*[:\s]*([^\n<|]+)/i);
    if (m) {
      var insText = m[1].replace(/&nbsp;/g,' ').trim();
      result.insurance = insText;
      // Try to extract level (เบา/กลาง/หนัก)
      var lm = insText.match(/ระดับ\s*[:\s]*(เบา|กลาง|หนัก)/);
      if (lm) result.insuranceLevel = lm[1];
      else result.insuranceLevel = 'กลาง';
    }
    
    // Extract claim number
    m = html.match(/เลขคลม\s*[:\s]*([^\n<|]+)/i);
    if (m) result.claimNo = m[1].replace(/&nbsp;/g,' ').trim();
    
    // Extract total labor cost (รวมค่าแรง)
    m = html.match(/รวมค่าแรง[^0-9]*([0-9,]+\.\d{2})/);
    if (m) result.totalWage = parseFloat(m[1].replace(/,/g, ''));
    
    // Extract individual labor items
    // HTML structure: <td>seq</td><td>description</td><td></td><td>amount</td><td>discount%</td><td>0</td><td>net</td>
    var laborSection = html.match(/\*\*\*\s*ค่าแรง\s*\*\*\*([\s\S]*?)(รวมค่าแรง)/);
    if (laborSection) {
      var items = [];
      // Match: <td>number</td> ... <td>description</td> ... <td>amount</td> ... <td>discount%</td> ... <td>0</td> ... <td>net</td>
      var itemRegex = /<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>[\s\S]*?<td[^>]*>\s*&nbsp;([0-9,]+\.\d{2})&nbsp;\s*<\/td>\s*<td[^>]*>\s*&nbsp;(\d+)\s*%\s*&nbsp;\s*<\/td>\s*<td[^>]*>\s*&nbsp;\d+&nbsp;\s*<\/td>\s*<td[^>]*>\s*&nbsp;([0-9,]+\.\d{2})&nbsp;/g;
      var im;
      while ((im = itemRegex.exec(laborSection[1])) !== null) {
        items.push({
          seq: parseInt(im[1]),
          desc: im[2].replace(/&nbsp;/g,' ').trim(),
          amount: parseFloat(im[3].replace(/,/g, '')),
          discount: parseInt(im[4]),
          net: parseFloat(im[5].replace(/,/g, ''))
        });
      }
      result.items = items;
    }
    
    // Fallback: if items empty, try simpler approach - find all td sequences
    if (!result.items || result.items.length === 0) {
      var items = [];
      var tdRegex = /<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*style="text-align:\s*left[^"]*"[^>]*>\s*([^<]+?)\s*<\/td>/g;
      var sec = html.substring(html.indexOf('ค่าแรง'), html.indexOf('รวมค่าแรง') > 0 ? html.indexOf('รวมค่าแรง') : html.length);
      var tm;
      while ((tm = tdRegex.exec(sec)) !== null) {
        var seq = parseInt(tm[1]);
        var desc = tm[2].replace(/&nbsp;/g,' ').trim();
        // Now find the corresponding amounts after this description
        var afterDesc = sec.substring(tdRegex.lastIndex);
        var amounts = afterDesc.match(/&nbsp;([0-9,]+\.\d{2})&nbsp;/g);
        if (amounts && amounts.length >= 2) {
          items.push({
            seq: seq,
            desc: desc,
            amount: parseFloat(amounts[0].replace(/&nbsp;/g,'').replace(/,/g,'')),
            discount: 10, // default
            net: parseFloat(amounts[amounts.length-1].replace(/&nbsp;/g,'').replace(/,/g,''))
          });
        }
      }
      if (items.length > 0) result.items = items;
    }
    
    // Extract repair order ID
    m = html.match(/เลขที่ใบแจ้งซ่อม<\/B><\/td>\s*<td[^>]*><B>([^<]+)/);
    if (m) result.repairId = m[1].trim();
    
    // Extract JOB ID
    m = html.match(/เลขที่ JOB<\/B><\/td>\s*<td[^>]*><B>([^<]+)/);
    if (m) result.jobId = m[1].trim();
    
    // Extract repair order date (วันที่) — look for Thai date patterns
    // Pattern: วันที่ followed by a Thai date (dd/mm/BBBB BE or dd เดือน BBBB)
    m = html.match(/วันที่\s*[:\s]*&nbsp;\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/i);
    if (m) {
      var repairDay = parseInt(m[1]);
      var repairMonth = parseInt(m[2]);
      var repairYearBE = parseInt(m[3]);
      var repairYearAD = repairYearBE - 543;
      if (repairYearAD > 1900 && repairYearAD < 2200) {
        result.repairDate = repairYearAD + '-' + String(repairMonth).padStart(2,'0') + '-' + String(repairDay).padStart(2,'0');
      }
    }
    // Fallback: try another date format after วันที่
    if (!result.repairDate) {
      m = html.match(/วันที่[^0-9]*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/i);
      if (m) {
        var repairDay = parseInt(m[1]);
        var repairMonth = parseInt(m[2]);
        var repairYearBE = parseInt(m[3]);
        var repairYearAD = repairYearBE - 543;
        if (repairYearAD > 1900 && repairYearAD < 2200) {
          result.repairDate = repairYearAD + '-' + String(repairMonth).padStart(2,'0') + '-' + String(repairDay).padStart(2,'0');
        }
      }
    }
    // Fallback: try AD date format directly
    if (!result.repairDate) {
      m = html.match(/วันที่[^0-9]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
      if (m) {
        var rDay = parseInt(m[1]);
        var rMonth = parseInt(m[2]);
        var rYear = parseInt(m[3]);
        var rYearAD = rYear > 543 ? rYear - 543 : rYear;
        if (rYearAD > 1900 && rYearAD < 2200) {
          result.repairDate = rYearAD + '-' + String(rMonth).padStart(2,'0') + '-' + String(rDay).padStart(2,'0');
        }
      }
    }
    // Fallback: look for สร้าง/Created date in the page
    if (!result.repairDate) {
      m = html.match(/(สร้าง|Created|Date)[^0-9]*(\d{4})-(\d{2})-(\d{2})/i);
      if (m) {
        result.repairDate = m[2] + '-' + m[3] + '-' + m[4];
      }
    }
    
    // Also fetch movement data for this plate (for print page)
    if (result.plate) {
      try {
        var mvmtData = fetchWorkshopApi('movement', result.plate.replace(/\s/g, ''));
        if (mvmtData && mvmtData.success !== false && mvmtData.rows && mvmtData.rows.length) {
          result.movement = mvmtData.rows;
        }
      } catch(merr) {
        // Movement data optional — don't fail the whole request
      }
    }
    
    return result;
  } catch(err) {
    return { success: false, error: err.message };
  }
}

// ═══ Server-side standard time lookup (for print page) ═══
function lookupStdTimeGS_(totalWage) {
  var STD_DATA = [
    [1,0.25,0.5,0,0.25,0.25,0.92,0.5,0.67,1.25,0.75,0.5,4,0.5,0.5,0.75,0.42,8.01,1.14,1.86],
    [5001,0.5,0.75,0,0.34,0.25,1.17,0.5,0.75,1.25,0.84,0.5,4,0.67,0.75,0.75,0.42,9.44,1.35,2.06],
    [6001,0.67,1,0,0.42,0.25,1.34,0.5,0.84,1.25,0.92,0.5,4,0.84,1.17,1,0.42,11.12,1.59,2.3],
    [7001,0.84,1.25,0,0.5,0.25,1.5,0.5,0.92,1.25,1,0.5,4,1,1.25,1,0.42,12.18,1.74,2.46],
    [8001,1,1.5,0,0.59,0.25,1.67,0.5,1,1.25,1.09,0.5,4,1.17,1.42,1.09,0.42,13.28,1.9,2.63],
    [9001,1.17,1.84,0,0.67,0.25,1.84,0.5,1.09,1.25,1.17,0.5,4,1.25,1.5,1.17,0.42,14.1,2.01,2.77],
    [10001,1.34,2.09,0,0.75,0.25,2.01,0.5,1.17,1.25,1.25,0.5,4,1.42,1.75,1.25,0.42,15.22,2.17,2.96],
    [12001,1.5,2.34,0,0.84,0.34,2.17,0.67,1.25,1.34,1.34,0.5,4,1.59,1.92,1.34,0.42,16.56,2.37,3.2],
    [14001,1.67,2.59,0,0.92,0.34,2.34,0.67,1.34,1.34,1.42,0.5,4,1.67,2.09,1.42,0.42,17.64,2.52,3.39],
    [16001,1.84,2.92,0,1,0.34,2.51,0.67,1.42,1.42,1.5,0.67,4,1.84,2.34,1.5,0.42,18.98,2.71,3.61],
    [18001,2.09,3.17,0,1.09,0.34,2.67,0.75,1.5,1.5,1.59,0.67,4,2.01,2.59,1.59,0.42,20.32,2.9,3.84],
    [20001,2.34,3.42,0,1.17,0.42,2.84,0.75,1.59,1.59,1.67,0.67,4,2.17,2.76,1.67,0.5,21.6,3.09,4.06],
    [25001,2.59,3.92,0.34,1.34,0.42,3.01,0.84,1.75,1.67,1.84,0.75,4,2.34,3.01,1.75,0.5,23.95,3.42,4.5],
    [30001,2.84,4.34,0.5,1.5,0.42,3.26,0.84,1.84,1.75,2.01,0.84,4,2.67,3.34,1.84,0.5,26.53,3.79,4.98],
    [35001,3.09,4.84,0.67,1.67,0.5,3.51,0.84,1.92,1.84,2.17,0.84,4,2.84,3.67,2.01,0.5,29.15,4.16,5.47],
    [40001,3.34,5.26,0.84,1.84,0.5,3.76,1,2.01,2.01,2.34,0.92,4,3.09,4.01,2.17,0.59,31.73,4.53,5.95],
    [45001,3.59,5.76,0.84,2.01,0.5,3.92,1,2.09,2.09,2.5,1,4,3.26,4.26,2.26,0.59,34.07,4.87,6.4],
    [50001,3.84,6.17,1,2.17,0.5,4.17,1,2.17,2.17,2.67,1,4,3.51,4.59,2.34,0.67,36.39,5.2,6.85],
    [60001,4.34,6.76,1.17,2.34,0.59,4.42,1.09,2.34,2.34,2.84,1.09,4,3.76,5.01,2.51,0.67,40.24,5.75,7.58],
    [70001,4.84,7.42,1.34,2.59,0.59,4.76,1.17,2.51,2.51,3.09,1.17,4,4.09,5.42,2.76,0.76,44.67,6.38,8.43],
    [80001,5.34,8.01,1.5,2.84,0.67,5.01,1.25,2.67,2.67,3.34,1.25,4,4.42,5.84,3.01,0.84,49.01,7,9.25],
    [90001,5.84,8.59,1.67,3.09,0.67,5.34,1.34,2.84,2.84,3.59,1.34,4,4.76,6.26,3.17,0.84,53.43,7.63,10.07],
    [100001,6.26,9.09,1.84,3.34,0.75,5.59,1.42,3.01,3.01,3.84,1.42,4,5.09,6.67,3.34,0.92,57.76,8.25,10.89]
  ];
  var keys = ['wage_from','remove','body_repair','frame_repair','putty','putty_drying','putty_prep',
    'primary_drying','primary_prep','mixing','painting','bake','paint_drying',
    'assembly','polish','washing','final_check','mechanic_work_hr','mechanic_days','parking_days'];
  var wage = Math.round(totalWage);
  for (var i = STD_DATA.length - 1; i >= 0; i--) {
    if (wage >= STD_DATA[i][0]) {
      var d = STD_DATA[i];
      var result = {};
      for (var k = 0; k < keys.length; k++) { result[keys[k]] = d[k]; }
      result.total_system_hr = d.slice(1,17).reduce(function(a,b){return a+b;},0);
      return result;
    }
  }
  var first = STD_DATA[0];
  var result2 = {};
  for (var j = 0; j < keys.length; j++) { result2[keys[j]] = first[j]; }
  result2.total_system_hr = first.slice(1,17).reduce(function(a,b){return a+b;},0);
  return result2;
}

// Format date string to Thai format dd/MM/yyyy
function fmtDateThaiGS_(dateStr) {
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var dd = ('0' + d.getDate()).slice(-2);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  } catch(e) {
    return dateStr;
  }
}

// Count working days between two dates (Monday-Saturday, exclude Sunday only)
function countWorkingDaysGS_(startDate, endDate) {
  var count = 0;
  var d = new Date(startDate);
  d.setHours(0,0,0,0);
  var end = new Date(endDate);
  end.setHours(0,0,0,0);
  if (d.getTime() === end.getTime()) return 1;
  while (d <= end) {
    if (d.getDay() !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 0);
}

// Add N working days to a date (skip Sundays)
function addWorkingDaysGS_(startDate, days) {
  var d = new Date(startDate);
  d.setHours(0,0,0,0);
  var added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // skip Sunday
  }
  return d;
}


function listCSKSheets() {
  var ss = SpreadsheetApp.openById('1qAtQ9yM4RYFbmnLHG1YVkXsLlsGPmo8i5D6UFa7_uWs');
  var sheets = ss.getSheets();
  var result = { sheetNames: [], billingHeaders: {} };
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    var lastRow = sheets[i].getLastRow();
    var lastCol = Math.min(sheets[i].getLastColumn(), 30);
    result.sheetNames.push(name + ' (rows: ' + lastRow + ', cols: ' + lastCol + ')');
    
    // For billing tabs, read first 10 rows to find headers
    if (name.indexOf('วางบิล') === 0 && lastRow > 1) {
      var maxReadRows = Math.min(lastRow, 10);
      var headerData = sheets[i].getRange(1, 1, maxReadRows, lastCol).getValues();
      var headerInfo = { name: name, rows: [], rawRows: [] };
      for (var r = 0; r < headerData.length; r++) {
        var rowObj = {};
        var rawRow = [];
        for (var c = 0; c < headerData[r].length; c++) {
          var v = headerData[r][c];
          rawRow.push(v);
          if (v !== '' && v !== null && v !== undefined) {
            rowObj['col' + String.fromCharCode(65 + c)] = v;
          }
        }
        headerInfo.rows.push(rowObj);
        headerInfo.rawRows.push(rawRow);
      }
      result.billingHeaders[name] = headerInfo;
      // Only do first 2 billing tabs to keep response small
      var billingCount = Object.keys(result.billingHeaders).length;
      if (billingCount >= 2) break;
    }
  }
  return result;
}


/* ═══════════════════════════════════════════════════════════
   📝 Billing Edit Log — บันทึกการแก้ไขแท็บวางบิล (CNB + CSK)
   ═══════════════════════════════════════════════════════════ */

var EDIT_LOG_SHEET = '📝 Edit Log';
var EDIT_LOG_MAX_ROWS = 5000;

function billingEditLogTrigger_(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    if (sheetName.indexOf('วางบิล') !== 0) return;
    var ss = sheet.getParent();
    var spreadsheetId = ss.getId();
    var branch = '';
    if (spreadsheetId === CNB_SS_ID) { branch = 'มหาราช'; }
    else if (spreadsheetId === CSK_SS_ID) { branch = 'ซีเอสเค'; }
    else { return; }
    var user = Session.getActiveUser().getEmail() || 'unknown';
    var timestamp = new Date();
    var row = range.getRow();
    var col = range.getColumn();
    var numRows = range.getNumRows();
    var numCols = range.getNumColumns();
    var newValue = e.value !== undefined ? String(e.value) : '';
    var oldValue = e.oldValue !== undefined ? String(e.oldValue) : '';
    var headerRow = [];
    var maxScanRow = Math.min(sheet.getLastRow(), 15);
    if (maxScanRow > 0) {
      var headerData = sheet.getRange(1, 1, maxScanRow, sheet.getLastColumn()).getValues();
      for (var hri = 0; hri < headerData.length; hri++) {
        var testRow = headerData[hri];
        var foundHeader = false;
        for (var hci = 0; hci < testRow.length; hci++) {
          var hh = String(testRow[hci] || '').trim();
          if (hh === 'ทะเบียน' || hh === 'ทะเบียนรถ' || hh.indexOf('เลขที่ JOB') >= 0 || hh === 'JOB') {
            headerRow = testRow; foundHeader = true; break;
          }
        }
        if (foundHeader) break;
      }
    }
    var colName = col > 0 && col <= headerRow.length ? String(headerRow[col - 1] || '').trim() : 'Col ' + col;
    var plateCol = -1, jobCol = -1;
    for (var ci = 0; ci < headerRow.length; ci++) {
      var h = String(headerRow[ci] || '').trim();
      if (h === 'ทะเบียน' || h === 'ทะเบียนรถ') plateCol = ci;
      if (h.indexOf('เลขที่ JOB') >= 0 || h === 'JOB') jobCol = ci;
    }
    var bctSS = SpreadsheetApp.openById(BCT_SS_ID);
    var logSheet = bctSS.getSheetByName(EDIT_LOG_SHEET);
    if (!logSheet) {
      logSheet = bctSS.insertSheet(EDIT_LOG_SHEET);
      logSheet.appendRow(['เวลา', 'สาขา', 'แท็บ', 'ทะเบียน/JOB', 'แถว', 'คอลัมน์', 'ชื่อคอลัมน์', 'ค่าเก่า', 'ค่าใหม่', 'ผู้แก้ไข']);
      logSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
      logSheet.setFrozenRows(1);
    }
    for (var ri = 0; ri < Math.min(numRows, 5); ri++) {
      var currentRow = row + ri;
      var currentPlate = plateCol >= 0 ? String(sheet.getRange(currentRow, plateCol + 1).getValue() || '').trim() : '';
      var currentJob = jobCol >= 0 ? String(sheet.getRange(currentRow, jobCol + 1).getValue() || '').trim() : '';
      var currentRowId = currentPlate || currentJob || 'แถว ' + currentRow;
      var cellNewValue = '';
      var cellOldValue = '';
      if (numRows === 1 && numCols === 1) {
        cellNewValue = newValue;
        cellOldValue = oldValue;
      } else {
        try { cellNewValue = String(sheet.getRange(currentRow, col).getValue()); } catch(err2) { cellNewValue = ''; }
        cellOldValue = '(กลุ่มเซลล์)';
      }
      var currentColName = colName;
      if (numCols > 1) {
        var startCN = col <= headerRow.length ? String(headerRow[col - 1] || '').trim() : 'Col ' + col;
        var endCN = (col + numCols - 1) <= headerRow.length ? String(headerRow[col + numCols - 2] || '').trim() : 'Col ' + (col + numCols - 1);
        currentColName = startCN + ' → ' + endCN;
      }
      logSheet.appendRow([timestamp, branch, sheetName, currentRowId, currentRow, col, currentColName, cellOldValue, cellNewValue, user]);
    }
    var logRowCount = logSheet.getLastRow();
    if (logRowCount > EDIT_LOG_MAX_ROWS + 1) {
      logSheet.deleteRows(2, logRowCount - EDIT_LOG_MAX_ROWS - 1);
    }
  } catch(err) {
    Logger.log('billingEditLog error: ' + err.message);
  }
}

function setupBillingEditTriggers_() {
  var results = [];
  var triggerFns = ['billingEditLogCNB_', 'billingEditLogCSK_'];
  var ssIds = [CNB_SS_ID, CSK_SS_ID];
  var branchNames = ['มหาราช', 'ซีเอสเค'];
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'billingEditLogCNB_' || fn === 'billingEditLogCSK_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  for (var j = 0; j < triggerFns.length; j++) {
    ScriptApp.newTrigger(triggerFns[j]).forSpreadsheet(ssIds[j]).onEdit().create();
    results.push({trigger: triggerFns[j], spreadsheet: branchNames[j], status: 'created'});
  }
  return results;
}

function billingEditLogCNB_(e) {
  billingEditLogTrigger_(e || {range: SpreadsheetApp.getActiveRange(), value: '', oldValue: ''});
}

function billingEditLogCSK_(e) {
  billingEditLogTrigger_(e || {range: SpreadsheetApp.getActiveRange(), value: '', oldValue: ''});
}

function getBillingEditLog_(options) {
  var limit = (options && options.limit) || 100;
  var branch = (options && options.branch) || '';
  var tab = (options && options.tab) || '';
  var bctSS = SpreadsheetApp.openById(BCT_SS_ID);
  var logSheet = bctSS.getSheetByName(EDIT_LOG_SHEET);
  if (!logSheet || logSheet.getLastRow() < 2) {
    return {success: true, logs: [], count: 0, message: 'ยังไม่มีข้อมูลบันทึกการแก้ไข'};
  }
  var lastRow = logSheet.getLastRow();
  var data = logSheet.getRange(2, 1, Math.min(lastRow - 1, EDIT_LOG_MAX_ROWS), 10).getValues();
  var logs = [];
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (!row[0]) continue;
    var entry = {
      timestamp: row[0] ? new Date(row[0]).toISOString() : '',
      branch: String(row[1] || ''),
      tab: String(row[2] || ''),
      identifier: String(row[3] || ''),
      row: row[4], col: row[5],
      colName: String(row[6] || ''),
      oldValue: String(row[7] || ''),
      newValue: String(row[8] || ''),
      editor: String(row[9] || '')
    };
    if (branch && entry.branch !== branch) continue;
    if (tab && entry.tab !== tab) continue;
    logs.push(entry);
    if (logs.length >= limit) break;
  }
  return {success: true, logs: logs, count: logs.length};
}

/* ═══════════════════════════════════════════════════
   ENVR Oil Stock Monitor — Data Fetcher
   ═══════════════════════════════════════════════════ */
function envrFetchData_(ss) {
  var result = {
    stockData: [],
    stockDetail: [],      // detailed breakdown from รูป_รายงาน OIL Stock
    transactions: [],
    production: [],
    salesReport: [],
    salesRows: [],
    salesMonthlySummary: [],
    oilTypes: [],
    txnTypes: [],
    storageConfigs: [],
    branchData: [],       // branch-level sales data
    lastUpdated: new Date().toISOString()
  };
  
  // ── รูป_รายงาน OIL Stock(ห้ามลบ/แก้ไข) ── Detailed breakdown
  try {
    var detailSheet = ss.getSheetByName('รูป_รายงาน OIL Stock(ห้ามลบ/แก้ไข)');
    if (detailSheet) {
      var rows = detailSheet.getDataRange().getValues();
      // Parse the 3 oil type sections
      // Section 1: น้ำมันเครื่องเก่า (rows 5-17, C1=บ่อ, C2=สถานที่, C3=รับเข้าโดยตรง, C4=ย้ายจากคลังอื่นเข้า, C5=รวมเบิก, C6=โรงกลั่น, C7=CNB, C8=CSK, C9=อู่เคาะพ่นสี, C10=ลูกค้าภายนอก, C13=ย้ายStockออก, C14=คงเหลือ)
      // Section 2: น้ำมันเอนกประสงค์ (rows 23-26, C1=บ่อ, C2=สถานที่, C3=รับเข้าโดยตรง, C4=ย้ายจากคลังอื่นเข้า, C5=รวมเบิก, C6=เครื่องเจน, C7=อู่เคาะพ่นสี, C8=สวนNNR, C9=โรงกลั่นเบิกใช้งาน, C10=รถใช้งาน, C11=CNB, C12=ลูกค้าภายนอก, C13=ย้ายStockออก, C14=คงเหลือ)
      // Section 3: น้ำมันเอนกประสงค์ใช้ไม่ได้ (rows 32-33, same cols as section 2)
      
      // Parse น้ำมันเครื่องเก่า section (rows 5-17, 0-indexed: 4-16)
      for (var i = 4; i <= 16; i++) {
        if (i >= rows.length) break;
        var row = rows[i];
        if (!row[0] && !row[1]) continue;
        var item = {
          oil_type: 'น้ำมันเครื่องเก่า',
          tank: String(row[0] || ''),
          place: String(row[1] || ''),
          import_direct: Number(row[2]) || 0,     // รับเข้าโดยตรง
          import_transfer_in: Number(row[3]) || 0, // ย้ายจากคลังอื่นเข้า
          total_import: Number(row[4]) || 0,       // รวมเบิก (import total)
          export_refinery: Number(row[5]) || 0,    // โรงกลั่น
          export_cnb: Number(row[6]) || 0,         // CNB
          export_csk: Number(row[7]) || 0,         // CSK
          export_spray_booth: Number(row[8]) || 0,  // อู่เคาะพ่นสี
          export_external: Number(row[9]) || 0,    // ลูกค้าภายนอก
          stock_transfer_out: Number(row[12]) || 0, // ย้าย Stock ออก
          balance: Number(row[13]) || 0            // คงเหลือ
        };
        result.stockDetail.push(item);
      }
      
      // Parse น้ำมันเอนกประสงค์ section (rows 23-26, 0-indexed: 22-25)
      for (var i = 22; i <= 25; i++) {
        if (i >= rows.length) break;
        var row = rows[i];
        if (!row[0] && !row[1]) continue;
        var item = {
          oil_type: 'น้ำมันเอนกประสงค์',
          tank: String(row[0] || ''),
          place: String(row[1] || ''),
          import_direct: Number(row[2]) || 0,
          import_transfer_in: Number(row[3]) || 0,
          total_import: Number(row[4]) || 0,
          export_generator: Number(row[5]) || 0,    // เครื่องเจน
          export_spray_booth: Number(row[6]) || 0,   // อู่เคาะพ่นสี
          export_nnr: Number(row[7]) || 0,          // สวน NNR
          export_refinery_use: Number(row[8]) || 0,  // โรงกลั่นเบิกใช้งาน
          export_vehicle: Number(row[9]) || 0,       // รถใช้งาน
          export_cnb: Number(row[10]) || 0,         // CNB
          export_external: Number(row[11]) || 0,    // ลูกค้าภายนอก
          stock_transfer_out: Number(row[12]) || 0,
          balance: Number(row[13]) || 0
        };
        result.stockDetail.push(item);
      }
      
      // Parse น้ำมันเอนกประสงค์(ใช้ไม่ได้) section (rows 32-33, 0-indexed: 31-32)
      for (var i = 31; i <= 32; i++) {
        if (i >= rows.length) break;
        var row = rows[i];
        if (!row[0] && !row[1]) continue;
        var item = {
          oil_type: 'น้ำมันเอนกประสงค์(ใช้ไม่ได้)',
          tank: String(row[0] || ''),
          place: String(row[1] || ''),
          import_direct: Number(row[2]) || 0,
          import_transfer_in: Number(row[3]) || 0,
          total_import: Number(row[4]) || 0,
          export_generator: Number(row[5]) || 0,
          export_spray_booth: Number(row[6]) || 0,
          export_nnr: Number(row[7]) || 0,
          export_refinery_use: Number(row[8]) || 0,
          export_vehicle: Number(row[9]) || 0,
          export_cnb: Number(row[10]) || 0,
          export_external: Number(row[11]) || 0,
          stock_transfer_out: Number(row[12]) || 0,
          balance: Number(row[13]) || 0
        };
        result.stockDetail.push(item);
      }
      
      // Parse branch-level data (columns 16-22, rows 5-8 for สาขา data)
      // Row 3 (0-indexed: 2) C16=สาขา, C17=สต็อกตั้งต้น, C18=นอกระบบ(รับ), C19=ในระบบ(รับ), C20=นอกระบบ(ขาย), C21=ในระบบ(ขาย), C22=คงเหลือ(ขายในระบบ)
      for (var i = 4; i <= 7; i++) {
        if (i >= rows.length) break;
        var row = rows[i];
        var branch = String(row[15] || ''); // C16
        if (!branch) continue;
        result.branchData.push({
          tank: String(row[0] || ''),
          branch: branch,
          opening_stock: Number(row[16]) || 0,    // C17 สต็อกตั้งต้น
          import_offline: Number(row[17]) || 0,   // C18 นอกระบบ(รับ)
          import_online: Number(row[18]) || 0,    // C19 ในระบบ(รับ)
          export_offline: Number(row[19]) || 0,   // C20 นอกระบบ(ขาย)
          export_online: Number(row[20]) || 0,     // C21 ในระบบ(ขาย)
          system_balance: Number(row[21]) || 0     // C22 คงเหลือ(ขายในระบบ)
        });
      }
    }
  } catch(e) { Logger.log('ENVR stockDetail error: ' + e.message); }
  
  // ── C1_total_oil_stock ── (summary)
  try {
    var stockSheet = ss.getSheetByName('C1_total_oil_stock');
    if (stockSheet) {
      var stockRows = stockSheet.getDataRange().getValues();
      for (var i = 1; i < stockRows.length; i++) {
        var row = stockRows[i];
        if (!row[1] && !row[2]) continue;
        result.stockData.push({
          id: row[0],
          oil_type: row[1],
          storage: row[2],
          import: Number(row[3]) || 0,
          export: Number(row[4]) || 0,
          total: Number(row[5]) || 0,
          place: row[6]
        });
      }
    }
  } catch(e) { Logger.log('ENVR stockData error: ' + e.message); }
  
  // ── B1_Forms_ENVIRON ขาย / เบิก / ย้ายที่เก็บ ──
  try {
    var txnSheet = ss.getSheetByName('B1_Forms_ENVIRON ขาย / เบิก / ย้ายที่เก็บ');
    if (txnSheet) {
      var txnRows = txnSheet.getDataRange().getValues();
      // Data starts at row 11 (index 10)
      for (var i = 10; i < txnRows.length; i++) {
        var row = txnRows[i];
        if (!row[2] && !row[3] && !row[4]) continue; // skip completely empty
        var tsDate = row[3]; // D=timestamp
        if (tsDate instanceof Date) {
          tsDate = tsDate.toISOString();
        }
        var dateUseRaw = row[14]; // O=environ_date_use
        if (dateUseRaw instanceof Date) {
          dateUseRaw = dateUseRaw.toISOString();
        }
        result.transactions.push({
          running: row[2],          // C
          timestamp: tsDate,       // D
          environ_id: row[4],      // E
          name: row[5],            // F=environ_id_name
          company: row[6],          // G=environ_id_company_management
          type: row[7],            // H=environ_type
          oil_type: row[8],        // I=environ_oil_type
          storage: row[9],         // J=environ_storage
          liter: Number(row[10]) || 0, // K=environ_liter
          notice: row[11],          // L=environ_notice
          storage_transfer: row[12], // M=environ_storage_tranfer
          type_input: row[13],      // N=environ_type_input
          date_use: dateUseRaw,     // O=environ_date_use
          out_person: row[15],      // P=environ_out
          agency: row[16],          // Q=environ_agency
          sell_price: Number(row[17]) || 0, // R=environ_sell_price
          sell_oil: row[18],         // S=environ_sell_oil
          sell_type: row[19],        // T=environ_sell_type
          sell_method: row[20],      // U=environ_sell (สด/เครดิต)
          sell_auto: row[21],        // V=environ_sell_auto
          sell_customer: row[22],    // W=environ_sell_customer
          sell_customer_tell: row[23] // X=environ_sell_customer_tell
        });
      }
    }
  } catch(e) { Logger.log('ENVR transactions error: ' + e.message); }
  
  // ── B2_Forms_ENVIRON ผลิต ──
  try {
    var prodSheet = ss.getSheetByName('B2_Forms_ENVIRON ผลิต');
    if (prodSheet) {
      var prodRows = prodSheet.getDataRange().getValues();
      // Data starts at row 14 (index 13)
      for (var i = 13; i < prodRows.length; i++) {
        var row = prodRows[i];
        if (!row[4] && !row[5] && !row[7]) continue; // skip empty
        var prodTs = row[3]; // D=timestamp
        if (prodTs instanceof Date) { prodTs = prodTs.toISOString(); }
        var startDate = row[7]; // H=generate_col_1
        if (startDate instanceof Date) { startDate = startDate.toISOString(); }
        var endDate = row[19]; // T=generate_col_13
        if (endDate instanceof Date) { endDate = endDate.toISOString(); }
        result.production.push({
          timestamp: prodTs,
          environ_id: row[4],          // E
          environ_id_name: row[5],      // F
          environ_id_company_management: row[6], // G
          generate_col_1: startDate,    // H=วันที่เริ่มผลิต
          generate_col_2: row[8],      // I=เวลาเริ่มผลิต
          generate_col_3: row[9],      // J=วันที่น้ำมันเริ่มไหล
          generate_col_4: row[10],     // K=เวลาน้ำมันเริ่มไหล
          generate_col_5: Number(row[11]) || 0, // L=น้ำมันดีเซลที่ผลิตได้
          generate_col_6: Number(row[12]) || 0,  // M=ใช้น้ำมันเครื่องเก่า
          generate_col_7: Number(row[13]) || 0,  // N=เบิกคลัง1
          generate_col_8: row[14],     // O=แหล่งที่มา1
          generate_col_9: Number(row[15]) || 0,  // P=เบิกคลัง2
          generate_col_10: row[16],    // Q=แหล่งที่มา2
          generate_col_11: Number(row[17]) || 0,  // R=คงเหลือในเครื่อง
          generate_col_12: Number(row[18]) || 0,  // S=ของเสีย
          generate_col_13: endDate,    // T=วันที่หยุดผลิต
          generate_col_14: row[20],    // U=เวลาหยุดผลิต
          generate_col_15: Number(row[21]) || 0, // V=ปริมาณใช้ไฟ
          generate_col_16: row[22],    // W=รายละเอียดอื่น
          generate_col_17: Number(row[23]) || 0,  // X=ค่าซีเทน
          generate_col_18: row[24]     // Y=แหล่งจัดเก็บน้ำมันเอนกประสงค์1
        });
      }
    }
  } catch(e) { Logger.log('ENVR production error: ' + e.message); }
  
  // ── รายงานขายน้ำมันENVR ──
  try {
    var salesSheet = ss.getSheetByName('รายงานขายน้ำมันENVR');
    if (salesSheet) {
      var salesRows = salesSheet.getDataRange().getValues();
      // Assume header in row 1, data from row 2
      for (var i = 1; i < salesRows.length; i++) {
        var row = salesRows[i];
        if (!row[0] && !row[1]) continue;
        // Try common column positions, handle date
        var salesDate = row[0];
        if (salesDate instanceof Date) { salesDate = salesDate.toISOString(); }
        result.salesReport.push({
          date: salesDate,
          oil_type: row[1] || '',
          customer: row[2] || '',
          liter: Number(row[3]) || 0,
          sell_price: Number(row[4]) || 0,
          sell_type: row[5] || '',
          sell_method: row[6] || '',
          environ_sell_oil: row[1] || '',
          environ_sell_customer: row[2] || '',
          environ_liter: Number(row[3]) || 0,
          environ_sell_price: Number(row[4]) || 0
        });
      }
    }
  } catch(e) { Logger.log('ENVR salesReport error: ' + e.message); }
  
  // ── Config sheets (if they exist) ──
  var configSheets = [
    {name: 'config_oil_type', key: 'oilTypes'},
    {name: 'config_txn_type', key: 'txnTypes'},
    {name: 'config_storage', key: 'storageConfigs'}
  ];
  configSheets.forEach(function(cfg) {
    try {
      var sh = ss.getSheetByName(cfg.name);
      if (sh) {
        var rows = sh.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0]) result[cfg.key].push(rows[i][0]);
        }
      }
    } catch(e) {}
  });
  
  // ── Monthly & Daily Trends (derived from transactions) ──
  try {
    var txns = result.transactions || [];
    var monthlyByOil = {};  // { oilType: { month: {import:0, export:0} } }
    var dailyByOil = {};    // { oilType: { day: {import:0, export:0} } }
    var monthlyAll = {};    // { month: {import:0, export:0} }
    var dailyAll = {};      // { day: {import:0, export:0} }
    
    // Oil type normalization map
    var oilTypeMap = {};
    oilTypeMap['น้ำมันเครื่องเก่า'] = 'น้ำมันเครื่องเก่า';
    oilTypeMap['น้ำมันเอนกประสงค์'] = 'น้ำมันเอนกประสงค์';
    oilTypeMap['น้ำมันเอนกประสงค์(ใช้ไม่ได้)'] = 'น้ำมันเอนกประสงค์(ใช้ไม่ได้)';
    
    txns.forEach(function(t) {
      var running = String(t.running || '');
      if (running === 'running' || running === 'environ_running') return;
      var tp = String(t.type || '').toLowerCase();
      if (tp === 'environ_type') return;
      var ot = String(t.oil_type || '');
      if (!ot || ot === 'environ_oil_type' || ot === 'TEXT') return;
      
      // Normalize oil type
      var otNorm = oilTypeMap[ot];
      if (!otNorm) {
        if (ot.indexOf('เครื่องเก่า') >= 0) otNorm = 'น้ำมันเครื่องเก่า';
        else if (ot.indexOf('ใช้ไม่ได้') >= 0) otNorm = 'น้ำมันเอนกประสงค์(ใช้ไม่ได้)';
        else if (ot.indexOf('เอนก') >= 0) otNorm = 'น้ำมันเอนกประสงค์';
        else return; // skip unknown
      }
      
      // Get date - prefer date_use, fallback to timestamp
      var dt = t.date_use || t.timestamp || '';
      if (!dt) return;
      var dtStr = dt instanceof Date ? dt.toISOString() : String(dt);
      if (dtStr.length < 7) return;
      
      // Skip header-like dates and Buddhist year (25xx)
      var month = dtStr.substring(0, 7);
      var day = dtStr.substring(0, 10);
      if (month.indexOf('-') < 0) return;
      if (month.substring(0, 2) === '25') return;
      
      // Determine import vs export
      var liter = Number(t.liter) || 0;
      var isImport = (tp.indexOf('import') >= 0 || tp.indexOf('นำเข้า') >= 0);
      
      // Accumulate
      if (!monthlyByOil[otNorm]) monthlyByOil[otNorm] = {};
      if (!monthlyByOil[otNorm][month]) monthlyByOil[otNorm][month] = {import: 0, export: 0};
      if (!dailyByOil[otNorm]) dailyByOil[otNorm] = {};
      if (!dailyByOil[otNorm][day]) dailyByOil[otNorm][day] = {import: 0, export: 0};
      if (!monthlyAll[month]) monthlyAll[month] = {import: 0, export: 0};
      if (!dailyAll[day]) dailyAll[day] = {import: 0, export: 0};
      
      if (isImport) {
        monthlyByOil[otNorm][month].import += liter;
        dailyByOil[otNorm][day].import += liter;
        monthlyAll[month].import += liter;
        dailyAll[day].import += liter;
      } else {
        monthlyByOil[otNorm][month].export += liter;
        dailyByOil[otNorm][day].export += liter;
        monthlyAll[month].export += liter;
        dailyAll[day].export += liter;
      }
    });
    
    // Sort and convert to arrays (return all data, frontend filters by period)
    var validMonths = Object.keys(monthlyAll).filter(function(m) { return m.substring(0, 2) !== '25'; }).sort();
    var validDays = Object.keys(dailyAll).filter(function(d) { return d.substring(0, 2) !== '25'; }).sort();
    
    // Build monthlyTrends array
    var monthlyTrends = [];
    validMonths.forEach(function(m) {
      var item = {
        month: m,
        total_import: monthlyAll[m].import,
        total_export: monthlyAll[m].export,
        net: monthlyAll[m].import - monthlyAll[m].export,
        byOilType: {}
      };
      Object.keys(monthlyByOil).forEach(function(ot) {
        if (monthlyByOil[ot][m]) {
          item.byOilType[ot] = {
            import: monthlyByOil[ot][m].import,
            export: monthlyByOil[ot][m].export,
            net: monthlyByOil[ot][m].import - monthlyByOil[ot][m].export
          };
        }
      });
      monthlyTrends.push(item);
    });
    
    // Build dailyTrends array
    var dailyTrends = [];
    validDays.forEach(function(d) {
      var item = {
        day: d,
        total_import: dailyAll[d].import,
        total_export: dailyAll[d].export,
        net: dailyAll[d].import - dailyAll[d].export,
        byOilType: {}
      };
      Object.keys(dailyByOil).forEach(function(ot) {
        if (dailyByOil[ot][d]) {
          item.byOilType[ot] = {
            import: dailyByOil[ot][d].import,
            export: dailyByOil[ot][d].export,
            net: dailyByOil[ot][d].import - dailyByOil[ot][d].export
          };
        }
      });
      dailyTrends.push(item);
    });
    
    result.monthlyTrends = monthlyTrends;
    result.dailyTrends = dailyTrends;
    
  } catch(e) { Logger.log('ENVR trends error: ' + e.message); }
  
  // === SALES DATA === Process export transactions with sell_type
  try {
    var salesRows = [];
    var monthlySalesByType = {};  // { "2024-01": { "ขายคู่ค้าภายนอก": { liters: 0, revenue: 0 }, ... } }
    var monthlySalesByOil = {};    // { "2024-01": { "ENVR": { liters: 0, revenue: 0 }, ... } }
    
    for (var ti = 0; ti < result.transactions.length; ti++) {
      var t = result.transactions[ti];
      var tType = String(t.type || '').toLowerCase();
      var sellType = String(t.sell_type || '');
      if (tType !== 'export' || !sellType || sellType === 'TEXT' || sellType === 'environ_sell_type') continue;
      
      var dateStr = String(t.date_use || t.timestamp || '');
      var pricePerLiter = parseFloat(t.sell_price) || 0;
      var liters = parseFloat(t.liter) || 0;
      // sell_customer is total revenue when > 100 (numeric)
      var revenue = liters * pricePerLiter;
      var custVal = parseFloat(t.sell_customer);
      if (custVal && custVal > 100) {
        revenue = custVal;
      }
      
      var month = dateStr.substring(0, 7);
      if (month.substring(0, 2) === '25') continue; // skip Buddhist years
      if (!month || month.length !== 7) continue;
      
      var oilType = String(t.oil_type || '');
      var storage = String(t.storage || '');
      var agency = String(t.agency || t.company || '');
      var sellOil = String(t.sell_oil || '');
      var buyer = String(t.sell_customer_tell || '');
      var sellMethod = String(t.sell_method || '');
      var outPerson = String(t.out_person || '');
      var tId = String(t.running || '');
      var name = String(t.name || '');
      
      salesRows.push({
        id: tId,
        date: dateStr,
        month: month,
        oilType: oilType,
        storage: storage,
        liters: liters,
        pricePerLiter: pricePerLiter,
        revenue: revenue,
        sellType: sellType,
        sellOil: sellOil,
        agency: agency,
        buyer: buyer,
        sellMethod: sellMethod,
        outPerson: outPerson,
        name: name
      });
      
      // Monthly by sell type
      if (!monthlySalesByType[month]) monthlySalesByType[month] = {};
      if (!monthlySalesByType[month][sellType]) monthlySalesByType[month][sellType] = { liters: 0, revenue: 0, count: 0 };
      monthlySalesByType[month][sellType].liters += liters;
      monthlySalesByType[month][sellType].revenue += revenue;
      monthlySalesByType[month][sellType].count += 1;
      
      // Monthly by sell_oil (owner)
      if (!monthlySalesByOil[month]) monthlySalesByOil[month] = {};
      if (!monthlySalesByOil[month][sellOil]) monthlySalesByOil[month][sellOil] = { liters: 0, revenue: 0, count: 0 };
      monthlySalesByOil[month][sellOil].liters += liters;
      monthlySalesByOil[month][sellOil].revenue += revenue;
      monthlySalesByOil[month][sellOil].count += 1;
    }
    
    // Sort salesRows by date descending
    salesRows.sort(function(a, b) { return b.date.localeCompare(a.date); });
    
    // Build monthly sales summary array (sorted by month)
    var months = Object.keys(monthlySalesByType).sort();
    var salesMonthlySummary = [];
    for (var mi = 0; mi < months.length; mi++) {
      var m = months[mi];
      var totalLiters = 0, totalRevenue = 0, totalCount = 0;
      var byType = {};
      for (var st in monthlySalesByType[m]) {
        totalLiters += monthlySalesByType[m][st].liters;
        totalRevenue += monthlySalesByType[m][st].revenue;
        totalCount += monthlySalesByType[m][st].count;
        byType[st] = monthlySalesByType[m][st];
      }
      var byOil = {};
      for (var so in monthlySalesByOil[m]) {
        byOil[so] = monthlySalesByOil[m][so];
      }
      salesMonthlySummary.push({
        month: m,
        totalLiters: Math.round(totalLiters * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCount: totalCount,
        byType: byType,
        byOil: byOil
      });
    }
    
    result.salesRows = salesRows;
    result.salesMonthlySummary = salesMonthlySummary;
    
  } catch(e) { Logger.log('ENVR sales error: ' + e.message + ' stack: ' + e.stack); }
  
  return result;
}
