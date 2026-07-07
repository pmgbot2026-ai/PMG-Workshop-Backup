function searchContract_Rafco(Keyword,nameUseID){
  try{
    var DBsever = "tbcontract_data";
    var DBName = "tbcontract_data";
    var payload = {
      "query": {
        "bool": {
          "should": [
            {
              "query_string": {
                "default_field": "ctt_code",
                "query": "*"+Keyword+"*"
              }
            }, {
              "query_string": {
                "default_field": "cust_name",
                "query": "*"+Keyword+"*"
              }
            }, {
              "query_string": {
                "default_field": "id_card",
                "query": "*"+Keyword+"*"
              }
            }, {
              "query_string": {
                "default_field": "addr_tel",
                "query": "*"+Keyword+"*"
              }
            }
            
            
          ]
        }
      }
    };
    
    var cached = BCT.loadJSONQuery_Elasticsearch(DBsever, DBName, payload);
    var datas = BCT.loadJSONDatas('', '', '', cached, '');
    var jsonData = {};
    jsonData['nameUse-ID'] = nameUseID;
    jsonData['datas'] = datas;
    return jsonData;
  }catch(e){
    return e;
  }
}






  function getmemo_rafco(Keyword){
    try{
      //var Keyword ="PNM201NHF0136660016"
      var query = " select * from tbmemo where memo_ctt_code like '"+Keyword+"' order by update_time desc limit 1";
      var DBName = "BCT_AMS2_RAFCO"; 
      var datas = BCT.loadJSONDatas(BCT.getDBServer(), DBName, query);
      return datas[0];
  }catch(e){
    return e;
  }
}










