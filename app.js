// Мини-приложение: вкладки «Сегодня» и «Прогресс». Все статусы и цвета считает Apps Script.
(function () {
  var tg = window.Telegram && Telegram.WebApp;
  var root = document.getElementById('app');
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var LABELS = { stretch: 'Растяжка нерва', pull: 'Тяга резинки', push: 'Упор на пальцы', pullPush: 'Тяга + упор', kettlebell: 'Гиря', ddx: 'DDX', run: 'Пробежка', tennis: 'Теннис' };

  var ui = { tab: 'today', day: 'today', month: null, busy: false };
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
      state = s;
      ui.month = s.month;
      checkVersion(s);
      render();
    }).catch(showError);
  }

  function showError(err) {
    var forbidden = err && err.message === 'forbidden';
    root.innerHTML = '<div class="error">' +
      (forbidden ? 'Открой приложение из бота в Telegram.' : 'Не получилось загрузить данные.<br><small>' + esc(err && err.message || '') + '</small>') +
      '<button class="btn" id="retry">Повторить</button></div>';
    document.getElementById('retry').onclick = function () { root.innerHTML = '<div class="loading">Загружаю…</div>'; load(); };
  }

  function mark(item, value, confirm) {
    if (ui.busy) return;
    var date = state[ui.day].date;
    ui.busy = true;
    haptic();
    // Оптимистично показываем галочку сразу.
    state[ui.day].list.forEach(function (x) { if (x.item === item) x.done = value; });
    render();
    apiCall({ action: 'mark', date: date, item: item, value: value, confirm: !!confirm, month: ui.month }).then(function (r) {
      ui.busy = false;
      if (r.needsConfirm) {
        state[ui.day].list.forEach(function (x) { if (x.item === item) x.done = !value; });
        render();
        confirmBox('Сегодня по плану отдых для тяги и упора. Точно записать?', function (ok) { if (ok) mark(item, value, true); });
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

  function renderToday() {
    var v = state[ui.day];
    var title = (ui.day === 'today' ? 'Сегодня' : 'Вчера') + ' · ' + v.weekdayName.toLowerCase() + ', ' + humanDate(v.date);
    var html = '<div class="grp">' + esc(title) + '</div>';
    [['lfk', 'ЛФК'], ['sport', 'Спорт']].forEach(function (g) {
      html += '<div class="grp">' + g[1] + '</div>';
      v.list.filter(function (x) { return x.group === g[0]; }).forEach(function (x) {
        html += '<button class="ex ' + (x.done ? 'done ' : '') + esc(x.status) + '" data-item="' + esc(x.item) + '" data-done="' + (x.done ? 1 : 0) + '">' +
          '<span class="chk">' + (x.done ? '✓' : '') + '</span><span>' + esc(x.label) + '<small>' + esc(x.note) + '</small></span></button>';
      });
    });
    html += ui.day === 'today'
      ? '<button class="btn ghost" id="switch-day">‹ Отметить за вчера</button>'
      : '<button class="btn" id="switch-day">Вернуться к сегодня ›</button>';
    return html;
  }

  function renderProgress() {
    var p = state.progress;
    var pct = Math.min(100, Math.round((p.daysDone / p.daysTotal) * 100));
    var html = '<div class="tiles">' +
      '<div class="tile"><b>' + p.streak + '</b>дней без пропусков</div>' +
      '<div class="tile"><b>' + p.totalMisses + '</b>пропусков всего</div>' +
      '<div class="tile"><b>' + p.daysLeft + '</b>дней до финиша</div></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="hint">' + p.daysDone + ' из ' + p.daysTotal + ' дней · финиш 11 января · неделя: тяга + упор ' + p.week.pullPush + '/3, гиря ' + p.week.kettlebell + '/3</div>';

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
    var done = Object.keys(d.done).filter(function (k) { return d.done[k]; }).map(function (k) { return LABELS[k]; });
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
    root.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () { dayDetails(b.dataset.day); };
    });
    var sw = document.getElementById('switch-day');
    if (sw) sw.onclick = function () { ui.day = ui.day === 'today' ? 'yesterday' : 'today'; render(); };
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    if (prev) prev.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, -1); load(); };
    if (next) next.onclick = function () { ui.month = LfkCalendar.shiftMonth(ui.month, 1); load(); };
  }

  if (tg && tg.initData) {
    document.documentElement.classList.add('tg');
    tg.ready();
    tg.expand();
  }
  if (!window.LFK_MOCK && !(tg && tg.initData)) {
    showError({ message: 'forbidden' });
  } else {
    load();
  }
})();
