/**
 * ============================================
 * TelegramBot.gs — Telegram Command Handlers
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

// ─── STATE MANAGEMENT (sederhana via CacheService) ─

/**
 * Simpan state percakapan user
 */
function setState(chatId, state) {
  CacheService.getScriptCache().put('tg_state_' + chatId, JSON.stringify(state), 300); // 5 menit
}

function getState(chatId) {
  var s = CacheService.getScriptCache().get('tg_state_' + chatId);
  return s ? JSON.parse(s) : null;
}

function clearState(chatId) {
  CacheService.getScriptCache().remove('tg_state_' + chatId);
}

// ─── MESSAGE HANDLER ────────────────────────

/**
 * Handle pesan masuk dari Telegram
 */
function handleTelegramMessage(message) {
  var chatId = message.chat.id;
  var text = (message.text || '').trim();
  var from = message.from || {};
  var username = from.first_name || from.username || 'User';

  var textLower = text.toLowerCase();
  var isCommandButton = (
    textLower === '🟢 kas masuk' || textLower === 'kas masuk' ||
    textLower === '🔴 kas keluar' || textLower === 'kas keluar' ||
    textLower === '📋 catat bon' || textLower === 'catat bon' ||
    textLower === '🔍 pantau bon' || textLower === 'pantau bon' ||
    textLower === '💳 cek saldo' || textLower === 'cek saldo' ||
    textLower === '📊 rekap' || textLower === 'rekap'
  );

  // Cek state (apakah sedang dalam flow guided input)
  var state = getState(chatId);
  if (state && !text.startsWith('/')) {
    if (isCommandButton) {
      clearState(chatId);
      state = null;
    } else {
      return handleStateInput(chatId, text, state, username);
    }
  }

  // Pre-process button commands
  if (textLower === '🟢 kas masuk' || textLower === 'kas masuk') {
    setState(chatId, { flow: 'kas', step: 'deskripsi', jenis: 'DEBIT' });
    sendTelegramMessage(chatId, '🟢 <b>KAS MASUK (DEBIT)</b>\n\n📝 Ketik <b>deskripsi</b> transaksi:');
    return;
  }
  if (textLower === '🔴 kas keluar' || textLower === 'kas keluar') {
    setState(chatId, { flow: 'kas', step: 'deskripsi', jenis: 'KREDIT' });
    sendTelegramMessage(chatId, '🔴 <b>KAS KELUAR (KREDIT)</b>\n\n📝 Ketik <b>deskripsi</b> transaksi:');
    return;
  }
  if (textLower === '📋 catat bon' || textLower === 'catat bon') {
    setState(chatId, { flow: 'bon', step: 'deskripsi' });
    sendTelegramMessage(chatId, '📋 <b>Pencatatan Bon Baru</b>\n\n📝 Ketik <b>deskripsi/keterangan</b> bon:');
    return;
  }
  if (textLower === '🔍 pantau bon' || textLower === 'pantau bon') {
    return handleMonitor(chatId);
  }
  if (textLower === '💳 cek saldo' || textLower === 'cek saldo') {
    return handleSaldo(chatId);
  }
  if (textLower === '📊 rekap' || textLower === 'rekap') {
    return handleRekap(chatId, '/rekap');
  }

  // Command routing
  var cmd = text.split(/\s+/)[0].toLowerCase().split('@')[0]; // Handle /cmd@botname

  // Route /lunas_BON_XXXX_XXX clicks
  if (cmd.indexOf('/lunas_') === 0) {
    var rawId = cmd.substring(7);
    var bonId = rawId.replace(/_/g, '-').toUpperCase();
    return handleLunas(chatId, '/lunas ' + bonId);
  }

  switch (cmd) {
    case '/start':
      return handleStart(chatId, username);
    case '/help':
      return handleHelp(chatId);
    case '/kas':
      return handleKas(chatId, text, username);
    case '/bon':
      return handleBon(chatId, text, username);
    case '/saldo':
      return handleSaldo(chatId);
    case '/rekap':
      return handleRekap(chatId, text);
    case '/monitor':
      return handleMonitor(chatId);
    case '/lunas':
      return handleLunas(chatId, text);
    default:
      // Cek apakah pesan biasa saat ada state
      if (state) {
        return handleStateInput(chatId, text, state, username);
      }
      sendTelegramMessage(chatId, '❓ Perintah tidak dikenal.\nKetik /help untuk bantuan.');
  }
}

/**
 * Handle callback query (inline keyboard)
 */
