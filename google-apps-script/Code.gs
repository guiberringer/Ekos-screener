/**
 * Paste this whole file into script.google.com (Extensions > Apps Script,
 * opened from your Google Sheet). See README.md for full setup steps.
 *
 * IMPORTANT: also copy appsscript.json (in this same folder) into the
 * project's manifest file — this restricts the permissions Google asks for
 * to only "this one spreadsheet" and "send email", instead of the much
 * broader defaults. See README section 7 for how to do this.
 *
 * What it does when the Netlify function calls it:
 *   1. Appends a row of the submission to the active sheet, with one column
 *      per field the function sends — every profile field and every
 *      individual screener question answer, not just a rollup summary.
 *      Headers are built automatically from whatever fields show up, and
 *      new columns get added on their own if the field set ever grows
 *      (e.g. a new screener question gets added later) — no need to edit
 *      this script just because the app's data shape changes.
 *   2. Sends the results email via Gmail (send-only), from whichever
 *      Google account owns this script.
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // emailSubject/emailHtmlBody/notifySubject/notifyHtmlBody are only for the
  // emails below, not sheet columns.
  var excluded = ["emailSubject", "emailHtmlBody", "notifySubject", "notifyHtmlBody"];
  var incomingKeys = Object.keys(data).filter(function (k) {
    return excluded.indexOf(k) === -1;
  });

  if (sheet.getLastRow() === 0) {
    // First submission ever — set up the header row from whatever fields arrived.
    sheet.appendRow(incomingKeys);
  } else {
    // If new fields have shown up since the header row was set (e.g. a new
    // screener question was added), add columns for them automatically.
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var missing = incomingKeys.filter(function (k) {
      return existingHeaders.indexOf(k) === -1;
    });
    if (missing.length > 0) {
      sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing]);
    }
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return data[h] !== undefined ? data[h] : "";
  });
  sheet.appendRow(row);

  try {
    MailApp.sendEmail(data.contactEmail, data.emailSubject, data.summaryText, {
      htmlBody: data.emailHtmlBody,
      name: "Ekos"
    });
  } catch (err) {
    // Row is already saved even if the email fails — log it so you can see why
    // in Apps Script's execution log (View > Executions).
    Logger.log("Email send failed: " + err.message);
  }

  // Only present when the user clicked "Request a call" — notifies the Ekos
  // team directly, with the lead's own address set as replyTo.
  if (data.notifySubject && data.notifyHtmlBody) {
    try {
      MailApp.sendEmail("ekos@ekos.co.nz", data.notifySubject, data.notifySubject, {
        htmlBody: data.notifyHtmlBody,
        name: "Ekos Screener",
        replyTo: data.contactEmail
      });
    } catch (err) {
      Logger.log("Team notification email failed: " + err.message);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
