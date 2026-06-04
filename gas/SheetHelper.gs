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
  TANGGAL: 1,           // A: PT BABJM LAPORAN PETTY CASH Tanggal
  TGL_NOTA: 2,          // B: Tgl. Nota
  AKUN: 3,              // C: Akun
  KETERANGAN_DEBIT: 4,  // D: Keterangan Debit
  KETERANGAN_KREDIT: 5, // E: Keterangan Kredit (labeled "Keterangan")
  PIC: 6,               // F: PIC
  NO_ID: 7,             // G: NO. ID
  DEBIT: 8,             // H: Debit (nominal)
  KREDIT: 9,            // I: Kredit (nominal)
  SALDO_AKHIR: 10,      // J: Saldo Akhir
  TGL_PENAGIHAN: 11,    // K: Tgl. Penagihan
  LAMPIRAN: 12          // L: Lampiran
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
    data.keterangan_debit || '',
    data.keterangan_kredit || '',
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
  var data = sheet.getRange(startRow, 1, numRows, 12).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    results.push({
      _row: startRow + i,
      tanggal: r[0],
      tgl_nota: r[1],
      akun: r[2],
      keterangan_debit: r[3],
      keterangan_kredit: r[4],
      pic: r[5],
      no_id: r[6],
      debit: r[7],
      kredit: r[8],
      saldo_akhir: r[9],
      tgl_penagihan: r[10],
      lampiran: r[11]
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

/**
 * Migrasi kolom Cash_log: Pindahkan deskripsi Debit dari Column E (Keterangan Kredit) ke Column D (Keterangan Debit)
 */
function migrateCashLogDescriptions() {
  var sheet = getCashSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) return 'Tidak ada data untuk dimigrasi';
  
  // Ambil data mulai dari baris 6 (data pertama setelah header) sampai baris terakhir, 12 kolom
  var range = sheet.getRange(6, 1, lastRow - 5, 12);
  var values = range.getValues();
  var count = 0;
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var debitVal = parseRupiah(row[7]); // Index 7 is Column H (Debit)
    
    // Jika transaksi Debit (nominal debit > 0)
    if (debitVal > 0) {
      var ketDebit = row[3]; // Column D (Keterangan Debit)
      var ketKredit = row[4]; // Column E (Keterangan Kredit / Keterangan)
      
      // Jika Keterangan Debit kosong tetapi Keterangan Kredit terisi, pindahkan
      if (!ketDebit && ketKredit) {
        row[3] = ketKredit;
        row[4] = '';
        count++;
      }
    }
  }
  
  // Tulis kembali data yang sudah diupdate
  range.setValues(values);
  return 'Migrasi selesai. Berhasil memindahkan ' + count + ' deskripsi transaksi Debit.';
}

function getDashboardSheet() { return getSheet(SHEETS.DASHBOARD); }

/**
 * Membangun visual dashboard dan filter tanggal dinamis pada Google Sheet tab Dashboard.
 */
