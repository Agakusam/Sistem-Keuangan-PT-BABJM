/**
 * ============================================
 * Main.gs — Entry Point & Router
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || '';

  // Health check — no auth
  if (action === 'healthCheck') {
    return jsonOutput(successResponse({
      version: getConfig('APP_VERSION', '1.0.0'),
      status: 'OK'
    }));
  }

  // Inspect sheets — no auth for debugging
  if (action === 'inspect') {
    return jsonOutput(inspectSheets());
  }
 
  // PIN validation — no API key needed
  if (action === 'validatePin') {
    var pin = params.pin || '';
    var webPin = getWebPin();
    var valid = !webPin || pin === webPin;
    return jsonOutput(valid ? successResponse({ valid: true }) : errorResponse('PIN tidak valid', 401));
  }

  // API key check for all other actions
  if (!_checkApiKey(params.api_key || params.apiKey)) {
    return jsonOutput(errorResponse('Unauthorized', 401));
  }

  switch (action) {
    // Cash
    case 'listCash':
      return jsonOutput(listCashTransactions(params));
    case 'getSaldo':
      return jsonOutput(getCurrentSaldo());
    case 'rekapCash':
      return jsonOutput(rekapCash(params));
    case 'exportCash':
      return jsonOutput(exportCashData(params));

    // Bon
    case 'listBon':
      return jsonOutput(listBons(params));
    case 'monitorBon':
      return jsonOutput(monitorBons());
    case 'rekapBon':
      return jsonOutput(rekapBons());

    // Dashboard
    case 'getDashboard':
      return jsonOutput(getDashboardData());
    case 'rebuildDashboard':
      var rebuildRes = setupGSheetDashboard();
      return jsonOutput(successResponse(null, rebuildRes));
    // Config
    case 'getConfig':
      return jsonOutput(successResponse({
        signatures: getSignatureNames(),
        version: getConfig('APP_VERSION', '1.0.0')
      }));

    default:
      return jsonOutput(errorResponse('Unknown action: ' + action, 404));
  }
}

function doPost(e) {
  var body = {};
  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (err) { /* not JSON */ }
  }

  // Telegram webhook
  if (body.update_id !== undefined) {
    var updateId = String(body.update_id);
    var cacheKey = 'tg_up_' + updateId;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    
    if (cached !== null) {
      Logger.log('Ignored duplicate Telegram update_id: ' + updateId);
      return HtmlService.createHtmlOutput("ok");
    }
    
    // Save update_id to cache for 5 minutes (300 seconds) to prevent duplicate processing
    cache.put(cacheKey, 'processing', 300);
    
    try {
      if (body.callback_query) {
        handleCallbackQuery(body.callback_query);
      } else if (body.message) {
        handleTelegramMessage(body.message);
      }
    } catch (err) {
      Logger.log('Telegram error: ' + err.message + '\n' + err.stack);
    }
    return HtmlService.createHtmlOutput("ok");
  }

  // API calls
  var action = body.action || '';
  if (!_checkApiKey(body.api_key || body.apiKey)) {
    return jsonOutput(errorResponse('Unauthorized', 401));
  }

  try {
    switch (action) {
      // Cash
      case 'addCash':
        var cashResult = addCashTransaction(body);
        if (cashResult.success) notifyNewTransaction(cashResult.data);
        return jsonOutput(cashResult);

      case 'addCashBulk':
        var list = body.transactions || [];
        var successList = [];
        var errors = [];
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          var res = addCashTransaction(item);
          if (res.success) {
            successList.push(res.data);
          } else {
            errors.push('Baris ' + (i+1) + ': ' + res.error);
          }
        }
        if (errors.length > 0 && successList.length === 0) {
          return jsonOutput(errorResponse('Gagal menginput semua transaksi:\n' + errors.join('\n')));
        }
        if (successList.length > 0) {
          notifyNewTransactionBulk(successList);
        }
        return jsonOutput(successResponse({
          success_count: successList.length,
          error_count: errors.length,
          errors: errors
        }, 'Berhasil menyimpan ' + successList.length + ' transaksi' + (errors.length > 0 ? ', gagal ' + errors.length + ' baris.' : '.')));

      case 'editCashBulk':
        var editResult = editCashTransactionsBulk(body);
        return jsonOutput(editResult);

      case 'deleteCash':
        var deleteResult = deleteCashTransactions(body);
        return jsonOutput(deleteResult);

      case 'importCashBulk':
        return jsonOutput(importCashTransactionsBulk(body));

      // Bon
      case 'addBon':
        var bonResult = addBon(body);
        if (bonResult.success) notifyNewBon(bonResult.data);
        return jsonOutput(bonResult);

      case 'addBonBulk':
        var list = body.bons || [];
        var successList = [];
        var errors = [];
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          var res = addBon(item);
          if (res.success) {
            successList.push(res.data);
          } else {
            errors.push('Baris ' + (i+1) + ': ' + res.error);
          }
        }
        if (errors.length > 0 && successList.length === 0) {
          return jsonOutput(errorResponse('Gagal menginput semua bon:\n' + errors.join('\n')));
        }
        if (successList.length > 0) {
          notifyNewBonBulk(successList);
        }
        return jsonOutput(successResponse({
          success_count: successList.length,
          error_count: errors.length,
          errors: errors
        }, 'Berhasil menyimpan ' + successList.length + ' bon' + (errors.length > 0 ? ', gagal ' + errors.length + ' baris.' : '.')));

      case 'settleBon':
        var settleResult = settleBon(body);
        if (settleResult.success) notifyBonSettled(settleResult.data);
        return jsonOutput(settleResult);

      case 'editBonBulk':
        var editBonResult = editBonsBulk(body);
        return jsonOutput(editBonResult);

      case 'deleteBon':
        var deleteBonResult = deleteBons(body);
        return jsonOutput(deleteBonResult);

      // Config
      case 'updateConfig':
        if (body.key) {
          setConfig(body.key, body.value || '');
          return jsonOutput(successResponse({ key: body.key, value: body.value }));
        }
        return jsonOutput(errorResponse('Key wajib diisi'));

      default:
        return jsonOutput(errorResponse('Unknown action: ' + action, 404));
    }
  } catch (err) {
    Logger.log('POST error: ' + err.message + '\n' + err.stack);
    return jsonOutput(errorResponse('Server error: ' + err.message, 500));
  }
}