function handleCallbackQuery(query) {
  var chatId = query.message.chat.id;
  var messageId = query.message.message_id;
  var data = query.data;
  var from = query.from || {};
  var username = from.first_name || from.username || 'User';

  answerCallbackQuery(query.id);

  var parts = data.split(':');
  var action = parts[0];

  switch (action) {
    case 'kas_jenis':
      // User pilih Debit/Kredit
      var jenis = parts[1]; // DEBIT atau KREDIT
      setState(chatId, { flow: 'kas', step: 'deskripsi', jenis: jenis });
      var label = jenis === 'DEBIT' ? '🟢 KAS MASUK' : '🔴 KAS KELUAR';
      editTelegramMessage(chatId, messageId, label + '\n\n📝 Ketik <b>deskripsi</b> transaksi:', null);
      break;

    case 'bon_lunas':
      var bonId = parts[1];
      var result = settleBon({ id_bon: bonId, sumber: 'TELEGRAM' });
      if (result.success) {
        editTelegramMessage(chatId, messageId, '✅ Bon <b>' + bonId + '</b> berhasil dipertanggungjawabkan!');
        notifyBonSettled(result.data);
      } else {
        editTelegramMessage(chatId, messageId, '❌ ' + result.error);
      }
      break;

    case 'kas_skip_id':
      // Skip NO. ID, langsung ke lampiran
      var s = getState(chatId);
      if (s) {
        s.step = 'lampiran';
        s.no_id = '';
        setState(chatId, s);
        editTelegramMessage(chatId, messageId,
          _buildKasProgress(s) + '\n\n📎 Ketik <b>Lampiran URL/Link</b> (opsional):',
          { inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'kas_skip_lampiran' }]] }
        );
      }
      break;

    case 'kas_skip_pic':
      var st = getState(chatId);
      if (st) {
        st.step = 'no_id';
        st.pic = '';
        setState(chatId, st);
        editTelegramMessage(chatId, messageId,
          _buildKasProgress(st) + '\n\n🆔 Ketik <b>NO. ID</b> (nomor nota/eproc):',
          { inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'kas_skip_id' }]] }
        );
      }
      break;
      
    case 'kas_skip_lampiran':
      var stl = getState(chatId);
      if (stl) {
        stl.step = 'confirm';
        stl.lampiran = '';
        setState(chatId, stl);
        _showKasConfirmation(chatId, stl);
        // We delete the old message since _showKasConfirmation sends a new one, or we can just send the confirm.
        // Wait, _showKasConfirmation does `sendTelegramMessage`. To avoid double messages, we can just call it.
        // Actually, editTelegramMessage to say "skipped". But _showKasConfirmation sends a new one. 
        // Let's edit the old one to "..." and then send confirmation.
        editTelegramMessage(chatId, messageId, '⏳ Konfirmasi...');
      }
      break;

    case 'kas_confirm':
      var confirmState = getState(chatId);
      if (confirmState) {
        _executeKasTransaction(chatId, confirmState, username);
        clearState(chatId);
        editTelegramMessage(chatId, messageId, '⏳ Menyimpan...');
      }
      break;

    case 'kas_cancel':
      clearState(chatId);
      editTelegramMessage(chatId, messageId, '❌ Transaksi dibatalkan.');
      break;

    case 'bon_confirm':
      var confirmStateBon = getState(chatId);
      if (confirmStateBon) {
        _executeBonTransaction(chatId, confirmStateBon, username);
        clearState(chatId);
        editTelegramMessage(chatId, messageId, '⏳ Menyimpan...');
      }
      break;

    case 'bon_cancel':
      clearState(chatId);
      editTelegramMessage(chatId, messageId, '❌ Pencatatan bon dibatalkan.');
      break;
  }
}

// ─── COMMAND HANDLERS ───────────────────────

function handleStart(chatId, username) {
  // Simpan chat ID sebagai default jika belum ada
  if (!getTelegramChatId()) {
    setConfig('TELEGRAM_CHAT_ID', String(chatId));
  }

  var text = '👋 Halo <b>' + username + '</b>!\n\n'
    + '🏦 <b>Petty Cash PT BABJM</b>\n'
    + 'Bot pencatatan kas & bon kas\n\n'
    + '📌 <b>Perintah Utama:</b>\n'
    + '/kas — Input transaksi kas\n'
    + '/bon — Catat bon baru\n'
    + '/saldo — Cek saldo\n'
    + '/monitor — Pantau bon belum lunas\n'
    + '/lunas — Selesaikan bon\n'
    + '/rekap — Rekap transaksi\n'
    + '/help — Bantuan lengkap';
  sendTelegramMessage(chatId, text);
}

