// Настройки внешнего вида: цвета ЛФК, гири и спорта. Хранятся в облаке Telegram
// (CloudStorage — общие для всех устройств), иначе в localStorage.
(function (root) {
  var PALETTE = ['#43a047', '#2aabee', '#f5a623', '#e5534b', '#9b6bdf', '#14b8a6', '#ec4899', '#8a8f98'];
  var DEFAULTS = { lfk: '#43a047', kb: '#f5a623', sport: '#2aabee' };
  var KEY = 'lfk_colors';

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

  function load(cb) {
    var cs = cloud();
    if (cs) return cs.getItem(KEY, function (err, raw) { cb(parse(err ? null : raw)); });
    try { cb(parse(root.localStorage.getItem(KEY))); } catch (e) { cb(normalize(null)); }
  }

  function save(colors) {
    var raw = JSON.stringify(normalize(colors));
    var cs = cloud();
    if (cs) cs.setItem(KEY, raw);
    try { root.localStorage.setItem(KEY, raw); } catch (e) {}
  }

  function apply(colors) {
    var st = root.document.documentElement.style;
    st.setProperty('--c-lfk', colors.lfk);
    st.setProperty('--c-kb', colors.kb);
    st.setProperty('--c-sport', colors.sport);
  }

  var api = { PALETTE: PALETTE, DEFAULTS: DEFAULTS, normalize: normalize, load: load, save: save, apply: apply };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkSettings = api;
})(this);
