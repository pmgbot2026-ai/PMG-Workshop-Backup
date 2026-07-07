/* 
ฟังก์ชัน สำหรับ อัพโหลด ลงฐานข้อมูล
*/
function newFileToNewFolder(form_question_fieldname, form_upload_folder, form_upload_filename, nameFile){
  var jsonData = {};
  var parentFolder=DriveApp.getFolderById(form_upload_folder);
  var folders=parentFolder.getFoldersByName(nameFile);
  var folder_Id_m = null;
  while (folders.hasNext()) {
    var folder = folders.next();
    folder_Id_m = folder.getId();
    break;
  } 
  
  if(folder_Id_m==null){
    var folder_Id_m = DriveApp.getFolderById(form_upload_folder).createFolder(nameFile).getId();
  }
  
  jsonData['form_question_fieldname'] = form_question_fieldname;
  jsonData['form_upload_folder'] = folder_Id_m;
  jsonData['form_upload_filename'] = form_upload_filename;
  return jsonData;
}

function uploadFileToDrive(base64Data, fileName, folders, fieldname) {
  try{
    fileName+= "_"+Utilities.formatDate(new Date, 'GMT+7', 'yyyyMMddhhmmsss');
    var splitBase = base64Data.split(',');
    var type = splitBase[0].split(';')[0].replace('data:','');
    
    var byteCharacters = Utilities.base64Decode(splitBase[1]);
    var ss = Utilities.newBlob(byteCharacters, type);
    ss.setName(fileName);
    var folder = DriveApp.getFolderById(folders);
    var file = folder.createFile(ss);    
    file.setOwner("gdoc@prachakij.com");
    
    
     
    var result = {};
    result['fieldname'] = fieldname;
    result['fileUrl'] = file.getUrl();
    result['base64Data'] = base64Data;
    result['fileName'] = fileName;
    result['folders'] = folders;      
    return result;
  }catch(e){
    return 'Error: ' + e.toString();
  }
}