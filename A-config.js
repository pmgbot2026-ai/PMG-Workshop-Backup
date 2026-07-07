var config = {
  /** 
  BCT : รายงาน  R_AAM
  **/
  "reportR": {
    "DBName": "BCT_AAM",
    "query": "select BCT_Stock_Car_Registration_Book.*,cust_name as name_borrower,car_regis as registration_number from BCT_Stock_Car_Registration_Book",
  },
  /** 
  BCT : รายงาน  R_RPLC 
  https://docs.google.com/spreadsheets/d/1Q7RQ6exNATLgmqYPRokpP7lftj1rTsg4XbtFw72ekt4/edit#gid=1158107786
  **/
  "reportR_RPLC": {
    "DBName": "BCT_RPLC",
    "query": "select BCT_Stock_Car_Registration_Book.*,cust_name as name_borrower,car_regis as registration_number from BCT_Stock_Car_Registration_Book",
    //    "query" : "select * from ( SELECT f.*,branch,product,name_borrower,registration_number FROM BCT_Financing f inner join BCT_GrantMTC g on f.grant_id=g.grant_id UNION ALL SELECT f.*,branch,product,name_borrower,registration_number FROM BCT_Financing f inner join BCT_GrantCAR g on f.grant_id=g.grant_id) financing",
  },
  /** 
  DTA_ตรวจสอบ และกำกับการจัดสินเชื่อ AAM NEW  
  https://docs.google.com/spreadsheets/d/1lQMUZAyqMB2sCIMP5SgOQjYG-EpwJtnZeZEl3teVBSY/edit#gid=1702335025
  **/
  "1lQMUZAyqMB2sCIMP5SgOQjYG-EpwJtnZeZEl3teVBSY": {
    "DBName": "BCT_AMS2",
    "query": "select * from (SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrandCar g on f.grant_id=g.car_id UNION ALL SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,mtc_number as car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrantMCT g on f.grant_id=g.grant_id UNION ALL SELECT f.grant_id,ctt_date,branch,product,company_Code,name_borrower,contract_number,car_number,summary_survey,conditional_approval_exceed,authorization,g.conditions_reasons_for_approval,legal_reality_check1,note_legal_reality_check1,legal_reality_check2,note_legal_reality_check2,legal_reality_check3,note_legal_reality_check3,legal_reality_check4,note_legal_reality_check4,summary_of_the_Law,the_legal_analysis,code_debtor_status,legal_reality_check_date,legal_reality_check_mail FROM BCT_Financing f left join BCT_GrantLAND g on f.grant_id=g.grant_id) financing",
  },
}