function handleHelp(chatId) {
  var text = '📖 <b>PANDUAN PERINTAH</b>\n\n'
    + '<b>💰 Transaksi Kas:</b>\n'
    + '/kas — Mulai input guided\n'
    + '/kas 50000 Beli ATK — Quick input (keluar)\n\n'
    + '<b>📋 Bon Kas:</b>\n'
    + '/bon Fita 500000 Belanja kebersihan\n'
    + '/monitor — Lihat bon belum lunas\n'
    + '/lunas BON-20260603-001 — Selesaikan bon\n\n'
    + '<b>📊 Info:</b>\n'
    + '/saldo — Cek saldo terkini\n'
    + '/rekap — Rekap bulan ini\n\n'
    + '<b>💡 Tips nominal:</b>\n'
    + '50rb = 50.000\n'
    + '1.5jt = 1.500.000\n'
    + '50000 = 50.000';
  sendTelegramMessage(chatId, text);
}

function handleKas(chatId, text, username) {
  var parts = text.trim().split(/\s+/);

  // Quick input: /kas 50000 Beli ATK
  if (parts.length >= 3) {
    var quick = parseKasQuick(text);
    if (quick) {
      var result = addCashTransaction({
        keterangan: quick.deskripsi,
        jumlah: quick.jumlah,
        jenis: quick.jenis,
        sumber: 'TELEGRAM'
      });

      if (result.success) {
        notifyNewTransaction(result.data);
        var emoji = quick.jenis === 'DEBIT' ? '🟢' : '🔴';
        var label = quick.jenis === 'DEBIT' ? 'Kas Masuk' : 'Kas Keluar';
        sendTelegramMessage(chatId,
          '✅ <b>Tercatat!</b>\n\n'
          + emoji + ' ' + label + ': ' + result.data.jumlah_formatted + '\n'
          + '📝 ' + result.data.keterangan + '\n'
          + '💳 Saldo: ' + result.data.saldo_formatted
        );
      } else {
        sendTelegramMessage(chatId, '❌ ' + result.error);
      }
      return;
    }
  }

  // Guided flow: /kas → pilih jenis
  sendTelegramMessage(chatId, '💰 <b>Input Transaksi Kas</b>\n\nPilih jenis:', {
    inline_keyboard: [
      [
        { text: '🟢 Kas Masuk (Debit)', callback_data: 'kas_jenis:DEBIT' },
        { text: '🔴 Kas Keluar (Kredit)', callback_data: 'kas_jenis:KREDIT' }
      ]
    ]
  });
}

function handleBon(chatId, text, username) {
  var parts = text.trim().split(/\s+/);

  // Quick input: /bon <PIC> <nominal> <keterangan>
  if (parts.length >= 4) {
    var parsed = parseBonQuick(text);
    if (parsed) {
      var result = addBon({
        pic: parsed.pic,
        jumlah: parsed.jumlah,
        keterangan: parsed.keterangan,
        sumber: 'TELEGRAM'
      });

      if (result.success) {
        notifyNewBon(result.data);
        sendTelegramMessage(chatId,
          '📋 <b>Bon Tercatat!</b>\n\n'
          + '🆔 ' + result.data.id_bon + '\n'
          + '👤 ' + result.data.pic + '\n'
          + '💰 ' + result.data.nominal_formatted + '\n'
          + '📝 ' + result.data.keterangan + '\n'
          + '⏳ Status: BELUM'
        );
      } else {
        sendTelegramMessage(chatId, '❌ ' + result.error);
      }
      return;
    }
  }

  // Guided flow
  setState(chatId, { flow: 'bon', step: 'deskripsi' });
  sendTelegramMessage(chatId, '📋 <b>Pencatatan Bon Baru</b>\n\n📝 Ketik <b>deskripsi/keterangan</b> bon:');
}

function handleSaldo(chatId) {
  var result = getCurrentSaldo();
  if (result.success) {
    sendTelegramMessage(chatId,
      '💳 <b>Saldo Kas Saat Ini</b>\n\n'
      + '💰 ' + result.data.saldo_formatted
    );
  } else {
    sendTelegramMessage(chatId, '❌ ' + result.error);
  }
}

