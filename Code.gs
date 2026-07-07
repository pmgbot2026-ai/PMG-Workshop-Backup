/* ═══════════════════════════════════════════════════
   PMG OKR Dashboard — CEO Contract 2.0 Viewer
   - Reads all tabs from the OKR spreadsheet
   - Auto-updates when source sheet changes
   ═══════════════════════════════════════════════════ */

var OKR_SS_ID = '1tXvG1gIwVThXdRRTrGsYd4fnp0a4Gzni65-ErXDe28s';

/* ═══ Web App Entry ═══ */
function doGet(e) {
  if (!e) e = { parameter: {} };
  var p = e.parameter || {};
  
  if (p.api === '1') {
    var action = p.action || 'getOKRData';
    var data;
    try {
      if (p.data) data = JSON.parse(p.data);
    } catch(err) {
      data = {};
    }
    
    var result;
    switch(action) {
      case 'getOKRData':
        result = getOKRData();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Serve the dashboard HTML
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PMG OKR Dashboard')
    .setXFrameMode('allow')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/* ═══ Data Functions ═══ */
function getOKRData() {
  var ss = SpreadsheetApp.openById(OKR_SS_ID);
  var sheets = ss.getSheets();
  var result = {
    summary: null,
    kpiSummary: null,
    strategies: null,
    people: [],
    orgStructure: null,
    lastUpdate: new Date().toISOString()
  };
  
  // Read each sheet
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();
    var data = sheet.getDataRange().getValues();
    
    if (name === 'CEO สรุป') {
      result.summary = parseSummarySheet(data);
    } else if (name === 'KPI สรุป') {
      result.kpiSummary = parseKPISummarySheet(data);
    } else if (name === '5 กลยุทธ์') {
      result.strategies = parseStrategySheet(data);
    } else if (name === 'นิยาม CEOและขั้นตอนการทำ') {
      result.definitions = parseDefinitionSheet(data);
    } else if (name === 'Checklist ตรวจ OKR') {
      result.checklist = parseGenericSheet(data);
    } else if (name === 'อธิบายCEO แบบฟอร์ม') {
      result.ceoExplanation = parseGenericSheet(data);
    } else if (name === 'CEO แบบฟอร์ม') {
      // Skip template
    } else if (name === 'สำเนาของ Kwanruean4703033') {
      // Skip copy
    } else if (name.indexOf(' ') > -1 || /^\d/.test(name)) {
      // Person sheet
      var person = parsePersonSheet(data, name);
      if (person) result.people.push(person);
    }
  }
  
  // Build org structure
  result.orgStructure = buildOrgStructure(result.people);
  
  return result;
}

function parseSummarySheet(data) {
  var result = { teams: [], totalMembers: 0, totalDone: 0, totalRemain: 0 };
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (row[2] === 'PMG' || row[2] === 'PMGI' || row[2] === 'SA' || row[2] === 'SA ออนไลน์' || row[2] === 'บริหารโรงซ่อม' || row[2] === 'ทีมกำกับ' || row[2] === 'อะไหล่' || row[2] === 'การเงินและกำกับ' || row[2] === 'ช่าง' || row[2] === 'รวมทั้งหมด') {
      result.teams.push({
        name: row[2],
        members: row[3] || 0,
        done: row[4] || 0,
        remain: row[5] || 0,
        pct: row[6] || 0
      });
    }
  }
  return result;
}

function parseKPISummarySheet(data) {
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] && String(row[0]).trim()) {
      result.push({
        kpi: row[0],
        pkgYear: row[1] || '',
        pmsgMonth: row[2] || '',
        pmggMonth: row[3] || '',
        teamCenterMonth: row[4] || '',
        teamSAMonth: row[5] || '',
        teamPMGISellMonth: row[6] || '',
        teamPartsMonth: row[7] || '',
        somsakMonth: row[8] || ''
      });
    }
  }
  return result;
}

function parseStrategySheet(data) {
  var strategies = [];
  var currentStrategy = null;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var col0 = String(row[0] || '').trim();
    var col1 = String(row[1] || '').trim();
    var col2 = String(row[2] || '').trim();
    var col3 = String(row[3] || '').trim();
    var col4 = String(row[4] || '').trim();
    
    if (col0.indexOf('PAC') >= 0 || col0.indexOf('PIT') >= 0 || col0.indexOf('DIN') >= 0 || col0.indexOf('CIX') >= 0 || col0.indexOf('OBF') >= 0) {
      if (currentStrategy) strategies.push(currentStrategy);
      currentStrategy = { code: col0, name: col1, team: col2, objectives: [] };
    } else if (col0.indexOf('PMSG') >= 0 || col0.indexOf('AAMG') >= 0 || col0.indexOf('TNR') >= 0 || col0.indexOf('CPDG') >= 0) {
      if (currentStrategy) strategies.push(currentStrategy);
      currentStrategy = { code: col0, name: col1, link: col2, team: col3, objectives: [] };
    } else if (col0.indexOf('S-Objective') >= 0) {
      if (currentStrategy) {
        currentStrategy.objectives.push({ objective: col1 || col2, keyResults: [] });
      }
    } else if (col0.indexOf('O') === 0 && col0.indexOf('-KR') > 0) {
      if (currentStrategy && currentStrategy.objectives.length > 0) {
        var lastObj = currentStrategy.objectives[currentStrategy.objectives.length - 1];
        lastObj.keyResults.push(col1 || col2);
      }
    }
  }
  if (currentStrategy) strategies.push(currentStrategy);
  
  return strategies;
}

