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
 *   1. Appends a row of the submission to the active sheet.
 *   2. Sends the results email via Gmail (send-only), from whichever
 *      Google account owns this script.
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // If this is the very first row, add headers.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Submitted at", "Business name", "Contact name", "Contact email", "Website",
      "Sector", "Employees", "Revenue", "Sites",
      "Climate", "Environment", "Nature", "Social", "Governance",
      "Summary"
    ]);
  }

  sheet.appendRow([
    data.submittedAt, data.businessName, data.contactName, data.contactEmail, data.website,
    data.sector, data.employees, data.revenue, data.sites,
    data.climateLevel, data.environmentLevel, data.natureLevel, data.socialLevel, data.governanceLevel,
    data.summaryText
  ]);

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

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