// ─── AUTH ────────────────────────────────────

function _checkApiKey(key) {
  var apiKey = getApiKey();
  if (!apiKey) return true; // Dev mode: no key set
  return key === apiKey;
}

// ─── SETUP FUNCTIONS ────────────────────────

/**
 * Setup webhook Telegram
 * Jalankan sekali setelah deploy Web App
 */
function setupTelegramWebhook() {
  var token = getTelegramBotToken();
  var webAppUrl = ScriptApp.getService().getUrl();

  if (webAppUrl.indexOf('/dev') !== -1) {
    var storedUrl = getConfig('WEB_APP_URL', '');
    if (storedUrl) {
      webAppUrl = storedUrl;
    } else {
      Logger.log('⚠️ Warning: Running setup inside GAS Editor returns a /dev URL which Telegram cannot access. Storing Web App URL in Config first is recommended.');
    }
  }

  var response = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + token + '/setWebhook?url=' + encodeURIComponent(webAppUrl),
    { muteHttpExceptions: true }
  );

  Logger.log('Webhook setup (URL: ' + webAppUrl + '): ' + response.getContentText());
  return response.getContentText();
}

/**
 * Hapus webhook
 */
function removeTelegramWebhook() {
  var token = getTelegramBotToken();
  var response = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + token + '/deleteWebhook',
    { muteHttpExceptions: true }
  );
  Logger.log('Webhook removed: ' + response.getContentText());
}

/**
 * Register bot commands di BotFather
 */
function registerBotCommands() {
  var token = getTelegramBotToken();
  var commands = [
    { command: 'kas', description: 'Input transaksi kas' },
    { command: 'bon', description: 'Catat bon baru' },
    { command: 'saldo', description: 'Cek saldo kas' },
    { command: 'monitor', description: 'Pantau bon belum lunas' },
    { command: 'lunas', description: 'Selesaikan bon' },
    { command: 'rekap', description: 'Rekap transaksi' },
    { command: 'help', description: 'Bantuan perintah' }
  ];

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setMyCommands', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ commands: commands }),
    muteHttpExceptions: true
  });

  Logger.log('✅ Bot commands registered');
}

/**
 * Setup lengkap — jalankan sekali
 */
function fullSetup() {
  initConfig();
  setupTelegramWebhook();
  registerBotCommands();
  Logger.log('✅ Full setup completed');
}

