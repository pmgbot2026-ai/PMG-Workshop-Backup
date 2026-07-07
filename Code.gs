/* ═══════════════════════════════════════════════════
   BCT Glass Coating System 2569  v181
   เคลือบแก้ว + บำรุงผิวแก้ว Dashboard & Calendar
   ═══════════════════════════════════════════════════ */

var BCT_SS_ID = '1iy5rYKERWSJwk8m49hNTMr_3CkLBm3PNe27k5zARuCU';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('BCT เคลือบแก้ว 2569')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  return doGet(e);
}

/* ─── Data API ─── */
function getBctData(action, params) {
  var ss = SpreadsheetApp.openById(BCT_SS_ID);
  
  switch(action) {
    case 'listSheets': return listSheets(ss);
    case 'getCustomers': return getCustomers(ss, params);
    case 'getMaintenance': return getMaintenance(ss, params);
    case 'getQueue': return getQueue(ss, params);
    case 'getCalendar': return getCalendarEvents(ss, params);
    case 'getDashboard': return getDashboard(ss);
    case 'saveAppointment': return saveAppointment(ss, params);
    case 'saveMaintenanceNote': return saveMaintenanceNote(ss, params);
    case 'saveCustomer': return saveCustomer(ss, params);
    case 'saveQueue': return saveQueue(ss, params);
    case 'sendNotification': return sendNotification(params);
    case 'getCustomerByPlate': return getCustomerByPlate(ss, params);
    case 'getCustomerMaintenance': return getCustomerMaintenance(ss, params);
    case 'getConfig': return getConfig(ss);
    case 'saveConfig': return saveConfigSettings(params);
    case 'getConfigSettings': return getConfigSettings();
    default: return {error: 'Unknown action: ' + action};
  }
}

/* ─── List all sheets ─── */
function listSheets(ss) {
  var sheets = ss.getSheets();
  return sheets.map(function(s) {
    return {name: s.getName(), sheetId: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn()};
  });
}

/* ─── Get B1 customers (with B2NEW maintenance dates) ─── */
function getCustomers(ss, params) {
  var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  if (!sheet) return {error: 'Sheet not found'};
  
  var data = sheet.getDataRange().getValues();
  var headers = data[3]; // Row 4 = headers
  var result = [];
  
  var startRow = params && params.startRow ? params.startRow : 6; // Row 7 = first data
  var maxRows = params && params.maxRows ? params.maxRows : 200;
  var filter = params && params.filter ? params.filter : null;
  
  // Pre-load B2NEW maintenance data for cross-reference
  var b2Data = getB2MapByPlate_(ss);
  
  for (var i = startRow; i < Math.min(data.length, startRow + maxRows); i++) {
    var row = data[i];
    if (!row[4] && !row[7]) continue; // Skip empty rows
    
    var status = String(row[0] || '');
    var plate = String(row[7] || '');
    
    // Apply filters
    if (filter) {
      if (filter.status && status.indexOf(filter.status) === -1) continue;
      if (filter.plate && plate.indexOf(filter.plate) === -1) continue;
      if (filter.carType && String(row[10] || '').indexOf(filter.carType) === -1) continue;
    }
    
    // Look up maintenance data from B2NEW
    var plateNorm = plate.toUpperCase().replace(/\s/g, '');
    var maintInfo = b2Data[plateNorm] || null;
    
    result.push({
      row: i + 1,
      status: status,
      order: row[1],
      date: formatDate(row[2]),
      receiver: row[3],
      name: row[4],
      address: row[5],
      phone: row[6],
      plate: plate,
      brand: row[8],
      model: row[9],
      carType: row[10],
      coatingType: row[11],
      channel: row[12],
      member: row[13],
      mr: row[14],
      price: row[15],
      contact1: {detail: row[16], date: formatDate(row[17]), person: row[18]},
      contact2: {detail: row[19], date: formatDate(row[20]), person: row[21]},
      contact3: {detail: row[22], date: formatDate(row[23]), person: row[24]},
      appointmentDate: formatDate(row[25]),
      appointmentAction: row[26],
      summary: row[27],
      closeReason: row[28],
      actionPlan: row[29],
      realReceiveDate: formatDate(row[30]),
      realDeliverDate: formatDate(row[31]),
      receiptDate: formatDate(row[32]),
      // B2NEW maintenance data
      maintenance: maintInfo
    });
  }
  
  return {total: result.length, customers: result};
}