function handleRekap(chatId, text) {
  var parts = text.trim().split(/\s+/);
  var params = {};

  // /rekap mei atau /rekap 5 2026
  if (parts.length >= 2) {
    var months = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };
    var m = months[parts[1].toLowerCase()];
    if (m) {
      params.bulan = m;
      params.tahun = parts[2] || new Date().getFullYear();
    } else {
      params.bulan = parseInt(parts[1]);
      params.tahun = parts[2] || new Date().getFullYear();
    }
  }

  var result = rekapCash(params);
  if (result.success) {
    var d = result.data;
    sendTelegramMessage(chatId,
      '📊 <b>REKAP TRANSAKSI</b>\n\n'
      + '📅 ' + d.periode + '\n'
      + '📝 ' + d.total_transaksi + ' transaksi\n\n'
      + '🟢 Debit (Masuk): ' + d.total_debit_formatted + '\n'
      + '🔴 Kredit (Keluar): ' + d.total_kredit_formatted + '\n'
      + '📈 Netto: ' + d.netto_formatted + '\n\n'
      + '💳 Saldo saat ini: ' + d.saldo_formatted
    );
  } else {
    sendTelegramMessage(chatId, '❌ ' + result.error);
  }
}

function handleMonitor(chatId) {
  try {
    var text = formatBonMonitorMessage();
    var pending = getPendingBons();

    // Tambahkan inline keyboard untuk selesaikan bon
    var keyboard = null;
    if (pending.length > 0) {
      var buttons = [];
      for (var i = 0; i < Math.min(pending.length, 8); i++) {
        buttons.push([{
          text: '✅ Lunaskan ' + pending[i].id_bon + ' (' + pending[i].pic + ')',
          callback_data: 'bon_lunas:' + pending[i].id_bon
        }]);
      }
      keyboard = { inline_keyboard: buttons };
    }

    sendTelegramMessage(chatId, text, keyboard);
  } catch (err) {
    sendTelegramMessage(chatId, '❌ Error di /monitor: ' + err.message + '\n' + err.stack);
  }
}

function handleLunas(chatId, text) {
  var parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    sendTelegramMessage(chatId,
      '📋 <b>Selesaikan Bon</b>\n\n'
      + 'Format: <code>/lunas [ID_BON]</code>\n'
      + 'Contoh: <code>/lunas BON-20260603-001</code>\n\n'
      + 'Atau gunakan /monitor untuk lihat & klik tombol lunaskan.'
    );
    return;
  }

  var bonId = parts[1].toUpperCase();
  var result = settleBon({ id_bon: bonId, sumber: 'TELEGRAM' });

  if (result.success) {
    notifyBonSettled(result.data);
    sendTelegramMessage(chatId,
      '✅ <b>Bon LUNAS!</b>\n\n'
      + '🆔 ' + result.data.id_bon + '\n'
      + '👤 ' + result.data.pic + '\n'
      + '💰 ' + result.data.nominal_formatted + '\n'
      + '⏱ ' + result.data.days_taken + ' hari'
    );
  } else {
    sendTelegramMessage(chatId, '❌ ' + result.error);
  }
}

// ─── GUIDED INPUT FLOW ──────────────────────

/**
 * Handle input saat dalam guided flow
 */
function handleStateInput(chatId, text, state, username) {
  if (state.flow === 'kas') {
    switch (state.step) {
      case 'deskripsi':
        state.deskripsi = text;
        state.step = 'nominal';
        setState(chatId, state);
        sendTelegramMessage(chatId, _buildKasProgress(state) + '\n\n💰 Ketik <b>nominal</b>:');
        break;

      case 'nominal':
        var amount = parseAmount(text);
        if (amount <= 0) {
          sendTelegramMessage(chatId, '❌ Nominal tidak valid. Coba lagi:\n\nContoh: 50000, 50rb, 1.5jt');
          return;
        }
        state.jumlah = amount;
        state.step = 'pic';
        setState(chatId, state);
        sendTelegramMessage(chatId,
          _buildKasProgress(state) + '\n\n👤 Ketik <b>PIC</b> (nama penanggung jawab):',
          { inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'kas_skip_pic' }]] }
        );
        break;

      case 'pic':
        state.pic = text;
        state.step = 'no_id';
        setState(chatId, state);
        sendTelegramMessage(chatId,
          _buildKasProgress(state) + '\n\n🆔 Ketik <b>NO. ID</b> (nomor nota/eproc):',
          { inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'kas_skip_id' }]] }
        );
        break;

      case 'no_id':
        state.no_id = text;
        state.step = 'lampiran';
        setState(chatId, state);
        sendTelegramMessage(chatId,
          _buildKasProgress(state) + '\n\n📎 Ketik <b>Lampiran URL/Link</b> (opsional):',
          { inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'kas_skip_lampiran' }]] }
        );
        break;

      case 'lampiran':
        state.lampiran = text;
        state.step = 'confirm';
        setState(chatId, state);
        _showKasConfirmation(chatId, state);
        break;
    }
  } else if (state.flow === 'bon') {
    switch (state.step) {
      case 'deskripsi':
        state.deskripsi = text;
        state.step = 'nominal';
        setState(chatId, state);
        sendTelegramMessage(chatId, _buildBonProgress(state) + '\n\n💰 Ketik <b>nominal</b>:');
        break;

      case 'nominal':
        var amount = parseAmount(text);
        if (amount <= 0) {
          sendTelegramMessage(chatId, '❌ Nominal tidak valid. Coba lagi:\n\nContoh: 50000, 50rb, 1.5jt');
          return;
        }
        state.jumlah = amount;
        state.step = 'pic';
        setState(chatId, state);
        sendTelegramMessage(chatId, _buildBonProgress(state) + '\n\n👤 Ketik <b>PIC</b> (nama penanggung jawab):');
        break;

      case 'pic':
        state.pic = text;
        state.step = 'confirm';
        setState(chatId, state);
        _showBonConfirmation(chatId, state);
        break;
    }
  }
}

