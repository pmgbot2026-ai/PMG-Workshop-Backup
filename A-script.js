var spreadsheet_id = "";
var form_name = "";
var questions = [];
var questionImportance = {};
var secret = "59c6ccf4601b971eabe88aab19e8ec2e5b39268aab5470adc1fc9a3da2592ddf";
var keyit = "";

function doGet(e) {
  //  if(Session.getEffectiveUser().getEmail()=='chaiya.ngeumpha.pkg@gmail.com'){
  //    return HtmlService.createHtmlOutput(Session.getEffectiveUser().getEmail());  
  //  }

  var parameter = e.parameter;
  var checkStatus = parameter['AGSCheckStatusService'];
  var page = parameter.page;

  if (checkStatus != undefined) {
    var json = {
      "status": "ok"
    };
    var JSONOutput = ContentService.createTextOutput(JSON.stringify(json));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
  }
  spreadsheet_id = addParameter(parameter.spreadsheet_id);
  form_name = addParameter(parameter.form_name);
  keyit = addParameter(parameter['keyit']);
  if (spreadsheet_id == "1uH3LeYt7LS0l8Lg3wHqv2mSBg-9HT85ClK4-J49roCA") {
    return HtmlService.createTemplateFromFile('PMG-Error')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (spreadsheet_id == "1-puCL6LQUoVPnlvVI73yCeKLQwLD0zXS8VagBKJMKmE") {
    return HtmlService.createTemplateFromFile('PKG-Error')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    return HtmlService.createTemplateFromFile('html-Index-vbs5')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  //  return HtmlService.createTemplateFromFile('html-Index')
  //  .evaluate()
  //  .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
  //  .setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);  

}

function getBUinp(Keyword, nameUseID) {
  try {
    var query = `
      SELECT division.division_name
      FROM division
      WHERE status = 'Y'
      AND (
        IF(use_inp_company_ctt != '', use_inp_company_ctt, company_ctt)
        LIKE '%${Keyword}%'
      )
      ORDER BY use_inp_company_ctt ASC
    `;

    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    return {
      nameUseID: nameUseID,
      datas: datas
    };

  } catch (e) {
    return {
      error: true,
      message: e.toString()
    };
  }
}
function test_getBUinp_LDC() {
  var result = getBUinp("LDC", "testUser");

  Logger.log(JSON.stringify(result, null, 2));
}

function getId_doc(Keyword, nameUseID) {
  try {
    var query = `
      SELECT *
      FROM BCT_WI_Registered
      WHERE status='จบกระบวนการ'
      AND id_wi='${Keyword}'
    `;

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), "BCT_PKG", query);

    return {
      nameUseID: nameUseID,
      datas: datas
    };

  } catch (e) {
    return { error: e.toString() };
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getIndex(id, name) {
  spreadsheet_id = id;
  form_name = name;
  return HtmlService.createTemplateFromFile('html-Index-vbs5').evaluate().getContent();
  //  return HtmlService.createTemplateFromFile('html-Index').evaluate().getContent();
}

function feedbackScript() {
  return BCT.feedbackScript();
}

function getImgGPS(url, nameUseID) {
  var jsonGPS = {};
  jsonGPS['nameUseID'] = nameUseID;
  jsonGPS['gps_img'] = BCT.getImg_byLinkGPS(url, "800x400");
  return jsonGPS;
}

function getForms() {
  var forms = {};
  if (spreadsheet_id != "") {
    var ss = SpreadsheetApp.openById(spreadsheet_id);
    var sheet = ss.getSheetByName('A2_Forms');
    var rowByKey = BCT.form_getRowByKey(sheet, 'process');
    var rowStartValue = rowByKey + 5;
    var rowFields = rowByKey + 1;
    var fields = BCT.getFields(sheet, rowFields, 1, 0);
    var valuesAll = BCT.getValuesAll(sheet, rowStartValue, 1);

    //     if(form_name=="IT-PGH"){
    // fields = BCT.addToNewFields(fields, 'running', '', 'running');
    //     }

    for (var v = 0; v < valuesAll.length; v++) {
      var values = [valuesAll[v]];

      //        if(form_name=="IT-PGH"){
      //  values = BCT.addToNewValues(values,"");
      //     }

      if (BCT.valueByFliedName(fields, values, 'form_name') == form_name) {
        if (JSON.stringify(forms) == "{}") {
          forms = BCT.createValues_Json_Not_ConvertData(fields, values);
        }
        questions.push(BCT.createValues_Json_Not_ConvertData(fields, values));
        if (BCT.valueByFliedName(fields, values, 'form_importance') == 'บังคับกรอก') {
          questionImportance[BCT.valueByFliedName(fields, values, 'form_question_fieldname')] = true;
        }
      }
    }
  }
  return forms;
}



function getBranchBySC(sc_name) {
  var ss = SpreadsheetApp.openById("1avgnzH7a4TJHkd2KRzOh7S79Hx3Gm2FcgfoUZV60Dhs");
  var sheet = ss.getSheetByName("A1_config");
  var data = sheet.getRange("G:H").getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == sc_name) {
      return data[i][1];
    }
  }

  return "";
}





function getdatait(keyit) {
  // var keyit = "095b916b-16e9-431d-bdaf-46c074987637";

  try {
    var query = " SELECT * FROM BCT_IT_Order_Work where keyid='" + keyit + "' ";
    var DBName = "BCT_IT";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['datas'] = datas;
    // Logger.log(jsonData);
    return jsonData;
  } catch (e) {
    return e;
  }

}

function addParameter(val) {
  if (val == undefined) {
    val = "";
  }
  return val;
}

/* [ใช้งานเฉพาะ] Timestamp */
function getTimestamp(nameUseID, functionMore) {
  var jsonDataTimestamp = {};
  jsonDataTimestamp['timestamp'] = Utilities.formatDate(new Date(), "GMT+7", 'yyyy-MM-dd HH:mm:ss');
  jsonDataTimestamp['email'] = Session.getEffectiveUser().getEmail();
  jsonDataTimestamp['nameUseID'] = nameUseID;
  jsonDataTimestamp['functionMore'] = functionMore;
  return jsonDataTimestamp;
}

/* nook ข้อมูลแยก รหัสสมาชิก ใน BCT ฟอร์มแจ้งกรณีโอนผิด ส่วนที่ 2 */
function get_member_code(strcode) {
  return strcode;
}



/* nook ข้อมูล LikeWallet ใน BCT ฟอร์มแจ้งกรณีโอนผิด */
function get_Address_Wallet(Keyword) {
  var AWal = APILP.loadNewLikeWalletPKGmember_likeaddress(Keyword)
  Logger.log(Keyword)
  return AWal;
}



/* [ใช้งานเฉพาะ] ผลคำตอบในSheetB2_ตรวจคำตอบ กลุ่ม2และกลุ่ม1 nook*/

function get_replyquestion(Keyword, nameUseID, spreadsheet_id) {
  //var ss = SpreadsheetApp.openById("1UO0ftF66W7aAivA8_txUzVp46wQIuoM_ZOgKR5iAFzQ") ;
  //Logger.log("----spreadsheet_id----")
  //Logger.log(spreadsheet_id)

  var ss = SpreadsheetApp.openById(spreadsheet_id);
  var ssname = ss.getName();
  //Logger.log("----ssname----")
  //Logger.log(ssname)



  if (ssname.indexOf("กลุ่ม1") > -1) {

    var sheet1 = ss.getSheetByName("B2_ตรวจคำตอบ");
    var flieds1 = BCT.getField(sheet1, BCT.form_getRowFieldPutByKey(sheet1, "process"), 1);
    var dataAll1 = BCT.getValuesAll(sheet1, BCT.form_getRowStartValueByKey(sheet1, "process"), 1);

    Logger.log("----dataAll----")
    Logger.log(dataAll1)

    var key = Keyword
    //var key = "6503021"

    Logger.log(dataAll1.length)

    for (var i = dataAll1.length - 1; i > 0; i--) {


      Logger.log("----i----")
      Logger.log(i)
      Logger.log("----dataAll----")
      Logger.log(dataAll1[i])

      if (key == dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "member_id")]) {

        var exam_score1 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "exam_score") - 1];
        exam_score1 = exam_score1.split("|");

        // Logger.log("--*exam_score**---")
        // Logger.log(exam_score)
        //Logger.log("---***--")


        var Quiz_1 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "Quiz_1")];

        //Logger.log("-----")
        // Logger.log(Quiz_1)
        //Logger.log("-----")

        var Quiz_2 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "Quiz_2")];
        var Quiz_3 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "Quiz_3")];
        var Quiz_4 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "Quiz_4")];
        var Quiz_5 = dataAll1[i][BCT.numberPositionValueByFliedName(flieds1, "Quiz_5")];



        var array_data = []

        //Logger.log("--1---")
        //Logger.log(exam_score[0])
        //Logger.log("-----")


        array_data.push([Quiz_1, exam_score1[0]]);
        array_data.push([Quiz_2, exam_score1[1]]);
        array_data.push([Quiz_3, exam_score1[2]]);
        array_data.push([Quiz_4, exam_score1[3]]);
        array_data.push([Quiz_5, exam_score1[4]]);
        //array_data.push([exam_score[0]]);

        Logger.log("--array_data---")
        Logger.log(array_data)
        Logger.log("-----")


        return array_data;
      }

    }


    return "";



  } else {
    var sheet = ss.getSheetByName("B2_ตรวจคำตอบ");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    //Logger.log("----dataAll----")
    // Logger.log(dataAll)

    var key = Keyword
    //var key = "6503021"

    Logger.log(dataAll.length)

    for (var i = dataAll.length - 1; i > 0; i--) {


      Logger.log("----i----")
      Logger.log(i)
      Logger.log("----dataAll----")
      Logger.log(dataAll[i])

      if (key == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "member_id")]) {

        var exam_score = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "exam_score") - 1];
        exam_score = exam_score.split("|");

        // Logger.log("--*exam_score**---")
        // Logger.log(exam_score)
        //Logger.log("---***--")


        var Quiz_1 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_1")];

        //Logger.log("-----")
        // Logger.log(Quiz_1)
        //Logger.log("-----")

        var Quiz_2 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_2")];
        var Quiz_3 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_3")];
        var Quiz_4 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_4")];
        var Quiz_5 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_5")];
        var Quiz_6 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_6")];
        var Quiz_7 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_7")];
        var Quiz_8 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_8")];
        var Quiz_9 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_9")];
        var Quiz_10 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_10")];
        var Quiz_11 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_11")];
        var Quiz_12 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_12")];
        var Quiz_13 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_13")];

        var Quiz_14 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_14")];
        var Quiz_15 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_15")];
        var Quiz_16 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_16")];
        var Quiz_17 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_17")];
        var Quiz_18 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_18")];
        var Quiz_19 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_19")];
        var Quiz_20 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_20")];
        var Quiz_21 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_21")];
        var Quiz_22 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_22")];
        var Quiz_23 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_23")];
        var Quiz_24 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_24")];
        var Quiz_25 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_25")];
        var Quiz_26 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_26")];
        var Quiz_27 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_27")];
        var Quiz_28 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_28")];
        var Quiz_29 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_29")];
        var Quiz_30 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_30")];
        var Quiz_31 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_31")];
        var Quiz_32 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_32")];
        var Quiz_33 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_33")];
        var Quiz_34 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_34")];
        var Quiz_35 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_35")];
        var Quiz_36 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_36")];
        var Quiz_37 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_37")];
        var Quiz_38 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_38")];
        var Quiz_39 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_39")];
        var Quiz_40 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_40")];
        var Quiz_41 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_41")];
        var Quiz_42 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_42")];
        var Quiz_43 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_43")];
        var Quiz_44 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_44")];
        var Quiz_45 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_45")];
        var Quiz_46 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_46")];
        var Quiz_47 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_47")];
        var Quiz_48 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_48")];
        var Quiz_49 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_49")];
        var Quiz_50 = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "Quiz_50")];




        var array_data = []

        //Logger.log("--1---")
        //Logger.log(exam_score[0])
        //Logger.log("-----")


        array_data.push([Quiz_1, exam_score[0]]);
        array_data.push([Quiz_2, exam_score[1]]);
        array_data.push([Quiz_3, exam_score[2]]);
        array_data.push([Quiz_4, exam_score[3]]);
        array_data.push([Quiz_5, exam_score[4]]);
        array_data.push([Quiz_6, exam_score[5]]);
        array_data.push([Quiz_7, exam_score[6]]);
        array_data.push([Quiz_8, exam_score[7]]);
        array_data.push([Quiz_9, exam_score[8]]);
        array_data.push([Quiz_10, exam_score[9]]);
        array_data.push([Quiz_11, exam_score[10]]);
        array_data.push([Quiz_12, exam_score[11]]);
        array_data.push([Quiz_13, exam_score[12]]);

        array_data.push([Quiz_14, exam_score[13]]);
        array_data.push([Quiz_15, exam_score[14]]);
        array_data.push([Quiz_16, exam_score[15]]);
        array_data.push([Quiz_17, exam_score[16]]);
        array_data.push([Quiz_18, exam_score[17]]);
        array_data.push([Quiz_19, exam_score[18]]);
        array_data.push([Quiz_20, exam_score[19]]);
        array_data.push([Quiz_21, exam_score[20]]);
        array_data.push([Quiz_22, exam_score[21]]);
        array_data.push([Quiz_23, exam_score[22]]);
        array_data.push([Quiz_24, exam_score[23]]);
        array_data.push([Quiz_25, exam_score[24]]);
        array_data.push([Quiz_26, exam_score[25]]);
        array_data.push([Quiz_27, exam_score[26]]);
        array_data.push([Quiz_28, exam_score[27]]);
        array_data.push([Quiz_29, exam_score[28]]);
        array_data.push([Quiz_30, exam_score[29]]);
        array_data.push([Quiz_31, exam_score[30]]);
        array_data.push([Quiz_32, exam_score[31]]);
        array_data.push([Quiz_33, exam_score[32]]);
        array_data.push([Quiz_34, exam_score[33]]);
        array_data.push([Quiz_35, exam_score[34]]);
        array_data.push([Quiz_36, exam_score[35]]);
        array_data.push([Quiz_37, exam_score[36]]);
        array_data.push([Quiz_38, exam_score[37]]);
        array_data.push([Quiz_39, exam_score[38]]);
        array_data.push([Quiz_40, exam_score[39]]);
        array_data.push([Quiz_41, exam_score[40]]);
        array_data.push([Quiz_42, exam_score[41]]);
        array_data.push([Quiz_43, exam_score[42]]);
        array_data.push([Quiz_44, exam_score[43]]);
        array_data.push([Quiz_45, exam_score[44]]);
        array_data.push([Quiz_46, exam_score[45]]);
        array_data.push([Quiz_47, exam_score[46]]);
        array_data.push([Quiz_48, exam_score[47]]);
        array_data.push([Quiz_49, exam_score[48]]);
        array_data.push([Quiz_50, exam_score[49]]);


        //array_data.push([exam_score[0]]);

        //Logger.log("--array_data---")
        // Logger.log(array_data)
        // Logger.log("-----")


        return array_data;
      }

    }


    return "";




  }





}

