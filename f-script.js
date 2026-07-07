/* [ใช้งานเฉพาะ] ค้นหา เบอร์อะไหล่PCC แบบหลายเงื่อนไข */
function getpart_norMultiKey(Keyword,nameUseID){
  try{
    var query = "SELECT NonMovementPartsReport_th.*,pic as pic_c FROM NonMovementPartsReport_th WHERE Column3 != '' and (Column3 like '%"+Keyword+"%' or Column4 like '%"+Keyword+"%') group by Column3,Column4 order by Column3 asc limit 5";
    var DBName = "MIRAI"; 
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  }catch(e){
    return e;
  }
}


/* [ใช้งานเฉพาะ] ค้นหา เบอร์อะไหล่PMS แบบหลายเงื่อนไข */
function getpart_norMultiKey_s(Keyword,nameUseID){
  try{
    var query = "SELECT n.*,s.branch,s.Wait_for_sale_n,s.Wait_for_sale_p,s.Damaged_n,s.Damaged_p,s.destroy_n,s.destroy_p FROM NonMovementPartsReport_th  n left join NonMovement_st s on (n.Column3 = s.Column3) WHERE n.Column3 != '' and (n.Column3 like '%"+Keyword+"%' or n.Column4 like '%"+Keyword+"%') group by n.Column3,n.Column4 order by n.Column3 asc limit 5";
    var DBName = "MIRAI"; 
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  }catch(e){
    return e;
  }
}


///PartsInventoryReport

function parts_inventory(Keyword,nameUseID){
  try{
    var query = "SELECT * FROM PartsInventoryReport WHERE Column6 != '' and (Column6 like '%"+Keyword+"%' or Column7 like '%"+Keyword+"%') group by Column6,Column7 order by Column6 asc limit 5";
    var DBName = "MIRAI"; 
    var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  }catch(e){
    return e;
  }
}


function searchPMSLineToken(tel){
  // try{
    var queryRDS = " select * from BCT_Line_Token_customers ";
          queryRDS += " where ";
          queryRDS += " centerPhone LIKE '%"+tel+"%' and token !='' and token IS NOT NULL ";
          queryRDS += " and centerPhone != '-' and centerPhone != '' ";

          var datasRDS = BCT.loadJSONDatas("RDS", 'BCT_AGS', queryRDS);
          var token = "";
          var fname_customer = "";
          var lname_customer = "";
          if(datasRDS.length>0){
           token = datasRDS[0]["token"];
          //  token  = "N75bt4MkEoifRtyzG58H5Iyvhn3myAlsEAglY0pCymv";
           fname_customer = datasRDS[0]["fname_customer"];
           lname_customer = datasRDS[0]["lname_customer"];
          }
          var json = {
            token : token,
            fname_customer : fname_customer,
            lname_customer : lname_customer,
          }

          return json;

  // }catch(e){
  //   return e;
  // }
}


function tgracfo_creategroup(json){
  var url = "https://telegram.agilesoftgroup.com/createGroupAuto_RAFCO";
  var payload = {
   "cust_name" : json["cust_name"]+" "+json["cust_lname"],
   "BU" : json["branch"],
   "username" : json["username"],
   "tel" : json["tel"]
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());

  return json;
}

function tgracfo_creategroup_not(json){
  var url = "https://telegram.agilesoftgroup.com/createGroupAuto_RAFCO";
  var payload = {
   "cust_name" : json["cust_name"]+" "+json["cust_lname"],
   "BU" : json["branch"],
   "username" : json["username"],
   "tel" : json["tel"],
   "custChk" : 1
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());

  return json;
}


function sc_select_customer(name){
   var ss = SpreadsheetApp.openById("1UfWsppqm9uABeftqj48-JN_bGrDV7wMdnAnlbY9Jahg");
   var sheet = ss.getSheetByName("ข้อมูลประดับยนต์เทียบกับประกัน");
   var sheetT = ss.getSheetByName("B1_Forms_ตอบรับ");
   var dataConfig = sheetT.getRange("E15:E").getValues();
   var jsonConfig = {};
   for(var i=0;i<dataConfig.length;i++){
      if(dataConfig[i][0]!=""){
        jsonConfig[dataConfig[i][0]] = 1;
      }
   }
   var data = sheet.getRange("A12:J").getValues();
   var result = [];
   for(var i=0;i<data.length;i++){
    if(data[i][9]==name){
      var text = data[i][7]+" : "+data[i][4]+" / "+data[i][5]+" / "+data[i][9];
      if(jsonConfig[data[i][7]]==undefined){
      result.push(text);
      }
    }
   }

   return result;
}