/* ─── Helper: Build B2NEW plate→maintenance map ─── */
function getB2MapByPlate_(ss) {
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
      
      if (dueDate || maintenanceDate) {
        services.push({
          cycle: s + 1,
          dueDate: formatDate(dueDate),
          maintenanceDate: formatDate(maintenanceDate),
          callStatus: callStatus || ''
        });
      }
    }
    
    // Find next due
    var nextDueDate = '';
    var nextDueCycle = 0;
    for (var s = 0; s < services.length; s++) {
      if (services[s].dueDate && !services[s].maintenanceDate) {
        if (services[s].callStatus !== 'เข้าใช้บริการแล้ว') {
          nextDueDate = services[s].dueDate;
          nextDueCycle = services[s].cycle;
          break;
        }
      }
    }
    
    map[plate] = {
      row: i + 1,
      services: services,
      nextDueDate: nextDueDate,
      nextDueCycle: nextDueCycle,
      lastContact: formatDate(row[80]),
      lastContactStatus: row[81] || ''
    };
  }
  
  return map;
}

/* ─── Get customer maintenance (standalone API) ─── */
function getCustomerMaintenance(ss, params) {
  var plate = (params.plate || '').toUpperCase().replace(/\s/g, '');
  if (!plate) return {error: 'Missing plate'};
  
  var map = getB2MapByPlate_(ss);
  var result = map[plate] || null;
  
  if (!result) return {found: false};
  result.plate = plate;
  result.found = true;
  return result;
}

/* ─── Get B2NEW maintenance data ─── */
function getMaintenance(ss, params) {
  var sheet = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
  if (!sheet) return {error: 'Sheet not found'};
  
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  var maxRows = params && params.maxRows ? params.maxRows : 500;
  var filterMonth = params && params.month ? params.month : null;
  
  var today = new Date();
  var upcomingOnly = params && params.upcoming;
  
  for (var i = 4; i < Math.min(data.length, 4 + maxRows); i++) {
    var row = data[i];
    if (!row[1] && !row[2]) continue; // Skip empty
    
    var plate = String(row[1] || '');
    var services = [];
    
    // Parse up to 9 service cycles
    // v181: Cycle starts at 0-idx col 26, each cycle = 6 cols:
    //   baseCol+0 = dueDate, baseCol+1 = callDate, baseCol+2 = caller,
    //   baseCol+3 = contactStatus, baseCol+4 = detail, baseCol+5 = maintDate
    for (var s = 0; s < 9; s++) {
      var baseCol = 26 + (s * 6);
      var dueDate = row[baseCol];
      var callDate = row[baseCol + 1];
      var caller = row[baseCol + 2];
      var callStatus = row[baseCol + 3]; // สถานะการติดต่อ (NOT +4)
      var callDetail = row[baseCol + 4]; // รายละเอียด (NOT +3)
      var maintenanceDate = row[baseCol + 5]; // วันที่เข้าบำรุง
      
      if (dueDate || maintenanceDate) {
        services.push({
          cycle: s + 1,
          dueDate: formatDate(dueDate),
          callDate: formatDate(callDate),
          caller: caller,
          callStatus: callStatus,
          callDetail: callDetail,
          maintenanceDate: formatDate(maintenanceDate)
        });
      }
    }
    
    // Find next due date — first cycle without maintDate AND not "เข้าใช้บริการแล้ว"
    var nextDue = null;
    var nextDueCycle = 0;
    for (var s = 0; s < services.length; s++) {
      if (services[s].dueDate && !services[s].maintenanceDate) {
        var svcStatus = String(services[s].callStatus || '');
        if (svcStatus !== 'เข้าใช้บริการแล้ว') {
          var dd = new Date(services[s].dueDate);
          if (!nextDue || dd < nextDue) {
            nextDue = dd;
            nextDueCycle = services[s].cycle;
          }
        }
      }
    }
    
    // If filtering for upcoming only
    if (upcomingOnly && !nextDue) continue;
    if (upcomingOnly && nextDue && nextDue < today) continue;
    
    var lineGroup = row[93] || ''; // link กลุ่ม
    var smsPhone = row[4] || row[99] || '';
    
    result.push({
      row: i + 1,
      code: row[0],
      plate: plate,
      name: row[2],
      address: row[3],
      phone: row[4],
      brand: row[5],
      model: row[6],
      carType: row[7],
      coatingType: row[8],
      channel: row[9],
      member: row[10],
      mr: row[11],
      appointmentDate: formatDate(row[12]),
      deliverDate: formatDate(row[13]),
      receiveDate: formatDate(row[14]),
      receiver: row[15],
      income: row[16],
      cost: row[17],
      mrReward: row[18],
      gift: row[19],
      profit: row[20],
      realDeliverDate: formatDate(row[21]),
      deliverer: row[22],
      receiptNo: row[23],
      receiptDate: formatDate(row[24]),
      services: services,
      nextDueDate: formatDate(nextDue),
      nextDueCycle: nextDueCycle,
      lineGroup: lineGroup,
      smsPhone: smsPhone,
      lastContact: formatDate(row[80]),
      lastContactStatus: row[81],
      dueDates: [formatDate(row[82]), formatDate(row[83]), formatDate(row[84]), formatDate(row[85])]
    });
  }
  
  return {total: result.length, maintenance: result};
}

