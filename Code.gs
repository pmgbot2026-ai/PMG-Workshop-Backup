/**
 * ═══════════════════════════════════════════════════════════════
 * เช็คอะไหล่ในสต็อก PMG — กระทบใบเสนอราคากับฐานข้อมูลอะไหล่
 * ═══════════════════════════════════════════════════════════════
 * 1. ผู้ใช้ใส่ link ใบเสนอราคา → ดึงรหัส part ทั้งหมด
 * 2. กระทบ part 4 หลักสุดท้าย กับฐานข้อมูลอะไหล่
 * 3. แสดงผล: อะไหล่อยู่แท็บไหน, เซลล์ไหน, ชั้นจัดเก็บอะไร
 * 4. ฟอร์มเบิกใช้ + ตัดสต็อก
 */

var PARTS_SS_ID = '1R125GQSzESWo9bbhS92bqVML6BaEf3mNZN_6WP_XkJA';

function doGet(e) {
  var p = e.parameter || {};
  
  // API mode: return JSON
  if (p.api === '1') {
    if (p.action === 'checkParts') {
      var url = p.url || '';
      return ContentService.createTextOutput(JSON.stringify(checkPartsFromQuotation_(url)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (p.action === 'getInventory') {
      return ContentService.createTextOutput(JSON.stringify(getInventory_()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (p.action === 'getWithdrawals') {
      return ContentService.createTextOutput(JSON.stringify(getWithdrawals_()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (p.action === 'withdraw') {
      return ContentService.createTextOutput(JSON.stringify(withdrawParts_(JSON.parse(p.data || '{}'))))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (p.action === 'search') {
      return ContentService.createTextOutput(JSON.stringify(searchPart_(p.q || '')))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Main page
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('เช็คอะไหล่ในสต็อก PMG')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ════════ ดึงข้อมูลอะไหล่จากใบเสนอราคา ════════
 */
function fetchQuotationParts_(quotationUrl) {
  if (!quotationUrl) return { success: false, error: 'กรุณาระบุ URL' };
  
  try {
    var response = UrlFetchApp.fetch(quotationUrl, { muteHttpExceptions: true, followRedirects: true });
    var html = response.getContentText();
    
    // Parse HTML to extract parts table
    // Structure: <td> contains part codes like 8978245120, item names, quantities
    // The table has columns: ลำดับ, รหัส, รายการ, จำนวน, ราคาต่อหน่วย, ส่วนลด, ราคาสุทธิ, ราคาค่าซ่อม
    
    // Extract the main table rows
    var parts = [];
    
    // Find all <td> contents - extract part codes and names
    // Part codes are numeric (10 digits typically)
    // Use regex to find the table structure
    
    // Method: split by <BR> within td cells to get individual items
    // Column 2 (รหัส) contains part codes separated by <BR>
    // Column 3 (รายการ) contains part names separated by <BR>
    // Column 4 (จำนวน) contains quantities separated by <BR>
    
    // Extract รหัส column (2nd column in data row)
    var codeMatch = html.match(/<td[^>]*valign="top"[^>]*style="text-align:\s*left"[^>]*>([\s\S]*?)<\/td>/g);
    var codes = [];
    var names = [];
    var qtys = [];
    var prices = [];
    
    if (codeMatch && codeMatch.length >= 3) {
      // First text-align:left td after the ลำดับ column = รหัส column
      var codesHtml = codeMatch[0];
      var namesHtml = codeMatch[1];
      var qtyHtml = codeMatch.length > 2 ? codeMatch[2] : '';
      
      // Split by <BR> and clean HTML tags
      function cleanCell(cellHtml) {
        return cellHtml.replace(/<[^>]+>/g, '|').split('|').map(function(s) {
          return s.replace(/&nbsp;/g, '').replace(/&#43;/g, '+').trim();
        }).filter(function(s) { return s.length > 0; });
      }
      
      codes = cleanCell(codesHtml);
      names = cleanCell(namesHtml);
      
      // Quantity column (4th column - text-align:right)
      var qtyMatch = html.match(/<td[^>]*valign="top"[^>]*style="text-align:\s*right"[^>]*>([\s\S]*?)<\/td>/g);
      if (qtyMatch && qtyMatch.length > 0) {
        qtys = cleanCell(qtyMatch[0]);
      }
      
      // Price column
      if (qtyMatch && qtyMatch.length > 1) {
        prices = cleanCell(qtyMatch[1]);
      }
    }
    
    // Build parts list: pair code + name, skip non-part entries
    var partsList = [];
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var name = names[i] || '';
      var qty = qtys[i] || '1';
      var price = prices[i] || '';
      
      // Skip headers, section headers (***), and labor items (ค่าแรง)
      if (!code) continue;
      if (code === 'รหัส') continue;
      if (name.indexOf('***') >= 0) continue;
      if (name.indexOf('ค่าแรง') >= 0) continue;
      if (name === 'เปลี่ยน' || name === 'เบา') continue;
      if (name.indexOf('ทำสี') >= 0 || name.indexOf('ซ่อม') >= 0) continue;
      
      // Extract numeric part code
      var partCode = code.replace(/[^0-9]/g, '');
      if (partCode.length < 4) continue;
      
      // Skip if it's a quantity number (short, and name is a labor term)
      if (partCode.length < 6 && name.length > 0) {
        // Could be a row number, not a part code
        // Real part codes are usually 10 digits
        continue;
      }
      
      partsList.push({
        code: partCode,
        last4: partCode.slice(-4),
        name: name,
        qty: parseInt(qty) || 1,
        price: price
      });
    }
    
    // Extract quotation metadata
    var quotNo = '';
    var quotDate = '';
    var plate = '';
    var jobNo = '';
    var vehicle = '';
    var customer = '';
    
    var quotNoMatch = html.match(/เลขที่<\/B><\/td>\s*<td[^>]*><B>([^<]+)/);
    if (quotNoMatch) quotNo = quotNoMatch[1].trim();
    
    var quotDateMatch = html.match(/วันที่<\/B><\/td>\s*<td[^>]*><B>([^<]+)/);
    if (quotDateMatch) quotDate = quotDateMatch[1].trim();
    
    var plateMatch = html.match(/ทะเบียน\s*:\s*&nbsp;([^\s<]+)/);
    if (plateMatch) plate = plateMatch[1].trim();
    
    var jobMatch = html.match(/เลขที่\s*JOB\s*:\s*&nbsp;([^\s<]+)/);
    if (jobMatch) jobNo = jobMatch[1].trim();
    
    var vehicleMatch = html.match(/รถยี่ห้อ\s*:\s*&nbsp;([^\s<]+)/);
    if (vehicleMatch) vehicle = vehicleMatch[1].trim();
    
    var customerMatch = html.match(/ชื่อ\s*:\s*&nbsp;([^<\n]+)/);
    if (customerMatch) customer = customerMatch[1].trim();
    
    return {
      success: true,
      quotationNo: quotNo,
      quotationDate: quotDate,
      plate: plate,
      jobNo: jobNo,
      vehicle: vehicle,
      customer: customer,
      parts: partsList,
      url: quotationUrl
    };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

/**
 * ════════ ดึงฐานข้อมูลอะไหล่ ════════
 */
function getInventory_() {
  var ss = SpreadsheetApp.openById(PARTS_SS_ID);
  var result = [];
  
  // Tab 1: เก็บข้อมูลอะไหล่ NEW — 3 column groups per row
  var sheet1 = ss.getSheetByName('เก็บข้อมูลอะไหล่ NEW');
  if (sheet1) {
    var lastRow = sheet1.getLastRow();
    var lastCol = Math.min(sheet1.getLastColumn(), 30);
    if (lastRow > 5) {
      var data = sheet1.getRange(6, 1, lastRow - 5, lastCol).getValues();
      
      // 3 column groups:
      // Group 0: col indices (0-indexed): brand=2, model=3, part=4, name=5, shelf=6, plate=7
      // Group 1: brand=10, model=11, part=12, name=13, shelf=14, plate=15
      // Group 2: brand=19, model=20, part=21, name=22, shelf=23, plate=24
      var groups = [
        { offset: 2, label: 'A1-01' },
        { offset: 10, label: 'A1-02' },
        { offset: 19, label: 'A1-03' }
      ];
      
      for (var ri = 0; ri < data.length; ri++) {
        var row = data[ri];
        var rowNum = ri + 6; // 1-indexed
        
        for (var gi = 0; gi < groups.length; gi++) {
          var g = groups[gi];
          var partVal = String(row[g.offset + 2] || '').trim(); // part column
          if (!partVal || partVal === 'part') continue;
          
          // Clean part number (remove .0 suffix)
          partVal = partVal.replace(/\.0$/, '').trim();
          
          var name = String(row[g.offset + 3] || '').trim();
          var brand = String(row[g.offset] || '').trim();
          var model = String(row[g.offset + 1] || '').trim();
          var shelf = String(row[g.offset + 4] || '').trim();
          var plate = String(row[g.offset + 5] || '').trim();
          
          // Extract digits for matching
          var digits = partVal.replace(/[^0-9]/g, '');
          if (digits.length < 4) continue;
          
          result.push({
            tab: 'เก็บข้อมูลอะไหล่ NEW',
            group: g.label,
            row: rowNum,
            part: partVal,
            last4: digits.slice(-4),
            name: name,
            brand: brand,
            model: model,
            shelf: shelf,
            plate: plate,
            status: 'in_stock'
          });
        }
      }
    }
  }
  
  // Tab 2: อะไหล่สต๊อกที่ไม่รู้พาร์ท+อะไหล่
  // Sheet name might be truncated, find it
  var sheets = ss.getSheets();
  for (var si = 0; si < sheets.length; si++) {
    var sname = sheets[si].getName();
    if (sname.indexOf('ไม่รู้พาร์ท') >= 0 || sname.indexOf('ต่างยี่ห้อ') >= 0) {
      var sheet2 = sheets[si];
      var lr2 = sheet2.getLastRow();
      var lc2 = Math.min(sheet2.getLastColumn(), 12);
      if (lr2 > 5) {
        var data2 = sheet2.getRange(6, 1, lr2 - 5, lc2).getValues();
        // Columns: No.(2), ยี่ห้อ(3), รุ่น(4), part(5), รายการ(6), ราคา(7), Link(8)
        for (var r2 = 0; r2 < data2.length; r2++) {
          var row2 = data2[r2];
          var part2 = String(row2[5] || '').trim();
          var name2 = String(row2[6] || '').trim();
          if (!part2 && !name2) continue;
          if (part2 === 'part') continue;
          
          var digits2 = part2.replace(/[^0-9]/g, '');
          
          result.push({
            tab: sname,
            group: 'ไม่รู้พาร์ท',
            row: r2 + 6,
            part: part2 || '(ไม่ระบุ)',
            last4: digits2.length >= 4 ? digits2.slice(-4) : '',
            name: name2,
            brand: String(row2[3] || '').trim(),
            model: String(row2[4] || '').trim(),
            shelf: 'SUP 1',
            plate: '',
            status: 'in_stock'
          });
        }
      }
      break;
    }
  }
  
  return { success: true, total: result.length, inventory: result };
}

/**
 * ════════ กระทบใบเสนอราคากับฐานข้อมูล ════════
 */
function checkPartsFromQuotation_(quotationUrl) {
  // 1. Fetch quotation parts
  var quotResult = fetchQuotationParts_(quotationUrl);
  if (!quotResult.success) return quotResult;
  
  // 2. Get inventory
  var invResult = getInventory_();
  if (!invResult.success) return invResult;
  
  // 3. Build lookup index by last 4 digits
  var invByLast4 = {};
  for (var i = 0; i < invResult.inventory.length; i++) {
    var item = invResult.inventory[i];
    if (item.last4 && item.last4.length >= 4) {
      if (!invByLast4[item.last4]) invByLast4[item.last4] = [];
      invByLast4[item.last4].push(item);
    }
  }
  
  // 4. Match each quotation part
  var matched = [];
  var unmatched = [];
  
  for (var pi = 0; pi < quotResult.parts.length; pi++) {
    var part = quotResult.parts[pi];
    var candidates = invByLast4[part.last4] || [];
    
    if (candidates.length > 0) {
      for (var ci = 0; ci < candidates.length; ci++) {
        matched.push({
          quotCode: part.code,
          quotName: part.name,
          quotQty: part.qty,
          quotPrice: part.price,
          matchType: candidates.length > 1 ? 'multiple' : 'single',
          matchIndex: ci,
          totalMatches: candidates.length,
          inventory: candidates[ci]
        });
      }
    } else {
      unmatched.push({
        quotCode: part.code,
        quotName: part.name,
        quotQty: part.qty,
        quotPrice: part.price
      });
    }
  }
  
  return {
    success: true,
    quotation: {
      no: quotResult.quotationNo,
      date: quotResult.quotationDate,
      plate: quotResult.plate,
      jobNo: quotResult.jobNo,
      vehicle: quotResult.vehicle,
      customer: quotResult.customer,
      url: quotationUrl
    },
    summary: {
      totalParts: quotResult.parts.length,
      matched: matched.length,
      unmatched: unmatched.length
    },
    matched: matched,
    unmatched: unmatched
  };
}

/**
 * ════════ ค้นหาอะไหล่ ════════
 */
function searchPart_(query) {
  var inv = getInventory_();
  if (!inv.success) return inv;
  
  var q = (query || '').toLowerCase().trim();
  if (!q) return { success: true, results: [] };
  
  var results = [];
  for (var i = 0; i < inv.inventory.length; i++) {
    var item = inv.inventory[i];
    var haystack = (item.part + ' ' + item.name + ' ' + item.brand + ' ' + item.model).toLowerCase();
    if (haystack.indexOf(q) >= 0) {
      results.push(item);
    }
  }
  
  return { success: true, query: query, results: results };
}

/**
 * ════════ ฟอร์มเบิกใช้อะไหล่ + ตัดสต็อก ════════
 */
function withdrawParts_(data) {
  // data: { parts: [{part, name, qty, ...}], withdrawalDate, jobNo, plate, withdrawnBy, note }
  var ss = SpreadsheetApp.openById(PARTS_SS_ID);
  
  // Find or create withdrawal log tab
  var logSheetName = 'บันทึกเบิกอะไหล่';
  var logSheet = ss.getSheetByName(logSheetName);
  if (!logSheet) {
    logSheet = ss.insertSheet(logSheetName);
    logSheet.appendRow([
      'วันที่เบิก', 'เลขที่ใบเสนอราคา', 'ทะเบียน', 'เลขที่ JOB',
      'รหัสอะไหล่', 'ชื่ออะไหล่', 'จำนวนเบิก', 'ชั้นจัดเก็บเดิม',
      'แท็บที่เก็บ', 'แถวที่เก็บ', 'ผู้เบิก', 'หมายเหตุ', 'สถานะ'
    ]);
    logSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
    logSheet.setFrozenRows(1);
  }
  
  var results = [];
  var parts = data.parts || [];
  var wd = data.withdrawalDate || new Date().toISOString().split('T')[0];
  var jobNo = data.jobNo || '';
  var plate = data.plate || '';
  var withdrawnBy = data.withdrawedByBy || data.withdrawedBy || '';
  var note = data.note || '';
  var quotNo = data.quotNo || '';
  
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    logSheet.appendRow([
      wd,
      quotNo,
      plate,
      jobNo,
      p.part || '',
      p.name || '',
      p.qty || 1,
      p.shelf || '',
      p.tab || '',
      p.row || '',
      withdrawnBy,
      note,
      'เบิกออก'
    ]);
    results.push({ part: p.part, name: p.name, qty: p.qty, status: 'logged' });
  }
  
  return { success: true, withdrawn: results.length, results: results };
}

/**
 * ════════ ดึงประวัติการเบิก ════════
 */
function getWithdrawals_() {
  var ss = SpreadsheetApp.openById(PARTS_SS_ID);
  var logSheet = ss.getSheetByName('บันทึกเบิกอะไหล่');
  if (!logSheet || logSheet.getLastRow() < 2) {
    return { success: true, logs: [], count: 0 };
  }
  
  var lastRow = logSheet.getLastRow();
  var data = logSheet.getRange(2, 1, Math.min(lastRow - 1, 500), 13).getValues();
  var logs = [];
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (!row[0]) continue;
    logs.push({
      date: String(row[0] || ''),
      quotNo: String(row[1] || ''),
      plate: String(row[2] || ''),
      jobNo: String(row[3] || ''),
      part: String(row[4] || ''),
      name: String(row[5] || ''),
      qty: row[6],
      shelf: String(row[7] || ''),
      tab: String(row[8] || ''),
      row_num: row[9],
      withdrawnBy: String(row[10] || ''),
      note: String(row[11] || ''),
      status: String(row[12] || '')
    });
  }
  return { success: true, logs: logs, count: logs.length };
}