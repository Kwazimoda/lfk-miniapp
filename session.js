// Движок таймера подходов. Чистые функции: состояние — простой объект, время — аргумент now (мс),
// поэтому сворачивание приложения и перезапуск страницы не сбивают отсчёт.
(function (root) {
  var WARN_MS = 3000;
  var REST_MS = 60000;
  var HOLD_MS = 45000;

  function planFor(item, phase) {
    if (item === 'push' || (item === 'pull' && (!phase || phase.phase !== 'dynamic'))) {
      return { mode: 'hold', sets: 3, holdMs: HOLD_MS, restMs: REST_MS };
    }
    if (item === 'pull') return { mode: 'reps', sets: 3, reps: 10, restMs: REST_MS };
    if (item === 'stretch') return { mode: 'reps', sets: 1, reps: 10, restMs: 0 };
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
    if (s.phase !== 'ready' || s.plan.mode !== 'hold') return s;
    return copy(s, { phase: 'hold', endsAt: now + s.plan.holdMs, warned: false });
  }

  function doneSet(s, now) {
    if (s.phase !== 'ready' || s.plan.mode !== 'reps') return s;
    return finishSet(s, now);
  }

  function pause(s, now) {
    if (s.phase !== 'hold') return s;
    return copy(s, { phase: 'paused', left: Math.max(0, s.endsAt - now), endsAt: null });
  }

  function resume(s, now) {
    if (s.phase !== 'paused') return s;
    return copy(s, { phase: 'hold', endsAt: now + s.left, left: null });
  }

  function skipRest(s) {
    if (s.phase !== 'rest') return s;
    return copy(s, { phase: 'ready', set: s.completed + 1, endsAt: null, warned: false });
  }

  function remainingMs(s, now) {
    if (s.phase === 'paused') return s.left;
    if (s.phase === 'hold' || s.phase === 'rest') return Math.max(0, s.endsAt - now);
    if (s.phase === 'ready' && s.plan.mode === 'hold') return s.plan.holdMs;
    return 0;
  }

  // Продвигает состояние к моменту now; events — 'warn' (за 3 с) и 'end' (конец удержания/отдыха).
  function tick(s, now) {
    var events = [];
    var guard = 10;
    while (guard-- > 0 && (s.phase === 'hold' || s.phase === 'rest')) {
      if (!s.warned && now >= s.endsAt - WARN_MS) {
        events.push('warn');
        s = copy(s, { warned: true });
      }
      if (now < s.endsAt) break;
      events.push('end');
      s = s.phase === 'hold' ? finishSet(s, s.endsAt) : copy(s, { phase: 'ready', set: s.completed + 1, endsAt: null, warned: false });
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

  var api = {
    planFor: planFor, create: create, start: start, doneSet: doneSet, pause: pause, resume: resume,
    skipRest: skipRest, remainingMs: remainingMs, tick: tick, restore: restore,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkSession = api;
})(this);
