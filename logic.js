window.LfkLogic = (function () {
// ---- version.js
// Версия проекта — одна на бота и мини-приложение. При выпуске: поднять VERSION,
// дописать WHATS_NEW и CHANGELOG.md, запустить npm run deploy.
var VERSION = '1.17.0';

var WHATS_NEW = {
  '1.0.0': ['Первая версия: напоминания, отметки и прогресс в мини-приложении.'],
  '1.17.0': ['Отчёт для врача: заметная кнопка «‹ Назад», кнопка «Закрыть» и родная кнопка «Назад» Telegram; сам отчёт теперь в «Настройки → Для врача».', 'Нажатие на день в календаре поднимает календарь к верху экрана, плашка серии уходит вверх.'],
  '1.16.1': ['Двойное касание больше не увеличивает экран (быстрые нажатия «›» в тесте и отметки).'],
  '1.16.0': ['Режим тестирования (⚙️ → «Режим тестирования»): копия твоих данных на телефоне — жми что угодно, ничего не сохранится.', 'В тесте можно перематывать дни «‹ ›», сбрасывать копию и выйти в обычный режим.'],
  '1.15.0': ['Спорт можно планировать: нажми на гирю, DDX, бег или теннис — «Выполнено» или «Запланировать» на дату и время.', 'В назначенное время бот напомнит с кнопкой «Сделал». План видно на плашке и в деталях дня.'],
  '1.14.0': ['Отметку можно отменить: после нажатия внизу на 5 секунд появляется «Отменить» (или «Вернуть», если сняли по ошибке).'],
  '1.13.1': ['Вернул круг таймера: он снова круглый и закрашивается во время подхода.'],
  '1.13.0': ['«Начать ЛФК» — одна кнопка проводит по всем упражнениям подряд с таймером.', 'Дневник боли: после тяги и упора — оценка 0–10; график в отчёте.', 'Отчёт для врача в «Прогрессе» и командой /report. Вид «Весь курс» — 92 дня одним взглядом.', 'Вкладки внизу, настройки в стиле iOS, в напоминаниях кнопки «Через 30 мин» и «Уже делаю».'],
  '1.12.0': ['Быстрые отметки подряд больше не теряются.', 'Если приложение пролежало в фоне до утра — «Сегодня» само обновится на новый день.', 'Светлая тема стала контрастнее и читается на солнце; точки в календаре различаются и по форме.'],
  '1.11.0': ['Теннис: цель — раз в неделю (это хорошо), две — отлично; счётчик недели на плашке.', 'Теннис в итогах недели и в /progress. Напоминаний про теннис нет — только отметка.'],
  '1.10.1': ['Дата и день недели на «Сегодня» (и заголовок «Настройки») — по центру.'],
  '1.10.0': ['Прогресс: по нажатию на день под календарём — что было в этот день (сделано, с таймером, пропущено, день отдыха).', 'Плашка серии переделана: огонёк, число дней и рекорд, подбадривание, гиря/бег/таймер ровными ячейками, полоса до финиша.'],
  '1.9.0': ['DDX Атлетика и Теннис — отдельные плашки в «Спорте».', 'В воскресенье вечером бот напомнит записаться на DDX в понедельник (время — в настройках), кнопка «✓ Записался».', 'DDX и теннис — свои цвета и точки в календаре «Прогресса»; цвета меняются в настройках.'],
  '1.8.0': ['Бег — полноценное упражнение: норма 1 пробежка в неделю, 2 — отлично.', 'Бот напоминает про бег, пока на неделе нет пробежки: в начале окна и за 15 минут до конца; в воскресенье — «последний день».', 'За две пробежки на неделе — поздравление. У бега свой цвет и своё окно в настройках.'],
  '1.7.0': ['Настройки: диапазон времени для напоминаний про ЛФК и отдельно про гирю.', 'Бот напоминает про гирю в её окне: в начале, каждый час и за 15 минут до конца. Если окна совпадают — одно общее сообщение.'],
  '1.6.1': ['Иконка настроек — теперь настоящая шестерёнка.', 'Экраны «Сегодня» и «Прогресс» помещаются на экран телефона без прокрутки.'],
  '1.6.0': ['Настройки (⚙️): звук и вибрация таймера, время отдыха, тема, время напоминаний бота.', 'Время напоминаний: растяжка днём (10:00–15:00) и начало вечернего ЛФК (18:00–21:00).'],
  '1.5.0': ['Прогресс: кольца дней, серия цепочкой, точки гири и спорта, карточка серии и значки-вехи.', 'Бот поздравляет на вехах серии и когда гиря набрала 3 из 3 за неделю.', 'Настройки (⚙️): цвета ЛФК, гири и спорта.', 'Выбранная вкладка заметнее.'],
  '1.4.0': ['Лёгкий «воздушный» дизайн: больше воздуха, тонкие линии и шрифты.', 'Новые современные иконки: секундомер, старт, подсказка.'],
  '1.3.0': ['Новый вид: крупнее шрифты, понятные подписи и метки, кнопка ▶ под палец.', 'Растяжка нерва — 10 повторов подряд: 5 с растяжка, 10 с отдых, без нажатий.', 'Отдых между подходами тяги и упора — 45 с.', 'Приложение открывается на весь экран и не закрывается случайным свайпом.'],
  '1.2.0': ['Таймер подходов для ЛФК: кнопка ▶ у тяги, упора и растяжки.', 'Упор и тяга-статика: 3 × 45 с с отдыхом 1 мин, звук и вибрация в конце.', 'После таймера упражнение отмечается само с ⏱; в «Прогрессе» видно, сколько занятий с таймером.'],
  '1.1.0': ['Тяга резинки и Упор на пальцы — теперь отдельные отметки.', 'Кнопка ⓘ у каждого упражнения ЛФК — как правильно делать.', 'Тяга: первые 6 занятий — статика (45 с × 3), потом динамика (10 × 3); этап виден в подписи.'],
  '1.0.1': ['Календарь показывает историю до запуска бота: зелёный — тяга и упор, светло-зелёный — спорт.', 'По нажатию на любой прошедший день видно, что в нём сделано.'],
};

// ---- dates.js
// Даты — строки YYYY-MM-DD по Москве (UTC+3, без перехода на летнее время).

var MSK_OFFSET_MIN = 180;
var WEEKDAY_NAMES_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

function isoFromUtc_(ms) {
  var d = new Date(ms);
  return d.getUTCFullYear() + '-' + pad2_(d.getUTCMonth() + 1) + '-' + pad2_(d.getUTCDate());
}

function utcFromIso_(iso) {
  var p = iso.split('-');
  return Date.UTC(+p[0], +p[1] - 1, +p[2]);
}

function mskInfo(now) {
  var ms = now.getTime() + MSK_OFFSET_MIN * 60000;
  var d = new Date(ms);
  return {
    date: isoFromUtc_(ms),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    weekday: ((d.getUTCDay() + 6) % 7) + 1,
  };
}

function addDays(iso, n) {
  return isoFromUtc_(utcFromIso_(iso) + n * 86400000);
}

function weekdayOf(iso) {
  return ((new Date(utcFromIso_(iso)).getUTCDay() + 6) % 7) + 1;
}

function weekStart(iso) {
  return addDays(iso, 1 - weekdayOf(iso));
}

function daysBetween(a, b) {
  return Math.round((utcFromIso_(b) - utcFromIso_(a)) / 86400000);
}

// В Apps Script даты из таблицы приходят объектами Date в часовом поясе скрипта (Москва).
function parseSheetDate(v) {
  if (v instanceof Date || (v && typeof v.getFullYear === 'function')) {
    if (isNaN(v.getTime())) return null;
    return v.getFullYear() + '-' + pad2_(v.getMonth() + 1) + '-' + pad2_(v.getDate());
  }
  if (typeof v !== 'string') return null;
  var m = v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return m[3] + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]);
}

