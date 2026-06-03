/**
 * ============================================
 * CronJobs.gs — Scheduled Tasks
 * Sistem Petty Cash PT BABJM
 * ============================================
 * Setup triggers via GAS UI:
 *   Edit > Triggers > Add Trigger
 *   - dailyBonReminder → Time-driven → Day timer → 8:00-9:00
 *   - dailyRecap → Time-driven → Day timer → 20:00-21:00
 */

/**
 * Reminder bon yang hampir/sudah overdue
 * Jadwal: Setiap hari jam 08:00-09:00 WIB
 */
function dailyBonReminder() {
  var chatId = getTelegramChatId();
  if (!chatId) return;

  var pending = getPendingBons();
  if (pending.length === 0) return;

  var warnings = pending.filter(function (b) {
    return b.alert_level === 'WARNING' || b.alert_level === 'OVERDUE';
  });

  if (warnings.length === 0) return;

  var text = '⏰ <b>REMINDER BON KAS</b>\n\n';

  warnings.forEach(function (b) {
    var icon = b.alert_level === 'OVERDUE' ? '🔴' : '⚠️';
    var label = b.alert_level === 'OVERDUE' ? 'OVERDUE' : 'WARNING';
    text += icon + ' <b>' + b.id_bon + '</b> | ' + b.pic + '\n'
      + '   ' + b.keterangan + '\n'
      + '   💰 ' + formatRupiahSpaced(parseRupiah(b.nominal)) + ' | 📅 ' + b.days_ago + ' hari (' + label + ')\n\n';
  });

  text += 'Total bon pending: ' + pending.length + '\n';
  text += 'Ketik /monitor untuk detail lengkap';

  // Inline keyboard
  var buttons = [];
  for (var i = 0; i < Math.min(warnings.length, 5); i++) {
    buttons.push([{
      text: '✅ Lunaskan ' + warnings[i].id_bon,
      callback_data: 'bon_lunas:' + warnings[i].id_bon
    }]);
  }

  sendTelegramMessage(chatId, text, buttons.length > 0 ? { inline_keyboard: buttons } : null);
}

/**
 * Rekap transaksi harian
 * Jadwal: Setiap hari jam 20:00-21:00 WIB
 */
function dailyRecap() {
  var chatId = getTelegramChatId();
  if (!chatId) return;

  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var rows = getCashByDateRange(todayStart, now);

  if (rows.length === 0) {
    sendTelegramMessage(chatId, '📊 <b>Rekap Hari Ini</b>\n\nTidak ada transaksi hari ini.');
    return;
  }

  var totalDebit = 0, totalKredit = 0;
  for (var i = 0; i < rows.length; i++) {
    totalDebit += parseRupiah(rows[i].debit);
    totalKredit += parseRupiah(rows[i].kredit);
  }

  var saldo = getLastSaldo();
  var pending = getPendingBons();

  var text = '📊 <b>REKAP HARI INI</b>\n'
    + '📅 ' + formatDateSheet(now) + '\n\n'
    + '📝 ' + rows.length + ' transaksi\n'
    + '🟢 Masuk: ' + formatRupiahSpaced(totalDebit) + '\n'
    + '🔴 Keluar: ' + formatRupiahSpaced(totalKredit) + '\n\n'
    + '💳 Saldo: <b>' + formatRupiahSpaced(saldo) + '</b>\n'
    + '📋 Bon pending: ' + pending.length;

  sendTelegramMessage(chatId, text);
}

/**
 * Setup triggers otomatis
 * Jalankan sekali untuk membuat trigger
 */
function setupTriggers() {
  // Hapus trigger lama
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyBonReminder' || t.getHandlerFunction() === 'dailyRecap') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Reminder pagi (08:00-09:00)
  ScriptApp.newTrigger('dailyBonReminder')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // Rekap malam (20:00-21:00)
  ScriptApp.newTrigger('dailyRecap')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();

  Logger.log('✅ Triggers created: dailyBonReminder (08:00), dailyRecap (20:00)');
}
