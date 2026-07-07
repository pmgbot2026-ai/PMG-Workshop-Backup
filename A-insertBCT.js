/* 
ฟังก์ชัน สำหรับ วางลง BCT 
*/
function insertBCT(formResponse, formData, formIndex) {
  Logger.log("insertBCT");
  for (var spreadsheet_id in formResponse) {
    var form_dlt_type = formResponse[spreadsheet_id]['form_dlt_type'];
    var form_dlt_topic_id = formResponse[spreadsheet_id]['form_dlt_topic_id'];
    var form_dlt_data = formResponse[spreadsheet_id]['form_dlt_data'];
    if (form_dlt_type != "" && form_dlt_topic_id != "" && form_dlt_data != "") {
      if (form_dlt_type == "HCS") {
        formData['dlt_token'] = BCT.getFormatDate(new Date(), 'yyyyMMddHHmmss') + BCT.randomStr(26);
      }
    }

    var nameDataSpreadsheet = spreadsheet_id;
    if (spreadsheet_id == "reportR") {
      var branch = BCT.getReportT_NameBrand(formData['ctt_code']);
      if (BCT.tester_popup()) {
        branch = 'TES';
      }
      spreadsheet_id = BCT.loadUrlCenter('BCT_Report_R', 'cpy_code', branch, 'url_key');
      formResponse[spreadsheet_id] = formResponse[nameDataSpreadsheet];
      formResponse[spreadsheet_id]['URLData'] = nameDataSpreadsheet;
    } else if (spreadsheet_id == "reportR_RPLC") {
      var branch = formData['branch'];
      //      if(branch==undefined){
      //      branch = BCT.getReportT_RPLC_NameBrand(formData['ctt_code']);
      //      }
      //      if(BCT.tester_popup()){
      //        branch = 'TES';
      //      }
      spreadsheet_id = BCT.loadUrlCenter('BCT_Report_R_RPLC', 'cpy_code', branch, 'url_key');
      Logger.log('reportR_RPLC spreadsheet_id : ' + spreadsheet_id)
      formResponse[spreadsheet_id] = formResponse[nameDataSpreadsheet];
      formResponse[spreadsheet_id]['URLData'] = nameDataSpreadsheet;
      Logger.log('reportR_RPLC nameDataSpreadsheet : ' + nameDataSpreadsheet)

      var ss = SpreadsheetApp.openById(spreadsheet_id);
      var sheetName = formResponse[spreadsheet_id]['form_spreadsheet_sheet'];
      var sheet = ss.getSheetByName(sheetName);
      //      if(sheet==undefined){
      //        sheet = SpreadsheetApp.openById('1tNdiKAO6gAnqI-7hD6jbnmB3bVyyEIqiYdENZNfr79A').getSheetByName('B1_Forms_ตอบรับ').copyTo(ss).setName(sheetName);
      //        var rowFields = BCT.form_getRowFieldsByKey(sheet, 'process');
      //        var fields = BCT.getFields(sheet, rowFields, 1, 0); 
      //        BCT.loadFieldsByDatas_Json(sheet, 'C'+rowFields, formData);
      //        BCT.loadFieldsByDatas_Json(sheet, 'C'+(rowFields+2), formData);
      //      }

      var rowStartValue = BCT.form_getRowStartValueByKey(sheet, 'process');
      var rowFields = BCT.form_getRowFieldsByKey(sheet, 'process');

      var fields = BCT.getFields(sheet, rowFields, 1, 0);
      var optionField = { createTime: 'date', timestamp: 'date' }

      var datas = BCT.loadJSONDatas(BCT.getDBServer(), config['reportR_RPLC']['DBName'], config['reportR_RPLC']['query'] + " WHERE ctt_code='" + formData['ctt_code'] + "'");
      var Primary_Key_Name = 'running';
      var Primary_Key = BCT.valueInData(datas[0], Primary_Key_Name);
      formData[Primary_Key_Name] = Primary_Key;
      var valueAll = BCT.getValuesAll(sheet, rowStartValue, 1);
      var updateRow = -1;
      for (var r = 0; r < valueAll.length; r++) {
        if (valueAll[r][BCT.numberPositionValueByFliedName(fields, Primary_Key_Name)] == Primary_Key) {
          updateRow = r + rowStartValue;
          break;
        }
      }

      if (updateRow > 0) {
        BCT.autoInsert_JsonFixField(sheet, fields, [formData], updateRow, 1);
      } else {
        BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
      }
    } else if (spreadsheet_id == "reportO_RAFCO_saveUploadAudit") {
      var branch = formData['branch'];
      //      Logger.log(formData);
      var key_reportO = "";
      var ssCenter = SpreadsheetApp.openById("1zEHzFHIIKYxsVMdzrbDJUNhfw2IYU9mG7rvawrZ1Lrk");
      var shCenter = ssCenter.getSheetByName("B1_สร้างไฟล์");
      var fieldCenter = BCT.getField(shCenter, BCT.form_getRowFieldsByKey(shCenter, 'process'), 1, 0);
      var valueCenterAll = BCT.getValuesAll(shCenter, BCT.form_getRowStartValueByKey(shCenter, 'process'), 1);
      for (var vc = 0; vc < valueCenterAll.length; vc++) {
        if (valueCenterAll[vc][BCT.numberPositionValueByFliedName(fieldCenter, 'cpy_code')] == branch) {
          key_reportO = valueCenterAll[vc][BCT.numberPositionValueByFliedName(fieldCenter, 'url_key')];
        }
      }
      //      key_reportO = "15yyEGVWFFofttX67ijvus5ODsvk1ti0uN6oMNJ16OK0";
      //      var key_reportR = BCT.loadUrlCenter('BCT_Report_R_RAFCO', 'cpy_code', branch, 'url_key');
      //      if(BCT.tester_popup()){
      //        key_reportR = '1D2VPtsLbW24HQd8R-Bnu-K2zUXdpHPYyFTYwnTKF_bU';
      //      }
      var ssDes = SpreadsheetApp.openById(key_reportO);
      var shDes = ssDes.getSheetByName("B4_Audit_นิติกรรม");
      var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
      var fields = BCT.getFields(shDes, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
          var audit_send_proof_photo = formData['receive_audit_send_proof_photo'];
          var audit_send_proof_detail = formData['receive_audit_send_proof_detail'];
          var audit_send_proof_date = new Date();
          var audit_send_proof_user = Session.getEffectiveUser().getEmail();
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_photo')).setValue(audit_send_proof_photo);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_detail')).setValue(audit_send_proof_detail);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_date')).setValue(audit_send_proof_date);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_user')).setValue(audit_send_proof_user);
          break;
        }
      }

      /*
      BCT Audit AAMgr RPLCgr RAFCOgr นิติกรรม
      ลิงค์ BCT https://docs.google.com/spreadsheets/d/1ar0svSfjHxMsTkcmEGZKJbJLWbUj1WPx5Gi-dmI5QO4/edit#gid=1115484104
      */
      var key_reportO = '1ar0svSfjHxMsTkcmEGZKJbJLWbUj1WPx5Gi-dmI5QO4';
      var ssDes = SpreadsheetApp.openById(key_reportO);
      var shDes = ssDes.getSheetByName("B4_Audit_นิติกรรม_RAFCO");
      if (shDes != null && shDes != undefined) {
        var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
        var fields = BCT.getFields(shDes, rowFields, 1, 0);
        var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
        for (var v = 0; v < valuesAll.length; v++) {
          var rowUpdate = v + rowStartvalue;
          var values = [valuesAll[v]];
          if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
            var audit_send_proof_photo = formData['receive_audit_send_proof_photo'];
            var audit_send_proof_detail = formData['receive_audit_send_proof_detail'];
            var audit_send_proof_date = new Date();
            var audit_send_proof_user = Session.getEffectiveUser().getEmail();
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_photo')).setValue(audit_send_proof_photo);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_detail')).setValue(audit_send_proof_detail);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_date')).setValue(audit_send_proof_date);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_user')).setValue(audit_send_proof_user);
            break;
          }
        }
      }

      var queryHistory = " UPDATE RAFCO_act SET ";
      queryHistory += " receive_audit_send_proof_photo='" + audit_send_proof_photo + "' ";
      queryHistory += " ,receive_audit_send_proof_detail='" + audit_send_proof_detail + "' ";
      queryHistory += " ,receive_audit_send_proof_date='" + BCT.getFormatDate(audit_send_proof_date, 'yyyy-MM-dd HH:mm:ss') + "' ";
      queryHistory += " ,receive_audit_send_proof_user='" + audit_send_proof_user + "' ";
      queryHistory += " WHERE contract_number='" + formData['ctt_code'] + "' ";
      BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_AMS2_RAFCO', queryHistory);

    } else if (spreadsheet_id == "getData_rafco_reg") {

      var branch = formData['branch'];
      var querySearchLink = "select url_key from RAFCO_BCT_Stock where cpy_code='" + branch + "'";
      var ssIdtarget = BCT.loadJSONDatas("RDS", "BCT_AAM_URL", querySearchLink)[0]["url_key"];

      var ss = SpreadsheetApp.openById(ssIdtarget);
      var sheet = ss.getSheetByName("B1_Stock");
      var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
      var fields = BCT.getFields(sheet, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(sheet, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'carCode') == formData['car_reg']) {
          var image_ling = formData['pic_motor'];
          sheet.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'image_ling')).setValue(image_ling);
          break;
        }

      }
    } else if (spreadsheet_id == "getrafco_link_contract") {

      var branch = formData['branch'];
      var querySearchLink = "select url_key from RAFCO_BCT_Stock where cpy_code='" + branch + "'";
      var ssIdtarget = BCT.loadJSONDatas("RDS", "BCT_AAM_URL", querySearchLink)[0]["url_key"];

      var ss = SpreadsheetApp.openById(ssIdtarget);
      var sheet = ss.getSheetByName("B1_Stock");
      var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
      var fields = BCT.getFields(sheet, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(sheet, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'carID') == formData['carID']) {
          var link_contract = formData['link_contract'];
          sheet.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'link_contract')).setValue(link_contract);
          break;
        }

      }
    } else if (spreadsheet_id == "getData_rafcosellpic") {
      var branch = formData['branch'];
      var querySearchLink = "select url_key from RAFCO_BCT_Stock where cpy_code='" + branch + "'";
      var ssIdtarget = BCT.loadJSONDatas("RDS", "BCT_AAM_URL", querySearchLink)[0]["url_key"];
      var ss = SpreadsheetApp.openById(ssIdtarget);
      var sheet = ss.getSheetByName("B1_Stock");
      var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
      var fields = BCT.getFields(sheet, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(sheet, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (formData['car_reg'] == BCT.valueByFliedName(fields, values, 'carCode')) {
          var carImageBanner_link = formData['pic_motor2'].split(",");
          for (var a = 0; a < carImageBanner_link.length; a++) {
            var cariamgesbanner = carImageBanner_link[0];
          }
          var pic_motor2 = cariamgesbanner;
          var check_status1 = formData['check_status1'];
          var queryHistory = " UPDATE BCT_CAR_STOCK SET ";
          queryHistory += " link_carCustomer ='" + pic_motor2 + "',check_status1 = '" + check_status1 + "' ";
          queryHistory += " WHERE carCode='" + formData['car_reg'] + "' ";
          var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_RAFCO_AMS1', queryHistory);
          sheet.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'link_carCustomer')).setValue(pic_motor2);
          break;
        }

      }
    } else if (spreadsheet_id == "getfix_rplc") {
      if (formData['ctt_code'] != '') {
        BCT.autoInsertToSpreadsheetByFirebase("1mhQhO8tYCKgPl1QgHZlCiOZU4lp5TKMF83QzoEDrXDk", "B1_ค่าใช้จ่าย", formData, optionField);
        BCT.autoInsertToSpreadsheetByFirebase("1dCNxSV2SHe9VhSaZeq79WOMwZcAIbum8HzrZp7Eii6M", "B1_ค่าใช้จ่าย", formData, optionField);
      } else {
        BCT.autoInsertToSpreadsheetByFirebase("1dCNxSV2SHe9VhSaZeq79WOMwZcAIbum8HzrZp7Eii6M", "B1_ค่าใช้จ่าย", formData, optionField);
      }

    } else if (spreadsheet_id == "1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8") { //// เนมทำ SD_rafco งานประเมินราคา


      var tpye_data_ssrafco = formData['tpye_data_ssrafco'];
      var branch = formData['branch'];
      var type_guarantee = formData['type_guarantee'];
      var make = formData['make'];
      var generation = formData['generation'];
      var card_registration = formData['card_registration'];
      var check_card_gree = formData['check_card_gree'];
      var inspection_vehicle = formData['Inspection_vehicle'];
      var img_car = formData['img_car'];
      var id_m = formData['id_m'];
      var member_name = formData['member_name'];
      var year = formData['year'];
      var machine_number = formData['machine_number'];
      var chassis_number = formData['chassis_number'];
      var registration = formData['registration'];
      var date_registration = formData['date_registration'];
      var mileage = formData['mileage'];
      var grant_id = formData['grant_id'];
      var date_appraisal = formData['date_appraisal'];
      var selling_price = formData['selling_price'];

      var money_per = formData['money_per'];
      var money_don = formData['money_don'];
      var money_all = formData['money_all'];

      var c1 = BCT.shortenURL(card_registration)
      var c3 = BCT.shortenURL(inspection_vehicle)
      var c4 = BCT.shortenURL(img_car)
      if (tpye_data_ssrafco == 'การขอราคาประเมิน MFI MOTO/MOTO 3 ล้อ') {
        // if (tpye_data_ssrafco == 'การขอราคาประเมิน MFI MOTO/MOTO 3 ล้อ' || (tpye_data_ssrafco == 'การขอราคาประเมิน วงเงินพร้อมใช้' && (type_guarantee =='MOTO'||type_guarantee =='MOTO 3 ล้อ')) || (tpye_data_ssrafco == 'การขอราคาประเมิน วงเงินพาซื้อ' && (type_guarantee =='MOTO'||type_guarantee =='MOTO 3 ล้อ'))) {
        var message = "";
        message += "🏆แจ้งเตือนการขอราคาประเมิน MFI MOTO/MOTO 3 ล้อ " +

          "\n" + "🌻 สาขา: " + branch + "\n" +

          "\n" + "🚗 ประเภทหลักประกัน: " + type_guarantee +
          "\n" + " ยี่ห้อรถ: " + make +
          "\n" + "รุ่นรถ: " + generation +
          "\n" + "ปี: " + year + "\n" +

          "\n" + "📑 รูปการ์ดกี (เล่มทะเบียน) " + c1 + "\n" +

          "\n" + "🚕 รูปใบตรวจสภาพรถ (กรณีเมื่อเลือก ประเภทการขอราคาประเมินFL ) " + c3 + "\n" +
          "\n" + "🚙 รูปรถ " + c4 + "\n" +

          "\n" + "🐧ส่งโดย : " + member_name +
          "\n" + "🍀วันที่ส่งเรื่อง: " + date_appraisal;
        var subject = "";
        BCT.Telegramsend_pkg_fix('-1001717930015', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8', "B1_ประเมินราคา MFI", formData, optionField);
      }
      if (tpye_data_ssrafco == 'การขอราคาประเมินร้านดีเลอร์') {
        var message = "";
        message += "🏆แจ้งเตือนการขอราคาประเมินร้านดีเลอร์ " +

          "\n" + "🌻 สาขา: " + branch + "\n" +

          "\n" + "🚗 ประเภทหลักประกัน: " + type_guarantee +
          "\n" + " ยี่ห้อรถ: " + make +
          "\n" + "รุ่นรถ: " + generation +
          "\n" + "ปี: " + year + "\n" +
          "\n" + "💵 ราคาตั้งขาย: " + selling_price +
          "\n" + "💵 เงินดาวน์ (%): " + money_per +
          "\n" + "💵 เงินดาวน์ ($): " + money_don + "\n" +
          "\n" + "💵 ยอดจัดผ่อน: " + money_all + "\n" +

          "\n" + "📑 รูปการ์ดกี (เล่มทะเบียน) " + c1 + "\n" +
          // "\n"+"📑 รูปสแกนการ์ดกี "+c2+"\n"+
          "\n" + "🚕 รูปใบตรวจสภาพรถ (กรณีเมื่อเลือก ประเภทการขอราคาประเมินFL ) " + c3 + "\n" +
          "\n" + "🚙 รูปรถ " + c4 + "\n" +

          "\n" + "🐧ส่งโดย : " + member_name +
          "\n" + "🍀วันที่ส่งเรื่อง: " + date_appraisal;

        var subject = "";
        BCT.Telegramsend_pkg_fix('-735206805', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8', "B2_ประเมินรถมือสองดีลเลอร์", formData, optionField);
      }

      if (tpye_data_ssrafco == 'การขอราคาประเมิน จำจอด') {
        var message = "";
        message += "🏆แจ้งการขอราคาประเมิน จำจอด " +

          "\n" + "🌻 สาขา: " + branch + "\n" +

          "\n" + "🚗 ประเภทหลักประกัน: " + type_guarantee +
          "\n" + " .ยี่ห้อรถ: " + make +
          "\n" + ".รุ่นรถ: " + generation +
          "\n" + "ปี: " + year + "\n" +

          "\n" + "📑 .รูปการ์ดกี (เล่มทะเบียน) " + c1 + "\n" +
          // "\n"+"📑 .รูปสแกนการ์ดกี "+c2+"\n"+
          "\n" + "🚕 .รูปใบตรวจสภาพรถ (กรณีเมื่อเลือก ประเภทการขอราคาประเมินFL ) " + c3 + "\n" +
          "\n" + "🚙 .รูปรถ " + c4 + "\n" +

          "\n" + "🐧ส่งโดย : " + member_name +
          "\n" + "🍀วันที่ส่งเรื่อง: " + date_appraisal;

        var subject = "";
        BCT.Telegramsend_pkg_fix('-1001717930015', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8', "B5_ประเมินราคารถ จำจอด", formData, optionField);
      }

      if (tpye_data_ssrafco == 'การขอราคาประเมิน MFI รถยนต์') {
        var message = "";
        message += "🏆แจ้งการขอราคาประเมิน MFI รถยนต์ " +

          "\n" + "🌻 สาขา: " + branch + "\n" +

          "\n" + "🚗 ประเภทหลักประกัน: " + type_guarantee +
          "\n" + " .ยี่ห้อรถ: " + make +
          "\n" + ".รุ่นรถ: " + generation +
          "\n" + "ปี: " + year + "\n" +

          "\n" + "📑 .รูปการ์ดกี (เล่มทะเบียน) " + c1 + "\n" +
          // "\n"+"📑 .รูปสแกนการ์ดกี "+c2+"\n"+
          "\n" + "🚕 .รูปใบตรวจสภาพรถ (กรณีเมื่อเลือก ประเภทการขอราคาประเมินFL ) " + c3 + "\n" +
          "\n" + "🚙 .รูปรถ " + c4 + "\n" +

          "\n" + "🐧ส่งโดย : " + member_name +
          "\n" + "🍀วันที่ส่งเรื่อง: " + date_appraisal;

        var subject = "";
        BCT.Telegramsend_pkg_fix('-1001717930015', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8', "B3_ประเมินราคาMFIรถยนต์", formData, optionField);
      }

      if (tpye_data_ssrafco == 'การขอราคาประเมินที่ดิน MFI') {

        var message = "";
        message += "📢 แจ้งราคาประเมิน MFI :: " + type_guarantee + "\n" +

          "\n" + "🌻 .สาขา: " + branch +
          "\n" + "🚗 .ยี่ห้อ: " + make +
          "\n" + "🚗 .ลักษณะที่ดิน: " + generation +
          "\n" + "🚗 .ประเภทที่ดิน: " + year +
          "\n" + "📋 .เนื้อที่ดิน / ตรม : " + registration +
          "\n" + "📋 .หมายเลขแปลง : " + chassis_number +
          "\n" + "📋 .หมายเลขแผ่นแผนที่ : " + machine_number + "\n" +

          "\n" + "🙍‍♂️ ส่งโดย ::  " + member_name + "\n" +
          "\n" + "🍀วันที่ส่งเรื่อง: " + date_appraisal;

        BCT.Telegramsend_pkg_fix('-735206805', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1iMn2L3Rd6UPlvsLZEEtj9aX5lm0aUAOUfXmKEo0oLl8', "B4_ประเมินที่ดิน MFI", formData, optionField);
      }

    } else if (spreadsheet_id == "1kjFzPEpGty9X0aCm9jmNm3ikzO1k68TiZ_FCb0mplvc") { //// โรส ทำ SD_rplc งานประเมินราคา

      var id_m = formData['id_m'];
      var member_name = formData['member_name'];
      var branch = formData['branch'];
      var type_guarantee = formData['type_guarantee'];
      var carType = formData['carType'];
      var make = formData['make'];
      var generation = formData['generation'];
      var light_position = formData['light_position'];
      var registration = formData['registration'];
      var date_registration = formData['date_registration'];
      var year_manufacture = formData['Year_manufacture'];
      var chassis_number = formData['chassis_number'];
      var machine_number = formData['machine_number'];
      var machine_size = formData['machine_size'];
      var mileage = formData['mileage'];
      var card_registration = formData['card_registration'];
      var inspection_vehicle = formData['Inspection_vehicle'];
      var img_car = formData['img_car'];
      var save_date = formData['save_date'];

      var c1 = BCT.shortenURL(card_registration)
      var c3 = BCT.shortenURL(inspection_vehicle)
      var c4 = BCT.shortenURL(img_car)

      if (type_guarantee == 'รถใหญ่') {
        var message = "";
        message += "🚧 .แจ้งขอราคาประเมินรถใหญ่ RPLC" +

          "\n" + "🔍.ประเภทหลักประกัน : " + type_guarantee + "\n" +
          "\n" + "🔐 .ยี่ห้อรถ : " + make +
          "\n" + "🛞 .รุ่นรถ : " + generation +
          "\n" + "🗓 .ปี : " + year_manufacture + "\n" +

          "\n" + "📒 .รูปการ์ดทะเบียนรถ / ปึ้มเหลือง : " + c1 + "\n" +

          "\n" + "📋.รูปใบตรวจสภาพรถ : " + c3 + "\n" +
          "\n" + "🚘 .รูปรถ : " + c4 + "\n" +

          "\n" + "🛎.ส่งโดย : " + member_name +
          "\n" + "⏰.วันที่ส่งขอราคาประเมิน : " + save_date;
        var subject = "";
        BCT.Telegramsend_pkg_fix('-1001502536333', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1kjFzPEpGty9X0aCm9jmNm3ikzO1k68TiZ_FCb0mplvc', "B1_ราคาประเมินรถใหญ่", formData, optionField);
      }
      if (type_guarantee == 'รถจักร') {
        var message = "";
        message += "🚧 .แจ้งขอราคาประเมินรถจักร RPLC" +

          "\n" + "🔍.ประเภทหลักประกัน : " + type_guarantee + "\n" +
          "\n" + "🔐 .ยี่ห้อรถ : " + make +
          "\n" + "🛞 .รุ่นรถ : " + generation +
          "\n" + "🗓 .ปี : " + year_manufacture + "\n" +

          "\n" + "📒 .รูปการ์ดทะเบียนรถ / ปึ้มเหลือง : " + c1 + "\n" +

          "\n" + "📋.รูปใบตรวจสภาพรถ : " + c3 + "\n" +
          "\n" + "🚘 .รูปรถ : " + c4 + "\n" +

          "\n" + "🛎.ส่งโดย : " + member_name +
          "\n" + "⏰.วันที่ส่งขอราคาประเมิน : " + save_date;
        var subject = "";
        //BCT.Telegramsend_pkg_fix('-1001502536333', message, '')
        BCT.Telegramsend_pkg_fix('-1001709106633', message, '')
        BCT.autoInsertToSpreadsheetByFirebase('1kjFzPEpGty9X0aCm9jmNm3ikzO1k68TiZ_FCb0mplvc', "B1_ราคาประเมินรถจักร", formData, optionField);
      }

    } else if (spreadsheet_id == "documentbunseerafcobrek") {
      if (formData['branch_bu'] == 'RPTN') {
        BCT.autoInsertToSpreadsheetByFirebase("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg", "B1_การเงินทำเบิก", formData, optionField);
        BCT.autoInsertToSpreadsheetByFirebase("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg", "B1_การเงินทำเบิก", formData, optionField);
      } else if (formData['branch_bu'] == 'AICP') {
        BCT.autoInsertToSpreadsheetByFirebase("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg", "B1_การเงินทำเบิก", formData, optionField);
        BCT.autoInsertToSpreadsheetByFirebase("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg", "B1_การเงินทำเบิก", formData, optionField);
      }

    } else if (spreadsheet_id == "getfix_expenses_rplc") {
      if (formData['branch'] == 'RNL' || formData['branch'] == 'RTS' || formData['branch'] == 'RPS' || formData['branch'] == 'RLB' || formData['branch'] == 'RSK' ||  formData['branch'] == 'RVK'||  formData['branch'] == 'RBK'||  formData['branch'] == 'RPH') {
        BCT.autoInsertToSpreadsheetByFirebase("1l9gOu5bBx7qU6WSSDY6AFi_vstBt7klp8NxC5IkZkmA", "B1_Forms_ตอบรับ_จุละพาก", formData, optionField);
      } else if (formData['ctt_code'] != '' && (formData['branch'] != 'RNL' || formData['branch'] != 'RTS' || formData['branch'] != 'RPS' || formData['branch'] != 'RLB' || formData['branch'] != 'RSK'|| formData['branch'] != 'RBK' ||  formData['branch'] != 'RPH')) {
        BCT.autoInsertToSpreadsheetByFirebase("1l9gOu5bBx7qU6WSSDY6AFi_vstBt7klp8NxC5IkZkmA", "B1_Forms_ตอบรับ", formData, optionField);
        BCT.autoInsertToSpreadsheetByFirebase("1mhQhO8tYCKgPl1QgHZlCiOZU4lp5TKMF83QzoEDrXDk", "B1_Forms_ตอบรับ", formData, optionField);
      } else if (formData['branch'] != 'RNL' || formData['branch'] != 'RTS' || formData['branch'] != 'RPS' || formData['branch'] != 'RLB' || formData['branch'] != 'RSK'|| formData['branch'] != 'RBK' ||  formData['branch'] != 'RPH') {
        BCT.autoInsertToSpreadsheetByFirebase("1l9gOu5bBx7qU6WSSDY6AFi_vstBt7klp8NxC5IkZkmA", "B1_Forms_ตอบรับ", formData, optionField);
        BCT.autoInsertToSpreadsheetByFirebase("1mhQhO8tYCKgPl1QgHZlCiOZU4lp5TKMF83QzoEDrXDk", "B1_Forms_ตอบรับ", formData, optionField);
      }

    } else if (spreadsheet_id == '1Jsl6GXxyN8tqUgtTaOAj2yHBuaFOQCYL1BWWq_dm4TY') {
      BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B1_อัพโหลดโฆษณา", formData, optionField);
      //บันทึกข้อมูลลงฐาน
      var ssDes = SpreadsheetApp.openById(spreadsheet_id);
      var shDes = ssDes.getSheetByName("B1_อัพโหลดโฆษณา");
      var rowUpdate = shDes.getLastRow();
      shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ssDes);
      SpreadsheetApp.setActiveSheet(shDes);
      SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);

    } else if (spreadsheet_id == '1QBpP6VnIDSB_3HnrceNU6eNntF5rgjDAaYd04-eTU7s') {   // รายงาน R 'g พี่เนม และ โรส ทำบันทึกตรวจสต็อก
      BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B1_บันทึกรับทองเข้าสต๊อก", formData, optionField);
      //บันทึกข้อมูลลงฐาน
      var ssDes = SpreadsheetApp.openById(spreadsheet_id);
      var shDes = ssDes.getSheetByName("B1_บันทึกรับทองเข้าสต๊อก");
      var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
      var fields = BCT.getFields(shDes, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];

        var days_of_receipt_transfers = formData['days_of_receipt_transfers'];
        var mail_of_receipt_transfers = formData['mail_of_receipt_transfers'];
        var running = formData['running'];
        var the_volume = formData['the_volume'];
        var car_warranty = formData['car_warranty'];
        var member_id = formData['member_id'];
        var member_email1 = formData['member_email1'];
        var note_of_receipt_transfers = formData['note_of_receipt_transfers'];
        if (running != "") {
          var queryHistory = " UPDATE BCT_Stock_Car_Registration_Book SET ";
          queryHistory += " the_volume ='" + the_volume + "',car_warranty = '" + car_warranty + "',note_of_receipt_transfers = '" + note_of_receipt_transfers + "',days_of_receipt_transfers = '" + days_of_receipt_transfers + "',mail_of_receipt_transfers = '" + mail_of_receipt_transfers + "' ,member_id = '" + member_id + "',member_email1 = '" + member_email1 + "'";
          queryHistory += " WHERE running='" + running + "' ";
          var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_RPLC', queryHistory);
          break;
        }
      }
    } else if (spreadsheet_id == '1Ht0DC46BPFY4GaLKA2DRqJqjZwYGUCuWqKPNNg2q5TQ') {
      BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B1_ลงทะเบียนสำรองโครงการระยะยาว", formData, optionField);
      //บันทึกข้อมูลลงฐาน
      var ssDes = SpreadsheetApp.openById(spreadsheet_id);
      var shDes = ssDes.getSheetByName("B1_ลงทะเบียนสำรองโครงการระยะยาว");
      var rowUpdate = shDes.getLastRow();
      shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ssDes);
      SpreadsheetApp.setActiveSheet(shDes);
      SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);




    } else if (spreadsheet_id == '1dpCTnrb42ZOXtSClIgNfsLcENfCZ1We6mtkYOOwGd-4') {
      BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B2_Forms_แยกสถานะ", formData, optionField);
      //บันทึกข้อมูลลงฐาน
      var ssDes = SpreadsheetApp.openById(spreadsheet_id);
      var shDes = ssDes.getSheetByName("B2_Forms_แยกสถานะ");
      var rowUpdate = shDes.getLastRow();
      shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ssDes);
      SpreadsheetApp.setActiveSheet(shDes);
      SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);
    } else if (spreadsheet_id == '1xL5rwYUUEiCgvBHhPWWeldM0Fd4DXLxwzKnx29eXhpE') {
      BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B3_Forms_เช็คสถานะ", formData, optionField);
      //บันทึกข้อมูลลงฐาน
      var ssDes = SpreadsheetApp.openById(spreadsheet_id);
      var shDes = ssDes.getSheetByName("B3_Forms_เช็คสถานะ");
      var rowUpdate = shDes.getLastRow();
      shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ssDes);
      SpreadsheetApp.setActiveSheet(shDes);
      SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);



    } else if (spreadsheet_id == 'reportCU_book') {

      BCT.autoInsertToSpreadsheetByFirebase('1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4', "B2_Datacu", formData, optionField);
      //ส่งข้อความลิ้งค์ออนไลน์ BCT หนังสือตั้งผู้รับโอนประโยชน์จากสหกรณ์ CU

      // var ssDes = SpreadsheetApp.openById('1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4');
      // var shDes = ssDes.getSheetByName("B2_Datacu");

      //  var lastLow = shDes.getLastRow();
      //  var lastCol = shDes.getLastColumn();
      //  var data = shDes.getRange(lastLow, 1, 1, lastCol).getValues();
      //  //var data = BCT.getValuesAll(shDes, 15, 1, 0);

      //  var fields = BCT.getField(shDes, 13, 1, 0);

      //  Logger.log(data)
      //  Logger.log("***")

      //   var token = formData['member_id'];
      //   //console.log(token)

      //    if(token!=""){
      //   var message= " 🗂 CU:: การแจ้งเปลี่ยนแปลงตั้งผู้รับผลประโยชน์ "
      //   message+= "\n "+"  🆕_ แจ้งคุณ :: "+formData['member_id_name'];
      //   message+= "\n "+"  🆕 คกก.CU::ได้รับข้อมูลเปลี่ยนแปลงผู้รับผลประโยชน์เรียบร้อยแล้ว";

      //   message+= "\n\n "+"โปรดตรวจสอบข้อมูลก่อนปริ้นหนังสือและลงลายมือชื่อ ตามลิงค์แนบ";
      //   message+= "\n "+"  ✅ ตรวจสอบ/ปริ้นเอกสาร >> : "+BCT.shortenURL(data[0][BCT.numberColumnByFliedName(fields, 'Link2')-1]);
      //   message+= "\n "+"  ✅ Uplode เอกสาร : https://ags.im/mDh0fC";

      //   message+= "\n\n "+"📌 _นำส่งหนังสือพร้อมหลักฐานต้นฉบับ+แนบสำเนาบัตรประชาชน สมาชิก 1 ใบ ส่งถึง";    
      //   message+= "\n "+"  💌  สหกรณ์เครดิตยูเนี่ยนกลุ่มประชากิจ  จำกัด";
      //   message+= "\n "+"  50/11  หมู่ 2 ต.ท่าช้าง อ.เมือง จ.จันทบุรี  22000 ";
      //   message+= "\n "+"  📞 โทร :: 0931105684";

      //   message+= "\n\n "+"  🙏🏻ขอบคุณค่ะ";
      //   message+= "\n "+"   💁คกก. CU";


      // Logger.log(message)
      //   BCT.Telegramsend_pkg_fix(token, message, '')//ส่งให้สมาชิก    
      //   BCT.Telegramsend_pkg_fix("-798074363", message, '')
      //    }//ใช้จริง
      //พัฒนาใหม่แบบไม่จับแถวท้าย 
      //try {
      var ssForm1 = SpreadsheetApp.openById('1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4');
      var shForm1 = ssForm1.getSheetByName("B2_Datacu");

      //ข้อมูลทั้งหมด
      var rowStartvalue = BCT.form_getRowStartValueByKey(shForm1, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shForm1, 'process');
      var fields = BCT.getFields(shForm1, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shForm1, rowStartvalue, 1);


      for (var v = (valuesAll.length) - 1; v >= 0; v--) {

        var token = valuesAll[v][BCT.numberColumnByFliedName(fields, "member_id") - 1]
        //var link2 = valuesAll[v][BCT.numberColumnByFliedName(fields,"Link2")-1] 
        var member_id_name = formData['member_id_name'];
        var member_id = formData['member_id'];

        if (Number(token) == Number(member_id)) {

          var message = " 🗂 CU:: การแจ้งเปลี่ยนแปลงตั้งผู้รับผลประโยชน์ "
          message += "\n " + "  🆕_ แจ้งคุณ :: " + member_id_name;
          message += "\n " + "  🆕 คกก.CU::ได้รับข้อมูลเปลี่ยนแปลงผู้รับผลประโยชน์เรียบร้อยแล้ว";

          message += "\n\n " + "โปรดตรวจสอบข้อมูลก่อนปริ้นหนังสือและลงลายมือชื่อ ตามลิงค์แนบ";
          message += "\n " + "  ✅ ตรวจสอบ/ปริ้นเอกสาร >> : " + BCT.shortenURL(valuesAll[v][BCT.numberColumnByFliedName(fields, 'Link2') - 1]);
          message += "\n " + "  ✅ Uplode เอกสาร : https://ags.im/mDh0fC";

          message += "\n\n " + "📌 _นำส่งหนังสือพร้อมหลักฐานต้นฉบับ+แนบสำเนาบัตรประชาชน สมาชิก 1 ใบ ส่งถึง";
          message += "\n " + "  💌  สหกรณ์เครดิตยูเนี่ยนกลุ่มประชากิจ  จำกัด";
          message += "\n " + "  50/11  หมู่ 2 ต.ท่าช้าง อ.เมือง จ.จันทบุรี  22000 ";
          message += "\n " + "  📞 โทร :: 0931105684";

          message += "\n\n " + "  🙏🏻ขอบคุณค่ะ";
          message += "\n " + "   💁คกก. CU";



          BCT.notifyMemberPKG(token, '', '', message);
          BCT.Telegramsend_pkg_fix("-798074363", message, '')

          break;
        }
      }
      //}
      // } catch (e) { }







    } else if (spreadsheet_id == 'RafcoVoIP') {

      // BCT.autoInsertToSpreadsheetByFirebase('1727EG0OlLdz0wWCgAldvdPVsCKMprqMrvfEQB6k5YGE', "B1_บัญชีทำเบิกค่าโทรศัพท์", formData, optionField);
      var now = new Date();
      var startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0);
      var endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0);

      // ตรวจสอบว่าตอนนี้อยู่ในช่วงเวลาที่ไม่ต้องการให้ทำงานหรือไม่
      if (now < startTime || now >= endTime) {


        var member_id = formData['member_id'];
        var tel_3 = "";
        var member_id_name = formData['member_id_name'];
        var branch_1 = formData['branch_1'];
        var department_1 = formData['department_1'];
        var network_1 = formData['network_1'];
        var tel_1 = formData['tel_1'];
        var date_data = formData['date_data'];

        var tel_2 = formData['tel_2'];

        if (department_1 == 'AICP') {
          var message2 = "";
          message2 += "💵  RAFCO แจ้งเบิกค่าโทรศัพท์ 🚗  " +
            "\n" + "🚗 รหัสสมาชิก : " + member_id +
            "\n" + "🚗 ชื่อสมาชิก : " + member_id_name +
            "\n" + "🚗 สาขา : " + branch_1 +
            "\n" + "🚗. แผนก : " + department_1 +
            "\n" + "🚗. เครือข่าย  " + network_1 +
            "\n" + "🚗. จำนวนเงินที่เบิก :  " + tel_2 +
            "\n" + "🚗 .เบอร์โทร : " + tel_1 +
            "\n" + "⏰ .วันที่คีย์เบิก : " + date_data + "\n" +
            "\n" + "บัญชีเข้าทำเบิก  https://bit.ly/3yQOiPC";

          BCT.Telegramsend_pkg_fix('-1001884545369', message2, '')
          BCT.Telegramsend_pkg_fix('-1001631928835', message2, '')


          var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1iHiNj24EB9yO-VoUwQLTab1sJObkXttV71R_GeZbl8o/edit#gid=1117252667");
          var sheet = ss.getSheetByName("Card  AICP");

          if (network_1 == 'Smart') {
            var dataRange = sheet.getRange("A2:B");
          } else if (network_1 == 'Metfone') {
            var dataRange = sheet.getRange("C2:D");
          } else if (network_1 == 'cellcard') {
            var dataRange = sheet.getRange("E2:F");
          } else if (network_1 == 'TEST') {
            var dataRange = sheet.getRange("G2:H");
          }
          var data = dataRange.getValues();


          // เลือกรายการข้อมูลที่ต้องการ
          var selectedData = null;
          for (var i = 0; i < data.length; i++) {
            if (data[i][1] == '') {
              selectedData = data[i];
              break;
            }
          }

          if (selectedData) {
            var sheet2 = ss.getSheetByName("B1_บัญชีทำเบิกค่าโทรศัพท์");
            var lastRow = sheet2.getLastRow();

            var range = sheet2.getRange(lastRow + 1, 3);
            var range2 = sheet2.getRange(lastRow + 1, 4);
            var range3 = sheet2.getRange(lastRow + 1, 5);
            var range4 = sheet2.getRange(lastRow + 1, 6);
            var range5 = sheet2.getRange(lastRow + 1, 7);
            var range6 = sheet2.getRange(lastRow + 1, 8);
            var range7 = sheet2.getRange(lastRow + 1, 9);
            var range8 = sheet2.getRange(lastRow + 1, 10);
            var range9 = sheet2.getRange(lastRow + 1, 11);
            var range10 = sheet2.getRange(lastRow + 1, 14);
            var range11 = sheet2.getRange(lastRow + 1, 15);

            var value = selectedData[0];

            if (network_1 == 'Smart') {
              var valuecard = "*1203*" + value + "#";
            } else if (network_1 == 'Metfone') {
              var valuecard = "*1203*" + value + "#";
            } else if (network_1 == 'cellcard') {
              var valuecard = "*123*" + value + "#";
            } else if (network_1 == 'TEST') {
              var valuecard = "*123*" + value + "#";
            }

            range.setValue(member_id);
            range2.setValue(member_id_name);
            range3.setValue(branch_1);
            range4.setValue(department_1);
            range5.setValue(tel_1);
            range6.setValue(network_1);
            range7.setValue(tel_2);
            range8.setValue(value);
            range9.setValue(date_data);
            range10.setValue('ใช้แล้ว');
            range11.setValue('ส่งแล้ว');

          } else {

            var ui = SpreadsheetApp.getUi();
            ui.alert('ไม่พบข้อมูลบัตร');
            Logger.log('ไม่พบข้อมูลบัตร');
          }

          var message = "";
          message += "📢 .บัญชี ส่งรหัสเติมเงิน  " +
            "\n" + "🌻.รหัสเติมเงิน: " + valuecard + "\n" + "https://bit.ly/3yQOiPC" + "\n" +
            // "\n"+"🌻.บัญชีผู้เบิก : "+""+ "\n"+ "https://bit.ly/3yQOiPC"+"\n"+
            "\n" + "🌻 .รหัสสมาชิก: " + member_id +
            "\n" + "🚗. ชื่อสมาชิก: " + member_id_name +
            "\n" + "🚗. สาขา: " + branch_1 +
            "\n" + "🚗. แผนก: " + department_1 +
            "\n" + "🚗. เครือข่าย: " + network_1 +
            "\n" + "🚗. จำนวนเงินที่เบิก :  " + tel_2 +
            "\n" + "🚗 .เบอร์โทร : " + tel_1 +
            "\n" + "⏰ .วันที่คีย์เบิก: " + date_data;

          BCT.Telegramsend_pkg_fix('-1001884545369', message, '')
          BCT.Telegramsend_pkg_fix('-1001631928835', message, '')
          BCT.Telegramsend_pkg_fix(member_id, message, '');

          break;

        } else if (department_1 != 'AICP') {
          var message2 = "";
          message2 += "💵  RAFCO แจ้งเบิกค่าโทรศัพท์ 🚗  " +
            "\n" + "🚗 รหัสสมาชิก : " + member_id +
            "\n" + "🚗 ชื่อสมาชิก : " + member_id_name +
            "\n" + "🚗 สาขา : " + branch_1 +
            "\n" + "🚗. แผนก : " + department_1 +
            "\n" + "🚗. เครือข่าย  " + network_1 +
            "\n" + "🚗. จำนวนเงินที่เบิก :  " + tel_2 +
            "\n" + "🚗 .เบอร์โทร : " + tel_1 +
            "\n" + "⏰ .วันที่คีย์เบิก : " + date_data + "\n" +
            "\n" + "บัญชีเข้าทำเบิก  https://bit.ly/3yQOiPC";

          BCT.Telegramsend_pkg_fix('-1001884545369', message2, '')
          BCT.Telegramsend_pkg_fix('-1001631928835', message2, '')


          var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1iHiNj24EB9yO-VoUwQLTab1sJObkXttV71R_GeZbl8o/edit#gid=1117252667");
          var sheet = ss.getSheetByName("Card RPTN");

          if (network_1 == 'Smart') {
            var dataRange = sheet.getRange("A2:B");
          } else if (network_1 == 'Metfone') {
            var dataRange = sheet.getRange("C2:D");
          } else if (network_1 == 'cellcard') {
            var dataRange = sheet.getRange("E2:F");
          } else if (network_1 == 'TEST') {
            var dataRange = sheet.getRange("G2:H");
          }
          var data = dataRange.getValues();


          // เลือกรายการข้อมูลที่ต้องการ
          var selectedData = null;
          for (var i = 0; i < data.length; i++) {
            if (data[i][1] == '') {
              selectedData = data[i];
              break;
            }
          }

          if (selectedData) {
            var sheet2 = ss.getSheetByName("B1_บัญชีทำเบิกค่าโทรศัพท์");
            var lastRow = sheet2.getLastRow();

            var range = sheet2.getRange(lastRow + 1, 3);
            var range2 = sheet2.getRange(lastRow + 1, 4);
            var range3 = sheet2.getRange(lastRow + 1, 5);
            var range4 = sheet2.getRange(lastRow + 1, 6);
            var range5 = sheet2.getRange(lastRow + 1, 7);
            var range6 = sheet2.getRange(lastRow + 1, 8);
            var range7 = sheet2.getRange(lastRow + 1, 9);
            var range8 = sheet2.getRange(lastRow + 1, 10);
            var range9 = sheet2.getRange(lastRow + 1, 11);
            var range10 = sheet2.getRange(lastRow + 1, 14);
            var range11 = sheet2.getRange(lastRow + 1, 15);

            var value = selectedData[0];

            if (network_1 == 'Smart') {
              var valuecard = "*1203*" + value + "#";
            } else if (network_1 == 'Metfone') {
              var valuecard = "*1203*" + value + "#";
            } else if (network_1 == 'cellcard') {
              var valuecard = "*123*" + value + "#";
            } else if (network_1 == 'TEST') {
              var valuecard = "*123*" + value + "#";
            }

            range.setValue(member_id);
            range2.setValue(member_id_name);
            range3.setValue(branch_1);
            range4.setValue(department_1);
            range5.setValue(tel_1);
            range6.setValue(network_1);
            range7.setValue(tel_2);
            range8.setValue(value);
            range9.setValue(date_data);
            range10.setValue('ใช้แล้ว');
            range11.setValue('ส่งแล้ว');

          } else {

            var ui = SpreadsheetApp.getUi();
            ui.alert('ไม่พบข้อมูลบัตร');
            Logger.log('ไม่พบข้อมูลบัตร');
          }





          var message = "";
          message += "📢 .บัญชี ส่งรหัสเติมเงิน  " +
            "\n" + "🌻.รหัสเติมเงิน: " + valuecard + "\n" + "https://bit.ly/3yQOiPC" + "\n" +
            // "\n"+"🌻.บัญชีผู้เบิก : "+""+ "\n"+ "https://bit.ly/3yQOiPC"+"\n"+
            "\n" + "🌻 .รหัสสมาชิก: " + member_id +
            "\n" + "🚗. ชื่อสมาชิก: " + member_id_name +
            "\n" + "🚗. สาขา: " + branch_1 +
            "\n" + "🚗. แผนก: " + department_1 +
            "\n" + "🚗. เครือข่าย: " + network_1 +
            "\n" + "🚗. จำนวนเงินที่เบิก :  " + tel_2 +
            "\n" + "🚗 .เบอร์โทร : " + tel_1 +
            "\n" + "⏰ .วันที่คีย์เบิก: " + date_data;

          BCT.Telegramsend_pkg_fix('-1001884545369', message, '')
          BCT.Telegramsend_pkg_fix('-1001631928835', message, '')
          BCT.Telegramsend_pkg_fix(member_id, message, '');

          break;



        }


      } else {
        อยู่นอกเวลาทำการจนถึง6โมงเช้าของพรุ่งนี้
      }
    } else if (spreadsheet_id == "testonepage123") {

      var member_id = formData['member_id']
      var member_id_name = formData['member_id_name']
      var date_dataone = formData['date_dataone']
      var description = formData['description']
      var description_detailkhr = formData['description_detailkhr']
      var branch_bu = formData['branch_bu']
      var branch_with = formData['branch_with']
      var finance_type = formData['finance_type']
      var pay_type = formData['pay_type']
      var item_amount = formData['item_amount']
      var item_amount_cur = formData['item_amount_cur']
      var item_type = formData['item_type']
      var Account_receive = formData['Account_receive']
      var Account_receive1 = formData['Account_receive1']
      var bill_1 = formData['bill_1']

      if (branch_bu == 'RPTN') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_การเงินทำเบิก_RPTN");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-1001935891599', message, '')
        // BCT.Telegramsend_pkg_fix('-1001884545369', message, '')



      } else if (branch_bu == 'AICP') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_การเงินทำเบิก_AICP");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-604011938', message, '')

      } else if (branch_bu == 'CUS RPTN') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_การเงินทำเบิก_CUS RPTN");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-1001935891599', message, '')
        // BCT.Telegramsend_pkg_fix('-1001884545369', message, '')

      }


      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'member_id')).setValue(member_id);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'member_id_name')).setValue(member_id_name);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'date_dataone')).setValue(date_dataone);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'description')).setValue(description);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'description_detailkhr')).setValue(description_detailkhr);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'branch_bu')).setValue(branch_bu);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'branch_with')).setValue(branch_with);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'finance_type')).setValue(finance_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'pay_type')).setValue(pay_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_amount')).setValue(item_amount);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_amount_cur')).setValue(item_amount_cur);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_type')).setValue(item_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'Account_receive')).setValue(Account_receive);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'Account_receive1')).setValue(Account_receive1);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'bill_1')).setValue(bill_1);
      // sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'status_acc')).setValue("รอตรวจสอบ");

      var rowUpdate = sheet.getLastRow();
      sheet.getRange(BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ss);
      SpreadsheetApp.setActiveSheet(sheet);
      SpreadsheetApp.setActiveRange(sheet.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);

    } else if (spreadsheet_id == "rafcowithdrawal") {

      var member_id = formData['member_id']
      var member_id_name = formData['member_id_name']
      var date_dataone = formData['date_dataone']
      var description = formData['description']
      var description_detailkhr = formData['description_detailkhr']
      var branch_bu = formData['branch_bu']
      var branch_with = formData['branch_with']
      var finance_type = formData['finance_type']
      var pay_type = formData['pay_type']
      var item_amount = formData['item_amount']
      var item_amount_cur = formData['item_amount_cur']
      var item_type = formData['item_type']
      var Account_receive = formData['Account_receive']
      var Account_receive1 = formData['Account_receive1']
      var bill_1 = formData['bill_1']
      var member_id_approve = formData['member_id_approve']

      var member_approve = member_id_approve.substring(0, 7);
      if (branch_bu == 'RPTN') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_แบบตอบรับทำเบิก_RPTN");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-1001935891599', message, '')
        BCT.Telegramsend_pkg_fix('-1001884545369', message, '')



      } else if (branch_bu == 'AICP') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_แบบตอบรับทำเบิก_AICP");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-1001935891599', message, '')
        BCT.Telegramsend_pkg_fix('-1001884545369', message, '')

      } else if (branch_bu == 'CUS RPTN') {
        var ss = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
        var sheet = ss.getSheetByName("B1_แบบตอบรับทำเบิก_CUS RPTN");
        var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
        var fields = BCT.getFields(sheet, rowFields, 1, 0);

        var message = "";
        message += "💵💵 แจ้งเบิก : " + formData['finance_type'] +
          "\n" + "▪️รายการค่าใช้จ่าย : " + formData['description'] +
          "\n" + "▪️จำนวนเงิน : " + formData['item_amount'] + formData['item_amount_cur'] +
          "\n" + "▪️ชื่อบัญชี : " + formData['pay_type'] +
          "\n" + "▪️หมายเลขบัญชี : " + formData['Account_receive1'];

        BCT.Telegramsend_pkg_fix('-1001935891599', message, '')
        BCT.Telegramsend_pkg_fix('-1001884545369', message, '')

      }


      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'member_id')).setValue(member_id);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'member_id_name')).setValue(member_id_name);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'date_dataone')).setValue(date_dataone);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'description')).setValue(description);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'description_detailkhr')).setValue(description_detailkhr);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'branch_bu')).setValue(branch_bu);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'branch_with')).setValue(branch_with);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'finance_type')).setValue(finance_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'pay_type')).setValue(pay_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_amount')).setValue(item_amount);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_amount_cur')).setValue(item_amount_cur);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'item_type')).setValue(item_type);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'Account_receive')).setValue(Account_receive);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'Account_receive1')).setValue(Account_receive1);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'bill_1')).setValue(bill_1);
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'status_acc')).setValue("รอตรวจสอบ");
      sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'member_id_approve')).setValue(member_approve);

      var rowUpdate = sheet.getLastRow();
      sheet.getRange(BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@')).setValue("X");
      SpreadsheetApp.setActiveSpreadsheet(ss);
      SpreadsheetApp.setActiveSheet(sheet);
      SpreadsheetApp.setActiveRange(sheet.getRange('A' + rowUpdate));
      BCT.saveDataSpreadsheetByTemplate(true, false, false);



    } else if (spreadsheet_id == 'Rafcodocument3') {

      var Primary_Key_Name = 'VC';
      var Primary_Key = formData[Primary_Key_Name];
      var Primary_Key_running = formData['running'];
      var member_id = formData['member_id'];
      var member_id_name = formData['member_id_name'];
      var branch = formData['branch'];
      var amount = formData['amount'];
      var price_unit = formData['price_unit'];
      var rep_id = formData['rep_id'];
      var MR_ID = formData['MR_ID'];
      var id_code = formData['id_code'];
      var Cur = formData['Cur'];
      // var create_time = Utilities.formatDate(new Date(), "GMT+7", 'yyyy-MM-dd HH:mm:ss');
      // var create_user = Session.getEffectiveUser().getEmail();
      var titile = formData['titile'];
      var titile_th = formData['titile_th'];
      // var running = formData['running'];



      // if (branch == 'RPTN PNP') {
      //   var ss = SpreadsheetApp.openById("1zvyyQCYdK4H7tEiEe47_AJJQv4enCZuzwIaxQ_YRZcU");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'RPTN BTB') {
      //   var ss = SpreadsheetApp.openById("1wb1tQiOsDAQiu7RptGCEXPkrCChzE3KNbTmViIoVa8Q");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'RPTN SIR') {
      //   var ss = SpreadsheetApp.openById("1G0bMd2-7QIR2eugnYAUm4Hhau6IntIvZuLL2FuqTnjk");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'AICP MPN') {
      //   var ss = SpreadsheetApp.openById("1dOD_7nAM56A4_jyDoKkHqJPVa9HTMna1dRAEt14VkOA");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'AICP MBT') {
      //   var ss = SpreadsheetApp.openById("1NPx5aFNT46Z7DgJaimsABTM2BmSgP2kI_5Q4NRlgbGc");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'AICP MKT') {
      //   var ss = SpreadsheetApp.openById("1nUci-SdgNxOSSYqsU6LjVQ3WoQ3IlD_BZBCLMoIPSSc");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'AICP MSR') {
      //   var ss = SpreadsheetApp.openById("16ZY-cxK-E2-hMehTirKXu3O3ReDCro3Ni79H0oBEfNY");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // } else if (branch == 'AICP TEST') {
      //   var ss = SpreadsheetApp.openById("1aAlEHgfXQFm4CmuLj2EQpcNbvEcOJQVt7HynfzCfGu0");
      //   var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      // }


      if (branch == 'RPTN KPT') {
        var ss = SpreadsheetApp.openById("1zvyyQCYdK4H7tEiEe47_AJJQv4enCZuzwIaxQ_YRZcU");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      } else if (branch == 'RPTN BTB') {
        var ss = SpreadsheetApp.openById("1wb1tQiOsDAQiu7RptGCEXPkrCChzE3KNbTmViIoVa8Q");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      } else if (branch == 'RPTN SIR') {
        var ss = SpreadsheetApp.openById("1G0bMd2-7QIR2eugnYAUm4Hhau6IntIvZuLL2FuqTnjk");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      } else if (branch == 'RPTN KPC') {
        var ss = SpreadsheetApp.openById("1pKKkQNA6EYcBPWZyG1JOq_kHv-Owg_ugW4BmEIqzTPo");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      }else if (branch == 'RPTN PTS') {
        var ss = SpreadsheetApp.openById("1ej7tgXjvHqgZvpEihcPcX8nrNzlM7qND_0pKUGyc3J4");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      }else if (branch == 'RPTN PNP') {
        var ss = SpreadsheetApp.openById("1ph6olzZRgogRKRFk2RHcFbJT_Um5IaDmPADEq80d1_A");
        var sheet = ss.getSheetByName("B1_เอกสารหมายเลข 3");
      }

      var rowStartvalue = BCT.form_getRowStartValueByKey(sheet, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(sheet, 'process');
      var fields = BCT.getFields(sheet, rowFields, 1, 0);
      if (Primary_Key != "") {
        var query = "select VC,running,titile,titile_th,rep_name as member_id_name,branch,amount,price_unit,rep_id,MR_ID,Cur,running from RAFCO_page3 "
        query += " where VC='" + Primary_Key + "'";
        var datas = BCT.loadJSONDatas('RDS', 'BCT_AMS2_RAFCO', query);
      } else if (Primary_Key == "") {
        var datas = "";
      }



      if (datas != '') {
        var sheet_tar = ss.getSheetByName("B1_เอกสารหมายเลข 3");
        var startTarRow = BCT.form_getRowStartValueByKey(sheet_tar, "process");
        var dataTar = BCT.getValuesAll(sheet_tar, BCT.form_getRowStartValueByKey(sheet_tar, "process"), 1);
        var filed_tar = BCT.getField(sheet_tar, BCT.form_getRowFieldsByKey(sheet_tar, "process"), 1);

        for (var e = 0; e < dataTar.length; e++) {
          var tar_running = dataTar[e][BCT.numberColumnByFliedName(filed_tar, "running") - 1];


          if (tar_running == Primary_Key_running) {
            //3.วางเลขที่ carID ลงใน BCT stock และ B1_รับข้อมูลลูกค้าซื้อรถ
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'titile')).setValue(titile);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'titile_th')).setValue(titile_th);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'amount')).setValue(amount);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'price_unit')).setValue(price_unit);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'MR_ID')).setValue(MR_ID);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'rep_id')).setValue(rep_id);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'rep_name')).setValue(member_id_name);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'Cur')).setValue(Cur);
            sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(filed_tar, 'branch')).setValue(branch);


            var rangeUpdate = sheet_tar.getRange(startTarRow + e, BCT.numberColumnByFliedName(BCT.getField(sheet_tar, BCT.form_getRowByKey(sheet_tar, 'process'), 1, 0), '@'))
            rangeUpdate.setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ss);
            SpreadsheetApp.setActiveSheet(sheet_tar);
            SpreadsheetApp.setActiveRange(rangeUpdate);
            BCT.saveDataSpreadsheetByTemplate(true, false, false);
          }
        }
        var link2 = "http://webapp.prachakij.com:8080/BCT/rafco_page3.jsp?vc=" + Primary_Key;
        var message = "";
        message += "📢 🔴🔴 แก้ไข VC เอกสารหมายเลข 3 สำเร็จ" +
          "\n" + "ค่า :" + titile_th +
          "\n" + "จำนวนเงิน :" + amount * price_unit +
          "\n" + "สกุลเงิน :" + Cur +
          "\n" + "คลิ๊ก 👉 รหัส : " + Primary_Key + "\n" + "ลิงค์ : " + link2;
        if (branch.substring(0, 4) == 'RPTN') {
          BCT.Telegramsend_pkg_fix('-1001935891599', message, '') //RAFCO
          // BCT.Telegramsend_pkg_fix('-1001884545369', message, '') 
          BCT.Telegramsend_pkg_fix(member_id, message, '') //RAFCO
        } else if (branch.substring(0, 4) == 'AICP') {
          BCT.Telegramsend_pkg_fix('-604011938', message, '') //AICP
          // BCT.Telegramsend_pkg_fix('-1001884545369', message, '') 
          BCT.Telegramsend_pkg_fix(member_id, message, '') //RAFCO
        }

      } else if (datas == '') {

        var newVC = getNewVC(branch.substring(5, branch.length));


        var lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'VC')).setValue(newVC);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'titile')).setValue(titile);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'titile_th')).setValue(titile_th);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'amount')).setValue(amount);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'price_unit')).setValue(price_unit);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'rep_id')).setValue(rep_id);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'MR_ID')).setValue(MR_ID);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'rep_name')).setValue(member_id_name);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'Cur')).setValue(Cur);
        sheet.getRange(lastRow + 1, BCT.numberColumnByFliedName(fields, 'branch')).setValue(branch);

        var rowUpdate = sheet.getLastRow();
        sheet.getRange(BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@')).setValue("X");
        SpreadsheetApp.setActiveSpreadsheet(ss);
        SpreadsheetApp.setActiveSheet(sheet);
        SpreadsheetApp.setActiveRange(sheet.getRange('A' + rowUpdate));
        BCT.saveDataSpreadsheetByTemplate(true, false, false);

        var link = "http://webapp.prachakij.com:8080/BCT/rafco_page3.jsp?vc=" + newVC;
        var message = "";
        message += "📢 🟢🟢 บันทึก VC เอกสารหมายเลข 3 สำเร็จ" +
          "\n" + "ค่า :" + titile_th +
          "\n" + "จำนวนเงิน :" + amount * price_unit +
          "\n" + "สกุลเงิน :" + Cur +
          "\n" + "คลิ๊ก 👉 รหัส : " + newVC + "\n" + "ลิงค์ : " + link;
        if (branch.substring(0, 4) == 'RPTN') {
          BCT.Telegramsend_pkg_fix('-1001935891599', message, '') //RAFCO
          // BCT.Telegramsend_pkg_fix('-1001884545369', message, '') //RAFCO
          BCT.Telegramsend_pkg_fix(member_id, message, '') 
        } else if (branch.substring(0, 4) == 'AICP') {
          BCT.Telegramsend_pkg_fix('-604011938', message, '') //AICP
          // BCT.Telegramsend_pkg_fix('-1001884545369', message, '') //AICP
          BCT.Telegramsend_pkg_fix(member_id, message, '') 
        }


      }

    } else if (spreadsheet_id == 'UplodeCU_book') {

      BCT.autoInsertToSpreadsheetByFirebase('1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4', "B3_UpLodepaper", formData, optionField);
      //ส่งข้อความลิ้งค์ออนไลน์ Uplode 

      var ssDes = SpreadsheetApp.openById('1vLuxE_dnQQMLDHii-l6BeJPWqcOhH7U7Bv6TGZsKYn4');
      var shDes = ssDes.getSheetByName("B3_UpLodepaper");


      var lastLow = shDes.getLastRow();
      var lastCol = shDes.getLastColumn();
      var data = shDes.getRange(lastLow, 1, 1, lastCol).getValues();
      //var data = BCT.getValuesAll(shDes, 15, 1, 0);

      var fields = BCT.getField(shDes, 13, 1, 0);

      Logger.log(data)
      Logger.log("***")

      var dataline = shDes.getRange("E9").getValue();
      if (dataline !== "") {
        dataline = Utilities.formatDate(dataline, "GMT+7", "dd/MM/yyyy")
      }


      var token = formData['member_id'];
      //console.log(token)

      if (token != "") {
        var message = "🆕_ แจ้งคุณ :: " + formData['member_id_name'];
        message += "\n " + " คุณได้ Upload หนังสือตั้งผู้รับผลประโยชน์ของ  CU เรียบร้อยแล้ว ";

        message += "\n\n " + "📌 _นำส่งหนังสือแต่งตั้ง / เปลี่ยนแปลง ผู้รับโอนผลประโยชน์ ต้นฉบับ ";
        message += "\n " + "📌 _แนบสำเนาบัตรประชาชน สมาชิก 1 ใบ ";
        message += "\n " + " พร้อมลงชื่อ รับรองสำเนาโดยให้ระบุ ข้อความในสำเนาบัตร 👇👇";
        message += "\n " + "**สำหรับแจ้งเปลี่ยนแปลงผู้รับผลประโยชน์ สค.กลุ่มประชากิจ เท่านั้น**";

        message += "\n\n " + "สมาชิก สนญ. ส่งที่ชั้น 3 หรือใส่ลิฟ  โน๊ตว่า ถึง พี่กาญ นะคะ";

        message += "\n\n" + "สมาชิก สาขาอื่น. ส่งผ่านไปรษณีย์ ส่งถึง ";
        message += "\n " + "💌 :: สหกรณ์เครดิตยูเนี่ยนกลุ่มประชากิจ  จำกัด";
        message += "\n " + "50/11  หมู่ 2 ต.ท่าช้าง อ.เมือง จ.จันทบุรี  22000 ";
        message += "\n " + "📞 โทร :: 0931105684";

        message += "\n\n " + "กำหนดส่งไม่เกิน :" + dataline;

        message += "\n\n " + "  🙏🏻ขอบคุณค่ะ";
        message += "\n " + "   💁คกก. CU";


        Logger.log(message)
        BCT.Telegramsend_pkg_fix(token, message, '')//ส่งให้สมาชิก    
        BCT.Telegramsend_pkg_fix("-798074363", message, '')


        var message2 = " มีสมาชิก Upload หนังสือตั้งผู้รับผลประโยชน์ CU ";
        message2 += "\n 🆕_ ชื่อคุณ :: " + formData['member_id_name'];

        message2 += "\n\n ตรวจสอบได้ที่ลิ้งค์ :https://ags.im/UBCd0K"

        message2 += "\n\n " + "  🙏🏻ขอบคุณค่ะ";

        BCT.Telegramsend_pkg_fix("-1001625346142", message2, '')//ส่งให้สมาชิก    
        BCT.Telegramsend_pkg_fix("-798074363", message2, '')



      }



    } else if (spreadsheet_id == "reportO_RPLC_saveUploadAudit") {
      var branch = BCT.getReportT_RPLC_NameBrand(formData['ctt_code']);

      //      Logger.log("branch : "+branch)
      //      var key_reportR = BCT.loadUrlCenter('BCT_Report_R_RPLC', 'cpy_code', branch, 'url_key');
      var key_reportO = "";
      var ssCenter = SpreadsheetApp.openById("16MCiwIj1Q_PY28nldaGXUG7jWzleb67xG7h93Rwiyy0");
      var shCenter = ssCenter.getSheetByName("B1_สร้างไฟล์");
      var fieldCenter = BCT.getField(shCenter, BCT.form_getRowFieldsByKey(shCenter, 'process'), 1, 0);
      var valueCenterAll = BCT.getValuesAll(shCenter, BCT.form_getRowStartValueByKey(shCenter, 'process'), 1);
      for (var vc = 0; vc < valueCenterAll.length; vc++) {
        if (valueCenterAll[vc][BCT.numberPositionValueByFliedName(fieldCenter, 'cpy_code')] == branch) {
          key_reportO = valueCenterAll[vc][BCT.numberPositionValueByFliedName(fieldCenter, 'url_key')];
        }
      }
      //      Logger.log("key_reportO : "+key_reportO)
      //      key_reportO = "1PJ93rAyIBwG3BTZKR6pF2iVyKT5CWZRVYMRuuhd1euU";
      var ssDes = SpreadsheetApp.openById(key_reportO);
      var shDes = ssDes.getSheetByName("B4_Audit_นิติกรรม");
      var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
      var fields = BCT.getFields(shDes, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
          var audit_send_proof_photo = formData['receive_audit_send_proof_photo'];
          var audit_send_proof_detail = formData['receive_audit_send_proof_detail'];
          var audit_send_proof_date = new Date();
          var audit_send_proof_user = Session.getEffectiveUser().getEmail();
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_photo')).setValue(audit_send_proof_photo);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_detail')).setValue(audit_send_proof_detail);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_date')).setValue(audit_send_proof_date);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_user')).setValue(audit_send_proof_user);
          break;
        }
      }

      /*
      BCT Audit AAMgr RPLCgr RAFCOgr นิติกรรม
      ลิงค์ BCT https://docs.google.com/spreadsheets/d/1ar0svSfjHxMsTkcmEGZKJbJLWbUj1WPx5Gi-dmI5QO4/edit#gid=1115484104
      */
      var key_reportR = '1ar0svSfjHxMsTkcmEGZKJbJLWbUj1WPx5Gi-dmI5QO4';
      var ssDes = SpreadsheetApp.openById(key_reportR);
      var shDes = ssDes.getSheetByName("B4_Audit_นิติกรรม_RPLC");
      if (shDes != null && shDes != undefined) {
        var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
        var fields = BCT.getFields(shDes, rowFields, 1, 0);
        var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
        for (var v = 0; v < valuesAll.length; v++) {
          var rowUpdate = v + rowStartvalue;
          var values = [valuesAll[v]];
          if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
            var audit_send_proof_photo = formData['receive_audit_send_proof_photo'];
            var audit_send_proof_detail = formData['receive_audit_send_proof_detail'];
            var audit_send_proof_date = new Date();
            var audit_send_proof_user = Session.getEffectiveUser().getEmail();
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_photo')).setValue(audit_send_proof_photo);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_detail')).setValue(audit_send_proof_detail);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_date')).setValue(audit_send_proof_date);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'receive_audit_send_proof_user')).setValue(audit_send_proof_user);
            break;
          }
        }
      }

      var queryHistory = " UPDATE BCT_Stock_Car_Registration_Book SET ";
      queryHistory += " receive_audit_send_proof_photo='" + audit_send_proof_photo + "' ";
      queryHistory += " ,receive_audit_send_proof_detail='" + audit_send_proof_detail + "' ";
      queryHistory += " ,receive_audit_send_proof_date='" + BCT.getFormatDate(audit_send_proof_date, 'yyyy-MM-dd HH:mm:ss') + "' ";
      queryHistory += " ,receive_audit_send_proof_user='" + audit_send_proof_user + "' ";
      queryHistory += " WHERE ctt_code='" + formData['ctt_code'] + "' ";
      BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_RPLC', queryHistory);
    } else if (spreadsheet_id == "reportR_RAFCO_saveUploadAudit") {
      var branch = BCT.getReportT_RAFCO_NameBrand(formData['ctt_code']);
      var key_reportR = BCT.loadUrlCenter('BCT_Report_R_RAFCO', 'cpy_code', branch, 'url_key');
      //      if(BCT.tester_popup()){
      //        key_reportR = '1D2VPtsLbW24HQd8R-Bnu-K2zUXdpHPYyFTYwnTKF_bU';
      //      }
      var ssDes = SpreadsheetApp.openById(key_reportR);
      var shDes = ssDes.getSheetByName("B4_Audit_เอกสารหลักประกัน");
      var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
      var fields = BCT.getFields(shDes, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
          var audit_send_proof_photo = formData['audit_send_proof_photo'];
          var audit_send_proof_detail = formData['audit_send_proof_detail'];
          var audit_send_proof_date = new Date();
          var audit_send_proof_user = Session.getEffectiveUser().getEmail();
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_photo')).setValue(audit_send_proof_photo);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_detail')).setValue(audit_send_proof_detail);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_date')).setValue(audit_send_proof_date);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_user')).setValue(audit_send_proof_user);
          break;
        }
      }

      /*
      BCT Audit AAMgr RPLCgr RAFCOgr
      BCT/แผนงาน BCT Audit AAMgr RPLCgr RAFCOgr
      ลิงค์ BCT https://docs.google.com/spreadsheets/d/1eqlaRZH3fKuHj37JSEcK8xxbx3x7mg5c4bZZhRA7rIE/edit
      ปัญหาที่พบ เพิ่มการส่งข้อมูลหลังจากที่น้องส่งวันเพจแล้วให้ข้อมูลมาขึ้นโชว์ที่ไฟล์หลักให้ด้วยจิ คือขึ้นในไฟล์สาขาแล้ว ให้ขึ้นในไฟล์หลักนี้ด้วยจิ
      แจ้งมาเมื่อ 02/07/2021 11:48:44 แจ้งโดย ปุ๊ก คุณชรีย์พร นาคจรูญ(ปุ๊ก) -
      */
      var key_reportR = '1eqlaRZH3fKuHj37JSEcK8xxbx3x7mg5c4bZZhRA7rIE';
      var ssDes = SpreadsheetApp.openById(key_reportR);
      var shDes = ssDes.getSheetByName("B4_Audit_เอกสารหลักประกัน_RAFCO");
      if (shDes != null && shDes != undefined) {
        var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
        var fields = BCT.getFields(shDes, rowFields, 1, 0);
        var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
        for (var v = 0; v < valuesAll.length; v++) {
          var rowUpdate = v + rowStartvalue;
          var values = [valuesAll[v]];
          if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
            var audit_send_proof_photo = formData['audit_send_proof_photo'];
            var audit_send_proof_detail = formData['audit_send_proof_detail'];
            var audit_send_proof_date = new Date();
            var audit_send_proof_user = Session.getEffectiveUser().getEmail();
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_photo')).setValue(audit_send_proof_photo);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_detail')).setValue(audit_send_proof_detail);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_date')).setValue(audit_send_proof_date);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_user')).setValue(audit_send_proof_user);
            break;
          }
        }
      }

      var queryHistory = " UPDATE BCT_Financing SET ";
      queryHistory += " audit_send_proof_photo='" + audit_send_proof_photo + "' ";
      queryHistory += " ,audit_send_proof_detail='" + audit_send_proof_detail + "' ";
      queryHistory += " ,audit_send_proof_date='" + BCT.getFormatDate(audit_send_proof_date, 'yyyy-MM-dd HH:mm:ss') + "' ";
      queryHistory += " ,audit_send_proof_user='" + audit_send_proof_user + "' ";
      queryHistory += " WHERE contract_number='" + formData['ctt_code'] + "' ";
      BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_AMS2_RAFCO', queryHistory);
    } else if (spreadsheet_id == "reportR_RPLC_saveUploadAudit") {
      //      var branch = BCT.getReportT_BranchMerger(formData['ctt_code']);
      var branch = BCT.getReportT_RPLC_NameBrand(formData['ctt_code']);
      var key_reportR = BCT.loadUrlCenter('BCT_Report_R_RPLC', 'cpy_code', branch, 'url_key');
      var ssDes = SpreadsheetApp.openById(key_reportR);
      var shDes = ssDes.getSheetByName("B4_Audit_เอกสารหลักประกัน");
      var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
      var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
      var fields = BCT.getFields(shDes, rowFields, 1, 0);
      var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
      for (var v = 0; v < valuesAll.length; v++) {
        var rowUpdate = v + rowStartvalue;
        var values = [valuesAll[v]];
        if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
          var audit_send_proof_photo = formData['audit_send_proof_photo'];
          var audit_send_proof_detail = formData['audit_send_proof_detail'];
          var audit_send_proof_date = new Date();
          var audit_send_proof_user = Session.getEffectiveUser().getEmail();
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_photo')).setValue(audit_send_proof_photo);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_detail')).setValue(audit_send_proof_detail);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_date')).setValue(audit_send_proof_date);
          shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_user')).setValue(audit_send_proof_user);
          break;
        }
      }

      /*
      BCT Audit AAMgr RPLCgr RAFCOgr
      BCT/แผนงาน BCT Audit AAMgr RPLCgr RAFCOgr
      ลิงค์ BCT https://docs.google.com/spreadsheets/d/1eqlaRZH3fKuHj37JSEcK8xxbx3x7mg5c4bZZhRA7rIE/edit
      ปัญหาที่พบ เพิ่มการส่งข้อมูลหลังจากที่น้องส่งวันเพจแล้วให้ข้อมูลมาขึ้นโชว์ที่ไฟล์หลักให้ด้วยจิ คือขึ้นในไฟล์สาขาแล้ว ให้ขึ้นในไฟล์หลักนี้ด้วยจิ
      แจ้งมาเมื่อ 02/07/2021 11:48:44 แจ้งโดย ปุ๊ก คุณชรีย์พร นาคจรูญ(ปุ๊ก) -
      */
      var key_reportR = '1eqlaRZH3fKuHj37JSEcK8xxbx3x7mg5c4bZZhRA7rIE';
      var ssDes = SpreadsheetApp.openById(key_reportR);
      var shDes = ssDes.getSheetByName("B4_Audit_เอกสารหลักประกัน_RPLC");
      if (shDes != null && shDes != undefined) {
        var rowStartvalue = BCT.form_getRowStartValueByKey(shDes, 'process');
        var rowFields = BCT.form_getRowFieldPutByKey(shDes, 'process');
        var fields = BCT.getFields(shDes, rowFields, 1, 0);
        var valuesAll = BCT.getValuesAll(shDes, rowStartvalue, 1);
        for (var v = 0; v < valuesAll.length; v++) {
          var rowUpdate = v + rowStartvalue;
          var values = [valuesAll[v]];
          if (BCT.valueByFliedName(fields, values, 'ctt_code') == formData['ctt_code']) {
            var audit_send_proof_photo = formData['audit_send_proof_photo'];
            var audit_send_proof_detail = formData['audit_send_proof_detail'];
            var audit_send_proof_date = new Date();
            var audit_send_proof_user = Session.getEffectiveUser().getEmail();
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_photo')).setValue(audit_send_proof_photo);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_detail')).setValue(audit_send_proof_detail);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_date')).setValue(audit_send_proof_date);
            shDes.getRange(rowUpdate, BCT.numberColumnByFliedName(fields, 'audit_send_proof_user')).setValue(audit_send_proof_user);
            break;
          }
        }
      }

      var queryHistory = " UPDATE BCT_Stock_Car_Registration_Book SET ";
      queryHistory += " audit_send_proof_photo='" + audit_send_proof_photo + "' ";
      queryHistory += " ,audit_send_proof_detail='" + audit_send_proof_detail + "' ";
      queryHistory += " ,audit_send_proof_date='" + BCT.getFormatDate(audit_send_proof_date, 'yyyy-MM-dd HH:mm:ss') + "' ";
      queryHistory += " ,audit_send_proof_user='" + audit_send_proof_user + "' ";
      queryHistory += " WHERE ctt_code='" + formData['ctt_code'] + "' ";
      BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'BCT_RPLC', queryHistory);
    } else if (spreadsheet_id == "AAM_LAW_print_online_work_report_legal_department") {
      //      var query = "";

    } else if (spreadsheet_id == "MKD_rafco") {
      var spreadsheet_id_new = "";
      var branch_name = formData['branch_name'];
      if (branch_name == 'PNP') {
        spreadsheet_id_new = "1GDiZO9U2BQRtO8nSyllnCtUardAsFFOUirn5hGx6Lbs";
      } else if (branch_name == 'BTB') {
        spreadsheet_id_new = "18XWSqBTvc1iXcHn1xGfkaB2Eb-FMRlcROTw9lhUz54s";
      }
      if (spreadsheet_id_new != '') {
        var sheetName = formResponse[spreadsheet_id]['form_spreadsheet_sheet'];
        var optionField = { createTime: 'date', timestamp: 'date' }
        BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id_new, sheetName, formData, optionField);
      } else {
        ไม่พบสาขากรุณาตรวจ
      }
    } else {


      Logger.log("spreadsheet_id==" + spreadsheet_id);
      var ss = SpreadsheetApp.openById(spreadsheet_id);

      var sheetNames = formResponse[spreadsheet_id]['form_spreadsheet_sheet'].split("|");
      var sheetNames_size = sheetNames.length;
      for (var shns = 0; shns < sheetNames_size; shns++) {
        // var sheetName = formResponse[spreadsheet_id]['form_spreadsheet_sheet'];
        var sheetName = sheetNames[shns];
        var sheet = ss.getSheetByName(sheetName);
        if (sheet == undefined) {
          sheet = SpreadsheetApp.openById('1tNdiKAO6gAnqI-7hD6jbnmB3bVyyEIqiYdENZNfr79A').getSheetByName('B1_Forms_ตอบรับ').copyTo(ss).setName(sheetName);
          var rowFields = BCT.form_getRowFieldsByKey(sheet, 'process');
          var fields = BCT.getFields(sheet, rowFields, 1, 0);
          BCT.loadFieldsByDatas_Json(sheet, 'C' + rowFields, formData);
          BCT.loadFieldsByDatas_Json(sheet, 'C' + (rowFields + 2), formData);
        }

        var rowStartValue = BCT.form_getRowStartValueByKey(sheet, 'process');
        var rowFields = BCT.form_getRowFieldsByKey(sheet, 'process');

        if (spreadsheet_id != "1-0xEKSKi5wdRNoN7KG3onYOAGpQCJ4w25SMUeoYNc2U") {

          var fields = BCT.getFields(sheet, rowFields, 1, 0);
          Logger.log("2222");
          var rowInsert = sheet.getLastRow() + 1;
          if (rowInsert < rowStartValue) {
            rowInsert = rowStartValue;
          }

          if (formResponse[spreadsheet_id]['URLData'] == undefined) {
            for (var fname in formData) {
              var newField = true;
              for (var f = 0; f < fields[0].length; f++) {
                if (fields[2][f] == fname) {
                  newField = false
                  break;
                }
              }
              if (newField) {
                var insertCol = -1;
                for (var f = 0; f < fields[0].length; f++) {
                  if (fields[0][f] == '' && fields[2][f] == '' && f > 2) {
                    insertCol = f + 1;
                    break;
                  }
                }
                if (insertCol < 0) {
                  insertCol = sheet.getLastColumn() + 1;
                }
                sheet.getRange(rowFields, insertCol).setValue(fname);
                sheet.getRange(rowFields + 2, insertCol).setValue(fname);
                fields = BCT.getFields(sheet, rowFields, 1, 0);
              }
            }
          }

          var fields = BCT.getFields(sheet, rowFields, 1, 0);
          var optionField = { createTime: 'date', timestamp: 'date' }

        }


        Logger.log("start");
        if (formResponse[spreadsheet_id]['URLData'] == "reportR") {
          var datas = BCT.loadJSONDatas(BCT.getDBServer(), config['reportR']['DBName'], config['reportR']['query'] + " where ctt_code='" + formData['ctt_code'] + "'");
          var running = BCT.valueInData(datas[0], 'running');
          formData['running'] = running;
          var valueAll = BCT.getValuesAll(sheet, rowStartValue, 1);
          var updateRow = -1;
          for (var r = 0; r < valueAll.length; r++) {
            if (valueAll[r][BCT.numberPositionValueByFliedName(fields, 'running')] == running) {
              updateRow = r + rowStartValue;
              break;
            }
          }

          if (updateRow > 0) {
            BCT.autoInsert_JsonFixField(sheet, fields, [formData], updateRow, 1);
          } else {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
          }
        } else if (formResponse[spreadsheet_id]['URLData'] == "reportR_RPLC") {
          var datas = BCT.loadJSONDatas(BCT.getDBServer(), config['reportR_RPLC']['DBName'], config['reportR_RPLC']['query'] + " WHERE ctt_code='" + formData['ctt_code'] + "'");
          var Primary_Key_Name = 'running';
          var Primary_Key = BCT.valueInData(datas[0], Primary_Key_Name);
          formData[Primary_Key_Name] = Primary_Key;
          var valueAll = BCT.getValuesAll(sheet, rowStartValue, 1);
          var updateRow = -1;
          for (var r = 0; r < valueAll.length; r++) {
            if (valueAll[r][BCT.numberPositionValueByFliedName(fields, Primary_Key_Name)] == Primary_Key) {
              updateRow = r + rowStartValue;
              break;
            }
          }

          if (updateRow > 0) {
            BCT.autoInsert_JsonFixField(sheet, fields, [formData], updateRow, 1);
          } else {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
          }
        } else {

          Logger.log("เข้าเริ่ม Else");
          /* กำหนดรูปแบบการวาง ตาม BCT ปลายทาง กรณีอัพเดทเข้าแถวเดิมได้ */
          if (spreadsheet_id == '1lQMUZAyqMB2sCIMP5SgOQjYG-EpwJtnZeZEl3teVBSY') {
            var datas = BCT.loadJSONDatas(BCT.getDBServer(), 'BCT_AMS2', "select * from (SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrandCar g on f.grant_id=g.car_id UNION ALL SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,mtc_number as car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrantMCT g on f.grant_id=g.grant_id UNION ALL SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrantLAND g on f.grant_id=g.grant_id) financing WHERE contract_number='" + formData['contract_number'] + "'");
            var Primary_Key_Name = 'grant_id';
            var Primary_Key = BCT.valueInData(datas[0], Primary_Key_Name);
            formData[Primary_Key_Name] = Primary_Key;
            var valueAll = BCT.getValuesAll(sheet, rowStartValue, 1);
            var updateRow = -1;
            for (var r = 0; r < valueAll.length; r++) {
              if (valueAll[r][BCT.numberPositionValueByFliedName(fields, Primary_Key_Name)] == Primary_Key) {
                updateRow = r + rowStartValue;
                break;
              }
            }

            if (updateRow > 0) {
              BCT.autoInsert_JsonFixField(sheet, fields, [formData], updateRow, 1);
            } else {
              BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            }
          } else if (spreadsheet_id == '1i0fO9FnjklvbeeQPKQPaTfyLZgzdRFl98bzkoKvzn7o' ||
            spreadsheet_id == '1q-lSmyZNWyoay9NuK6e0e_gblvgoFEezvPmLSue4NFA' ||
            spreadsheet_id == '1QqSkKK6Lm2YK1TQby0bt7IkvR1MMji2rS-LlNFDNWdM' ||
            spreadsheet_id == '1uH3LeYt7LS0l8Lg3wHqv2mSBg-9HT85ClK4-J49roCA' ||
            spreadsheet_id == '1JbZDTVNCpEE0chrJgsQr7K45NPSMDtGcSRrYFtKK4HQ' || //21CT : วิจัยและพัฒนาเทคโนโลยี 3x Lab technology research
            spreadsheet_id == '1Sezm737bcJn9Gvk5mdJlWUO37BKRSsJSB6iweH0qVO8' || //21RT : วิจัยและพัฒนาเทคโนโลยี 3x Lab technology research
            spreadsheet_id == '1--BaDsMvKIQfTqX8lbWcsrTeqpKNycjcZeUX_K8HiDY' ||
            spreadsheet_id == '1735cHdg8sufs8TSiCERXHHiMIQ0BUGffhFXsigpnqzY' ||
            spreadsheet_id == '1ScZLretZ7_SRL6279EymEf4DUejxIMu1UptDzFNotjI' ||
            spreadsheet_id == '1z9osuvJTvx0IvmXLHPWKZBxVDis3UntqkC2wcdvxYUI' ||
            spreadsheet_id == '1prk1Gk3YuPQ-h2fZ1EsSqLSljHU4Yz51TGW7cwAx8dM' ||
            spreadsheet_id == '1a_o0k460jDuFgC9O7tz2A_nfDaw-_zpyLDc6WXBk-uY' ||
            spreadsheet_id == '1D2E1JX6ZrP6xrZF6uSLK9XYrScTIK0dCyFQncXpp7ws') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);

            if (spreadsheet_id == '1q-lSmyZNWyoay9NuK6e0e_gblvgoFEezvPmLSue4NFA') {
              SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(ssDes.getSheetByName("B1_อนุมัติเงินกู้"))
              var shDes2 = ssDes.getSheetByName("B1_อนุมัติเงินกู้");
              BCT.loadDataSpreadsheetByTemplate(true, false, true);
            }

          } else if (spreadsheet_id == "1jabwxnf_BYGLDqwSxBoL7kSaYt-1MPqKoRTCmxFVbSU") {

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            SpreadsheetApp.flush();
            var ss = SpreadsheetApp.openById(spreadsheet_id);
            var sheet = ss.getSheetByName("แจ้งสถานะงานติดตาม_onepage");
            //          var data = sheet.getRange("E2:E").getValues();
            var lastRow = sheet.getLastRow();
            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();
            var filed = sheet.getRange(10, 1, 1, sheet.getLastColumn()).getValues();
            var rangeStatus = sheet.getRange(lastRow, BCT.numberColumnByFliedName(filed, "สถานะส่งไลน์"));
            var status = rangeStatus.getValue();
            if (status != "ส่งแล้ว") {

              var message = "💪เรือง แจ้งสถานะ การติดตาม"

                + "\n👫เลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")]
                + "\n👫ลูกค้าชื่อ : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]
                + "️\n🚔️สถานะการติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")]
                + "️\n🚔️follow-up : " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")]
                + "\n📝รายละเอียด : " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")]
                + "\n\n👮‍♂️สมาชิกผู้ติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]
                + "\n📝ประเภทงาน : " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]
                + "\n📆วันที่ติดตาม : " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy");



              BCT.Telegramsend_pkg_fix('-1001753733819', message, ''); //เก็บแก้ rafco
              BCT.Telegramsend_pkg_fix('-1001631928835', message, ''); //batterry

              //   var update_user = Session.getActiveUser().getEmail();
              //   var create_user = Session.getActiveUser().getEmail();
              //   var memo_ctt_code = formData['ctt_code'] ; 
              //  var memo_description ="การติดตาม "
              //             + "\nเลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")]
              //             + "\nลูกค้าชื่อ : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]
              //             + "\nสถานะการติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")]
              //             + "\nfollow-up : " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")]
              //             + "\nรายละเอียด : " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")]
              //             + "\nสมาชิกผู้ติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]
              //             + "\nประเภทงาน : " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]
              //             + "\nวันที่ติดตาม : " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy");




              //   var memo_due_customer = formData['due_date'];
              //   var memo_contact_person = '' ;
              //   var memo_call_status = '' ;
              //   var memocust_name = formData['cust_name'];
              //   var memo_proof_of_payment = formData['money'] ;
              //   var memo_location_get_money = formData['gps'] ;
              //   var memotype_trace = formData['type_trace'] ;
              //   var memotype_trace2 = formData['type_trace'] ;
              // var query = "INSERT INTO tbmemo(update_user, create_user, memo_ctt_code, memo_branch, memo_contact_person, memo_description, memo_due_customer, memo_call_status, memo_proof_of_payment, memo_location_get_money) VALUES ('"+update_user+"','"+create_user+"','"+memo_ctt_code+"','"+BCT.getReportT_RAFCO_NameBrand(ctt_code)+"','"+memo_contact_person+"','"+memotype_trace+"','"+memo_due_customer+"','"+memo_call_status+"', '"+memo_proof_of_payment+"', '"+memo_location_get_money+"');";
              // var xml = loadXMLQueryInsertUpdateMulti('RDS', 'BCT_AMS2_RAFCO', query);
              // saveMemo("การติดตาม ",data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")],"ลูกค้าชื่อ "+ data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]+" สถานะการติดตาม "+data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")] +" follow-up "+data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")] + " รายละเอียด " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")] + " สมาชิกผู้ติดตาม "+data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]+" ประเภทงาน "+data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]+" วันที่ติดตาม "+BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy") ,formData['due_date'],formData['money'],formData['gps'],formData['member_email1'],formData['member_email1']);
              //  saveMemo("การติดตาม ",data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")],memo_description ,formData['due_date'],formData['money'],formData['gps']);

              saveMemo("การติดตาม", "สถานะการติดตาม " + data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")], "follow-up " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")], "รายละเอียด" + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")], "สมาชิกผู้ติดตาม " + data[0][BCT.numberPositionValueByFliedName(filed, "สมาชิกผู้ติดตาม")], "ประเภทงาน " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")], "นัดหมาย" + data[0][BCT.numberPositionValueByFliedName(filed, "นัดหมาย")] + " วันที่ติดตาม " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy"), formData['member_email1'], formData['member_email1']);
              var arrPic = [];
              var arrPic = [];
              //////เพิ่มส่งรูป   	รูป2	รูป3	รูป4
              var pic1 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป1")];
              var pic2 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป2")];
              var pic3 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป3")];
              var pic4 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป4")];
              if (pic1 != "") { arrPic.push(pic1); }
              if (pic2 != "") { arrPic.push(pic2); }
              if (pic3 != "") { arrPic.push(pic3); }
              if (pic4 != "") { arrPic.push(pic4); }
              for (var aa = 0; aa < arrPic.length; aa++) {
                try {
                  BCT.Telegramsend_pkg_fix('-1001753733819', '', arrPic[aa])//เก็บแก้ rafco
                  BCT.Telegramsend_pkg_fix('-1001631928835', arrPic[aa], ''); //batterry

                  //                BCT.LineNotify2("ZzRGz2f7NkgCa2DftbHXAOpi46o7QriB9KSzqLw8ErI", "", "","","",arrPic[aa]);
                } catch (e) {

                }
              }



              //            BCT.LineNotify("wkReYHfbCjGPoOjDeOfEjwidOVk8V6F93bg33qHEzYZ", "", message);
              rangeStatus.setValue("ส่งแล้ว")
              Logger.log(message);
            }


            ///update grant_location  
            try {
              BCT.updateLocationGrantRafco(formData['ctt_code'], formData['gps']);
            } catch (e) { }





          } else if (spreadsheet_id == "1-0xEKSKi5wdRNoN7KG3onYOAGpQCJ4w25SMUeoYNc2U") {

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            SpreadsheetApp.flush();
            var ss = SpreadsheetApp.openById(spreadsheet_id);
            var sheet = ss.getSheetByName("รายงานการตรวจสอบหลักทรัพย์");
            //          var data = sheet.getRange("E2:E").getValues();
            var lastRow = sheet.getLastRow();
            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();
            var filed = sheet.getRange(10, 1, 1, sheet.getLastColumn()).getValues();
            var rangeStatus = sheet.getRange(lastRow, BCT.numberColumnByFliedName(filed, "สถานะส่งไลน์"));
            var status = rangeStatus.getValue();
            if (status != "ส่งแล้ว") {

              var message = "💪เรือง แจ้งสถานะกฏหมาย"

                + "\n👫เลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")]
                + "\n👫ลูกค้าชื่อ : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]
                + "️\n🚔️สถานะงาน800UP : " + data[0][BCT.numberPositionValueByFliedName(filed, "สถานะงานกฏหมาย")]
                + "️\n🚔️follow-up : " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")]
                + "\n📝รายละเอียด : " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")]
                + "\n\n👮‍♂️สมาชิกผู้ติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]
                + "\n📝ประเภทงาน : " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]
                + "\n📆วันที่ติดตาม : " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy");



              BCT.Telegramsend_pkg_fix('-1001753733819', message, ''); //เก็บแก้ rafco
              BCT.Telegramsend_pkg_fix('-1001631928835', message, ''); //batterry

              //   var update_user = Session.getActiveUser().getEmail();
              //   var create_user = Session.getActiveUser().getEmail();
              //   var memo_ctt_code = formData['ctt_code'] ; 
              //  var memo_description ="การติดตาม "
              //             + "\nเลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")]
              //             + "\nลูกค้าชื่อ : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]
              //             + "\nสถานะงาน800UP : " + data[0][BCT.numberPositionValueByFliedName(filed, "สถานะงานกฏหมาย")]
              //             + "\nfollow-up : " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")]
              //             + "\nรายละเอียด : " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")]
              //             + "\nสมาชิกผู้ติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]
              //             + "\nประเภทงาน : " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]
              //             + "\nวันที่ติดตาม : " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy");




              //   var memo_due_customer = formData['due_date'];
              //   var memo_contact_person = '' ;
              //   var memo_call_status = '' ;
              //   var memocust_name = formData['cust_name'];
              //   var memo_proof_of_payment = formData['money'] ;
              //   var memo_location_get_money = formData['gps'] ;
              //   var memotype_trace = formData['type_trace'] ;
              //   var memotype_trace2 = formData['type_trace'] ;
              // var query = "INSERT INTO tbmemo(update_user, create_user, memo_ctt_code, memo_branch, memo_contact_person, memo_description, memo_due_customer, memo_call_status, memo_proof_of_payment, memo_location_get_money) VALUES ('"+update_user+"','"+create_user+"','"+memo_ctt_code+"','"+BCT.getReportT_RAFCO_NameBrand(ctt_code)+"','"+memo_contact_person+"','"+memotype_trace+"','"+memo_due_customer+"','"+memo_call_status+"', '"+memo_proof_of_payment+"', '"+memo_location_get_money+"');";
              // var xml = loadXMLQueryInsertUpdateMulti('RDS', 'BCT_AMS2_RAFCO', query);
              // saveMemo("การติดตาม ",data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")],"ลูกค้าชื่อ "+ data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]+" สถานะการติดตาม "+data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")] +" follow-up "+data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")] + " รายละเอียด " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")] + " สมาชิกผู้ติดตาม "+data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิกผุ้ติดตาม")]+" ประเภทงาน "+data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]+" วันที่ติดตาม "+BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy") ,formData['due_date'],formData['money'],formData['gps'],formData['member_email1'],formData['member_email1']);
              //  saveMemo("การติดตาม ",data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")],memo_description ,formData['due_date'],formData['money'],formData['gps']);

              saveMemo("การติดตาม", "สถานะการติดตาม " + data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะ การติดตาม")], "follow-up " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")], "รายละเอียด" + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")], "สมาชิกผู้ติดตาม " + data[0][BCT.numberPositionValueByFliedName(filed, "สมาชิกผู้ติดตาม")], "ประเภทงาน " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")], "นัดหมาย" + data[0][BCT.numberPositionValueByFliedName(filed, "นัดหมาย")] + " วันที่ติดตาม " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy"), formData['member_email1'], formData['member_email1']);
              var arrPic = [];
              var arrPic = [];
              //////เพิ่มส่งรูป   	รูป2	รูป3	รูป4
              var pic1 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป1")];
              var pic2 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป2")];
              var pic3 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป3")];
              var pic4 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป4")];
              if (pic1 != "") { arrPic.push(pic1); }
              if (pic2 != "") { arrPic.push(pic2); }
              if (pic3 != "") { arrPic.push(pic3); }
              if (pic4 != "") { arrPic.push(pic4); }
              for (var aa = 0; aa < arrPic.length; aa++) {
                try {
                  BCT.Telegramsend_pkg_fix('-1001753733819', '', arrPic[aa])//เก็บแก้ rafco
                  BCT.Telegramsend_pkg_fix('-1001631928835', arrPic[aa], ''); //batterry

                  //                BCT.LineNotify2("ZzRGz2f7NkgCa2DftbHXAOpi46o7QriB9KSzqLw8ErI", "", "","","",arrPic[aa]);
                } catch (e) {

                }
              }



              //            BCT.LineNotify("wkReYHfbCjGPoOjDeOfEjwidOVk8V6F93bg33qHEzYZ", "", message);
              rangeStatus.setValue("ส่งแล้ว")
              Logger.log(message);
            }


            ///update grant_location  
            try {
              BCT.updateLocationGrantRafco(formData['ctt_code'], formData['gps']);
            } catch (e) { }





          } else if (spreadsheet_id == "1eMtXOnVYkD8WUnuxfAj8Cdwrwm8nbge0Rv2k0f0pT-w") {

            // แทรกข้อมูลลงในสเปรดชีตโดยใช้ Firebase โดยอัตโนมัติ
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            // บันทึกการเปลี่ยนแปลงทั้งหมดใน SpreadsheetApp
            SpreadsheetApp.flush();

            // เปิดสเปรดชีตโดยใช้ ID ของมัน
            var ss = SpreadsheetApp.openById(spreadsheet_id);

            // ดึงเอาแผ่นงานที่มีชื่อว่า "รายงานการตรวจสอบหลักทรัพย์"
            var sheet = ss.getSheetByName("รายงานการตรวจสอบหลักทรัพย์");

            // ดึงเอาหมายเลขแถวสุดท้ายของแผ่นงาน
            var lastRow = sheet.getLastRow();

            // ดึงข้อมูลจากแถวสุดท้าย (ทุกคอลัมน์)
            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();

            // ดึงชื่อฟิลด์จากแถวที่ 10 (สมมติว่าแถวที่ 10 คือหัวข้อคอลัมน์)
            var filed = sheet.getRange(10, 1, 1, sheet.getLastColumn()).getValues();

            // ดึงสถานะจากแถวสุดท้ายจากคอลัมน์ "สถานะส่งไลน์"
            var rangeStatus = sheet.getRange(lastRow, BCT.numberColumnByFliedName(filed, "สถานะส่งไลน์"));
            var status = rangeStatus.getValue();

            // ตรวจสอบว่าสถานะยังไม่เป็น "ส่งแล้ว"
            if (status != "ส่งแล้ว") {

              // สร้างข้อความที่จะส่ง
              var message = "💪เรือง แจ้งสถานะ การติดตาม"
                + "\n👫เลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, "เลขที่สัญญาลูกค้า")]
                + "\n👫ลูกค้าชื่อ : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อลูกค้า")]
                + "️\n🚔️สถานะการติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "แจ้งสถานะงาน")]
                + "️\n🚔️follow-up : " + data[0][BCT.numberPositionValueByFliedName(filed, "follow-up")]
                + "\n📝รายละเอียด : " + data[0][BCT.numberPositionValueByFliedName(filed, "ลายละเอียด")]
                + "\n\n👮‍♂️สมาชิกผู้ติดตาม : " + data[0][BCT.numberPositionValueByFliedName(filed, "ชื่อสมาชิก")]
                + "\n📝ประเภทงาน : " + data[0][BCT.numberPositionValueByFliedName(filed, "ประเภทงาน")]
                + "\n📆วันที่ติดตาม : " + BCT.getFormatDate(data[0][BCT.numberPositionValueByFliedName(filed, "Timestamp")], "dd/MM/yyyy");

              // ส่งข้อความไปยังกลุ่ม Telegram ที่ระบุ โดยใช้ฟังก์ชัน Telegramsend_pkg_fix
              BCT.Telegramsend_pkg_fix('-1001984019173', message, '')

              // สร้างอาร์เรย์เพื่อเก็บ URL ของรูปภาพ
              var arrPic = [];

              // ดึง URL ของรูปภาพจากข้อมูลและเพิ่มลงในอาร์เรย์หากมี
              var pic1 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป1")];
              var pic2 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป2")];
              var pic3 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป3")];
              var pic4 = data[0][BCT.numberPositionValueByFliedName(filed, "รูป4")];
              if (pic1 != "") { arrPic.push(pic1); }
              if (pic2 != "") { arrPic.push(pic2); }
              if (pic3 != "") { arrPic.push(pic3); }
              if (pic4 != "") { arrPic.push(pic4); }

              // วนลูปผ่านแต่ละรูปภาพและส่งไปยังกลุ่ม Telegram ที่ระบุ
              for (var aa = 0; aa < arrPic.length; aa++) {
                try {
                  BCT.Telegramsend_pkg_fix('-1001984019173', '', arrPic[aa]) // ส่งรูปภาพ
                } catch (e) {
                  // จัดการข้อผิดพลาดที่เกิดขึ้นโดยไม่แสดงอะไร
                }
              }

              // อัพเดตสถานะเป็น "ส่งแล้ว" หลังจากส่งข้อความและรูปภาพเสร็จสิ้น
              rangeStatus.setValue("ส่งแล้ว")

              // บันทึกข้อความลงในล็อกเพื่อใช้ในการตรวจสอบข้อผิดพลาด
              Logger.log(message);
            }



            // ดึงประเภทของการติดตามจากฟอร์มข้อมูล
            var type_trace = formData['type_trace'];
            var ctt_code_2 = formData['ctt_code'];
            var time = formData['time'];
            // var cust_name = formData['cust_name'];
            // var surety_name = formData['surety_name'];


            // เปิดสเปรดชีตโดยใช้ ID ของมัน
            var ssG = SpreadsheetApp.openById(spreadsheet_id);

            // เข้าถึงแผ่นงานที่มีชื่อว่า 'B1_หลังฟ้อง'
            var sheetG = ssG.getSheetByName('B1_หลังฟ้อง');

            // ดึงชื่อฟิลด์จากแถวที่ 8 (สมมติว่าแถวที่ 8 คือหัวข้อคอลัมน์)
            var fieldsG = BCT.getFields(sheetG, 8, 1, 0);

            // คำนวณหมายเลขแถวสุดท้ายและเพิ่ม 1 เพื่อเริ่มที่แถวถัดไป
            var startrow = 10;
            var valuesALL = BCT.getValuesAll(sheetG, startrow, 1);
            for (var e = 0; e < valuesALL.length; e++) {
              var ctt_code = valuesALL[e][BCT.numberPositionValueByFliedName(fieldsG, "ctt_code")]

              if (ctt_code == ctt_code_2) {



                if (type_trace == ' คัดทร.14/1') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note1')).setValue(time);
                } else if (type_trace == 'คัดทะเบียนสมรส') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note2')).setValue(time);
                } else if (type_trace == 'คัดกรรมสิทธิที่ดิน') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note3')).setValue(time);
                } else if (type_trace == 'คัดกรรมสิทธิ์รถยนต์') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note4')).setValue(time);
                } else if (type_trace == 'ลงพื้นที่ตรวจสอบผู้กู้') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note5')).setValue(time);
                } else if (type_trace == 'ลงพื้นที่ตรวจสอบผู้ค้ำ') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note6')).setValue(time);
                } else if (type_trace == 'ลงพื้นที่ตรวจสอบผู้กู้และผุ้ค้ำ') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note7')).setValue(time);
                } else if (type_trace == 'ถ่ายรูปทรัพย์ที่จะยึด') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note8')).setValue(time);
                } else if (type_trace == 'ทำแผนที่ตั้งทรัพย์') {
                  sheetG.getRange(startrow + e, BCT.numberColumnByFliedName(fieldsG, 'note9')).setValue(time);
                }
              }
            }


          } else if (spreadsheet_id == '1XgSGnrp3Svbsnp4fixrbbBoyhWuhsXXq9GrFLMXBSRU') {

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            var ss = SpreadsheetApp.openById(spreadsheet_id);
            var sheet = ss.getSheetByName("B1_การตอบแบบฟอร์ม");
            //          var data = sheet.getRange("E2:E").getValues();
            var lastRow = sheet.getLastRow();

            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();
            var filed = sheet.getRange(29, 1, 1, sheet.getLastColumn()).getValues();


            //            โม๊ะ (ภาพนิ่ง)|ต้น (ภาพนิ่ง)|โอ๊ต (VDO)|เบน (ดีไซน์)|คิว (ดีไซน์)
            //          โม๊ะ 6006082
            //ต้น 5704073
            //โอ๊ต 6105050
            //เบน 6008124
            //คิว 6310081
            if (data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] == "โม๊ะ (ภาพนิ่ง)") {
              var token = BCT.CheckTokenOfIDFromPKGemployee("6006082")
            } else if (data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] == "ต้น (ภาพนิ่ง)") {
              var token = BCT.CheckTokenOfIDFromPKGemployee("5704073")
            } else if (data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] == "โอ๊ต (VDO)") {
              var token = BCT.CheckTokenOfIDFromPKGemployee("6105050")
            } else if (data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] == "เบน (ดีไซน์)") {
              var token = BCT.CheckTokenOfIDFromPKGemployee("6008124")
            } else if (data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] == "คิว (ดีไซน์)") {
              var token = BCT.CheckTokenOfIDFromPKGemployee("6310081")
            }


            //           var token ="";



            var subject = "แจ้งงานทำ ADs สำหรับทีม Content";
            var message = "✍️ ID สมาชิกผู้กรอกข้อมูล: " + data[0][BCT.numberPositionValueByFliedName(filed, 'id_from')] + "";
            message = "\n";
            message = "✍️ ชื่อผู้แจ้งงาน :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'id_from_name')] + "";
            message = "\n";
            message = "✍️ สังกัด BU :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'bu')] + "";
            message = "\n";
            message = "✍️ รายละเอียดของ Ads ที่ต้องการ :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'title')] + "";
            message = "\n";
            message = "✍️ Link ตัวอย่าง (หากมี) :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'linkimg')] + "";
            message = "\n";
            message = "✍️ ความต้องการใช้ชิ้นงาน :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'numberad')] + "";
            message = "\n";
            message = "✍️ ผู้รับผิดชอบชิ้นงานนี้ :: " + data[0][BCT.numberPositionValueByFliedName(filed, 'namerequest')] + "";
            message = "\n";
            message = "✍️ กรุณากดรับงานด้วย:: http://ags.im/gRee0l";


            try {
              BCT.LineNotify2(token, subject, message, "", "", "")

            } catch (e) {

            }




          } else if (spreadsheet_id == '1FpEzvdl3Kaagf42pswyqaf_ZyAMb37Q3Xbr3tOH6oFU' && sheetName == "B2_บันทึกค่าใช้จ่ายรถยึด") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            var ss = SpreadsheetApp.openById(spreadsheet_id);
            var sheet = ss.getSheetByName("B2_บันทึกค่าใช้จ่ายรถยึด");
            var lastRow = sheet.getLastRow();
            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();
            var filed = sheet.getRange(13, 1, 1, sheet.getLastColumn()).getValues();

            var ctt_code = data[0][BCT.numberPositionValueByFliedName(filed, 'ctt_code')];
            var query = "SELECT * FROM tbcontract WHERE pamco_ctt_code='" + ctt_code + "'";
            var datasPamco = BCT.loadJSONDatas(BCT.getDBServer(), 'BCT_PAMCO_RAFCO', query);
            if (datasPamco.length > 0) {
              //            try{
              if (BCT.valueInData(datasPamco[0], 'pamco_spreadsheets_key') != '') {
                var ssPamco = SpreadsheetApp.openById(BCT.valueInData(datasPamco[0], 'pamco_spreadsheets_key'));
                var sheetPamco = ssPamco.getSheetByName('A2_ค่าใช้จ่ายค้างจ่าย_AMS2');
                var rowStartValuePamco = sheetPamco.getLastRow() + 1;
                var rowFieldsPamco = BCT.form_getRowFieldsByKey(sheetPamco, 'process');
                var fieldsPamco = BCT.getFields(sheetPamco, rowFieldsPamco, 1, 0);

                var ssW = SpreadsheetApp.openById("1FpEzvdl3Kaagf42pswyqaf_ZyAMb37Q3Xbr3tOH6oFU");
                var shW = ssW.getSheetByName("B2_บันทึกค่าใช้จ่ายรถยึด");
                var rowByKeyW = BCT.form_getRowByKey(shW, 'process');
                var rowStartValueW = rowByKeyW + 5;
                var rowFieldPutW = rowByKeyW + 3;
                var fieldW = BCT.getField(shW, rowFieldPutW, 1, 0);
                var valuesAllW = BCT.getValuesAll(shW, rowStartValueW, 1);

                var nowW = BCT.getFormatDate(new Date(), 'dd/MM/yyyy HH:mm:ss');
                var datasPamcoInsert = [];
                for (var vw = 0; vw < valuesAllW.length; vw++) {
                  var rowW = vw + rowStartValueW;
                  var valuesW = [valuesAllW[vw]];
                  var ctt_codeW = BCT.valueByFliedName(fieldW, valuesW, 'ctt_code');
                  var add_to_pamcoW = BCT.valueByFliedName(fieldW, valuesW, 'add_to_pamco');
                  if (ctt_codeW == ctt_code && add_to_pamcoW == '') {
                    var jsonDataW = {};
                    jsonDataW['ctt_code'] = ctt_code;
                    var st_date = BCT.valueByFliedName(fieldW, valuesW, 'time');
                    if (st_date == '') {
                      st_date = new Date();
                    }
                    jsonDataW['st_date'] = st_date;
                    jsonDataW['debt_total'] = BCT.valueByFliedName(fieldW, valuesW, 'total_repair_value');
                    jsonDataW['cost_name'] = BCT.valueByFliedName(fieldW, valuesW, 'expenses');
                    jsonDataW['debt_successall'] = 1;
                    datasPamcoInsert.push(jsonDataW);
                    shW.getRange(rowW, BCT.numberColumnByFliedName(fieldW, 'add_to_pamco')).setValue(nowW);
                  }
                }
                BCT.autoInsert_Json(sheetPamco, fieldsPamco, datasPamcoInsert, rowStartValuePamco, 1);
              }
              //            }catch(e){}
            }

            var subject = "แจ้งพัฒนาหนี้บันทึกรายการซ่อม/น้ำมัน";
            var message = "เลขที่สัญญา : " + data[0][BCT.numberPositionValueByFliedName(filed, 'ctt_code')] + "";
            message += "\nชื่อลูกค้า : " + data[0][BCT.numberPositionValueByFliedName(filed, 'cust_name')];
            message += "\nรายการค่าใช้จ่าย :  " + data[0][BCT.numberPositionValueByFliedName(filed, 'title')];
            message += "\nยอดเงิน ";
            message += "\nUSD : " + data[0][BCT.numberPositionValueByFliedName(filed, 'price')];
            message += "\nKHR : " + data[0][BCT.numberPositionValueByFliedName(filed, 'price_khr')];
            message += "\nวันที่ส่งข้อมูล  :  " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
            message += "\n\nหมายเหตุ กรณี เงิน KHR  Exchange Rate  4000";
            try {
              BCT.Telegramsend_pkg_fix("-1001749320388", message, "");
              BCT.LineNotify2("7Opu4mJN9ldFgNvDsVXqrTvw7VuvACIX1hCpAbCZuf2", subject, message, "", "", "");
            } catch (e) {

            }
          } else if (spreadsheet_id == '1OTOg-PYh-TRMA5tEQIFP4lrYJGc-6gvMNJZzXWA7MDg') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_Forms_ตอบรับ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);
          } else if (spreadsheet_id == '1CGDAMZzPA4xEYjya6U8EC8ATYcqdCz3qcOTLpVvsqzs') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคําขอเอาประกันอุบัติเหตุ"); ///ของวิริยะ
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);
          } else if (spreadsheet_id == '1-Q1Q2Kklre4p75yvOKtV6arO3vBCplW09l9p2dlJ-aQ') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_จองห้องประชุม"); ///ของวิริยะ
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);
          } else if (spreadsheet_id == "17TsVY3Pj6VpQWiRwdNotSUJ2s2033rM9TaojqEz7UCA" && sheetName == "B5_ข้อมูลราคาที่ดิน") {
            //บันทึกข้อมูลลงฐาน
            BCT.autoInsertToSpreadsheetByFirebase("17TsVY3Pj6VpQWiRwdNotSUJ2s2033rM9TaojqEz7UCA", "B5_ข้อมูลราคาที่ดิน", formData, optionField);

            var ssDes = SpreadsheetApp.openById("17TsVY3Pj6VpQWiRwdNotSUJ2s2033rM9TaojqEz7UCA");
            var shDes = ssDes.getSheetByName("B5_ข้อมูลราคาที่ดิน");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);

          } else if (spreadsheet_id == '1e9b-KUUOqX2J6l0mhrn2UzTFq8clS1-TpnseNQJtg6o') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคำขอเอาประกันภัยอุบัติเหตุสำหรับรายย่อย");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1NMpwTX8oQBeWaaY4bRronli69QezMBZfZXCy_ll3JKE') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลใบคำขอเอาประกันภัย วิริยะ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '13yxJDUL-6NfQCteWQkEZfTUKsj74tr0cfog4FN9F0P8') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคำขออัคคีภัยบ้านอยู่อาศัย");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1RA07Ul6wBdV4dVWf5ytU4Xn5aj9GMevR4AbjpkSdPiw') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคําขอเอาประกันอุบัติเหตุ"); ////ของนวกิจ
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '19iEMZaMtY3-QEI2KXfSpG1F--hDnQdcg_Y57elKdulo') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคําขอเอาประกันภัยรถยนต์"); ////ของนวกิจ
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1n7qCiL_parlwsIYFwCTgw_0mkGWYD1SrNiO9LzKhd0A') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลคําขอเอาประกันอัคคีภัย"); ////ของนวกิจ
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1gyhi_lIf14SYfNGA4kN20CAYsZbNZI6PAMS-ff5w0d8' && sheetName == "B1_ข้อมูลลูกค้าขอปรับโครงส้รางหนี้") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลลูกค้าขอปรับโครงส้รางหนี้"); ////ของ Onepage มหกรรม เก็บเงิน/ปรับโครงสร้างหนี้ _RPLC
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1gyhi_lIf14SYfNGA4kN20CAYsZbNZI6PAMS-ff5w0d8' && sheetName == "B2_เอกสารปรับโครงสร้างหนี้") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B2_เอกสารปรับโครงสร้างหนี้"); ////ของ Onepage เอกสารบทบันทึก ปรับโครงสร้างหนี้_RPLC
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1qQXOwZcLFjPB6IqRZYFUzoaag9IubVRPFJyNhrJz9Qs') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูล_ราคาประเมินที่ดิน");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);




          } else if (spreadsheet_id == '10T55p0kJ1up3OeRIOeqFptPr5kegbNCGyg4Ktj_SWfI') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_Upload_POPUP_ADS");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);




          } else if (spreadsheet_id == '1250aF7w9A3k0rGIIwu7fqByo2esKNJdNhG2JBmYa85s') {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_Upload_POPUP_ADS");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);




          } else if (spreadsheet_id == '1Yg5j8r-hmqZpl89EeHqnCI8tdjY32Rzpfkk_IVGEZmQ') { //One Page เก็บข้อมูล งานซ่อมแล้วเสร็จ FAM
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_Forms_ตอบรับ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);







          } else if (spreadsheet_id == '1N2FU5leL69B9BjSgsY5yRAjsXzoTdPL2uNEL0bQhNGw' && sheetName == "B1_ใบอนุญาตสมาชิก_ตอบรับ") {//BCT ใบช่างเข้างานวันหยุด/นอกเวลาปฏิบัติงาน
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ใบอนุญาตสมาชิก_ตอบรับ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);




          } else if (spreadsheet_id == '1fkhmJzL8JIV9iX2keKlJCegyOOYnTIR4b0GwPwv9fQk') {
            ////////// เพิ่มระบบ อัพโหลดรถ Vmotor ///////////////

            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลการอัพโหลด");


            var carbrand = formData['carbrand'];
            var cartypela = formData['cartypela'];
            var carRegisNo = formData['carregisno'];
            var carCodeFromBCT = formData['carcodefrombct'];
            var carPrice = formData['carprice'];
            var carbranch = formData['carbranch'];
            var carmodel = formData['carmodel'];
            var carYear = formData['caryear'];
            var carMileage = formData['carmileage'];
            var carcolor = formData['carcolor'];
            var carfuel = formData['carfuel'];
            var carcc = formData['carcc'];
            var cartransmission = formData['cartransmission'];
            var carImages = formData['carImages'];
            var carImageBanner = formData['carImageBanner'];
            var cardate = formData['cardate'];

            var carModelID = "";
            var carBranchID = "";
            var carBrandID = "";
            var carCCID = "";
            var carTypeID = "";
            var carTransmissionID = "";
            var carFuelTypeID = "";
            var carColorID = "";
            var carConditionID = "1";
            var carTypeID = "1";
            //var create_user = Session.getActiveUser().getEmail();
            var create_user = "songpondaa@prachakij.com";
            var date_carupload = BCT.getFormatDate(new Date(), "dd/MM/yyyy");


            if (carmodel == 'MSX') {
              carModelID = '2';
            } else if (carmodel == 'SCOOPY') {
              carModelID = '12';
            } else if (carmodel == 'R-15') {
              carModelID = '13';
            } else if (carmodel == 'CLICK') {
              carModelID = '14';
            } else if (carmodel == 'MSLAZ') {
              carModelID = '15';
            } else if (carmodel == 'WAVE 100') {
              carModelID = '16';
            } else if (carmodel == 'WAVE 100s') {
              carModelID = '16';
            } else if (carmodel == 'WAVE 110') {
              carModelID = '16';
            } else if (carmodel == 'WAVE 110i') {
              carModelID = '16';
            } else if (carmodel == 'WAVE 125') {
              carModelID = '16';
            } else if (carmodel == 'PCX') {
              carModelID = '17';
            } else if (carmodel == 'CBR') {
              carModelID = '18';
            } else if (carmodel == 'ZOOMER-X') {
              carModelID = '19';
            }


            if (carbranch == 'ຮ້ານວຽງມໍເຕີ້​ ທ່າພະລານໄຊ') {
              carBranchID = '1';
            } else if (carbranch == 'ຮ້ານຫລວງພະບາງມໍເຕີ້ເຊວ') {
              carBranchID = '2';
            } else if (carbranch == 'ຮ້ານມົງຄົນມໍເຕີ້ ສະຫວັນນະເຂດ') {
              carBranchID = '3';
            } else if (carbranch == 'ຮ້ານຈະເລີນມໍເຕີ້ ປາກເຊ') {
              carBranchID = '4';
            }

            if (carbrand == 'HONDA') {
              carBrandID = '1';
            } else if (carbrand == 'YAMAHA') {
              carBrandID = '2';
            }


            if (carcc == '100') {
              carCCID = '1';
            } else if (carcc == '110') {
              carCCID = '2';
            } else if (carcc == '125') {
              carCCID = '3';
            } else if (carcc == '150') {
              carCCID = '4';
            } else if (carcc == '250') {
              carCCID = '5';
            }


            if (cartypela == 'ລົດຈັກໃໝ') {
              carTypeID = '1';
            } else if (cartypela == 'ລົົດຈັກມືສອງ') {
              carTypeID = '2';
            }
            if (cartransmission == 'ອັດຕະໂນມັດ') {
              carTransmissionID = '1';
            } else if (cartransmission == 'ລະບົບເກຍ') {
              carTransmissionID = '2';
            }

            if (carfuel == 'ເບັນຊິນ') {
              carFuelTypeID = '1';
            } else if (carfuel == 'ກາຊວນ') {
              carFuelTypeID = '2';
            }

            if (carcolor == 'ແດງ') {
              carColorID = '1';
            } else if (carcolor == 'ຂຽວ') {
              carColorID = '8';
            } else if (carcolor == 'ຟ້າ') {
              carColorID = '3';
            } else if (carcolor == 'ດຳ') {
              carColorID = '6';
            } else if (carcolor == 'ເຫຼືອງ') {
              carColorID = '4';
            } else if (carcolor == 'ສົ້ມ') {
              carColorID = '5';
            } else if (carcolor == 'ຂາວ') {
              carColorID = '7';
            }


            ////////// อัพโหลดรูปรถหลายๆ รูป ///////////////         


            var carImageID = "-";

            //          if(carImages!=""){
            //            var Car_Image = carImages.split(",");
            //            for (var b = 0; b < Car_Image.length; b++) {
            //              var Car_Image = Car_Image[b];
            //              if (Car_Image[b] != undefined) {
            //                var linkCarImage = Car_Image[b];
            //                
            //                
            //                var query = "insert into tb_carImage";
            //                query += "(linkCarImage,carImageID)";
            //                query += " VALUE ";
            //                query += "('"+linkCarImage +"','"+carImageID+"')";
            //                var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'mapp_vmotor ', query);
            //              }
            //              
            //            }    


            var carSoldOutStatus = "N";
            var carRecommendStatus = "Y";
            var carStatusDisableData = "N";



            var carTitleEN = carbrand + " " + carmodel;
            var carTitleLA = carbrand + " " + carmodel;
            var carDetailsEN = "Last Updated : " + date_carupload;
            var carDetailsLA = cartypela + "ອັບເດດລ່າສຸດ : " + date_carupload;


            var carID = "-";
            var carCode = "-";

            var queryInsert = "INSERT INTO tb_car";
            queryInsert += "(create_user,carBrandID,carCCID,carFuelTypeID,carTransmissionID,carColorID,carBranchID,carModelID,carImages,carImageBanner,carMileage,carYear,carPrice,carCodeFromBCT,carRegisNo,carSoldOutStatus,carRecommendStatus,carStatusDisableData,carTitleEN,carTitleLA,carDetailsLA,carID,carCode,carDetailsEN,carTypeID,carConditionID,carImageID)";
            queryInsert += " VALUE ";
            queryInsert += "('" + create_user + "','" + carBrandID + "','" + carCCID + "', '" + carFuelTypeID + "', '" + carTransmissionID + "', '" + carColorID + "','" + carBranchID + "','" + carModelID + "','" + carImages + "','" + carImageBanner + "','" + carMileage + "','" + carYear + "','" + carPrice + "','" + carCodeFromBCT + "','" + carRegisNo + "','" + carSoldOutStatus + "','" + carRecommendStatus + "','" + carStatusDisableData + "','" + carTitleEN + "','" + carTitleLA + "','" + carDetailsLA + "','" + carID + "','" + carCode + "','" + carDetailsEN + "','" + carTypeID + "','" + carConditionID + "','" + carImageID + "')";
            //  return queryInsert;
            var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'mapp_vmotor', queryInsert)



            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            //  shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')+""+rowUpdate+":"+BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange(rowInsert, 2)).setValue("X");
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


          } else if (spreadsheet_id == '1ukvoLmGIJJDpE45q3Qrny_hBXxiSa0B8lo2cHmdKQIo') {
            ////////// เพิ่มระบบ อัพโหลดรถ AICP ///////////////

            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลการอัพโหลด");


            var carbrand = formData['carbrand'];
            var cartypela = formData['cartypela'];
            var carRegisNo = formData['carregisno'];
            var carCodeFromBCT = formData['carcodefrombct'];
            var carPrice = formData['carprice'];
            var carbranch = formData['carbranch'];
            var carmodel = formData['carmodel'];
            var carYear = formData['caryear'];
            var carMileage = formData['carmileage'];
            var carcolor = formData['carcolor'];
            var carfuel = formData['carfuel'];
            var carcc = formData['carcc'];
            var cartransmission = formData['cartransmission'];
            var carImages = formData['carImages'];
            var carImageBanner = formData['carImageBanner'];
            var cardate = formData['cardate'];
            var carModelID = "";
            var carBranchID = "";
            var carBrandID = "";
            var carCCID = "";
            var carTypeID = "";
            var carTransmissionID = "";
            var carFuelTypeID = "";
            var carColorID = "";
            var carConditionID = "";

            var create_user = "songpondaa@prachakij.com";
            // var create_user = Session.getActiveUser().getEmail();
            // var date_carupload = Utilities.formatDate(new Date(), "GMT+7", 'yyyy-MM-dd');


            if (carmodel == 'PCX') {
              carModelID = '1';
            } else if (carmodel == 'MSX') {
              carModelID = '2';
            } else if (carmodel == 'ADV') {
              carModelID = '3';
            } else if (carmodel == 'SCOOPY') {
              carModelID = '4';
            } else if (carmodel == 'KING LS') {
              carModelID = '5';
            } else if (carmodel == 'DREAM') {
              carModelID = '6';
            } else if (carmodel == 'MSLAZ') {
              carModelID = '7';
            } else if (carmodel == 'CB') {
              carModelID = '8';
            } else if (carmodel == 'BEAT') {
              carModelID = '9';
            } else if (carmodel == 'CLICK') {
              carModelID = '10';
            } else if (carmodel == 'ZOOMER X') {
              carModelID = '11';
            } else if (carmodel == 'SMASH') {
              carModelID = '12';
            } else if (carmodel == 'MX KING') {
              carModelID = '13';
            } else if (carmodel == 'NINJA') {
              carModelID = '14';
            } else if (carmodel == 'X-RIDE') {
              carModelID = '15';
            } else if (carmodel == 'WAVE') {
              carModelID = '16';
            } else if (carmodel == 'MIO') {
              carModelID = '17';
            } else if (carmodel == 'NEX') {
              carModelID = '18';
            } else if (carmodel == 'NINJA') {
              carModelID = '19';
            } else if (carmodel == 'CB') {
              carModelID = '20';
            } else if (carmodel == 'MAXIMA') {
              carModelID = '21';
            } else if (carmodel == 'CB400') {
              carModelID = '22';
            } else if (carmodel == 'MT') {
              carModelID = '23';
            } else if (carmodel == 'GPX DRONE') {
              carModelID = '24';
            } else if (carmodel == 'GPX POPZ') {
              carModelID = '25';
            } else if (carmodel == 'QBIX') {
              carModelID = '26';
            }




            if (carbranch == 'ភ្នំពេញ') {
              carBranchID = '1';
            } else if (carbranch == 'បាត់ដំបង') {
              carBranchID = '2';
            } else if (carbranch == 'សៀមរាប') {
              carBranchID = '3';
            } else if (carbranch == 'កំពង់ធំ') {
              carBranchID = '4';
            }


            if (carbrand == 'ហុងដា') {
              carBrandID = '1';
            } else if (carbrand == 'យ៉ាម៉ាហា') {
              carBrandID = '2';
            } else if (carbrand == 'ធីវីអេស') {
              carBrandID = '3';
            } else if (carbrand == 'ស៊ូហ៊្សូគី') {
              carBrandID = '4';
            } else if (carbrand == 'បាចា') {
              carBrandID = '5';
            } else if (carbrand == 'កាវ៉ាសាគិ') {
              carBrandID = '6';
            } else if (carbrand == 'អេចរេតា') {
              carBrandID = '7';
            }

            if (carcc == '100') {
              carCCID = '7';
            } else if (carcc == '110') {
              carCCID = '4';
            } else if (carcc == '125') {
              carCCID = '2';
            } else if (carcc == '150') {
              carCCID = '3';
            } else if (carcc == '250') {
              carCCID = '1';
            }

            if (cartypela == 'ម៉ូតូ') {
              carTypeID = '1';
            } else if (cartypela == 'កង់បី') {
              carTypeID = '2';
            }

            if (cartransmission == 'ອັດຕະໂນມັດ') {
              carTransmissionID = '1';
            } else if (cartransmission == 'ລະບົບເກຍ') {
              carTransmissionID = '2';
            }

            if (carfuel == 'សាំង') {
              carFuelTypeID = '1';
            } else if (carfuel == 'ប្រេងម៉ាស៊ូត') {
              carFuelTypeID = '2';
            } else if (carfuel == 'ហ្គាស') {
              carFuelTypeID = '3';
            } else if (carfuel == 'ហ្គាស+សាំង') {
              carFuelTypeID = '4';
            }

            if (carcolor == 'ក្រហម') {
              carColorID = '1';
            } else if (carcolor == 'បៃតង') {
              carColorID = '2';
            } else if (carcolor == 'ខៀវ') {
              carColorID = '3';
            } else if (carcolor == 'លឿង') {
              carColorID = '4';
            } else if (carcolor == 'ទឹកក្រូច') {
              carColorID = '5';
            } else if (carcolor == 'ខ្មៅ') {
              carColorID = '6';
            } else if (carcolor == 'ស') {
              carColorID = '7';
            } else if (carcolor == 'ស្លែ') {
              carColorID = '8';
            } else if (carcolor == 'ប្រផះ') {
              carColorID = '9';
            }



            var carSoldOutStatus = "N";
            var carRecommendStatus = "Y";
            var carStatusDisableData = "N";



            var carTitleEN = carmodel;
            var carTitleKM = carmodel;
            var carDetailsEN = "Good Machine";
            var carDetailsKM = "ម៉ាសុីនល្អ"; s


            var receiptNumber = "";

            for (var i = 0; i < 4; i++) {
              receiptNumber += Math.floor(Math.random() * 10);
            }


            carImageID = receiptNumber;
            var carImageID = receiptNumber;
            var carID = carImageID;
            var carCode = carImageID;

            var carImageBanner_link = formData['carImageBanner'].split(",");
            for (var a = 0; a < carImageBanner_link.length; a++) {
              var cariamgesbanner = carImageBanner_link[0];
            }
            var carImageBanner = cariamgesbanner;

            var queryInsert = "INSERT INTO tb_car";
            queryInsert += "(create_user,carBrandID,carCCID,carFuelTypeID,carTransmissionID,carColorID,carBranchID,carModelID,carImages,carImageBanner,carMileage,carYear,carPrice,carCodeFromBCT,carRegisNo,carSoldOutStatus,carRecommendStatus,carStatusDisableData,carTitleEN,carTitleKM,carDetailsEN,carDetailsKM,carID,carCode,carTypeID,carImageID)";
            queryInsert += " VALUE ";
            queryInsert += "('" + create_user + "','" + carBrandID + "','" + carCCID + "', '" + carFuelTypeID + "', '" + carTransmissionID + "', '" + carColorID + "','" + carBranchID + "','" + carModelID + "','" + carImages + "','" + carImageBanner + "','" + carMileage + "','" + carYear + "','" + carPrice + "','" + carCodeFromBCT + "','" + carRegisNo + "','" + carSoldOutStatus + "','" + carRecommendStatus + "','" + carStatusDisableData + "','" + carTitleEN + "','" + carTitleKM + "','" + carDetailsEN + "','" + carDetailsKM + "','" + carID + "','" + carCode + "','" + carTypeID + "','" + carImageID + "')";
            var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'Mapp_AICP_Motor', queryInsert)

            var statusDisableImage = "N";
            ////////// อัพโหลดรูปรถหลายๆ รูป ///////////////         

            if (carImages != "") {
              var cariamges_link = carImages.split(",");
              for (var b = 0; b < cariamges_link.length; b++) {
                var cariamges = cariamges_link[b];
                Logger.log("cariamges" + b)
                if (cariamges != undefined) {
                  var linkCarImage = cariamges;

                  var query = "INSERT INTO tb_carImage ";
                  query += "(linkCarImage,carImageID,statusDisableImage)";
                  query += " VALUE ";
                  query += "('" + linkCarImage + "','" + carImageID + "','" + statusDisableImage + "')";
                  var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'Mapp_AICP_Motor', query)
                }
              }
            }

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            //  shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')+""+rowUpdate+":"+BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange(rowInsert, 2)).setValue("X");
            BCT.saveDataSpreadsheetByTemplate(true, false, false);
          } else if (spreadsheet_id == '1dMIY8aecSEuW_a9MZHldVCfk8VVoasJfMT223R9xe0A') {

            var id_assset_full = "";
            var idAsset = formData["idAsset"];
            var prefigKey = idAsset + "-" + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yy");
            var query = "SELECT RIGHT(id_assset_full,4) as newId FROM Asset WHERE id_assset_full LIKE '" + prefigKey + "%' ORDER BY `newId`  DESC LIMIT 1";
            var datas = BCT.loadXMLDatas("RDS", "BCT_Asset_Pkg", query);
            var newValueKey = null;
            if (datas.length > 0) {
              var id = datas[0].getChild('newId').getValue();
              newValueKey = prefigKey + Utilities.formatString("%04d", Number(id) + 1);
            } else {
              newValueKey = prefigKey + Utilities.formatString("%04d", 1);
            }
            formData["id_assset_full"] = newValueKey;
            formData["create_time"] = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B3_onepage_บันทึกทรัพย์สิน");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);


            var url_web = "http://devdev.prachakij.com/fam/test.php?id_assset=" + newValueKey
            //  var url_img = BCT2.url_to_img(url_web, "test")

            var viewport = { 'width': 800, 'height': 630 }
            var clip = { 'x': 0, 'y': 50, 'width': 800, 'height': 580 }
            //     var imgs = BCT2.url_to_img(url_web, 'runing_', viewport, clip);
            var imgs_pdf = BCT.url_to_imgpdf(url_web, 'runing_', viewport, clip);

            Logger.log(imgs_pdf[0]["pdf"])
            //  {img={link=https://url2img-pdf.s3-ap-southeast-1.amazonaws.com/imgtest/runing__1_1661917535.jpeg}, pdf={link=https://url2img-pdf.s3-ap-southeast-1.amazonaws.com/imgkaran/karanbill_1661917539.pdf}}




            var member_id = formData["recorder_id"];
            var messages = "📢 แจ้ง คุณ : " + formData["recorder_id_name"];
            messages += "\n";
            messages += "💾 ระบบได้บันทึกทรัพย์สิน รายการ " + formData["name_asset"] + " เรียบร้อยแล้วค่ะ";
            messages += "\n";
            messages += "🖨 สามารถ Print รหัสทรัพย์สินที่ Link และนำไปติดที่ทรัพย์สิน ได้เลยค่ะ";
            messages += "\n";
            messages += "👉 Link รหัสทรัพย์สิน :: " + imgs_pdf[0]["pdf"]["link"];
            messages += "\n";
            messages += "";
            messages += "\n";
            messages += "☎️ หากมีข้อสงสัย สามารถติดต่อได้ที่ น้ำตาล FAM   โทร 211";
            messages += "\n";
            messages += "";
            messages += "\n";
            messages += "ขอบคุณค่ะ 🙏🙏";



            BCT.Telegramsend_pkg_fix(member_id, messages, "")

            if (formData["zone_buy"] == "เขต 1 สำนักงานใหญ่") {


            } else {
              BCT.Telegramsend_pkg_fix("-1001316067135", messages, "")
            }


          } else if (spreadsheet_id == '1yuZgcDqoakmHBTn_A9sFtSjrimuV7SDo_IBjB7fnq_g') {



            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_Forms_ตอบรับ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
            // BCT.saveDataSpreadsheetByTemplate(isSelect, isShowPopup, isJson)



          } else if (spreadsheet_id == '1guKLQ-l6k8V3dqDmH_Y531er5jFHozSEHDOQ05Re9ko') {



            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลการไกล่เกลี่ย");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
            // BCT.saveDataSpreadsheetByTemplate(isSelect, isShowPopup, isJson)



          } else if (spreadsheet_id == '15O-b1k4Ab-FNaNVhFh_0rrAYiWyHmUiKpmYAlLI4yfg') {



            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลลูกค้า");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
            // BCT.saveDataSpreadsheetByTemplate(isSelect, isShowPopup, isJson)



          } else if (spreadsheet_id == '1MnAHxWLrgiQ2qANcEpMDrcT-GngbAcjkq0lm1xufwlw' && sheetName == "B1_ลงทะเบียนผู้มีสิทใช้ BCT โอนเหรียญ") {

            // sdadsasdadsadsadsasa

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ลงทะเบียนผู้มีสิทใช้ BCT โอนเหรียญ");
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
            // BCT.saveDataSpreadsheetByTemplate(isSelect, isShowPopup, isJson)
            var dlt_id = BCT.DLT_getTopicIdByRunning("146");
            var json_data_h = {
              "create_time": Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss"),
              "create_user": formData["email_bct"],
              "process_name": "ลงทะเบียนข้อสิทธิ์โอนเหรียญ",
              "member_id": formData["member_id"],
              "bct_id": formData["bct_id"]
            }
            BCT.DLT_HederaPutMessageInTopic(dlt_id, json_data_h);


          } else if (spreadsheet_id == '1-0xEKSKi5wdRNoN7KG3onYOAGpQCJ4w25SMUeoYNc2U') {



            var ss = SpreadsheetApp.openById(spreadsheet_id);
            Logger.log("spreadsheet_id==" + spreadsheet_id);
            Logger.log("sheetName==" + sheetName);
            var sheet = ss.getSheetByName(sheetName);
            //          var data = sheet.getRange("E2:E").getValues();
            var updateRow = 0;
            var fields = BCT.getFields(sheet, 6, 1);
            var data = BCT.getValuesAll(sheet, 10, 1);
            for (var m = 0; m < data.length; m++) {
              if (data[m][BCT.numberColumnByFliedName(fields, "ctt_code") - 1] == formData['ctt_code']) {
                updateRow = 10 + m;
                break;
              }
            }
            //            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            BCT.autoInsert_JsonFixField(sheet, fields, [formData], updateRow, 1);

            //          var message = "ผลการอนุมัติปรับโครงสร้างหนี้";
            //          message+="\nผู้อนุมัติ  : "+formData["member_name"];
            //          message+="\nเลขที่สัญญา : "+formData["ctt_code"];
            //          message+="\nชื่่อลูกค้า : "+formData["cust_name"];
            //          message+="\nผลการอนุมัติ : "+formData["approve"];
            //          message+="\nลายละเอียดการอนุมัติ/ไม่อนุมัติ : "+formData["code802_codeบส802"];
            //          message+="\nCODE  ปรับโครงสร้าง : "+formData["RCA7"];
            //          try{
            //            BCT.LineNotify("T9rEO2OqPSH85pjLZcdkp3expsRl3EkocDYNZCet48x", "", message); //เก็บแก้
            //            //            BCT.LineNotify("N75bt4MkEoifRtyzG58H5Iyvhn3myAlsEAglY0pCymv", "", message); //เก็บแก้
            //          }catch(e){}


          } else if (spreadsheet_id == "1dF9tjl608rLQ4gJDFopcftpGQRVRCdHvlXyEp7jSgQc") {



            var ss = SpreadsheetApp.openById(spreadsheet_id);
            Logger.log("spreadsheet_id==" + spreadsheet_id);
            Logger.log("sheetName==" + sheetName);
            Logger.log("formData")
            Logger.log(formData['bu_admin'])
            //          formData{member_id=5912112, upload_img=, mail=taweesak@prachakij.com, tel=test, detail=test, time=2021-12-02 16:08:26, type=ปริ้นเตอร์, branch=test, member_id_name=นายทวีศักดิ์ รัตนชูโชค}


            //          return;
            //    _AAM

            var subject = "แจ้ง IT Support " + formData['bu_admin'] + " มีสมาชิกแจ้งแก้ไข";
            var message = "";
            message += "รายละเอียด";
            message += "\n";
            message += "คุณ : " + formData['member_id_name'];
            message += "\n";
            message += "ประเภท : " + formData['type'];
            message += "\n";
            message += "รายละเอียด : " + formData['detail'];
            message += "\n";
            message += "สถานที่ : " + formData['branch'];
            message += "\n";
            message += "เบอร์โทรศัพท์ : " + formData['tel'];
            message += "\n";
            message += "";
            message += "\n";
            message += "กรุณาตรวจสอบข้อมูลได้ที่ link : http://ags.im/gYuCnI";
            message += "\n";
            message += "";
            message += "\n";
            if (formData['bu_admin'] == "AAM") {
              //            IT Support AAM :  d5W4lzEbrRyxQSaWegLAH4HDv0omyhPsmKWI1LbkVXb
              BCT.LineNotify("d5W4lzEbrRyxQSaWegLAH4HDv0omyhPsmKWI1LbkVXb", subject, message)

            } else if (formData['bu_admin'] == "PMS") {
              //            IT Support PMS :  ug6G2SrKCqQxReKIrjZgvYNJKFNH6xTj68hq9NuuOiq
              BCT.LineNotify("ug6G2SrKCqQxReKIrjZgvYNJKFNH6xTj68hq9NuuOiq", subject, message)
            } else if (formData['bu_admin'] == "PGH") {
              //            IT Support PGH :  Lt6VbEnEQMschE57wR3n9VNQBiAhQ0TlTmeYGh0ZtGv

              BCT.LineNotify("Lt6VbEnEQMschE57wR3n9VNQBiAhQ0TlTmeYGh0ZtGv", subject, message)
            }




            //            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName + "_" + formData['bu_admin'], formData, optionField);







          } else if (spreadsheet_id == "1UoUNBpdqFwHFUmsR_JFrVJcZ_d86Y102_kuozbl9Q-Q") {


            // BCT รับเครื่องคืน http://ags.im/tcC0gm
            var ss = SpreadsheetApp.openById(spreadsheet_id);
            Logger.log("spreadsheet_id==" + spreadsheet_id);
            Logger.log("sheetName==" + sheetName);
            Logger.log("formData")
            Logger.log(formData['maintenance_bu_admin'])
            //          formData{member_id=5912112, upload_img=, mail=taweesak@prachakij.com, tel=test, detail=test, time=2021-12-02 16:08:26, type=ปริ้นเตอร์, branch=test, member_id_name=นายทวีศักดิ์ รัตนชูโชค}


            //          return;
            //    _AAM

            var subject = "แจ้ง IT Support " + formData['maintenance_bu_admin'] + " มีสมาชิกมีแจ้งงาน " + formData['maintenance_status'];
            var message = "";
            message += "รายละเอียด";
            message += "\n";
            message += "สมาชิก : " + formData['member_id_name'];
            message += "\n";
            message += "ประเภท : " + formData['maintenance_type'];
            message += "\n";
            message += "สถานะ : " + formData['maintenance_status'];
            message += "\n";
            message += "";
            message += "\n";
            message += "กรุณาตรวจสอบข้อมูลได้ที่ link : http://ags.im/tcC0gm";
            message += "\n";
            message += "";
            message += "\n" + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/YYYY HH:mm:ss");

            //          
            //          *ทีมIT Support :มีแจ้งงาน/คืนเครื่องโยกย้าย....
            //*BU...
            //*สังกัด...
            //*ลิงค์รับงาน....
            //*วันที่แจ้ง...



            if (formData['maintenance_bu_admin'] == "AAM") {
              //            IT Support AAM :  d5W4lzEbrRyxQSaWegLAH4HDv0omyhPsmKWI1LbkVXb
              BCT.LineNotify("d5W4lzEbrRyxQSaWegLAH4HDv0omyhPsmKWI1LbkVXb", subject, message)

            } else if (formData['maintenance_bu_admin'] == "PMS") {
              //            IT Support PMS :  ug6G2SrKCqQxReKIrjZgvYNJKFNH6xTj68hq9NuuOiq
              BCT.LineNotify("ug6G2SrKCqQxReKIrjZgvYNJKFNH6xTj68hq9NuuOiq", subject, message)
            } else if (formData['maintenance_bu_admin'] == "PGH") {
              //            IT Support PGH :  Lt6VbEnEQMschE57wR3n9VNQBiAhQ0TlTmeYGh0ZtGv

              BCT.LineNotify("Lt6VbEnEQMschE57wR3n9VNQBiAhQ0TlTmeYGh0ZtGv", subject, message)
            }




            //            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName + "_" + formData['maintenance_bu_admin'], formData, optionField);

          } else if (spreadsheet_id == "1u-bUhZmTMTRwEYvOKlzD2UnAupKq5gxmS_PXQx0EGTY") {








          } else if (spreadsheet_id == "1sY_Inri_ePmGQS88N-TRA9F-25V0luoBIVwiNXG42To") {
            if (sheetName == 'ข้อมูลจาก_Onepage') {
              try {
                var ssForm = SpreadsheetApp.openById(spreadsheet_id);
                var shForm = ssForm.getSheetByName(sheetName);
                var rowStartValueForm = BCT.form_getRowStartValueByKey(shForm, 'process');
                var rowFieldsForm = BCT.form_getRowFieldPutByKey(shForm, 'process');
                var fieldsForm = BCT.getField(shForm, rowFieldsForm, 1, 0);

                var lastlow = shForm.getLastRow();
                var customer = shForm.getRange('C' + lastlow).getValue() + 1;
                var Meeting_number = shForm.getRange('D' + lastlow).getValue();

                var Meeting_number_split = Meeting_number.split("/");
                var numberMeetingOldSplidPlus = String(Number(Meeting_number_split[0]) + 1);

                var year = Utilities.formatDate(new Date(), "GMT+7", "YYYY");
                var id_meeting = numberMeetingOldSplidPlus + "/" + year;
                var customer_id_card = formData["customer_id_card"];


                formData["customer_id"] = customer;
                formData["TD_Meeting_number"] = id_meeting;


              } catch (e) { }

              BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);


            }







          } else if (spreadsheet_id == "18uqseIc_Wv9uILFwE1Ni_PkcyVxoLbBVbOUCk6mzeGI" && sheetName == "B1_Forms_ตอบรับ") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //ส่งเพิ่มห้อง 3 ห้อง งานพี่อรรถ โดย อนุชิดา 

            var data = formData;

            var message = "🤜🏻 'ก๊อก ก๊อก!!  คกก. จ๋าาา' ✨" + "\n";
            message += "\n มีสมาชิกคีย์บริจาคเลือดมาจ้า" + "\n";
            message += "\n😎_ชื่อคุณ : " + formData["member_id_name"] + "\n";
            message += "\n🙏_รบกวนตรวจสอบและโอนภาย " + "\n";
            message += "ในวันที่กำหนดด้วยจ้า ";

            BCT.Telegramsend_pkg_fix("-1001683155994", message, ""); //ห้องพี่กุ๊กกิ๊ก
            BCT.Telegramsend_pkg_fix("-1001625346142", message, ""); // CU คกก. 2022 ห้องกรรมการ
            BCT.Telegramsend_pkg_fix("-727933607", message, ""); // ห้องพี่แบงแบง
            ////ทดสอบ
            BCT.Telegramsend_pkg_fix("-798074363", message, ""); //ห้องน้องนุก ทดสอบ



          } else if (spreadsheet_id == "1SAO7x6hOt9Qlk0Y7aqrXDcUcfelHrL_INoYxMVFIYn4" && sheetName == "B2_แจ้งเปลี่ยนผู้อนุมัติใบลา") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //ส่งเพิ่มห้อง 3 ห้อง โดยแบงแบง

            var data = formData;

            var message = "แจ้งทีม PAO  ✨" + "\n";
            message += "\n มีสมาชิกคีย์แจ้ง " + formData["type"] + "\n";
            message += "\n ชื่อ: " + formData["IDmember_name"] + "\n";
            message += "\n🙏 ' รบกวนตรวจสอบและดำเนินการด้วยจ้า " + "\n";
            message += "https://docs.google.com/spreadsheets/d/1SAO7x6hOt9Qlk0Y7aqrXDcUcfelHrL_INoYxMVFIYn4/edit?resourcekey#gid=835472384 ";

            BCT.Telegramsend_pkg_fix("-1001585052138", message, "");
            BCT.Telegramsend_pkg_fix("-1001508426931", message, ""); //
            BCT.Telegramsend_pkg_fix("-1001701434075", message, ""); // ห้องทดสอบ แบงแบง
            ////ทดสอบ




          } else if (spreadsheet_id == "18gUgQ2jsKLoDJZ52XOT30BpJsWR71p8Xgy0Igo6xMAM" && sheetName == "B2_ขอหนังสือธอสสมาชิกPKG") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //ส่งเพิ่มห้อง 3 ห้อง โดยแบงแบง

            var data = formData;

            var message = "แจ้งทีม PAO  ✨" + "\n";
            message += "\n มีสมาชิกคีย์ขอหนังสือกู้บ้าน 🏠 ธอส มาค่ะ \n";
            message += "\n ชื่อ: " + formData["IDmember_name"] + "\n";
            message += "\n วันที่ต้องการใช้งาน: " + formData["date_do"] + "\n";
            message += "\n🙏 ' รบกวนตรวจสอบและดำเนินการด้วยจ้า " + "\n";
            message += "https://docs.google.com/spreadsheets/d/18gUgQ2jsKLoDJZ52XOT30BpJsWR71p8Xgy0Igo6xMAM/edit?resourcekey#gid=908219182 ";

            BCT.Telegramsend_pkg_fix("-1001585052138", message, "");
            BCT.Telegramsend_pkg_fix("-1001508426931", message, ""); //
            BCT.Telegramsend_pkg_fix("-1001701434075", message, ""); // ห้องทดสอบ แบงแบง
            ////ทดสอบ



          } else if (spreadsheet_id == "18gUgQ2jsKLoDJZ52XOT30BpJsWR71p8Xgy0Igo6xMAM" && sheetName == "B2_ขอหนังสือธอสสมาชิกPKG") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //ส่งเพิ่มห้อง 3 ห้อง โดยแบงแบง

            var data = formData;

            var message = "แจ้งทีม PAO  ✨" + "\n";
            message += "\n มีสมาชิกคีย์ " + formData["type_name"] + " มาค่ะ \n";
            message += "\n ชื่อ: " + formData["IDmember_name"] + "\n";
            message += "\n🙏 ' รบกวนตรวจสอบและดำเนินการด้วยจ้า " + "\n";
            message += "https://docs.google.com/spreadsheets/d/1HhbI22WK_ndGXXhhzXO1XDgpOYbQjGIF48fhapngVKs/edit#gid=1288215066";

            // BCT.Telegramsend_pkg_fix("-1001585052138", message, ""); 
            // BCT.Telegramsend_pkg_fix("-1001508426931", message, ""); //
            BCT.Telegramsend_pkg_fix("-1001701434075", message, ""); // ห้องทดสอบ แบงแบง
            ////ทดสอบ




          } else if (spreadsheet_id == "1Xd7BzAyEVFij2aVE4wsyWuKfKWuGcZKKmVlLAAAl2yc" && sheetName == "B1_สร้างกลุ่ม") {
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            var group_id = formData["group_id"];
            if (group_id.toString().indexOf("-") == -1) {
              group_id = "-" + group_id;
            }
            var queryInsert = "INSERT INTO telegram_group";
            queryInsert += "(token_instagram,group_name,branch,contract_number,sent_link_tg)";
            queryInsert += " VALUE ";
            queryInsert += "('" + group_id + "','" + formData["group_name"] + "','" + formData["branch"] + "','" + formData["tel"] + "','" + formData["invite_url"] + "')";
            //  return queryInsert;
            var xml = BCT.loadXMLQueryInsertUpdateMulti(BCT.getDBServer(), 'CI_Docker_telegram', queryInsert)

            //TG ??
            //  ทดสอบ


          } else if (spreadsheet_id == "1jRpQ1sS2VTDZ6SR19t4hSIr9hzCjNg3CaTexPomW_hc") {
            if (formData['branch_with'] == 'PNP' || formData['branch_with'] == 'BTB' || formData['branch_with'] == 'SIR' || formData['branch_with'] == 'KPT') {
              var ssForm = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
              var shForm = ssForm.getSheetByName("B1_การเงินทำเบิก_RPTN");
              BCT.autoInsertToSpreadsheetByFirebase(ssForm, shForm, formData, optionField);
              // var ssDes = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
              // var shDes = ssDes.getSheetByName("B1_การเงินทำเบิก_RPTN");
              // var rowUpdate = shDes.getLastRow();
              // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')+""+rowUpdate+":"+BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
              // SpreadsheetApp.setActiveSpreadsheet(ssDes);
              // SpreadsheetApp.setActiveSheet(shDes);
              // SpreadsheetApp.setActiveRange(shDes.getRange('A'+rowUpdate));
              // BCT.saveDataSpreadsheetByTemplate(true, false, false);
            } else if (formData['branch_with'] == 'MPN' || formData['branch_with'] == 'MBT' || formData['branch_with'] == 'MSR' || formData['branch_with'] == 'MKT') {
              var ssForm = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
              var shForm = ssForm.getSheetByName("B1_การเงินทำเบิก_AICP");
              BCT.autoInsertToSpreadsheetByFirebase(ssForm, shForm, formData, optionField);
              // var ssDes = SpreadsheetApp.openById("1_C_JbM-FO2ubTsfEZixQwMkd34nSeUZIpXQ2vX6fekg");
              // var shDes = ssDes.getSheetByName("B1_การเงินทำเบิก_AICP");
              // var rowUpdate = shDes.getLastRow();
              // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')+""+rowUpdate+":"+BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
              // SpreadsheetApp.setActiveSpreadsheet(ssDes);
              // SpreadsheetApp.setActiveSheet(shDes);
              // SpreadsheetApp.setActiveRange(shDes.getRange('A'+rowUpdate));
              // BCT.saveDataSpreadsheetByTemplate(true, false, false);
            }

          } else if (spreadsheet_id == "1lNEvvuNzwcloPlxSt8yjtNFBI40k7dHcaDh3rFZhC5w") {
            var contract_number2 = formData['contract_number2']
            var member_id = formData['member_id']
            var member_id_name = formData['member_id_name']
            var receiving_money_timestamp = formData['receiving_money_timestamp']
            var branch = formData['branch']
            var contract_number = formData['contract_number']
            var cust_name = formData['cust_name']
            var amount_usd = formData['amount_usd']
            var amount_khr = formData['amount_khr']
            var note_th = formData['note_th']

            var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1lNEvvuNzwcloPlxSt8yjtNFBI40k7dHcaDh3rFZhC5w/edit#gid=596597096");
            var sheet = ss.getSheetByName("B1_สร้างใบฝาก");
            var lastRow = sheet.getLastRow();

            var data = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues();
            var filed = sheet.getRange(10, 1, 1, sheet.getLastColumn()).getValues();
            if (contract_number2 != "") {
              var query = "select * from hand_bill "
              query += " where running ='" + contract_number2 + "'";
              var datas = BCT.loadJSONDatas('RDS', 'BCT_RAFCO', query);
            } else if (contract_number2 == "") {
              var datas = "";
            }

            if (datas != '') {


              // var values = sheet.getRange('I1:I').getValues();

              // for (var r = 0; r < values.length; r++) {
              // if (values[r][0] == contract_number2) {


              //  var receipt_number = formData['receipt_number']


              var receipt_number = getreceipt_number(branch);
              // 

              //  sheet.getRange(lastRow + 1 , 2).setValue("X");
              sheet.getRange(lastRow + 1, 4).setValue(receipt_number);
              sheet.getRange(lastRow + 1, 8).setValue(branch);
              sheet.getRange(lastRow + 1, 9).setValue(contract_number);
              sheet.getRange(lastRow + 1, 10).setValue(cust_name);
              sheet.getRange(lastRow + 1, 11).setValue(note_th);
              sheet.getRange(lastRow + 1, 13).setValue(amount_usd);
              sheet.getRange(lastRow + 1, 14).setValue(amount_khr);
              sheet.getRange(lastRow + 1, 15).setValue(receiving_money_timestamp);
              sheet.getRange(lastRow + 1, 16).setValue(member_id_name);

              var rowUpdate = sheet.getLastRow();
              sheet.getRange(BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@')).setValue("X");
              SpreadsheetApp.setActiveSpreadsheet(ss);
              SpreadsheetApp.setActiveSheet(sheet);
              SpreadsheetApp.setActiveRange(sheet.getRange('A' + rowUpdate));
              BCT.saveDataSpreadsheetByTemplate(true, false, false);

              var link = "http://webapp.prachakij.com:8080/BCT/HandBill_print_receipt_rafco_2_de.jsp?receipt_number=" + receipt_number;

              var file1 = BCT.shortenURL(link);

              var message = "📢 แจ้งเตือน ใบเบิกคืน" + "\n";
              // message += "\n🪪รหัสรายการ : " + data[0][BCT.numberPositionValueByFliedName(filed, "running")] + "\n";
              message += "\n🪪รหัสใบนำฝาก : " + receipt_number + "\n";
              message += "\n🗓วันที่ : " + receiving_money_timestamp + "\n";
              message += "\n👤ชื่อนามสกุลลูกค้า " + cust_name + "\n";
              message += "\n🖨เลขที่สัญญา " + contract_number + "\n";
              message += "\n🧑‍🔧/👩‍🔧 สมาชิกที่คีย์ฝาก " + member_id_name + "\n";
              message += "ลิงค์ " + file1;
              BCT.Telegramsend_pkg_fix("-1001753733819", message, "");
              BCT.Telegramsend_pkg_fix("-1001935891599", message, "");
              BCT.Telegramsend_pkg_fix("-1001631928835", message, "");

              // }
              // }
            } else if (contract_number != '' && contract_number2 == '') {



              var receipt_number = getreceipt_number(branch);



              //  sheet.getRange(lastRow + 1, 2).setValue("X");
              sheet.getRange(lastRow + 1, 4).setValue(receipt_number);
              sheet.getRange(lastRow + 1, 8).setValue(branch);
              sheet.getRange(lastRow + 1, 9).setValue(contract_number);
              sheet.getRange(lastRow + 1, 10).setValue(cust_name);
              sheet.getRange(lastRow + 1, 11).setValue(note_th);
              sheet.getRange(lastRow + 1, 13).setValue(amount_usd);
              sheet.getRange(lastRow + 1, 14).setValue(amount_khr);
              sheet.getRange(lastRow + 1, 15).setValue(receiving_money_timestamp);
              sheet.getRange(lastRow + 1, 16).setValue(member_id_name);

              var rowUpdate = sheet.getLastRow();
              sheet.getRange(BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(sheet, BCT.form_getRowByKey(sheet, 'process'), 1, 0), '@')).setValue("X");
              SpreadsheetApp.setActiveSpreadsheet(ss);
              SpreadsheetApp.setActiveSheet(sheet);
              SpreadsheetApp.setActiveRange(sheet.getRange('A' + rowUpdate));
              BCT.saveDataSpreadsheetByTemplate(true, false, false);


              var link = "http://webapp.prachakij.com:8080/BCT/HandBill_print_receipt_rafco_2_de.jsp?receipt_number=" + receipt_number;
              var file1 = BCT.shortenURL(link);
              var message = "📢 แจ้งเตือน ใบนำฝาก" + "\n";
              // message += "\n🪪รหัสรายการ : " + data[0][BCT.numberPositionValueByFliedName(filed, "running")] + "\n";
              message += "\n🪪รหัสใบนำฝาก : " + receipt_number + "\n";
              message += "\n🗓วันที่ : " + receiving_money_timestamp + "\n";
              message += "\n👤ชื่อนามสกุลลูกค้า " + cust_name + "\n";
              message += "\n🖨เลขที่สัญญา " + contract_number + "\n";
              message += "\n🧑‍🔧/👩‍🔧 สมาชิกที่คีย์ฝาก " + member_id_name + "\n";
              message += "ลิงค์ " + file1;


              BCT.Telegramsend_pkg_fix("-1001753733819", message, "");
              BCT.Telegramsend_pkg_fix("-1001935891599", message, "");
              BCT.Telegramsend_pkg_fix("-1001631928835", message, "");

            }



            // }else if (spreadsheet_id == "12vTBTK2tUSeJfozINJxwcKbwDEpsaM9iENgVIZxs3Tk") {





            //   BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);


            //   var message = "📣ทีม 4C(เอสซี่,พี่อ้อ) ค่ะ มีข้อมูลรายชื่อสมาชิกที่ต้องสร้างMS24 เข้ามาใหม่";
            //   message += "\n📝ตรวจสอบข้อมูลพร้อมสร้าง MS24 ภายใน 2 วัน ด้วยคะ";
            //   message += "\nคลิ๊ก Link เพื่อเข้าไปตรวจสอบ http://ags.im/yxBmpm";
            //   message += "\n🙏ขอบคุณค่ะ🙏";
            //   //  4C +INP+PVP
            //   BCT.LineNotify("8FhsrhaO1Al3AzL0sH5EUCaDoSVKrsHKsX1z4tX1mmk", "", message);



          } else if (spreadsheet_id == "1R2WyDR8AmQN2J-83q9Ce3eLrSz1cIuzMnfSNYP-HmFI") {
            //          BCT_ผลเสียหาย
            //          https://docs.google.com/spreadsheets/d/1R2WyDR8AmQN2J-83q9Ce3eLrSz1cIuzMnfSNYP-HmFI/edit#gid=353143076




            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            var data = formData;
            var message = "รหัสสมาชิก : " + formData["member_id"] + "\n";
            message += "ชื่อ-นามสกุล : " + formData["member_id_name"] + "\n";
            message += "กลุ่มบริษัทสังกัด : " + formData["member_id_company_management"] + "\n";
            message += "รายละเอียดผลเสียหายที่เกิดขึ้น : " + formData["desc_damage"] + "\n";
            message += "แผนการป้องกันและแก้ไขเพื่อไม่ให้เกิดซ้ำ : " + formData["desc_protect"] + "\n";
            message += "รูปภาพ : " + formData["uploadfile"];

            BCT.Telegramsend_pkg_fix("-600692989", message, "");

            //          token นี้ แจ้งเตือนทุกครั้งที่มีคีย์ลิงค์
            //          ห้อง CS-OBMDAY  -600692989

            //          ส่วน token นี้ แจ้งตาม BU ที่แจ้งค่ะ
            //          PMSgr. -761740727
            //          AAMgr. -1001526881248
            //          pgh+cpd -694291531
            var token = "";
            if (formData["member_id_company_management"] == "PMSgr") {
              token = "-761740727";
            } else if (formData["member_id_company_management"] == "AAMgr") {
              token = "-1001526881248";
            } else if (formData["member_id_company_management"] == "PGHgr") {
              token = "-694291531";
            } else if (formData["member_id_company_management"] == "CPDgr") {
              token = "-694291531";
            }

            if (token != "") {
              BCT.Telegramsend_pkg_fix(token, message, "");
            }





          }
          //ปลาโอ
          else if (spreadsheet_id == '1kMu6tSoWV-ruEc-ak_kozbP-zo1OCpRARcIOBVCXezo' && sheetName == "B1_Forms_agsTes") {
            //เก็บไว้ copy
            //วางข้อมูล
            var sql = 'SELECT concat("P0_",lpad(REPLACE(MAX(P0_ID),"P0_","")+1,7,"0")) as P0_ID FROM `P0_Customer`';
            var p0 = BCT.loadJSONDatas("RDS", "BCT_customer_datacenter", sql)[0]["P0_ID"];
            formData['P0_ID'] = p0;
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (spreadsheet_id == '13IE8VH0z1RUAC3QHxyiHrcRxjFDN5HIGAudom-DrFcs' && sheetName == "B1_ข้อมูลลงทะเบียนบัญชีเงินสดย่อย") {
            //เก็บไว้ copy
            //วางข้อมูล
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(true, false, false);

            ////TG
            // 1. ส่ง tg - ส่วนตัวผู้บันทึก  event_name
            var message = "กระเป๋าเงินสดย่อย  " + formData["event_name"] + " ได้ขึ้นทะเบียนเรียบร้อยแล้ว\nขอบคุณค่ะ\nBy.การเงิน";
            BCT.Telegramsend_pkg_fix(formData["member_id"], message, "");
            // 2. ส่งห้อง tg -  4cPgh
            BCT.Telegramsend_pkg_fix("-1001742657226", message, "");
            // 3. ส่ง tg  - ผู้ดูแลบัญชีเงินสดย่อย
            // 4. ส่ง TG - - ผู้ตรวจสอบผู้อนุมัติ
            BCT.Telegramsend_pkg_fix(formData["auditor_id"], message, "");



            //บันทึกข้อมูลลงฐาน
            // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            // var shDes = ssDes.getSheetByName(sheetName);
            // var rowUpdate = shDes.getLastRow();
            // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            // SpreadsheetApp.setActiveSpreadsheet(ssDes);
            // SpreadsheetApp.setActiveSheet(shDes);
            // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            // BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (spreadsheet_id == '13IE8VH0z1RUAC3QHxyiHrcRxjFDN5HIGAudom-DrFcs' && sheetName == "money_pkg_re") {
            //เก็บไว้ copy
            //วางข้อมูล
            // BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            BCT.loadXMLQueryInsertUpdateMulti("RDS", 'BCT_ACC', "UPDATE tbnitrosign_doc_bank SET account_status = 'ยกเลิก' and cancel_url = '" + formData["bookbank_url"] + "' where account_no = '" + formData["account_no"] + "'");
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName("B1_ข้อมูลลงทะเบียนบัญชีเงินสดย่อย");
            var rowUpdate = shDes.getLastRow();
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.loadDataSpreadsheetByTemplate(true, false, true);

            ////TG
            // 1. ส่ง tg - ส่วนตัวผู้บันทึก  event_name
            var message = "กระเป๋าเงินสดย่อย  " + formData["event_name"] + " ได้ยกเลิกเรียบร้อยแล้ว\nขอบคุณค่ะ\nBy.การเงิน";
            BCT.Telegramsend_pkg_fix(formData["member_id"], message, "");
            // 2. ส่งห้อง tg -  4cPgh
            BCT.Telegramsend_pkg_fix("-1001742657226", message, "");
            // 3. ส่ง tg  - ผู้ดูแลบัญชีเงินสดย่อย
            // 4. ส่ง TG - - ผู้ตรวจสอบผู้อนุมัติ
            BCT.Telegramsend_pkg_fix(formData["auditor_id"], message, "");



            //บันทึกข้อมูลลงฐาน
            // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            // var shDes = ssDes.getSheetByName(sheetName);
            // var rowUpdate = shDes.getLastRow();
            // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            // SpreadsheetApp.setActiveSpreadsheet(ssDes);
            // SpreadsheetApp.setActiveSheet(shDes);
            // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            // BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (spreadsheet_id == '1Pmc0It1NnGrYgbCvnNvXlOb0w1s6hznb_5HknEraqc8' && sheetName == "Data") {
            //เก็บไว้ copy
            //วางข้อมูล
            var ss = SpreadsheetApp.openById(spreadsheet_id);
            var sheet = ss.getSheetByName("รางวัล");
            var data = sheet.getRange("Q4:S").getValues();
            var json = {};
            for (var ll = 0; ll < data.length; ll++) {
              if (data[ll][0] != "") {
                json[data[ll][0]] = data[ll][2];
              }
            }
            formData["lp"] = json[formData["like"]];
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            // var shDes = ssDes.getSheetByName(sheetName);
            // var rowUpdate = shDes.getLastRow();
            // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            // SpreadsheetApp.setActiveSpreadsheet(ssDes);
            // SpreadsheetApp.setActiveSheet(shDes);
            // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            // BCT.saveDataSpreadsheetByTemplate(false, false, false);

            var message = '❤️ เงินรางวัลกิจกรรมส่งท้ายปีเก่า ต้อนรับปีใหม่ PGH & CPD\n\n➡️ แจ้งคุณ :: ' + formData["member_id_name"] + ' PGHC ได้รับข้อมูลการบันทึกแล้ว \nเงินรางวัล ' + numberWithCommas(formData["lp"]) + ' Like จะได้รับภายในวันที่ 26/12/65 \n🙏🏻ขอบคุณค่ะ \n💁PGHC';
            BCT.Telegramsend_pkg_fix(formData["member_id"], message, "");
            BCT.Telegramsend_pkg_fix("-673182405", message, "");


          } else if (spreadsheet_id == '1rYLcD8cvlOD2CCCbNa1GCvvdCAi5O67-UDQKx9gfLoc' && sheetName == "B1_Empowerment") {

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);

            var message = "การรับใช้ลุกค้าแบบ Empowerment  PMSgr";
            message += "\n" + formData["member_id"] + " " + formData["member_id_name"];
            message += "\nชื่อเรือง : " + formData["em_title"];
            message += "\n\nรายละเอียดเหตุการณ์ Empowerment...\n" + formData["em_detail"];
            // 4C PMSgr.  -761740727
            // ทีมงาน sa  -691441993
            // บริหารงานศูนย์สี  -657520623
            // ผู้รับใช้ศูนย์4สาขา  -778047082
            // อู่PMG CHAN  -623384727
            // 4C ฝ่ายขาย&ทีมกำกับ  -635210813
            // 4C ออฟฟิตศูนย์  -636178691
            var tokenAll = [formData["member_id"], "-761740727", "-691441993", "-657520623", "-778047082", "-623384727", "-635210813", "-636178691"];
            var urlImage = formData["em_image"].split(",");
            for (var t = 0; t < tokenAll.length; t++) {
              BCT.Telegramsend_pkg_fix(tokenAll[t], message, "");
              for (var i = 0; i < urlImage.length; i++) {
                BCT.Telegramsend_pkg_fix(tokenAll[t], "", urlImage[i]);
              }
            }

            //กิจกรรมการตลาด โดยอุษา
          } else if (spreadsheet_id == '1avgnzH7a4TJHkd2KRzOh7S79Hx3Gm2FcgfoUZV60Dhs' && sheetName == "B1_การตลาดบันทึกกิจกรรม/เบิกสำรอง") {

            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            Utilities.sleep(5000);
            BCT.saveDataSpreadsheetByTemplate(false, false, false);

            var subject = "🔔 แจ้งเบิกงบกิจกรรมการตลาด PMS"
            var message = " ✍️ รายการกิจกรรม :: " + formData["column2"] + "\n";
            message += "✍️ รหัสกิจกรรม :: " + formData["column4"] + "\n";
            message += "⏰ วันที่จัดกิจกรรม :: " + formData["column3"] + "\n";
            message += "⏰ วันสิ้นสุดการจัดงาน :: " + formData["column13"] + "\n";
            // message += "⏰ วันสิ้นสุดการจัดงาน :: "+Utilities.formatDate(formData["column13"], ss.getSpreadsheetTimeZone(), "dd/MM/yyyy")+"\n";
            message += "💸ยอดเงินที่ใช้ :: " + formData["column7"] + "\n ";
            message += "📍 สาขา :: "+formData["column34"]+"\n";
            message += "🔗 Link จดหมายแนบ :: " + formData["link"] + "\n"
            message += "👩‍💻 ชื่อผู้แจ้งงาน :: พี่เจนนี่\n"
            message += "🔰 ทีม :: การตลาด\n"
            // -4129865034
            //-646796433

            BCT.Telegramsend_pkg_fix("-4129865034", subject + "\n" + message, "");

            //เติร์ก
        } else if (spreadsheet_id == '1Za5K_maHUIBROY2Xko-nKBGsHAVP-UO6rHXIGuInhzs' && sheetName == "B1_รับงานจากฟอร์ม") {

                    BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
                    //บันทึกข้อมูลลงฐาน
                    // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
                    // var shDes = ssDes.getSheetByName(sheetName);
                    // var rowUpdate = shDes.getLastRow();
                    // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
                    // SpreadsheetApp.setActiveSpreadsheet(ssDes);
                    // SpreadsheetApp.setActiveSheet(shDes);
                    // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
                    // Utilities.sleep(5000);
                    // BCT.saveDataSpreadsheetByTemplate(false, false, false);

                        var ssDes = SpreadsheetApp.openById(spreadsheet_id);
        var shDes = ssDes.getSheetByName(sheetName);
        var rowUpdate = shDes.getLastRow();
        var lastcol = shDes.getLastColumn();
        var data = shDes.getRange(rowUpdate, 1, 1, lastcol).getValues()
           Logger.log("ส่ง line 3")
           var filds = BCT.getField(shDes, 27, 1, 0)
//           for(var i=0;i<data.length;i++){
             var name = formData["member_id_name"]
             var bu	= formData["select_bu"]
             var fu = formData["select_bu_use_inp_division_short_name"]
             var title = formData["name_doc"]
              var type	= formData["type_doc"]
             var status_type = formData["status_doc"]
             var url = formData["link_doc"]
              var timestamp_from	= formData["timestamp_from"]
         
             var idmem = formData["member_id"]
            
               
//               }
   
          var detail ="🎯 มีงานแจ้งขึ้นทะเบียนเอกสารจากคุณ : "+name;
          detail +="\n";
          detail +="🏛️ สังกัด บริษัท : "+bu;
           detail +="\n";
          detail +="🕵️ ฝ่าย/ แผนก : "+fu;
           detail +="\n";
          detail +="📑 ชื่อเอกสารคุณภาพ : "+title;
          detail +="\n";
          detail +="📚 เอกสารคุณภาพ ประเภท : "+type;
          detail +="\n";
          detail +="🚦 สถานะเอกสาร : "+status_type;
          detail +="\n";
          detail +="📤 Link เอกสารคุณภาพ : "+url;
          detail +="\n";
          detail +="📅 วันที่แจ้ง : "+timestamp_from;
          detail +="\n";
          detail +="\n";
          detail +="📤 Link รับงาน : http://ags.im/elykG1";
           detail +="\n";
          detail +="\n";
          detail +="ข้อความแจ้งเตือนอัตโนมัติจากทีม INP";
          
          //        INP PKG :: GIgU4fPehB57kHUVN12oR6HfKBEBfvfqsA8OGqWMvNY	
//        BCT.LineNotify("wkReYHfbCjGPoOjDeOfEjwidOVk8V6F93bg33qHEzYZ", sheetName, detail) /// work
//        BCT.LineNotify("GIgU4fPehB57kHUVN12oR6HfKBEBfvfqsA8OGqWMvNY", sheetName, detail) /// INP PKG ::
        BCT.Telegramsend_pkg_fix("-728758261", sheetName+"\n"+detail, "")
        Logger.log("ส่ง line 4")
        

        
//        1. 4C BU สมาชิกที่แจ้ง	
//2. ห้องไลน์รับใช้ส่วนตัวสมาชิกที่แจ้งขึ้นทะเบียน	
//	
//	📢 คุณ : ..........................
//	📚 ข้อมูลการแจ้งขอขึ้นทะเบียนเอกสารประเภท : ..........
//	🔮 เรื่อง : .....................................
//	🗓 วันที่ขอขึ้นทะเบียนเอกสาร : .......................................
//	
//	👉 *ข้อมูลของคุณ ถูกส่งไปยังทีม INP เรียบร้อยแล้วค่ะ* 👌
//	
//	🙏 *ขอบคุณค่ะ* 🙏
        
//         var tokenmem = BCT.CheckTokenOfIDFromPKGemployee(idmem);
          
          var detail ="📢 คุณ : "+name;
          detail +="\n";
          detail +="📚 ข้อมูลการแจ้งขอขึ้นทะเบียนเอกสารประเภท : "+type;
          detail +="\n";
          detail +="🔮 เรื่อง : "+title;
          detail +="\n";
          detail +="📅 วันที่ขอขึ้นทะเบียนเอกสาร : "+timestamp_from;
          detail +="\n";
          detail +="\n";
          detail +="👉 *ข้อมูลของคุณ ถูกส่งไปยังทีม INP เรียบร้อยแล้วค่ะ* 👌";
          detail +="\n";
          detail +="🙏 *ขอบคุณค่ะ* 🙏";
          detail +="\n";
          detail +="\n";
          detail +="ข้อความแจ้งเตือนอัตโนมัติจากทีม INP";
        
//         BCT.LineNotify("wkReYHfbCjGPoOjDeOfEjwidOVk8V6F93bg33qHEzYZ", sheetName, detail) /// work
//         BCT.LineNotify(tokenmem, sheetName, detail) /// work
            BCT.Telegramsend_pkg_fix(idmem, sheetName+"\n"+detail, "")
         var shtoken = ssDes.getSheetByName("A1_config_dropdown_ลงเบียน");
         var datatoken = shtoken.getRange("a7:p25").getValues()
         var filedstoken  = BCT.getField(shtoken, 2, 1, 0)
          
         for(var o=0;o<datatoken.length;o++){
           var BU = datatoken[o][BCT.numberPositionValueByFliedName(filedstoken, "Token 1")-2];
           var token1 = datatoken[o][BCT.numberPositionValueByFliedName(filedstoken, "Token 1")];
           var token2 = datatoken[o][BCT.numberPositionValueByFliedName(filedstoken, "Token 2")];
           
           
           
           if(BU == bu){
             try{
               
              BCT.Telegramsend_pkg_fix(token1, sheetName+"\n"+detail, "")
               BCT.Telegramsend_pkg_fix(token2, sheetName+"\n"+detail, "")
     
             }catch(e){
             
             }
           }
             }

          } else if (spreadsheet_id == '1Za5K_maHUIBROY2Xko-nKBGsHAVP-UO6rHXIGuInhzs' && sheetName == "B4_แจ้งขอยกเลิก-แก้ไข") {

                BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
                Logger.log("B4_แจ้งขอยกเลิก-แก้ไข");
                Logger.log(spreadsheet_id);

                BCT542.Line_B4_Step1(spreadsheet_id);
    
          } else if (spreadsheet_id == '1AWWzFS050eoFz-cXo9l0wsuZQCWK-zJsRjGvqEPAuxI') { //โรส
            var SWB = formData['S-WB'];
            var SMB = formData['S-MB'];
            if (SWB >= 0 || SWB <= 5 || SMB >= 0 || SMB <= 5) {
              if (sheetName == "B1_เสื้อ_AAM_67_68") {
                BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B1_เสื้อ_AAM_67_68", formData, optionField);

                var member_name = formData['member_name'];
                var member_division_name = formData['member_division_name'];
                var temperature_timestamp = formData['temperature_timestamp'];
                var Note = formData['Note'];
                // var time = Utilities.formatDate(temperature_timestamp, "GMT+7", "dd-MM-yyyy HH:mm:ss");
                var token = formData['member_id'];

                var SWB = formData['S-WB'];
                var SWBXS = formData['S-WB-XS'];
                var SWBS = formData['S-WB-S'];
                var SWBM = formData['S-WB-M'];
                var SWBL = formData['S-WB-L'];
                var SWBXL = formData['S-WB-XL'];
                var SWB2XL = formData['S-WB-2XL'];
                var SWB3XL = formData['S-WB-3XL'];
                var SWB4XL = formData['S-WB-4XL'];
                var SWB5XL = formData['S-WB-5XL'];
                var SWB6XL = formData['S-WB-6XL'];

                var SMB = formData['S-MB'];
                var SMBXS = formData['S-MB-XS'];
                var SMBS = formData['S-MB-S'];
                var SMBM = formData['S-MB-M'];
                var SMBL = formData['S-MB-L'];
                var SMBXL = formData['S-MB-XL'];
                var SMB2XL = formData['S-MB-2XL'];
                var SMB3XL = formData['S-MB-3XL'];
                var SMB4XL = formData['S-MB-4XL'];
                var SMB5XL = formData['S-MB-5XL'];
                var SMB6XL = formData['S-MB-6XL'];


                if (SWB != "" && SMB == "") {
                  var message = "";
                  message += "📢 ข้อมูลเสื้อฟอร์ม AAMgr." + "\n" + "\n"
                  message += "👩 ชื่อสมาชิก : " + member_name + "\n"
                  message += "🏬 หน่วยงาน : " + member_division_name + "\n"
                  message += "📆 " + temperature_timestamp + "\n" + "\n"
                  message += "👩 หญิง ==> " + SWB + "\n"
                  if (SWBXS != "") {
                    message += "เบอร์ XS :: " + SWBXS + "\n"
                  } if (SWBS != "" != "") {
                    message += "เบอร์ S :: " + SWBS + "\n"
                  } if (SWBM != "") {
                    message += "เบอร์ M :: " + SWBM + "\n"
                  } if (SWBL != "") {
                    message += "เบอร์ L :: " + SWBL + "\n"
                  } if (SWBXL != "") {
                    message += "เบอร์ XL :: " + SWBXL + "\n"
                  } if (SWB2XL != "") {
                    message += "เบอร์ 2XL :: " + SWB2XL + "\n"
                  } if (SWB3XL != "") {
                    message += "เบอร์ 3XL :: " + SWB3XL + "\n"
                  } if (SWB4XL != "") {
                    message += "เบอร์ 4XL :: " + SWB4XL + "\n"
                  } if (SWB5XL != "") {
                    message += "เบอร์ 5XL :: " + SWB5XL + "\n"
                  } if (SWB6XL != "") {
                    message += "เบอร์ 6XL :: " + SWB6XL + "\n"
                  }
                } else if (SWB == "" && SMB != "") {
                  var message = "";
                  message += "📢 ข้อมูลเสื้อฟอร์ม AAMgr." + "\n" + "\n"
                  message += "👦 ชื่อสมาชิก : " + member_name + "\n"
                  message += "🏬 หน่วยงาน : " + member_division_name + "\n"
                  message += "📆 " + temperature_timestamp + "\n" + "\n"
                  message += "👦 ชาย ==> " + SMB + "\n"
                  if (SMBXS != "") {
                    message += "เบอร์ XS :: " + SMBXS + "\n"
                  } if (SMBS != "" != "") {
                    message += "เบอร์ S :: " + SMBS + "\n"
                  } if (SMBM != "") {
                    message += "เบอร์ M :: " + SMBM + "\n"
                  } if (SMBL != "") {
                    message += "เบอร์ L :: " + SMBL + "\n"
                  } if (SMBXL != "") {
                    message += "เบอร์ XL :: " + SMBXL + "\n"
                  } if (SMB2XL != "") {
                    message += "เบอร์ 2XL :: " + SMB2XL + "\n"
                  } if (SMB3XL != "") {
                    message += "เบอร์ 3XL :: " + SMB3XL + "\n"
                  } if (SMB4XL != "") {
                    message += "เบอร์ 4XL :: " + SMB4XL + "\n"
                  } if (SMB5XL != "") {
                    message += "เบอร์ 5XL :: " + SMB5XL + "\n"
                  } if (SMB6XL != "") {
                    message += "เบอร์ 6XL :: " + SMB6XL + "\n"
                  }
                } else {
                  var message = "";
                  message += "📢 ข้อมูลเสื้อฟอร์ม AAMgr." + "\n" + "\n"
                  message += "👩 ชื่อสมาชิก : " + member_name + "\n"
                  message += "🏬 หน่วยงาน : " + member_division_name + "\n"
                  message += "📆 " + temperature_timestamp + "\n" + "\n"
                  if (SWB != "") {
                    message += "👩 หญิง ==> " + SWB + "\n"
                  }
                  if (SWBXS != "") {
                    message += "เบอร์ XS :: " + SWBXS + "\n"
                  } if (SWBS != "" != "") {
                    message += "เบอร์ S :: " + SWBS + "\n"
                  } if (SWBM != "") {
                    message += "เบอร์ M :: " + SWBM + "\n"
                  } if (SWBL != "") {
                    message += "เบอร์ L :: " + SWBL + "\n"
                  } if (SWBXL != "") {
                    message += "เบอร์ XL :: " + SWBXL + "\n"
                  } if (SWB2XL != "") {
                    message += "เบอร์ 2XL :: " + SWB2XL + "\n"
                  } if (SWB3XL != "") {
                    message += "เบอร์ 3XL :: " + SWB3XL + "\n"
                  } if (SWB4XL != "") {
                    message += "เบอร์ 4XL :: " + SWB4XL + "\n"
                  } if (SWB5XL != "") {
                    message += "เบอร์ 5XL :: " + SWB5XL + "\n"
                  } if (SWB6XL != "") {
                    message += "เบอร์ 6XL :: " + SWB6XL + "\n"
                  } if (SMB != "") {
                    message += "👦 ชาย ==> " + SMB + "\n"
                  } if (SMBXS != "") {
                    message += "เบอร์ XS :: " + SMBXS + "\n"
                  } if (SMBS != "" != "") {
                    message += "เบอร์ S :: " + SMBS + "\n"
                  } if (SMBM != "") {
                    message += "เบอร์ M :: " + SMBM + "\n"
                  } if (SMBL != "") {
                    message += "เบอร์ L :: " + SMBL + "\n"
                  } if (SMBXL != "") {
                    message += "เบอร์ XL :: " + SMBXL + "\n"
                  } if (SMB2XL != "") {
                    message += "เบอร์ 2XL :: " + SMB2XL + "\n"
                  } if (SMB3XL != "") {
                    message += "เบอร์ 3XL :: " + SMB3XL + "\n"
                  } if (SMB4XL != "") {
                    message += "เบอร์ 4XL :: " + SMB4XL + "\n"
                  } if (SMB5XL != "") {
                    message += "เบอร์ 5XL :: " + SMB5XL + "\n"
                  } if (SMB6XL != "") {
                    message += "เบอร์ 6XL :: " + SMB6XL + "\n"
                  }

                }

                message += "" + "\n"
                message += "📝 หมายเหตุ : " + Note;

                BCT.Telegramsend_pkg_fix(token, message, '')    //เทส
              } else {
                BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, "B1_เสื้อ_AAM_67_68_รายวัน", formData, optionField);
              }
            } else {
              จำนวนเสื้อต้องไม่เกิน5ตัว_กรุณาrefresh_และเลือกใหม่อีกครั้ง
            }


          } else if (spreadsheet_id == '1bE3VNKrbxvTXJtbJ6soAvjCWyOOF_hwmzPrlDGvZFaQ' && sheetName == "B1_บันทึกตอบกลับ_PMS ศูนย์บริการ_NEW") {
            //เก็บไว้ copy
            //วางข้อมูล
            // var spreadsheet_id = "1bE3VNKrbxvTXJtbJ6soAvjCWyOOF_hwmzPrlDGvZFaQ";
            // var sheetName = "B1_บันทึกตอบกลับ_PMS ศูนย์บริการ_NEW";
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            var jsonQR = JSON.parse(formData["qrcode"]);
            var qrcodeStr = jsonQR["qrCode"];
            var urlQR = "https://chart.googleapis.com/chart?chld=H&chs=312x312&cht=qr&chl=" + qrcodeStr + "&choe=UTF-8";
            var messageQR = "รับชำระเงินศูนย์บริการ สาขา" + formData["reference1"] + "\nยอดชำระ : " + numberWithCommas(formData["txnAmount"]) + " บาท\n\nแสกนชำระได้ที่นี่...";
            // messageQR+="";
            var tokenQR = formData["tokenLine"];
            if (tokenQR != "") {
              // BCT.LineNotify(tokenQR, '', messageQR);
              BCT.LineNotify2(tokenQR, messageQR, '', '', '', urlQR);
            }

            try {
              BCT.notify_pms_phone(formData["tel"].toString().split("-").join(""), "ชำระเงินศูนย์บริการ", messageQR, "", urlQR, "notificationPic");
            } catch (error) {

            }


          } else if (spreadsheet_id == 'เงื่อนไข SSID' && sheetName == "เงื่อนไขชื่อชีท") {
            //เก็บไว้ copy
            //วางข้อมูล
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            //บันทึกข้อมูลลงฐาน
            var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            var shDes = ssDes.getSheetByName(sheetName);
            var rowUpdate = shDes.getLastRow();
            shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            SpreadsheetApp.setActiveSpreadsheet(ssDes);
            SpreadsheetApp.setActiveSheet(shDes);
            SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (spreadsheet_id == '1cMcQ1HRXIZNwKAEimOEjzqMCUyp3hT2RpXDCjHbwkjw' && sheetName == "B1_ประวัติ Upload ใบแจ้งหนี้") {
            //เก็บไว้ copy
            //วางข้อมูล
            // var body = {
            //   "start_date" : formData["start_date"],
            //   "end_date" : formData["end_date"],
            //   "type_file" : formData["type_file"],
            //   "full_file" : formData["full_file"],
            //   "cut_file" : formData["cut_file"]
            // }
            var name_file_report = "AFSInvoiceHistoryReportSummary";
            if (formData["type_file"] == "รายงานใบแจ้งหนี้ทั้งหมด (แบบรายละเอียด)") {
              name_file_report = "AFSInvoiceHistoryDetail";
            }
            var body = {
              "name_file_report": name_file_report,
              "file_full": formData["full_file"],
              "file_short": formData["cut_file"],
              "s_date": formData["start_date"],
              "e_date": formData["end_date"]
            }

            var params = {
              method: "POST",
              contentType: "application/json",
              payload: JSON.stringify(body)
            };
            var response = UrlFetchApp.fetch("https://puppeteer-pkg.agilesoftgroup.com/upload_mirai_manual", params);
            var json = JSON.parse(response);
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            // var messageLiTG = "แจ้งคุณ " + formData["member_id_name"];
            // messageLiTG += "\nลงทะเบียนจากใจถึงใจ PMS  เรียบร้อย";
            // messageLiTG += "\nขอบคุณค่ะ PMSC";
            // BCT.Telegramsend_pkg_fix(formData["member_id"].toString(), messageLiTG, "");
            //บันทึกข้อมูลลงฐาน
            // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            // var shDes = ssDes.getSheetByName(sheetName);
            // var rowUpdate = shDes.getLastRow();
            // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            // SpreadsheetApp.setActiveSpreadsheet(ssDes);
            // SpreadsheetApp.setActiveSheet(shDes);
            // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            // BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (spreadsheet_id == '1FO2njfdkDOUvpyX9WcEhoqrQDNcrV0vYzLqcM4DMYXE' && sheetName == "B1_Forms_ตอบรับ") {
            //เก็บไว้ copy
            //วางข้อมูล
            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
            var messageLiTG = "แจ้งคุณ " + formData["member_id_name"];
            messageLiTG += "\nลงทะเบียนจากใจถึงใจ PMS  เรียบร้อย";
            messageLiTG += "\nขอบคุณค่ะ PMSC";
            BCT.Telegramsend_pkg_fix(formData["member_id"].toString(), messageLiTG, "");
            //บันทึกข้อมูลลงฐาน
            // var ssDes = SpreadsheetApp.openById(spreadsheet_id);
            // var shDes = ssDes.getSheetByName(sheetName);
            // var rowUpdate = shDes.getLastRow();
            // shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
            // SpreadsheetApp.setActiveSpreadsheet(ssDes);
            // SpreadsheetApp.setActiveSheet(shDes);
            // SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
            // BCT.saveDataSpreadsheetByTemplate(false, false, false);
          } else if (formIndex['form_name'] == 'like') {
            if (spreadsheet_id == '1k0XHARIELqOz4txvSgiZKXK7GGYQoNvPQ2BnZBYplfU' && sheetName == "B1_Forms_ตอบรับการสำรวจลงทะเบียนซื้อเหรียญ") {

              //เก็บไว้ copy
              //วางข้อมูล
              BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
              //บันทึกข้อมูลลงฐาน
              var ssDes = SpreadsheetApp.openById(spreadsheet_id);
              var shDes = ssDes.getSheetByName(sheetName);
              var rowUpdate = shDes.getLastRow();
              shDes.getRange(BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@') + "" + rowUpdate + ":" + BCT.nameColumnByFliedName(BCT.getField(shDes, BCT.form_getRowByKey(shDes, 'process'), 1, 0), '@')).setValue("X");
              SpreadsheetApp.setActiveSpreadsheet(ssDes);
              SpreadsheetApp.setActiveSheet(shDes);
              SpreadsheetApp.setActiveRange(shDes.getRange('A' + rowUpdate));
              BCT.saveDataSpreadsheetByTemplate(false, false, false);

              BCT.Telegramsend_pkg_fix("-971702023", "มีผู้ลงทะเบียน สนใจ Lock+ \n\n สามารถเช็คได้ที่ https://ags.im/zuFPoF", "");

            }






          } else {
            Logger.log("เข้า Else222222 " + spreadsheet_id);
            //10/02/2021 เพิ่มเรื่องการบันทึกเวลาเมื่อมีการกดบันทึก (ฟิกฟิกจากฟอร์มก่อน) **** รอระบบคอนฟิกจาก A2_Forms ****
            if (formIndex['form_name'] == 'agsTem') {
              formData['temperature_timestamp'] = Utilities.formatDate(new Date(), "GMT+7", 'yyyy-MM-dd HH:mm:ss');
            } else {
              formData['createtime_timestamp'] = Utilities.formatDate(new Date(), "GMT+7", 'yyyy-MM-dd HH:mm:ss');
            }

            if (formIndex['form_name'] == 'regis_mail') {
              if (spreadsheet_id == '1_Sbi2zsSqAicc-0Rvt5Dc30OnqKmfz7RN2GdNqhKlgY' && sheetName == "A3_ข้อมูลทะเบียน Email") {
                var gmail_password = formData["gmail_password"];
                SpreadsheetApp.setActiveSpreadsheet(SpreadsheetApp.openById(spreadsheet_id));
                formData["gmail_password"] = BCT.putAccessKey(gmail_password);

                var member_id = formData["member_id"];
                var test = BLOCK.approveProcess(member_id, "BCT_Email_PKG", "ลงทะเบียนอีเมล์");


              } else if (spreadsheet_id == '1_Sbi2zsSqAicc-0Rvt5Dc30OnqKmfz7RN2GdNqhKlgY' && sheetName == "B1_ลงทะเบียน Email Team") {
                var email_team_code = formData["email_team_code"];
                SpreadsheetApp.setActiveSpreadsheet(SpreadsheetApp.openById(spreadsheet_id));
                formData["email_team_code"] = BCT.putAccessKey(email_team_code);


              }
            }




            BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);

            if (sheetName == 'B2_ตรวจคำตอบ') {
              try {
                var ssForm = SpreadsheetApp.openById(spreadsheet_id);
                var shForm = ssForm.getSheetByName(sheetName);
                var rowStartValueForm = BCT.form_getRowStartValueByKey(shForm, 'process');
                var rowFieldsForm = BCT.form_getRowFieldPutByKey(shForm, 'process');
                var fieldsForm = BCT.getField(shForm, rowFieldsForm, 1, 0);
                if (BCT.numberColumnByFliedName(fieldsForm, 'exam_score') > 0) {
                  formIndex['formIndex_status'] = 99;
                  var valuesAllForm = BCT.getValuesAll(shForm, rowStartValueForm, 1);
                  for (var v = (valuesAllForm.length) - 1; v >= 0; v--) {
                    var member_id = BCT.valueByFliedName(fieldsForm, [valuesAllForm[v]], 'member_id');
                    if (Number(member_id) == Number(formData['member_id'])) {
                      var exam_score = BCT.valueByFliedName(fieldsForm, [valuesAllForm[v]], 'exam_score');
                      var exam_score_pass = BCT.valueByFliedName(fieldsForm, [valuesAllForm[v]], 'exam_score_pass');
                      var exam_results = BCT.valueByFliedName(fieldsForm, [valuesAllForm[v]], 'exam_results');
                      var exam_score_max = BCT.valueByFliedName(fieldsForm, [valuesAllForm[v]], 'exam_score_max');

                      var member_id_name = formData['member_id_name'];
                      var title_message = "";
                      try {
                        title_message = ssForm.getRange('A2_Forms!F16').getValue();
                      } catch (e) { }
                      var message_exam = "ผลสอบ : " + title_message + " ของ " + member_id_name;
                      message_exam += "\nคะแนนเต็ม " + exam_score_max + " คะแนน\nเกณฑ์ผ่าน " + exam_score_pass + " คะแนน";
                      message_exam += "\nคะแนนทำได้ " + exam_score + " คะแนน";
                      message_exam += "\nผลการสอบ : " + exam_results + "";
                      message_exam += "\nบันทึกข้อมูลเรียบร้อย";

                      if (spreadsheet_id == "1ZGhCHrvFUjds2R9mWVzu9feWtBxIVw9YnoGz86z0Vfs") {
                        BCT.TelegramBot_sendMessage("AGSSDS", -721470737, message_exam)
                        //                    BCT.TelegramBot_sendMessage(botName, chat_id, message, message_id)
                      } else {
                        BCT.notifyMemberPKG(member_id, '', '', message_exam);
                      }


                      var formIndex_message = "<h3>ผลการสอบ</h3><h4><br>คะแนนเต็ม " + exam_score_max + " คะแนน<br>เกณฑ์ผ่าน " + exam_score_pass + " คะแนน";
                      formIndex_message += "<br>คะแนนทำได้ " + exam_score + " คะแนน";
                      if (exam_results != 'ผ่าน') {
                        formIndex_message += "<br>ผลการสอบ : <span style=\"color:red\"><b>" + exam_results + "</b></span></h4> ";
                      } else {
                        formIndex_message += "<br>ผลการสอบ : <span style=\"color:#27EA0C\"><b>" + exam_results + "</b></span></h4> ";
                      }

                      formIndex_message += "<h5><br>บันทึกข้อมูลเรียบร้อย</h5>";
                      formIndex['formIndex_message'] = formIndex_message;
                      break;
                    }
                  }
                }
              } catch (e) { }
            }
            if (sheetName == 'B2_ตรวจคำตอบ_4C') {//ข้อความส่งแจ้งเตือนของพี่เอ๋ โดยอนุชิดา 
              try {


                var ssForm1 = SpreadsheetApp.openById(spreadsheet_id);
                var shForm1 = ssForm1.getSheetByName(sheetName);
                var rowStartValueForm1 = BCT.form_getRowStartValueByKey(shForm1, 'process');
                var rowFieldsForm1 = BCT.form_getRowFieldPutByKey(shForm1, 'process');
                var fieldsForm1 = BCT.getField(shForm1, rowFieldsForm1, 1, 0);
                if (BCT.numberColumnByFliedName(fieldsForm1, 'exam_score') > 0) {
                  formIndex['formIndex_status'] = 99;
                  var valuesAllForm1 = BCT.getValuesAll(shForm1, rowStartValueForm1, 1);
                  for (var v = (valuesAllForm1.length) - 1; v >= 0; v--) {
                    var member_id1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'member_id');
                    if (Number(member_id1) == Number(formData['member_id'])) {
                      var exam_score1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'exam_score');
                      var exam_score_pass1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'exam_score_pass');
                      var exam_score_max1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'exam_score_max');
                      var exam_results1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'exam_results');
                      //วันที่โอนlike
                      var date_like1 = BCT.valueByFliedName(fieldsForm1, [valuesAllForm1[v]], 'date_like');

                      if (date_like1 !== "") {
                        date_like1 = Utilities.formatDate(date_like1, "GMT+7", "dd/MM/yyyy")
                      }



                      var member_id_name1 = formData['member_id_name'];
                      var title_message1 = "";
                      try {
                        title_message1 = ssForm1.getRange('A2_Forms!F16').getValue();
                      } catch (e) { }

                      var message_exam1 = "🎉✨' แจ้ง คุณ : " + member_id_name1;
                      message_exam1 += "\nได้ตอบคำถาม : " + title_message1;
                      message_exam1 += "\n\n✅️'คะแนนที่ได้ : " + exam_score1 + " คะแนน";
                      message_exam1 += "\n💰'ได้รับ : " + exam_score_pass1 + " Likepoint";
                      message_exam1 += "\n\n📌 ทาง 4C โอน Likepoint ";
                      message_exam1 += "\n📆 ภายในวันที่ : " + date_like1;

                      message_exam1 += "\n\n 🙏🏻💗 'ทีม 4C ขอขอบพระคุณค่ะ' 💖🙏🏻";
                      message_exam1 += "\nบันทึกข้อมูลเรียบร้อย";



                      BCT.notifyMemberPKG(member_id1, '', '', message_exam1);

                      var formIndex_message1 = "<h3>ผลการสอบ</h3><h4> " + "<br>ได้รับ : " + exam_score_pass1 + " Likepoint";
                      formIndex_message1 += "<br>คะแนนทำได้ " + exam_score1 + " คะแนน";
                      if (exam_results1 != 'ผ่าน') {
                        formIndex_message1 += "<br>ผลการสอบ : <span style=\"color:red\"><b>" + exam_results1 + "</b></span></h4> ";
                      } else {
                        formIndex_message1 += "<br>ผลการสอบ : <span style=\"color:#27EA0C\"><b>" + exam_results1 + "</b></span></h4> ";
                      }

                      formIndex_message1 += "<h5><br>บันทึกข้อมูลเรียบร้อย</h5>";
                      formIndex['formIndex_message'] = formIndex_message1;
                      break;
                    }
                  }
                }
              } catch (e) { }
            }
            //จบของอนุชิดา 
            //บอร์ดเสียงลูกค้าภายใน จิ๊บเพิ่ม
            else if (spreadsheet_id == "1lnx6tr09FqiG444jGrD9DG195OKmVhfqMcWrWMDxNg8" && sheetName == "การตอบแบบฟอร์ม 1") {
              // BCT.autoInsertToSpreadsheetByFirebase(spreadsheet_id, sheetName, formData, optionField);
              var data = formData;

              var aam = "@arayania @Mattanakan"
              var pms = "@notejung PMS-INP&PDD-อรวรรณ(โน๊ตจัง) @kamonratwat"
              var cdb = "@arayania @Mattanakan "
              var pgh = "@notejung PMS-INP&PDD-อรวรรณ(โน๊ตจัง)"
              var tg = BCT.Mid(formData["member_id2_division_name"], 5, 3);
              var pa = formData["member_id2_division_bu"];

              var perpon = ""
              if (pa == "PMSG") {
                perpon = pms
              } else if (pa == "CPDG") {
                perpon = cdb
              } else if (pa == "PGHG") {
                perpon = pgh
              } 
              else {
                perpon = aam
              }

              var message = "📣INP : มีลูกค้าแจ้ง ออกเสียงของลูกค้าภายใน มาค่ะ" + "\n";

              message += "\n 💁ผู้เสนอข้อร้องเรียน : " + formData["member_name"];
              message += "\n 👤ผู้ได้รับข้อเสนอแนะ : " + formData["member_id2_name"];
              message += "\n\n 🗒เรื่อง : " + formData["notes"];
              message += "\n\n 📌เข้าไปกดวิเคราะห์ประเด็นที่ Link นี่ http://ags.im/y2ERL1 ";
              message += "\n 🙏 ขอบคุณค่ะ❤😊";


              // ต้องส่งแจ้งเตือนส่วนนี้มีไปทำเพิ่มไว้ที่ของรังส่วนของ  lockprocess ด้วย 23/03/2024
              // BCT.Telegramsend_pkg_fix("-728758261", perpon + "\n" + message, "");
              // BCT.Telegramsend_pkg_fix("-568452549", perpon + "\n" + message, "");
              // BCT.Telegramsend_pkg_fix("-790393867", perpon + "\n" + message, "");
              // BCT.Telegramsend_pkg_fix("-1001480304795", perpon + "\n" + message, "");
              // BCT.Telegramsend_pkg_fix("-919158302", perpon + "\n" + message, "");

              try {
                BCT.Telegramsend_pkg_fix("-728758261", perpon + "\n" + message, "");
              } catch (e) {
                Logger.log("Error sending message to -728758261: " + e.message);
              }

              try {
                BCT.Telegramsend_pkg_fix("-568452549", perpon + "\n" + message, "");
              } catch (e) {
                Logger.log("Error sending message to -568452549: " + e.message);
              }

              try {
                BCT.Telegramsend_pkg_fix("-790393867", perpon + "\n" + message, "");
              } catch (e) {
                Logger.log("Error sending message to -790393867: " + e.message);
              }

              try {
                BCT.Telegramsend_pkg_fix("-1001480304795", perpon + "\n" + message, "");
              } catch (e) {
                Logger.log("Error sending message to -1001480304795: " + e.message);
              }

              try {
                BCT.Telegramsend_pkg_fix("-919158302", perpon + "\n" + message, "");
              } catch (e) {
                Logger.log("Error sending message to -919158302: " + e.message);
              }


              ////ทดสอบ
              // BCT.Telegramsend_pkg_fix("-646796433", perpon+"\n"+message, ""); //ห้องน้องอุษา ทดสอบ




              /////




            }

          }
        }
      }
    }

    //เพิ่มระบบส่งไลน์แจ้งเตือน
    var form_alert_type = formResponse[spreadsheet_id]['form_alert_type'];
    var form_alert_token = formResponse[spreadsheet_id]['form_alert_token'];
    var form_alert_message = formResponse[spreadsheet_id]['form_alert_message'];
    var form_alert_stickpacket = formResponse[spreadsheet_id]['form_alert_stickpacket'];
    var form_alert_stickid = formResponse[spreadsheet_id]['form_alert_stickid'];
    var form_alert_image_url = formResponse[spreadsheet_id]['form_alert_image_url'];

    var form_spreadsheet_sheet = formResponse[spreadsheet_id]['form_spreadsheet_sheet'];

    //    Logger.log(spreadsheet_id)
    //    Logger.log(sheetName)
    //    Logger.log(formData["cost_type"])
    if (spreadsheet_id == '1dCNxSV2SHe9VhSaZeq79WOMwZcAIbum8HzrZp7Eii6M' || spreadsheet_id == '1mhQhO8tYCKgPl1QgHZlCiOZU4lp5TKMF83QzoEDrXDk' && sheetName == 'B1_ค่าใช้จ่าย') {
      form_alert_type = '';
      if (formData["cost_type"] == 'ค่าไก่เกลี่ยห้องการบ้าน' ||
        formData["cost_type"] == 'ค่ายึดรถห้องการบ้าน' ||
        formData["cost_type"] == 'ค่าไก่เกลี่ย ปกส.' ||
        formData["cost_type"] == 'ค่ายึดรถ ปกส.' ||
        formData["cost_type"] == 'ค่าส่งจดหมาย') {
        form_alert_type == 'LINE' || form_alert_type == 'TELEGRAM' || form_alert_type == 'LINE-TELEGRAM' || form_alert_type == 'TELEGRAMOG'
      }
    }


    if (form_alert_type != '' && form_alert_token != '' && form_alert_message != '' && form_alert_type != undefined && form_alert_token != undefined && form_alert_message != undefined) {
      var message = " ";
      var form_alert_messages = form_alert_message.split("^");
      var form_alert_message_size = form_alert_messages.length;
      for (var n = 0; n < form_alert_message_size; n++) {
        var text = "";
        var alert_messages = form_alert_messages[n].split("|");
        var alert_messages_size = alert_messages.length;
        //        for (var m = 0; m < alert_messages_size; m++) {
        //          if(formData[alert_messages[m]]!=undefined){
        //            var messageForm = formData[alert_messages[m]];
        //            if(messageForm.toString().substring(0,8)=="https://"){
        //              var messageForms = messageForm.split(",");
        //              for(var mf=0;mf<messageForms.length;mf++){
        //                if(mf==0){
        //                  messageForm = BCT.shortenURL(messageForms[mf]);
        //                }else{
        //                  messageForm += " , "+BCT.shortenURL(messageForms[mf]);
        //                }
        //              }
        //            }
        //            text += messageForm;
        //          }else{
        //            text += alert_messages[m];
        //          }   
        //        }
        for (var m = 0; m < alert_messages_size; m++) {
          if (alert_messages[m].split("@").length > 1) {
            if (formData[alert_messages[m].split("@")[0]] != undefined) {
              var messageForm = formData[alert_messages[m].split("@")[0]];
              if (alert_messages[m].split("@")[1] == "loonum") {
                try {
                  messageForm = BCT.convertToNumber2f_loonum(Number(messageForm));
                } catch (e) { }
              }
              if (messageForm.toString().substring(0, 8) == "https://") {
                var messageForms = messageForm.split(",");
                for (var mf = 0; mf < messageForms.length; mf++) {
                  if (mf == 0) {
                    messageForm = BCT.shortenURL(messageForms[mf]);
                  } else {
                    messageForm += " , " + BCT.shortenURL(messageForms[mf]);
                  }
                }
              }
              text += messageForm;
            } else {
              text += alert_messages[m];
            }
          } else {
            if (formData[alert_messages[m]] != undefined) {
              var messageForm = formData[alert_messages[m]];
              if (messageForm.toString().substring(0, 8) == "https://") {
                var messageForms = messageForm.split(",");
                for (var mf = 0; mf < messageForms.length; mf++) {
                  if (mf == 0) {
                    messageForm = BCT.shortenURL(messageForms[mf]);
                  } else {
                    messageForm += " , " + BCT.shortenURL(messageForms[mf]);
                  }
                }
              }
              text += messageForm;
            } else {
              text += alert_messages[m];
            }
          }
        }

        if (message == '') {
          message += text;
        } else {
          message += "\n " + text;
        }
      }
      Logger.log("เข้า " + form_alert_type);



      if (form_alert_type == 'LINE' || form_alert_type == 'TELEGRAM' || form_alert_type == 'LINE-TELEGRAM' || form_alert_type == 'TELEGRAMOG') {


        Logger.log("เข้า... LINE");
        var form_alert_tokens = form_alert_token.split("|");
        var form_alert_token_size = form_alert_tokens.length;
        for (var f = 0; f < form_alert_token_size; f++) {
          if (form_alert_tokens[f].substring(0, 12).toUpperCase() == 'SENDTOMEMBER') {
            try {
              var id = formData[form_alert_tokens[f].split("^")[1]];
              var token_Line = BCT.CheckTokenOfIDFromPKGemployee(id);
              var messages = message.split("`");
              for (var s = 0; s < messages.length; s++) {
                //                BCT.LineNotify(token_Line, '', messages[s]);
                BCT.notifyMemberPKG(id, token_Line, '', messages[s]);
              }
              //              BCT.LineNotify(token_Line, '', message);
            } catch (e) { }
          } else {
            var messages = message.split("`");
            for (var s = 0; s < messages.length; s++) {
              try {
                if (form_alert_type == 'LINE-TELEGRAM') {
                  BCT.Telegramsend_pkg_fix(form_alert_tokens[f], messages[s], '');
                  BCT.LineNotify(form_alert_tokens[f], '', messages[s]);
                } else if (form_alert_type == 'TELEGRAM') {
                  BCT.Telegramsend_pkg_fix(form_alert_tokens[f], messages[s], '');
                } else if (form_alert_type == 'TELEGRAMOG') {
                  var arr_text = [];
                  var json_member = {
                    "emp": form_alert_tokens[f],
                    "fromdata": {
                      "message": messages[s],
                      "img": ""
                    },
                  };

                  arr_text.push(json_member);

                  BCT.Telegramsend_pkg(arr_text)



                } else {
                  BCT.LineNotify(form_alert_tokens[f], '', messages[s]);
                }
              } catch (e) { }
            }
            //            BCT.LineNotify(form_alert_tokens[f], '', message);
          }
        }
      }
    }

    if (form_alert_type != '' && form_alert_token != '' && form_alert_image_url != '' && form_alert_type != undefined && form_alert_token != undefined && form_alert_image_url != undefined) {
      if (form_alert_type == 'LINE' || form_alert_type == 'TELEGRAM' || form_alert_type == 'LINE-TELEGRAM' || form_alert_type == 'TELEGRAMOG') {
        var alert_image_urls = form_alert_image_url.split("|");
        var alert_image_url_size = alert_image_urls.length;
        for (var m = 0; m < alert_image_url_size; m++) {
          var form_alert_tokens = form_alert_token.split("|");
          var form_alert_token_size = form_alert_tokens.length;
          for (var f = 0; f < form_alert_token_size; f++) {
            if (form_alert_tokens[f].substring(0, 12).toUpperCase() == 'SENDTOMEMBER') {
              try {
                var id = formData[form_alert_tokens[f].split("^")[1]];
                var token_Line = BCT.CheckTokenOfIDFromPKGemployee(id);
                var url = alert_image_urls[m];
                if (formData[url] != undefined) {
                  Logger.log(formData[url]);
                  if (formData[url].split(".")[formData[url].split(".").length - 1] == 'png' || formData[url].split(".")[formData[url].split(".").length - 1] == 'jpg' || formData[url].split(".")[formData[url].split(".").length - 1] == 'jpeg') {
                    var urls = formData[url].split(",");
                    for (var s = 0; s < urls.length; s++) {
                      Logger.log(urls[s]);
                      Logger.log(id);
                      //BCT.LineNotify2(token_Line, '', '', '', '', urls[s]);
                      BCT.notifyMemberPKG(id, token_Line, '', '', urls[s]);
                    }
                  }
                } else {
                  Logger.log(url);
                  try {
                    //BCT.LineNotify2(token_Line, '', '', '', '', url);
                    BCT.notifyMemberPKG(id, token_Line, '', '', url);
                  } catch (e) { }
                }
              } catch (e) { }
            } else {
              var url = alert_image_urls[m];
              if (formData[url] != undefined) {
                Logger.log(formData[url]);
                if (formData[url].split(".")[formData[url].split(".").length - 1] == 'png' || formData[url].split(".")[formData[url].split(".").length - 1] == 'jpg' || formData[url].split(".")[formData[url].split(".").length - 1] == 'jpeg') {
                  var urls = formData[url].split(",");
                  for (var s = 0; s < urls.length; s++) {
                    Logger.log(urls[s]);
                    try {
                      if (form_alert_type == 'LINE-TELEGRAM') {
                        BCT.Telegramsend_pkg_fix(form_alert_tokens[f], '', urls[s]);
                        BCT.LineNotify2(form_alert_tokens[f], '', '', '', '', urls[s]);
                      } else if (form_alert_type == 'TELEGRAM') {
                        BCT.Telegramsend_pkg_fix(form_alert_tokens[f], '', urls[s]);
                      } else if (form_alert_type == 'TELEGRAMOG') {

                        var arr_text = [];
                        var json_member = {
                          "emp": form_alert_tokens[f],
                          "fromdata": {
                            "message": "",
                            "img": urls[s]
                          },
                        };

                        arr_text.push(json_member);

                        BCT.Telegramsend_pkg(arr_text)



                      } else {
                        BCT.LineNotify2(form_alert_tokens[f], '', '', '', '', urls[s]);
                      }
                    } catch (e) { }
                  }
                }
              } else {
                Logger.log(url);
                try {
                  if (form_alert_type == 'LINE-TELEGRAM') {
                    BCT.Telegramsend_pkg_fix(form_alert_tokens[f], '', url);
                    BCT.LineNotify2(form_alert_tokens[f], '', '', '', '', url);
                  } else if (form_alert_type == 'TELEGRAM') {
                    BCT.Telegramsend_pkg_fix(form_alert_tokens[f], '', url);
                  } else if (form_alert_type == 'TELEGRAMOG') {
                    var arr_text = [];
                    var json_member = {
                      "emp": form_alert_tokens[f],
                      "fromdata": {
                        "message": "",
                        "img": urls[s]
                      },
                    };

                    arr_text.push(json_member);

                    BCT.Telegramsend_pkg(arr_text)


                  } else {
                    BCT.LineNotify2(form_alert_tokens[f], '', '', '', '', url);
                  }
                } catch (e) { }
              }
            }
          }
        }
      }
    }

    /* 16/10/2021 จ้อนเพิ่มเงื่อนไขการเก็บเข้า DLT */
    //    if(Session.getEffectiveUser().getEmail()=="chaiya@prachakij.com"){
    var form_dlt_type = formResponse[spreadsheet_id]['form_dlt_type'];
    var form_dlt_topic_id = formResponse[spreadsheet_id]['form_dlt_topic_id'];
    var form_dlt_data = formResponse[spreadsheet_id]['form_dlt_data'];
    if (form_dlt_type != "" && form_dlt_topic_id != "" && form_dlt_data != "") {
      if (form_dlt_type == "HCS") {
        try {
          var dataDLT = {}
          var form_dlt_datas = form_dlt_data.split("^");
          var form_dlt_datas_size = form_dlt_datas.length;
          for (var d = 0; d < form_dlt_datas_size; d++) {
            var datasStr = form_dlt_datas[d];
            var datasStr_split = datasStr.split(":");
            var data_Name = datasStr_split[0];
            var data_value = datasStr_split[1];

            var value = "";
            var value_split = data_value.split("|");
            var value_split_size = value_split.length;
            for (var vss = 0; vss < value_split_size; vss++) {
              if (formData[value_split[vss]] != undefined) {
                var messageForm = formData[value_split[vss]];
                if (messageForm.toString().substring(0, 8) == "https://" || messageForm.toString().substring(0, 7) == "http://") {
                  messageForm = BCT.shortenURL(messageForm);
                  //                  var messageForms = messageForm.split(",");
                  //                  for(var mf=0;mf<messageForms.length;mf++){
                  //                    if(mf==0){
                  //                      messageForm = BCT.shortenURL(messageForms[mf]);
                  //                    }else{
                  //                      messageForm += " , "+BCT.shortenURL(messageForms[mf]);
                  //                    }
                  //                  }
                }
                value += messageForm;
              } else {
                if (value_split[vss] == "today()") {
                  value_split[vss] = BCT.getFormatDate(new Date(), "dd/MM/yyyy HH:mm:ss");
                } else if (value_split[vss] == "email()") {
                  value_split[vss] = Session.getEffectiveUser().getEmail();
                }
                value += value_split[vss];
              }
            }

            if (value != "") {
              dataDLT[data_Name] = value;
            }
          }

          if (JSON.stringify(dataDLT) != "{}") {
            dataDLT['dlt_token'] = formData['dlt_token'];
            BCT.DLT_HederaPutMessageInTopic(form_dlt_topic_id, dataDLT);
            // BCT.DLT_HederaPutMessageInTopicByBCTService(form_dlt_topic_id, dataDLT);
          }
        } catch (e) {
          Logger.log(e);
        }
      }
    }
    //    }
    /* *** */
    return formIndex;
  }

  return {};
}


function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


function sdflkmsdlms() {

  //  BCT.LineNotify("7Opu4mJN9ldFgNvDsVXqrTvw7VuvACIX1hCpAbCZuf2", "", "test");
  BCT.Telegramsend_pkg_fix("-1001742657226", "test", "");

}