function formatSheetDate(iso) {
  var p = iso.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

function weekdayNameRu(iso) {
  return WEEKDAY_NAMES_RU[weekdayOf(iso) - 1];
}

function isYes(v) {
  if (v === true) return true;
  return typeof v === 'string' && /^да(\s|$)/.test(v.trim().toLowerCase());
}

// «Да ⏱» — упражнение выполнено через таймер в мини-приложении.
function isTimedMark(v) {
  return typeof v === 'string' && isYes(v) && v.indexOf('⏱') >= 0;
}

// ---- schedule.js
// Правила графика: что положено в день, что пропущено и каким цветом день.
// План дня считается только по дням ДО него — отметки самого дня план не меняют.

var EXERCISES = [
  { item: 'stretch', label: 'Растяжка нерва', columns: ['Растяжка нерва'], group: 'lfk' },
  { item: 'pull', label: 'Тяга резинки', columns: ['Тяга резинки'], group: 'lfk' },
  { item: 'push', label: 'Упор на пальцы', columns: ['Упор на пальцы'], group: 'lfk' },
  { item: 'kettlebell', label: 'Комплекс с гирей', columns: ['Комплекс с гирей'], group: 'sport' },
  { item: 'ddx', label: 'DDX Атлетика', columns: ['DDX Атлетика'], group: 'sport' },
  { item: 'run', label: 'Бег', columns: ['Пробежка'], group: 'sport' },
  { item: 'tennis', label: 'Теннис', columns: ['Теннис'], group: 'sport' },
];

var WEEKLY_NORM = 3;
var RUN_NORM = 1; // минимум пробежек в неделю; две — «отлично»
var TENNIS_GOAL = 1; // теннис: раз в неделю — хорошо (мягкая цель, без напоминаний)
var STATIC_SESSIONS = 6;

function marksOf_(history, iso) {
  return history[iso] || {};
}

function isSession_(m) {
  return !!(m.pull || m.push);
}

function weekCounts(history, iso) {
  var counts = { pullPush: 0, kettlebell: 0, run: 0, tennis: 0 };
  for (var d = weekStart(iso); d <= iso; d = addDays(d, 1)) {
    var m = marksOf_(history, d);
    if (isSession_(m)) counts.pullPush++;
    if (m.kettlebell) counts.kettlebell++;
    if (m.run) counts.run++;
    if (m.tennis) counts.tennis++;
  }
  return counts;
}

function dayPlan(history, iso) {
  var yesterday = addDays(iso, -1);
  var isMonday = weekdayOf(iso) === 1;
  var before = isMonday ? { pullPush: 0, kettlebell: 0, run: 0, tennis: 0 } : weekCounts(history, yesterday);

  var pullPush;
  if (isSession_(marksOf_(history, yesterday))) pullPush = 'rest';
  else if (before.pullPush >= WEEKLY_NORM) pullPush = 'optional';
  else pullPush = 'required';

  var kettlebell;
  if (isMonday || marksOf_(history, iso).ddx) kettlebell = 'off';
  else if (before.kettlebell >= WEEKLY_NORM) kettlebell = 'optional';
  else kettlebell = 'required';

  var run = before.run >= RUN_NORM ? 'optional' : 'required';

  return { stretch: 'required', pullPush: pullPush, kettlebell: kettlebell, run: run };
}

// До запуска бота пропуски не считаются, но сделанное видно: тяга+упор — зелёный,
// любой другой отмеченный пункт — светло-зелёный.
function preLaunchColor_(m) {
  if (m.pull && m.push) return 'green';
  if (m.stretch || m.pull || m.push || m.kettlebell || m.ddx || m.run || m.tennis) return 'lightgreen';
  return 'none';
}

function dayStatus(history, iso, todayIso, launchIso) {
  var plan = dayPlan(history, iso);
  var m = marksOf_(history, iso);
  var done = {
    stretch: !!m.stretch,
    pull: !!m.pull,
    push: !!m.push,
    pullPush: !!(m.pull && m.push),
    kettlebell: !!m.kettlebell,
    ddx: !!m.ddx,
    run: !!m.run,
    tennis: !!m.tennis,
  };

  var misses = [];
  if (iso >= launchIso && iso < todayIso) {
    if (!m.stretch) misses.push('stretch');
    if (plan.pullPush === 'required') {
      if (!m.pull) misses.push('pull');
      if (!m.push) misses.push('push');
    }
  }

  var requiredDone = done.stretch && (plan.pullPush !== 'required' || done.pullPush);
  var color;
  if (iso > todayIso) color = 'none';
  else if (iso < launchIso) color = preLaunchColor_(m);
  else if (misses.length) color = 'red';
  else if (iso === todayIso && !requiredDone) color = 'today';
  else if (done.pullPush) color = 'green';
  else color = 'lightgreen';

  return { plan: plan, done: done, misses: misses, color: color };
}

// Тяга резинки: первые STATIC_SESSIONS выполненных занятий — статика, дальше динамика.
function pullPhase(history, iso) {
  var done = 0;
  Object.keys(history).forEach(function (d) {
    if (d < iso && history[d] && history[d].pull) done++;
  });
  return { phase: done < STATIC_SESSIONS ? 'static' : 'dynamic', done: done, staticSessions: STATIC_SESSIONS };
}

// ---- progress.js
// Прогресс курса: серия без пропусков, список пропусков, итоги недели, цвета календаря.

var COURSE = { start: '2026-10-11', finish: '2027-01-11' };

function missesBetween_(history, from, toExclusive, todayIso, launchIso) {
  var out = [];
  for (var d = from; d < toExclusive; d = addDays(d, 1)) {
    var s = dayStatus(history, d, todayIso, launchIso);
    if (s.misses.length) out.push({ date: d, items: s.misses });
  }
  return out;
}

function progressSummary(history, todayIso, launchIso) {
  var misses = missesBetween_(history, launchIso, todayIso, todayIso, launchIso);

  var streak = 0;
  for (var d = addDays(todayIso, -1); d >= launchIso; d = addDays(d, -1)) {
    if (dayStatus(history, d, todayIso, launchIso).misses.length) break;
    streak++;
  }
  var today = dayStatus(history, todayIso, todayIso, launchIso);
  var todayDone = todayIso >= launchIso && today.color !== 'today';
  if (todayDone) streak++;
  var streakEnd = todayDone ? todayIso : addDays(todayIso, -1);

  var best = 0;
  var run = 0;
  for (var b = launchIso; b <= streakEnd; b = addDays(b, 1)) {
    run = dayStatus(history, b, todayIso, launchIso).misses.length ? 0 : run + 1;
    if (run > best) best = run;
  }

  var shortWeeks = [];
  for (var mon = weekStart(launchIso) === launchIso ? launchIso : addDays(weekStart(launchIso), 7);
       addDays(mon, 6) < todayIso; mon = addDays(mon, 7)) {
    if (weekCounts(history, addDays(mon, 6)).kettlebell < WEEKLY_NORM) shortWeeks.push(mon);
  }

  var timed = { timed: 0, total: 0 };
  for (var t = launchIso; t <= todayIso; t = addDays(t, 1)) {
    var m = history[t] || {};
    ['stretch', 'pull', 'push'].forEach(function (k) {
      if (!m[k]) return;
      timed.total++;
      if (m[k + 'Timed']) timed.timed++;
    });
  }

  return {
    timed: timed,
    streak: streak,
    streakStart: streak ? addDays(streakEnd, 1 - streak) : null,
    bestStreak: Math.max(best, streak),
    kbWeeks: weeksStreak_(history, todayIso, 'kettlebell', WEEKLY_NORM),
    runWeeks: weeksStreak_(history, todayIso, 'run', RUN_NORM),
    misses: misses,
    totalMisses: misses.length,
    daysLeft: Math.max(0, daysBetween(todayIso, COURSE.finish)),
    daysDone: Math.max(0, daysBetween(COURSE.start, todayIso)),
    daysTotal: daysBetween(COURSE.start, COURSE.finish),
    week: weekCounts(history, todayIso),
    kettlebellShortWeeks: shortWeeks,
  };
}

function weekSummary(history, mondayIso, todayIso, launchIso) {
  var sunday = addDays(mondayIso, 6);
  var counts = weekCounts(history, sunday);
  var end = addDays(sunday, 1) < todayIso ? addDays(sunday, 1) : todayIso;
  var from = mondayIso > launchIso ? mondayIso : launchIso;
  return {
    pullPush: counts.pullPush,
    kettlebell: counts.kettlebell,
    run: counts.run,
    ddx: countMarks_(history, mondayIso, sunday, 'ddx'),
    tennis: countMarks_(history, mondayIso, sunday, 'tennis'),
    misses: missesBetween_(history, from, end, todayIso, launchIso),
  };
}

function calendarMonth(history, year, month1, todayIso, launchIso) {
  var out = {};
  var first = year + '-' + (month1 < 10 ? '0' : '') + month1 + '-01';
  for (var d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) {
    out[d] = dayStatus(history, d, todayIso, launchIso).color;
  }
  return out;
}

// Сколько недель подряд набрана норма по счётчику key: завершённые недели назад от прошлой,
// плюс текущая, если норма в ней уже есть.
function weeksStreak_(history, todayIso, key, norm) {
  var mon = weekStart(todayIso);
  var n = weekCounts(history, todayIso)[key] >= norm ? 1 : 0;
  for (var w = addDays(mon, -7); ; w = addDays(w, -7)) {
    if (weekCounts(history, addDays(w, 6))[key] < norm) break;
    n++;
  }
  return n;
}

// Данные дня для календаря: p — доля положенного ЛФК, fill — растяжка+тяга+упор,
// miss — пропуск, k — гиря, s — другой спорт, chain — день входит в серию без пропусков.
function calendarDays(history, year, month1, todayIso, launchIso) {
  var out = {};
  var first = year + '-' + (month1 < 10 ? '0' : '') + month1 + '-01';
  for (var d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) {
    var m = history[d] || {};
    var st = dayStatus(history, d, todayIso, launchIso);
    var p;
    if (d < launchIso) {
      p = (m.pull ? 0.5 : 0) + (m.push ? 0.5 : 0);
    } else {
      var req = ['stretch'];
      if (st.plan.pullPush === 'required') req.push('pull', 'push');
      else if (m.pull || m.push) req.push('pull', 'push');
      p = req.filter(function (k) { return m[k]; }).length / req.length;
    }
    var future = d > todayIso;
    var miss = st.misses.length > 0;
    out[d] = {
      p: future ? 0 : p,
      fill: !!(m.stretch && m.pull && m.push),
      miss: miss,
      today: d === todayIso,
      future: future,
      k: !!m.kettlebell,
      r: !!m.run,
      d: !!m.ddx,
      t: !!m.tennis,
      chain: !future && d >= launchIso && !miss && p === 1,
    };
  }
  return out;
}

function countMarks_(history, fromIso, toIso, key) {
  var n = 0;
  for (var d = fromIso; d <= toIso; d = addDays(d, 1)) if (history[d] && history[d][key]) n++;
  return n;
}

// Весь курс: данные календаря для каждой даты от старта до финиша.
function courseDays(history, todayIso, launchIso) {
  var out = {};
  var first = COURSE.start.slice(0, 7);
  var last = COURSE.finish.slice(0, 7);
  for (var ym = first; ym <= last; ym = nextMonth_(ym)) {
    var month = calendarDays(history, +ym.slice(0, 4), +ym.slice(5, 7), todayIso, launchIso);
    Object.keys(month).forEach(function (iso) {
      if (iso >= COURSE.start && iso <= COURSE.finish) out[iso] = month[iso];
    });
  }
  return out;
}

function nextMonth_(ym) {
  var y = +ym.slice(0, 4);
  var m = +ym.slice(5, 7) + 1;
  if (m > 12) { m = 1; y++; }
  return y + '-' + (m < 10 ? '0' : '') + m;
}

// Отчёт для врача: соблюдение режима, занятия, боль, пропуски — с даты запуска по вчера.
function buildReport(history, todayIso, launchIso) {
  var to = addDays(todayIso, -1);
  var days = 0;
  var good = 0;
  var sessions = { stretch: 0, pull: 0, push: 0, timed: 0 };
  var series = [];
  for (var d = launchIso; d <= to; d = addDays(d, 1)) {
    days++;
    var st = dayStatus(history, d, todayIso, launchIso);
    if (!st.misses.length) good++;
  }
  for (var e = launchIso; e <= todayIso; e = addDays(e, 1)) {
    var m = history[e] || {};
    ['stretch', 'pull', 'push'].forEach(function (k) {
      if (m[k]) sessions[k]++;
      if (m[k] && m[k + 'Timed']) sessions.timed++;
    });
    if (typeof m.pain === 'number') series.push({ date: e, value: m.pain });
  }
  var weekAgo = addDays(todayIso, -7);
  var recent = series.filter(function (x) { return x.date > weekAgo; });
  var avg = recent.length ? Math.round(recent.reduce(function (a, x) { return a + x.value; }, 0) / recent.length * 10) / 10 : null;
  var p = progressSummary(history, todayIso, launchIso);
  return {
    period: { from: launchIso, to: to, days: days },
    compliance: { goodDays: good, percent: days ? Math.round(good / days * 100) : 100 },
    streak: p.streak,
    bestStreak: p.bestStreak,
    sessions: sessions,
    phase: pullPhase(history, todayIso),
    pain: { series: series, avg7: avg, max: series.length ? Math.max.apply(null, series.map(function (x) { return x.value; })) : null },
    misses: p.misses,
    daysLeft: p.daysLeft,
    week: p.week,
  };
}

// ---- reminders.js
// Расписание напоминаний. Триггер срабатывает раз в 15 минут; слот уходит один раз,
// если запуск попал в окно [at, at + 30) минут.

var FIXED_SLOTS = [
  { id: 'morning', group: 'morning', at: 9 * 60 },
  { id: 'weekly', group: 'weekly', at: 21 * 60 + 30, weekday: 7 },
];

var SLOT_WINDOW_MIN = 30;
var REPEAT_MIN = 60;
var LAST_BEFORE_END_MIN = 15;

// Напоминания внутри окна [from, to]: в начале, потом каждый час, и последнее — за 15 минут до конца.
function windowSlots_(group, w) {
  var times = [];
  for (var t = w.from; t <= w.to - 2 * LAST_BEFORE_END_MIN; t += REPEAT_MIN) times.push(t);
  var last = w.to - LAST_BEFORE_END_MIN;
  if (!times.length || last - times[times.length - 1] >= LAST_BEFORE_END_MIN) times.push(last);
  return times.map(function (at, i) {
    return { id: group + '@' + at, group: group, at: at, kind: i === 0 ? 'first' : i === times.length - 1 ? 'last' : 'mid' };
  });
}

function slotsFor(cfg) {
  var c = normalizeSettings(cfg);
  return FIXED_SLOTS.slice(0, 1)
    .concat([{ id: 'stretch', group: 'stretch', at: c.stretchAt, kind: 'stretch' }])
    .concat([{ id: 'ddx', group: 'ddx', at: c.ddxAt, weekday: 7 }])
    .concat(windowSlots_('lfk', c.lfk))
    .concat(windowSlots_('kb', c.kb))
    .concat(windowSlots_('run', c.run))
    .concat(FIXED_SLOTS.slice(1));
}

function dueSlots(info, sent, cfg) {
  var out = [];
  slotsFor(cfg).forEach(function (s) {
    if (s.weekday && s.weekday !== info.weekday) return;
    if (info.minutes < s.at || info.minutes >= s.at + SLOT_WINDOW_MIN) return;
    var key = info.date + ':' + s.id;
    if (!sent.has(key)) out.push({ id: s.id, key: key, group: s.group, kind: s.kind, at: s.at });
  });
  return out;
}

function reminderItems(history, iso, slot) {
  var plan = dayPlan(history, iso);
  var m = history[iso] || {};
  var required = [];
  var optional = [];
  var first = slot.kind === 'first';

  if (slot.group === 'stretch') {
    if (!m.stretch) required.push('stretch');
  } else if (slot.group === 'lfk') {
    if (!m.stretch) required.push('stretch');
    if (plan.pullPush === 'required') {
      if (!m.pull) required.push('pull');
      if (!m.push) required.push('push');
    } else if (plan.pullPush === 'optional' && first) {
      if (!m.pull) optional.push('pull');
      if (!m.push) optional.push('push');
    }
  } else if (slot.group === 'run') {
    // Бег: пока на неделе нет пробежки — в начале и в конце окна; вторая пробежка — бонус, без напоминаний.
    var counts = weekCounts(history, addDays(iso, -1));
    var before = weekdayOf(iso) === 1 ? 0 : counts.run;
    if (!m.run && before < RUN_NORM && slot.kind !== 'mid') required.push('run');
  } else if (slot.group === 'kb') {
    if (!m.kettlebell) {
      if (plan.kettlebell === 'required') required.push('kettlebell');
      else if (plan.kettlebell === 'optional' && first) optional.push('kettlebell');
    }
  }
  return { required: required, optional: optional };
}

// ---- messages.js
// Тексты сообщений бота (HTML parse_mode). Коротко, тепло, без упрёков.

var ITEM_LABELS = {
  stretch: 'Растяжка нерва',
  pullPush: 'Тяга резинки + Упор на пальцы',
  pull: 'Тяга резинки',
  push: 'Упор на пальцы',
  kettlebell: 'Комплекс с гирей',
  ddx: 'DDX Атлетика',
  run: 'Бег',
  tennis: 'Теннис',
};

// kind: 'stretch' | 'first' | 'mid' | 'last' (положение напоминания в окне).
var SLOT_HEADERS = {
  stretch: '🌿 Найди пару минут на растяжку нерва — можно прямо сейчас.',
  first: '💪 Вечер — время ЛФК. На сегодня:',
  firstKb: '🏋️ Время для комплекса с гирей. На сегодня:',
  firstRun: '🏃 Время для бега — на этой неделе пробежек ещё не было:',
  mid: '⏰ Напоминаю, ещё не отмечено:',
  snooze: '⏰ Как и просил — напоминаю:',
  last: '🌙 Последнее напоминание на сегодня:',
};

function weekNote_(item, week, kind) {
  if (item !== 'pull' && item !== 'push' && item !== 'kettlebell' && item !== 'run') return '';
  var norm = item === 'run' ? RUN_NORM : WEEKLY_NORM;
  var n = (week && week[item === 'kettlebell' ? 'kettlebell' : item === 'run' ? 'run' : 'pullPush']) || 0;
  var left = norm - n;
  var urge = (kind === 'mid' || kind === 'last') && left > 0 ? ', осталось ' + left : '';
  return ' <i>(' + n + ' из ' + norm + ' за неделю' + urge + ')</i>';
}

function reminderText(items, kind, week) {
  if (!items.required.length && !items.optional.length) return '';
  var all = items.required.concat(items.optional);
  var only = function (name) { return all.length > 0 && all.every(function (it) { return it === name; }); };
  var head = kind === 'first' && only('kettlebell') ? SLOT_HEADERS.firstKb
    : kind === 'first' && only('run') ? SLOT_HEADERS.firstRun
    : SLOT_HEADERS[kind] || SLOT_HEADERS.mid;
  var lines = [head];
  if (kind === 'stretch') return lines[0];
  items.required.forEach(function (it) {
    lines.push('• ' + ITEM_LABELS[it] + weekNote_(it, week, kind));
  });
  items.optional.forEach(function (it) {
    lines.push('• ' + ITEM_LABELS[it] + ' — по желанию' + weekNote_(it, week, kind));
  });
  if (week && week.lastDay && all.indexOf('run') >= 0) lines.push('📅 Сегодня воскресенье — последний день недели для бега.');
  return lines.join('\n');
}

function morningText(missed) {
  if (!missed.length) return '';
  return '☀️ Вчера пропущено: ' + missed.map(function (it) { return ITEM_LABELS[it]; }).join(', ') +
    '.\nЕсли на самом деле делал — отметь кнопкой ниже.';
}

function progressText(p) {
  var lines = [
    '📊 <b>Прогресс</b>',
    'Дней подряд без пропусков: <b>' + p.streak + '</b>',
    'Пропусков всего: <b>' + p.totalMisses + '</b>',
    'Тяга + упор на этой неделе: ' + p.week.pullPush + ' из ' + WEEKLY_NORM,
    'Гиря на этой неделе: ' + p.week.kettlebell + ' из ' + WEEKLY_NORM,
    'Бег на этой неделе: ' + p.week.run + (p.week.run >= 2 ? ' — отлично!' : ' из ' + RUN_NORM),
    'Теннис на этой неделе: ' + p.week.tennis + (p.week.tennis >= 1 ? ' — хорошо' : ' из ' + TENNIS_GOAL),
    'До финиша (11.01.2027): <b>' + p.daysLeft + '</b> дн. · пройдено ' + p.daysDone + ' из ' + p.daysTotal,
  ];
  if (p.misses.length) {
    lines.push('', 'Пропуски:');
    p.misses.slice(-10).forEach(function (m) {
      lines.push('• ' + formatSheetDate(m.date) + ' — ' + m.items.map(function (it) { return ITEM_LABELS[it]; }).join(', '));
    });
  }
  return lines.join('\n');
}

function weeklyText(w) {
  var lines = [
    '🗓 <b>Итоги недели</b>',
    'Тяга + упор: ' + w.pullPush + ' из ' + WEEKLY_NORM,
    'Гиря: ' + w.kettlebell + ' из ' + WEEKLY_NORM,
    w.run >= 2 ? 'Бег: ' + w.run + ' — отлично! 🏃' : 'Бег: ' + (w.run || 0) + ' из ' + RUN_NORM,
  ];
  if (w.ddx) lines.push('DDX: ' + w.ddx);
  lines.push(w.tennis >= 2 ? 'Теннис: ' + w.tennis + ' — отлично!' : w.tennis === 1 ? 'Теннис: 1 — хорошо 🎾' : 'Теннис: 0 из ' + TENNIS_GOAL);
  if (w.misses.length) {
    lines.push('Пропуски: ' + w.misses.map(function (m) { return formatSheetDate(m.date).slice(0, 5); }).join(', '));
  } else {
    lines.push('Без пропусков 🎉');
  }
  return lines.join('\n');
}

function whatsNewText(version, notes) {
  return '✨ <b>Что нового в версии ' + version + '</b>\n' +
    (notes || []).map(function (n) { return '• ' + n; }).join('\n');
}

function restConfirmText() {
  return 'Сегодня по плану отдых для тяги и упора. Точно записать?';
}

function startText() {
  return 'Привет! Я буду напоминать про ЛФК и отмечать прогресс.\n' +
    'Открой приложение кнопкой ниже. /progress — как идут дела, /report — отчёт для врача.';
}

var MILESTONES = [
  { days: 3, title: '3 дня без пропусков ЛФК!' },
  { days: 7, title: 'Неделя без пропусков ЛФК!' },
  { days: 14, title: 'Две недели без пропусков ЛФК!' },
  { days: 30, title: 'Месяц без пропусков ЛФК!' },
  { days: 50, title: '50 дней без пропусков ЛФК!' },
  { days: 92, title: '92 дня — весь курс без пропусков!' },
];

function milestoneText(days) {
  var m = MILESTONES.filter(function (x) { return x.days === days; })[0];
  if (!m) return '';
  var next = MILESTONES.filter(function (x) { return x.days > days; })[0];
  return '🎉 <b>' + m.title + '</b>\nЛокоть скажет спасибо.' +
    (next ? ' Следующая цель — ' + next.days + ' дн., осталось ' + (next.days - days) + '.' : ' Ты прошёл весь курс — это мощно!');
}

function kettlebellText(weeks) {
  return '💪 <b>Гиря 3 из 3 на этой неделе!</b>' + (weeks > 1 ? '\nУже ' + weeks + ' недели подряд — так держать.' : '');
}

function runText(count) {
  return '🏃 <b>' + (count >= 3 ? count + ' пробежки' : 'Две пробежки') + ' на этой неделе — отлично!</b>\nНорма — одна, ты сделал больше.';
}

function clockText_(min) {
  return Math.floor(min / 60) + ':' + (min % 60 < 10 ? '0' : '') + (min % 60);
}

function planText(item, at) {
  return '⏰ <b>Пора: ' + ITEM_LABELS[item] + '</b>\nЗапланировано на ' + clockText_(at) + '.';
}

function ddxSignupText() {
  return '🏋️ <b>Завтра DDX Атлетика.</b>\nСамое время записаться на занятие в понедельник.';
}

function reportText(r) {
  var lines = [
    '📋 <b>Отчёт по ЛФК</b> — с ' + formatSheetDate(r.period.from) + ' по ' + formatSheetDate(r.period.to),
    'Соблюдение режима: <b>' + r.compliance.percent + '%</b> (' + r.compliance.goodDays + ' из ' + r.period.days + ' дн. без пропусков)',
    'Серия: ' + r.streak + ' дн. · рекорд ' + r.bestStreak,
    'Растяжка нерва: ' + r.sessions.stretch + ' · тяга: ' + r.sessions.pull + ' · упор: ' + r.sessions.push,
    'С таймером: ' + r.sessions.timed + ' упражнений',
    'Тяга: ' + (r.phase.phase === 'static' ? 'статика, занятие ' + (r.phase.done + 1) + ' из ' + r.phase.staticSessions : 'динамика'),
  ];
  if (r.pain.series.length) {
    lines.push('Боль (0–10): средняя за неделю ' + (r.pain.avg7 === null ? '—' : r.pain.avg7) + ', максимум ' + r.pain.max);
    lines.push('Последние оценки: ' + r.pain.series.slice(-7).map(function (x) { return formatSheetDate(x.date).slice(0, 5) + ' — ' + x.value; }).join(', '));
  } else {
    lines.push('Боль: оценок пока нет');
  }
  if (r.misses.length) {
    lines.push('Пропуски: ' + r.misses.slice(-10).map(function (m) {
      return formatSheetDate(m.date).slice(0, 5) + ' (' + m.items.map(function (it) { return ITEM_LABELS[it]; }).join(', ') + ')';
    }).join('; '));
  } else {
    lines.push('Пропусков нет 🎉');
  }
  lines.push('До конца курса: ' + r.daysLeft + ' дн.');
  return lines.join('\n');
}

// ---- settings.js
// Серверные настройки: время растяжки днём и окна напоминаний для ЛФК и для гири.
// Хранятся в Script Property SETTINGS. Значения ограничены, чтобы напоминания не вышли за сутки
// (последнее напоминание — за 15 минут до конца окна, окно срабатывания 30 минут, поэтому конец ≤ 23:45).

var WINDOW_MIN_FROM = 6 * 60;
var WINDOW_MAX_TO = 23 * 60 + 45;
var WINDOW_MIN_LEN = 30;
var STRETCH_MIN = 6 * 60;
var STRETCH_MAX = 22 * 60;
var DEFAULT_WINDOW = { from: 20 * 60, to: 23 * 60 };
var DEFAULT_RUN_WINDOW = { from: 17 * 60, to: 19 * 60 };
var DEFAULT_STRETCH_AT = 13 * 60;
var DEFAULT_DDX_AT = 19 * 60; // воскресное напоминание записаться на DDX

function isMinutes_(v) {
  return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
}

function normalizeWindow_(w, def) {
  if (w && typeof w === 'object' && isMinutes_(w.from) && isMinutes_(w.to) &&
      w.from >= WINDOW_MIN_FROM && w.to <= WINDOW_MAX_TO && w.to - w.from >= WINDOW_MIN_LEN) {
    return { from: w.from, to: w.to };
  }
  return { from: def.from, to: def.to };
}

function normalizeSettings(v) {
  var src = v && typeof v === 'object' ? v : {};
  // Формат до 1.7.0: одно время eveAt → окно eveAt … eveAt + 3 ч для обоих.
  var legacy = isMinutes_(src.eveAt) && !src.lfk && !src.kb
    ? { from: src.eveAt, to: Math.min(src.eveAt + 180, WINDOW_MAX_TO) } : null;
  return {
    stretchAt: isMinutes_(src.stretchAt) && src.stretchAt >= STRETCH_MIN && src.stretchAt <= STRETCH_MAX ? src.stretchAt : DEFAULT_STRETCH_AT,
    ddxAt: isMinutes_(src.ddxAt) && src.ddxAt >= STRETCH_MIN && src.ddxAt <= STRETCH_MAX ? src.ddxAt : DEFAULT_DDX_AT,
    lfk: normalizeWindow_(src.lfk || legacy, DEFAULT_WINDOW),
    kb: normalizeWindow_(src.kb || legacy, DEFAULT_WINDOW),
    run: normalizeWindow_(src.run, DEFAULT_RUN_WINDOW),
  };
}

function loadSettings(props) {
  try {
    return normalizeSettings(JSON.parse(props.get('SETTINGS') || 'null'));
  } catch (e) {
    return normalizeSettings(null);
  }
}

function saveSettings(props, v) {
  var s = normalizeSettings(v);
  props.set('SETTINGS', JSON.stringify(s));
  return s;
}

// ---- plans.js
// Планы на спорт: «запланировать гирю / DDX / бег / теннис на дату и время».
// Хранятся в Script Property PLANS как JSON-массив; в нужный момент бот напоминает.

var PLAN_ITEMS = ['kettlebell', 'ddx', 'run', 'tennis'];
var PLAN_MAX_DAYS = 60;
var PLAN_MAX_COUNT = 40;
var PLAN_MIN_AT = 6 * 60;
var PLAN_MAX_AT = 23 * 60 + 45;

function planId_(item, date, at) {
  return date + '@' + at + ':' + item;
}

function loadPlans(props) {
  var raw;
  try { raw = JSON.parse(props.get('PLANS') || '[]'); } catch (e) { raw = []; }
  if (!Array.isArray(raw)) return [];
  return raw.filter(function (p) {
    return p && PLAN_ITEMS.indexOf(p.item) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && typeof p.at === 'number';
  }).map(function (p) { return { id: planId_(p.item, p.date, p.at), item: p.item, date: p.date, at: p.at }; });
}

function savePlans(props, plans) {
  var sorted = plans.slice().sort(function (a, b) { return a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1; });
  props.set('PLANS', JSON.stringify(sorted.slice(0, PLAN_MAX_COUNT)));
}

// Предстоящие планы (дата не раньше сегодняшней), по порядку.
function upcomingPlans(plans, todayIso) {
  return plans.filter(function (p) { return p.date >= todayIso; })
    .sort(function (a, b) { return a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1; });
}

function addPlan(props, now, req) {
  var info = mskInfo(now);
  if (PLAN_ITEMS.indexOf(req.item) < 0) return { error: 'bad_item' };
  var date = req.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < info.date || date > addDays(info.date, PLAN_MAX_DAYS)) return { error: 'bad_date' };
  var at = req.at;
  if (typeof at !== 'number' || Math.floor(at) !== at || at < PLAN_MIN_AT || at > PLAN_MAX_AT || (date === info.date && at <= info.minutes)) return { error: 'bad_time' };
  var plan = { id: planId_(req.item, date, at), item: req.item, date: date, at: at };
  var plans = loadPlans(props).filter(function (p) { return !(p.item === req.item && p.date === date); });
  plans.push(plan);
  savePlans(props, plans);
  return { ok: true, plan: plan };
}