//---------------------------------จบ

//
function getsearch_province(Keyword, nameUseID, spreadsheet_id) {

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var key1 = Keyword
  // var key1 = "จันทบุรี"

  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "province")]) {

      var amphoe = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amphoe")];

      array.push(amphoe);


    }
  }

  Logger.log(array);
  return array;
}

function getsearch_province_row2(Keyword, nameUseID, spreadsheet_id) { //แถวที่2

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var key1 = Keyword
  // var key1 = "จันทบุรี"

  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "province")]) {

      var amphoe = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amphoe")];

      array.push(amphoe);


    }
  }

  Logger.log(array);
  return array;
}




//--------อำเภอ-----------------------------------
function getsearch_amphoe(Keyword, nameUseID, spreadsheet_id, Keyword2) {

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var key2 = Keyword
  var key1 = Keyword2//จังหวัด



  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "pv_tname")] && key2 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amp_tname")]) {

      var tum_tname = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "tum_tname")];

      array.push(tum_tname);


    }
  }

  Logger.log(array)
  return array;
}


function getsearch_amphoe_row2(Keyword, nameUseID, spreadsheet_id, Keyword2) {//แถวที่2

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var key2 = Keyword
  var key1 = Keyword2//จังหวัด



  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "pv_tname")] && key2 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amp_tname")]) {

      var tum_tname = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "tum_tname")];

      array.push(tum_tname);


    }
  }

  Logger.log(array)
  return array;
}






//------------ตำบล--------------------------------
function getsearch_tambon(Keyword, nameUseID, spreadsheet_id, Keyword2, Keyword3) {

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  //var key = Keyword 


  var key1 = Keyword2; //จังหวัด
  var key2 = Keyword3; //อำเภอ
  var key3 = Keyword;

  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "pv_tname")] && key2 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amp_tname")] && key3 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "tum_tname")]) {

      var zipcode = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "zipcode")];

      array.push(zipcode);


    }
  }

  Logger.log(array)
  return array;
}

function getsearch_tambon_row2(Keyword, nameUseID, spreadsheet_id, Keyword2, Keyword3) {//แถวที่2

  var ss = SpreadsheetApp.openById("1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4");
  var ssname = ss.getName();

  var sheet = ss.getSheetByName("ข้อมูลจังหวัด");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  //var key = Keyword 


  var key1 = Keyword2; //จังหวัด
  var key2 = Keyword3; //อำเภอ
  var key3 = Keyword;

  var array = [];

  Logger.log(dataAll.length)

  for (var i = 0; i < dataAll.length; i++) {

    if (key1 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "pv_tname")] && key2 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "amp_tname")] && key3 == dataAll[i][BCT.numberPositionValueByFliedName(flieds, "tum_tname")]) {

      var zipcode = dataAll[i][BCT.numberPositionValueByFliedName(flieds, "zipcode")];

      array.push(zipcode);


    }
  }

  Logger.log(array)
  return array;
}

//จบการหา จังหวัด อำเภอ ตำบล --CU--

function getmembertest_n8n() {
  const url = 'https://n8n-cpdg.agilesoftgroup.com/webhook/4be99354-5669-4400-88cc-73753cc8541c';
  const headers = {
    'Content-Type': 'application/json'
  };
  const payload = {
    member_id: '6810050'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload)
  };

  try {
    const datas = UrlFetchApp.fetch(url, options);

    BCT.EN_AES256CBC(JSON.stringify(datas[0]), "pkg", true, secret);
    Logger.log('Response Code: ' + datas.getResponseCode());
    Logger.log('Response Body: ' + datas.getContentText());
  } catch (error) {
    Logger.log('Error: ' + error.toString());
  }

}

/* [ใช้งานเฉพาะ]  ค้นหาข้อมูลสมาชิก จากไอดี */
function getMember(Keyword) {
  try {
    //  var query = "SELECT PKGemployee.*,CONCAT(thprefix,name_th,' ',surname_th) as name,company_management as company,division_short_name as division FROM PKGemployee WHERE status NOT IN ('N') and id="+Keyword;
    var query = "SELECT PKGemployee.*,CONCAT(thprefix,name_th,' ',surname_th) as name,company_management as company,division_short_name as division,tb_login.name as name_wallet,tb_login.phone_firebase FROM PKGemployee left join webLDX.tb_login on PKGemployee.id=tb_login.ID_MEMBER_PKG WHERE status NOT IN ('N') and id=" + Keyword;




    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return BCT.EN_AES256CBC(JSON.stringify(datas[0]), "pkg", true, secret);
    // return datas[0];
  } catch (e) {
    return e;
  }
}





// /* [ใช้งานเฉพาะ] ค้นหาข้อมูลสมาชิก (หลายเงื่อนไข) */ จับฐานข้อมูลเดิมเดิม
// function getMembers(Keyword,nameUseID){
//   try{
//     var query = "SELECT PKGemployee.*,CONCAT(thprefix,name_th,' ',surname_th) as name,company_management as company,division_short_name as division,CONCAT(thprefix,name_th,' ',surname_th) as n_Member,company_ctt as company,division_name as Sub_team FROM PKGemployee WHERE status NOT IN ('N') and id="+Keyword;
//     var DBName = "PPP7"; 
//     var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
//     var jsonData = {};
//     jsonData['nameUseID'] = nameUseID;
//     jsonData['data'] = datas[0];
//     return BCT.EN_AES256CBC(JSON.stringify(jsonData),"pkg", true, secret);
//     // return jsonData;
//   }catch(e){
//     return e;
//   }
// }


/* [ใช้งานเฉพาะ] ค้นหาข้อมูลสมาชิก (หลายเงื่อนไข) */
function getMembers(Keyword, nameUseID) { //จับฐานข้อมูลใหม่
  try {
    //var Keyword = '6605222';

    var query = "SELECT tb.*,CONCAT(tb.thprefix,tb.name_th,' ',tb.surname_th) as name,tb.division_name_gr as company,pkg.telNumber as telNumber, "
    query += " tb.division_name_short as division,CONCAT(tb.thprefix,tb.name_th,' ',tb.surname_th) as n_Member, "
    query += " tb.company_name_short as company,tb.division_name_th as division_name ,tb.company_name_short as branch_ctt, "
    query += " tb.company_name_short as company_ctt ,tb.division_name_gr as company_management ,pkg.Bank_Acct_Number as Bank_Acct_Number "
    query += " FROM tbstructure_in_Member_view tb left join PKGemployee pkg on pkg.id=tb.id WHERE tb.status NOT IN ('N') and tb.id=" + Keyword;
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
    // return jsonData;
  } catch (e) {
    return e;
  }
}

function getMembers_W(Keyword, nameUseID) {
  // Keyword = "6210046";
  try {
    var query = "SELECT PKGemployee.*,CONCAT(name_th,' ',surname_th) as name,company_management as company,division_short_name as division FROM PKGemployee WHERE status NOT IN ('N') and id=" + Keyword;
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return jsonData;
  } catch (e) {
    return e;
  }
}

function getMembers2(Keyword, nameUseID) { //จับฐานข้อมูลใหม่
  try {
    //var Keyword = '6605222';

    var query = "SELECT tb.*,CONCAT(tb.name_en,' ',tb.surname_en) as name,tb.division_name_gr as company,pkg.telNumber as telNumber, "
    query += " tb.division_name_short as division,CONCAT(tb.thprefix,tb.name_th,' ',tb.surname_th) as n_Member, "
    query += " tb.company_name_short as company,tb.division_name_th as division_name ,tb.company_name_short as branch_ctt, "
    query += " tb.company_name_short as company_ctt ,tb.division_name_gr as company_management ,pkg.Bank_Acct_Number as Bank_Acct_Number "
    query += " FROM tbstructure_in_Member_view tb left join PKGemployee pkg on pkg.id=tb.id WHERE tb.status NOT IN ('N') and tb.id=" + Keyword;
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
    // return jsonData;
  } catch (e) {
    return e;
  }
}

