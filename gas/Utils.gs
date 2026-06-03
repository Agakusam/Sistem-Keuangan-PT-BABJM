/**
 * ============================================
 * Utils.gs — Utilitas Umum
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

// ─── CONSTANTS ──────────────────────────────

var BON_WARNING_DAYS = 3;
var BON_MAX_DAYS = 7;

// ─── ID GENERATOR ───────────────────────────

/**
 * Generate ID Bon: BON-YYYYMMDD-NNN
 */
function generateBonId(sheet) {
  var today = _formatDateCompact(new Date());
  var prefix = 'BON-' + today + '-';
  var counter = 1;
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      var id = String(ids[i][0]);
      if (id.indexOf(prefix) === 0) {
        var num = parseInt(id.split('-').pop(), 10);
        if (!isNaN(num) && num >= counter) counter = num + 1;
      }
    }
  }
  return prefix + _pad(counter, 3);
}

// ─── DATE FORMATTERS ────────────────────────

function _formatDateCompact(d) {
  return '' + d.getFullYear() + _pad(d.getMonth() + 1, 2) + _pad(d.getDate(), 2);
}

/**
 * Format Date → "DD-MMM-YY" sesuai format di sheet (e.g. "12-Mar-26")
 */
function formatDateSheet(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return _pad(d.getDate(), 2) + '-' + months[d.getMonth()] + '-' + _pad(d.getFullYear() % 100, 2);
}

/**
 * Format Date → "YYYY-MM-DD"
 */
function formatDateISO(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + _pad(d.getMonth() + 1, 2) + '-' + _pad(d.getDate(), 2);
}

/**
 * Format DateTime → ISO string
 */
function formatDateTime(d) {
  d = d || new Date();
  return formatDateISO(d) + 'T' + _pad(d.getHours(), 2) + ':' + _pad(d.getMinutes(), 2) + ':' + _pad(d.getSeconds(), 2);
}

/**
 * Parse berbagai format tanggal ke Date
 * Supports: "DD-MMM-YY", "DD-MMM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY", Date object
 */
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var str = String(val).trim();

  // DD-MMM-YY or DD-MMM-YYYY (e.g. "12-Mar-26")
  var m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    var months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    var mon = months[m[2].toLowerCase()];
    var year = parseInt(m[3]);
    if (year < 100) year += 2000;
    return new Date(year, mon, parseInt(m[1]));
  }

  // YYYY-MM-DD
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

  // DD/MM/YYYY
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  return null;
}

/**
 * Hitung selisih hari antara 2 tanggal
 */
function daysBetween(d1, d2) {
  var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
}

// ─── RUPIAH FORMATTER ───────────────────────

/**
 * Format number → "Rp1.234.567"
 */
function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp -';
  var num = Math.abs(Number(amount));
  if (num === 0) return 'Rp -';
  var formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var prefix = amount < 0 ? '-' : '';
  return prefix + 'Rp' + formatted;
}

/**
 * Format number → "Rp 1.234.567" (spaced, for display)
 */
function formatRupiahSpaced(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  var num = Math.abs(Number(amount));
  if (num === 0) return 'Rp 0';
  var formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var prefix = amount < 0 ? '-' : '';
  return prefix + 'Rp ' + formatted;
}

/**
 * Parse "Rp1.234.567" atau "Rp 1.234.567" → number
 */
function parseRupiah(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var cleaned = String(val).replace(/[Rp\s.]/g, '').replace(',', '.');
  if (cleaned === '-' || cleaned === '') return 0;
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse any amount input (number, "50000", "Rp50.000", "50.000", "50rb", "50k")
 */
function parseAmount(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var s = String(val).trim().toLowerCase();
  // Handle "50rb" or "50k"
  if (s.match(/(\d+)\s*(rb|ribu|k)$/i)) {
    return parseInt(s) * 1000;
  }
  // Handle "1.5jt" or "1jt"
  if (s.match(/(\d+\.?\d*)\s*(jt|juta)$/i)) {
    return parseFloat(s) * 1000000;
  }
  return parseRupiah(val);
}

// ─── VALIDATION ─────────────────────────────

function validateRequired(data, fields) {
  var missing = [];
  for (var i = 0; i < fields.length; i++) {
    var v = data[fields[i]];
    if (v === undefined || v === null || String(v).trim() === '') {
      missing.push(fields[i]);
    }
  }
  return { valid: missing.length === 0, missing: missing };
}

// ─── RESPONSE BUILDERS ─────────────────────

function successResponse(data, message) {
  var r = { success: true, timestamp: formatDateTime(new Date()) };
  if (data !== undefined) r.data = data;
  if (message) r.message = message;
  return r;
}

function errorResponse(message, code) {
  return { success: false, error: message || 'Unknown error', code: code || 400, timestamp: formatDateTime(new Date()) };
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ─── INTERNAL HELPERS ───────────────────────

function _pad(n, len) {
  var s = String(n);
  while (s.length < len) s = '0' + s;
  return s;
}

// ─── TELEGRAM COMMAND PARSERS ───────────────

/**
 * Parse quick kas command: /kas <deskripsi> <nominal>
 * Juga bisa: /kas <nominal> <deskripsi>
 */
function parseKasQuick(text) {
  if (!text) return null;
  var parts = text.trim().split(/\s+/);
  if (parts.length < 3 || parts[0].toLowerCase() !== '/kas') return null;

  // Cek apakah argumen ke-2 adalah angka (format: /kas 50000 deskripsi)
  var firstArg = parts[1];
  var amount = parseAmount(firstArg);
  if (amount > 0) {
    return { jumlah: amount, deskripsi: parts.slice(2).join(' ') };
  }

  // Cek argumen terakhir (format: /kas deskripsi beli atk 50000)
  var lastArg = parts[parts.length - 1];
  amount = parseAmount(lastArg);
  if (amount > 0) {
    return { jumlah: amount, deskripsi: parts.slice(1, -1).join(' ') };
  }

  return null;
}

/**
 * Parse quick bon command: /bon <PIC> <nominal> <keterangan>
 */
function parseBonQuick(text) {
  if (!text) return null;
  var parts = text.trim().split(/\s+/);
  if (parts.length < 4 || parts[0].toLowerCase() !== '/bon') return null;

  var pic = parts[1];
  var amount = parseAmount(parts[2]);
  if (amount <= 0) return null;
  var keterangan = parts.slice(3).join(' ');

  return { pic: pic, jumlah: amount, keterangan: keterangan };
}
