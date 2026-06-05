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
    keterangan_debit: jenis === 'DEBIT' ? String(params.keterangan).trim() : '',
    keterangan_kredit: jenis === 'KREDIT' ? String(params.keterangan).trim() : '',
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
    keterangan: jenis === 'DEBIT' ? rowData.keterangan_debit : rowData.keterangan_kredit,
    keterangan_debit: rowData.keterangan_debit,
    keterangan_kredit: rowData.keterangan_kredit,
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

  // Clean up internal fields
  var cleaned = rows.map(function (r) {
    var copy = {};
    for (var k in r) {
      if (k.charAt(0) !== '_') copy[k] = r[k];
    }
    copy._row = r._row; // Expose row index for editing!
    // Parse amounts for JSON
    copy.debit_value = parseRupiah(r.debit);
    copy.kredit_value = parseRupiah(r.kredit);
    copy.saldo_value = parseRupiah(r.saldo_akhir);
    // Virtual description field for compatibility
    copy.keterangan = copy.debit_value > 0 ? (r.keterangan_debit || '') : (r.keterangan_kredit || '');
    return copy;
  });

  // Calculate summary metrics on the date range (before PIC filter is applied)
  var totalDebit = 0;
  var totalKredit = 0;
  for (var i = 0; i < cleaned.length; i++) {
    totalDebit += cleaned[i].debit_value;
    totalKredit += cleaned[i].kredit_value;
  }
  
  var saldoAkhir = cleaned.length > 0 ? cleaned[cleaned.length - 1].saldo_value : 0;
  var saldoAwal = cleaned.length > 0 ? (saldoAkhir - totalDebit + totalKredit) : 0;

  if (cleaned.length === 0) {
    if (params.dari) {
      var dateDari = parseDate(params.dari);
      var all = readCashRows();
      var lastBefore = null;
      for (var j = 0; j < all.length; j++) {
        var d = parseDate(all[j].tanggal);
        if (d && d < dateDari) {
          lastBefore = all[j];
        }
      }
      var lastSaldoVal = lastBefore ? parseRupiah(lastBefore.saldo_akhir) : getLastSaldo();
      saldoAwal = lastSaldoVal;
      saldoAkhir = lastSaldoVal;
    } else {
      var currentSaldo = getLastSaldo();
      saldoAwal = currentSaldo;
      saldoAkhir = currentSaldo;
    }
  }

  // Filter PIC
  if (params.pic) {
    var picFilter = String(params.pic).toLowerCase();
    cleaned = cleaned.filter(function (r) {
      return String(r.pic).toLowerCase().indexOf(picFilter) !== -1;
    });
  }

  return successResponse({
    total: cleaned.length,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    saldo_awal: saldoAwal,
    saldo_akhir: saldoAkhir,
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
    // Virtual description field for compatibility
    copy.keterangan = copy.debit_value > 0 ? (r.keterangan_debit || '') : (r.keterangan_kredit || '');
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
    var isDebit = parseRupiah(r.debit) > 0;
    return {
      tanggal: r.tanggal,
      keterangan_debit: r.keterangan_debit || '',
      keterangan_kredit: r.keterangan_kredit || '',
      keterangan: isDebit ? (r.keterangan_debit || '') : (r.keterangan_kredit || ''),
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
  var pendingListCleaned = pendingBons.map(function (b) {
    return {
      id_bon: b.id_bon,
      tanggal: b.tanggal,
      pic: b.pic,
      keterangan: b.keterangan,
      nominal: b.nominal,
      nominal_value: parseRupiah(b.nominal),
      status: b.status,
      days_ago: b.days_ago,
      alert_level: b.alert_level
    };
  });

  // Hitung total nominal bon yang belum pertanggungan
  var totalOutstanding = 0;
  for (var j = 0; j < pendingBons.length; j++) {
    totalOutstanding += parseRupiah(pendingBons[j].nominal);
  }

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
      overdue: overdueBons.length,
      total_nominal: totalOutstanding,
      total_nominal_formatted: formatRupiahSpaced(totalOutstanding),
      list: pendingListCleaned
    },
    recent_transactions: recentCleaned
  });
}

/**
 * Update multiple cash transactions in bulk (Excel Grid Mode Edit)
 * @param {Object} body {transactions: [{_row, jenis, tanggal, keterangan, jumlah, pic, no_id, tgl_nota, tgl_penagihan, lampiran, akun}]}
 */
