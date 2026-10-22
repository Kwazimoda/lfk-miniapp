// Движок таймера подходов. Чистые функции: состояние — простой объект, время — аргумент now (мс),
// поэтому сворачивание приложения и перезапуск страницы не сбивают отсчёт.
(function (root) {
  var WARN_MS = 3000;
  var PREP_MS = 5000; // растяжка: «Приготовиться» перед первым повтором
  var REST_WARN_MS = 5000; // растяжка: «Приготовиться» и сигнал за 5 с до конца отдыха
  var REST_MS = 45000;
  var HOLD_MS = 45000;

  // prefs — личные настройки (отдых между подходами, отдых между повторами растяжки), в секундах.
  function planFor(item, phase, prefs) {
    var rest = prefs && prefs.restSec ? prefs.restSec * 1000 : REST_MS;
    if (item === 'push' || (item === 'pull' && (!phase || phase.phase !== 'dynamic'))) {
      return { mode: 'hold', sets: 3, holdMs: HOLD_MS, restMs: rest };
    }
    if (item === 'pull') return { mode: 'reps', sets: 3, reps: 10, restMs: rest };
    // Растяжка: повторы идут сами, без нажатий между ними.
    if (item === 'stretch') return { mode: 'auto', sets: 10, holdMs: 5000, restMs: prefs && prefs.stretchRestSec ? prefs.stretchRestSec * 1000 : 15000 };
    return null;
  }

  function create(item, date, plan) {
    return { item: item, date: date, plan: plan, phase: 'ready', set: 1, completed: 0, endsAt: null, left: null, warned: false };
  }

  function copy(s, patch) {
    var out = {};
    Object.keys(s).forEach(function (k) { out[k] = s[k]; });
    Object.keys(patch).forEach(function (k) { out[k] = patch[k]; });
    return out;
  }

  // Подход засчитан: дальше отдых (с момента at) или конец.
  function finishSet(s, at) {
    var completed = s.completed + 1;
    if (completed >= s.plan.sets) return copy(s, { phase: 'done', completed: completed, endsAt: null, warned: false });
    if (!s.plan.restMs) return copy(s, { phase: 'ready', completed: completed, set: completed + 1, endsAt: null, warned: false });
    return copy(s, { phase: 'rest', completed: completed, endsAt: at + s.plan.restMs, warned: false });
  }

  function start(s, now) {
    if (s.phase !== 'ready' || s.plan.mode === 'reps') return s;
    if (s.plan.mode === 'auto') return copy(s, { phase: 'prep', endsAt: now + PREP_MS, warned: false });
    return copy(s, { phase: 'hold', endsAt: now + s.plan.holdMs, warned: false });
  }

  function doneSet(s, now) {
    if (s.phase !== 'ready' || s.plan.mode !== 'reps') return s;
    return finishSet(s, now);
  }

  function pause(s, now) {
    if (s.phase !== 'hold' && s.phase !== 'prep' && !(s.phase === 'rest' && s.plan.mode === 'auto')) return s;
    return copy(s, { phase: 'paused', pausedFrom: s.phase, left: Math.max(0, s.endsAt - now), endsAt: null });
  }

  function resume(s, now) {
    if (s.phase !== 'paused') return s;
    return copy(s, { phase: s.pausedFrom || 'hold', endsAt: now + s.left, left: null, pausedFrom: null });
  }

  function skipRest(s) {
    if (s.phase !== 'rest') return s;
    return copy(s, { phase: 'ready', set: s.completed + 1, endsAt: null, warned: false });
  }

  function remainingMs(s, now) {
    if (s.phase === 'paused') return s.left;
    if (s.phase === 'hold' || s.phase === 'rest' || s.phase === 'prep') return Math.max(0, s.endsAt - now);
    if (s.phase === 'ready' && s.plan.mode !== 'reps') return s.plan.holdMs;
    return 0;
  }

  // За сколько мс до конца фазы подаём сигнал 'warn' (0 — без сигнала).
  function warnMs(s) {
    if (s.phase === 'prep') return WARN_MS;
    if (s.plan.mode !== 'auto') return WARN_MS;
    return s.phase === 'rest' ? REST_WARN_MS : 0;
  }

  // Продвигает состояние к моменту now; events — 'warn' (предупреждение) и 'end' (конец фазы).
  function tick(s, now) {
    var events = [];
    var guard = 50;
    while (guard-- > 0 && (s.phase === 'hold' || s.phase === 'rest' || s.phase === 'prep')) {
      var w = warnMs(s);
      if (!s.warned && w && now >= s.endsAt - w) {
        events.push('warn');
        s = copy(s, { warned: true });
      }
      if (now < s.endsAt) break;
      events.push('end');
      if (s.phase === 'prep') s = copy(s, { phase: 'hold', endsAt: s.endsAt + s.plan.holdMs, warned: false });
      else if (s.phase === 'hold') s = finishSet(s, s.endsAt);
      else if (s.plan.mode === 'auto') s = copy(s, { phase: 'hold', set: s.completed + 1, endsAt: s.endsAt + s.plan.holdMs, warned: false });
      else s = copy(s, { phase: 'ready', set: s.completed + 1, endsAt: null, warned: false });
    }
    // После долгого отсутствия догнанные события схлопываются до последнего «предупреждение + конец».
    if (events.length > 2) events = ['warn', 'end'];
    return { state: s, events: events };
  }

  function restore(json, today) {
    try {
      var s = JSON.parse(json);
      if (!s || s.date !== today || !s.plan || s.phase === 'done') return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  // Примерная длительность упражнения в секундах (для подписи «~N мин»).
  var REPS_SET_SEC = 30;
  function estimateSec(plan) {
    if (!plan) return 0;
    var work = plan.mode === 'reps' ? REPS_SET_SEC : plan.holdMs / 1000;
    return plan.sets * work + (plan.sets - 1) * (plan.restMs / 1000) + (plan.mode === 'auto' ? PREP_MS / 1000 : 0);
  }

  // Очередь «Начать ЛФК»: несделанные обязательные упражнения ЛФК в порядке растяжка → тяга → упор.
  var FLOW_ORDER = ['stretch', 'pull', 'push'];
  function flowQueue(list) {
    return FLOW_ORDER.filter(function (item) {
      var x = list.filter(function (y) { return y.item === item; })[0];
      return x && x.status === 'required' && !x.done;
    });
  }

  var api = {
    estimateSec: estimateSec, flowQueue: flowQueue,
    PREP_MS: PREP_MS, REST_WARN_MS: REST_WARN_MS,
    planFor: planFor, create: create, start: start, doneSet: doneSet, pause: pause, resume: resume,
    skipRest: skipRest, remainingMs: remainingMs, tick: tick, restore: restore,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkSession = api;
})(this);
