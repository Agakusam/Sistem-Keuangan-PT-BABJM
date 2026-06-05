/**
 * ============================================
 * BonService.gs — CRUD & Monitor Bon Kas (Bon_log)
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

/**
 * Catat bon baru
 * @param {Object} params {pic, keterangan, jumlah, tanggal?}
 */
function addBon(params) {
  var v = validateRequired(params, ['pic', 'keterangan', 'jumlah']);
  if (!v.valid) {
    return errorResponse('Field wajib belum diisi: ' + v.missing.join(', '));
  }

  var amount = parseAmount(params.jumlah);
  if (amount <= 0) return errorResponse('Nominal harus lebih dari 0');

  var sheet = getBonSheet();
  var bonId = generateBonId(sheet);
  var tanggal = params.tanggal ? parseDate(params.tanggal) || new Date() : new Date();

  var rowData = {
    id_bon: bonId,
    tanggal: tanggal,
    pic: String(params.pic).trim(),
    keterangan: String(params.keterangan).trim(),
    nominal: formatRupiah(amount),
    status: 'BELUM'
  };

  appendBonRow(rowData);

  // Catat sebagai transaksi kas keluar (Kredit) saat bon dibuat
  addCashTransaction({
    keterangan: 'Bon - ' + rowData.pic + ' - ' + rowData.keterangan,
    jumlah: amount,
    jenis: 'KREDIT',
    pic: rowData.pic,
    no_id: bonId,
    tanggal: tanggal,
    sumber: params.sumber || 'SYSTEM'
  });

  return successResponse({
    id_bon: bonId,
    pic: rowData.pic,
    keterangan: rowData.keterangan,
    nominal: amount,
    nominal_formatted: formatRupiahSpaced(amount),
    status: 'BELUM'
  }, 'Bon berhasil dicatat');
}

/**
 * Pertanggungan bon (ubah status ke SUDAH)
 * @param {Object} params {id_bon}
 */
function settleBon(params) {
  if (!params.id_bon) return errorResponse('ID Bon wajib diisi');

  var bon = findBonById(params.id_bon);
  if (!bon) return errorResponse('Bon tidak ditemukan: ' + params.id_bon, 404);

  if (String(bon.status).toUpperCase() === 'SUDAH') {
    return errorResponse('Bon sudah berstatus SUDAH');
  }

  updateBonStatus(bon._row, 'SUDAH');

  // Catat pengembalian/pertanggungan sebagai transaksi kas masuk (Debit) saat diselesaikan
  var nominal = parseRupiah(bon.nominal);
  addCashTransaction({
    keterangan: 'Pertanggungan Bon - ' + bon.pic + ' - ' + bon.keterangan,
    jumlah: nominal,
    jenis: 'DEBIT',
    pic: bon.pic,
    no_id: bon.id_bon,
    sumber: params.sumber || 'SYSTEM'
  });

  return successResponse({
    id_bon: bon.id_bon,
    pic: bon.pic,
    keterangan: bon.keterangan,
    nominal_formatted: formatRupiahSpaced(nominal),
    status: 'SUDAH',
    days_taken: bon.days_ago
  }, 'Bon berhasil dipertanggungjawabkan');
}

/**
 * Daftar bon
 * @param {Object} params {status, pic}
 */