/* ─── Get C2 Queue data ─── */
function getQueue(ss, params) {
  var sheet = ss.getSheetByName('C2_จองคิว');
  if (!sheet) return {error: 'Sheet not found'};
  
  var data = sheet.getDataRange().getValues();
  var result = {month: '', weeks: []};
  
  // C2 layout (0-indexed):
  // Row 0: Month header at col 4 (E)
  // Row 1: Day names  
  // Row 2+: Date numbers in cols 4,6,8,10,12,14 (Mon-Sat)
  //          Queue entries in cols 5,7,9,11,13,15
  
  // Month header
  if (data.length > 0 && data[0][4]) {
    result.month = String(data[0][4]);
  }
  
  // Parse weeks (groups of rows between date rows)
  var currentWeek = null;
  var weekRows = [];
  
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    // Check if this is a date row - has a number in col 4 (E)
    var dateVal = row[4];
    if (dateVal && String(dateVal).match(/^\d+$/)) {
      // Start a new week
      if (currentWeek) {
        result.weeks.push(currentWeek);
      }
      currentWeek = {
        dates: {
          mon: row[4], tue: row[6], wed: row[8],
          thu: row[10], fri: row[12], sat: row[14]
        },
        queue1: {
          mon: String(row[5] || ''), tue: String(row[7] || ''), wed: String(row[9] || ''),
          thu: String(row[11] || ''), fri: String(row[13] || ''), sat: String(row[15] || '')
        },
        queue2: {mon:'', tue:'', wed:'', thu:'', fri:'', sat:''},
        special: {mon:'', tue:'', wed:'', thu:'', fri:'', sat:''},
        _startRow: i  // track for writing
      };
    } else if (currentWeek) {
      // This could be queue2 or special row
      var rowText = String(row[4] || '');
      if (rowText.indexOf('คิว 2') >= 0 || rowText.indexOf('13:00') >= 0) {
        currentWeek.queue2 = {
          mon: String(row[5] || ''), tue: String(row[7] || ''), wed: String(row[9] || ''),
          thu: String(row[11] || ''), fri: String(row[13] || ''), sat: String(row[15] || '')
        };
        currentWeek._q2Row = i;
      } else if (rowText.indexOf('พิเศษ') >= 0 || rowText.indexOf('เช้ารับเย็น') >= 0) {
        currentWeek.special = {
          mon: String(row[5] || ''), tue: String(row[7] || ''), wed: String(row[9] || ''),
          thu: String(row[11] || ''), fri: String(row[13] || ''), sat: String(row[15] || '')
        };
        currentWeek._specRow = i;
      } else if (rowText.indexOf('คิว 1') >= 0 || rowText.indexOf('09:00') >= 0 || rowText.indexOf('9:00') >= 0) {
        // Queue 1 label row (after date row)
        currentWeek._q1Row = i;
      }
    }
  }
  if (currentWeek) result.weeks.push(currentWeek);
  
  // Clean up internal tracking fields for JSON output
  // (keep _startRow etc. for write operations but strip from final)
  
  return result;
}

/* ─── Get calendar events (from maintenance due dates) ─── */
function getCalendarEvents(ss, params) {
  var sheet = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
  if (!sheet) return {error: 'Sheet not found'};
  
  var data = sheet.getDataRange().getValues();
  var events = [];
  var year = params && params.year ? params.year : new Date().getFullYear() + 543;
  var month = params && params.month ? params.month : null;
  
  var today = new Date();
  
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    if (!row[1] && !row[2]) continue;
    
    var plate = String(row[1] || '');
    var name = String(row[2] || '');
    var coatingType = String(row[8] || '');
    
    // Parse all service due dates as calendar events
    for (var s = 0; s < 9; s++) {
      var baseCol = 26 + (s * 6);
      var dueDate = row[baseCol];
      var maintenanceDate = row[baseCol + 5];
      
      if (dueDate && !maintenanceDate) {
        // Still pending - not yet done
        var dd = new Date(dueDate);
        if (dd < new Date('2020-01-01')) continue;
        
        events.push({
          type: 'maintenance_due',
          title: 'บำรุงครั้งที่ ' + (s+1) + ': ' + plate,
          plate: plate,
          name: name,
          date: formatDate(dueDate),
          coatingType: coatingType,
          cycle: s + 1,
          phone: row[4],
          lineGroup: row[93] || '',
          row: i + 1
        });
      }
      
      if (maintenanceDate) {
        var md = new Date(maintenanceDate);
        if (md < new Date('2020-01-01')) continue;
        
        events.push({
          type: 'maintenance_done',
          title: 'บำรุงเสร็จ ครั้งที่ ' + (s+1) + ': ' + plate,
          plate: plate,
          name: name,
          date: formatDate(maintenanceDate),
          coatingType: coatingType,
          cycle: s + 1
        });
      }
    }
    
    // Also add appointment dates
    if (row[12]) {
      events.push({
        type: 'coating_appointment',
        title: 'เคลือบแก้ว: ' + plate,
        plate: plate,
        name: name,
        date: formatDate(row[12]),
        coatingType: coatingType,
        phone: row[4],
        lineGroup: row[93] || ''
      });
    }
    
    if (row[13]) {
      events.push({
        type: 'deliver_car',
        title: 'ส่งมอบรถ: ' + plate,
        plate: plate,
        name: name,
        date: formatDate(row[13]),
        phone: row[4]
      });
    }
  }
  
  // Filter by month if requested
  if (month) {
    events = events.filter(function(e) {
      return e.date && e.date.indexOf(month) >= 0;
    });
  }
  
  // Sort by date
  events.sort(function(a, b) {
    return (a.date || '').localeCompare(b.date || '');
  });
  
  return {total: events.length, events: events};
}

