/*
Libraries = 1r5zAL8YA47pUM_P7C-EaOgCr-zaPcjSiwhW58-x0BFvMjobXKMCJ3aWT

scriptID = id สคริป
deploymentID = Id ของ Version ที่ใช้งานปัจจุบัน กรณี ต้องการ deploy ลิงค์เดิม ถ้าเริ่ม Deploy ใหม่ ใส่ new ได้เลย 
nameScript = ชื่อ ไฟล์ หรือ ชื่อ ที่ลงทะบียนใน github 
ตัวอย่าง
gasDeploy(ScriptApp.getScriptId(), "new", "BCT-196");
gasDeploy(ScriptApp.getScriptId(), "AKfycbxgdG7tsJi9L0pSmjWG7mhJZFJORxbtN_iQoPa91sSJOQnZXuk", "BCT-196");
*/
function call_gasDeploy_prod() {
  //https://script.google.com/macros/s/AKfycbxgdG7tsJi9L0pSmjWG7mhJZFJORxbtN_iQoPa91sSJOQnZXuk/exec
  pkgDeploy.gasDeploy(ScriptApp.getScriptId(), "AKfycbxgdG7tsJi9L0pSmjWG7mhJZFJORxbtN_iQoPa91sSJOQnZXuk", "BCT-196");
}

function call_gasDeploy_Dev() {
  //https://script.google.com/macros/s/AKfycbw3n5njTKCblXTUf27BP8Ohxdrq7fJGUu5KmXJBs_Lw97y8SGLe5Hu-T0e9ConCuxUU/exec
  pkgDeploy.gasDeploy(ScriptApp.getScriptId(), "AKfycbw3n5njTKCblXTUf27BP8Ohxdrq7fJGUu5KmXJBs_Lw97y8SGLe5Hu-T0e9ConCuxUU", "BCT-196");
}
function chk_test() {
  Logger.log("เช็คสิทธิ์");
}