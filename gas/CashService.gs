/**
 * ============================================
 * CashService.gs — CRUD Transaksi Kas (Cash_log)
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

// ─── CREATE ─────────────────────────────────

/**
 * Tambah transaksi kas baru
 * @param {Object} params
 *   - keterangan (wajib)
 *   - jumlah (wajib)
 *   - jenis: "DEBIT" | "KREDIT" (wajib)
 *   - pic (opsional)
 *   - no_id (opsional)
 *   - tgl_nota (opsional)
 *   - akun (opsional)
 *   - tgl_penagihan (opsional)
 *   - tanggal (opsional, default hari ini)
 *   - sumber: "TELEGRAM" | "WEB" (info saja)
 * @return {Object} response
 */
function addCashTransaction(params) {
  // Validasi
  var v = validateRequired(params, ['keterangan', 'jumlah', 'jenis']);
  if (!v.valid) {
    return errorResponse('Field wajib belum diisi: ' + v.missing.join(', '));
  }

  var amount = parseAmount(params.jumlah);
  if (amount <= 0) {
    return errorResponse('Nominal harus lebih dari 0');
  }

  var jenis = String(params.jenis).toUpperCase();
  if (jenis !== 'DEBIT' && jenis !== 'KREDIT') {
    return errorResponse('Jenis harus DEBIT atau KREDIT');
  }

  // Hitung saldo baru
  var lastSaldo = getLastSaldo();
  var newSaldo = jenis === 'DEBIT' ? lastSaldo + amount : lastSaldo - amount;

  // Format tanggal
  var tanggal = params.tanggal ? parseDate(params.tanggal) || new Date() : new Date();

  // Build row data
  var rowData = {
    tanggal: tanggal,
    tgl_nota: params.tgl_nota || '',
    akun: params.akun || '',
    keterangan: String(params.keterangan).trim(),
    pic: params.pic || '',
    no_id: params.no_id || '',
    debit: jenis === 'DEBIT' ? formatRupiah(amount) : 'Rp -',
    kredit: jenis === 'KREDIT' ? formatRupiah(amount) : '',
    saldo_akhir: formatRupiah(newSaldo),
    tgl_penagihan: params.tgl_penagihan || '',
    lampiran: params.lampiran || ''
  };

  var newRow = appendCashRow(rowData);

  return successResponse({
    row: newRow,
    keterangan: rowData.keterangan,
    jenis: jenis,
    jumlah: amount,
    jumlah_formatted: formatRupiahSpaced(amount),
    saldo_baru: newSaldo,
    saldo_formatted: formatRupiahSpaced(newSaldo)
  }, 'Transaksi berhasil dicatat');
}

// ─── READ ───────────────────────────────────

/**
 * Daftar transaksi
 * @param {Object} params {dari, sampai, pic, limit}
 */
function listCashTransactions(params) {
  var rows;

  if (params.dari && params.sampai) {
    var dari = parseDate(params.dari);
    var sampai = parseDate(params.sampai);
    if (!dari || !sampai) return errorResponse('Format tanggal tidak valid');
    rows = getCashByDateRange(dari, sampai);
  } else {
    rows = readCashRows({ limit: parseInt(params.limit) || 50 });
  }

  // Filter PIC
  if (params.pic) {
    var picFilter = String(params.pic).toLowerCase();
    rows = rows.filter(function (r) {
      return String(r.pic).toLowerCase().indexOf(picFilter) !== -1;
    });
  }

  // Clean up internal fields
  var cleaned = rows.map(function (r) {
    var copy = {};
    for (var k in r) {
      if (k.charAt(0) !== '_') copy[k] = r[k];
    }
    // Parse amounts for JSON
    copy.debit_value = parseRupiah(r.debit);
    copy.kredit_value = parseRupiah(r.kredit);
    copy.saldo_value = parseRupiah(r.saldo_akhir);
    return copy;
  });

  return successResponse({
    total: cleaned.length,
    data: cleaned
  });
}

/**
 * Ambil saldo terkini
 */
function getCurrentSaldo() {
  var saldo = getLastSaldo();
  return successResponse({
    saldo: saldo,
    saldo_formatted: formatRupiahSpaced(saldo)
  });
}