/**
 * Installed Trigger onEdit Google Sheets
 * Memantau perubahan di sheet Bon_log untuk menyinkronkan ke Cash_log
 */
function onSpreadsheetEdit(e) {
  if (!e) return;
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    
    // Hanya proses jika terjadi di sheet Bon_log
    if (sheetName !== 'Bon_log') return;
    
    var startRow = range.getRow();
    var numRows = range.getNumRows();
    
    for (var r = 0; r < numRows; r++) {
      var row = startRow + r;
      if (row < 2) continue; // Jangan proses header
      _syncBonRowToCash(row);
    }
  } catch (err) {
    Logger.log('onSpreadsheetEdit error: ' + err.message);
  }
}

/**
 * Setup installed trigger untuk edit spreadsheet
 * Jalankan ini sekali saja dari Editor Script (klik tombol Run pada fungsi ini)
 */
function setupEditTrigger() {
  var ss = getSpreadsheet();
  
  // Hapus trigger lama jika ada untuk menghindari duplikasi
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSpreadsheetEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Buat trigger baru
  ScriptApp.newTrigger('onSpreadsheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  
  Logger.log('✅ Installed Edit Trigger berhasil didaftarkan untuk fungsi onSpreadsheetEdit');
}

/**
 * Sinkronisasikan satu baris bon ke Cash_log
 */
function _syncBonRowToCash(row) {
  var sheet = getBonSheet();
  var values = sheet.getRange(row, 1, 1, 6).getValues()[0];
  var idBon = String(values[0] || '').trim();
  var pic = String(values[2] || '').trim();
  var keterangan = String(values[3] || '').trim();
  var nominal = parseRupiah(values[4]);
  var status = String(values[5] || 'BELUM').trim().toUpperCase();
  
  // Jika ID BON, PIC, atau nominal belum diisi lengkap/valid, jangan sinkronisasi dulu
  if (!idBon || !pic || nominal <= 0) return;
  
  // Cek apakah transaksi Kredit (bon baru) atau Debit (pertanggungan) sudah ada di Cash_log
  var cashRows = readCashRows();
  var existKredit = false;
  var existDebit = false;
  
  for (var i = 0; i < cashRows.length; i++) {
    var cashRow = cashRows[i];
    if (String(cashRow.no_id).toUpperCase() === idBon.toUpperCase()) {
      if (parseRupiah(cashRow.kredit) > 0) {
        existKredit = true;
      }
      if (parseRupiah(cashRow.debit) > 0) {
        existDebit = true;
      }
    }
  }
  
  // 1. Jika Kredit belum ada, buat transaksi Kredit di Cash_log (pencatatan bon baru)
  if (!existKredit) {
    addCashTransaction({
      keterangan: 'Bon - ' + pic + ' - ' + keterangan,
      jumlah: nominal,
      jenis: 'KREDIT',
      pic: pic,
      no_id: idBon,
      tanggal: parseDate(values[1]) || new Date(),
      sumber: 'GSHEET_ONEDIT'
    });
  }
  
  // 2. Jika status adalah SUDAH atau LUNAS, dan Debit belum ada, buat transaksi Debit di Cash_log
  if ((status === 'SUDAH' || status === 'LUNAS') && !existDebit) {
    addCashTransaction({
      keterangan: 'Pertanggungan Bon - ' + pic + ' - ' + keterangan,
      jumlah: nominal,
      jenis: 'DEBIT',
      pic: pic,
      no_id: idBon,
      sumber: 'GSHEET_ONEDIT'
    });
  }
}

function testOnEdit() {
  var sheet = getBonSheet();
  var lastRow = sheet.getLastRow();
  Logger.log('Last row of Bon_log: ' + lastRow);
  if (lastRow >= 2) {
    _syncBonRowToCash(lastRow);
  }
}

function inspectSheets() {
  var ss = getSpreadsheet();
  var result = {};
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    var lastRow = sheets[i].getLastRow();
    var lastCol = sheets[i].getLastColumn();
    var rowsToFetch = Math.max(1, Math.min(lastRow, 30));
    var colsToFetch = Math.max(1, Math.min(lastCol, 15));
    var range = sheets[i].getRange(1, 1, rowsToFetch, colsToFetch);
    result[name] = {
      dimensions: { rows: lastRow, cols: lastCol },
      values: range.getValues(),
      formulas: range.getFormulas()
    };
  }
  return successResponse(result);
}
