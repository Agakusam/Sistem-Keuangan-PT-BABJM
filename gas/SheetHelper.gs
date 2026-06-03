/**
 * ============================================
 * SheetHelper.gs — Google Sheets Utilities
 * Sistem Petty Cash PT BABJM
 * ============================================
 * Kolom sesuai struktur aktual spreadsheet
 */

var SPREADSHEET_ID = '18_zWVbJZOX90vkPl9NHikXimgOUSZDSE5EOGiVqbYpk';

var SHEETS = {
  CASH_LOG: 'Cash_log',
  BON_LOG: 'Bon_log',
  DASHBOARD: 'Dashboard'
};

// Kolom Cash_log: A-J (index 1-10)
var CASH_COLS = {
  TANGGAL: 1,       // A: PT BABJM LAPORAN PETTY CASH Tanggal
  TGL_NOTA: 2,      // B: Tgl. Nota
  AKUN: 3,          // C: Akun
  KETERANGAN: 4,    // D: Keterangan
  PIC: 5,           // E: PIC
  NO_ID: 6,         // F: NO. ID
  DEBIT: 7,         // G: Debit
  KREDIT: 8,        // H: Kredit
  SALDO_AKHIR: 9,   // I: Saldo Akhir
  TGL_PENAGIHAN: 10,// J: Tgl. Penagihan
  LAMPIRAN: 11      // K: Lampiran
};

// Kolom Bon_log: A-F (index 1-6)
var BON_COLS = {
  ID_BON: 1,        // A: ID BON
  TANGGAL: 2,       // B: Tanggal
  PIC: 3,           // C: PIC
  KETERANGAN: 4,    // D: Keterangan
  NOMINAL: 5,       // E: Nominal
  STATUS: 6         // F: Status
};

// ─── SPREADSHEET ACCESS ─────────────────────

var _ssCache = null;

function getSpreadsheet() {
  if (!_ssCache) _ssCache = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ssCache;
}

function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan');
  return sheet;
}

function getCashSheet() { return getSheet(SHEETS.CASH_LOG); }
function getBonSheet() { return getSheet(SHEETS.BON_LOG); }

// ─── CASH_LOG OPERATIONS ────────────────────

/**
 * Append row ke Cash_log
 * @param {Object} data {tanggal, tgl_nota, akun, keterangan, pic, no_id, debit, kredit, saldo_akhir, tgl_penagihan}
 * @return {number} New row number
 */
function appendCashRow(data) {
  var sheet = getCashSheet();
  var row = [
    data.tanggal || '',
    data.tgl_nota || '',
    data.akun || '',
    data.keterangan || '',
    data.pic || '',
    data.no_id || '',
    data.debit || '',
    data.kredit || '',
    data.saldo_akhir || '',
    data.tgl_penagihan || '',
    data.lampiran || ''
  ];
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * Baca semua data Cash_log sebagai array of objects
 * Mulai dari row 3 (row 1 = header utama, row 2 = saldo awal)
 * @param {Object} [opts] {startRow, limit}
 * @return {Object[]}
 */
function readCashRows(opts) {
  var sheet = getCashSheet();
  var lastRow = sheet.getLastRow();
  var startRow = (opts && opts.startRow) ? opts.startRow : 2;

  if (lastRow < startRow) return [];

  var numRows = lastRow - startRow + 1;
  var data = sheet.getRange(startRow, 1, numRows, 11).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    results.push({
      _row: startRow + i,
      tanggal: r[0],
      tgl_nota: r[1],
      akun: r[2],
      keterangan: r[3],
      pic: r[4],
      no_id: r[5],
      debit: r[6],
      kredit: r[7],
      saldo_akhir: r[8],
      tgl_penagihan: r[9],
      lampiran: r[10]
    });
  }

  if (opts && opts.limit) {
    results = results.slice(-(opts.limit));
  }

  return results;
}

/**
 * Ambil saldo akhir terakhir (row terakhir kolom I)
 * @return {number}
 */
function getLastSaldo() {
  var sheet = getCashSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var val = sheet.getRange(lastRow, CASH_COLS.SALDO_AKHIR).getValue();
  return parseRupiah(val);
}

/**
 * Ambil data Cash_log berdasarkan rentang tanggal
 * @param {Date} dari
 * @param {Date} sampai
 * @return {Object[]}
 */
function getCashByDateRange(dari, sampai) {
  var all = readCashRows();
  return all.filter(function (r) {
    var d = parseDate(r.tanggal);
    if (!d) return false;
    var dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var fromTime = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate()).getTime();
    var toTime = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate()).getTime();
    return dTime >= fromTime && dTime <= toTime;
  });
}

// ─── BON_LOG OPERATIONS ─────────────────────

/**
 * Append row ke Bon_log
 * @param {Object} data {id_bon, tanggal, pic, keterangan, nominal, status}
 * @return {number}
 */
function appendBonRow(data) {
  var sheet = getBonSheet();
  var row = [
    data.id_bon || '',
    data.tanggal || '',
    data.pic || '',
    data.keterangan || '',
    data.nominal || '',
    data.status || 'BELUM'
  ];
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * Baca semua data Bon_log
 * @return {Object[]}
 */
function readBonRows() {
  var sheet = getBonSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    // Skip empty rows
    if (!r[0] && !r[2] && !r[3]) continue;

    var tanggal = parseDate(r[1]);
    var daysAgo = tanggal ? daysBetween(tanggal, new Date()) : 0;
    var alertLevel = 'NORMAL';
    if (String(r[5]).toUpperCase() === 'BELUM') {
      if (daysAgo >= BON_MAX_DAYS) alertLevel = 'OVERDUE';
      else if (daysAgo >= BON_WARNING_DAYS) alertLevel = 'WARNING';
    }

    results.push({
      _row: i + 2,
      id_bon: r[0],
      tanggal: r[1],
      pic: r[2],
      keterangan: r[3],
      nominal: r[4],
      status: r[5] || 'BELUM',
      days_ago: daysAgo,
      alert_level: alertLevel
    });
  }

  return results;
}

/**
 * Cari bon berdasarkan ID
 * @param {string} bonId
 * @return {Object|null}
 */
function findBonById(bonId) {
  var all = readBonRows();
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].id_bon).toUpperCase() === String(bonId).toUpperCase()) {
      return all[i];
    }
  }
  return null;
}

/**
 * Update status bon
 * @param {number} rowIndex
 * @param {string} newStatus
 */
function updateBonStatus(rowIndex, newStatus) {
  var sheet = getBonSheet();
  sheet.getRange(rowIndex, BON_COLS.STATUS).setValue(newStatus);
}

/**
 * Daftar bon yang belum dipertanggungjawabkan
 * @return {Object[]}
 */
function getPendingBons() {
  return readBonRows().filter(function (b) {
    return String(b.status).toUpperCase() === 'BELUM';
  });
}

/**
 * Daftar bon yang sudah WARNING (3+ hari)
 * @return {Object[]}
 */
function getWarningBons() {
  return getPendingBons().filter(function (b) {
    return b.alert_level === 'WARNING' || b.alert_level === 'OVERDUE';
  });
}

/**
 * Daftar bon yang sudah OVERDUE (7+ hari)
 * @return {Object[]}
 */
function getOverdueBons() {
  return getPendingBons().filter(function (b) {
    return b.alert_level === 'OVERDUE';
  });
}