function removePlan(props, id) {
  var plans = loadPlans(props);
  var next = plans.filter(function (p) { return p.id !== id; });
  if (next.length !== plans.length) savePlans(props, next);
  return next.length !== plans.length;
}

// Сделали — план на этот день по этому упражнению больше не нужен.
function clearPlansFor(props, date, item) {
  if (PLAN_ITEMS.indexOf(item) < 0) return;
  var plans = loadPlans(props);
  var next = plans.filter(function (p) { return !(p.item === item && p.date === date); });
  if (next.length !== plans.length) savePlans(props, next);
}

// ---- api.js
// API мини-приложения и общая логика отметок (используется и ботом).

// pullPush оставлен для кнопок в уже отправленных сообщениях версии 1.0.x.
var MARKABLE_ITEMS = ['stretch', 'pull', 'push', 'pullPush', 'kettlebell', 'ddx', 'run', 'tennis'];
var TIMED_ITEMS = ['stretch', 'pull', 'push'];

function applyMark(repo, now, iso, item, value, confirm, timed) {
  var today = mskInfo(now).date;
  if (iso !== today && iso !== addDays(today, -1)) return { error: 'bad_date' };
  if (MARKABLE_ITEMS.indexOf(item) < 0) return { error: 'bad_item' };
  var isSession = item === 'pull' || item === 'push' || item === 'pullPush';
  if (isSession && value && !confirm && dayPlan(repo.readHistory(), iso).pullPush === 'rest') {
    return { needsConfirm: true };
  }
  repo.setMark(iso, item, !!value, !!timed && TIMED_ITEMS.indexOf(item) >= 0);
  repo.paintDay(iso);
  return { ok: true };
}