function getMembersen(Keyword) {
  try {
    var query = "SELECT tb.*,pkg.name_en as member_id_name,tb.division_name_gr as company, "
    query += " tb.division_name_short as division,CONCAT(tb.thprefix,tb.name_th,' ',tb.surname_th) as n_Member, "
    query += " tb.company_name_short as company,tb.division_name_th as division_name ,tb.company_name_short as branch_ctt, "
    query += " tb.company_name_short as company_ctt ,tb.division_name_gr as company_management ,pkg.Bank_Acct_Number as Bank_Acct_Number "
    query += " FROM tbstructure_in_Member_view tb left join PKGemployee pkg on pkg.id=tb.id WHERE tb.status NOT IN ('N') and tb.id=" + Keyword;
    var datas = BCT.loadJSONDatas('RDS', 'PPP7', query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

// function getRPLC_loadDataC(Keyword){
//    try{
//     var query = "SELECT c.ctt_code,cu.cust_name FROM AMS_contract c left join AMS_customer cu on c.cust_code = cu.cust_code";
//      query +=" WHERE ctt_code!=''and ctt_code like'%"+Keyword+"%' "
//     var DBName = "BCT_AMS2_RPLC"; 
//     var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
//     var jsonData = {};
//     jsonData['nameUse-ID'] = nameUseID;
//     jsonData['datas'] = datas;
//     return jsonData;
//   }catch(e){
//     return e;
//   }
// }




// ทำวันเพจ BCT : Law_ตรวจสอบหลักทรัพย์(805 900)050263 //
function getAAM_trace_customer(Keyword) {
  try {
    // เริ่มต้นคำสั่ง SQL สำหรับการเลือกคอลัมน์ที่จำเป็นจากฐานข้อมูล
    var query = "select tbcontract.ctt_code,concat(pbor.px_name,tbcustomerbor.cust_fname,' ',tbcustomerbor.cust_lname) as cust_name";
    query += " ,concat(pguar.px_name,tbcustomerguar.cust_fname,' ',tbcustomerguar.cust_lname) as surety_name ";
    query += " ,if(car.car_reg is NULL,tbland.land_deed,car.car_reg) as reg_code ";
    query += " ,concat(tbcustomerbor.address,' หมู่ ',tbcustomerbor.moo,' ต.',tbtumbol_bor.tum_tname,' อ.',tbamphor_bor.amp_tname,' จ.',tbprovince_bor.pv_tname,' ',tbcustomerbor.zipcode) as address ";
    query += " ,tbgrant_guarantee.grant_id as grant_detail from tbcontract ";

    /// ผู้กู้ ////
    // เข้าร่วมข้อมูลของลูกค้าผู้กู้กับสัญญา
    query += " LEFT JOIN tbcontract_customer tbcontract_customerbor on tbcontract.ctt_code=tbcontract_customerbor.ctt_code and tbcontract_customerbor.cttc_type='bor' ";
    query += " LEFT JOIN tbcustomer tbcustomerbor on tbcontract_customerbor.cust_code=tbcustomerbor.cust_code ";
    // เข้าร่วมข้อมูลของคำนำหน้าชื่อผู้กู้
    query += " LEFT JOIN tbprefix pbor on tbcustomerbor.px_code=pbor.px_code ";

    /// ผู้ค้ำ ////
    // เข้าร่วมข้อมูลของลูกค้าผู้ค้ำกับสัญญา
    query += " LEFT JOIN tbcontract_customer tbcontract_customerguar on tbcontract.ctt_code=tbcontract_customerguar.ctt_code and tbcontract_customerguar.cttc_type='guar' ";
    query += " LEFT JOIN tbcustomer tbcustomerguar on tbcontract_customerguar.cust_code=tbcustomerguar.cust_code ";
    // เข้าร่วมข้อมูลของคำนำหน้าชื่อผู้ค้ำ
    query += " LEFT JOIN tbprefix pguar on tbcustomerguar.px_code=pguar.px_code ";

    // เข้าร่วมข้อมูลของหลักประกัน (เช่น รถหรือที่ดิน)
    query += " LEFT JOIN tbcontract_guarantee tbcontract_guarantee on tbcontract.ctt_code=tbcontract_guarantee.ctt_code ";
    query += " LEFT JOIN car car on tbcontract_guarantee.guarantee_id=car.car_code_ams3 ";
    query += " LEFT JOIN tbland on tbcontract_guarantee.guarantee_id=tbland.land_id ";
    query += " LEFT JOIN tbgrant_guarantee tbgrant_guarantee on tbcontract_guarantee.guarantee_id=tbgrant_guarantee.guarantee_id ";

    // เข้าร่วมข้อมูลที่อยู่ของผู้กู้
    query += " LEFT JOIN tbprovince tbprovince_bor on tbcustomerbor.pv_code=tbprovince_bor.pv_code ";
    query += " LEFT JOIN tbamphor tbamphor_bor on tbcustomerbor.pv_code=tbamphor_bor.pv_code and tbcustomerbor.amp_code=tbamphor_bor.amp_code ";
    query += " LEFT JOIN tbtumbol tbtumbol_bor on tbcustomerbor.pv_code=tbtumbol_bor.pv_code and tbcustomerbor.amp_code=tbtumbol_bor.amp_code and tbcustomerbor.tum_code=tbtumbol_bor.tum_code ";
    query += " LEFT JOIN tbprovince tbprovince_bor_contract on tbcustomerbor.pv_code_contract=tbprovince_bor_contract.pv_code ";
    query += " LEFT JOIN tbamphor tbamphor_bor_contract on tbcustomerbor.pv_code_contract=tbamphor_bor_contract.pv_code and tbcustomerbor.amp_code_contract=tbamphor_bor_contract.amp_code ";
    query += " LEFT JOIN tbtumbol tbtumbol_bor_contract on tbcustomerbor.pv_code_contract=tbtumbol_bor_contract.pv_code and tbcustomerbor.amp_code_contract=tbamphor_bor_contract.amp_code ";
    query += "  and tbcustomerbor.tum_code_contract=tbtumbol_bor_contract.tum_code ";

    // กำหนดเงื่อนไขในการค้นหาข้อมูลตามรหัสสัญญาที่ระบุ
    query += " where tbcontract.ctt_code = '" + Keyword + "' ";

    // ดึงข้อมูลจากฐานข้อมูลตามคำสั่ง SQL ที่สร้างขึ้น
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), 'ams4', query);
    return datas[0]; // ส่งกลับข้อมูลแถวแรกที่ได้จากการค้นหา
  } catch (e) {
    return e; // หากเกิดข้อผิดพลาด ให้ส่งกลับข้อผิดพลาดนั้น
  }
}



function gatMR_aicp(Keyword) {
  try {

    var DBName = "BCT_AMS2_RAFCO";

    var query = "select m.ID_MR ,CONCAT(m.fname,' ',m.lname) as name from BCT_MR_MOTOR m  where m.Phone_M like'%" + Keyword + "%' ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}


/* [ใช้งานเฉพาะ] ค้นหา Token ลูกค้า แบบหลายเงื่อนไข */
function getMemberMultiKeyLDX(Keyword, nameUseID) {
  try {
    //    var query = "SELECT tb_login.*,CONCAT(ID_LDX,' ',phone,' ชื่อแฝง : ',name,'| ชื่อเต็ม : ',full_name,' | ชื่อ-นามสกุล : ',f_name,' ',l_name) as name FROM tb_login WHERE  (phone like '%"+Keyword+"%' or ID_LDX like '%"+Keyword+"%' or f_name like '%"+Keyword+"%' or l_name like '%"+Keyword+"%' or full_name like '%"+Keyword+"%') order by id asc limit 5";
    var query = "SELECT tb_login.* FROM tb_login WHERE  (phone like '%" + Keyword + "%' or ID_LDX like '%" + Keyword + "%' or f_name like '%" + Keyword + "%' or l_name like '%" + Keyword + "%' or full_name like '%" + Keyword + "%') order by ID_LDX asc limit 5";

    var DBName = "webLDX";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}
/* [ใช้งานเฉพาะ]  ค้นหาข้อมูลสมาชิก จากไอดี */
function getMembersLDX(Keyword, nameUseID) {
  try {
    var query = "SELECT tb_login.* FROM tb_login WHERE  ID_LDX='" + Keyword + "'";
    var DBName = "webLDX";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return jsonData;
  } catch (e) {
    return e;
  }
}


//getPartnerMultiKey
function getPartnerMultiKey(Keyword, nameUseID) {
  // Keyword ="สุ"
  try {
    var query = "SELECT BCT_Supplier.*,CONCAT(name,' ',s_urname) as name FROM BCT_Supplier WHERE   Sup_ID like '%" + Keyword + "%' or name like '%" + Keyword + "%' or s_urname like '%" + Keyword + "%' order by Sup_ID asc limit 5";
    var DBName = "BCT_FAMRent";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
    // return jsonData;
  } catch (e) {
    return e;
  }
}

function getPartners(Keyword, nameUseID) {
  // Keyword ="FAM-S-001";
  try {
    var query = "SELECT BCT_Supplier.*,CONCAT(name,' ',s_urname) as name,CONCAT(address,Amp,PV,Zipcode) as add_full FROM BCT_Supplier WHERE Sup_ID= '" + Keyword + "'";
    var DBName = "BCT_FAMRent";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
    // return jsonData;
  } catch (e) {
    return e;
  }
}





/* [ใช้งานเฉพาะ] ค้นหา Token ลูกค้า แบบหลายเงื่อนไข */
function getMemberMultiKey(Keyword, nameUseID) {
  try {
    var query = "SELECT PKGemployee.*,CONCAT(thprefix,name_th,' ',surname_th) as name FROM PKGemployee WHERE status NOT IN ('N') and (id like '%" + Keyword + "%' or name_th like '%" + Keyword + "%' or surname_th like '%" + Keyword + "%' or nickname like '%" + Keyword + "%' or name_en like '%" + Keyword + "%' or surname_en like '%" + Keyword + "%' or telNumber like '%" + Keyword + "%') order by id asc limit 5";
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
    // return jsonData;
  } catch (e) {
    return e;
  }
}

/* [ใช้งานเฉพาะ] ค้นหา Token ลูกค้า */
function getLineToken(Keyword) {
  try {
    var query = "SELECT BCT_Line_Token_customer.*,CONCAT(fname_customer,' ',lname_customer,' : ',name_group) as name,CONCAT(fname_customer,' ',lname_customer) as name_customer FROM BCT_Line_Token_customers WHERE type_create='feelweel' and running=" + Keyword;
    var DBName = "BCT_AGS";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

/* [ใช้งานเฉพาะ] ค้นหา Token feelweel แบบหลายเงื่อนไข */
function getLineTokenMultiKey_feelweel(Keyword, nameUseID) {
  try {
    var query = "SELECT BCT_Line_Token_customer.*,CONCAT(name_group,' : ',fname_customer,' ',lname_customer) as name,CONCAT(fname_customer,' ',lname_customer) as name_customer FROM BCT_Line_Token_customers WHERE type_create='feelweel' and name_group!='' and (regis like '%" + Keyword + "%' or name_group like '%" + Keyword + "%' or centerPhone like '%" + Keyword + "%' or fname_customer like '%" + Keyword + "%' or lname_customer like '%" + Keyword + "%' ) order by running asc limit 5";
    var DBName = "BCT_AGS";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}

/* [ใช้งานเฉพาะ] ดึงข้อมูล ams2 จาก Elastixsearch */
function getAMS2ContractDataByCttCode(Keyword) {
  try {
    var DBsever = "tbcontract_data";
    var DBName = "tbcontract_data";
    var payload = {
      "query": {
        "bool": {
          "must": [
            {
              "query_string": {
                "fields": ["ctt_code.keyword"],
                "query": Keyword
              }
            }
          ]
        }
      }
    };
    Logger.log(JSON.stringify(payload))
    var cached = BCT.loadJSONQuery_Elasticsearch(DBsever, DBName, payload);
    var datas = BCT.loadJSONDatas('', '', '', cached, '');
    var jsonData = datas[0];
    if (jsonData['_source'] != undefined) {
      var json = jsonData['_source'];
      json['result_int'] = Number(json['result_srv']) + Number(json['result_interest']) + Number(json['result_fee']);
      return json;
    }
  } catch (e) {
    return e;
  }
}

/* [ใช้งานร่วมกันได้] ดึงข้อมูล ตาม config */
function getDatasByKeyword(queryName, keyWord, keyWord_field) {
  try {
    var query = config[queryName]['query'] + " WHERE " + keyWord_field + "='" + keyWord + "'";
    var DBName = config[queryName]['DBName'];
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getShortURL(nameUseID, longURL) {
  var result = {};
  result['nameUseID'] = nameUseID;
  result['longURL'] = longURL;
  result['shortURL'] = BCT.shortenURL(longURL);
  return result;
}

function test_getShortURL() {
  console.log(BCT.shortenURL("https://script.google.com/macros/s/AKfycbxgdG7tsJi9L0pSmjWG7mhJZFJORxbtN_iQoPa91sSJOQnZXuk/exec?spreadsheet_id=1NdrPnMwq0CJWmIaiMxkXkspk1xP4c7YBrcum5chEaP4&form_name=createShortURL"))
}

function getbusetfu(Keyword, nameUseID) {

  try {
    var query = "SELECT * FROM division WHERE status='Y' and company_ctt =" + Keyword;
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUseID'] = nameUseID;
    jsonData['data'] = datas[0];
    return jsonData;
  } catch (e) {
    return e;
  }


}

function getKBANK_generateQR(data) {
  var kdata = BCT.KBANK_generateQR(data['txnAmount'], data['reference1'], data['reference2'], data['reference3'], data['phone_number'], data['comment'], data['email'], data['bu'], data['type_mode']);
  data['kdata'] = kdata;
  return data;
}



function getDataHoldCarRafco(nameUseID, reg) {
  var jsonData = {};
  var dataCar = 0;


  var ss = SpreadsheetApp.openById("1FpEzvdl3Kaagf42pswyqaf_ZyAMb37Q3Xbr3tOH6oFU");
  var sheet = ss.getSheetByName("B1_PNM");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var json = {};

  for (var i = 0; i < data.length; i++) {
    var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
    if (car_regis != "") {

      json[car_regis] = {
        "carID": data[i][BCT.numberPositionValueByFliedName(flieds, "carID")],
        "ctt_code": data[i][BCT.numberPositionValueByFliedName(flieds, "ctt_code")],
        "cust_name": data[i][BCT.numberPositionValueByFliedName(flieds, "cust_name")],
        "machine_no": data[i][BCT.numberPositionValueByFliedName(flieds, "machine_no")],
        "crutcher_no": data[i][BCT.numberPositionValueByFliedName(flieds, "crutcher_no")],
        "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
        "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
        "car_yeat": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")]
      }
    }
  }

  if (json[reg] != undefined) {
    dataCar = json[reg];
  }



  ////ถ้าไม่เจอ
  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_BTB");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "carID": data[i][BCT.numberPositionValueByFliedName(flieds, "carID")],
          "ctt_code": data[i][BCT.numberPositionValueByFliedName(flieds, "ctt_code")],
          "cust_name": data[i][BCT.numberPositionValueByFliedName(flieds, "cust_name")],
          "machine_no": data[i][BCT.numberPositionValueByFliedName(flieds, "machine_no")],
          "crutcher_no": data[i][BCT.numberPositionValueByFliedName(flieds, "crutcher_no")],
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "car_yeat": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }

  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_SIR");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "carID": data[i][BCT.numberPositionValueByFliedName(flieds, "carID")],
          "ctt_code": data[i][BCT.numberPositionValueByFliedName(flieds, "ctt_code")],
          "cust_name": data[i][BCT.numberPositionValueByFliedName(flieds, "cust_name")],
          "machine_no": data[i][BCT.numberPositionValueByFliedName(flieds, "machine_no")],
          "crutcher_no": data[i][BCT.numberPositionValueByFliedName(flieds, "crutcher_no")],
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "car_yeat": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }

  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_KPT");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "carID": data[i][BCT.numberPositionValueByFliedName(flieds, "carID")],
          "ctt_code": data[i][BCT.numberPositionValueByFliedName(flieds, "ctt_code")],
          "cust_name": data[i][BCT.numberPositionValueByFliedName(flieds, "cust_name")],
          "machine_no": data[i][BCT.numberPositionValueByFliedName(flieds, "machine_no")],
          "crutcher_no": data[i][BCT.numberPositionValueByFliedName(flieds, "crutcher_no")],
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "car_yeat": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  ////ถ้าไม่เจอ
  if (reg == '9ZZ-9999 TEST') {
    json[reg] = {
      "ctt_code": 'TES200TES0000000001',
      "cust_name": 'ทดสอบ',
      "machine_no": 'ทดสอบ',
      "crutcher_no": 'ทดสอบ',
      "car_brand": 'ทดสอบ',
      "car_style": 'ทดสอบ',
      "car_yeat": 'ทดสอบ'
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }
  }


  jsonData['nameUseID'] = nameUseID;
  jsonData['data'] = dataCar;
  return jsonData;



}
function getDataHoldCarRafco2(nameUseID, reg) {
  var jsonData = {};
  var dataCar = 0;


  var ss = SpreadsheetApp.openById("1FpEzvdl3Kaagf42pswyqaf_ZyAMb37Q3Xbr3tOH6oFU");
  var sheet = ss.getSheetByName("B1_PNM");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var json = {};

  for (var i = 0; i < data.length; i++) {
    var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
    if (car_regis != "") {

      json[car_regis] = {
        "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
        "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
        "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")],
        "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "date_c")]
      }
    }
  }

  if (json[reg] != undefined) {
    dataCar = json[reg];
  }



  ////ถ้าไม่เจอ
  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_BTB");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "date_c")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_SIR");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "date_c")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  if (dataCar == 0) {

    var sheet = ss.getSheetByName("B1_KPT");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "car_brand")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "car_style")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "car_yeat")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "date_c")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  ////ถ้าไม่เจอ
  if (reg == '9ZZ-9999 TEST') {
    json[reg] = {
      "ctt_code": 'TES200TES0000000001',
      "cust_name": 'ทดสอบ',
      "machine_no": 'ทดสอบ',
      "crutcher_no": 'ทดสอบ',
      "car_brand": 'ทดสอบ',
      "car_style": 'ทดสอบ',
      "car_yeat": 'ทดสอบ'
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }
  }


  jsonData['nameUseID'] = nameUseID;
  jsonData['data'] = dataCar;
  return jsonData;


  //     var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "carCode")];
  //  "car_brand" : data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
  //       "car_style" : data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
  //       "md_model" : data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
  //       "wait_sale" : data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]

}

