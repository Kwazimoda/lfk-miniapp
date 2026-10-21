// Тестовый режим: песочница на копии данных. Серверная логика (logic.js) работает в памяти телефона,
// ничего не пишется в таблицу и не уходит в бота. Выход или закрытие приложения — копия исчезает.
(function (root) {
  var DAY_MS = 86400000;

  // logic — window.LfkLogic; snapshot — { history, launchDate, settings, plans }; nowFn — «настоящее» время (мс).
  function createBackend(logic, snapshot, nowFn) {
    var offsetDays = 0;
    var history;
    var props;
    var repo;

    function reset() {
      offsetDays = 0;
      history = JSON.parse(JSON.stringify(snapshot.history || {}));
      var store = {
        SETTINGS: JSON.stringify(snapshot.settings || {}),
        PLANS: JSON.stringify(snapshot.plans || []),
      };
      props = { get: function (k) { return store[k] === undefined ? null : store[k]; }, set: function (k, v) { store[k] = String(v); } };
      var KEYS = ['stretch', 'pull', 'push', 'kettlebell', 'ddx', 'run', 'tennis'];
      repo = {
        launchDate: snapshot.launchDate,
        readHistory: function () { return JSON.parse(JSON.stringify(history)); },
        setMark: function (iso, item, value, timed) {
          var day = history[iso] || (history[iso] = {});
          KEYS.forEach(function (k) { if (day[k] === undefined) day[k] = false; });
          (item === 'pullPush' ? ['pull', 'push'] : [item]).forEach(function (k) {
            day[k] = value;
            if (timed && value) day[k + 'Timed'] = true;
            else delete day[k + 'Timed'];
          });
        },
        setPain: function (iso, value) {
          var day = history[iso] || (history[iso] = {});
          KEYS.forEach(function (k) { if (day[k] === undefined) day[k] = false; });
          day.pain = value;
        },
        paintDay: function () {},
      };
    }

    function call(body) {
      var deps = {
        repo: repo,
        props: props,
        now: new Date(nowFn() + offsetDays * DAY_MS),
        chatId: 'test',
        tg: { sendMessage: function () { return { message_id: 0 }; } }, // в тесте в чат ничего не уходит
      };
      if (body.action === 'sendReport') return { ok: true, test: true };
      return logic.dispatch(body, deps);
    }

    reset();
    return {
      call: call,
      reset: reset,
      shiftDays: function (n) { offsetDays += n; },
      dayOffset: function () { return offsetDays; },
      nowMs: function () { return nowFn() + offsetDays * DAY_MS; },
    };
  }

  // --- подключение к приложению (только в браузере)
  var backend = null;

  function loadLogic(version) {
    if (root.LfkLogic) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = root.document.createElement('script');
      s.src = 'logic.js?v=' + encodeURIComponent(version || 'dev');
      s.onload = resolve;
      s.onerror = function () { reject(new Error('не загрузилась логика теста')); };
      root.document.head.appendChild(s);
    });
  }

  // snapshotFn() → Promise<snapshot> (запрос к настоящему серверу — единственное обращение в тесте).
  function enter(snapshotFn, version) {
    return Promise.all([loadLogic(version), snapshotFn()]).then(function (res) {
      backend = createBackend(root.LfkLogic, res[1], function () { return Date.now(); });
      api.active = true;
      root.document.documentElement.classList.add('testing');
    });
  }

  function exit() {
    backend = null;
    api.active = false;
    root.document.documentElement.classList.remove('testing');
  }

  var api = {
    createBackend: createBackend,
    active: false,
    enter: enter,
    exit: exit,
    call: function (body) { return backend.call(body); },
    reset: function () { backend.reset(); },
    shiftDays: function (n) { backend.shiftDays(n); },
    dayOffset: function () { return backend ? backend.dayOffset() : 0; },
    nowMs: function () { return backend ? backend.nowMs() : Date.now(); },
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkTest = api;
})(typeof window !== 'undefined' ? window : this);
