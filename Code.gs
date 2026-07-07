/* PMG PM/WI Checklist - GAS Backend v2 */
var CHECKLIST_SS_ID = '1uB9ABT9rv68gg14gVpLf_JAN7WelMSeDo1alltnqbaU';

function doGet() {
  var data = getChecklistData();
  var template = HtmlService.createTemplateFromFile('Index');
  template.pm = data.pm;
  template.wi = data.wi;
  return template.evaluate()
    .setTitle('PMG \u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E15\u0E4C PM/WI')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getChecklistData() {
  var ss = SpreadsheetApp.openById(CHECKLIST_SS_ID);
  var pmSheet = ss.getSheetByName('\u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08');
  var pmValues = pmSheet ? pmSheet.getRange(1, 1, pmSheet.getLastRow(), pmSheet.getLastColumn()).getValues() : [];
  var wiSheet = ss.getSheetByName('\u0E40\u0E0A\u0E47\u0E04\u0E25\u0E34\u0E2A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E08\u0E49\u0E07');
  var wiValues = wiSheet ? wiSheet.getRange(1, 1, wiSheet.getLastRow(), wiSheet.getLastColumn()).getValues() : [];
  return { pm: parsePM(pmValues), wi: parseWI(wiValues) };
}

function parsePM(v) {
  var r = { pre:[], check:[], post:[], safety:[], docs:[] };
  var ds = {};
  // Pre-inspection: rows 3-7 (index)
  for (var i=3; i<=7 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.pre.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], doc:v[i][4]||''});
      if(v[i][4]) ds[String(v[i][4]).trim()] = 1;
    }
  }
  // Checklist: rows 9-21
  var lastCat = '';
  for (var i=9; i<=21 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      if(v[i][0]) lastCat = v[i][0];
      r.check.push({cat:lastCat, item:v[i][1], doc:v[i][4]||''});
      if(v[i][4]) ds[String(v[i][4]).trim()] = 1;
    }
  }
  // Post-inspection: rows 23-27
  for (var i=23; i<=27 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.post.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3]});
    }
  }
  // Safety plan: rows 39+
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
  // Pre-inspection: rows 4-8
  for (var i=4; i<=8 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.pre.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], note:v[i][4]||'', doc:v[i][5]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  // Checklist: rows 10-16
  var lastCat = '';
  for (var i=10; i<=16 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      if(v[i][0]) lastCat = v[i][0];
      r.check.push({cat:lastCat, item:v[i][1], doc:v[i][5]||v[i][4]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  // Post-inspection: rows 18-21
  for (var i=18; i<=21 && i<v.length; i++) {
    if(v[i][1] && String(v[i][1]).trim()) {
      r.post.push({step:v[i][0], detail:v[i][1], resp:v[i][2], time:v[i][3], note:v[i][4]||'', doc:v[i][5]||''});
      if(v[i][5]) ds[String(v[i][5]).trim()] = 1;
    }
  }
  r.docs = Object.keys(ds);
  return r;
}

function esc(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}