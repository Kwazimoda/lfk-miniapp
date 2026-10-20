// Мини-приложение: вкладки «Сегодня» и «Прогресс». Все статусы и цвета считает Apps Script.
(function () {
  var tg = window.Telegram && Telegram.WebApp;
  var root = document.getElementById('app');
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var LABELS = { stretch: 'Растяжка нерва', pull: 'Тяга резинки', push: 'Упор на пальцы', pullPush: 'Тяга + упор', kettlebell: 'Гиря', ddx: 'DDX', run: 'Бег', tennis: 'Теннис' };

  var ui = { tab: 'today', day: 'today', month: null, busy: false, hint: null };
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
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
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
    var canTime = ui.day === 'today' && LfkSession.planFor(x.item, state.pullPhase, prefs) && !x.timed;
    var dose = x.item === 'stretch' ? '10 × 5 с, отдых ' + prefs.stretchRestSec + ' с' : x.dose;
    var running = session && session.item === x.item && session.phase !== 'done';
    var slim = !dose; // без дозировки — название и метка в одной строке
    var html = '<div class="row ' + (x.done ? 'done ' : '') + (slim ? 'slim ' : '') + esc(x.status) + '">' +
      '<button class="ex" data-item="' + esc(x.item) + '" data-done="' + (x.done ? 1 : 0) + '" aria-label="Отметить вручную">' +
      '<span class="chk">' + (x.done ? icon(x.timed ? 'timer' : 'check') : '') + '</span>' +
      '<span class="txt' + (slim ? ' inline' : '') + '"><span class="name">' + esc(x.label) + '</span>' +
      (dose ? '<span class="dose">' + esc(dose) + '</span>' : '') +
      '<span class="tags">' + tagsHtml(x.tags) + '</span></span></button>' +
      '<span class="acts">' +
      (canTime ? '<button class="start' + (running ? ' running' : '') + '" data-start="' + esc(x.item) + '" aria-label="Начать с таймером">' +
        (running ? session.completed + '/' + session.plan.sets : icon('play', 'fill')) + '</button>' : '') +
      (hint ? '<button class="info' + (ui.hint === x.item ? ' on' : '') + '" data-hint="' + esc(x.item) + '" aria-label="Как делать">' + icon('help') + '</button>' : '') +
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
    html += '<div class="grp">Спорт</div>' + v.list.filter(function (x) { return x.group === 'sport'; }).map(renderRow).join('');
    if (ui.day === 'yesterday') html += '<div class="note-small">За вчера — только ручные отметки, без таймера.</div>';
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

  function renderProgress() {
    var p = state.progress;
    var html = '<div class="banner"><div class="big"><b>' + (p.streak ? '🔥 ' : '') + p.streak + '</b><span>' + dayWord(p.streak) + ' ЛФК без пропусков</span></div>' +
      '<small>' + esc(cheer(p)) + '</small><div class="chips2">' +
      '<span><i class="dot kb"></i>гиря ' + p.week.kettlebell + '/3' + (p.kbWeeks > 1 ? ' · ' + p.kbWeeks + ' нед.' : '') + '</span>' +
      '<span><i class="dot run"></i>бег ' + (p.week.run >= 2 ? p.week.run + ' · отлично' : p.week.run + '/1' + (p.runWeeks > 1 ? ' · ' + p.runWeeks + ' нед.' : '')) + '</span>' +
      (p.timed && p.timed.total ? '<span>' + icon('timer') + p.timed.timed + ' из ' + p.timed.total + '</span>' : '') +
      '<span>' + p.daysLeft + ' дн. до финиша</span></div></div>';

    html += '<div class="badges">' + MILESTONES.map(function (m) {
      return '<span class="badge' + (p.bestStreak >= m[0] ? ' on' : '') + '">' + m[1] + '</span>';
    }).join('') + '</div>';

    var ym = ui.month;
    html += '<div class="cal-head"><button id="prev" aria-label="Предыдущий месяц">‹</button><span>' + MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) + '</span><button id="next" aria-label="Следующий месяц">›</button></div>';
    html += '<div class="cal">' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(function (d) { return '<div class="wd">' + d + '</div>'; }).join('');
    LfkCalendar.monthGrid(+ym.slice(0, 4), +ym.slice(5, 7)).forEach(function (week) {
      week.forEach(function (iso, i) {
        if (!iso) { html += '<div class="cell"></div>'; return; }
        var d = state.calDays[iso] || {};
        var nextIso = week[i + 1];
        var link = d.chain && nextIso && state.calDays[nextIso] && state.calDays[nextIso].chain;
        var cls = 'ring' + (d.fill && !d.miss ? ' full' : '') + (d.miss ? ' miss' : '') + (d.today ? ' today' : '') + (d.future ? ' future' : '');
        html += '<button class="cell' + (link ? ' link' : '') + '" data-day="' + iso + '">' +
          '<span class="' + cls + '" style="--p:' + Math.round((d.p || 0) * 100) + '%">' + +iso.slice(8, 10) + '</span>' +
          '<span class="dots">' + (d.k ? '<b class="k"></b>' : '') + (d.r ? '<b class="r"></b>' : '') + (d.d ? '<b class="d"></b>' : '') + (d.t ? '<b class="t"></b>' : '') + '</span></button>';
      });
    });
    html += '</div><div class="legend"><span><i class="dot lfk"></i>ЛФК</span><span><i class="dot kb"></i>гиря</span><span><i class="dot run"></i>бег</span><span><i class="dot ddx"></i>DDX</span><span><i class="dot tennis"></i>теннис</span><span><i class="dot red"></i>пропуск</span></div>';

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

  function renderSettings() {
    var rows = [['lfk', 'ЛФК'], ['kb', 'Комплекс с гирей'], ['run', 'Бег'], ['ddx', 'DDX Атлетика'], ['tennis', 'Теннис']];
    var st = state.settings || DEFAULT_REMINDERS;
    var html = '<div class="head"><h1>Настройки</h1></div>';

    html += '<div class="grp">Таймер</div>' +
      '<div class="set-row"><span>Звук</span>' + toggleHtml('sound', prefs.sound) + '</div>' +
      '<div class="set-row"><span>Вибрация</span>' + toggleHtml('vibe', prefs.vibe) + '</div>' +
      '<div class="set-row col"><span>Отдых между подходами<small>тяга и упор</small></span>' +
      segHtml('restSec', LfkSettings.REST_OPTIONS.map(function (v) { return { v: v, t: v + ' с' }; }), prefs.restSec) + '</div>' +
      '<div class="set-row col"><span>Отдых между повторами<small>растяжка нерва</small></span>' +
      segHtml('stretchRestSec', LfkSettings.STRETCH_REST_OPTIONS.map(function (v) { return { v: v, t: v + ' с' }; }), prefs.stretchRestSec) + '</div>';

    html += '<div class="grp">Напоминания бота</div>' +
      '<div class="set-row"><span>Растяжка днём<small>одно напоминание</small></span>' + timeInput('stretchAt', st.stretchAt) + '</div>' +
      '<div class="set-row"><span>DDX: записаться<small>каждое воскресенье</small></span>' + timeInput('ddxAt', st.ddxAt) + '</div>' +
      '<div class="set-row col"><span>ЛФК: растяжка, тяга, упор<small>когда можно заниматься — напомню в начале, каждый час и за 15 минут до конца</small></span>' +
      '<span class="range">' + timeInput('lfk.from', st.lfk.from) + '<em>—</em>' + timeInput('lfk.to', st.lfk.to) + '</span></div>' +
      '<div class="set-row col"><span>Комплекс с гирей<small>своё окно; если совпадает с ЛФК — одно общее сообщение</small></span>' +
      '<span class="range">' + timeInput('kb.from', st.kb.from) + '<em>—</em>' + timeInput('kb.to', st.kb.to) + '</span></div>' +
      '<div class="set-row col"><span>Бег<small>пока на неделе нет пробежки: в начале окна и за 15 минут до конца</small></span>' +
      '<span class="range">' + timeInput('run.from', st.run.from) + '<em>—</em>' + timeInput('run.to', st.run.to) + '</span></div>';

    html += '<div class="grp">Внешний вид</div>' +
      '<div class="set-row col"><span>Тема</span>' +
      segHtml('theme', [{ v: 'auto', t: 'Как в Telegram' }, { v: 'light', t: 'Светлая' }, { v: 'dark', t: 'Тёмная' }], prefs.theme) + '</div>';

    html += '<div class="grp">Цвета на экране «Прогресс»</div>';
    rows.forEach(function (r) {
      html += '<div class="set-row"><span>' + r[1] + '</span><span class="swatches">' + LfkSettings.PALETTE.map(function (c) {
        return '<button class="sw' + (colors[r[0]] === c ? ' on' : '') + '" style="background:' + c + '" data-color="' + c + '" data-key="' + r[0] + '" aria-label="' + c + '"></button>';
      }).join('') + '</span></div>';
    });
    html += '<button class="btn ghost" id="reset-colors">Сбросить цвета</button>';
    return html;
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
      '<div class="topbar"><div class="tabs"><button data-tab="today" class="' + (ui.tab === 'today' ? 'on' : '') + '">Сегодня</button>' +
      '<button data-tab="progress" class="' + (ui.tab === 'progress' ? 'on' : '') + '">Прогресс</button></div>' +
      '<button class="gear' + (ui.tab === 'settings' ? ' on' : '') + '" data-tab="settings" aria-label="Настройки">' + icon('gear') + '</button></div>' +
      (ui.tab === 'today' ? renderToday() : ui.tab === 'progress' ? renderProgress() : renderSettings()) +
      (ui.tab === 'settings' ? '<div class="ver">Версия ' + esc(state.version) + '</div>' : '');

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { ui.tab = b.dataset.tab; render(); };
    });
    root.querySelectorAll('[data-item]').forEach(function (b) {
      b.onclick = function () { mark(b.dataset.item, b.dataset.done !== '1'); };
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

  function openSession(item) {
    initAudio();
    var row = state.today.list.filter(function (x) { return x.item === item; })[0];
    var begin = function (confirmed) {
      if (!session || session.item !== item) {
        var plan = LfkSession.planFor(item, state.pullPhase, prefs);
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
    el.innerHTML = '<div class="ov-head"><span>' + esc(LABELS[s.item]) + '</span><button data-act="close" aria-label="Закрыть">' + icon('close') + '</button></div>' +
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
    LfkSettings.load(function (c, p) {
      colors = c;
      prefs = p;
      LfkSettings.apply(colors);
      LfkSettings.applyTheme(prefs.theme);
      load();
    });
  }
})();
