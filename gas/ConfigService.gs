/**
 * ============================================
 * ConfigService.gs — Konfigurasi via Script Properties
 * Sistem Petty Cash PT BABJM
 * ============================================
 */

var _propsCache = null;

function _getProps() {
  return PropertiesService.getScriptProperties();
}

/**
 * Get config value
 */
function getConfig(key, defaultVal) {
  var val = _getProps().getProperty(key);
  return (val !== null && val !== '') ? val : (defaultVal || '');
}

function getConfigNumber(key, defaultVal) {
  var n = parseFloat(getConfig(key));
  return isNaN(n) ? (defaultVal || 0) : n;
}

function setConfig(key, value) {
  _getProps().setProperty(key, String(value));
}

function getAllConfig() {
  return _getProps().getProperties();
}

// ─── SHORTCUT GETTERS ───────────────────────

function getTelegramBotToken() {
  return getConfig('TELEGRAM_BOT_TOKEN', '8702378512:AAEJvNEGXRyIglSSPqkrT_BOg_0M-pqC55c');
}

function getTelegramChatId() {
  return getConfig('TELEGRAM_CHAT_ID', '');
}

function getWebPin() {
  return getConfig('WEB_PIN', '');
}

function getApiKey() {
  return getConfig('API_KEY', '');
}

/**
 * Nama penandatangan untuk export
 */
function getSignatureNames() {
  return {
    dibuat: getConfig('SIGN_DIBUAT', ''),
    disetujui: getConfig('SIGN_DISETUJUI', '')
  };
}

/**
 * Inisialisasi config default
 * Jalankan sekali saat setup
 */
function initConfig() {
  var props = _getProps();
  var defaults = {
    'TELEGRAM_BOT_TOKEN': '8702378512:AAEJvNEGXRyIglSSPqkrT_BOg_0M-pqC55c',
    'TELEGRAM_CHAT_ID': '',
    'API_KEY': '',
    'WEB_PIN': '',
    'SIGN_DIBUAT': '',
    'SIGN_DISETUJUI': '',
    'WEB_APP_URL': '',
    'APP_VERSION': '1.0.0'
  };

  var existing = props.getProperties();
  for (var key in defaults) {
    if (!existing[key]) {
      props.setProperty(key, defaults[key]);
    }
  }
  Logger.log('✅ Config initialized');
}
