/**
 * ============================================
 * NotifService.gs — Notifikasi Telegram
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

var TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Kirim pesan teks ke Telegram
 * @param {string} chatId
 * @param {string} text
 * @param {Object} [keyboard] Inline keyboard markup
 */
function getDefaultKeyboard() {
  return {
    keyboard: [
      [
        { text: '🟢 Kas Masuk' },
        { text: '🔴 Kas Keluar' },
        { text: '📋 Catat Bon' }
      ],
      [
        { text: '🔍 Pantau Bon' },
        { text: '💳 Cek Saldo' },
        { text: '📊 Rekap' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

function sendTelegramMessage(chatId, text, keyboard) {
  var token = getTelegramBotToken();
  if (!token) { Logger.log('Bot token belum diset'); return; }
  if (!chatId) { Logger.log('Chat ID belum diset'); return; }

  var payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (keyboard) {
    payload.reply_markup = JSON.stringify(keyboard);
  } else {
    payload.reply_markup = JSON.stringify(getDefaultKeyboard());
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(TELEGRAM_API + token + '/sendMessage', options);
    var result = JSON.parse(response.getContentText());
    if (!result.ok) {
      Logger.log('Telegram API error: ' + JSON.stringify(result));
    }
    return result;
  } catch (e) {
    Logger.log('Error sending Telegram message: ' + e.message);
    return null;
  }
}

/**
 * Kirim pesan ke default chat ID
 */
function sendToDefaultChat(text, keyboard) {
  var chatId = getTelegramChatId();
  if (chatId) sendTelegramMessage(chatId, text, keyboard);
}

/**
 * Answer callback query (untuk inline keyboard)
 */
function answerCallbackQuery(callbackQueryId, text) {
  var token = getTelegramBotToken();
  UrlFetchApp.fetch(TELEGRAM_API + token + '/answerCallbackQuery', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || ''
    }),
    muteHttpExceptions: true
  });
}

/**
 * Edit pesan yang sudah terkirim
 */
function editTelegramMessage(chatId, messageId, text, keyboard) {
  var token = getTelegramBotToken();
  var payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML'
  };
  if (keyboard) payload.reply_markup = JSON.stringify(keyboard);

  UrlFetchApp.fetch(TELEGRAM_API + token + '/editMessageText', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ─── NOTIFICATION BUILDERS ──────────────────

/**
 * Notifikasi bon baru
 */
function notifyNewBon(bonData) {
  var text = '📋 <b>Bon Baru Dicatat</b>\n\n'
    + '🆔 ' + bonData.id_bon + '\n'
    + '👤 ' + bonData.pic + '\n'
    + '💰 ' + bonData.nominal_formatted + '\n'
    + '📝 ' + bonData.keterangan + '\n'
    + '\n⏳ Max ' + BON_MAX_DAYS + ' hari untuk pertanggungan';
  sendToDefaultChat(text);
}

/**
 * Notifikasi bon lunas
 */
function notifyBonSettled(bonData) {
  var text = '✅ <b>Bon LUNAS</b>\n\n'
    + '🆔 ' + bonData.id_bon + '\n'
    + '👤 ' + bonData.pic + '\n'
    + '💰 ' + bonData.nominal_formatted + '\n'
    + '⏱ Diselesaikan dalam ' + bonData.days_taken + ' hari';
  sendToDefaultChat(text);
}

/**
 * Notifikasi transaksi baru
 */
function notifyNewTransaction(trxData) {
  var emoji = trxData.jenis === 'DEBIT' ? '🟢' : '🔴';
  var label = trxData.jenis === 'DEBIT' ? 'KAS MASUK' : 'KAS KELUAR';
  var text = emoji + ' <b>' + label + '</b>\n\n'
    + '📝 ' + trxData.keterangan + '\n'
    + '💰 ' + trxData.jumlah_formatted + '\n'
    + '💳 Saldo: ' + trxData.saldo_formatted;
  sendToDefaultChat(text);
}

/**
 * Format monitor bon untuk Telegram
 */
function formatBonMonitorMessage() {
  var result = monitorBons();
  if (!result.success) return '❌ Error: ' + result.error;

  var d = result.data;
  if (d.total_pending === 0) {
    return '✅ <b>Tidak ada bon yang belum dipertanggungjawabkan</b>';
  }

  var text = '📋 <b>BON BELUM PERTANGGUNGAN</b>\n'
    + '💰 Total outstanding: ' + d.total_outstanding_formatted + '\n';

  // Overdue first
  if (d.overdue.length > 0) {
    text += '\n🔴 <b>OVERDUE (' + BON_MAX_DAYS + '+ hari)</b>\n';
    d.overdue.forEach(function (b) {
      var cmdLink = '/lunas_' + b.id_bon.replace(/-/g, '_');
      text += '  • ' + cmdLink + ' | 👤 <b>' + b.pic + '</b>\n'
        + '    📝 ' + b.keterangan + '\n'
        + '    💰 ' + formatRupiahSpaced(b.nominal_value) + ' | 📅 ' + b.days_ago + ' hari\n';
    });
  }

  // Warning
  if (d.warning.length > 0) {
    text += '\n⚠️ <b>WARNING (' + BON_WARNING_DAYS + '-' + (BON_MAX_DAYS - 1) + ' hari)</b>\n';
    d.warning.forEach(function (b) {
      var cmdLink = '/lunas_' + b.id_bon.replace(/-/g, '_');
      text += '  • ' + cmdLink + ' | 👤 <b>' + b.pic + '</b>\n'
        + '    📝 ' + b.keterangan + '\n'
        + '    💰 ' + formatRupiahSpaced(b.nominal_value) + ' | 📅 ' + b.days_ago + ' hari\n';
    });
  }

  // Normal
  if (d.normal.length > 0) {
    text += '\n🟡 <b>NORMAL</b>\n';
    d.normal.forEach(function (b) {
      var cmdLink = '/lunas_' + b.id_bon.replace(/-/g, '_');
      text += '  • ' + cmdLink + ' | 👤 <b>' + b.pic + '</b>\n'
        + '    📝 ' + b.keterangan + '\n'
        + '    💰 ' + formatRupiahSpaced(b.nominal_value) + ' | 📅 ' + b.days_ago + ' hari\n';
    });
  }

  text += '\n💡 <i>Klik salah satu kode <b>/lunas_...</b> di atas untuk melunaskan secara instan!</i>';
  return text;
}

/**
 * Notifikasi transaksi bulk untuk Telegram
 */
function notifyNewTransactionBulk(successList) {
  var text = '🟢🔴 <b>' + successList.length + ' Transaksi Baru Dicatat (Bulk)</b>\n\n';
  for (var i = 0; i < Math.min(successList.length, 10); i++) {
    var trx = successList[i];
    var emoji = trx.jenis === 'DEBIT' ? '🟢' : '🔴';
    text += emoji + ' ' + trx.keterangan + ' | 💰 ' + trx.jumlah_formatted + '\n';
  }
  if (successList.length > 10) {
    text += '...dan ' + (successList.length - 10) + ' transaksi lainnya.\n';
  }
  var lastSaldo = successList[successList.length - 1].saldo_baru;
  text += '\n💳 Saldo Terkini: ' + formatRupiahSpaced(lastSaldo);
  sendToDefaultChat(text);
}

/**
 * Notifikasi bon bulk untuk Telegram
 */
function notifyNewBonBulk(successList) {
  var text = '📋 <b>' + successList.length + ' Bon Baru Dicatat (Bulk)</b>\n\n';
  for (var i = 0; i < Math.min(successList.length, 10); i++) {
    var bon = successList[i];
    text += '• 👤 <b>' + bon.pic + '</b> | 💰 ' + bon.nominal_formatted + '\n  📝 ' + bon.keterangan + '\n';
  }
  if (successList.length > 10) {
    text += '...dan ' + (successList.length - 10) + ' bon lainnya.\n';
  }
  sendToDefaultChat(text);
}
