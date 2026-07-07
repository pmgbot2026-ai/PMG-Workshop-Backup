
function loadDropdownIdRent(name){
  var datas = [];
  var ss = SpreadsheetApp.openById('1vHgII04pPtYFO_6PzoqVmm1FXM9kLNlNAWv_fkrRNhk');
  var sheet = ss.getSheetByName('B2_Contract');
  var fields = BCT.getFields(sheet, BCT.form_getRowFieldsByKey(sheet, 'process'), 1, 0);
  var valuesAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, 'process'), 1);
  for(var v=0;v<valuesAll.length;v++){
    var values = [valuesAll[v]];

    var  on = BCT.valueByFliedName(fields, values, 'status_contract')
    //  Logger.log("on");
    //   Logger.log(on);

    if(BCT.valueByFliedName(fields, values, 'name_rent')==name  ){
       if( BCT.valueByFliedName(fields, values, 'status_contract')!="ยกเลิก"){
        var json = {};
      json['id_rent'] = BCT.valueByFliedName(fields, values, 'id_rent')
      datas.push(json);
      /// Logger.log(json);

       }


      

    }
  }
  return datas;
 // Logger.log(datas);
  
}

function loadRent(id_rent){
  //  var datas = [];


  var ss = SpreadsheetApp.openById('1vHgII04pPtYFO_6PzoqVmm1FXM9kLNlNAWv_fkrRNhk');
  var sheet = ss.getSheetByName('B2_Contract');
  var fields = BCT.getFields(sheet, BCT.form_getRowFieldsByKey(sheet, 'process'), 1, 0);
  var valuesAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, 'process'), 1);
  for(var v=0;v<valuesAll.length;v++){
    var values = [valuesAll[v]];
    if(BCT.valueByFliedName(fields, values, 'id_rent')==id_rent  ){
      var json = {};
      //      for(var f=0;f<fields[0].length;f++){
      //        
      //        if(fields[0][f]!='' && fields[0][f]!='start_date' && fields[0][f]!='due_date' && fields[0][f]!='timestamp' && fields[0][f]!='uploadPIcture'){
      ////          if(fields[0][f]=='start_date' || fields[0][f]=='due_date' || fields[0][f]=='timestamp'){
      ////            try{
      ////              if(BCT.valueByFliedName(fields, values, fields[0][f])!=''){
      ////                json[fields[0][f]] = Utilities.formatDate(BCT.valueByFliedName(fields, values, fields[0][f]), 'GMT+7', 'dd/MM/yyyy');
      ////              }
      ////            }catch(e){}
      ////          }else 
      //            if(BCT.valueByFliedName(fields, values, fields[0][f])!=''){
      //            json[fields[0][f]] = BCT.valueByFliedName(fields, values, fields[0][f]);
      //          }
      //        }
      //        
      //      }
      json['tenancy'] = BCT.valueByFliedName(fields, values, 'tenancy');
      json['rentalrate'] = BCT.valueByFliedName(fields, values, 'rentalrate');
      json['rent'] = BCT.valueByFliedName(fields, values, 'rent');
      json['tokenRentLine'] = BCT.valueByFliedName(fields, values, 'tokenRentLine'); 
      return json;
    }
  }
  return {};
}

function loadIIU(gen_key){
  //  var datas = [];
  var ss = SpreadsheetApp.openById('1v7sh2JqwZEGVV6ZXNVTTBQq7dGVW7W_jLgmBpt0Om1c');
  var sheet = ss.getSheetByName('IIU_FIM_Step_1');
  var fields = BCT.getFields(sheet, BCT.form_getRowFieldsByKey(sheet, 'process'), 1, 0);
  var valuesAll = BCT.getValuesAll(sheet, BCT.form_getRowStartValueByKey(sheet, 'process'), 1);
  for(var v=0;v<valuesAll.length;v++){
    var values = [valuesAll[v]];
    if(BCT.valueByFliedName(fields, values, 'gen_key')==gen_key){
      var json = {};
      json['s1_subject'] = BCT.valueByFliedName(fields, values, 's1_subject');
      json['s1_usermonye'] = BCT.valueByFliedName(fields, values, 's1_usermonye');
      json['s1_exchange'] = BCT.valueByFliedName(fields, values, 's1_exchange');
      json['s1_money'] = BCT.valueByFliedName(fields, values, 's1_money');      
      json['s1_note'] = BCT.valueByFliedName(fields, values, 's1_note');   
      return json;
    }
  }
  return {};
}