function parseDefinitionSheet(data) {
  return data.map(function(row) {
    return row.map(function(cell) { return String(cell || '').trim(); });
  }).filter(function(row) {
    return row.some(function(cell) { return cell !== ''; });
  });
}

function parseGenericSheet(data) {
  return data.map(function(row) {
    return row.map(function(cell) { return String(cell || '').trim(); });
  }).filter(function(row) {
    return row.some(function(cell) { return cell !== ''; });
  });
}

function parsePersonSheet(data, sheetName) {
  var person = {
    sheetName: sheetName,
    name: '',
    id: '',
    bu: '',
    team: '',
    role: '',
    mentors: [],
    purpose: '',
    vision: '',
    teamPurpose: '',
    teamVision: '',
    personalPurpose: '',
    personalVision: '',
    accountability: [],
    objectives: [],
    weightBusiness: 0,
    weightTeam: 0,
    weightPersonal: 0,
    weightCommunity: 0
  };
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // Parse name/id/team from header rows
    for (var j = 0; j < row.length; j++) {
      var cell = String(row[j] || '').trim();
      
      // Name
      if (cell === 'Name.' && row[j+1]) {
        person.name = String(row[j+1]).trim();
      }
      if (cell === 'ID' && row[j+1]) {
        person.id = String(row[j+1]).trim();
      }
      if (cell === 'BU' || cell === 'BU :') {
        person.bu = String(row[j+1] || row[j+2] || '').trim();
      }
      if (cell === 'Team' || cell === 'Team :') {
        person.team = String(row[j+1] || row[j+2] || '').trim();
      }
      if (cell === 'บทบาท :' || cell === 'บทบาท :') {
        person.role = String(row[j+1] || '').trim();
      }
      // Mentor
      if (cell === 'ผู้รับใช้ทีม') {
        person.mentors.push(String(row[j+1] || '').trim());
      }
      if (cell === 'พี่เลี้ยง') {
        var mentor = String(row[j+1] || '').trim();
        if (mentor && person.mentors.indexOf(mentor) === -1) person.mentors.push(mentor);
      }
      // Purpose & Vision
      if (cell.indexOf('จุดมุ่งหมาย (purpose)') >= 0 && cell.indexOf('BU') >= 0 || cell === 'จุดมุ่งหมาย (purpose)::') {
        // Look for purpose in next column
        for (var k = j+1; k < row.length && k < j+3; k++) {
          if (String(row[k] || '').trim()) {
            person.purpose = String(row[k]).trim();
            break;
          }
        }
      }
    }
    
    // Parse Accountability items
    if (i >= 14 && i <= 23) {
      var numCell = String(row[0] || '').trim();
      var descCell = String(row[1] || '').trim();
      if (numCell && !isNaN(parseInt(numCell)) && descCell) {
        person.accountability.push(descCell);
      }
    }
    
    // Parse Objectives (Business Growth, Team Growth, Personal Growth)
    if (String(row[1] || '').indexOf('Business Growth') >= 0) {
      person.objectives.push({ type: 'Business Growth', label: String(row[2] || '').trim(), keyResults: [] });
    }
    if (String(row[1] || '').indexOf('Team Growth') >= 0) {
      person.objectives.push({ type: 'Team Growth', label: String(row[2] || '').trim(), keyResults: [] });
    }
    if (String(row[1] || '').indexOf('Personal Growth') >= 0) {
      person.objectives.push({ type: 'Personal Growth', label: String(row[2] || '').trim(), keyResults: [] });
    }
    
    // Collect key results
    if (person.objectives.length > 0) {
      var krText = String(row[3] || '').trim();
      if (krText && krText.indexOf('Key Results') >= 0) {
        var lastObj = person.objectives[person.objectives.length - 1];
        // The KR header itself might have content
      } else if (krText && i > 25) {
        var lastObj = person.objectives[person.objectives.length - 1];
        if (lastObj && krText.length > 5) {
          lastObj.keyResults.push(krText);
        }
      }
    }
    
    // Parse weights
    if (String(row[0] || '').indexOf('Business') >= 0 && row[4]) {
      person.weightBusiness = parseFloat(row[4]) || 0;
    }
    if (String(row[0] || '').indexOf('Team') >= 0 && row[4]) {
      person.weightTeam = parseFloat(row[4]) || 0;
    }
    if (String(row[0] || '').indexOf('Personal') >= 0 && row[4]) {
      person.weightPersonal = parseFloat(row[4]) || 0;
    }
  }
  
  // Extract team from sheet name patterns
  if (!person.team) {
    if (sheetName.indexOf('PMGG') >= 0) person.team = 'PMGG';
    else if (sheetName.indexOf('PMGI') >= 0) person.team = 'PMGI';
  }
  
  return person;
}

function buildOrgStructure(people) {
  var structure = {
    leader: 'ประวิทย์ ผ่องโสภา',
    teams: {
      'ทีมรับใช้ PKG': { leader: 'สมศักดิ์ ธัมมะปาละ', members: [] },
      'PMGG': { leader: '', members: [] },
      'PMGI': { leader: '', members: [] }
    }
  };
  
  // Determine team leaders from CEO contract data
  var pmggLeaders = [];
  var pmgiLeaders = [];
  
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    if (p.role && p.role.indexOf('ผู้รับใช้ทีม') >= 0) {
      if (p.team === 'PMGG' || p.team === 'PMG') {
        structure.teams['PMGG'].leader = p.name;
        pmggLeaders.push(p.name);
      } else if (p.team === 'PMGI') {
        structure.teams['PMGI'].leader = p.name;
        pmgiLeaders.push(p.name);
      }
    }
  }
  
  return structure;
}