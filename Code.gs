
var SS_ID = '1iy5rYKERWSJwk8m49hNTMr_3CkLBm3PNe27k5zARuCU';

function doGet(e) {
  var p = e.parameter || {};
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheets = ss.getSheets();
  
  if (p.sheet) {
    var sheet = ss.getSheetByName(p.sheet);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error: 'Sheet not found: ' + p.sheet})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    var result = {
      name: sheet.getName(),
      totalRows: data.length,
      totalCols: data[0] ? data[0].length : 0,
      data: data.map(function(row) {
        return row.map(function(cell) {
          if (cell instanceof Date) return cell.toISOString();
          return String(cell);
        });
      })
    };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  
  var result = sheets.map(function(s) {
    return { name: s.getName(), sheetId: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn() };
  });
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function listSheets() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheets = ss.getSheets();
  return sheets.map(function(s) {
    return { name: s.getName(), sheetId: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn() };
  });
}

function readSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName };
  var data = sheet.getDataRange().getValues();
  return {
    name: sheet.getName(),
    totalRows: data.length,
    totalCols: data[0] ? data[0].length : 0,
    data: data.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) return cell.toISOString();
        return String(cell);
      });
    })
  };
}
