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
      return ContentService.createTextOutput("ok");
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
    return ContentService.createTextOutput("ok");
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

      // Bon
      case 'addBon':
        var bonResult = addBon(body);
        if (bonResult.success) notifyNewBon(bonResult.data);
        return jsonOutput(bonResult);

      case 'settleBon':
        var settleResult = settleBon(body);
        if (settleResult.success) notifyBonSettled(settleResult.data);
        return jsonOutput(settleResult);

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