function getDataHoldCarRafco3(nameUseID, reg) {
  var jsonData = {};
  var dataCar = 0;


  var ss = SpreadsheetApp.openById("1puFT3PapNS2k6xlWb_xMt3DPpIWHTmKT_1PwBaDZ3yg");
  var sheet = ss.getSheetByName("B1_Stock");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

  var json = {};

  for (var i = 0; i < data.length; i++) {
    var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
    if (car_regis != "") {

      json[car_regis] = {
        "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
        "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
        "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
        "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]
      }
    }
  }

  if (json[reg] != undefined) {
    dataCar = json[reg];
  }



  ////ถ้าไม่เจอ
  if (dataCar == 0) {

    var ss = SpreadsheetApp.openById("1fOulSyMpB-L0v5holrzCEjRQnS9r-OVbminU8doGFOU");
    var sheet = ss.getSheetByName("B1_Stock");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  ////ถ้าไม่เจอ
  if (dataCar == 0) {

    var ss = SpreadsheetApp.openById("1u1BpOxufdL5rXOYnlruTM4kVKNPnboetPyw1PCJzxBs");
    var sheet = ss.getSheetByName("B1_Stock");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  if (dataCar == 0) {

    var ss = SpreadsheetApp.openById("1Z7c_sCIst2WlTxviz__3-80XX_E5JaVk7BLyrrPRgmo");
    var sheet = ss.getSheetByName("B1_Stock");
    var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
    var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);

    var json = {};

    for (var i = 0; i < data.length; i++) {
      var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "car_regis")];
      if (car_regis != "") {

        json[car_regis] = {
          "car_brand": data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
          "car_style": data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
          "md_model": data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
          "wait_sale": data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]
        }
      }
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }



  }
  ////ถ้าไม่เจอ
  if (reg == '9ZZ-9999 TEST') {
    json[reg] = {
      "ctt_code": 'TES200TES0000000001',
      "cust_name": 'ทดสอบ',
      "machine_no": 'ทดสอบ',
      "crutcher_no": 'ทดสอบ',
      "car_brand": 'ทดสอบ',
      "car_style": 'ทดสอบ',
      "car_yeat": 'ทดสอบ'
    }

    if (json[reg] != undefined) {
      dataCar = json[reg];
    }
  }


  jsonData['nameUseID'] = nameUseID;
  jsonData['data'] = dataCar;
  return jsonData;


  //     var car_regis = data[i][BCT.numberPositionValueByFliedName(flieds, "carCode")];
  //  "car_brand" : data[i][BCT.numberPositionValueByFliedName(flieds, "cat_type")],
  //       "car_style" : data[i][BCT.numberPositionValueByFliedName(flieds, "model_name")],
  //       "md_model" : data[i][BCT.numberPositionValueByFliedName(flieds, "serieCode")],
  //       "wait_sale" : data[i][BCT.numberPositionValueByFliedName(flieds, "sum_date_sale")]

}
function test_getRafco_trace_customer() {
  console.log("result", getRafco_trace_customer("PNM200JCF0136620211"))
}

function getRafco_trace_customer(ctt_code) {
  //  ctt_code = "PNM200JCF0118620259";

  if (ctt_code.substring(0, 3) == 'PNM') {
    var sql = "SELECT m.cust_fname+' '+m.cust_lname AS cust_name,c2.cust_fname+' '+c2.cust_lname AS cust_name2,ar.addr_num,ar.addr_moo,ar.addr_soi,ar.addr_road,ar.zip_code";
    sql += ",t.tum_tname,p.pv_tname,a.amp_tname,ca.car_reg";
    sql += " FROM tbcontract c LEFT JOIN tbcustomer m ON c.cust_code = m.cust_code";
    sql += " LEFT JOIN tbcustaddr ar ON c.cust_code = ar.cust_code";
    sql += " LEFT JOIN tbtumbol t ON ar.tum_code = t.tum_code";
    sql += " LEFT JOIN tbprovince p ON ar.pv_code = p.pv_code";
    sql += " LEFT JOIN tbamphor a ON ar.amp_code = a.amp_code";
    sql += " LEFT JOIN tbcar ca ON c.car_code = ca.car_code";
    sql += " LEFT JOIN tbgroupref g ON c.gref_code = g.gref_code";
    sql += " LEFT JOIN tbcustomer c2 ON g.cust_code = c2.cust_code";
    sql += " where c.ctt_code = '" + ctt_code + "'";
    console.log("sql", sql)
    var data = BCT.loadJSONDatas("AMS2", "RAFCO_CAP", sql);
  } else {
    var sql = "SELECT concat(tbcustomer_bor.firstname_eng,' ',tbcustomer_bor.lastname_eng) AS cust_name,";

    sql += "concat(tbcustomer_guar.firstname_eng,' ',tbcustomer_guar.lastname_eng) AS cust_name2,";
    sql += "tbcustomer_bor.address_contract as addr_num,tbcustomer_bor.moo_contract as addr_moo,tbcustomer_bor.soi_contract as addr_soi,tbcustomer_bor.road_contract as addr_road"
    sql += ",tbtumbol_contract.tum_name_th as tum_tname,tbamphor_contract.amp_name_th as amp_tname,tbprovince_contract.name_th as pv_tname,";
    // sql += "tbcustomer_bor.address_contract as address,"
    sql += "car.car_reg FROM tbcontract ";
    sql += "LEFT JOIN tbcontract_customer tbcontract_customer_bor ON tbcontract.ctt_code = tbcontract_customer_bor.ctt_code AND tbcontract_customer_bor.cttc_type ='bor' AND tbcontract_customer_bor.cttc_id = 1 ";
    sql += "LEFT JOIN tbcustomer tbcustomer_bor ON tbcontract_customer_bor.cust_code = tbcustomer_bor.cust_code ";


    sql += "LEFT JOIN tbcontract_customer tbcontract_customer_guar ON tbcontract.ctt_code = tbcontract_customer_guar.ctt_code AND tbcontract_customer_guar.cttc_type ='guar' ";
    sql += "LEFT JOIN tbcustomer tbcustomer_guar ON tbcontract_customer_guar.cust_code = tbcustomer_guar.cust_code ";


    sql += "left join tbcontract_guarantee on tbcontract.ctt_code=tbcontract_guarantee.ctt_code ";
    sql += "left join car on tbcontract_guarantee.guarantee_id=car.car_code_ams3 ";

    sql += "left join tbprovince tbprovince_contract on tbcustomer_bor.pv_code_contract=tbprovince_contract.pv_code ";
    sql += "left join tbamphor tbamphor_contract  on tbcustomer_bor.amp_code_contract=tbamphor_contract.amp_code ";
    sql += "left join tbtumbol tbtumbol_contract on tbcustomer_bor.tum_code_contract=tbtumbol_contract.tum_code ";

    sql += "left join tbvillage on SUBSTRING_INDEX(tbcustomer_bor.village, '|', 1)=tbvillage.vill_code ";

    sql += "WHERE tbcontract.ctt_code = '" + ctt_code + "'"


    console.log("sql", sql)
    var data = BCT.loadJSONDatas("RDS", "ams4_RAFCO", sql);
  }
  console.log("data", data)
  var main = {}
  main["cust"] = data;

  /////////////ประวัติการติดตาม

  var ss = SpreadsheetApp.openById("1jabwxnf_BYGLDqwSxBoL7kSaYt-1MPqKoRTCmxFVbSU");
  var sheet = ss.getSheetByName("แจ้งสถานะงานติดตาม_onepage");
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  var dataAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  var col_ctt = BCT.numberPositionValueByFliedName(flieds, "ctt_code");
  var col_title = BCT.numberPositionValueByFliedName(flieds, "title");
  var col_time = BCT.numberPositionValueByFliedName(flieds, "time");
  var col_gps = BCT.numberPositionValueByFliedName(flieds, "gps");
  var json = {};
  for (var i = 0; i < dataAll.length; i++) {
    if (dataAll[i][col_ctt] != "") {
      if (json[dataAll[i][col_ctt]] == undefined) {
        if (dataAll[i][col_time] != '') {
          json[dataAll[i][col_ctt]] = [dataAll[i][col_title] + " วันที่ " + Utilities.formatDate(dataAll[i][col_time], "GMT+7", "dd/MM/yyyy")];
        }
      } else {
        if (dataAll[i][col_time] != '') {
          json[dataAll[i][col_ctt]].push(dataAll[i][col_title] + " วันที่ " + Utilities.formatDate(dataAll[i][col_time], "GMT+7", "dd/MM/yyyy"));
        }
      }
    }
  }

  var ctt_str = [];
  if (json[ctt_code] != undefined) {
    ctt_str = json[ctt_code];
  }
  main["ctt_str"] = ctt_str;

  var json = {};
  for (var i = 0; i < dataAll.length; i++) {
    if (dataAll[i][col_ctt] != "") {
      if (json[dataAll[i][col_ctt]] == undefined) {
        json[dataAll[i][col_ctt]] = [dataAll[i][col_gps]];
      } else {

        json[dataAll[i][col_ctt]].push(dataAll[i][col_gps]);
      }
    }
  }

  var ctt_str = [];
  if (json[ctt_code] != undefined) {
    ctt_str = json[ctt_code];
  }

  main["ctt_str_gps"] = ctt_str;


  /////////////grant

  var grant_id = BCT.grant_get_grant_id_by_ctt_code(ctt_code, "RAFCO");
  var ctt_str = [];
  if (grant_id != "") {
    var data = BCT.loadJSONDatas("RDS", "BCT_AMS2_RAFCO", "select coordinates_home_borrowers,collater_photos,upload_application_form,picture_borrower,picture_guarantor_1,picture_guarantor_2 from BCT_GrantMTC WHERE grant_id = '" + grant_id + "'");
    if (data.length > 0) {

      ctt_str.push(data[0]);
      //      sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "coordinates_home_borrowers")).setValue(data[0]["coordinates_home_borrowers"]);
      //        sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "collater_photos")).setValue(data[0]["collater_photos"]);
      //        sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "upload_application_form")).setValue(data[0]["upload_application_form"]);
      //        sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "picture_borrower")).setValue(data[0]["picture_borrower"]);
      //        sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "picture_guarantor_1")).setValue(data[0]["picture_guarantor_1"]);
      //        sheet.getRange(row, BCT.numberColumnByFliedName(flieds, "picture_guarantor_2")).setValue(data[0]["picture_guarantor_2"]);
    }
  }

  main["ctt_str_grant"] = ctt_str;


  console.log("main", main)
  Logger.log("main");
  Logger.log(main);

  return main;

}


function yyhyhy() {
  Logger.log(BCT.checkStatusAppAndLine("081-1461342"))
}

