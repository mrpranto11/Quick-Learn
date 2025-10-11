// ===============================
// QuickLearn Backend - Full Version (CORS FIXED)
// ===============================

var SPREADSHEET_ID = "1g_sZzatCWV8b1PSxfpaXl25R3c7pLv7iy4gEn3hojqg"; // your spreadsheet ID

// ===============================
// Handle OPTIONS (CORS Preflight)
function doOptions(e) {
  return ContentService
    .createTextOutput("") // empty OK
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ===============================
// Main POST handler
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return corsResponse({ status: "error", message: "No post data" }, 400);
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (!action) {
      return corsResponse({ status: "error", message: "No action specified" }, 400);
    }

    if (action === "sendOtp") {
      return sendOtp(body);
    } else if (action === "verifyOtp") {
      return verifyOtp(body);
    } else {
      return corsResponse({ status: "error", message: "Invalid action" }, 400);
    }
  } catch (err) {
    Logger.log("doPost error: " + err);
    return corsResponse({ status: "error", message: "Server error", detail: err.toString() }, 500);
  }
}

// ===============================
// CORS + JSON Response
function corsResponse(obj, code) {
  code = code || 200;
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ===============================
// Send OTP
function sendOtp(body) {
  var username = (body.Username || body.username || "").trim();
  var email = (body.Gmail || body.email || "").trim().toLowerCase();
  var password = (body.Password || body.password || "").toString();

  if (!username || !email || !password) {
    return corsResponse({ status: "error", message: "Missing required fields" }, 400);
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName("Users") || ss.insertSheet("Users");
  var otpSheet = ss.getSheetByName("OTP") || ss.insertSheet("OTP");

  ensureHeaders(usersSheet, ["Username", "Email", "PasswordHash", "CreatedAt"]);
  ensureHeaders(otpSheet, ["Email", "Username", "PasswordHash", "OTP", "TimestampMs", "Verified"]);

  // Check if email already exists
  var usersData = usersSheet.getDataRange().getValues();
  for (var u = 1; u < usersData.length; u++) {
    if (usersData[u][1] && usersData[u][1].toString().toLowerCase() === email) {
      return corsResponse({ status: "error", message: "Email already registered" }, 409);
    }
  }

  // Generate OTP
  var otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash password
  var pwHashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  var pwHash = Utilities.base64Encode(pwHashBytes);

  // Save OTP entry
  var timestampMs = new Date().getTime();
  otpSheet.appendRow([email, username, pwHash, otp, timestampMs, false]);

  // Send OTP email
  var emailSent = sendOtpEmail(email, username, otp);

  if (emailSent) {
    return corsResponse({ status: "success", message: "OTP sent" }, 200);
  } else {
    return corsResponse({ status: "error", message: "Failed to send OTP" }, 500);
  }
}

// ===============================
// Verify OTP
function verifyOtp(body) {
  var email = (body.Gmail || body.email || "").toString().trim().toLowerCase();
  var userOtp = (body.OTP || body.otp || "").toString().trim();

  if (!email || !userOtp) {
    return corsResponse({ status: "error", message: "Missing email or otp" }, 400);
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName("Users") || ss.insertSheet("Users");
  var otpSheet = ss.getSheetByName("OTP") || ss.insertSheet("OTP");

  ensureHeaders(usersSheet, ["Username", "Email", "PasswordHash", "CreatedAt"]);
  ensureHeaders(otpSheet, ["Email", "Username", "PasswordHash", "OTP", "TimestampMs", "Verified"]);

  var otpData = otpSheet.getDataRange().getValues();
  var foundIndex = -1;
  var matchedRow = null;

  // Scan latest OTP first
  for (var i = otpData.length - 1; i >= 1; i--) {
    var row = otpData[i];
    var rowEmail = (row[0] || "").toString().toLowerCase();
    var rowOtp = (row[3] || "").toString();
    var rowVerified = row[5];

    if (rowEmail === email && (rowVerified === false || rowVerified === "FALSE" || rowVerified === "")) {
      var ts = parseInt(row[4], 10) || 0;
      var now = new Date().getTime();
      if ((now - ts) > 10 * 60 * 1000) continue; // expired

      if (rowOtp === userOtp) {
        foundIndex = i;
        matchedRow = row;
        break;
      }
    }
  }

  if (foundIndex === -1) {
    return corsResponse({ status: "error", message: "OTP not found, expired, already used, or incorrect" }, 404);
  }

  // Mark OTP as verified
  otpSheet.getRange(foundIndex + 1, 6).setValue(true);

  var username = matchedRow[1] || "";
  var pwHash = matchedRow[2] || "";
  var createdAt = new Date();

  // Append user
  usersSheet.appendRow([username, email, pwHash, createdAt]);

  return corsResponse({ status: "success", message: "OTP verified and user saved" }, 200);
}

// ===============================
// Utility Functions
function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var r = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var needSet = false;
    for (var i = 0; i < headers.length; i++) {
      if (!r[i] || r[i].toString().trim() !== headers[i]) {
        needSet = true;
        break;
      }
    }
    if (needSet) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
}

function sendOtpEmail(email, username, otp) {
  var subject = "Quick Learn - Your OTP Verification Code";
  var htmlBody = '<div style="font-family:Segoe UI, sans-serif;max-width:600px;margin:20px auto;padding:20px;background:#fff;border-radius:8px;">' +
    '<h2 style="color:#2d7a4a;margin:0 0 10px 0">Quick Learn</h2>' +
    '<p>Hello ' + escapeHtml(username) + ',</p>' +
    '<p>Use the following OTP to complete your verification. This OTP is valid for 10 minutes.</p>' +
    '<div style="display:inline-block;padding:12px 20px;border-radius:6px;background:#f1f1f1;font-size:22px;letter-spacing:4px;font-weight:bold;">' + otp + '</div>' +
    '<p>If you did not request this, ignore this email.</p>' +
    '<p style="font-size:12px;color:#888;margin-top:16px">&copy; ' + new Date().getFullYear() + ' Quick Learn</p>' +
    '</div>';

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    return true;
  } catch (err) {
    Logger.log("Mail send error: " + err);
    return false;
  }
}

function escapeHtml(text) {
  return text ? text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
