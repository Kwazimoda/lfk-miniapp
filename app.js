// Мини-приложение: вкладки «Сегодня» и «Прогресс». Все статусы и цвета считает Apps Script.
(function () {
  var tg = window.Telegram && Telegram.WebApp;
  var root = document.getElementById('app');
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var LABELS = { stretch: 'Растяжка нерва', pull: 'Тяга резинки', push: 'Упор на пальцы', pullPush: 'Тяга + упор', kettlebell: 'Гиря', ddx: 'DDX', run: 'Пробежка', tennis: 'Теннис' };

  var ui = { tab: 'today', day: 'today', month: null, busy: false, hint: null };
  var SESSION_KEY = 'lfk-session';
  var session = null; // текущий таймер подходов (LfkSession), показывается поверх списка
  var overlayOpen = false;
  var timerId = null;
  var audio = null;
  var wakeLock = null;
  var state = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function humanDate(iso) {
    return +iso.slice(8, 10) + ' ' + MONTHS_GEN[+iso.slice(5, 7) - 1];
  }

  function haptic() {
    try { tg && tg.HapticFeedback.impactOccurred('light'); } catch (e) {}
  }

  function popup(title, message) {
    if (tg && tg.showPopup && tg.initData) tg.showPopup({ title: title, message: message.slice(0, 256), buttons: [{ type: 'close' }] });
    else alert(title + '\n\n' + message);
  }

  function confirmBox(message, cb) {
    if (tg && tg.showConfirm && tg.initData) tg.showConfirm(message, cb);
    else cb(window.confirm(message));
  }

  // --- данные

  function checkVersion(s) {
    var mine = window.LFK_CONFIG.version;
    if (window.LFK_MOCK || mine === 'dev' || s.version === mine) return;
    var flag = 'lfk-reload-' + s.version;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, '1');
    } catch (e) { return; }
    location.replace(location.pathname + '?v=' + encodeURIComponent(s.version));
  }

  function load() {
    return apiCall({ action: 'state', month: ui.month }).then(function (s) {
      if (s.error) throw new Error(s.error);
      var first = !state;
      state = s;
      ui.month = s.month;
      checkVersion(s);
      render();
      if (first) offerResume();
    }).catch(showError);
  }

  function showError(err) {
    var forbidden = err && err.message === 'forbidden';
    root.innerHTML = '<div class="error">' +
      (forbidden ? 'Открой приложение из бота в Telegram.' : 'Не получилось загрузить данные.<br><small>' + esc(err && err.message || '') + '</small>') +
      '<button class="btn" id="retry">Повторить</button></div>';
    document.getElementById('retry').onclick = function () { root.innerHTML = '<div class="loading">Загружаю…</div>'; load(); };
  }

  function mark(item, value, confirm, timed) {
    if (ui.busy) return;
    var date = state[ui.day].date;
    ui.busy = true;
    haptic();
    // Оптимистично показываем галочку сразу.
    state[ui.day].list.forEach(function (x) { if (x.item === item) x.done = value; });
    render();
    apiCall({ action: 'mark', date: date, item: item, value: value, confirm: !!confirm, timed: !!timed, month: ui.month }).then(function (r) {
      ui.busy = false;
      if (r.needsConfirm) {
        state[ui.day].list.forEach(function (x) { if (x.item === item) x.done = !value; });
        render();
        confirmBox('Сегодня по плану отдых для тяги и упора. Точно записать?', function (ok) { if (ok) mark(item, value, true, timed); });
        return;
      }
      if (r.error) throw new Error(r.error === 'bad_date' ? 'Отметить можно только сегодня или вчера' : r.error);
      state = r.state;
      render();
    }).catch(function (err) {
      ui.busy = false;
      popup('Не сохранилось', (err && err.message) || 'Попробуй ещё раз');
      load();
    });
  }

  // --- экраны

  function tagsHtml(tags) {
    return (tags || []).map(function (t) {
      var kind = t === 'отдых' ? ' rest' : /^этап/.test(t) ? ' phase' : '';
      return '<i class="tag' + kind + '">' + esc(t) + '</i>';
    }).join('');
  }

  function renderRow(x) {
    var hint = LfkHints.hintFor(x.item, state.pullPhase);
    var canTime = ui.day === 'today' && LfkSession.planFor(x.item, state.pullPhase) && !x.timed;
    var running = session && session.item === x.item && session.phase !== 'done';
    var html = '<div class="row ' + (x.done ? 'done ' : '') + esc(x.status) + '">' +
      '<button class="ex" data-item="' + esc(x.item) + '" data-done="' + (x.done ? 1 : 0) + '" aria-label="Отметить вручную">' +
      '<span class="chk">' + (x.done ? (x.timed ? '⏱' : '✓') : '') + '</span>' +
      '<span class="txt"><span class="name">' + esc(x.label) + '</span>' +
      (x.dose ? '<span class="dose">' + esc(x.dose) + '</span>' : '') +
      '<span class="tags">' + tagsHtml(x.tags) + '</span></span></button>' +
      '<span class="acts">' +
      (canTime ? '<button class="start' + (running ? ' running' : '') + '" data-start="' + esc(x.item) + '" aria-label="Начать с таймером">' +
        (running ? session.completed + '/' + session.plan.sets : '▶') + '</button>' : '') +
      (hint ? '<button class="info' + (ui.hint === x.item ? ' on' : '') + '" data-hint="' + esc(x.item) + '" aria-label="Как делать">?</button>' : '') +
      '</span></div>';
    if (hint && ui.hint === x.item) html += renderHint(hint);
    return html;
  }

  function renderToday() {
    var v = state[ui.day];
    var lfk = v.list.filter(function (x) { return x.group === 'lfk'; });
    var due = lfk.filter(function (x) { return x.status === 'required' || x.done; });
    var doneN = due.filter(function (x) { return x.done; }).length;
    var html = '<div class="head"><h1>' + esc(v.weekdayName) + ', ' + humanDate(v.date) + '</h1><div class="head-row">' +
      '<div class="sum">ЛФК: ' + doneN + ' из ' + due.length + (doneN === due.length && due.length ? ' — всё сделано 🎉' : '') + '</div>' +
      '<div class="seg"><button data-day="today" class="' + (ui.day === 'today' ? 'on' : '') + '">Сегодня</button>' +
      '<button data-day="yesterday" class="' + (ui.day === 'yesterday' ? 'on' : '') + '">Вчера</button></div></div>';

    html += '<div class="grp">ЛФК</div>' + lfk.map(renderRow).join('');
    html += '<div class="grp">Спорт</div>' + v.list.filter(function (x) { return x.item === 'kettlebell'; }).map(renderRow).join('');
    var extra = v.list.filter(function (x) { return x.group === 'sport' && x.item !== 'kettlebell'; });
    html += '<div class="chips">' + extra.map(function (x) {
      return '<button class="chip' + (x.done ? ' on' : '') + '" data-item="' + esc(x.item) + '" data-done="' + (x.done ? 1 : 0) + '">' +
        (x.done ? '✓ ' : '+ ') + esc(x.label) + '</button>';
    }).join('') + '</div>';
    if (ui.day === 'yesterday') html += '<div class="note-small">За вчера — только ручные отметки, без таймера.</div>';
    return html;
  }

  function renderHint(h) {
    return '<div class="hint-box"><b>' + esc(h.title) + '</b><ol>' +
      h.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      h.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') +
      '<p class="muted">' + esc(LfkHints.COURSE_NOTE) + '</p></div>';
  }

  function renderProgress() {
    var p = state.progress;
    var pct = Math.min(100, Math.round((p.daysDone / p.daysTotal) * 100));
    var html = '<div class="tiles">' +
      '<div class="tile"><b>' + p.streak + '</b>дней без пропусков</div>' +
      '<div class="tile"><b>' + p.totalMisses + '</b>пропусков всего</div>' +
      '<div class="tile"><b>' + p.daysLeft + '</b>дней до финиша</div></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="hint">' + p.daysDone + ' из ' + p.daysTotal + ' дней · финиш 11 января · неделя: тяга + упор ' + p.week.pullPush + '/3, гиря ' + p.week.kettlebell + '/3</div>' +
      (p.timed ? '<div class="hint">⏱ с таймером: ' + p.timed.timed + ' из ' + p.timed.total + ' занятий ЛФК</div>' : '');

    var ym = ui.month;
    html += '<div class="cal-head"><button id="prev" aria-label="Предыдущий месяц">‹</button><span>' + MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) + '</span><button id="next" aria-label="Следующий месяц">›</button></div>';
    html += '<div class="cal">' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(function (d) { return '<div class="wd">' + d + '</div>'; }).join('');
    LfkCalendar.monthGrid(+ym.slice(0, 4), +ym.slice(5, 7)).forEach(function (week) {
      week.forEach(function (iso) {
        if (!iso) { html += '<div></div>'; return; }
        var color = state.calendar[iso] || 'none';
        html += '<button class="' + color + '" data-day="' + iso + '">' + +iso.slice(8, 10) + '</button>';
      });
    });
    html += '</div><div class="legend"><span><i style="background:var(--green)"></i>всё сделано</span><span><i style="background:var(--green-soft)"></i>без пропусков</span><span><i style="background:var(--red)"></i>пропуск</span></div>';

    if (p.misses.length) {
      html += '<div class="misses"><b>Пропуски</b>' + p.misses.slice(-10).reverse().map(function (m) {
        return '<div>' + humanDate(m.date) + ' — ' + m.items.map(function (i) { return LABELS[i]; }).join(', ') + '</div>';
      }).join('') + '</div>';
    }
    return html;
  }

  function dayDetails(iso) {
    var d = state.days[iso];
    if (!d) return popup(humanDate(iso), 'Нет данных за этот день.');
    var done = Object.keys(d.done).filter(function (k) { return d.done[k] && k !== 'pullPush'; }).map(function (k) { return LABELS[k]; });
    var text = 'Сделано: ' + (done.length ? done.join(', ') : '—');
    if (d.misses.length) text += '\nПропущено: ' + d.misses.map(function (k) { return LABELS[k]; }).join(', ');
    popup(humanDate(iso), text);
  }

  function render() {
    root.innerHTML =
      '<div class="tabs"><button data-tab="today" class="' + (ui.tab === 'today' ? 'on' : '') + '">Сегодня</button>' +
      '<button data-tab="progress" class="' + (ui.tab === 'progress' ? 'on' : '') + '">Прогресс</button></div>' +
      (ui.tab === 'today' ? renderToday() : renderProgress()) +
      '<div class="ver">Версия ' + esc(state.version) + '</div>';

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { ui.tab = b.dataset.tab; render(); };
    });
    root.querySelectorAll('[data-item]').forEach(function (b) {
      b.onclick = function () { mark(b.dataset.item, b.dataset.done !== '1'); };
    });
    root.querySelectorAll('[data-start]').forEach(function (b) {
      b.onclick = function () { openSession(b.dataset.start); };
    });
    root.querySelectorAll('[data-hint]').forEach(function (b) {
      b.onclick = function () { ui.hint = ui.hint === b.dataset.hint ? null : b.dataset.hint; render(); };
    });
    root.querySelectorAll('.cal [data-day]').forEach(function (b) {
      b.onclick = function () { dayDetails(b.dataset.day); };
    });
    root.querySelectorAll('.seg [data-day]').forEach(function (b) {
      b.onclick = function () { ui.day = b.dataset.day; ui.hint = null; render(); };
    });
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    if (prev) prev.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, -1); load(); };
    if (next) next.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, 1); load(); };
    renderOverlay();
  }

  // --- таймер подходов

  function saveSession() {
    try {
      if (session && session.phase !== 'done') localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function initAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }

  function beep(freq, ms) {
    if (!audio) return;
    try {
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.25, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + ms / 1000);
    } catch (e) {}
  }

  function signal(ev) {
    if (ev === 'end' && session && session.plan.mode === 'auto' && session.phase !== 'done') {
      // Растяжка: высокий тон — тянем, низкий — отдыхаем.
      beep(session.phase === 'hold' ? 880 : 520, 250);
      try { tg && tg.HapticFeedback.impactOccurred('heavy'); } catch (e) {}
      return;
    }
    if (ev === 'warn') {
      beep(880, 150);
      try { tg && tg.HapticFeedback.impactOccurred('medium'); } catch (e) {}
    } else {
      beep(660, 600);
      try { tg && tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
    }
  }

  function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
      } else if (!on && wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {}
  }

  function openSession(item) {
    initAudio();
    var row = state.today.list.filter(function (x) { return x.item === item; })[0];
    var begin = function (confirmed) {
      if (!session || session.item !== item) {
        var plan = LfkSession.planFor(item, state.pullPhase);
        // ?mock=1&fast=1 — короткие подходы для просмотра в браузере.
        if (window.LFK_MOCK && /[?&]fast=1/.test(location.search)) { plan.holdMs = 5000; plan.restMs = plan.restMs && 4000; }
        session = LfkSession.create(item, state.today.date, plan);
        session.confirm = !!confirmed;
      }
      overlayOpen = true;
      saveSession();
      render();
    };
    if (row && row.status === 'rest' && !(session && session.item === item)) {
      confirmBox('Сегодня по плану отдых для тяги и упора. Всё равно делать?', function (ok) { if (ok) begin(true); });
    } else {
      begin(false);
    }
  }

  function closeOverlay() {
    overlayOpen = false;
    keepAwake(false);
    render();
  }

  function sessionAction(act) {
    var now = Date.now();
    initAudio();
    if (act === 'start') { session = LfkSession.start(session, now); if (session.plan.mode === 'auto') beep(880, 250); }
    if (act === 'done-set') session = LfkSession.doneSet(session, now);
    if (act === 'pause') session = LfkSession.pause(session, now);
    if (act === 'resume') session = LfkSession.resume(session, now);
    if (act === 'skip') session = LfkSession.skipRest(session);
    if (act === 'close') return closeOverlay();
    afterChange([]);
  }

  function afterChange(events) {
    events.forEach(signal);
    saveSession();
    var live = session && (session.phase === 'hold' || session.phase === 'rest');
    keepAwake(live);
    try { tg && tg.initData && (live ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation()); } catch (e) {}
    if (session && session.phase === 'done' && !session.marked) {
      session.marked = true;
      signal('end');
      mark(session.item, true, session.confirm, true);
      saveSession();
    }
    renderOverlay();
  }

  function fmt(ms) {
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  function renderOverlay() {
    var el = document.getElementById('overlay');
    if (!overlayOpen || !session) {
      if (el) el.remove();
      if (timerId) { clearInterval(timerId); timerId = null; }
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'overlay';
      document.body.appendChild(el);
    }
    var s = session;
    var p = s.plan;
    var auto = p.mode === 'auto';
    var now = Date.now();
    var left = LfkSession.remainingMs(s, now);
    var phase = s.phase === 'paused' ? s.pausedFrom || 'hold' : s.phase;
    var total = phase === 'rest' ? p.restMs : p.holdMs;
    var frac = (s.phase === 'hold' || s.phase === 'rest' || s.phase === 'paused') && total ? 1 - left / total : 0;
    var unit = auto ? 'повтор' : 'подход';

    var dots = '';
    for (var i = 1; i <= p.sets; i++) {
      var cls = i <= s.completed ? 'f' : (i === s.completed + 1 && s.phase !== 'ready' && s.phase !== 'done' && phase === 'hold' ? 'p' : '');
      dots += '<i class="' + cls + '"></i>';
    }

    var word, big, sub, next = '', primary = '', secondary = '', tone = 'hold';
    if (s.phase === 'done') {
      word = 'Готово'; big = '✓'; sub = p.sets + ' из ' + p.sets + ' · записано с ⏱'; tone = 'done';
      primary = '<button class="btn" data-act="close">К списку</button>';
    } else if (s.phase === 'paused') {
      word = 'Пауза'; big = fmt(left); sub = unit + ' ' + s.set + ' из ' + p.sets; tone = 'paused';
      primary = '<button class="btn" data-act="resume">Продолжить</button>';
    } else if (s.phase === 'rest') {
      word = 'Отдых'; big = fmt(left); sub = 'сделано ' + s.completed + ' из ' + p.sets; tone = 'rest';
      next = auto ? 'Дальше: растяжка, повтор ' + (s.completed + 1) : 'Дальше: подход ' + (s.completed + 1) + ' — по кнопке';
      secondary = auto ? '<button class="btn ghost" data-act="pause">Пауза</button>' : '<button class="btn ghost" data-act="skip">Пропустить отдых</button>';
    } else if (s.phase === 'hold') {
      word = auto ? 'Растяжка' : 'Держим'; big = fmt(left); sub = unit + ' ' + s.set + ' из ' + p.sets;
      next = s.set < p.sets ? 'Дальше: отдых ' + fmt(p.restMs) : 'Последний ' + unit + '!';
      secondary = '<button class="btn ghost" data-act="pause">Пауза</button>';
    } else if (p.mode === 'reps') {
      word = 'Подход ' + s.set + ' из ' + p.sets; big = String(p.reps); sub = 'повторений, в своём темпе'; tone = 'ready';
      primary = '<button class="btn" data-act="done-set">Сделал подход ' + s.set + '</button>';
    } else {
      word = auto ? p.sets + ' повторов подряд' : 'Подход ' + s.set + ' из ' + p.sets; big = fmt(p.holdMs); tone = 'ready';
      sub = auto ? fmt(p.holdMs) + ' растяжка · ' + fmt(p.restMs) + ' отдых' : 'удержание';
      primary = '<button class="btn" data-act="start">' + (auto ? 'Начать' : 'Начать подход ' + s.set) + '</button>';
    }
    var color = tone === 'rest' ? 'var(--green)' : 'var(--accent)';
    var ring = tone === 'done' ? 'background:var(--green);color:#fff'
      : 'background:radial-gradient(var(--bg) 62%, transparent 63%), conic-gradient(' + color + ' 0 ' + (frac * 100).toFixed(1) + '%, var(--track) 0)';

    el.className = 'tone-' + tone;
    el.innerHTML = '<div class="ov-head"><span>' + esc(LABELS[s.item]) + '</span><button data-act="close" aria-label="Закрыть">×</button></div>' +
      '<div class="sets' + (p.sets > 5 ? ' many' : '') + '">' + dots + '</div>' +
      '<div class="ring" style="' + ring + '"><span class="word">' + esc(word) + '</span><b>' + big + '</b><small>' + esc(sub) + '</small></div>' +
      '<div class="next">' + esc(next) + '</div>' +
      '<div class="ov-actions">' + primary + secondary + '<div class="ov-note">Боль — не выше 3–4 из 10</div></div>';
    el.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () { sessionAction(b.dataset.act); };
    });

    var live = s.phase === 'hold' || s.phase === 'rest';
    if (live && !timerId) {
      timerId = setInterval(function () {
        var r = LfkSession.tick(session, Date.now());
        session = r.state;
        afterChange(r.events);
      }, 250);
    } else if (!live && timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function offerResume() {
    try {
      var saved = LfkSession.restore(localStorage.getItem(SESSION_KEY), state.today.date);
      if (!saved) return;
      session = LfkSession.tick(saved, Date.now()).state;
      confirmBox('Продолжить «' + LABELS[session.item] + '»? Сделано подходов: ' + session.completed + ' из ' + session.plan.sets + '.', function (ok) {
        if (ok) { overlayOpen = true; afterChange([]); }
        else { session = null; saveSession(); render(); }
      });
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && session && overlayOpen) {
      keepAwake(false);
      afterChange(LfkSession.tick(session, Date.now()).events);
    }
  });

  if (tg && tg.initData) {
    document.documentElement.classList.add('tg');
    tg.ready();
    tg.expand();
    try {
      // Свайп вниз не закрывает приложение — его легко сделать случайно во время упражнения.
      if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes();
      // На телефоне — весь экран; кнопки Telegram остаются поверх, контент отступает под них.
      if (tg.isVersionAtLeast('8.0') && /^(ios|android)$/.test(tg.platform)) tg.requestFullscreen();
    } catch (e) {}
  }
  if (!window.LFK_MOCK && !(tg && tg.initData)) {
    showError({ message: 'forbidden' });
  } else {
    load();
  }
})();