/* [ใช้งานเฉพาะ] ค้นหา ข้อมูลจาก job id */
function getjob_id_PMGByID(job_id) {
  try {
    var query = "SELECT * FROM job_head where job_id='" + job_id + "'";
    var DBName = "BCT_PMG_NEW";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    if (datas.length > 0) {
      var Phone = datas[0]['mobile'];
      var rrr = BCT.checkStatusAppAndLine(Phone)
      var statusLine = rrr["result"]["statusLine"]
      var statusApp = rrr["result"]["statusApp"]
      datas[0]['token'] = statusLine;
      datas[0]['app'] = statusApp;


    }
    var jsonData = {};
    //    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}

function getDataMR_AAM(Keyword) {
  try {

    var DBName = "BCT_AMS2";
    var query = " SELECT ID_MR as id_mr,concat(fname,' ',lname) as name_mr FROM BCT_MR WHERE  Phone_M like '" + Keyword + "' ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}




function getUser_rafco_sell(id) {

  var ss = SpreadsheetApp.openById("1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc");
  var sheet = ss.getSheetByName("A3_config  ข้อมูล");
  var data = sheet.getRange("A4:C").getValues();
  var json = {};

  for (var i = 0; i < data.length; i++) {

    if (data[i][0] == id) {

      json["member_name"] = data[i][1];
      json["branch"] = data[i][2];
      json["time"] = Utilities.formatDate(new Date(), "GMT", "dd/MM/yyyy HH:mm:ss");
      return json;
    }

  }

  return "N";


}


function getData_rafco_sell(id) {
  //    id = "PNM201NCF0136620183";
  var ss = SpreadsheetApp.openById("1FpEzvdl3Kaagf42pswyqaf_ZyAMb37Q3Xbr3tOH6oFU");
  var sheet = ss.getSheetByName("B1_" + BCT.getReportT_RAFCO_NameBrand(id));
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  var json = {};
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  for (var i = 0; i < data.length; i++) {
    var ctt_code = data[i][BCT.numberColumnByFliedName(flieds, "ctt_code") - 1];
    if (ctt_code == id) {
      json["cust_name"] = data[i][BCT.numberColumnByFliedName(flieds, "cust_name") - 1];
      json["car_brand"] = data[i][BCT.numberColumnByFliedName(flieds, "car_brand") - 1];
      json["car_style"] = data[i][BCT.numberColumnByFliedName(flieds, "car_style") - 1];
      json["md_model"] = data[i][BCT.numberColumnByFliedName(flieds, "md_model") - 1];
      json["clt_name"] = data[i][BCT.numberColumnByFliedName(flieds, "clt_name") - 1];
      json["car_strid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_strid") - 1];
      json["car_engid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_engid") - 1];

      var reg_date = data[i][BCT.numberColumnByFliedName(flieds, "reg_date") - 1];
      if (reg_date != "" && reg_date != undefined) {
        try {
          reg_date = Utilities.formatDate(reg_date, "GMT+7", "yyyy-MM-dd");
        } catch (e) { }
      }
      json["reg_date"] = reg_date;

      json["arc_sum"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_sum") - 1]).toFixed(2);
      json["arc_partint1"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_partint1") - 1]).toFixed(2);
      json["resultint"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "resultint") - 1]).toFixed(2);
      json["clc_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "clc_price") - 1]).toFixed(2);
      json["repair_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "repair_price") - 1]).toFixed(2);
      json["total_cost"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "total_cost") - 1]).toFixed(2);
      //      Logger.log(json);

      var datasams2 = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', "select * from bct_rlt where ctt_code = '" + ctt_code + "'");
      if (datasams2.length > 0) {
        json["car_reg"] = BCT.valueInData(datasams2[0], 'car_regis');
      }

      /*
      2/9/2021 จ้อน
      10:45 POK ณ PNP https://docs.google.com/spreadsheets/d/1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc/edit#gid=922382293
      10:45 POK ณ PNP @รุงรัง   @SDSไชยา_จ้อน2276_WFH พอดีผมจะย้ายให้ วันเพจ BCT ขายรถยึด RAFCO   ให้ไปดึงข้อมูลที่ บอร์ดระบาย อ้ะครับ ชื่อฟิลล์เดียวกัน แก้ไขได้ไหทครับ
      10:46 POK ณ PNP สวัสดีครับ  @รุงรัง 
      10:48 POK ณ PNP ย้ายที่ดึงข้อมูล ตามฟิวส์ แต่ แบบตอบกลับ ให้ไปลงที่เดิมครับ เนื่องจาก บางรายชื่อยังไม่มาที่ BCT ขายรถยึด RAFCO  จะดึง ข้อมูลไม่ได้   
      */
      var payload = { "query": { "bool": { "must": [{ "query_string": { "fields": ["ctt_code.keyword"], "query": ctt_code } }] } } };
      var cached = BCT.loadJSONQuery_Elasticsearch('tbcontract_data', 'tbcontract_data', payload);
      var datasAMS = BCT.loadJSONDatas('', '', '', cached, '');
      if (datasAMS.length > 0) {
        var jsonData = datasAMS[0];
        if (jsonData['_source'] != undefined) {
          var jsonData = jsonData['_source'];

          if (json["reg_date"] == '' || json["reg_date"] == undefined) {
            if (jsonData['regis_date'] != undefined) {
              json["reg_date"] = jsonData['regis_date'];
            }
          }

          if (json["car_strid"] == '' || json["car_strid"] == undefined) {
            if (jsonData['body_code'] != undefined) {
              json["car_strid"] = jsonData['body_code'];
            }
          }

          if (json["car_engid"] == '' || json["car_engid"] == undefined) {
            if (jsonData['engine_code'] != undefined) {
              json["car_engid"] = jsonData['engine_code'];
            }
          }

          if (json["md_model"] == '' || json["md_model"] == undefined) {
            if (jsonData['car_year'] != undefined) {
              json["md_model"] = jsonData['car_year'];
            }
          }

          if (json["clt_name"] == '' || json["clt_name"] == undefined) {
            if (jsonData['car_color'] != undefined) {
              json["clt_name"] = jsonData['car_color'];
            }
          }
        }
      }

      return json;
    }
  }
  //  var ss = SpreadsheetApp.openById("1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc");
  //  var sheet = ss.getSheetByName("B1_หลักประกัน");
  //  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  //  var json = {};
  //  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  //  for(var i=0;i<data.length;i++){
  //    var ctt_code = data[i][BCT.numberColumnByFliedName(flieds, "ctt_code")-1];
  //    if(ctt_code==id){
  //      
  //      json["cust_name"] = data[i][BCT.numberColumnByFliedName(flieds, "cust_name")-1];
  //      json["car_brand"] = data[i][BCT.numberColumnByFliedName(flieds, "car_brand")-1];
  //      json["car_style"] = data[i][BCT.numberColumnByFliedName(flieds, "car_style")-1];
  //      json["md_model"] = data[i][BCT.numberColumnByFliedName(flieds, "md_model")-1];
  //      json["clt_name"] = data[i][BCT.numberColumnByFliedName(flieds, "clt_name")-1];
  //      json["car_strid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_strid")-1];
  //      json["car_engid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_engid")-1];
  //      
  //      var reg_date = data[i][BCT.numberColumnByFliedName(flieds, "reg_date")-1];
  //      if(reg_date!=""){
  //        reg_date = Utilities.formatDate(reg_date, "GMT+7", "yyyy-MM-dd");
  //      }
  //      json["reg_date"] = reg_date;
  //      
  //      json["arc_sum"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_sum")-1]).toFixed(2);
  //      json["arc_partint1"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_partint1")-1]).toFixed(2);
  //      json["resultint"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "resultint")-1]).toFixed(2);
  //      json["clc_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "clc_price")-1]).toFixed(2);
  //      json["repair_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "repair_price")-1]).toFixed(2);
  //      json["total_cost"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "total_cost")-1]).toFixed(2);
  //      Logger.log(json);
  //      
  //      var datasams2 = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', "select * from bct_rlt where ctt_code = '"+ctt_code+"'");
  //      if(datasams2.length>0){
  //        json["car_reg"] = BCT.valueInData(datasams2[0], 'car_regis');
  //      }
  //      return json;
  //    }
  //  }
  return "N";
}





/// เนมเพิ่มการค้นหาข้อมูล
function getData_rafcosellcar(id) {
  //    id = "PNM201NCF0136620183";
  var ss = SpreadsheetApp.openById("1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc");
  var sheet = ss.getSheetByName("B1_หลักประกัน");
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  var json = {};
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  for (var i = 0; i < data.length; i++) {
    var car_reg = data[i][BCT.numberColumnByFliedName(flieds, "car_reg") - 1];
    if (car_reg == id) {

      json["car_brand"] = data[i][BCT.numberColumnByFliedName(flieds, "car_brand") - 1];
      json["car_style"] = data[i][BCT.numberColumnByFliedName(flieds, "car_style") - 1];
      json["md_model"] = data[i][BCT.numberColumnByFliedName(flieds, "md_model") - 1];
      json["wait_sale"] = data[i][BCT.numberColumnByFliedName(flieds, "wait_sale") - 1];


      var reg_date = data[i][BCT.numberColumnByFliedName(flieds, "reg_date") - 1];
      if (reg_date != "" && reg_date != undefined) {
        try {
          reg_date = Utilities.formatDate(reg_date, "GMT+7", "yyyy-MM-dd");
        } catch (e) { }
      }
      json["reg_date"] = reg_date;

      json["arc_sum"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_sum") - 1]).toFixed(2);
      json["arc_partint1"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_partint1") - 1]).toFixed(2);
      json["resultint"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "resultint") - 1]).toFixed(2);
      json["clc_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "clc_price") - 1]).toFixed(2);
      json["repair_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "repair_price") - 1]).toFixed(2);
      json["total_cost"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "total_cost") - 1]).toFixed(2);
      //      Logger.log(json);

      var datasams2 = BCT.loadJSONDatas('RDS', 'RAFCO_CAP', "select * from bct_rlt where carCode = '" + car_reg + "'");
      if (datasams2.length > 0) {
        json["car_reg"] = BCT.valueInData(datasams2[0], 'car_regis');
      }

      /*
      2/9/2021 จ้อน
      10:45 POK ณ PNP https://docs.google.com/spreadsheets/d/1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc/edit#gid=922382293
      10:45 POK ณ PNP @รุงรัง   @SDSไชยา_จ้อน2276_WFH พอดีผมจะย้ายให้ วันเพจ BCT ขายรถยึด RAFCO   ให้ไปดึงข้อมูลที่ บอร์ดระบาย อ้ะครับ ชื่อฟิลล์เดียวกัน แก้ไขได้ไหทครับ
      10:46 POK ณ PNP สวัสดีครับ  @รุงรัง 
      10:48 POK ณ PNP ย้ายที่ดึงข้อมูล ตามฟิวส์ แต่ แบบตอบกลับ ให้ไปลงที่เดิมครับ เนื่องจาก บางรายชื่อยังไม่มาที่ BCT ขายรถยึด RAFCO  จะดึง ข้อมูลไม่ได้   
      */
      var payload = { "query": { "bool": { "must": [{ "query_string": { "fields": ["ctt_code.keyword"], "query": car_reg } }] } } };
      var cached = BCT.loadJSONQuery_Elasticsearch('tbcontract_data', 'tbcontract_data', payload);
      var datasAMS = BCT.loadJSONDatas('', '', '', cached, '');
      if (datasAMS.length > 0) {
        var jsonData = datasAMS[0];
        if (jsonData['_source'] != undefined) {
          var jsonData = jsonData['_source'];

          if (json["reg_date"] == '' || json["reg_date"] == undefined) {
            if (jsonData['regis_date'] != undefined) {
              json["reg_date"] = jsonData['regis_date'];
            }
          }

          if (json["car_strid"] == '' || json["car_strid"] == undefined) {
            if (jsonData['body_code'] != undefined) {
              json["car_strid"] = jsonData['body_code'];
            }
          }

          if (json["car_engid"] == '' || json["car_engid"] == undefined) {
            if (jsonData['engine_code'] != undefined) {
              json["car_engid"] = jsonData['engine_code'];
            }
          }

          if (json["md_model"] == '' || json["md_model"] == undefined) {
            if (jsonData['car_year'] != undefined) {
              json["md_model"] = jsonData['car_year'];
            }
          }

          if (json["clt_name"] == '' || json["clt_name"] == undefined) {
            if (jsonData['car_color'] != undefined) {
              json["clt_name"] = jsonData['car_color'];
            }
          }
        }
      }

      return json;
    }
  }
  //  var ss = SpreadsheetApp.openById("1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc");
  //  var sheet = ss.getSheetByName("B1_หลักประกัน");
  //  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  //  var json = {};
  //  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  //  for(var i=0;i<data.length;i++){
  //    var ctt_code = data[i][BCT.numberColumnByFliedName(flieds, "ctt_code")-1];
  //    if(ctt_code==id){
  //      
  //      json["cust_name"] = data[i][BCT.numberColumnByFliedName(flieds, "cust_name")-1];
  //      json["car_brand"] = data[i][BCT.numberColumnByFliedName(flieds, "car_brand")-1];
  //      json["car_style"] = data[i][BCT.numberColumnByFliedName(flieds, "car_style")-1];
  //      json["md_model"] = data[i][BCT.numberColumnByFliedName(flieds, "md_model")-1];
  //      json["clt_name"] = data[i][BCT.numberColumnByFliedName(flieds, "clt_name")-1];
  //      json["car_strid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_strid")-1];
  //      json["car_engid"] = data[i][BCT.numberColumnByFliedName(flieds, "car_engid")-1];
  //      
  //      var reg_date = data[i][BCT.numberColumnByFliedName(flieds, "reg_date")-1];
  //      if(reg_date!=""){
  //        reg_date = Utilities.formatDate(reg_date, "GMT+7", "yyyy-MM-dd");
  //      }
  //      json["reg_date"] = reg_date;
  //      
  //      json["arc_sum"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_sum")-1]).toFixed(2);
  //      json["arc_partint1"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_partint1")-1]).toFixed(2);
  //      json["resultint"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "resultint")-1]).toFixed(2);
  //      json["clc_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "clc_price")-1]).toFixed(2);
  //      json["repair_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "repair_price")-1]).toFixed(2);
  //      json["total_cost"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "total_cost")-1]).toFixed(2);
  //      Logger.log(json);
  //      
  //      var datasams2 = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', "select * from bct_rlt where ctt_code = '"+ctt_code+"'");
  //      if(datasams2.length>0){
  //        json["car_reg"] = BCT.valueInData(datasams2[0], 'car_regis');
  //      }
  //      return json;
  //    }
  //  }
  return "N";
}

// เนมการค้นหาข้อมูลใน ขออนุมัติตั้งราคาขายโมโต
function getData_rafcosellMotor_aicp(id) {
  //    id = "PNM201NCF0136620183";
  var ss = SpreadsheetApp.openById("1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc");
  var sheet = ss.getSheetByName("B1_หลักประกัน");
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  var json = {};
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  for (var i = 0; i < data.length; i++) {
    var car_reg = data[i][BCT.numberColumnByFliedName(flieds, "car_reg") - 1];
    if (car_reg == id) {

      json["car_brand"] = data[i][BCT.numberColumnByFliedName(flieds, "car_brand") - 1];
      json["car_style"] = data[i][BCT.numberColumnByFliedName(flieds, "car_style") - 1];
      json["md_model"] = data[i][BCT.numberColumnByFliedName(flieds, "md_model") - 1];
      json["wait_sale"] = data[i][BCT.numberColumnByFliedName(flieds, "wait_sale") - 1];


      var reg_date = data[i][BCT.numberColumnByFliedName(flieds, "reg_date") - 1];
      if (reg_date != "" && reg_date != undefined) {
        try {
          reg_date = Utilities.formatDate(reg_date, "GMT+7", "yyyy-MM-dd");
        } catch (e) { }
      }
      json["reg_date"] = reg_date;

      json["arc_sum"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_sum") - 1]).toFixed(2);
      json["arc_partint1"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "arc_partint1") - 1]).toFixed(2);
      json["resultint"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "resultint") - 1]).toFixed(2);
      json["clc_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "clc_price") - 1]).toFixed(2);
      json["repair_price"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "repair_price") - 1]).toFixed(2);
      json["total_cost"] = Number(data[i][BCT.numberColumnByFliedName(flieds, "total_cost") - 1]).toFixed(2);
      //      Logger.log(json);

      var datasams2 = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', "select * from bct_rlt where ctt_code = '" + car_reg + "'");
      if (datasams2.length > 0) {
        json["car_reg"] = BCT.valueInData(datasams2[0], 'car_regis');
      }

      /*
      2/9/2021 จ้อน
      10:45 POK ณ PNP https://docs.google.com/spreadsheets/d/1Hr35NrxLgfKvfGtGNbmLnylD_5__24dLu3WwebuInxc/edit#gid=922382293
      10:45 POK ณ PNP @รุงรัง   @SDSไชยา_จ้อน2276_WFH พอดีผมจะย้ายให้ วันเพจ BCT ขายรถยึด RAFCO   ให้ไปดึงข้อมูลที่ บอร์ดระบาย อ้ะครับ ชื่อฟิลล์เดียวกัน แก้ไขได้ไหทครับ
      10:46 POK ณ PNP สวัสดีครับ  @รุงรัง 
      10:48 POK ณ PNP ย้ายที่ดึงข้อมูล ตามฟิวส์ แต่ แบบตอบกลับ ให้ไปลงที่เดิมครับ เนื่องจาก บางรายชื่อยังไม่มาที่ BCT ขายรถยึด RAFCO  จะดึง ข้อมูลไม่ได้   
      */
      var payload = { "query": { "bool": { "must": [{ "query_string": { "fields": ["ctt_code.keyword"], "query": car_reg } }] } } };
      var cached = BCT.loadJSONQuery_Elasticsearch('tbcontract_data', 'tbcontract_data', payload);
      var datasAMS = BCT.loadJSONDatas('', '', '', cached, '');
      if (datasAMS.length > 0) {
        var jsonData = datasAMS[0];
        if (jsonData['_source'] != undefined) {
          var jsonData = jsonData['_source'];

          if (json["reg_date"] == '' || json["reg_date"] == undefined) {
            if (jsonData['regis_date'] != undefined) {
              json["reg_date"] = jsonData['regis_date'];
            }
          }

          if (json["car_strid"] == '' || json["car_strid"] == undefined) {
            if (jsonData['body_code'] != undefined) {
              json["car_strid"] = jsonData['body_code'];
            }
          }

          if (json["car_engid"] == '' || json["car_engid"] == undefined) {
            if (jsonData['engine_code'] != undefined) {
              json["car_engid"] = jsonData['engine_code'];
            }
          }

          if (json["md_model"] == '' || json["md_model"] == undefined) {
            if (jsonData['car_year'] != undefined) {
              json["md_model"] = jsonData['car_year'];
            }
          }

          if (json["clt_name"] == '' || json["clt_name"] == undefined) {
            if (jsonData['car_color'] != undefined) {
              json["clt_name"] = jsonData['car_color'];
            }
          }
        }
      }

      return json;
    }
  }

  return "N";
}





