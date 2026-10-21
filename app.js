// Мини-приложение: вкладки «Сегодня», «Прогресс», «Настройки» (панель снизу). Все статусы и цвета считает Apps Script.
(function () {
  var tg = window.Telegram && Telegram.WebApp;
  var root = document.getElementById('app');
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var LABELS = { stretch: 'Растяжка нерва', pull: 'Тяга резинки', push: 'Упор на пальцы', pullPush: 'Тяга + упор', kettlebell: 'Гиря', ddx: 'DDX', run: 'Бег', tennis: 'Теннис' };

  var ui = { tab: 'today', day: 'today', month: null, hint: null, selDay: null, calView: 'month', sheet: null, showRest: false, popItem: null, painVal: 2, planDate: null, planAt: null };
  var flow = null; // «Начать ЛФК»: { queue: [item], idx, stage: 'between' | 'session' | 'pain' | 'done', solo }
  var report = null; // данные отчёта для врача, когда он открыт
  var wasAllDone = null;
  var colors = LfkSettings.normalize(null);
  var prefs = LfkSettings.normalizePrefs(null);
  var DEFAULT_REMINDERS = { stretchAt: 780, ddxAt: 1140, lfk: { from: 1200, to: 1380 }, kb: { from: 1200, to: 1380 }, run: { from: 1020, to: 1140 } };
  var WINDOW_MIN_FROM = 360;
  var WINDOW_MAX_TO = 1425;
  var WINDOW_MIN_LEN = 30;
  var SESSION_KEY = 'lfk-session';
  var session = null; // текущий таймер подходов (LfkSession), показывается поверх списка
  var overlayOpen = false;
  var timerId = null;
  var audio = null;
  var wakeLock = null;
  var state = null;

  // Тонкие линейные иконки (24×24, stroke = currentColor) — в стиле Lucide.
  var ICON_PATHS = {
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.2 1.8M10 2.5h4M12 2.5V6M18.6 6.4l1.4-1.4"/>',
    play: '<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.8-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.3-2.4 3.7M12 17h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    today: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M8.5 13l2.5 2.5 4.5-5"/>',
    chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  };

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[name] + '</svg>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function humanDate(iso) {
    return +iso.slice(8, 10) + ' ' + MONTHS_GEN[+iso.slice(5, 7) - 1];
  }

  // Вибрация: kind — 'light' | 'medium' | 'heavy' | 'success'; учитывает настройку.
  function buzz(kind) {
    if (!prefs.vibe) return;
    try {
      if (kind === 'success') tg && tg.HapticFeedback.notificationOccurred('success');
      else tg && tg.HapticFeedback.impactOccurred(kind);
    } catch (e) {}
  }

  function haptic() {
    buzz('light');
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
      if (first) ui.selDay = s.today.date;
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
    document.getElementById('retry').onclick = function () { root.innerHTML = skeletonHtml(); load(); };
  }

  function skeletonHtml() {
    return '<div class="skel"><i class="s-h1"></i><i class="s-sub"></i><i class="s-card"></i><i class="s-row"></i><i class="s-row"></i><i class="s-row"></i><i class="s-row short"></i></div>';
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Праздник, когда всё ЛФК за день закрыто: вибрация и лёгкое конфетти (без него при «уменьшить движение»).
  function celebrate() {
    buzz('success');
    if (reducedMotion()) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var palette = [colors.lfk, colors.kb, colors.run, colors.ddx, colors.tennis];
    for (var i = 0; i < 28; i++) {
      var p = document.createElement('i');
      p.style.left = Math.round(Math.random() * 100) + '%';
      p.style.background = palette[i % palette.length];
      p.style.animationDelay = Math.round(Math.random() * 250) + 'ms';
      p.style.transform = 'rotate(' + Math.round(Math.random() * 360) + 'deg)';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 1800);
  }

  // Отметки идут в очередь: быстрые нажатия подряд не теряются, а сервер получает их по порядку.
  var markChain = Promise.resolve();
  var pendingMarks = 0;

  function mark(item, value, confirm, timed) {
    var dayKey = ui.day;
    var date = state[dayKey].date;
    haptic();
    ui.popItem = value ? item : null;
    // Оптимистично показываем галочку сразу.
    state[dayKey].list.forEach(function (x) { if (x.item === item) { x.done = value; if (!value) x.timed = false; } });
    render();
    pendingMarks++;
    markChain = markChain.then(function () {
      return apiCall({ action: 'mark', date: date, item: item, value: value, confirm: !!confirm, timed: !!timed, month: ui.month });
    }).then(function (r) {
      pendingMarks--;
      if (r.needsConfirm) {
        state[dayKey].list.forEach(function (x) { if (x.item === item) x.done = !value; });
        render();
        confirmBox('Сегодня по плану отдых для тяги и упора. Точно записать?', function (ok) { if (ok) mark(item, value, true, timed); });
        return;
      }
      if (r.error) throw new Error(r.error === 'bad_date' ? 'Отметить можно только сегодня или вчера' : r.error);
      // Состояние с сервера применяем, когда очередь пуста, — иначе оно откатит ещё не сохранённые отметки.
      if (!pendingMarks) { state = r.state; render(); }
    }).catch(function (err) {
      pendingMarks = Math.max(0, pendingMarks - 1);
      popup('Не сохранилось', (err && err.message) || 'Попробуй ещё раз');
      load();
    });
  }

  // Плашка внизу: «Отмечено · Отменить» / «Отметка снята · Вернуть» — на случай случайного нажатия.
  var toastTimer = null;
  function toast(text, actionLabel, onAction) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = '<span>' + esc(text) + '</span>' + (actionLabel ? '<button>' + esc(actionLabel) + '</button>' : '');
    el.className = 'show';
    var btn = el.querySelector('button');
    if (btn) btn.onclick = function () { hideToast(); onAction(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    var el = document.getElementById('toast');
    if (el) el.className = '';
  }

  function toggleWithUndo(item) {
    var x = state[ui.day].list.filter(function (y) { return y.item === item; })[0];
    if (!x) return;
    var wasDone = x.done;
    var wasTimed = !!x.timed;
    var dayKey = ui.day;
    mark(item, !wasDone);
    toast((wasDone ? 'Отметка снята: ' : 'Отмечено: ') + x.label, wasDone ? 'Вернуть' : 'Отменить', function () {
      var back = ui.day;
      ui.day = dayKey; // откат — за тот же день, даже если переключились
      mark(item, wasDone, true, wasDone && wasTimed);
      ui.day = back;
      render();
    });
  }

  // Если приложение пролежало в фоне до следующего дня — перечитываем данные, иначе отметки уйдут не в тот день.
  function nowMs() {
    return window.LfkTest ? LfkTest.nowMs() : Date.now();
  }

  function refreshIfNewDay() {
    if (state && !pendingMarks && LfkCalendar.todayMsk(nowMs()) !== state.today.date) {
      ui.day = 'today';
      ui.selDay = null;
      ui.month = null;
      load().then(function () { if (state) ui.selDay = state.today.date; render(); });
    }
  }

  // --- экраны

  function tagsHtml(tags) {
    return (tags || []).map(function (t) {
      var kind = t === 'отдых' || /хорошо|отлично/.test(t) ? ' rest' : /^этап/.test(t) ? ' phase' : '';
      return '<i class="tag' + kind + '">' + esc(t) + '</i>';
    }).join('');
  }

  // --- режим тестирования

  function renderTestBar() {
    var off = LfkTest.dayOffset();
    var d = state && state.today ? humanDate(state.today.date) : '';
    return '<div class="testbar" role="status"><div class="tb-l"><b>ТЕСТ</b><small>не сохраняется' + (off ? ' · ' + (off > 0 ? '+' : '') + off + ' дн.' : '') + '</small></div>' +
      '<button data-test="back" aria-label="Предыдущий день">‹</button><span class="tb-d">' + esc(d) + '</span><button data-test="fwd" aria-label="Следующий день">›</button>' +
      '<button class="tb-t" data-test="reset">Сброс</button><button class="tb-t exit" data-test="exit">Выйти</button></div>';
  }

  function enterTest() {
    ui.sheet = null;
    session = null; flow = null; overlayOpen = false;
    root.innerHTML = skeletonHtml();
    LfkTest.enter(function () {
      return apiCallReal({ action: 'snapshot' }).then(function (r) {
        if (!r || !r.snapshot) throw new Error((r && r.error) || 'нет данных');
        return r.snapshot;
      });
    }, window.LFK_CONFIG.version).then(function () {
      ui.tab = 'today'; ui.day = 'today'; ui.month = null; ui.selDay = null; state = null;
      return load();
    }).then(function () { toast('Тестовый режим: меняется только копия данных'); })
      .catch(function (e) { LfkTest.exit(); popup('Тестовый режим', 'Не удалось начать тест: ' + e.message); state = null; load(); });
  }

  function exitTest() {
    LfkTest.exit();
    session = null; flow = null; overlayOpen = false; report = null; renderReport();
    ui.month = null; ui.selDay = null; ui.sheet = null; ui.day = 'today';
    state = null;
    root.innerHTML = skeletonHtml();
    load().then(function () { toast('Вышел из теста — снова настоящие данные'); });
  }

  function testAction(act) {
    if (act === 'exit') return exitTest();
    if (act === 'reset') LfkTest.reset();
    if (act === 'fwd') LfkTest.shiftDays(1);
    if (act === 'back') LfkTest.shiftDays(-1);
    ui.month = null; ui.selDay = null; ui.day = 'today';
    state = state; // перечитываем состояние из песочницы
    load().then(function () { ui.selDay = state.today.date; render(); });
  }

  // --- планы на спорт

  var WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function plansFor(item) {
    return (state.plans || []).filter(function (p) { return p.item === item; });
  }

  // «19:30» для сегодня, «завтра 19:30», «пт 23 окт, 19:30» — для остальных.
  function planWhen(p, withDate) {
    var t = fmtMin(p.at);
    if (p.date === state.today.date) return t;
    if (p.date === state.yesterday.date) return 'вчера ' + t;
    var d = new Date(Date.UTC(+p.date.slice(0, 4), +p.date.slice(5, 7) - 1, +p.date.slice(8, 10)));
    var tomorrow = new Date(Date.UTC(+state.today.date.slice(0, 4), +state.today.date.slice(5, 7) - 1, +state.today.date.slice(8, 10) + 1));
    if (d.getTime() === tomorrow.getTime()) return 'завтра ' + t;
    return WD_SHORT[d.getUTCDay()] + ' ' + +p.date.slice(8, 10) + ' ' + MONTHS_SHORT[+p.date.slice(5, 7) - 1] + (withDate === false ? '' : ', ' + t);
  }

  function planTagHtml(item) {
    var next = plansFor(item)[0];
    return next ? '<i class="tag phase plan">' + icon('clock') + 'план: ' + esc(planWhen(next)) + '</i>' : '';
  }

  // Московское время «сейчас» в минутах от полуночи (сервер ждёт именно его).
  function mskMinutes() {
    var n = new Date(nowMs() + 3 * 3600000);
    return n.getUTCHours() * 60 + n.getUTCMinutes();
  }

  function nextQuarter() {
    return Math.min(1425, Math.max(360, Math.ceil((mskMinutes() + 45) / 15) * 15));
  }

  function openSportSheet(item) {
    ui.planDate = state.today.date;
    ui.planAt = nextQuarter();
    // Поздно вечером на сегодня уже не поставить — по умолчанию предлагаем завтра утром.
    if (mskMinutes() + 45 > 1425) {
      ui.planDate = planDay(1);
      ui.planAt = 9 * 60;
    }
    ui.sheet = 'sport:' + item;
    render();
  }

  function planDay(delta) {
    var d = new Date(Date.UTC(+state.today.date.slice(0, 4), +state.today.date.slice(5, 7) - 1, +state.today.date.slice(8, 10) + delta));
    return d.toISOString().slice(0, 10);
  }

  function addPlanFor(item, date, at) {
    apiCall({ action: 'plan', item: item, date: date, at: at }).then(function (r) {
      if (!r || !r.ok) {
        var msg = r && r.error === 'bad_time' ? 'Это время уже прошло или вне диапазона 6:00–23:45.' : r && r.error === 'bad_date' ? 'Дату можно выбрать от сегодня и на 60 дней вперёд.' : 'Не удалось запланировать.';
        popup('Планирование', msg);
        return;
      }
      state.plans = (state.plans || []).filter(function (p) { return p.id !== r.plan.id && !(p.item === item && p.date === date); }).concat([r.plan])
        .sort(function (a, b) { return a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1; });
      ui.sheet = null;
      render();
      var label = LABELS[item];
      toast('Запланировано: ' + label + ', ' + planWhen(r.plan), 'Отменить', function () { removePlanById(r.plan.id); });
    }).catch(function () { popup('Планирование', 'Не получилось сохранить. Попробуй ещё раз.'); });
  }

  function removePlanById(id) {
    var prev = state.plans;
    state.plans = (state.plans || []).filter(function (p) { return p.id !== id; });
    render();
    apiCall({ action: 'unplan', id: id }).catch(function () { state.plans = prev; render(); popup('Планирование', 'Не получилось отменить план.'); });
  }

  function renderRow(x) {
    var hint = LfkHints.hintFor(x.item, state.pullPhase);
    var canTime = ui.day === 'today' && LfkSession.planFor(x.item, state.pullPhase, prefs) && !x.timed;
    var dose = x.item === 'stretch' ? '10 × 5 с, отдых ' + prefs.stretchRestSec + ' с' : x.dose;
    var running = session && session.item === x.item && session.phase !== 'done';
    var slim = !dose; // без дозировки — название и метка в одной строке
    var html = '<div class="row ' + (x.done ? 'done ' : '') + (slim ? 'slim ' : '') + (ui.popItem === x.item && x.done ? 'pop ' : '') + esc(x.status) + '">' +
      '<button class="ex" data-item="' + esc(x.item) + '" data-group="' + esc(x.group) + '" data-done="' + (x.done ? 1 : 0) + '" aria-pressed="' + !!x.done + '" aria-label="' +
        esc(x.label + ': ' + (x.done ? (x.timed ? 'сделано с таймером' : 'сделано') : 'не сделано') + (dose ? ', ' + dose : '') + (x.tags && x.tags.length ? ', ' + x.tags.join(', ') : '')) + '">' +
      '<span class="chk">' + (x.done ? icon(x.timed ? 'timer' : 'check') : '') + '</span>' +
      '<span class="txt' + (slim ? ' inline' : '') + '"><span class="name">' + esc(x.label) + '</span>' +
      (dose ? '<span class="dose">' + esc(dose) + '</span>' : '') +
      '<span class="tags">' + tagsHtml(x.tags) + planTagHtml(x.item) + '</span></span></button>' +
      '<span class="acts">' +
      (canTime ? '<button class="start' + (running ? ' running' : '') + '" data-start="' + esc(x.item) + '" aria-label="' + esc('Начать с таймером: ' + x.label) + '">' +
        (running ? session.completed + '/' + session.plan.sets : icon('play', 'fill')) + '</button>' : '') +
      (hint ? '<button class="info' + (ui.hint === x.item ? ' on' : '') + '" data-hint="' + esc(x.item) + '" aria-label="' + esc('Как делать: ' + x.label) + '" aria-expanded="' + (ui.hint === x.item) + '">' + icon('help') + '</button>' : '') +
      '</span></div>';
    if (hint && ui.hint === x.item) html += renderHint(hint);
    return html;
  }

  // Карточка «Сейчас: ЛФК» — одна кнопка проводит по всем несделанным упражнениям подряд.
  function renderHero(v) {
    if (ui.day !== 'today') return '';
    if (session && session.phase !== 'done' && !overlayOpen) {
      return '<div class="hero"><div class="h-txt"><span class="h-kicker">Не закончено</span><b>' + esc(LABELS[session.item]) + '</b>' +
        '<small>сделано ' + session.completed + ' из ' + session.plan.sets + '</small></div>' +
        '<button class="btn hero-btn" id="resume-flow">' + icon('play', 'fill') + 'Продолжить</button></div>';
    }
    var queue = LfkSession.flowQueue(v.list);
    if (!queue.length) return '';
    var sec = queue.reduce(function (n, it) { return n + LfkSession.estimateSec(LfkSession.planFor(it, state.pullPhase, prefs)); }, 0);
    var mins = Math.max(1, Math.round(sec / 60 + queue.length * 0.5)); // плюс переходы между упражнениями
    return '<div class="hero"><div class="h-txt"><span class="h-kicker">Сейчас</span><b>ЛФК · ~' + mins + ' мин</b>' +
      '<small>' + esc(queue.map(function (it) { return LABELS[it]; }).join(' · ')) + '</small></div>' +
      '<button class="btn hero-btn" id="start-flow">' + icon('play', 'fill') + 'Начать</button></div>';
  }

  function renderToday() {
    var v = state[ui.day];
    var lfk = v.list.filter(function (x) { return x.group === 'lfk'; });
    var due = lfk.filter(function (x) { return x.status === 'required' || x.done; });
    var doneN = due.filter(function (x) { return x.done; }).length;
    var allDone = doneN === due.length && due.length > 0;
    var html = '<div class="head"><h1>' + esc(v.weekdayName) + ', ' + humanDate(v.date) + '</h1><div class="head-row">' +
      '<div class="sum">ЛФК: <b class="num">' + doneN + '</b> из <b class="num">' + due.length + '</b>' + (allDone ? ' — всё сделано 🎉' : '') + '</div>' +
      '<div class="seg"><button data-day="today" class="' + (ui.day === 'today' ? 'on' : '') + '">Сегодня</button>' +
      '<button data-day="yesterday" class="' + (ui.day === 'yesterday' ? 'on' : '') + '">Вчера</button></div></div></div>';

    html += renderHero(v);

    // День отдыха от тяги и упора — одной строкой; по нажатию раскрывается, если всё же хочется отметить.
    var pull = lfk.filter(function (x) { return x.item === 'pull'; })[0];
    var push = lfk.filter(function (x) { return x.item === 'push'; })[0];
    var restDay = pull && push && pull.status === 'rest' && push.status === 'rest' && !pull.done && !push.done;
    html += '<div class="grp">ЛФК</div>' + lfk.map(function (x) {
      if (restDay && !ui.showRest && (x.item === 'pull' || x.item === 'push')) {
        return x.item === 'pull'
          ? '<button class="row slim rest-row" id="show-rest" aria-label="Тяга и упор — день отдыха. Показать упражнения">' +
            '<span class="chk rest-ic">' + icon('check') + '</span><span class="txt inline"><span class="name">Тяга и упор — отдых</span>' +
            '<span class="tags"><i class="tag rest">следующее занятие завтра</i></span></span></button>'
          : '';
      }
      return renderRow(x);
    }).join('');
    html += '<div class="grp">Спорт</div>' + v.list.filter(function (x) { return x.group === 'sport'; }).map(renderRow).join('');
    if (ui.day === 'yesterday') html += '<div class="note-small">За вчера — только ручные отметки, без таймера.</div>';

    if (ui.day === 'today') {
      if (wasAllDone === false && allDone) setTimeout(celebrate, 120);
      wasAllDone = allDone;
    }
    return html;
  }

  function renderHint(h) {
    return '<div class="hint-box"><b>' + esc(h.title) + '</b><ol>' +
      h.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      h.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') +
      '<p class="muted">' + esc(LfkHints.COURSE_NOTE) + '</p></div>';
  }

  var MILESTONES = [[3, '3 дня'], [7, 'неделя'], [14, '2 нед.'], [30, 'месяц'], [50, '50 дн.'], [92, 'финиш']];

  function cheer(p) {
    if (!p.streak) return 'Начнём серию сегодня — одно занятие, и день засчитан.';
    var next = MILESTONES.filter(function (m) { return m[0] > p.streak; })[0];
    if (!next) return 'Весь курс пройден без пропусков — это мощно!';
    var left = next[0] - p.streak;
    return 'Отлично держишь ритм! Ещё ' + left + ' ' + (left === 1 ? 'день' : left < 5 ? 'дня' : 'дней') + ' до «' + next[1] + '».';
  }

  function dayWord(n) {
    return n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней';
  }

  var WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  function weekdayName(iso) {
    return WEEKDAYS[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()];
  }

  function statCell(label, dotCls, value, sub) {
    return '<div class="stat"><span class="lbl">' + (dotCls === 'timer' ? icon('timer') : '<i class="dot ' + dotCls + '"></i>') + label + '</span>' +
      '<b>' + value + '</b><small>' + esc(sub) + '</small></div>';
  }

  function renderBanner(p) {
    var pct = Math.min(100, Math.round((p.daysDone / p.daysTotal) * 100));
    var runVal = p.week.run >= 2 ? String(p.week.run) : p.week.run + '/1';
    var runSub = p.week.run >= 2 ? 'отлично' : p.runWeeks > 1 ? p.runWeeks + ' нед. подряд' : 'на этой неделе';
    return '<div class="banner">' +
      '<div class="b-top"><div class="flame' + (p.streak ? '' : ' off') + '">' + icon('flame') + '</div>' +
      '<div class="b-main"><div class="b-num">' + p.streak + '</div><div class="b-cap">' + dayWord(p.streak) + ' ЛФК без пропусков</div></div>' +
      '<div class="b-best">рекорд<b>' + p.bestStreak + '</b></div></div>' +
      '<div class="b-cheer">' + esc(cheer(p)) + '</div>' +
      '<div class="b-stats">' +
      statCell('Гиря', 'kb', p.week.kettlebell + '/3', p.kbWeeks > 1 ? p.kbWeeks + ' нед. подряд' : 'на этой неделе') +
      statCell('Бег', 'run', runVal, runSub) +
      statCell('Таймер', 'timer', p.timed && p.timed.total ? p.timed.timed + '/' + p.timed.total : '—', 'занятий ЛФК') +
      '</div>' +
      '<div class="b-finish"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="b-fl"><span>до финиша ' + p.daysLeft + ' дн.</span><span>' + p.daysDone + ' из ' + p.daysTotal + '</span></div></div></div>';
  }

  // Секция «Что было в этот день» под календарём.
  var DETAIL_ITEMS = [
    ['stretch', 'lfk'], ['pull', 'lfk'], ['push', 'lfk'], ['kettlebell', 'kb'], ['run', 'run'], ['ddx', 'ddx'], ['tennis', 'tennis'],
  ];

  function renderDayDetails(p) {
    var iso = ui.selDay;
    var cal = iso && (state.calDays[iso] || (state.course && state.course[iso]));
    if (!iso || !cal) return '<div class="details empty" id="details">Нажми на день в календаре — покажу, что в нём было.</div>';
    var head = weekdayName(iso) + ', ' + humanDate(iso);
    if (cal.future) {
      var fut = (state.plans || []).filter(function (p) { return p.date === iso; }).map(function (p) {
        return '<div class="d-row plan"><i class="dot ' + ({ kettlebell: 'kb', run: 'run', ddx: 'ddx', tennis: 'tennis' }[p.item]) + '"></i><span>' + esc(LABELS[p.item]) + ' — запланировано</span><b class="num">' + fmtMin(p.at) + '</b></div>';
      }).join('');
      return '<div class="details" id="details"><div class="d-head"><b>' + esc(head) + '</b><span class="d-tag future">впереди</span></div>' + (fut || '<div class="d-empty">Этот день ещё не наступил.</div>') + '</div>';
    }

    var d = state.days[iso];
    if (!d) {
      var t0 = cal.miss ? ['miss', 'есть пропуск'] : cal.p >= 1 ? ['ok', 'ЛФК выполнено'] : cal.p > 0 ? ['part', 'ЛФК частично'] : ['none', 'без ЛФК'];
      return '<div class="details" id="details"><div class="d-head"><b>' + esc(head) + '</b><span class="d-tag ' + t0[0] + '">' + t0[1] + '</span></div>' +
        '<div class="d-empty">Подробности дня — в режиме «Месяц».</div></div>';
    }
    var tag = cal.miss ? ['miss', 'есть пропуск'] : cal.p >= 1 ? ['ok', 'ЛФК выполнено'] : cal.p > 0 ? ['part', 'ЛФК частично'] : ['none', 'без ЛФК'];
    var rows = '';
    DETAIL_ITEMS.forEach(function (it) {
      var key = it[0];
      if (d.done[key]) {
        rows += '<div class="d-row"><i class="dot ' + it[1] + '"></i><span>' + esc(LABELS[key]) + '</span>' +
          (d.timed && d.timed[key] ? '<span class="d-mark" title="с таймером">' + icon('timer') + '</span>' : '<span class="d-mark">' + icon('check') + '</span>') + '</div>';
      } else if (d.misses.indexOf(key) >= 0) {
        rows += '<div class="d-row miss"><i class="dot red"></i><span>' + esc(LABELS[key]) + ' — пропущено</span><span class="d-mark">' + icon('close') + '</span></div>';
      }
    });
    if (d.plan && d.plan.pullPush === 'rest' && !d.done.pull && !d.done.push) {
      rows += '<div class="d-row rest"><i class="dot rest"></i><span>Тяга и упор — день отдыха</span></div>';
    }
    if (d.plan && d.plan.kettlebell === 'off' && !d.done.kettlebell) {
      rows += '<div class="d-row rest"><i class="dot rest"></i><span>Гиря не нужна — день DDX</span></div>';
    }
    (state.plans || []).filter(function (p) { return p.date === iso; }).forEach(function (p) {
      rows += '<div class="d-row plan"><i class="dot ' + ({ kettlebell: 'kb', run: 'run', ddx: 'ddx', tennis: 'tennis' }[p.item]) + '"></i><span>' + esc(LABELS[p.item]) + ' — запланировано</span><b class="num">' + fmtMin(p.at) + '</b></div>';
    });
    if (typeof d.pain === 'number') {
      rows += '<div class="d-row"><i class="dot pain" style="--pain:' + painColor(d.pain) + '"></i><span>Боль в локте</span><b class="num">' + d.pain + '/10</b></div>';
    }
    return '<div class="details" id="details"><div class="d-head"><b>' + esc(head) + '</b><span class="d-tag ' + tag[0] + '">' + tag[1] + '</span></div>' +
      (rows || '<div class="d-empty">В этот день ничего не отмечено.</div>') + '</div>';
  }

  // Описание дня для экранного чтеца: дата, статус ЛФК и активности.
  function dayAria(iso, d) {
    var parts = [humanDate(iso)];
    if (d.future) parts.push('впереди');
    else if (d.miss) parts.push('есть пропуск ЛФК');
    else if (d.p >= 1) parts.push('ЛФК выполнено');
    else if (d.p > 0) parts.push('ЛФК частично');
    if (d.k) parts.push('гиря');
    if (d.r) parts.push('бег');
    if (d.d) parts.push('DDX');
    if (d.t) parts.push('теннис');
    if (d.today) parts.push('сегодня');
    return parts.join(', ');
  }

  // Весь курс (11.10 – 11.01): клетка на день, по неделям; цвет — по ЛФК.
  function renderCourse() {
    var html = '<div class="course"><div class="c-row c-wd"><span></span>' + ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    LfkCalendar.courseGrid('2026-10-11', '2027-01-11').forEach(function (w) {
      html += '<div class="c-row"><span class="c-m">' + w.month + '</span>' + w.days.map(function (iso) {
        if (!iso) return '<span class="c-cell empty"></span>';
        var d = (state.course && state.course[iso]) || {};
        var cls = d.future ? 'fut' : d.miss ? 'miss' : d.fill ? 'full' : d.p >= 1 ? 'ok' : d.p > 0 ? 'part' : 'none';
        return '<button class="c-cell ' + cls + (d.today ? ' today' : '') + (ui.selDay === iso ? ' sel' : '') + '" data-cday="' + iso + '" aria-label="' + esc(dayAria(iso, d)) + '"></button>';
      }).join('') + '</div>';
    });
    var vals = Object.keys(state.course || {}).map(function (k) { return state.course[k]; });
    var past = vals.filter(function (d) { return !d.future; }).length;
    html += '</div><div class="legend"><span><i class="sq full"></i>всё ЛФК</span><span><i class="sq ok"></i>выполнено</span><span><i class="sq part"></i>частично</span><span><i class="sq miss"></i>пропуск</span>' +
      '<span>прошло ' + past + ' из ' + vals.length + '</span></div>';
    return html;
  }

  // Цвет оценки боли: 0–3 зелёный, 4–6 оранжевый, 7–10 красный.
  function painColor(v) {
    return v <= 3 ? 'var(--green)' : v <= 6 ? 'var(--amber)' : 'var(--red)';
  }

  function renderProgress() {
    var p = state.progress;
    var html = renderBanner(p);

    html += '<div class="badges">' + MILESTONES.map(function (m) {
      return '<span class="badge' + (p.bestStreak >= m[0] ? ' on' : '') + '">' + m[1] + '</span>';
    }).join('') + '</div>';

    var ym = ui.month;
    html += '<div class="cal-switch"><div class="seg wide"><button data-calview="month" class="' + (ui.calView === 'month' ? 'on' : '') + '">Месяц</button>' +
      '<button data-calview="course" class="' + (ui.calView === 'course' ? 'on' : '') + '">Весь курс</button></div></div>';
    if (ui.calView === 'course') {
      html += renderCourse();
    } else {
      html += '<div class="cal-head"><button id="prev" aria-label="Предыдущий месяц">‹</button><span>' + MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) + '</span><button id="next" aria-label="Следующий месяц">›</button></div>';
      html += '<div class="cal">' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(function (d) { return '<div class="wd">' + d + '</div>'; }).join('');
      LfkCalendar.monthGrid(+ym.slice(0, 4), +ym.slice(5, 7)).forEach(function (week) {
        week.forEach(function (iso, i) {
          if (!iso) { html += '<div class="cell"></div>'; return; }
          var d = state.calDays[iso] || {};
          var nextIso = week[i + 1];
          var link = d.chain && nextIso && state.calDays[nextIso] && state.calDays[nextIso].chain;
          var cls = 'ring' + (d.fill && !d.miss ? ' full' : '') + (d.miss ? ' miss' : '') + (d.today ? ' today' : '') + (d.future ? ' future' : '');
          html += '<button class="cell' + (link ? ' link' : '') + (ui.selDay === iso ? ' sel' : '') + '" data-day="' + iso + '" aria-pressed="' + (ui.selDay === iso) + '" aria-label="' + esc(dayAria(iso, d)) + '">' +
            '<span class="' + cls + '" style="--p:' + Math.round((d.p || 0) * 100) + '%">' + +iso.slice(8, 10) + '</span>' +
            '<span class="dots">' + (d.k ? '<b class="k"></b>' : '') + (d.r ? '<b class="r"></b>' : '') + (d.d ? '<b class="d"></b>' : '') + (d.t ? '<b class="t"></b>' : '') + '</span></button>';
        });
      });
      html += '</div><div class="legend"><span><i class="dot lfk"></i>ЛФК</span><span><i class="dot kb"></i>гиря</span><span><i class="dot run"></i>бег</span><span><i class="dot ddx"></i>DDX</span><span><i class="dot tennis"></i>теннис</span><span><i class="dot red"></i>пропуск</span></div>';
    }

    html += renderDayDetails(p);
    html += '<button class="btn ghost report-btn" id="open-report">' + icon('doc') + 'Отчёт для врача</button>';

    if (p.misses.length) {
      html += '<div class="misses"><b>Пропуски</b>' + p.misses.slice(-10).reverse().map(function (m) {
        return '<div>' + humanDate(m.date) + ' — ' + m.items.map(function (i) { return LABELS[i]; }).join(', ') + '</div>';
      }).join('') + '</div>';
    }
    return html;
  }

  function fmtMin(m) {
    return Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60);
  }

  function segHtml(key, options, current, label) {
    return '<span class="segs">' + options.map(function (o) {
      return '<button class="sg' + (o.v === current ? ' on' : '') + '" data-pref="' + key + '" data-val="' + esc(String(o.v)) + '">' + esc(o.t) + '</button>';
    }).join('') + '</span>';
  }

  function timeInput(path, minutes) {
    return '<input type="time" class="time" data-time="' + path + '" value="' + (minutes < 600 ? '0' : '') + fmtMin(minutes) + '" step="900">';
  }

  function toggleHtml(key, on) {
    return '<button class="sw-toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-toggle="' + key + '"><i></i></button>';
  }

  // Настройки — сгруппированный список в стиле iOS; изменения — в листе снизу.
  var THEME_NAMES = { auto: 'Как в Telegram', light: 'Светлая', dark: 'Тёмная' };
  var COLOR_ROWS = [['lfk', 'ЛФК'], ['kb', 'Комплекс с гирей'], ['run', 'Бег'], ['ddx', 'DDX Атлетика'], ['tennis', 'Теннис']];

  function liLink(key, title, value, sub) {
    return '<button class="li" data-sheet="' + key + '"><span class="li-l">' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
      '<span class="li-v">' + value + '</span>' + icon('chevron', 'chev') + '</button>';
  }

  function liToggle(key, title) {
    return '<div class="li"><span class="li-l">' + esc(title) + '</span>' + toggleHtml(key, prefs[key]) + '</div>';
  }

  function range(w) {
    return fmtMin(w.from) + '–' + fmtMin(w.to);
  }

  function renderSettings() {
    var st = state.settings || DEFAULT_REMINDERS;
    var swatches = COLOR_ROWS.map(function (r) { return '<i class="sw-mini" style="background:' + colors[r[0]] + '"></i>'; }).join('');
    return '<div class="head"><h1>Настройки</h1></div>' +
      '<div class="grp">Таймер</div><div class="group">' +
      liToggle('sound', 'Звук') + liToggle('vibe', 'Вибрация') +
      liLink('restSec', 'Отдых между подходами', prefs.restSec + ' с', 'тяга и упор') +
      liLink('stretchRestSec', 'Отдых в растяжке', prefs.stretchRestSec + ' с', 'между повторами') + '</div>' +
      '<div class="grp">Напоминания бота</div><div class="group">' +
      liLink('lfk', 'ЛФК', range(st.lfk), 'растяжка, тяга, упор') +
      liLink('stretchAt', 'Растяжка днём', fmtMin(st.stretchAt)) +
      liLink('kb', 'Комплекс с гирей', range(st.kb)) +
      liLink('run', 'Бег', range(st.run), 'пока на неделе нет пробежки') +
      liLink('ddxAt', 'DDX: записаться', fmtMin(st.ddxAt), 'по воскресеньям') + '</div>' +
      '<div class="grp">Внешний вид</div><div class="group">' +
      liLink('theme', 'Тема', THEME_NAMES[prefs.theme]) +
      liLink('colors', 'Цвета активностей', '<span class="sw-row">' + swatches + '</span>') + '</div>' +
      '<div class="grp">Проверка</div><div class="group">' +
      liLink('testmode', 'Режим тестирования', LfkTest.active ? 'включён' : '', 'жми что угодно — данные не сохранятся') + '</div>';
  }

  // Содержимое листа: [заголовок, html].
  function sheetContent(key) {
    var st = state.settings || DEFAULT_REMINDERS;
    var opt = function (arr, unit) { return arr.map(function (v) { return { v: v, t: v + unit }; }); };
    var win = function (k, title, note) {
      return [title, '<div class="range big">' + timeInput(k + '.from', st[k].from) + '<em>—</em>' + timeInput(k + '.to', st[k].to) + '</div><p class="sheet-note">' + note + '</p>'];
    };
    if (/^sport:/.test(key)) return sportSheet(key.slice(6));
    switch (key) {
      case 'restSec': return ['Отдых между подходами', segHtml('restSec', opt(LfkSettings.REST_OPTIONS, ' с'), prefs.restSec) + '<p class="sheet-note">Для тяги резинки и упора на пальцы.</p>'];
      case 'stretchRestSec': return ['Отдых в растяжке', segHtml('stretchRestSec', opt(LfkSettings.STRETCH_REST_OPTIONS, ' с'), prefs.stretchRestSec) + '<p class="sheet-note">Пауза между 10 повторами растяжки нерва (каждый — 5 секунд).</p>'];
      case 'lfk': return win('lfk', 'ЛФК — когда напоминать', 'Напомню в начале окна, потом каждый час и за 15 минут до конца. Окно — с 6:00 до 23:45.');
      case 'kb': return win('kb', 'Комплекс с гирей', 'Только в дни, когда гиря положена. Если окно совпадает с ЛФК — одно общее сообщение.');
      case 'run': return win('run', 'Бег', 'Пока на неделе нет пробежки: в начале окна и за 15 минут до конца; в воскресенье — «последний день».');
      case 'stretchAt': return ['Растяжка днём', '<div class="range big">' + timeInput('stretchAt', st.stretchAt) + '</div><p class="sheet-note">Одно напоминание, если растяжка ещё не сделана.</p>'];
      case 'ddxAt': return ['DDX: записаться', '<div class="range big">' + timeInput('ddxAt', st.ddxAt) + '</div><p class="sheet-note">Каждое воскресенье — записаться на занятие в понедельник.</p>'];
      case 'theme': return ['Тема', segHtml('theme', [{ v: 'auto', t: 'Как в Telegram' }, { v: 'light', t: 'Светлая' }, { v: 'dark', t: 'Тёмная' }], prefs.theme)];
      case 'testmode': return ['Режим тестирования',
        '<p class="sheet-note first">Откроется <b>копия твоих данных</b> прямо на телефоне. Нажимай любые кнопки: отметки, таймеры, боль, планы, настройки, отчёт — ничего не сохранится в таблице, бот ничего не пришлёт.</p>' +
        '<ul class="test-list"><li>Вверху — жёлтая полоса, чтобы не перепутать.</li><li>Кнопками «‹ ›» можно перематывать дни и смотреть серии и пропуски.</li><li>«Выйти» или закрытие приложения — копия исчезает, всё как прежде.</li></ul>' +
        '<p class="sheet-note">Сообщения самого бота (напоминания, «Через 30 мин») в тесте не проверяются.</p>' +
        '<button class="btn" id="enter-test">Начать тест</button>'];
      case 'colors': return ['Цвета активностей', COLOR_ROWS.map(function (r) {
        return '<div class="color-row"><span>' + r[1] + '</span><span class="swatches">' + LfkSettings.PALETTE.map(function (c) {
          return '<button class="sw' + (colors[r[0]] === c ? ' on' : '') + '" style="background:' + c + '" data-color="' + c + '" data-key="' + r[0] + '" aria-label="' + esc(r[1] + ': ' + c) + '"></button>';
        }).join('') + '</span></div>';
      }).join('') + '<button class="btn ghost" id="reset-colors">Сбросить цвета</button>'];
    }
    return ['', ''];
  }

  function sportSheet(item) {
    var x = state[ui.day].list.filter(function (y) { return y.item === item; })[0] || { label: LABELS[item], done: false };
    var plans = plansFor(item);
    var today = state.today.date;
    var maxDate = planDay(60);
    var plansHtml = plans.length ? '<div class="plan-list">' + plans.map(function (p) {
      return '<div class="plan-item">' + icon('clock') + '<span>' + esc(planWhen(p)) + '</span><button data-unplan="' + esc(p.id) + '" aria-label="' + esc('Отменить план: ' + planWhen(p)) + '">Отменить</button></div>';
    }).join('') + '</div>' : '';
    var primary = x.done
      ? '<button class="btn ghost" data-sport-toggle="' + item + '">Снять отметку «выполнено»</button>'
      : '<button class="btn" data-sport-toggle="' + item + '">' + icon('check') + 'Выполнено</button>';
    return [x.label,
      primary +
      '<div class="grp sheet-grp">Запланировать</div>' + plansHtml +
      '<div class="plan-form"><label><span>Дата</span><input type="date" class="time" id="plan-date" min="' + today + '" max="' + maxDate + '" value="' + ui.planDate + '"></label>' +
      '<label><span>Время</span><input type="time" class="time" id="plan-time" step="900" min="06:00" max="23:45" value="' + (ui.planAt < 600 ? '0' : '') + fmtMin(ui.planAt) + '"></label></div>' +
      '<button class="btn ghost plan-save" data-plan-save="' + item + '">' + icon('clock') + 'Запланировать</button>' +
      '<p class="sheet-note">В назначенное время бот напомнит. Если до этого отметить «выполнено», план снимется сам.</p>'];
  }

  function renderSheet() {
    if (!ui.sheet) return '';
    var c = sheetContent(ui.sheet);
    return '<div class="sheet-back" data-close-sheet></div><div class="sheet" role="dialog" aria-label="' + esc(c[0]) + '">' +
      '<div class="sheet-grip"></div><div class="sheet-head"><b>' + esc(c[0]) + '</b><button class="sheet-done" data-close-sheet>Готово</button></div>' + c[1] + '</div>';
  }

  function toMinutes(v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  // Время напоминаний хранится на сервере (бот должен знать расписание, когда приложение закрыто).
  function saveReminderTime(path, minutes) {
    var cur = state.settings || DEFAULT_REMINDERS;
    var next = JSON.parse(JSON.stringify(cur));
    var parts = path.split('.');
    if (parts.length === 1) next[parts[0]] = minutes;
    else next[parts[0]][parts[1]] = minutes;
    var w = parts.length === 1 ? null : next[parts[0]];
    if (minutes === null || (w && (w.from < WINDOW_MIN_FROM || w.to > WINDOW_MAX_TO || w.to - w.from < WINDOW_MIN_LEN))) {
      popup('Некорректное время', 'Окно должно быть от 6:00 до 23:45 и не короче 30 минут.');
      render();
      return;
    }
    if (parts.length === 1 && (minutes < 360 || minutes > 1320)) {
      popup('Некорректное время', 'Это напоминание можно поставить с 6:00 до 22:00.');
      render();
      return;
    }
    state.settings = next;
    apiCall({ action: 'saveSettings', settings: next }).then(function (r) {
      if (r && r.settings) { state.settings = r.settings; render(); }
    }).catch(function () { popup('Не сохранилось', 'Не удалось сохранить время напоминаний. Попробуй ещё раз.'); load(); });
  }

  function savePref(key, val) {
    prefs[key] = val;
    prefs = LfkSettings.normalizePrefs(prefs);
    LfkSettings.savePrefs(prefs);
    if (key === 'theme') LfkSettings.applyTheme(prefs.theme);
    if (key === 'sound' && val) { initAudio(); beep(660, 150); }
    if (key === 'vibe' && val) buzz('medium');
    render();
  }

  function render() {
    var tabs = [['today', 'Сегодня', 'today'], ['progress', 'Прогресс', 'chart'], ['settings', 'Настройки', 'gear']];
    var testBar = LfkTest.active ? renderTestBar() : '';
    root.innerHTML =
      testBar + (ui.tab === 'today' ? renderToday() : ui.tab === 'progress' ? renderProgress() : renderSettings()) +
      (ui.tab === 'settings' ? '<div class="ver">Версия ' + esc(state.version) + '</div>' : '') +
      '<nav class="tabbar" role="tablist">' + tabs.map(function (t) {
        return '<button role="tab" aria-selected="' + (ui.tab === t[0]) + '" data-tab="' + t[0] + '" class="' + (ui.tab === t[0] ? 'on' : '') + '">' + icon(t[2]) + '<span>' + t[1] + '</span></button>';
      }).join('') + '</nav>' + renderSheet();
    ui.popItem = null;

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        if (ui.tab !== b.dataset.tab) haptic();
        ui.tab = b.dataset.tab;
        ui.sheet = null;
        render();
        window.scrollTo(0, 0);
      };
    });
    root.querySelectorAll('[data-sheet]').forEach(function (b) {
      b.onclick = function () { ui.sheet = b.dataset.sheet; render(); };
    });
    root.querySelectorAll('[data-close-sheet]').forEach(function (b) {
      b.onclick = function () { ui.sheet = null; render(); };
    });
    root.querySelectorAll('[data-sport-toggle]').forEach(function (b) {
      b.onclick = function () { var it = b.dataset.sportToggle; ui.sheet = null; toggleWithUndo(it); };
    });
    root.querySelectorAll('[data-unplan]').forEach(function (b) {
      b.onclick = function () { removePlanById(b.dataset.unplan); };
    });
    root.querySelectorAll('[data-plan-save]').forEach(function (b) {
      b.onclick = function () {
        var d = document.getElementById('plan-date').value;
        var m = /^(\d{1,2}):(\d{2})$/.exec(document.getElementById('plan-time').value || '');
        if (!d || !m) { popup('Планирование', 'Выбери дату и время.'); return; }
        addPlanFor(b.dataset.planSave, d, Number(m[1]) * 60 + Number(m[2]));
      };
    });
    root.querySelectorAll('[data-calview]').forEach(function (b) {
      b.onclick = function () { ui.calView = b.dataset.calview; render(); };
    });
    root.querySelectorAll('[data-cday]').forEach(function (b) {
      b.onclick = function () {
        ui.selDay = b.dataset.cday;
        render();
        var det = document.getElementById('details');
        if (det && det.scrollIntoView) det.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      };
    });
    var et = document.getElementById('enter-test');
    if (et) et.onclick = enterTest;
    root.querySelectorAll('[data-test]').forEach(function (b) {
      b.onclick = function () { testAction(b.dataset.test); };
    });
    var sf = document.getElementById('start-flow');
    if (sf) sf.onclick = startFlow;
    var rf = document.getElementById('resume-flow');
    if (rf) rf.onclick = function () { overlayOpen = true; initAudio(); afterChange([]); };
    var sr = document.getElementById('show-rest');
    if (sr) sr.onclick = function () { ui.showRest = true; render(); };
    var orp = document.getElementById('open-report');
    if (orp) orp.onclick = openReport;
    root.querySelectorAll('[data-item]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.group === 'sport') openSportSheet(b.dataset.item);
        else toggleWithUndo(b.dataset.item);
      };
    });
    root.querySelectorAll('[data-color]').forEach(function (b) {
      b.onclick = function () {
        colors[b.dataset.key] = b.dataset.color;
        LfkSettings.save(colors);
        LfkSettings.apply(colors);
        render();
      };
    });
    root.querySelectorAll('[data-pref]').forEach(function (b) {
      b.onclick = function () {
        var v = b.dataset.val;
        savePref(b.dataset.pref, /^\d+$/.test(v) ? Number(v) : v);
      };
    });
    root.querySelectorAll('[data-time]').forEach(function (b) {
      b.onchange = function () { saveReminderTime(b.dataset.time, toMinutes(b.value)); };
    });
    root.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.onclick = function () { savePref(b.dataset.toggle, !prefs[b.dataset.toggle]); };
    });
    var rc = document.getElementById('reset-colors');
    if (rc) rc.onclick = function () { colors = LfkSettings.normalize(null); LfkSettings.save(colors); LfkSettings.apply(colors); render(); };
    root.querySelectorAll('[data-start]').forEach(function (b) {
      b.onclick = function () { openSession(b.dataset.start); };
    });
    root.querySelectorAll('[data-hint]').forEach(function (b) {
      b.onclick = function () { ui.hint = ui.hint === b.dataset.hint ? null : b.dataset.hint; render(); };
    });
    root.querySelectorAll('.cal [data-day]').forEach(function (b) {
      b.onclick = function () {
        ui.selDay = b.dataset.day;
        render();
        var det = document.getElementById('details');
        var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (det && det.scrollIntoView) det.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
      };
    });
    root.querySelectorAll('.seg [data-day]').forEach(function (b) {
      b.onclick = function () { ui.day = b.dataset.day; ui.hint = null; render(); };
    });
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    if (prev) prev.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, -1); ui.selDay = null; load(); };
    if (next) next.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, 1); ui.selDay = null; load(); };
    renderOverlay();
  }

  // --- таймер подходов

  function saveSession() {
    if (window.LfkTest && LfkTest.active) return; // в тесте незавершённый таймер не сохраняем
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
    if (!audio || !prefs.sound) return;
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
      buzz('heavy');
      return;
    }
    if (ev === 'warn') {
      beep(880, 150);
      buzz('medium');
    } else {
      beep(660, 600);
      buzz('success');
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

  function openSession(item, inFlow) {
    initAudio();
    var row = state.today.list.filter(function (x) { return x.item === item; })[0];
    var begin = function (confirmed) {
      if (!session || session.item !== item) {
        var plan = LfkSession.planFor(item, state.pullPhase, prefs);
        // ?mock=1&fast=1 — короткие подходы для просмотра в браузере.
        if (window.LFK_MOCK && /[?&]fast=1/.test(location.search)) { plan.holdMs = 5000; plan.restMs = plan.restMs && 4000; }
        session = LfkSession.create(item, state.today.date, plan);
        session.confirm = !!confirmed;
        if (inFlow && flow) session.flow = { queue: flow.queue, idx: flow.idx };
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
    if (!session || session.phase === 'done') { flow = null; session = null; saveSession(); }
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
    if (act === 'flow-go') { flow.stage = 'session'; session = null; openSession(flow.queue[flow.idx], true); return; }
    if (act === 'flow-skip') return flowAdvance();
    if (act === 'pain-save') return savePain(ui.painVal);
    if (act === 'pain-skip') return finishPain();
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
      if (flow) { renderOverlay(); setTimeout(flowAdvance, 900); return; } // «Готово» и к следующему
      if ((session.item === 'pull' || session.item === 'push') && needPain()) {
        flow = { queue: [], idx: 0, stage: 'pain', solo: true };
      }
    }
    renderOverlay();
  }

  function fmt(ms) {
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  function renderOverlay() {
    var el = document.getElementById('overlay');
    if (!overlayOpen || (!session && !flow)) {
      if (el) el.remove();
      if (timerId) { clearInterval(timerId); timerId = null; }
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'overlay';
      document.body.appendChild(el);
    }
    if (flow && flow.stage !== 'session') {
      if (timerId) { clearInterval(timerId); timerId = null; }
      return renderFlowScreen(el);
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
      word = 'Готово'; big = icon('check', 'big'); sub = p.sets + ' из ' + p.sets + ' · с таймером'; tone = 'done';
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
      : 'background:radial-gradient(var(--bg) 66.5%, transparent 67%), conic-gradient(' + color + ' 0 ' + (frac * 100).toFixed(1) + '%, var(--track) 0)';

    el.className = 'tone-' + tone;
    el.innerHTML = '<div class="ov-head"><span>' + esc(LABELS[s.item]) + (flow ? '<small class="step">шаг ' + (flow.idx + 1) + ' из ' + flow.queue.length + '</small>' : '') + '</span><button data-act="close" aria-label="Закрыть">' + icon('close') + '</button></div>' +
      '<div class="sets' + (p.sets > 5 ? ' many' : '') + '">' + dots + '</div>' +
      '<div class="tring" style="' + ring + '"><span class="word">' + esc(word) + '</span><b>' + big + '</b><small>' + esc(sub) + '</small></div>' +
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

  // --- «Начать ЛФК»: проход по всем упражнениям подряд, затем оценка боли

  function startFlow() {
    var queue = LfkSession.flowQueue(state.today.list);
    if (!queue.length) return;
    initAudio();
    flow = { queue: queue, idx: 0, stage: 'between' };
    overlayOpen = true;
    render();
  }

  function needPain() {
    var list = state.today.list;
    var done = function (it) { return list.some(function (x) { return x.item === it && x.done; }); };
    return state.today.pain === null && done('pull') && done('push');
  }

  function flowAdvance() {
    session = null;
    saveSession();
    flow.idx++;
    if (flow.idx < flow.queue.length) flow.stage = 'between';
    else flow.stage = needPain() ? 'pain' : 'done';
    if (flow.stage === 'done') celebrate();
    renderOverlay();
  }

  function finishPain() {
    if (flow && flow.solo) { flow = null; session = null; saveSession(); overlayOpen = false; render(); return; }
    flow.stage = 'done';
    celebrate();
    renderOverlay();
  }

  function savePain(v) {
    state.today.pain = v; // оптимистично
    apiCall({ action: 'pain', date: state.today.date, value: v }).then(function (r) {
      if (r && r.error) throw new Error(r.error);
    }).catch(function () { popup('Не сохранилось', 'Оценку боли сохранить не удалось. Попробуй ещё раз.'); state.today.pain = null; });
    buzz('light');
    finishPain();
  }

  function renderFlowScreen(el) {
    var html = '';
    if (flow.stage === 'between') {
      var item = flow.queue[flow.idx];
      var x = state.today.list.filter(function (y) { return y.item === item; })[0] || {};
      var plan = LfkSession.planFor(item, state.pullPhase, prefs);
      var dose = item === 'stretch' ? '10 × 5 с, отдых ' + prefs.stretchRestSec + ' с' : x.dose;
      html = '<div class="ov-head"><span>ЛФК<small class="step">шаг ' + (flow.idx + 1) + ' из ' + flow.queue.length + '</small></span><button data-act="close" aria-label="Закрыть">' + icon('close') + '</button></div>' +
        '<div class="steps">' + flow.queue.map(function (it, i) { return '<i class="' + (i < flow.idx ? 'f' : i === flow.idx ? 'p' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="flow-card"><span class="h-kicker">' + (flow.idx ? 'Дальше' : 'Начинаем') + '</span><b>' + esc(LABELS[item]) + '</b>' +
        '<span class="flow-dose">' + esc(dose || '') + '</span><span class="flow-time">~' + Math.max(1, Math.round(LfkSession.estimateSec(plan) / 60)) + ' мин</span></div>' +
        '<div class="ov-actions"><button class="btn" data-act="flow-go">' + icon('play', 'fill') + 'Начать</button>' +
        '<button class="btn ghost" data-act="flow-skip">Пропустить</button><div class="ov-note">Боль — не выше 3–4 из 10</div></div>';
    } else if (flow.stage === 'pain') {
      var v = ui.painVal;
      html = '<div class="ov-head"><span>Как локоть?</span><button data-act="pain-skip" aria-label="Пропустить">' + icon('close') + '</button></div>' +
        '<div class="pain-box"><div class="pain-num num" style="color:' + painColor(v) + '">' + v + '</div><div class="pain-cap">из 10</div>' +
        '<input type="range" class="pain-range" min="0" max="10" step="1" value="' + v + '" aria-label="Боль от 0 до 10" style="--pain:' + painColor(v) + '">' +
        '<div class="pain-scale"><span>нет боли</span><span>терпимо</span><span>сильно</span></div>' +
        '<p class="sheet-note">Реабилитолог: нагрузка такая, чтобы боль была не выше 3–4. Оценка попадёт в отчёт для врача.</p></div>' +
        '<div class="ov-actions"><button class="btn" data-act="pain-save">Сохранить</button><button class="btn ghost" data-act="pain-skip">Пропустить</button></div>';
    } else {
      var lfk = state.today.list.filter(function (y) { return y.group === 'lfk' && y.done; });
      html = '<div class="ov-head"><span>ЛФК</span><button data-act="close" aria-label="Закрыть">' + icon('close') + '</button></div>' +
        '<div class="done-box"><div class="done-ic">' + icon('check', 'big') + '</div><b>ЛФК на сегодня — всё!</b>' +
        '<div class="done-list">' + lfk.map(function (y) { return '<span>' + icon(y.timed ? 'timer' : 'check') + esc(y.label) + '</span>'; }).join('') + '</div>' +
        (typeof state.today.pain === 'number' ? '<small>Боль: ' + state.today.pain + '/10</small>' : '') + '</div>' +
        '<div class="ov-actions"><button class="btn" data-act="close">Готово</button></div>';
    }
    el.className = 'tone-flow';
    el.innerHTML = html;
    el.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () { sessionAction(b.dataset.act); };
    });
    var r = el.querySelector('.pain-range');
    if (r) r.oninput = function () {
      ui.painVal = Number(r.value);
      var n = el.querySelector('.pain-num');
      n.textContent = r.value;
      n.style.color = painColor(ui.painVal);
      r.style.setProperty('--pain', painColor(ui.painVal));
      buzz('light');
    };
  }

  // --- отчёт для врача

  function openReport() {
    report = 'loading';
    renderReport();
    apiCall({ action: 'report' }).then(function (r) {
      if (!r || !r.report) throw new Error((r && r.error) || 'нет данных');
      report = r.report;
      renderReport();
    }).catch(function (e) { report = null; renderReport(); popup('Отчёт', 'Не удалось собрать отчёт: ' + e.message); });
  }

  function painChart(series) {
    if (!series.length) return '<div class="chart-empty">Оценок боли пока нет — они появятся после тяги и упора.</div>';
    var W = 320, H = 130, L = 22, R = 8, T = 8, B = 20;
    var n = series.length;
    var x = function (i) { return L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1)); };
    var y = function (v) { return T + (10 - v) * (H - T - B) / 10; };
    var pts = series.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join(' ');
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="График боли">' +
      '<rect x="' + L + '" y="' + y(4) + '" width="' + (W - L - R) + '" height="' + (y(0) - y(4)) + '" class="ok-band"/>' +
      [0, 4, 7, 10].map(function (v) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="grid"/><text x="2" y="' + (y(v) + 4) + '" class="ax">' + v + '</text>'; }).join('') +
      '<polyline points="' + pts + '" class="line"/>' +
      series.map(function (p, i) { return '<circle cx="' + x(i) + '" cy="' + y(p.value) + '" r="3.5" style="fill:' + painColor(p.value) + '"/>'; }).join('') +
      '<text x="' + L + '" y="' + (H - 4) + '" class="ax">' + humanDate(series[0].date) + '</text>' +
      (n > 1 ? '<text x="' + (W - R) + '" y="' + (H - 4) + '" class="ax end">' + humanDate(series[n - 1].date) + '</text>' : '') + '</svg>';
    return svg;
  }

  function renderReport() {
    var el = document.getElementById('report');
    if (!report) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'report'; document.body.appendChild(el); }
    if (report === 'loading') { el.innerHTML = '<div class="ov-head"><span>Отчёт для врача</span></div>' + skeletonHtml(); return; }
    var r = report;
    var row = function (k, v) { return '<div class="r-row"><span>' + k + '</span><b>' + v + '</b></div>'; };
    el.innerHTML = '<div class="ov-head"><span>Отчёт для врача<small class="step">' + humanDate(r.period.from) + ' — ' + humanDate(r.period.to) + '</small></span>' +
      '<button data-rep="close" aria-label="Закрыть">' + icon('close') + '</button></div>' +
      '<div class="r-scroll"><div class="r-hero"><div class="r-pct num">' + r.compliance.percent + '%</div><div>соблюдение режима<small>' + r.compliance.goodDays + ' из ' + r.period.days + ' дн. без пропусков</small></div></div>' +
      '<div class="r-card">' + row('Серия / рекорд', r.streak + ' / ' + r.bestStreak + ' дн.') +
      row('Растяжка нерва', r.sessions.stretch) + row('Тяга резинки', r.sessions.pull) + row('Упор на пальцы', r.sessions.push) +
      row('С таймером', r.sessions.timed + ' упр.') +
      row('Этап тяги', r.phase.phase === 'static' ? 'статика, ' + (r.phase.done + 1) + '/' + r.phase.staticSessions : 'динамика') +
      row('До конца курса', r.daysLeft + ' дн.') + '</div>' +
      '<div class="grp">Боль в локте (0–10)</div><div class="r-card">' + painChart(r.pain.series) +
      (r.pain.series.length ? row('Средняя за неделю', r.pain.avg7 === null ? '—' : r.pain.avg7) + row('Максимум', r.pain.max) : '') + '</div>' +
      '<div class="grp">Пропуски</div><div class="r-card">' + (r.misses.length ? r.misses.slice(-12).map(function (m) {
        return '<div class="r-row"><span>' + humanDate(m.date) + '</span><b class="miss-t">' + m.items.map(function (i) { return LABELS[i]; }).join(', ') + '</b></div>';
      }).join('') : '<div class="r-row"><span>Пропусков нет</span><b>🎉</b></div>') + '</div></div>' +
      '<div class="ov-actions"><button class="btn" data-rep="send">' + icon('send') + 'Отправить в чат</button></div>';
    el.querySelectorAll('[data-rep]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.rep === 'close') { report = null; renderReport(); return; }
        b.disabled = true;
        apiCall({ action: 'sendReport' }).then(function (res) {
          popup('Отчёт', res && res.ok ? 'Отправил в чат с ботом — его можно переслать врачу.' : 'Не получилось отправить, попробуй ещё раз.');
          b.disabled = false;
        }).catch(function () { b.disabled = false; popup('Отчёт', 'Не получилось отправить, попробуй ещё раз.'); });
      };
    });
  }

  function offerResume() {
    try {
      var saved = LfkSession.restore(localStorage.getItem(SESSION_KEY), state.today.date);
      if (!saved) return;
      session = LfkSession.tick(saved, Date.now()).state;
      if (session.flow) flow = { queue: session.flow.queue, idx: session.flow.idx, stage: 'session' };
      confirmBox('Продолжить «' + LABELS[session.item] + '»? Сделано подходов: ' + session.completed + ' из ' + session.plan.sets + '.', function (ok) {
        if (ok) { overlayOpen = true; afterChange([]); }
        else { session = null; saveSession(); render(); }
      });
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshIfNewDay();
    if (document.visibilityState === 'visible' && session && overlayOpen) {
      keepAwake(false);
      afterChange(LfkSession.tick(session, Date.now()).events);
    }
  });

  if (tg && tg.initData) {
    document.documentElement.classList.add('tg');
    tg.ready();
    tg.expand();
    // Пользователь сменил тему Telegram — пересчитываем схему (если в настройках «как в Telegram»).
    try { tg.onEvent('themeChanged', function () { LfkSettings.applyTheme(prefs.theme); }); } catch (e) {}
    try {
      // Свайп вниз не закрывает приложение — его легко сделать случайно во время упражнения.
      if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes();
      // На телефоне — весь экран; кнопки Telegram остаются поверх, контент отступает под них.
      if (tg.isVersionAtLeast('8.0') && /^(ios|android)$/.test(tg.platform)) tg.requestFullscreen();
    } catch (e) {}
  }
  setInterval(refreshIfNewDay, 60000);

  if (!window.LFK_MOCK && !(tg && tg.initData)) {
    showError({ message: 'forbidden' });
  } else {
    LfkSettings.load(function (c, p) {
      colors = c;
      prefs = p;
      LfkSettings.apply(colors);
      LfkSettings.applyTheme(prefs.theme);
      load();
    });
  }
})();
