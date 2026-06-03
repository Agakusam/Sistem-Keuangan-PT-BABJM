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

  // Juga catat sebagai transaksi kas keluar (Kredit)
  addCashTransaction({
    keterangan: 'BRT - Bon ' + rowData.pic + ' ' + rowData.keterangan,
    jumlah: amount,
    jenis: 'KREDIT',
    pic: rowData.pic,
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
 * Pertanggungan bon (ubah status ke LUNAS)
 * @param {Object} params {id_bon}
 */
function settleBon(params) {
  if (!params.id_bon) return errorResponse('ID Bon wajib diisi');

  var bon = findBonById(params.id_bon);
  if (!bon) return errorResponse('Bon tidak ditemukan: ' + params.id_bon, 404);

  if (String(bon.status).toUpperCase() === 'LUNAS') {
    return errorResponse('Bon sudah berstatus LUNAS');
  }

  updateBonStatus(bon._row, 'LUNAS');

  // Catat pengembalian sebagai transaksi kas masuk (Debit)
  var nominal = parseRupiah(bon.nominal);
  addCashTransaction({
    keterangan: 'Pengembalian BRT - Bon ' + bon.pic + ' ' + bon.keterangan,
    jumlah: nominal,
    jenis: 'DEBIT',
    pic: bon.pic,
    sumber: params.sumber || 'SYSTEM'
  });

  return successResponse({
    id_bon: bon.id_bon,
    pic: bon.pic,
    keterangan: bon.keterangan,
    nominal_formatted: formatRupiahSpaced(nominal),
    status: 'LUNAS',
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
  var lunas = all.filter(function (b) { return String(b.status).toUpperCase() === 'LUNAS'; });

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