// ****** ค้นหาข้อมูล รายงาน R RPLC  ******* //
function getReportR_RPLC_ByID(Keyword) {
  try {
    var query = "SELECT * FROM BCT_Stock_Car_Registration_Book WHERE running=" + Keyword;
    var DBName = "BCT_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getReportR_RPLC_Multi(Keyword, nameUseID) {
  try {
    var query = "SELECT * FROM BCT_Stock_Car_Registration_Book WHERE (ctt_code like '%" + Keyword + "%' or cust_name like '%" + Keyword + "%') order by running asc limit 5";
    var DBName = "BCT_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}
// ********************************* //

// ****** ค้นหาข้อมูล รายงาน R RAFCO  ******* //
function getReportR_RAFCO_ByID(Keyword) {
  try {
    var jsonContract = {};
    var query = " select BCT_Financing.*,BCT_Financing.contract_number as ctt_code,left(BCT_Financing.grant_id,3) as branch ";
    query += " from BCT_Financing ";
    query += " left join BCT_GrantMTC on BCT_Financing.grant_id=BCT_GrantMTC.grant_id ";
    query += " where BCT_Financing.running=" + Keyword;

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), 'BCT_AMS2_RAFCO', query);
    var ctt_codes = "";
    for (var i = 0; i < datas.length; i++) {
      jsonContract[BCT.valueInData(datas[i], 'ctt_code')] = datas[i];
      if (ctt_codes == "") {
        ctt_codes = BCT.valueInData(datas[i], 'ctt_code');
      } else {
        ctt_codes += ",'" + BCT.valueInData(datas[i], 'ctt_code') + "'";
      }
    }

    var query = " select rlt.ctt_code ,  rlt.cust_name , rlt.car_regis , rlt.ctt_date , rlt.car_brand , rlt.car_year , rlt.engine_code , rlt.body_code , rlt.mn_grand,  rlt.result_total , rlt.result_net, rlt.addr_tel , rlt.car_model, rlt.last_pay , rlt.menu_code ";
    query += " ,ct.mn_estm, ct.int_appr  , ct.part_count , ct.mn_total , ct.car_code  ";
    query += " , ccd.count_name , cst.cst_name ";
    query += " , ccd.count_name ";
    query += " from bct_rlt rlt ";
    query += " inner join tbcontract ct on ct.ctt_code=rlt.ctt_code  ";
    query += " inner join tbcount_debt ccd on ccd.count_debt = ct.count_debt  ";
    query += " inner join tbcttstatus cst on cst.cst_code = ct.cst_code  ";
    query += " where ct.cst_code!=8 and ct.ctt_code in ('" + ctt_codes + "') ";

    var datas = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', query);
    for (var i = 0; i < datas.length; i++) {
      var json = datas[i];
      var ctt_code = BCT.valueInData(datas[i], 'ctt_code');
      if (jsonContract[ctt_code] != undefined) {
        for (var fname in json) {
          if (jsonContract[ctt_code][fname] == undefined) {
            jsonContract[ctt_code][fname] = json[fname];
          }
        }
      }
    }

    var datas = [];
    for (var n in jsonContract) {
      datas.push(jsonContract[n]);
    }

    return datas[0];
  } catch (e) {
    return e;
  }
}

function getReportR_RAFCO_Multi(Keyword, nameUseID) {
  try {
    var query = " select BCT_Financing.*,BCT_Financing.contract_number as ctt_code,BCT_GrantMTC.branch ,BCT_GrantMTC.name_borrower as cust_name,BCT_GrantMTC.car_number as car_regis ";
    query += " from BCT_Financing ";
    query += " left join BCT_GrantMTC on BCT_Financing.grant_id=BCT_GrantMTC.grant_id ";
    query += " where (BCT_Financing.contract_number like '%" + Keyword + "%' or BCT_GrantMTC.name_borrower like '%" + Keyword + "%') ";
    query += " order by BCT_Financing.running asc limit 5 ";

    var DBName = "BCT_AMS2_RAFCO";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}
// ********************************* //


// ****** ค้นหาข้อมูล รายงาน O RPLC  ******* //
function getReportO_RPLC_ByID(Keyword) {
  try {
    var query = "SELECT * FROM BCT_Stock_Car_Registration_Book WHERE running=" + Keyword;
    var DBName = "BCT_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getReportO_RPLC_Multi(Keyword, nameUseID) {
  try {
    var query = "SELECT * FROM BCT_Stock_Car_Registration_Book WHERE (ctt_code like '%" + Keyword + "%' or cust_name like '%" + Keyword + "%') order by running asc limit 5";
    var DBName = "BCT_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}
// ********************************* //

// ****** ค้นหาข้อมูล รายงาน O RAFCO  ******* //
function getReportO_RAFCO_ByID(Keyword) {
  try {
    var jsonContract = {};
    var query = " select RAFCO_act.*,contract_number as ctt_code,RAFCO_act.act_branch as branch ";
    query += " from RAFCO_act ";
    query += " where running=" + Keyword;

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), 'BCT_AMS2_RAFCO', query);
    var ctt_codes = "";
    for (var i = 0; i < datas.length; i++) {
      jsonContract[BCT.valueInData(datas[i], 'ctt_code')] = datas[i];
      if (ctt_codes == "") {
        ctt_codes = BCT.valueInData(datas[i], 'ctt_code');
      } else {
        ctt_codes += ",'" + BCT.valueInData(datas[i], 'ctt_code') + "'";
      }
    }

    var query = " select rlt.ctt_code ,  rlt.cust_name , rlt.car_regis , rlt.ctt_date , rlt.car_brand , rlt.car_year , rlt.engine_code , rlt.body_code , rlt.mn_grand,  rlt.result_total , rlt.result_net, rlt.addr_tel , rlt.car_model, rlt.last_pay , rlt.menu_code ";
    query += " ,ct.mn_estm, ct.int_appr  , ct.part_count , ct.mn_total , ct.car_code  ";
    query += " , ccd.count_name , cst.cst_name ";
    query += " , ccd.count_name ";
    query += " from bct_rlt rlt ";
    query += " inner join tbcontract ct on ct.ctt_code=rlt.ctt_code  ";
    query += " inner join tbcount_debt ccd on ccd.count_debt = ct.count_debt  ";
    query += " inner join tbcttstatus cst on cst.cst_code = ct.cst_code  ";
    query += " where ct.cst_code!=8 and ct.ctt_code in ('" + ctt_codes + "') ";

    var datas = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', query);
    for (var i = 0; i < datas.length; i++) {
      var json = datas[i];
      var ctt_code = BCT.valueInData(datas[i], 'ctt_code');
      if (jsonContract[ctt_code] != undefined) {
        for (var fname in json) {
          if (jsonContract[ctt_code][fname] == undefined) {
            jsonContract[ctt_code][fname] = json[fname];
          }
        }
      }
    }

    var datas = [];
    for (var n in jsonContract) {
      datas.push(jsonContract[n]);
    }

    return datas[0];
  } catch (e) {
    return e;
  }
}

function getReportO_RAFCO_Multi(Keyword, nameUseID) {
  try {
    var query = " select RAFCO_act.*,RAFCO_act.contract_number as ctt_code,BCT_GrantMTC.branch ,BCT_GrantMTC.name_borrower as cust_name,BCT_GrantMTC.car_number as car_regis,RAFCO_act.act_branch as branch ";
    query += " from RAFCO_act ";
    query += " left join BCT_GrantMTC on RAFCO_act.grant_id=BCT_GrantMTC.grant_id ";
    query += " where (contract_number like '%" + Keyword + "%' or name_borrower like '%" + Keyword + "%') and RAFCO_act.contract_number IS NOT NULL ";
    query += " order by RAFCO_act.running asc limit 5 ";

    var DBName = "BCT_AMS2_RAFCO";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}
// ********************************* //


function getDataLaw(ctt_code_key) {
  //   ctt_code_key= "PNM200MCF0136630080";
  var ss = SpreadsheetApp.openById("1-0xEKSKi5wdRNoN7KG3onYOAGpQCJ4w25SMUeoYNc2U");
  var sheet = ss.getSheetByName("ปรับโครงสร้างหนี้");
  var data = BCT.getValuesAll(sheet, 10, 1);
  var flieds = BCT.getFields(sheet, 6, 1);
  var json = {};
  for (var i = 0; i < data.length; i++) {
    var ctt_code = data[i][BCT.numberColumnByFliedName(flieds, "ctt_code") - 1];
    if (ctt_code == ctt_code_key) {
      json = BCT.createValues_Json(flieds, [data[i]])
      Logger.log(json);
      break;
    }
  }

  return JSON.stringify(json);
}

// *** โรสทำดึงข้อมูลลูกค้าไก่เกี่ย ***//
function getDataRPLC_RCA_document(Keyword) {
  try {

    //Keyword = 'PMM200PRF0112650068'
    var query = " select bct_rlt.cust_name as cust_name"
    query += " from bct_rlt ";
    query += " left join tbcttstatus on tbcttstatus.cst_code=bct_rlt.cst_code_r ";
    query += " left join tbcontract on bct_rlt.ctt_code=tbcontract.ctt_code ";
    query += " left join tbcount_debt on tbcontract.count_debt=tbcount_debt.count_debt ";
    query += " where bct_rlt.ctt_code = '" + Keyword + "' order by bct_rlt.ctt_code asc";



    var DBName = "BCT_AMS2_RPLC";
    if (Keyword.substring(3, 4) == 2) {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC', query);

    } else {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC_CUS', query);
      return datas[0];
    }
    return datas[0];
  } catch (e) {
    return e;
  }
}


function getTelRPLC(branch) {
  //   ctt_code_key= "PNM200MCF0136630080";
  var ss = SpreadsheetApp.openById("1-TrboLGG7a-CqOBL4oBuRSP2qb1L8uWg68aKoIhybw8");
  var sheet = ss.getSheetByName("Config");
  var data = sheet.getRange("E4:F").getValues();
  var arr = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == branch) {
      arr.push(data[i][1]);
    }
  }
  return arr;

}

function getAMS2InElastixSearch(ctt_code) {
  return BCT.ams2_getContractElastixSearch(ctt_code);
}


function asset_getTypeDesc() {

  var ss = SpreadsheetApp.openById("1dMIY8aecSEuW_a9MZHldVCfk8VVoasJfMT223R9xe0A");
  var sheet = ss.getSheetByName("A3_Config");
  var data = sheet.getRange("D2:G").getValues();
  var json = {};

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] != "") {
      json[data[i][0]] = data[i];
    }
  }

  return json;

}



function asset_set_dision(Keyword, target) {

  try {
    var query = " SELECT * FROM Group_Asset where status ='Y' and division='" + Keyword + "' and Type !=''";
    var type_doc = asset_getTypeDesc();
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['target'] = target;
    jsonData['datas'] = datas;
    jsonData['type_doc'] = type_doc[Keyword];
    return jsonData;
  } catch (e) {
    return e;
  }

}