// Подпись упражнения: дозировка (что делать) и короткие метки (состояние).
// Оценка боли 0–10 (целое) за сегодня или вчера.
function applyPain(repo, now, iso, value) {
  var today = mskInfo(now).date;
  if (iso !== today && iso !== addDays(today, -1)) return { error: 'bad_date' };
  if (typeof value !== 'number' || Math.floor(value) !== value || value < 0 || value > 10) return { error: 'bad_value' };
  repo.setPain(iso, value);
  return { ok: true };
}

function itemInfo_(item, status, week, phase) {
  var weekTag = function (n) { return 'неделя ' + n + '/' + WEEKLY_NORM; };
  if (item === 'pull' || item === 'push') {
    var dose = item === 'push' ? '45 с × 3' : phase.phase === 'static' ? 'статика 45 с × 3' : 'динамика 10 × 3';
    if (status === 'rest') return { dose: dose, tags: ['отдых'] };
    var tags = [];
    if (item === 'pull' && phase.phase === 'static') tags.push('этап ' + (phase.done + 1) + '/' + phase.staticSessions);
    tags.push(status === 'optional' ? 'по желанию' : weekTag(week.pullPush));
    return { dose: dose, tags: tags };
  }
  if (item === 'kettlebell') {
    if (status === 'off') return { dose: '', tags: ['сегодня DDX'] };
    return { dose: '', tags: status === 'optional' ? ['по желанию', weekTag(week.kettlebell)] : [weekTag(week.kettlebell)] };
  }
  if (item === 'stretch') return { dose: '10 × 5 с, отдых 10 с', tags: ['каждый день'] };
  if (item === 'ddx') return { dose: '', tags: ['по понедельникам'] };
  if (item === 'tennis') {
    var t = week.tennis;
    return { dose: '', tags: [t >= 2 ? 'неделя ' + t + ' · отлично' : t === 1 ? 'неделя 1/' + TENNIS_GOAL + ' · хорошо' : 'неделя 0/' + TENNIS_GOAL] };
  }
  if (item === 'run') {
    var n = week.run;
    return { dose: '', tags: [n >= 2 ? 'неделя ' + n + ' · отлично' : weekTag(n).replace('/' + WEEKLY_NORM, '/' + RUN_NORM)] };
  }
  return { dose: '', tags: ['по желанию'] };
}

