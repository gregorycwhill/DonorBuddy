/* Collection of scripts to support Donor Buddy
** This set relates to:
**
** 1) Scanning emails tagged as likely receipts 
** 2) Extracting PDF attachments and parsing for details (ABN, Date, Amount)
** 3) Adding to the master and user's sheet
** 4) Looking up ABN in reference data to add supplementary information
** 5) Add test transactions to a user's sheet
**
** TODO: Create user reports
** TODO: Embed user reports into nicer web page
** TODO: Script to send user email upon specified triggers
** TODO: Enhance date-matching logic
** TODO: Script to detect user from inbound email
**
** This also used in conjunction with the Donor Buddy - Registrations scripts
**/

/* Global variables
** 
** This is where the sheet IDs and names are kept.
** Global variables have leading uppercase
*/

  const MasterID = '1xEZXDpESXImPMg_VBHJKIr5NRZlA2YLW3DkrL55rrwI';
  const MasterName = 'Extract';

  const DefaultPrivateID = '8dbe7cbb07a2e536';   // 4a1db4ad0fbe2368'

  const RegistrationSheetID = '1tlXpNODB7QzHS9WS_XBzhIV4r__15eNc49TdBmWDRMs';
  const ProcSheetName = 'Processed';

  const ReferenceSheetID = '1qfhV-PEhZAPvOpHOnEvHMomA12fXDeiVsHSsDvaY5pk';
  const ReferenceSheetName = 'Processed';

  const DriveFolderID = '1EVrc6ml9rCGeWJn3F0rFseLLpCMtkPwS';

function convertPDFToText(fileID, language) {
  // https://www.labnol.org/extract-text-from-pdf-220422

  if (fileID==='') {
    Logger.log('convertPDFtoText: No fileID passed');
    return '';
  }

  language = language || 'en'; // English

  // Read the PDF file in Google Drive
  const pdfDocument = DriveApp.getFileById(fileID);

  // Use OCR to convert PDF to a temporary Google Document
  // Restrict the response to include file Id and Title fields only
  const { id, title } = Drive.Files.insert(
    {
      title: pdfDocument.getName().replace(/\.pdf$/, ''),
      mimeType: pdfDocument.getMimeType() || 'application/pdf',
    },
    pdfDocument.getBlob(),
    {
      ocr: true,
      ocrLanguage: language,
      fields: 'id,title',
    }
  );

  // Use the Document API to extract text from the Google Document
  const textContent = DocumentApp.openById(id).getBody().getText();

  // Delete the temporary Google Document since it is no longer needed
  DriveApp.getFileById(id).setTrashed(true);

  // (optional) Save the text content to another text file in Google Drive
  // const textFile = DriveApp.createFile(`${title}.txt`, textContent, 'text/plain');
  
  return textContent;
};
  
function extractABN(textContent) {
  const pattern = /ABN[^\d\s]*([\d\s]+)/;
  const matches = textContent.match(pattern) || [];

  Logger.log('extractABN: ' + matches);

  return matches[1].replace(/[^\d]/ig,'');
};

function extractDate(textContent) {
  const pattern = /Date[^\d]+([\d]+)\/([\d]+)\/([\d]+)/;
  const matches = textContent.replace(/\s/g, '').match(pattern) || [];

  Logger.log('extractDate: ' + matches);

  date = new Date(matches[3],matches[2],matches[1]);

  return date ;
};

function extractAmount(textContent) {
  const pattern = /\$([\d,\.]+)/gm;
  const matches = textContent.replace(/\s/g, '').match(pattern) || [];

  Logger.log('extractAmount: ' + matches);

  // logic is to return the largest amount as best-guess of what was actually paid (ie inclusive of fees, charges etc)
  // due to global search, regex match doesn't capture brackets. So, we need to convert matches to numerical array to find max.

  values = matches.map(AmountToValue);

  //Logger.log(values);

  values.sort(function(a, b){return b-a});  // reverse sort the array numerically

  Logger.log('extractAmount: ' + values[0]);                    // largest element

  return '$'+ values[0];
};