function asset_set_type(Keyword, Keyword2, target) {

  try {
    var query = " SELECT max(idAsset) as idAsset FROM Group_Asset where status ='Y' and Type='" + Keyword + "' and Group_ID='" + Keyword2 + "'";
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['target'] = target;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }

}


function asset_set_sup(Keyword) {

  try {
    var query = " SELECT * FROM BCT_Supplier where name='" + Keyword + "' order by running DESC limit 1";
    var DBName = "BCT_FAMRent";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }

}


function set_IDSurname_F2(Keyword) {

  try {
    var query = " select id from PKGemployee where concat(name_th,' ',surname_th) = '" + Keyword + "'";
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }

}


function asset_set_n_team(Keyword, target) {

  try {
    var query = " SELECT division_name AS Sub_team FROM division where company_ctt = '" + Keyword + "'";
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['target'] = target;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }

}


function asset_set_team(Keyword, target) {

  try {
    var query = " select concat(name_th,' ',surname_th) as n_Member from PKGemployee where division_name = '" + Keyword + "'";
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['target'] = target;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }

}

function zone_buy(Keyword, target) {

  var ss = SpreadsheetApp.openById("1dMIY8aecSEuW_a9MZHldVCfk8VVoasJfMT223R9xe0A")
  var sheet = ss.getSheetByName("A3_config_aam");
  var data = BCT.getValuesAll(sheet, 1, 1);
  var arrdata = [];
  for (var i = 0; i < data.length; i++) {
    var ck = data[i][0]

    if (Keyword == ck) {

      arrdata.push([data[i][1], data[i][2]]);


    }

  }


  try {
    return arrdata;
  } catch (e) {
    return e;
  }

}