function dayView_(history, iso, todayIso, launchIso) {
  var st = dayStatus(history, iso, todayIso, launchIso);
  var pain = history[iso] && typeof history[iso].pain === 'number' ? history[iso].pain : null;
  var week = weekCounts(history, iso);
  var phase = pullPhase(history, iso);
  return {
    date: iso,
    weekdayName: weekdayNameRu(iso),
    pain: pain,
    list: EXERCISES.map(function (ex) {
      var planKey = ex.item === 'pull' || ex.item === 'push' ? 'pullPush' : ex.item;
      var status = st.plan[planKey] || 'optional';
      return {
        item: ex.item,
        label: ex.label,
        group: ex.group,
        status: status,
        done: st.done[ex.item],
        timed: !!(history[iso] && history[iso][ex.item + 'Timed']),
        dose: itemInfo_(ex.item, status, week, phase).dose,
        tags: itemInfo_(ex.item, status, week, phase).tags,
      };
    }),
  };
}

function buildState_(repo, now, month, deps) {
  var history = repo.readHistory();
  var today = mskInfo(now).date;
  var m = /^\d{4}-\d{2}$/.test(month || '') ? month : today.slice(0, 7);
  var calendar = calendarMonth(history, +m.slice(0, 4), +m.slice(5, 7), today, repo.launchDate);
  var days = {};
  Object.keys(calendar).forEach(function (iso) {
    if (iso > today) return;
    var s = dayStatus(history, iso, today, repo.launchDate);
    var hm = history[iso] || {};
    days[iso] = {
      done: s.done,
      misses: s.misses,
      plan: s.plan,
      timed: { stretch: !!hm.stretchTimed, pull: !!hm.pullTimed, push: !!hm.pushTimed },
      pain: typeof hm.pain === 'number' ? hm.pain : null,
    };
  });
  return {
    version: VERSION,
    today: dayView_(history, today, today, repo.launchDate),
    yesterday: dayView_(history, addDays(today, -1), today, repo.launchDate),
    progress: progressSummary(history, today, repo.launchDate),
    pullPhase: pullPhase(history, today),
    month: m,
    calendar: calendar,
    settings: loadSettings(deps.props),
    plans: upcomingPlans(loadPlans(deps.props), today),
    calDays: calendarDays(history, +m.slice(0, 4), +m.slice(5, 7), today, repo.launchDate),
    course: courseDays(history, today, repo.launchDate),
    days: days,
  };
}

