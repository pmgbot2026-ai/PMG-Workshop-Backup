// ENVR Oil Stock Monitoring Dashboard - Backend
// Reads data from spreadsheet: 1S6S3KEeX1k17wEuMQHtPzti8BzNnBxP_OwG9uAbCniA

var SPREADSHEET_ID = '1S6S3KEeX1k17wEuMQHtPzti8BzNnBxP_OwG9uAbCniA';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ENVR Oil Stock Monitor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function fetchData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var result = {};

  // 1. C1_total_oil_stock - Master oil stock data
  try {
    var sheet = ss.getSheetByName('C1_total_oil_stock');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var stockData = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] || data[i][2]) { // has oil_type or storage
          stockData.push({
            id: data[i][0],
            oilType: data[i][1],
            storage: data[i][2],
            importTotal: parseFloat(data[i][3]) || 0,
            exportTotal: parseFloat(data[i][4]) || 0,
            balance: parseFloat(data[i][5]) || 0,
            place: data[i][6]
          });
        }
      }
      result.stockData = stockData;
    }
  } catch(e) {
    result.stockData = [];
    result.stockError = e.message;
  }

  // 2. B1_Forms_ENVIRON ขาย / เบิก / ย้ายที่เก็บ - Transaction log
  try {
    var sheet = ss.getSheetByName('B1_Forms_ENVIRON ขาย / เบิก / ย้ายที่เก็บ');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var transactions = [];
      for (var i = 9; i < data.length; i++) { // Data starts from row 10 (index 9)
        if (data[i][2]) { // running exists
          transactions.push({
            running: data[i][2],
            timestamp: data[i][3] ? new Date(data[i][3]).toISOString() : '',
            environId: data[i][4],
            environIdName: data[i][5],
            companyManagement: data[i][6],
            type: data[i][7],
            oilType: data[i][8],
            storage: data[i][9],
            liter: parseFloat(data[i][10]) || 0,
            notice: data[i][11],
            storageTransfer: data[i][12],
            typeInput: data[i][13],
            dateUse: data[i][14] ? new Date(data[i][14]).toISOString() : '',
            outPerson: data[i][15],
            agency: data[i][16],
            sellPrice: parseFloat(data[i][17]) || 0,
            sellOil: data[i][18],
            sellType: data[i][19],
            sellCashCredit: data[i][20],
            sellAuto: data[i][21],
            sellCustomer: data[i][22],
            sellCustomerTell: data[i][23]
          });
        }
      }
      result.transactions = transactions;
    }
  } catch(e) {
    result.transactions = [];
    result.transactionError = e.message;
  }

  // 3. B2_Forms_ENVIRON ผลิต - Production log
  try {
    var sheet = ss.getSheetByName('B2_Forms_ENVIRON ผลิต');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var production = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] || data[i][4] || data[i][5]) {
          production.push({
            startDate: data[i][0] ? new Date(data[i][0]).toISOString() : '',
            col2: data[i][1],
            col3: data[i][2],
            col4: data[i][3],
            dieselProduced: parseFloat(data[i][4]) || 0,
            usedOilLiters: parseFloat(data[i][5]) || 0,
            col7: data[i][6],
            col8: data[i][7],
            col9: data[i][8],
            col10: data[i][9],
            remainingOil: parseFloat(data[i][10]) || 0,
            wasteLiters: parseFloat(data[i][11]) || 0,
            endDate: data[i][12] ? new Date(data[i][12]).toISOString() : '',
            col14: data[i][13],
            electricityUsed: parseFloat(data[i][14]) || 0,
            col16: data[i][15],
            cetaneValue: data[i][16],
            storageLocation: data[i][17],
            amountStored: parseFloat(data[i][18]) || 0
          });
        }
      }
      result.production = production;
    }
  } catch(e) {
    result.production = [];
    result.productionError = e.message;
  }

  // 4. รายงานขายน้ำมันENVR - Sales report
  try {
    var sheet = ss.getSheetByName('รายงานขายน้ำมันENVR');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var salesReport = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] || data[i][2]) {
          salesReport.push({
            oilType: data[i][0],
            storage: data[i][1],
            quantity: parseFloat(data[i][2]) || 0,
            priceUsedOil: parseFloat(data[i][3]) || 0,
            saleType: data[i][4],
            agency: data[i][5],
            pricePerLiter: parseFloat(data[i][6]) || 0,
            totalRevenue: parseFloat(data[i][7]) || 0,
            buyer: data[i][8]
          });
        }
      }
      result.salesReport = salesReport;
    }
  } catch(e) {
    result.salesReport = [];
    result.salesReportError = e.message;
  }

  // 5. รูป_รายงาน OIL Stock(ห้ามลบ/แก้ไข) - Stock summary template
  try {
    var sheet = ss.getSheetByName('รูป_รายงาน OIL Stock(ห้ามลบ/แก้ไข)');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      result.stockTemplate = data;
    }
  } catch(e) {
    result.stockTemplate = [];
    result.stockTemplateError = e.message;
  }

  // 6. Config: Oil types
  try {
    var sheet = ss.getSheetByName('A_config_ประเภทน้ำมัน');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var oilTypes = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) oilTypes.push(data[i][0]);
      }
      result.oilTypes = oilTypes;
    }
  } catch(e) {
    result.oilTypes = ['น้ำมันเครื่องเก่า', 'น้ำมันเอนกประสงค์', 'น้ำมันเอนกประสงค์(ใช้ไม่ได้)'];
  }

  // 7. Config: Transaction types
  try {
    var sheet = ss.getSheetByName('A_config_ประเภทการบันทึก');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var txnTypes = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) txnTypes.push(data[i][0]);
      }
      result.txnTypes = txnTypes;
    }
  } catch(e) {
    result.txnTypes = ['import', 'export', 'transfer', 'adjust'];
  }

  // 8. Config: Storage locations
  try {
    var sheet = ss.getSheetByName('A_config_แหล่งที่เก็บ ของน้ำมันแต่ละชนิด');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var storageConfigs = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) {
          storageConfigs.push({
            oilType: data[i][0],
            storage: data[i][1],
            place: data[i][2] || '',
            capacity: parseFloat(data[i][3]) || 0
          });
        }
      }
      result.storageConfigs = storageConfigs;
    }
  } catch(e) {
    result.storageConfigs = [];
  }

  result.lastUpdated = new Date().toISOString();
  return result;
}