const AmountToValue = (amount) => {
  return +(amount.replace(/[^0-9\.]+/g, ''));
};

function writeReceipts(privateID, details) {

  // write details of receipt to user's sheet AND write to master sheet

  if (privateID === '' || details === '') {
    Logger.log('writeReceipts: no privateID or details');
  }

  // write to Master sheet

  const masterSheet = SpreadsheetApp.openById(MasterID).getSheetByName(MasterName);
  if (masterSheet.getLastRow() === 0) {
    sheet.appendRow(['PrivateID', 'ABN',	'Date',	'Amount',	'Charity Name',	'Website',	'Size',	'Location',	'Operates In',	'Goals',	'Beneficiaries',]);
  }
  masterSheet.appendRow([privateID].concat(details));
  masterSheet.getRange('C:C').setNumberFormat('dd/MM/yyyy');  // fix date format!
  SpreadsheetApp.flush(); 

// write to user's sheet

  const userSheetID = getUserSheetID(privateID);

  const userSheet = SpreadsheetApp.openById(userSheetID).getSheetByName('Sheet1');
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow(['ABN',	'Date',	'Amount',	'Charity Name',	'Website',	'Size',	'Location',	'Operates In',	'Goals',	'Beneficiaries',]);
  }
  userSheet.appendRow(details);
  userSheet.getRange('B:B').setNumberFormat('dd/MM/yyyy');  // fix date format!
  SpreadsheetApp.flush(); 

  Logger.log('writeReceipts: details = ' + details);

  return;
}

function getUserSheetID(privateID) {

  // given a user's PrivateID, returns their UserSheetID (ie Google Sheet ID)
  // the source is the processed registration sheet

  if (privateID===''|| typeof(privateID)=='undefined') {
    privateID = DefaultPrivateID;     
    Logger.log('getUserSheetID: no privateID. Using default value: ' + privateID);
  }

  const procS = SpreadsheetApp.openById(RegistrationSheetID).getSheetByName(ProcSheetName);

  // Creates  a text finder for the range.
  var textFinder = procS.createTextFinder(privateID);
  textFinder.matchEntireCell(true);
  textFinder.matchCase(false);

  // Returns the first occurrence of the string.
  var result = textFinder.findNext();
  Logger.log('getUserSheetID: ' + result);

  if (!result) {
    Logger.log('getUserSheetID: No match');
    return '';
  }

  const userSheetID = procS.getRange(result.getRow(),13,1,1).getValues()[0][0];  // find it in Column M

  Logger.log('getUserSheetID: row = ' + result.getRow() +' userSheetID = ' + userSheetID);

  return userSheetID;
}


function getReferenceData(ABN) {

  const sheet = SpreadsheetApp.openById(ReferenceSheetID).getSheetByName(ReferenceSheetName);

  // Creates  a text finder for the range.
  var textFinder = sheet.createTextFinder(ABN);
  textFinder.matchEntireCell(true);
  textFinder.matchCase(false);

  // Returns the first occurrence of the string.
  var result = textFinder.findNext();
  Logger.log('getReferenceData: ' + result);

  if (!result) {
    Logger.log('getReferenceData: No match');
    return '';
  }

  var row = result.getRow();
  var refData = sheet.getRange(row,2,1,7).getValues()[0]; // returns columns B through H

  Logger.log('getReferenceData: ' + refData);

  return refData;
}

function extractReceipt(pdfID, privateID) {

  // extract receipt details from a given PDF for a given user

  if (pdfID ===''|| privateID==='') {
    Logger.log("extractReceipt: No pdfID or privateID passed");
    return;
  }

  const text = convertPDFToText(pdfID);

  const ABN = extractABN(text);

  Logger.log('ABN = ' + ABN);

  const dt = extractDate(text);

  Logger.log('Date = ' + dt);

  const amount = extractAmount(text);

  Logger.log('amount = ' + amount);

  const refData = getReferenceData(ABN);

  if(refData==='') {
      details = [ABN, dt, amount, 'Not a charity'];
  }
  else {
    myDetails = [ABN, dt, amount].concat(refData);
  }

  Logger.log('extractAttachedReceipt: details = ' + details);

  writeReceipts(privateID, myDetails);

  return refData;
}