function handleApi(req, deps) {
  var auth = verifyInitData(req.initData, deps.botToken, Math.floor(deps.now.getTime() / 1000), deps.hmac);
  if (!auth.ok || auth.userId !== String(deps.allowedUserId)) return { error: 'forbidden' };
  return dispatchApi(req, deps);
}

// Обработка запросов без проверки подписи — её делает handleApi; то же самое выполняет тестовая песочница в приложении.
function dispatchApi(req, deps) {
  if (req.action === 'snapshot') {
    return { snapshot: { history: deps.repo.readHistory(), launchDate: deps.repo.launchDate, settings: loadSettings(deps.props), plans: loadPlans(deps.props), version: VERSION } };
  }
  if (req.action === 'state') return buildState_(deps.repo, deps.now, req.month, deps);
  if (req.action === 'saveSettings') return { ok: true, settings: saveSettings(deps.props, req.settings) };
  if (req.action === 'pain') return applyPain(deps.repo, deps.now, req.date, req.value);
  if (req.action === 'plan') return addPlan(deps.props, deps.now, req);
  if (req.action === 'unplan') return { ok: removePlan(deps.props, req.id) };
  if (req.action === 'report') return { report: buildReport(deps.repo.readHistory(), mskInfo(deps.now).date, deps.repo.launchDate) };
  if (req.action === 'sendReport') {
    var rep = buildReport(deps.repo.readHistory(), mskInfo(deps.now).date, deps.repo.launchDate);
    var res = deps.tg && deps.tg.sendMessage(deps.chatId, reportText(rep));
    return res && res.message_id ? { ok: true } : { error: 'send_failed' };
  }
  if (req.action === 'mark') {
    var r = applyMark(deps.repo, deps.now, req.date, req.item, req.value, req.confirm, req.timed);
    if (!r.ok) return r;
    if (req.value) clearPlansFor(deps.props, req.date, req.item);
    return { ok: true, state: buildState_(deps.repo, deps.now, req.month, deps) };
  }
  return { error: 'bad_action' };
}

return { dispatch: dispatchApi, mskInfo: mskInfo, VERSION: VERSION };
})();
