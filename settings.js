// Настройки внешнего вида: цвета ЛФК, гири и спорта. Хранятся в облаке Telegram
// (CloudStorage — общие для всех устройств), иначе в localStorage.
(function (root) {
  var PALETTE = ['#43a047', '#2aabee', '#f5a623', '#e5534b', '#9b6bdf', '#14b8a6', '#ec4899', '#8a8f98'];
  var DEFAULTS = { lfk: '#43a047', kb: '#f5a623', run: '#14b8a6', ddx: '#9b6bdf', tennis: '#ec4899' };
  var KEY = 'lfk_colors';
  var PREFS_KEY = 'lfk_prefs';
  var REST_OPTIONS = [30, 45, 60, 90];
  var STRETCH_REST_OPTIONS = [5, 10, 15];
  var THEMES = ['auto', 'light', 'dark'];
  var PREFS_DEFAULTS = { sound: true, vibe: true, restSec: 45, stretchRestSec: 10, theme: 'auto' };

  function normalizePrefs(v) {
    var s = v && typeof v === 'object' ? v : {};
    return {
      sound: typeof s.sound === 'boolean' ? s.sound : PREFS_DEFAULTS.sound,
      vibe: typeof s.vibe === 'boolean' ? s.vibe : PREFS_DEFAULTS.vibe,
      restSec: REST_OPTIONS.indexOf(s.restSec) >= 0 ? s.restSec : PREFS_DEFAULTS.restSec,
      stretchRestSec: STRETCH_REST_OPTIONS.indexOf(s.stretchRestSec) >= 0 ? s.stretchRestSec : PREFS_DEFAULTS.stretchRestSec,
      theme: THEMES.indexOf(s.theme) >= 0 ? s.theme : PREFS_DEFAULTS.theme,
    };
  }

  function normalize(v) {
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      out[k] = v && typeof v === 'object' && PALETTE.indexOf(v[k]) >= 0 ? v[k] : DEFAULTS[k];
    });
    return out;
  }

  function parse(raw) {
    try { return normalize(JSON.parse(raw)); } catch (e) { return normalize(null); }
  }

  function cloud() {
    var tg = root.Telegram && root.Telegram.WebApp;
    return tg && tg.initData && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
  }

  // Цвета и личные настройки лежат в одном хранилище под двумя ключами.
  function readAll(cb) {
    var cs = cloud();
    if (cs) return cs.getItems([KEY, PREFS_KEY], function (err, v) { cb(err ? {} : v || {}); });
    try { cb({ lfk_colors: root.localStorage.getItem(KEY), lfk_prefs: root.localStorage.getItem(PREFS_KEY) }); } catch (e) { cb({}); }
  }

  function write(key, value) {
    var raw = JSON.stringify(value);
    var cs = cloud();
    if (cs) cs.setItem(key, raw);
    try { root.localStorage.setItem(key, raw); } catch (e) {}
  }

  function load(cb) {
    readAll(function (v) {
      var prefs = normalizePrefs(null);
      try { prefs = normalizePrefs(JSON.parse(v[PREFS_KEY])); } catch (e) {}
      cb(parse(v[KEY]), prefs);
    });
  }

  function save(colors) { write(KEY, normalize(colors)); }
  function savePrefs(prefs) { write(PREFS_KEY, normalizePrefs(prefs)); }

  function apply(colors) {
    var st = root.document.documentElement.style;
    st.setProperty('--c-lfk', colors.lfk);
    st.setProperty('--c-kb', colors.kb);
    st.setProperty('--c-run', colors.run);
    st.setProperty('--c-ddx', colors.ddx);
    st.setProperty('--c-tennis', colors.tennis);
  }

  // Тема: auto — как в Telegram, light/dark — принудительно (см. [data-theme] в CSS).
  function applyTheme(theme) {
    var el = root.document.documentElement;
    if (theme === 'light' || theme === 'dark') el.setAttribute('data-theme', theme);
    else el.removeAttribute('data-theme');
    try {
      var tg = root.Telegram && root.Telegram.WebApp;
      if (tg && tg.initData && theme !== 'auto') {
        var bg = theme === 'dark' ? '#0e1621' : '#f1f2f6';
        tg.setBackgroundColor(bg);
        tg.setHeaderColor(bg);
      }
    } catch (e) {}
  }

  var api = {
    PALETTE: PALETTE, DEFAULTS: DEFAULTS, normalize: normalize, load: load, save: save, apply: apply,
    normalizePrefs: normalizePrefs, savePrefs: savePrefs, applyTheme: applyTheme,
    REST_OPTIONS: REST_OPTIONS, STRETCH_REST_OPTIONS: STRETCH_REST_OPTIONS, THEMES: THEMES,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkSettings = api;
})(this);