function editCashTransactionsBulk(body) {
  var list = body.transactions || [];
  if (list.length === 0) {
    return errorResponse('Tidak ada data transaksi untuk diedit');
  }

  var sheet = getCashSheet();
  var lastRow = sheet.getLastRow();
  var minRow = Infinity;

  for (var i = 0; i < list.length; i++) {
    var trx = list[i];
    var row = parseInt(trx._row);
    if (isNaN(row) || row < 7 || row > lastRow) {
      return errorResponse('Baris transaksi tidak valid: ' + trx._row);
    }

    var amount = parseAmount(trx.jumlah);
    if (amount <= 0) {
      return errorResponse('Nominal harus lebih dari 0 pada baris ' + row);
    }

    var jenis = String(trx.jenis).toUpperCase();
    if (jenis !== 'DEBIT' && jenis !== 'KREDIT') {
      return errorResponse('Jenis harus DEBIT atau KREDIT pada baris ' + row);
    }

    var tanggal = trx.tanggal ? parseDate(trx.tanggal) || new Date() : new Date();

    // Format fields
    var debit = jenis === 'DEBIT' ? formatRupiah(amount) : 'Rp -';
    var kredit = jenis === 'KREDIT' ? formatRupiah(amount) : '';
    var ketDebit = jenis === 'DEBIT' ? String(trx.keterangan).trim() : '';
    var ketKredit = jenis === 'KREDIT' ? String(trx.keterangan).trim() : '';

    // Write fields to sheet row (Columns A to I)
    sheet.getRange(row, 1, 1, 9).setValues([[
      tanggal,
      trx.tgl_nota || '',
      trx.akun || '',
      ketDebit,
      ketKredit,
      trx.pic || '',
      trx.no_id || '',
      debit,
      kredit
    ]]);

    // Columns K to L (tgl_penagihan, lampiran)
    sheet.getRange(row, 11, 1, 2).setValues([[
      trx.tgl_penagihan || '',
      trx.lampiran || ''
    ]]);

    if (row < minRow) {
      minRow = row;
    }
  }

  // Recalculate balances starting from the earliest modified row
  if (minRow !== Infinity) {
    _recalculateCashBalances(sheet, minRow);
  }

  return successResponse(null, 'Berhasil memperbarui ' + list.length + ' transaksi kas');
}

/**
 * Hapus transaksi kas berdasarkan baris-baris
 * @param {Object} body {rows: [number]}
 */
function deleteCashTransactions(body) {
  var rowsToDelete = body.rows || [];
  if (rowsToDelete.length === 0) {
    return errorResponse('Tidak ada baris transaksi untuk dihapus');
  }

  // Sort descending to avoid index shifting when deleting
  rowsToDelete = rowsToDelete.map(Number).filter(function(r) {
    return !isNaN(r) && r >= 7;
  }).sort(function(a, b) {
    return b - a;
  });

  if (rowsToDelete.length === 0) {
    return errorResponse('Baris transaksi tidak valid untuk dihapus');
  }

  var sheet = getCashSheet();
  var minRow = Infinity;

  for (var i = 0; i < rowsToDelete.length; i++) {
    var r = rowsToDelete[i];
    sheet.deleteRow(r);
    if (r < minRow) {
      minRow = r;
    }
  }

  // Recalculate balances starting from the row that shifted up
  if (minRow !== Infinity) {
    var lastRow = sheet.getLastRow();
    if (minRow <= lastRow) {
      _recalculateCashBalances(sheet, minRow);
    }
  }

  return successResponse(null, 'Berhasil menghapus ' + rowsToDelete.length + ' transaksi kas');
}

/**
 * Rekalkulasi saldo akhir dari startRow ke baris terakhir
 */
function _recalculateCashBalances(sheet, startRow) {
  var lastRow = sheet.getLastRow();
  if (startRow > lastRow) return;

  var prevSaldo = 0;
  if (startRow > 6) {
    prevSaldo = parseRupiah(sheet.getRange(startRow - 1, CASH_COLS.SALDO_AKHIR).getValue());
  } else {
    prevSaldo = parseRupiah(sheet.getRange(6, CASH_COLS.SALDO_AKHIR).getValue());
    startRow = 7;
  }

  var numRows = lastRow - startRow + 1;
  if (numRows <= 0) return;

  var range = sheet.getRange(startRow, 8, numRows, 3); // Col 8, 9, 10 (Debit, Kredit, Saldo Akhir)
  var values = range.getValues();

  var runningSaldo = prevSaldo;
  for (var i = 0; i < values.length; i++) {
    var debVal = parseRupiah(values[i][0]);
    var kreVal = parseRupiah(values[i][1]);
    runningSaldo = runningSaldo + debVal - kreVal;
    values[i][2] = formatRupiah(runningSaldo);
  }

  range.setValues(values);
}
