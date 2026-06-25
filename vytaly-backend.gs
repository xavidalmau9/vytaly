/**
 * Vytaly backend — Google Apps Script web app
 * Receives opted-in scans (doPost) and serves the admin dashboard (doGet, key-gated via JSONP).
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────────
 * 1. Create a Google Sheet. Copy its ID from the URL (the long string between /d/ and /edit).
 * 2. Paste it into SHEET_ID below.
 * 3. Change WRITE_KEY and ADMIN_KEY to your own long random strings (keep them secret).
 * 4. Extensions ▸ Apps Script ▸ paste this file ▸ Save.
 * 5. Deploy ▸ New deployment ▸ type "Web app":
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Deploy, authorize, and copy the /exec URL.
 * 6. Put the /exec URL + WRITE_KEY into the Vytaly app (UPLOAD_URL / WRITE_KEY constants),
 *    and the /exec URL + ADMIN_KEY into the admin dashboard login.
 * Note: "Anyone" only means the URL is reachable — data is still protected by the keys.
 * Re-deploy (Manage deployments ▸ edit ▸ new version) whenever you change this code.
 */

var SHEET_ID  = 'PASTE_YOUR_SHEET_ID_HERE';
var WRITE_KEY = 'CHANGE-ME-write-key';   // app uses this to POST scans
var ADMIN_KEY = 'CHANGE-ME-admin-key';   // dashboard uses this to READ
var TAB = 'scans';

var HEADERS = ['ts','sid','pid','name','email','age','sex','bpm','sdnn','rmssd','rr',
               'pnn50','stress','wellness','quality','bpSys','bpDia','refHR','ua','appVersion'];

function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.key !== WRITE_KEY) return json_({ ok: false, error: 'bad key' });
    var s = body.scan || {};
    sheet_().appendRow([
      new Date(), s.sid, s.pid, s.name, s.email, s.age, s.sex, s.bpm, s.sdnn, s.rmssd, s.rr,
      s.pnn50, s.stress, s.wellness, s.quality, s.bpSys, s.bpDia, s.refHR, s.ua, s.appVersion
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var cb = e.parameter.callback;
  if ((e.parameter.key || '') !== ADMIN_KEY) return reply_(cb, { ok: false, error: 'unauthorized' });
  var sh = sheet_();
  var rows = [];
  if (sh.getLastRow() >= 2) {
    var data = sh.getDataRange().getValues();
    var head = data.shift();
    rows = data.map(function (r) {
      var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
    });
  }
  return reply_(cb, { ok: true, count: rows.length, rows: rows });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function reply_(cb, obj) {
  var body = JSON.stringify(obj);
  if (cb) return ContentService.createTextOutput(cb + '(' + body + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);  // JSONP for cross-origin dashboard reads
  return json_(obj);
}
