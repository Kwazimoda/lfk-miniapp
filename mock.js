// Фейковые данные для просмотра в браузере: ?mock=1. В Telegram не используется.
(function () {
  var LABELS = {
    stretch: ['Растяжка нерва', 'lfk'], pullPush: ['Тяга резинки + Упор на пальцы', 'lfk'],
    kettlebell: ['Комплекс с гирей', 'sport'], ddx: ['DDX Атлетика', 'sport'], run: ['Пробежка', 'sport'], tennis: ['Теннис', 'sport'],
  };
  var NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  var today = '2026-10-20';
  var marks = { '2026-10-20': { stretch: true }, '2026-10-19': { stretch: true, pullPush: false, ddx: true } };
  var rest = /[?&]rest=1/.test(location.search);

  function view(iso, wd) {
    var m = marks[iso] || {};
    return {
      date: iso, weekdayName: NAMES[wd],
      list: Object.keys(LABELS).map(function (k) {
        var status = k === 'stretch' ? 'required' : k === 'pullPush' ? (rest ? 'rest' : 'required') : k === 'kettlebell' ? (wd === 0 ? 'off' : 'required') : 'optional';
        var note = { stretch: 'каждый день', pullPush: rest ? 'сегодня отдых' : 'по графику сегодня · 1 из 3 за неделю', kettlebell: wd === 0 ? 'сегодня DDX' : '1 из 3 за неделю' }[k] || 'по желанию';
        return { item: k, label: LABELS[k][0], group: LABELS[k][1], status: status, done: !!m[k], note: note };
      }),
    };
  }

  function calendar(month) {
    var out = {}, days = {};
    var colors = { '11': 'none', '12': 'none', '13': 'none', '14': 'none', '15': 'none', '16': 'none', '17': 'none', '18': 'none', '19': 'green', '20': 'today' };
    for (var d = 1; d <= 31; d++) {
      var iso = month + '-' + (d < 10 ? '0' : '') + d;
      if (month !== '2026-10') { out[iso] = 'none'; continue; }
      out[iso] = colors[String(d)] || (d < 19 ? 'none' : 'none');
    }
    if (month === '2026-10') {
      days['2026-10-19'] = { done: { stretch: true, pullPush: true }, misses: [], plan: {} };
      days['2026-10-20'] = { done: { stretch: !!(marks[today] || {}).stretch }, misses: [], plan: {} };
    }
    return { calendar: out, days: days };
  }

  function state(month) {
    var m = month || today.slice(0, 7);
    var cal = calendar(m);
    return {
      version: (window.LFK_CONFIG || {}).version || 'dev',
      today: view(today, 1), yesterday: view('2026-10-19', 0),
      progress: { streak: 1, totalMisses: 0, misses: [], daysLeft: 83, daysDone: 9, daysTotal: 92, week: { pullPush: 1, kettlebell: 1 }, kettlebellShortWeeks: [] },
      month: m, calendar: cal.calendar, days: cal.days,
    };
  }

  window.LfkMock = {
    call: function (body) {
      if (body.action === 'mark') {
        if (rest && body.item === 'pullPush' && body.value && !body.confirm) return { needsConfirm: true };
        (marks[body.date] = marks[body.date] || {})[body.item] = body.value;
        return { ok: true, state: state(body.month) };
      }
      return state(body.month);
    },
  };
})();