function _buildKasProgress(state) {
  var label = state.jenis === 'DEBIT' ? '🟢 KAS MASUK' : '🔴 KAS KELUAR';
  var lines = [label];
  if (state.deskripsi) lines.push('📝 ' + state.deskripsi);
  if (state.jumlah) lines.push('💰 ' + formatRupiahSpaced(state.jumlah));
  if (state.pic) lines.push('👤 ' + state.pic);
  if (state.no_id) lines.push('🆔 ' + state.no_id);
  if (state.lampiran) lines.push('📎 ' + state.lampiran);
  return lines.join('\n');
}

function _showKasConfirmation(chatId, state) {
  sendTelegramMessage(chatId,
    '📋 <b>Konfirmasi Transaksi</b>\n\n' + _buildKasProgress(state) + '\n\nSimpan?',
    {
      inline_keyboard: [
        [
          { text: '✅ Simpan', callback_data: 'kas_confirm' },
          { text: '❌ Batal', callback_data: 'kas_cancel' }
        ]
      ]
    }
  );
}

function _executeKasTransaction(chatId, state, username) {
  var result = addCashTransaction({
    keterangan: state.deskripsi,
    jumlah: state.jumlah,
    jenis: state.jenis,
    pic: state.pic || '',
    no_id: state.no_id || '',
    lampiran: state.lampiran || '',
    sumber: 'TELEGRAM'
  });

  if (result.success) {
    var emoji = state.jenis === 'DEBIT' ? '🟢' : '🔴';
    var label = state.jenis === 'DEBIT' ? 'Kas Masuk' : 'Kas Keluar';
    sendTelegramMessage(chatId,
      '✅ <b>Tersimpan!</b>\n\n'
      + emoji + ' ' + label + ': ' + result.data.jumlah_formatted + '\n'
      + '📝 ' + result.data.keterangan + '\n'
      + '💳 Saldo: ' + result.data.saldo_formatted
    );
  } else {
    sendTelegramMessage(chatId, '❌ Gagal: ' + result.error);
  }
}

function _buildBonProgress(state) {
  var lines = ['📋 <b>BON KAS BARU</b>'];
  if (state.deskripsi) lines.push('📝 ' + state.deskripsi);
  if (state.jumlah) lines.push('💰 ' + formatRupiahSpaced(state.jumlah));
  if (state.pic) lines.push('👤 ' + state.pic);
  return lines.join('\n');
}

function _showBonConfirmation(chatId, state) {
  sendTelegramMessage(chatId,
    '📋 <b>Konfirmasi Bon</b>\n\n' + _buildBonProgress(state) + '\n\nSimpan?',
    {
      inline_keyboard: [
        [
          { text: '✅ Simpan', callback_data: 'bon_confirm' },
          { text: '❌ Batal', callback_data: 'bon_cancel' }
        ]
      ]
    }
  );
}

function _executeBonTransaction(chatId, state, username) {
  var result = addBon({
    pic: state.pic,
    jumlah: state.jumlah,
    keterangan: state.deskripsi,
    sumber: 'TELEGRAM'
  });

  if (result.success) {
    notifyNewBon(result.data);
    sendTelegramMessage(chatId,
      '📋 <b>Bon Berhasil Dicatat!</b>\n\n'
      + '🆔 ' + result.data.id_bon + '\n'
      + '👤 ' + result.data.pic + '\n'
      + '💰 ' + result.data.nominal_formatted + '\n'
      + '📝 ' + result.data.keterangan + '\n'
      + '⏳ Status: BELUM'
    );
  } else {
    sendTelegramMessage(chatId, '❌ Gagal: ' + result.error);
  }
}