/* ─── Get Dashboard summary ─── */
function getDashboard(ss) {
  var b1Sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  var b2NewSheet = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
  
  var result = {
    customers: {total: 0, closed: 0, open: 0, newCar: 0, usedCar: 0},
    maintenance: {total: 0, upcoming: 0, overdue: 0, done: 0},
    coating: {spray1y: 0, spray3y: 0, diamond: 0},
    queue: {today: 0, thisWeek: 0},
    revenue: {total: 0, cost: 0, profit: 0}
  };
  
  // B1 Customer stats
  if (b1Sheet) {
    var b1Data = b1Sheet.getDataRange().getValues();
    for (var i = 6; i < b1Data.length; i++) {
      if (!b1Data[i][4] && !b1Data[i][7]) continue;
      result.customers.total++;
      
      var status = String(b1Data[i][0] || '');
      if (status.indexOf('ปิดได้') >= 0) result.customers.closed++;
      else result.customers.open++;
      
      var carType = String(b1Data[i][10] || '');
      if (carType.indexOf('รถใหม่') >= 0) result.customers.newCar++;
      else if (carType.indexOf('ใช้งาน') >= 0) result.customers.usedCar++;
      
      var coating = String(b1Data[i][11] || '');
      if (coating.indexOf('พ่น 1') >= 0) result.coating.spray1y++;
      else if (coating.indexOf('พ่น 3') >= 0) result.coating.spray3y++;
      else if (coating.indexOf('Diamond') >= 0 || coating.indexOf('ไดมอน') >= 0) result.coating.diamond++;
    }
  }
  
  // B2NEW Maintenance stats
  if (b2NewSheet) {
    var b2Data = b2NewSheet.getDataRange().getValues();
    var today = new Date();
    
    for (var i = 4; i < b2Data.length; i++) {
      if (!b2Data[i][1] && !b2Data[i][2]) continue;
      result.maintenance.total++;
      
      // Check if any service is overdue or upcoming
      for (var s = 0; s < 9; s++) {
        var baseCol = 26 + (s * 6);
        var dueDate = b2Data[i][baseCol];
        var maintenanceDate = b2Data[i][baseCol + 5];
        var callStatus = String(b2Data[i][baseCol + 3] || '');
        
        if (dueDate && !maintenanceDate && callStatus !== 'เข้าใช้บริการแล้ว') {
          var dd = new Date(dueDate);
          if (dd < today) {
            result.maintenance.overdue++;
          } else if (dd <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            result.maintenance.upcoming++;
          }
          break; // Only count first pending service
        }
        if (maintenanceDate || callStatus === 'เข้าใช้บริการแล้ว') {
          result.maintenance.done++;
          break;
        }
      }
      
      // Revenue
      if (b2Data[i][16]) result.revenue.total += Number(b2Data[i][16]) || 0;
      if (b2Data[i][17]) result.revenue.cost += Number(b2Data[i][17]) || 0;
      if (b2Data[i][20]) result.revenue.profit += Number(b2Data[i][20]) || 0;
    }
  }
  
  return result;
}