function triggerAttachedReceipt() {
  // cycle through labeled messages, save any PDFs into Drive folder and then call extract function on them. Change label once processed.

  var folder = DriveApp.getFolderById(DriveFolderID);
  
  const labelCharity = GmailApp.getUserLabelByName('ProcReceipt_Charity');
  const labelNotCharity = GmailApp.getUserLabelByName('ProcReceipt_NotCharity');
  const labelProcReceipt = GmailApp.getUserLabelByName('ProcReceipt_Test');

  const privateID = DefaultPrivateID;                             // TODO: extract user's actual PrivateID from their email address

  const threads = GmailApp.search('label:ProcReceipt_Test"');
  for (const thread of threads) {
    var hasCharityReceipt = false;
    const messages = thread.getMessages()

    for (const message of messages) {
      attachments = message.getAttachments();
      attachments.forEach(function(a){

        Logger.log('triggerAttachedReceipt: '+a.getName()+'  -  '+a.getContentType());

        if(a.getContentType()==='application/pdf') {

          folder.createFile(a.copyBlob()).setName(a.getName());
          var pdfID = folder.getFilesByName(a.getName()).next().getId();

          Logger.log('triggerAttachedReceipt: '+pdfID);

          var result = extractReceipt(pdfID, privateID);
          if (result != '') {
            hasCharityReceipt = true;
          }
        }
      });
    }

    // Update labels
    if(hasCharityReceipt) {
      thread.addLabel(labelCharity);
      Logger.log('triggerAttachedReceipt: Add Charity Label');
    }
    else {
      thread.addLabel(labelNotCharity);
      Logger.log('triggerAttachedReceipt: Add NOT Charity Label');
    }
    thread.removeLabel(labelProcReceipt);
  }
}

function addTestReceipts(n, privateID) {

  // select a random ABN, date and amount; insert that; repeat n times
  // gets the last date as the starting date
  // appends to user with PrivateID

  if (!n) {
    n = 2;
  }

  if (privateID===''|| typeof(privateID)=='undefined') {
    privateID = DefaultPrivateID; 
    Logger.log('addTestReceipts: no PrivateID. Using default value: ' + privateID);
  }

  const master = SpreadsheetApp.openById(MasterID).getSheetByName(MasterName);
  const reference = SpreadsheetApp.openById(ReferenceSheetID).getSheetByName(ReferenceSheetName);

  const dtStr = master.getRange(master.getLastRow(),3).getValues()[0][0]; // date returned as String from Column C

  var lastDt = Date.parse(dtStr); // date in milliseconds

  var dt = new Date(lastDt);      // new date
  
  //Logger.log('addTestReceipts: '+ dtStr + ' ' + lastDt + ' ' + dt);

  var days; 
  var amount;
  var row;
  var ABN;
  var refData;

  const maxABN = reference.getLastRow();

  for(i=0; i<n; i++) {
    // advance new date between 0 and 19 days
    
    days = Math.round(Math.random()*20);
    dt.setDate(dt.getDate()+ days);


    // Logger.log(dt + ' ');

    // set new amount at $10-$110

    amount = '$' + Math.round(Math.random()*10000)/100;

    // pick a random ABN

    row = Math.round(Math.random()*maxABN);

    ABN = reference.getRange(row,1).getValues()[0][0];

    refData = getReferenceData(ABN);

    if(refData==='') {
        details = [ABN, dt, amount, 'Not a charity'];
    }
    else {
      details = [ABN, dt, amount].concat(refData);
    }

    Logger.log('addTestReceipts: privateID=' + privateID + ' details = ' + details);

    writeReceipts(privateID, details);
  }

  return;

}


function myFunction() {

extractReceipt('1HPiRShstcWgB1upDn1SAAG4FXt-k58Uk','1xEZXDpESXImPMg_VBHJKIr5NRZlA2YLW3DkrL55rrwI');
//'1HPiRShstcWgB1upDn1SAAG4FXt-k58Uk' '18tBo0hqgRAwx4EDvfj4X1zuG7tzBTlNP'

}