function setupGSheetDashboard() {
  var ss = getSpreadsheet();
  var d = getDashboardSheet();
  
  // Hard Reset
  d.clear();
  d.clearFormats();
  d.clearConditionalFormatRules();
  
  // Set Column Widths
  d.setColumnWidth(1, 20); // Spacer column A
  d.setColumnWidth(2, 110); // B: Tanggal
  d.setColumnWidth(3, 110); // C: Tgl. Nota
  d.setColumnWidth(4, 80);  // D: Akun
  d.setColumnWidth(5, 220); // E: Keterangan Debit
  d.setColumnWidth(6, 220); // F: Keterangan Kredit
  d.setColumnWidth(7, 100); // G: PIC
  d.setColumnWidth(8, 110); // H: NO. ID
  d.setColumnWidth(9, 110); // I: Debit
  d.setColumnWidth(10, 110); // J: Kredit
  d.setColumnWidth(11, 130); // K: Saldo Akhir
  d.setColumnWidth(12, 110); // L: Tgl. Penagihan
  d.setColumnWidth(13, 100); // M: Lampiran

  // Title Block
  d.getRange('B2:M2').merge().setValue('🏦 PETTY CASH PT BABJM').setFontSize(16).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1e3a8a').setHorizontalAlignment('center').setVerticalAlignment('middle');
  d.getRange('B3:M3').merge().setValue('Dashboard Ringkasan Kas & Filter Tanggal').setFontSize(10).setFontStyle('italic').setFontColor('#e2e8f0').setBackground('#1e3a8a').setHorizontalAlignment('center').setVerticalAlignment('middle');
  d.setRowHeight(2, 35);
  d.setRowHeight(3, 20);

  // Filters Block
  d.getRange('B5').setValue('Tanggal Awal').setFontWeight('bold').setBackground('#f1f5f9').setHorizontalAlignment('center');
  d.getRange('B6').setValue('Tanggal Akhir').setFontWeight('bold').setBackground('#f1f5f9').setHorizontalAlignment('center');
  
  // Default values: 1 week ago to today
  d.getRange('C5').setFormula('=TODAY()-7').setNumberFormat('yyyy-mm-dd').setBackground('#fffbeb').setHorizontalAlignment('center');
  d.getRange('C6').setFormula('=TODAY()').setNumberFormat('yyyy-mm-dd').setBackground('#fffbeb').setHorizontalAlignment('center');
  
  // Set Date Validation
  var dateValidation = SpreadsheetApp.newDataValidation().requireDate().build();
  d.getRange('C5:C6').setDataValidation(dateValidation);
  
  // Summary Metrics Headers
  d.getRange('E5').setValue('TOTAL DEBIT').setBackground('#15803d').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange('F5').setValue('TOTAL KREDIT').setBackground('#b91c1c').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange('G5').setValue('BARIS DATA').setBackground('#475569').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange('H5').setValue('SALDO AWAL').setBackground('#0369a1').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange('I5').setValue('SALDO AKHIR').setBackground('#0f172a').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  
  // Summary Metrics Values Formulations (using Indonesian local formula divider ;)
  d.getRange('E6').setFormula('=SUMIFS(Cash_log!H7:H; Cash_log!A7:A; ">="&C5; Cash_log!A7:A; "<="&C6)').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setNumberFormat('[$Rp-421] #,##0');
  d.getRange('F6').setFormula('=SUMIFS(Cash_log!I7:I; Cash_log!A7:A; ">="&C5; Cash_log!A7:A; "<="&C6)').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setNumberFormat('[$Rp-421] #,##0');
  d.getRange('G6').setFormula('=COUNTIFS(Cash_log!A7:A; ">="&C5; Cash_log!A7:A; "<="&C6)').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setNumberFormat('#,##0');
  d.getRange('H6').setFormula('=IFERROR(LOOKUP(2; 1/((Cash_log!A$6:A<C5)*(Cash_log!A$6:A<>"")); Cash_log!J$6:J); Cash_log!J$6)').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setNumberFormat('[$Rp-421] #,##0');
  d.getRange('I6').setFormula('=H6+E6-F6').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setNumberFormat('[$Rp-421] #,##0');

  // Borders for Summary Cards and Input
  d.getRange('B5:C6').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  d.getRange('E5:I6').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // Table Title Block
  d.getRange('B8:M8').merge().setValue('📋 LOG TRANSAKSI FILTERED').setFontWeight('bold').setFontSize(11).setFontColor('#FFFFFF').setBackground('#334155').setHorizontalAlignment('center').setVerticalAlignment('middle');
  d.setRowHeight(8, 25);

  // Table Headers
  var headers = [
    ["Tanggal", "Tgl. Nota", "Akun", "Keterangan Debit", "Keterangan Kredit", "PIC", "NO. ID", "Debit", "Kredit", "Saldo Akhir", "Tgl. Penagihan", "Lampiran"]
  ];
  d.getRange('B9:M9').setValues(headers).setBackground('#475569').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  d.setRowHeight(9, 25);

  // Table Data Filter Formula
  d.getRange('B10').setFormula('=IFERROR(FILTER(Cash_log!A7:L; Cash_log!A7:A>=C5; Cash_log!A7:A<=C6); "Tidak ada transaksi dalam rentang ini")');
  
  // Format table data columns
  d.getRange('B10:B1000').setHorizontalAlignment('center');
  d.getRange('C10:C1000').setHorizontalAlignment('center');
  d.getRange('D10:D1000').setHorizontalAlignment('center');
  d.getRange('G10:G1000').setHorizontalAlignment('center');
  d.getRange('H10:H1000').setHorizontalAlignment('center');
  d.getRange('I10:K1000').setNumberFormat('[$Rp-421] #,##0');
  d.getRange('L10:L1000').setHorizontalAlignment('center');
  d.getRange('M10:M1000').setHorizontalAlignment('center');
  
  return 'Dashboard Google Sheet berhasil dibangun!';
}