/**
 * Rekap transaksi per periode
 * @param {Object} params {bulan, tahun} atau {dari, sampai}
 */
function rekapCash(params) {
  var rows;

  if (params.dari && params.sampai) {
    rows = getCashByDateRange(parseDate(params.dari), parseDate(params.sampai));
  } else {
    // Default: bulan ini
    var now = new Date();
    var bulan = parseInt(params.bulan) || (now.getMonth() + 1);
    var tahun = parseInt(params.tahun) || now.getFullYear();
    var dari = new Date(tahun, bulan - 1, 1);
    var sampai = new Date(tahun, bulan, 0); // Last day of month
    rows = getCashByDateRange(dari, sampai);
  }

  var totalDebit = 0, totalKredit = 0;
  for (var i = 0; i < rows.length; i++) {
    totalDebit += parseRupiah(rows[i].debit);
    totalKredit += parseRupiah(rows[i].kredit);
  }

  return successResponse({
    periode: (params.dari || '') + ' s.d. ' + (params.sampai || 'sekarang'),
    total_transaksi: rows.length,
    total_debit: totalDebit,
    total_debit_formatted: formatRupiahSpaced(totalDebit),
    total_kredit: totalKredit,
    total_kredit_formatted: formatRupiahSpaced(totalKredit),
    netto: totalDebit - totalKredit,
    netto_formatted: formatRupiahSpaced(totalDebit - totalKredit),
    saldo_saat_ini: getLastSaldo(),
    saldo_formatted: formatRupiahSpaced(getLastSaldo())
  });
}

/**
 * Data untuk export (dengan info tanda tangan)
 */
function exportCashData(params) {
  var dari = parseDate(params.dari);
  var sampai = parseDate(params.sampai);
  if (!dari || !sampai) return errorResponse('Parameter dari & sampai wajib');

  var rows = getCashByDateRange(dari, sampai);
  var signatures = getSignatureNames();

  // Clean rows
  var cleaned = rows.map(function (r) {
    var copy = {};
    for (var k in r) {
      if (k.charAt(0) !== '_') copy[k] = r[k];
    }
    copy.debit_value = parseRupiah(r.debit);
    copy.kredit_value = parseRupiah(r.kredit);
    copy.saldo_value = parseRupiah(r.saldo_akhir);
    return copy;
  });

  // Hitung total
  var totalDebit = 0, totalKredit = 0;
  for (var i = 0; i < cleaned.length; i++) {
    totalDebit += cleaned[i].debit_value;
    totalKredit += cleaned[i].kredit_value;
  }

  return successResponse({
    periode: { dari: formatDateISO(dari), sampai: formatDateISO(sampai) },
    data: cleaned,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    signatures: signatures
  });
}

// ─── DASHBOARD ──────────────────────────────

/**
 * Data untuk dashboard
 */
function getDashboardData() {
  var saldo = getLastSaldo();
  var now = new Date();
  var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthRows = getCashByDateRange(firstOfMonth, now);

  var totalDebit = 0, totalKredit = 0;
  for (var i = 0; i < monthRows.length; i++) {
    totalDebit += parseRupiah(monthRows[i].debit);
    totalKredit += parseRupiah(monthRows[i].kredit);
  }

  // Ambil 10 transaksi terakhir
  var recent = readCashRows({ limit: 10 });
  var recentCleaned = recent.map(function (r) {
    return {
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      pic: r.pic,
      debit: r.debit,
      kredit: r.kredit,
      saldo_akhir: r.saldo_akhir
    };
  });

  // Bon pending
  var pendingBons = getPendingBons();
  var warningBons = getWarningBons();
  var overdueBons = getOverdueBons();

  return successResponse({
    saldo: saldo,
    saldo_formatted: formatRupiahSpaced(saldo),
    bulan_ini: {
      total_debit: totalDebit,
      total_debit_formatted: formatRupiahSpaced(totalDebit),
      total_kredit: totalKredit,
      total_kredit_formatted: formatRupiahSpaced(totalKredit),
      netto: totalDebit - totalKredit,
      total_transaksi: monthRows.length
    },
    bon: {
      pending: pendingBons.length,
      warning: warningBons.length,
      overdue: overdueBons.length
    },
    recent_transactions: recentCleaned
  });
}