function listBons(params) {
  var rows = readBonRows();

  if (params.status) {
    var statusFilter = String(params.status).toUpperCase();
    rows = rows.filter(function (b) {
      return String(b.status).toUpperCase() === statusFilter;
    });
  }

  if (params.pic) {
    var picFilter = String(params.pic).toLowerCase();
    rows = rows.filter(function (b) {
      return String(b.pic).toLowerCase().indexOf(picFilter) !== -1;
    });
  }

  // Clean
  var cleaned = rows.map(function (b) {
    return {
      _row: b._row,
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

  return successResponse({
    total: cleaned.length,
    data: cleaned
  });
}

/**
 * Monitor bon yang belum dipertanggungjawabkan
 * Digunakan untuk tampilan di Telegram & Web
 */
function monitorBons() {
  var pending = getPendingBons();

  var normal = [], warning = [], overdue = [];
  for (var i = 0; i < pending.length; i++) {
    var b = pending[i];
    var item = {
      id_bon: b.id_bon,
      pic: b.pic,
      keterangan: b.keterangan,
      nominal: b.nominal,
      nominal_value: parseRupiah(b.nominal),
      days_ago: b.days_ago,
      alert_level: b.alert_level
    };

    if (b.alert_level === 'OVERDUE') overdue.push(item);
    else if (b.alert_level === 'WARNING') warning.push(item);
    else normal.push(item);
  }

  // Hitung total outstanding
  var totalOutstanding = 0;
  for (var j = 0; j < pending.length; j++) {
    totalOutstanding += parseRupiah(pending[j].nominal);
  }

  return successResponse({
    total_pending: pending.length,
    total_outstanding: totalOutstanding,
    total_outstanding_formatted: formatRupiahSpaced(totalOutstanding),
    overdue: overdue,
    warning: warning,
    normal: normal
  });
}

/**
 * Rekap bon kas
 */
function rekapBons() {
  var all = readBonRows();
  var belum = all.filter(function (b) { return String(b.status).toUpperCase() === 'BELUM'; });
  var lunas = all.filter(function (b) { return String(b.status).toUpperCase() === 'SUDAH'; });

  var totalBelum = 0, totalLunas = 0;
  belum.forEach(function (b) { totalBelum += parseRupiah(b.nominal); });
  lunas.forEach(function (b) { totalLunas += parseRupiah(b.nominal); });

  return successResponse({
    total_bon: all.length,
    jumlah_belum: belum.length,
    jumlah_lunas: lunas.length,
    nominal_belum: totalBelum,
    nominal_belum_formatted: formatRupiahSpaced(totalBelum),
    nominal_lunas: totalLunas,
    nominal_lunas_formatted: formatRupiahSpaced(totalLunas)
  });
}

/**
 * Update multiple bon logs in bulk (Excel Grid Mode Edit)
 * @param {Object} body {bons: [{_row, pic, keterangan, jumlah, tanggal?, status}]}
 */
function editBonsBulk(body) {
  var list = body.bons || [];
  if (list.length === 0) {
    return errorResponse('Tidak ada data bon untuk diedit');
  }

  var sheet = getBonSheet();
  var lastRow = sheet.getLastRow();
  var cashSheet = getCashSheet();
  
  var minUpdatedCashRow = Infinity;

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var row = parseInt(item._row);
    if (isNaN(row) || row < 2 || row > lastRow) {
      return errorResponse('Baris bon tidak valid: ' + item._row);
    }

    var amount = parseAmount(item.jumlah);
    if (amount <= 0) return errorResponse('Nominal harus lebih dari 0 pada baris ' + row);

    var pic = String(item.pic).trim();
    var keterangan = String(item.keterangan).trim();
    var nominal = formatRupiah(amount);
    var tanggal = item.tanggal ? parseDate(item.tanggal) || new Date() : new Date();
    var newStatus = String(item.status || 'BELUM').trim().toUpperCase();

    // Get old details to know ID and old status
    var currentId = String(sheet.getRange(row, BON_COLS.ID_BON).getValue()).trim();
    var oldStatus = String(sheet.getRange(row, BON_COLS.STATUS).getValue()).trim().toUpperCase();

    if (!currentId) continue;

    // Update Bon_log row
    sheet.getRange(row, BON_COLS.TANGGAL).setValue(tanggal);
    sheet.getRange(row, BON_COLS.PIC).setValue(pic);
    sheet.getRange(row, BON_COLS.KETERANGAN).setValue(keterangan);
    sheet.getRange(row, BON_COLS.NOMINAL).setValue(nominal);
    sheet.getRange(row, BON_COLS.STATUS).setValue(newStatus);

    // Sync with Cash_log
    var cashRows = readCashRows();

    // Status transitions
    if (oldStatus === 'BELUM' && newStatus === 'SUDAH') {
      var addRes = addCashTransaction({
        keterangan: 'Pertanggungan Bon - ' + pic + ' - ' + keterangan,
        jumlah: amount,
        jenis: 'DEBIT',
        pic: pic,
        no_id: currentId,
        sumber: 'WEB_EDIT'
      });
      if (addRes.success && addRes.data && addRes.data.row) {
        if (addRes.data.row < minUpdatedCashRow) minUpdatedCashRow = addRes.data.row;
      }
    } else if (oldStatus === 'SUDAH' && newStatus === 'BELUM') {
      // Delete DEBIT transaction
      for (var j = cashRows.length - 1; j >= 0; j--) {
        var cRow = cashRows[j];
        if (String(cRow.no_id).trim().toUpperCase() === currentId.toUpperCase() && parseRupiah(cRow.debit) > 0) {
          cashSheet.deleteRow(cRow._row);
          if (cRow._row < minUpdatedCashRow) minUpdatedCashRow = cRow._row;
        }
      }
    }

    // Refresh cash rows
    cashRows = readCashRows();

    // Update matching transactions in Cash_log (KREDIT and DEBIT)
    for (var k = 0; k < cashRows.length; k++) {
      var cRow = cashRows[k];
      if (String(cRow.no_id).trim().toUpperCase() === currentId.toUpperCase()) {
        var isKredit = parseRupiah(cRow.kredit) > 0;
        var isDebit = parseRupiah(cRow.debit) > 0;

        if (isKredit) {
          cashSheet.getRange(cRow._row, CASH_COLS.TANGGAL).setValue(tanggal);
          cashSheet.getRange(cRow._row, CASH_COLS.PIC).setValue(pic);
          cashSheet.getRange(cRow._row, CASH_COLS.KETERANGAN_KREDIT).setValue('Bon - ' + pic + ' - ' + keterangan);
          cashSheet.getRange(cRow._row, CASH_COLS.KREDIT).setValue(nominal);
          if (cRow._row < minUpdatedCashRow) minUpdatedCashRow = cRow._row;
        } else if (isDebit) {
          cashSheet.getRange(cRow._row, CASH_COLS.PIC).setValue(pic);
          cashSheet.getRange(cRow._row, CASH_COLS.KETERANGAN_DEBIT).setValue('Pertanggungan Bon - ' + pic + ' - ' + keterangan);
          cashSheet.getRange(cRow._row, CASH_COLS.DEBIT).setValue(nominal);
          if (cRow._row < minUpdatedCashRow) minUpdatedCashRow = cRow._row;
        }
      }
    }
  }

  // Recalculate Cash_log balances if matches were updated
  if (minUpdatedCashRow !== Infinity) {
    var cashLastRow = cashSheet.getLastRow();
    if (minUpdatedCashRow <= cashLastRow) {
      _recalculateCashBalances(cashSheet, minUpdatedCashRow);
    }
  }

  return successResponse(null, 'Berhasil memperbarui ' + list.length + ' data bon');
}

/**
 * Hapus bon berdasarkan baris-baris (cascading delete ke Cash_log)
 * @param {Object} body {rows: [number]}
 */
function deleteBons(body) {
  var rowsToDelete = body.rows || [];
  if (rowsToDelete.length === 0) {
    return errorResponse('Tidak ada baris bon untuk dihapus');
  }

  // Sort descending to prevent index shifting
  rowsToDelete = rowsToDelete.map(Number).filter(function(r) {
    return !isNaN(r) && r >= 2;
  }).sort(function(a, b) {
    return b - a;
  });

  if (rowsToDelete.length === 0) {
    return errorResponse('Baris bon tidak valid untuk dihapus');
  }

  var sheet = getBonSheet();
  var cashSheet = getCashSheet();
  var minCashRow = Infinity;

  for (var i = 0; i < rowsToDelete.length; i++) {
    var r = rowsToDelete[i];
    var currentId = String(sheet.getRange(r, BON_COLS.ID_BON).getValue()).trim();

    // Delete Bon row
    sheet.deleteRow(r);

    if (currentId) {
      // Find and delete matching transactions in Cash_log
      var cashRows = readCashRows();
      for (var j = cashRows.length - 1; j >= 0; j--) {
        var cRow = cashRows[j];
        if (String(cRow.no_id).trim().toUpperCase() === currentId.toUpperCase()) {
          cashSheet.deleteRow(cRow._row);
          if (cRow._row < minCashRow) {
            minCashRow = cRow._row;
          }
        }
      }
    }
  }

  // Recalculate Cash_log balances if any cash rows were deleted
  if (minCashRow !== Infinity) {
    var lastRow = cashSheet.getLastRow();
    if (minCashRow <= lastRow) {
      _recalculateCashBalances(cashSheet, minCashRow);
    }
  }

  return successResponse(null, 'Berhasil menghapus ' + rowsToDelete.length + ' bon beserta transaksi kas terkait');
}