/* ─── Save Appointment (to B1 + B2NEW + C2) ─── */
function saveAppointment(ss, params) {
  try {
    var results = {};
    
    // 1. Save to B1
    var b1 = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
    if (b1) {
      var lastRow = b1.getLastRow();
      var newRow = lastRow + 1;
      
      var rowData = [
        params.plate + '_' + (params.carType || 'รถใหม่ PMS') + '_นัดหมาย',
        newRow - 6, // ลำดับ
        new Date(), // วันที่
        params.receiver || Session.getActiveUser().getEmail(),
        params.name,
        params.address,
        params.phone,
        params.plate,
        params.brand || 'ISUZU',
        params.model || '',
        params.carType || 'รถใหม่ PMS',
        params.coatingType || 'พ่น 1 ปี',
        params.channel || 'ที่ปรึกษาการขาย',
        params.member || '',
        params.mr || '',
        params.price || '',
        '', '', '', '', // Contact 1 detail, date, person
        '', '', '', '', // Contact 2
        '', '', '', '', // Contact 3
        new Date(params.appointmentDate), // Z = วันที่นัดหมาย
        new Date(params.deliverDate || params.appointmentDate), // AA = นัดส่งมอบ
        'นัดหมาย', // AB = สรุปสถานะ
        '', // AC = สาเหตุ
        'นัดเคลือบแก้ว ' + formatDate(new Date(params.appointmentDate)),  // AD = Action Plan
        '', '', '', ''
      ];
      
      b1.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
      results.b1 = {row: newRow, status: 'saved'};
      
      // 2. Also put plate in B2 (triggers VLOOKUP auto-fill)
      var b2 = ss.getSheetByName('B2_แจ้งเตือนครบบำรุง');
      if (b2) {
        var b2LastRow = b2.getLastRow();
        b2.getRange(b2LastRow + 1, 3).setValue(params.plate); // Column C = ทะเบียน
        results.b2 = {row: b2LastRow + 1, status: 'saved'};
      }
    }
    
    // 3. Write to C2 queue if appointment date provided
    if (params.appointmentDate) {
      var queueResult = bctWriteQueueEntry_(ss, params.appointmentDate, params.plate, params.name, params.coatingType || '');
      results.c2 = queueResult;
    }
    
    // 4. Send notifications
    if (params.sendNotification !== false) {
      var notifResult = sendNotification({
        name: params.name,
        phone: params.phone,
        plate: params.plate,
        appointmentDate: params.appointmentDate,
        deliverDate: params.deliverDate,
        lineGroup: params.lineGroup,
        type: 'appointment'
      });
      results.notification = notifResult;
    }
    
    return {success: true, results: results};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── BCT Write Queue Entry (C2) ───
 *  v181: Properly find month header, then date row, then correct queue column
 */
function bctWriteQueueEntry_(ss, dateStr, plate, name, coatingType) {
  try {
    var sheet = ss.getSheetByName('C2_จองคิว');
    if (!sheet) return {error: 'C2 sheet not found'};
    
    var dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return {error: 'Invalid date: ' + dateStr};
    
    var day = dateObj.getDate();
    var month = dateObj.getMonth() + 1;
    var yearTH = dateObj.getFullYear() + 543;
    
    var data = sheet.getDataRange().getValues();
    var entry = plate + ' - ' + (name || '') + ' (' + (coatingType || '') + ')';
    
    // C2 layout:
    // Row 0 (0-idx): Month header at col 4 — e.g. "มิถุนายน 2569"
    // Row 1: Day names
    // Row 2+: Date numbers in Label cols (4,6,8,10,12,14)
    //          Queue data in Data cols (5,7,9,11,13,15)
    // Each "week" = date row + queue1 row [+ queue2 row] [+ special row]
    
    // Step 1: Find the correct month section
    var monthRow = -1;
    for (var i = 0; i < data.length; i++) {
      var monthVal = String(data[i][4] || '');
      if (monthVal && monthVal.indexOf(String(month)) >= 0 && monthVal.indexOf(String(yearTH)) >= 0) {
        monthRow = i;
        break;
      }
    }
    
    if (monthRow === -1) {
      // Month not found — need to create new month section
      var lastRow = sheet.getLastRow();
      var startRow = lastRow + 1;
      
      // Write month header
      var thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      sheet.getRange(startRow, 5).setValue(thMonths[month-1] + ' ' + yearTH);
      
      // Write day headers
      var dayNames = ['จ','อ','พ','พฤ','ศ','ส'];
      for (var d = 0; d < 6; d++) {
        sheet.getRange(startRow + 1, 5 + d * 2).setValue(dayNames[d]);
      }
      
      // Write first week date row with the target day
      var dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...6=Sat
      if (dayOfWeek === 0) dayOfWeek = 6; // Sunday → treat as Saturday
      else dayOfWeek = dayOfWeek - 1; // Mon=0, Tue=1...Sat=5
      
      sheet.getRange(startRow + 2, 5 + dayOfWeek * 2).setValue(day);
      sheet.getRange(startRow + 2, 6 + dayOfWeek * 2).setValue('คิว 1: ' + entry);
      
      return {status: 'created_month', row: startRow + 2, col: 6 + dayOfWeek * 2};
    }
    
    // Step 2: Search from monthRow down for the correct date
    // Find the week row that contains the matching day number
    var targetRow = -1;
    var targetCol = -1; // Data column (0-idx)
    
    for (var i = monthRow + 2; i < data.length; i++) {
      var row = data[i];
      
      // Check each day position (cols 4,6,8,10,12,14 = Mon-Sat)
      for (var d = 0; d < 6; d++) {
        var labelCol = 4 + d * 2; // 0-idx
        var dataCol = 5 + d * 2;  // 0-idx
        
        var cellVal = row[labelCol];
        // Match date number
        if (cellVal && Number(cellVal) === day) {
          targetRow = i;
          targetCol = dataCol;
          
          // Found the date — now check if next row is queue1 row or this row has queue data
          var currentQueue = String(row[dataCol] || '');
          
          if (currentQueue && currentQueue.indexOf('คิว') >= 0) {
            // This IS the queue row for this date group
            var newVal = currentQueue + '\n' + entry;
            sheet.getRange(i + 1, dataCol + 1).setValue(newVal); // +1 for 1-indexed
          } else {
            // This is the date row; look for queue row below
            var queueRowFound = false;
            for (var j = i + 1; j < Math.min(i + 4, data.length); j++) {
              var nextRowVal = String(data[j][4] || '');
              // If next row has another number or month header, stop
              if (nextRowVal && String(nextRowVal).match(/^\d+$/) && Number(nextRowVal) !== day) break;
              if (nextRowVal && nextRowVal.indexOf(String(yearTH)) >= 0) break;
              
              // Check if this row has queue data for our column
              if (data[j][dataCol] !== undefined && data[j][dataCol] !== '') {
                var qData = String(data[j][dataCol] || '');
                var updated = qData + '\n' + entry;
                sheet.getRange(j + 1, dataCol + 1).setValue(updated);
                queueRowFound = true;
                break;
              }
            }
            
            if (!queueRowFound) {
              // Write queue entry directly to the date row's data column
              sheet.getRange(i + 1, dataCol + 1).setValue(entry);
            }
          }
          
          return {status: 'updated', row: targetRow + 1, col: targetCol + 1};
        }
      }
      
      // If we hit another month header, stop searching
      if (String(row[4] || '').indexOf(String(yearTH)) >= 0 && i > monthRow + 2) {
        // Different month
        var rowMonth = String(row[4] || '');
        if (rowMonth.indexOf(String(month)) === -1) break;
      }
    }
    
    // Day not found in existing rows — add new date entry
    // Find last row of current month section
    var insertRow = monthRow + 2;
    for (var i = monthRow + 2; i < data.length; i++) {
      var rowVal = String(data[i][4] || '');
      if (rowVal && rowVal.indexOf(String(yearTH)) >= 0 && i > monthRow) {
        break;
      }
      insertRow = i + 1;
    }
    
    // Determine day of week for column position
    var dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 6;
    else dayOfWeek--;
    
    var labelColPos = 5 + dayOfWeek * 2; // 1-indexed
    var dataColPos = 6 + dayOfWeek * 2;  // 1-indexed
    
    sheet.getRange(insertRow, labelColPos).setValue(day);
    sheet.getRange(insertRow, dataColPos).setValue(entry);
    
    return {status: 'added_date', row: insertRow, col: dataColPos};
    
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Save Maintenance Note ───
 *  v181: Fixed cycle selection — find FIRST cycle without maintDate
 *         AND not "เข้าใช้บริการแล้ว"
 *         Also fixes column offset: contactStatus = baseCol+3, detail = baseCol+4
 */
function saveMaintenanceNote(ss, params) {
  try {
    var sheet = ss.getSheetByName('แจ้งเตือนบำรุงผิวแก้วNEW!');
    if (!sheet) return {error: 'Sheet not found'};
    
    var row = params.row;
    var requestedCycle = params.cycle || 0; // 0 = auto-select
    var cycle = requestedCycle;
    
    // If no specific cycle, find first cycle without maintDate and not done
    if (cycle === 0) {
      var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      for (var s = 0; s < 9; s++) {
        var baseCol = 26 + (s * 6); // 0-indexed
        var maintDateVal = data[baseCol + 5];
        var contactStatusVal = String(data[baseCol + 3] || '');
        
        if (!maintDateVal && contactStatusVal !== 'เข้าใช้บริการแล้ว') {
          cycle = s + 1;
          break;
        }
      }
      if (cycle === 0) cycle = 1; // fallback
    }
    
    // Convert cycle to 1-indexed column position
    // getRange is 1-indexed, array is 0-indexed
    // baseCol (0-idx) = 26 + ((cycle-1) * 6)
    // getRange col = baseCol + 1 (1-indexed conversion)
    var baseCol = 26 + ((cycle - 1) * 6); // 0-indexed base
    
    // Update maintenance tracking columns
    if (params.callDate) {
      sheet.getRange(row, baseCol + 1 + 1).setValue(new Date(params.callDate)); // วันที่โทร
    }
    if (params.caller) {
      sheet.getRange(row, baseCol + 2 + 1).setValue(params.caller); // ผู้ติดต่อ
    }
    if (params.callStatus) {
      sheet.getRange(row, baseCol + 3 + 1).setValue(params.callStatus); // สถานะการติดต่อ (NOT +4)
    }
    if (params.callDetail) {
      sheet.getRange(row, baseCol + 4 + 1).setValue(params.callDetail); // รายละเอียด (NOT +3)
    }
    if (params.maintenanceDate) {
      sheet.getRange(row, baseCol + 5 + 1).setValue(new Date(params.maintenanceDate)); // วันที่เข้าบำรุง
      // Also write to C2 queue
      var data2 = sheet.getRange(row, 1, 1, 5).getValues()[0];
      var plate2 = String(data2[1] || '');
      var name2 = String(data2[2] || '');
      var coatingType2 = String(data2[8] || '');
      bctWriteQueueEntry_(ss, params.maintenanceDate, plate2, name2, coatingType2);
    }
    
    return {success: true, row: row, cycle: cycle};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Save Customer (new or update) ─── */
function saveCustomer(ss, params) {
  try {
    var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
    if (!sheet) return {error: 'Sheet not found'};
    
    if (params.row) {
      // Update existing customer
      var row = params.row;
      if (params.name) sheet.getRange(row, 5).setValue(params.name); // E
      if (params.address) sheet.getRange(row, 6).setValue(params.address); // F
      if (params.phone) sheet.getRange(row, 7).setValue(params.phone); // G
      if (params.plate) sheet.getRange(row, 8).setValue(params.plate); // H
      if (params.brand) sheet.getRange(row, 9).setValue(params.brand); // I
      if (params.model) sheet.getRange(row, 10).setValue(params.model); // J
      if (params.coatingType) sheet.getRange(row, 12).setValue(params.coatingType); // L
      if (params.appointmentDate) sheet.getRange(row, 26).setValue(new Date(params.appointmentDate)); // Z
      if (params.summary) sheet.getRange(row, 28).setValue(params.summary); // AB
      return {success: true, action: 'updated', row: row};
    }
    
    return {error: 'Missing row parameter for update'};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Save Queue booking ─── */
function saveQueue(ss, params) {
  try {
    var sheet = ss.getSheetByName('C2_จองคิว');
    if (!sheet) return {error: 'Sheet not found'};
    
    var row = params.row;
    var col = params.col;
    var text = params.text;
    
    if (row && col && text) {
      var current = sheet.getRange(row, col).getValue();
      var newText = current ? current + '\n' + text : text;
      sheet.getRange(row, col).setValue(newText);
      return {success: true};
    }
    
    return {error: 'Missing row, col, or text'};
  } catch(e) {
    return {error: String(e)};
  }
}

/* ─── Get Customer by Plate (for autocomplete) ─── */
function getCustomerByPlate(ss, params) {
  var sheet = ss.getSheetByName('B1_บันทึกข้อมูลลูกค้า');
  if (!sheet) return {error: 'Sheet not found'};
  
  var plate = (params.plate || '').toUpperCase().replace(/\s/g, '');
  if (!plate) return {error: 'Missing plate'};
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 6; i < data.length; i++) {
    var rowPlate = String(data[i][7] || '').toUpperCase().replace(/\s/g, '');
    if (rowPlate.indexOf(plate) >= 0) {
      return {
        found: true,
        row: i + 1,
        name: data[i][4],
        address: data[i][5],
        phone: data[i][6],
        plate: data[i][7],
        brand: data[i][8],
        model: data[i][9],
        carType: data[i][10],
        coatingType: data[i][11],
        channel: data[i][12],
        member: data[i][13],
        mr: data[i][14],
        price: data[i][15]
      };
    }
  }
  
  return {found: false};
}

/* ─── Get Config (dropdowns etc.) ─── */
function getConfig(ss) {
  var sheet = ss.getSheetByName('A4_config');
  if (!sheet) return {error: 'Sheet not found'};
  
  var data = sheet.getDataRange().getValues();
  var config = {
    bu: [], channels: [], statuses: [], appointmentStatuses: [],
    callStatuses: [], contactTypes: [], smsTemplate: '', smsSender: ''
  };
  
  // BU list (column 1, rows 9+)
  for (var i = 9; i < data.length; i++) {
    if (data[i][1]) config.bu.push(data[i][1]);
  }
  
  // Contact types (column 2, rows 9+)
  for (var i = 9; i < data.length; i++) {
    if (data[i][2]) config.contactTypes.push(data[i][2]);
  }
  
  // Interest (column 4)
  for (var i = 9; i < data.length; i++) {
    if (data[i][4]) config.channels.push(data[i][4]);
  }
  
  // Appointment status (column 5)
  for (var i = 9; i < data.length; i++) {
    if (data[i][5]) config.appointmentStatuses.push(data[i][5]);
  }
  
  // Status (column 6)
  for (var i = 9; i < data.length; i++) {
    if (data[i][6]) config.statuses.push(data[i][6]);
  }
  
  // SMS config (row 9, cols 12-14)
  config.smsTemplate = data[9][12] || '';
  config.smsSender = data[9][13] || '';
  
  return config;
}

/* ─── Send Notification (Line + SMS) ───
 *  v181: Fixed Line Notify DNS error — use alternative endpoint + retry
 */
function sendNotification(params) {
  // DISABLED per user request — no more maintenance notifications (LINE/SMS/email all stopped)
  return {disabled: true, reason: 'Notifications disabled per user request'};
}

/* ─── SMS via ThaiBulkSMS API ─── */
function sendSMS_(phone, message) {
  var SMS_API_URL = 'https://portal.thaibulksms.com/sms_api';
  var SMS_USERNAME = PropertiesService.getScriptProperties().getProperty('SMS_USERNAME');
  var SMS_PASSWORD = PropertiesService.getScriptProperties().getProperty('SMS_PASSWORD');
  var SMS_SENDER = PropertiesService.getScriptProperties().getProperty('SMS_SENDER') || 'PRACHAKIJ';
  
  if (!SMS_USERNAME || !SMS_PASSWORD) {
    return {sent: false, reason: 'SMS credentials not configured. Set SMS_USERNAME and SMS_PASSWORD in Script Properties. Current user may only have test credentials.'};
  }
  
  var cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) {
    return {sent: false, reason: 'Invalid phone number: ' + phone};
  }
  
  var payload = {
    username: SMS_USERNAME,
    password: SMS_PASSWORD,
    sender: SMS_SENDER,
    msisdn: cleanPhone,
    message: message.substring(0, 160), // SMS limit
    force: 'standard'
  };
  
  try {
    var response = UrlFetchApp.fetch(SMS_API_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    var code = response.getResponseCode();
    var body = response.getContentText();
    
    return {sent: code === 200, phone: cleanPhone, responseCode: code, response: body.substring(0, 100)};
  } catch(e) {
    return {sent: false, error: String(e)};
  }
}

/* ─── Line Notify Token ─── */
function getLineToken_() {
  return PropertiesService.getScriptProperties().getProperty('LINE_NOTIFY_TOKEN') || '';
}

/* ─── Helper: Format Date ─── */
function formatDate(d) {
  if (!d) return '';
  if (!(d instanceof Date)) {
    try { d = new Date(d); } catch(e) { return ''; }
  }
  if (isNaN(d.getTime())) return '';
  
  var dd = d.getDate();
  var mm = d.getMonth() + 1;
  var yyyy = d.getFullYear();
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + yyyy;
}

/* ─── Trigger: Auto-check maintenance due dates daily ─── */
function checkMaintenanceDue() {
  // DISABLED per user request — no more maintenance due notifications
  return;
}

/* ─── Setup triggers ─── */
function setupTriggers() {
  // DISABLED per user request — no more maintenance triggers
  // Delete existing triggers instead of creating new ones
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  } catch(e) {}
  return {triggers: 0, disabled: true};
}

/* ─── Save Config Settings (Script Properties) ─── */
function saveConfigSettings(params) {
  var props = PropertiesService.getScriptProperties();
  if (params.lineNotifyToken !== undefined) props.setProperty('LINE_NOTIFY_TOKEN', params.lineNotifyToken);
  if (params.smsUsername !== undefined) props.setProperty('SMS_USERNAME', params.smsUsername);
  if (params.smsPassword !== undefined) props.setProperty('SMS_PASSWORD', params.smsPassword);
  if (params.smsSender !== undefined) props.setProperty('SMS_SENDER', params.smsSender || 'PRACHAKIJ');
  return {success: true};
}

/* ─── Get Config Settings (masked for security) ─── */
function getConfigSettings() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var result = {};
  if (props['LINE_NOTIFY_TOKEN']) result.lineNotifyToken = '••••' + props['LINE_NOTIFY_TOKEN'].slice(-4);
  else result.lineNotifyToken = '';
  if (props['SMS_USERNAME']) { result.smsUsername = props['SMS_USERNAME']; result.smsSender = props['SMS_SENDER'] || 'PRACHAKIJ'; result.hasSmsPass = !!props['SMS_PASSWORD']; }
  else { result.smsUsername = ''; result.smsSender = 'PRACHAKIJ'; result.hasSmsPass = false; }
  return result;
}

/* ─── Migrate Script Properties from old script ─── */