function get_Cost_rplc(Keyword, nameUseID) {
  try {
    // Keyword = "ค่าธรมมเนียม-ทะเบียนรถมอไซค์";

    var query = "SELECT expenses_details FROM cost_rplc where expenses like '%" + Keyword + "%'  limit 10";
    var DBName = "BCT_AMS2_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}





function getCompany(Keyword, nameUseID) {
  try {
    var query = "SELECT company_th,tax_number,branch_address FROM branch_address WHERE branch_ctt like '" + Keyword + "'";
    var DBName = "PPP7";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}




function get_loaddata_branh_ass_RPLC(Keyword, nameUseID) {
  try {
    // Keyword = "ค่าธรมมเนียม-ทะเบียนรถมอไซค์";

    var query = "select * from Asset where property_value != 'EL01001-210010'  and BU IN ('RPLC')  and Type IN ('รถยนต์ใช้งาน (ใหม่)','รถยนต์ใช้งาน (รถยึด)','รถจักรยานยนต์ใช้งาน (ใหม่)','รถจักรยานยนต์ใช้งาน(รถยึด)') GROUP by property_value";
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function get_loaddata_branh_ass_RPLC_id(Keyword, nameUseID) {
  try {
    // Keyword = "ค่าธรมมเนียม-ทะเบียนรถมอไซค์";

    var query = "select * from Asset where property_value != 'EL01001-210010'  and BU IN ('RPLC')  and Type IN ('รถยนต์ใช้งาน (ใหม่)','รถยนต์ใช้งาน (รถยึด)','รถจักรยานยนต์ใช้งาน (ใหม่)','รถจักรยานยนต์ใช้งาน(รถยึด)') and property_value = '" + Keyword + "'";
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}


// เริ่ม rafco ซ่อมบำรุง
// เริ่ม rafco ซ่อมบำรุง
// เริ่ม rafco ซ่อมบำรุง




function get_loaddata_branh_ass_rafco(Keyword, nameUseID) {
  try {
    // Keyword = "ค่าธรมมเนียม-ทะเบียนรถมอไซค์";

    var query = "select * from Asset where property_value != 'EL01001-210010'  and BU IN ('RAFCO')  and Type IN ('รถยนต์ใช้งาน (ใหม่)','รถยนต์ใช้งาน (รถยึด)','รถจักรยานยนต์ใช้งาน (ใหม่)','รถจักรยานยนต์ใช้งาน(รถยึด)') GROUP by property_value";
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function get_loaddata_branh_ass_rafco_id(Keyword, nameUseID) {
  try {
    // Keyword = "ค่าธรมมเนียม-ทะเบียนรถมอไซค์";

    var query = "select * from Asset where property_value != 'EL01001-210010'  and BU IN ('RAFCO')  and Type IN ('รถยนต์ใช้งาน (ใหม่)','รถยนต์ใช้งาน (รถยึด)','รถจักรยานยนต์ใช้งาน (ใหม่)','รถจักรยานยนต์ใช้งาน(รถยึด)') and property_value = '" + Keyword + "'";
    var DBName = "BCT_Asset_Pkg";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}



// จบ rafco ซ่อมบำรุง
// จบ rafco ซ่อมบำรุง
// จบ rafco ซ่อมบำรุง

function testEncrypt(nameUseID) {
  try {
    var query = "select * from aaa ";
    var DBName = "BCT_AGS";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;

    return BCT.EN_AES256CBC(JSON.stringify(jsonData), "pkg", true, secret);
  } catch (e) {
    return e;
  }
}


function getParts_number(parts_number, branch) {
  try {
    var query = "SELECT *,ROUND(CAST(REPLACE(REPLACE(`Column23`, ',', ''), '.00', '') AS DECIMAL(10,2))) AS `rounded_number`, ";
    query += "ROUND(CAST(REPLACE(REPLACE(`Column23`, ',', ''), '.00', '') AS DECIMAL(10,2))) * 0.07 AS `vat`, ";
    query += "ROUND(CAST(REPLACE(REPLACE(`Column23`, ',', ''), '.00', '') AS DECIMAL(10,2))) + ROUND(CAST(REPLACE(REPLACE(`Column23`, ',', ''), '.00', '') AS DECIMAL(10,2))) * 0.07 AS `Net` ";
    query += "FROM (SELECT * FROM PartsInventoryReport ORDER BY `create_time` DESC LIMIT 0,999999) AS a WHERE Column2 = '" + branch + "' AND Column6 = '" + parts_number + "' Limit 1 ";

    // Log the query to the Logger
    Logger.log("Generated SQL Query: " + query);

    // If you're testing, you can use console.log in the Chrome console or the Apps Script Editor:
    console.log("Generated SQL Query: " + query);

    var DBName = "MIRAI";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    var jsonData = {};
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}



function getloaddebtrplc(Keyword) {
  try {

    //Keyword = 'PMM200PRF0112650068'


    //,c.mn_grand,c.mn_estm

    var query = "select f.exchange_rate,g.name_borrower,g.call_borrower,c.car_tbrand,c.car_property,c.ctt_date,c.ctt_remark,cm.cust_code,Day(c.ctt_date) as ctt_day, ";
    query += " c.int_fine1,c.mn_grand,c.mn_estm,g.installment_thb,g.amount_closed_customer_thb,g.tenor,g.amount_closed_customer_per,Day(f.deadlines_first_payment) as part_eday";
    query += " from BCT_Financing f ";
    query += " left join BCT_GrantMTC g on f.grant_id=g.grant_id ";
    query += " left join AMS_contract c on f.contract_number=c.ctt_code ";
    query += " left join AMS_customer cm on c.cust_code=cm.cust_code ";

    query += " where f.contract_number = '" + Keyword + "'";

    var DBName = "BCT_AMS2_RPLC";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}


function getNewVC(pp) {
  var prefix = pp + "" + Utilities.formatDate(new Date, "GMT+7", "yyyyMM");
  //  var sql = "SLECT MAX(VC) FROM RAFCO_page3 WHERE VC LIKE '"+prefix+"%'";
  //  var data = BCT.loadJSONDatas("RDS", "BCT_AMS2_RAFCO", sql);
  var strLenSearch = 10;
  var query = "SELECT ifnull(max(SUBSTRING(`VC`," + strLenSearch + "))+1,1) AS vc_n from RAFCO_page3 WHERE VC like '" + prefix + "%' and VC not like '%undefined%'";
  var data = BCT.loadJSONDatas("RDS", "BCT_AMS2_RAFCO", query);

  var vc_n = data[0]["vc_n"];
  var runNumber = "";
  if (vc_n < 10) {
    runNumber = "000" + vc_n;
  } else if (vc_n < 100) {
    runNumber = "00" + vc_n;
  } else if (vc_n < 1000) {
    runNumber = "0" + vc_n;
  } else {
    runNumber = "" + vc_n;
  }
  var VC = prefix + "" + runNumber;
  Logger.log("VC==" + VC);
  return VC;
}
function getreceipt_number(pp) {


  var prefix = pp + "-" + "DE" + Utilities.formatDate(new Date, "GMT+7", "yyyyMM");
  //  var sql = "SLECT MAX(VC) FROM RAFCO_page3 WHERE VC LIKE '"+prefix+"%'";
  //  var data = BCT.loadJSONDatas("RDS", "BCT_AMS2_RAFCO", sql);
  var strLenSearch = 12;
  var query = "SELECT ifnull(max(SUBSTRING(`receipt_number`," + strLenSearch + "))+1,1) AS vc_n from hand_bill WHERE receipt_number like '" + prefix + "%' and receipt_number not like '%undefined%'";
  var data = BCT.loadJSONDatas("RDS", "BCT_RAFCO", query);

  var vc_n = data[0]["vc_n"];
  var runNumber = "";
  if (vc_n < 10) {
    runNumber = "000" + vc_n;
  } else if (vc_n < 100) {
    runNumber = "00" + vc_n;
  } else if (vc_n < 1000) {
    runNumber = "0" + vc_n;
  } else {
    runNumber = "" + vc_n;
  }
  var VC = prefix + "" + runNumber;
  Logger.log("VC==>> " + VC);
  return VC;
}
function battestnumvc() {
  var bat1 = 'PNP';
  var newVC = getreceipt_number(bat1);
  Logger.log("newVC >> " + newVC)

}
function getloadreceipt_number(Keyword) {
  try {
    var query = "select member_id,receiving_money_user as member_id_name,receiving_money_timestamp as receiving_money_timestamp,amount_usd,amount_khr,type_of_transaction_th as note_th,customer_list as cust_name,carID as contract_number,branch,receipt_number from hand_bill "
    query += " where running ='" + Keyword + "'";

    var datas = BCT.loadJSONDatas('RDS', 'BCT_RAFCO', query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getcontractrafocap(Keyword) {
  //  Keyword = 'RCFP00FI2MO0122600011'
  if (Keyword.substring(0, 3) != 'RCF') {
  var query = "select tbprefix.px_name+''+tbcustomer.cust_fname+' '+tbcustomer.cust_lname as name_customer from tbcontract "
      query += " LEFT JOIN tbcustomer on tbcustomer.cust_code = tbcontract.cust_code "
      query += " LEFT JOIN tbprefix on tbprefix.px_code = tbcustomer.px_code "
      query += " where tbcontract.ctt_code='" + Keyword + "'";

      var datas = BCT.loadJSONDatas('AMS2', 'RAFCO_CAP', query);

  } else {

    var query = "select concat(tbprefix.px_name,' ',tbcustomer_bor.firstname_eng,' ',tbcustomer_bor.lastname_eng) as name_customer from tbcontract ";
    query += " LEFT JOIN tbcontract_customer tbcontract_customerbor on tbcontract.ctt_code=tbcontract_customerbor.ctt_code ";
    query += "LEFT JOIN tbcustomer tbcustomer_bor on tbcontract_customerbor.cust_code = tbcustomer_bor.cust_code ";
    query += "LEFT JOIN tbprefix on tbprefix.px_code = tbcustomer_bor.px_code ";
    query += "WHERE tbcontract.ctt_code = '" + Keyword + "'";

    var datas = BCT.loadJSONDatas('RDS', 'ams4_RAFCO', query);

      return datas[0];
    }
   
}




function getRafco_trace_customer2(ctt_code) {
  //  ctt_code = "PNM200JCF0118620259";
  try {

    var sql = "SELECT m.cust_fname+' '+m.cust_lname AS cust_name,c2.cust_fname+' '+c2.cust_lname AS cust_name2,ar.addr_num,ar.addr_moo,ar.addr_soi,ar.addr_road,ar.zip_code";
    sql += ",t.tum_tname,p.pv_tname,a.amp_tname,ca.car_reg";
    sql += " FROM tbcontract c LEFT JOIN tbcustomer m ON c.cust_code = m.cust_code";
    sql += " LEFT JOIN tbcustaddr ar ON c.cust_code = ar.cust_code";
    sql += " LEFT JOIN tbtumbol t ON ar.tum_code = t.tum_code";
    sql += " LEFT JOIN tbprovince p ON ar.pv_code = p.pv_code";
    sql += " LEFT JOIN tbamphor a ON ar.amp_code = a.amp_code";
    sql += " LEFT JOIN tbcar ca ON c.car_code = ca.car_code";
    sql += " LEFT JOIN tbgroupref g ON c.gref_code = g.gref_code";
    sql += " LEFT JOIN tbcustomer c2 ON g.cust_code = c2.cust_code";
    sql += " where c.ctt_code = '" + ctt_code + "'";
    console.log("sql", sql)
    var datas = BCT.loadJSONDatas("AMS2", "RAFCO_CAP", sql);
    return datas[0];

  } catch (e) {
    return e;
  }
}

function getVCdocument3(Keyword) {

  try {
    var query = "select VC,running,titile,titile_th,rep_name as member_id_name,branch,amount,price_unit,rep_id,MR_ID,Cur,running from RAFCO_page3 "
    query += " where VC='" + Keyword + "'";

    var datas = BCT.loadJSONDatas('RDS', 'BCT_AMS2_RAFCO', query);
    return datas[0];
  } catch (e) {
    return e;
  }
}
function getmoorafco(Keyword) {

  try {
    var query = "select name_th as village from RAFCO_home "
    query += " where name_th like  '%" + Keyword + "%' limit 5 ";

    var datas = BCT.loadJSONDatas('RDS', 'BCT_AMS2_RAFCO', query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getnumber_rafco(id) {
  //   ctt_code_key= "PNM200MCF0136630080";
  var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
  var sheet = ss.getSheetByName("A2_config บัญชีจ่าย");
  var data = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, "process"), 1);
  var json = {};
  var flieds = BCT.getField(sheet, BCT.form_getRowFieldPutByKey(sheet, "process"), 1);
  for (var i = 0; i < data.length; i++) {
    var name_book = data[i][BCT.numberColumnByFliedName(flieds, "name_book") - 1];
    if (name_book == id) {

      json["Account_receive1"] = data[i][BCT.numberColumnByFliedName(flieds, "num_book") - 1];
      return json;
    }
  }

  return "N";
}

function getCustomersCollectMoneyHome(Keyword, nameUseID) {
  try {
    var query = "SELECT BCT_Customers_Collect_Money_Home.*,CONCAT(ctt_code,' ',cust_name,' ',addr_tel) as name FROM BCT_Customers_Collect_Money_Home WHERE branch_accept_email!='' and (brach like '%" + Keyword + "%' or ctt_code like '%" + Keyword + "%' or cust_name like '%" + Keyword + "%' or addr_tel like '%" + Keyword + "%') and branch_amount=0 and job_status_money_home not like 'เข้าระบบ%' and job_status_money_home!='คืนรถ' and price_usd=0 and price_khr=0 order by running desc limit 5";
    var DBName = "BCT_AMS2_RAFCO";
    //    return query;
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getRPLC_loadDataC(Keyword, nameUseID) {
  try {
    // var Keyword = "PSM200" ;
    // var query = "SELECT c.ctt_code,cu.cust_name FROM AMS_contract c left join AMS_customer cu on c.cust_code = cu.cust_code";
    // query +=" WHERE ctt_code!=''and ctt_code like'%"+Keyword+"%' group by ctt_code limit 10"
    var query = "SELECT ctt_code,cust_name from bct_rlt";
    query += " WHERE ctt_code!='' and cst_code_r not in (3,8,12) and ctt_code like'%" + Keyword + "%' group by ctt_code ";
    // var DBName = "BCT_AMS2_RPLC"; 
    if (Keyword.substring(3, 4) == 2) {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC', query);

    } else {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC_CUS', query);

    }
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getRPLC_loadDataC_ByID(Keyword, nameUseID) {
  try {
    var query = "SELECT ctt_code,cust_name from bct_rlt";
    query += " WHERE ctt_code!='' and cst_code_r not in (3,8,12) and ctt_code like'%" + Keyword + "%' group by ctt_code ";
    // var DBName = "BCT_AMS2_RPLC"; 
    if (Keyword.substring(3, 4) == 2) {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC', query);

    } else {
      var datas = BCT.loadJSONDatas('AMS2', 'RPLC_CUS', query);

    }
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  } catch (e) {
    return e;
  }
}

function getExchangeRate(nameUseID, functionMore, type_of_transaction_th) {
  var JsonData = {};
  JsonData['nameUseID'] = nameUseID;
  JsonData['functionMore'] = functionMore;
  JsonData['type_of_transaction_th'] = type_of_transaction_th;
  var today = new Date();
  var exchange_rate = 0;
  var datas = BCT.loadJSONDatas(BCT.getDBServer(), 'BCT_AMS2_RAFCO', "select * from RAFCO_exchange_rate where date_exchange_rate='" + Utilities.formatDate(today, 'GMT+7', 'yyyy-MM-dd') + "'");
  if (datas.length > 0) {
    var exchange_rate = BCT.valueInData(datas[0], 'collect_money_usd_khr');
    if (type_of_transaction_th == 'ค่าโอนเล่มทะเบียน') {
      exchange_rate = 4100;
    }
  }
  JsonData['exchange_rate'] = exchange_rate;
  return JsonData;
}


// function getDistrictByID(Keyword){
//   try{
//   //  Keyword = 'Battambang';
//     var query = " select ampr_en as ampr ";
//     query += " from Addres_RAFCO_MayPoom ";
//     query += " where prov_en = '"+Keyword+"' GROUP BY ampr_en"; 
//     var DBName = "BCT_AMS2_RAFCO ";    
//     var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
//     return datas[0];
//   }catch(e){
//     return e;
//   }
// }


function getDistrict_Multi(Keyword, nameUseID) {
  try {

    // Keyword = 'Battambang';
    var DBName = "BCT_AMS2_RAFCO";
    var query = " select ampr_en as ampr ";
    query += " from Addres_RAFCO_MayPoom ";
    query += " where prov_en = '" + Keyword + "' ";
    query += " GROUP BY ampr_en";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    // var query = "  select ampr_en as ampr from Addres_RAFCO_MayPoom ";
    // var datasAll = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    // Logger.log("1>>>>>> "+datasAll)
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    // jsonData['datasAll'] = datasAll;
    console.log(query)
    return jsonData;
  } catch (e) {
    return e;
  }
}



function getloadCarName_Multi(Keyword, nameUseID) {
  try {

    // Keyword = "HONDA";
    var query = " SELECT * FROM MTC_carModel ";
    query += " INNER JOIN CAR_carBrand ON MTC_carModel.carBrandID=CAR_carBrand.carBrandID ";
    query += " WHERE CAR_carBrand.carBrandName='" + Keyword + "' ";
    query += " AND MTC_carModel.dataDelete!='N' ";
    query += " group by carModel ";
    query += " UNION ALL";
    query += " SELECT * FROM CAR_carModel ";
    query += " INNER JOIN CAR_carBrand ON CAR_carModel.carBrandID=CAR_carBrand.carBrandID ";
    query += " WHERE CAR_carBrand.carBrandName='" + Keyword + "' ";
    query += " AND CAR_carModel.dataDelete!='N' ";
    query += " group by carModel ";


    var DBName = "BCT_AMS2_RAFCO";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    // jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    // jsonData['datasAll'] = datasAll;
    console.log(query)
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getloadtypeLand_Multi(Keyword) {
  try {
    var Keyword = "LAND";
    if (Keyword == "LAND") {
      var query = " SELECT name_th  FROM RAFCO_car_styles ";
      query += " WHERE products = '" + Keyword + "' ";

    } else {


    }
    var DBName = "BCT_AMS2_RAFCO";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    // jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    // jsonData['datasAll'] = datasAll;
    console.log(query)
    return jsonData;
  } catch (e) {
    return e;
  }
}

function getloadtypecar_Multi(Keyword) {
  try {
    if (Keyword != "แบบอ่อน" || Keyword != "แบบแข็ง") {

      var query = " SELECT carYear FROM MTC_carModel ";
      query += " WHERE carModel='" + Keyword + "' ";
      query += " group by carYear ";
      query += " UNION ALL";

      query += " SELECT carYear FROM CAR_carModel ";
      query += " WHERE carModel='" + Keyword + "' ";
      query += " group by carYear ";


    } else {

    }

    var DBName = "BCT_AMS2_RAFCO";
    var datasc = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datasc;
    // jsonData['datasAll'] = datasAll;
    console.log(query)
    return jsonData;
  } catch (e) {
    return e;
  }
}

function saveMemo(call_status, ctt_code, memo_description, memo_due_customer, memo_proof_of_payment, memo_location_get_money) {
  var jsonObject = {}
  jsonObject["DBsever"] = BCT.getDBServer();
  jsonObject["DBName"] = "BCT_AMS2_RAFCO";
  jsonObject["update_user"] = Session.getActiveUser().getEmail();
  jsonObject["create_user"] = Session.getActiveUser().getEmail();
  jsonObject["memo_ctt_code"] = ctt_code;
  jsonObject["memo_branch"] = BCT.getReportT_RAFCO_NameBrand(ctt_code);
  jsonObject["memo_contact_person"] = "สาขา";
  jsonObject["memo_description"] = memo_description;
  jsonObject["memo_due_customer"] = BCT.convertTypeData('DATE', memo_due_customer);
  jsonObject["memo_call_status"] = call_status;
  jsonObject["memo_proof_of_payment"] = memo_proof_of_payment;
  jsonObject["memo_location_get_money"] = memo_location_get_money;
  return BCT.saveMemo(jsonObject);
}


function getbranchByID(Keyword) {
  try {

    var DBName = "BCT_AMS2_RPLC";
    var query = "select name_th as district from LAO_branch where branch like'%" + Keyword + "%' ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}

function getCity_Multi(Keyword, nameUseID, District) {
  try {
    var DBName = "BCT_AMS2_RPLC";
    var query = " select LAO_city.* ";
    query += " from LAO_city ";
    query += " inner join LAO_district on LAO_city.district_name_code=LAO_district.name_code ";
    query += " where LAO_city.name_th like '%" + Keyword + "%' ";
    query += " and LAO_district.name_th like '" + District + "' ";
    query += " order by LAO_city.name_th asc limit 5 ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);


    var query = " select LAO_city.running,LAO_city.name_th,LAO_district.name_th as district ";
    query += " from LAO_city ";
    query += " inner join LAO_district on LAO_city.district_name_code=LAO_district.name_code ";
    var datasAll = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getHome_Multi(Keyword, nameUseID, District, city) {
  try {
    var DBName = "BCT_AMS2_RPLC";
    var query = " select home.* ";
    query += " FROM LAO_home as home ";
    query += " INNER JOIN LAO_district as district ON district.name_code = home.district_name_code ";
    query += " INNER JOIN LAO_city as city on home.city_name_code=city.name_code ";
    query += " where home.name_th like '%" + Keyword + "%' ";
    query += " and district.name_th like '" + District + "' ";
    query += " and city.name_th like '" + city + "' ";
    query += " order by home.name_th asc limit 5 ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    var query = " select home.running,home.name_th,district.name_th as district,city.name_th as city";
    query += " FROM LAO_home as home ";
    query += " INNER JOIN LAO_district as district ON district.name_code = home.district_name_code ";
    query += " INNER JOIN LAO_city as city on home.city_name_code=city.name_code ";
    var datasAll = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);

    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}

function gatMR_Namehouse(Keyword) {
  try {

    var DBName = "BCT_AMS2_RPLC";

    var query = "select m.ID_MR ,CONCAT(m.fname,' ',m.lname) as name,t.name_group from BCT_MR_MOTOR m left join whatapp_token_MOTOR t on m.Phone_M=t.cus_phone where m.Phone_M like'%" + Keyword + "%' ";
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}


function getrunning_gold_Multi(Keyword) {
  try {

    var DBName = "BCT_RPLC";
    var query = " select ctt_date,ctt_code,cust_name,car_regis,car_code,car_brand,car_model,engine_code,body_code,car_year,car_color,mn_estm,int_appr,mn_grand,part_count";
    query += " from BCT_Stock_Car_Registration_Book where running = '" + Keyword + "'";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    //jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}




function getcarregisno_rafco(Keyword) {
  try {

    var DBName = "BCT_RAFCO_AMS1";
    var query = " select carCode as carregisno from BCT_CAR_STOCK where carCode!='' ";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    //jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getData_carregisno_rafco(Keyword) {
  try {
    var DBName = "BCT_RAFCO_AMS1";
    var query = " select carID as carcodefrombct,usd_sale as carprice,model_name as carmodel,serieCode as caryear,colorCode as carcolor from BCT_CAR_STOCK where carCode like'%" + Keyword + "%' ";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    return datas[0];
  } catch (e) {
    return e;
  }
}










function getAutocompleteData(keyword, nameUseID) {
  // var keyword = "ทวี"
  // ทำการประมวลผลข้อมูล autocomplete จาก keyword ที่รับเข้ามา
  // var query = "SELECT CONCAT(thprefix,name_th,' ',surname_th) as name FROM PKGemployee WHERE status NOT IN ('N') and (id like '%" + keyword + "%' or name_th like '%" + keyword + "%' or surname_th like '%" + keyword + "%' or nickname like '%" + keyword + "%' or name_en like '%" + keyword + "%' or surname_en like '%" + keyword + "%' or telNumber like '%" + keyword + "%') order by id asc limit 10";
  var query = "SELECT CONCAT(name_th,' ',surname_th) as name FROM PKGemployee WHERE status NOT IN ('N')";
  var DBName = "PPP7";
  var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
  var autocompleteData = datas.map(function (item) {
    return item.name;
  });
  Logger.log(autocompleteData)
  // return autocompleteData;

  // var autocompleteData = ["Apple", "Banana", "Orange", "Pineapple"]; // เป็นตัวอย่างเท่านั้น
  var jsonData = {};
  jsonData['nameUse-ID'] = nameUseID;
  jsonData['datas'] = autocompleteData;
  Logger.log(jsonData)
  return jsonData;
}


//ทดสอบแบงแบง

//////////// addres  ////////////

function getprovince_Multi(Keyword) {
  try {

    var DBName = "ams4";
    var query = " select province as province from tbaddress_aam where province != '' GROUP BY province";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    //jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function getamphur_Multi(Keyword) {
  try {

    var DBName = "ams4";
    var query = " select amp as amphur from tbaddress_aam where province like '" + Keyword + "' GROUP BY amp";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    //jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}


function gettumbol_Multi(Keyword) {
  try {

    var DBName = "ams4";
    var query = " select tumbol as tumbol from tbaddress_aam where amp like '" + Keyword + "' GROUP BY tumbol";

    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    //jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    //jsonData['datasAll'] = datasAll;
    return jsonData;
  } catch (e) {
    return e;
  }
}





