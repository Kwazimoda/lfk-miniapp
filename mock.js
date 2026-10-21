// Фейковые данные для просмотра в браузере: ?mock=1. В Telegram не используется.
(function () {
  var LABELS = {
    stretch: ['Растяжка нерва', 'lfk'], pull: ['Тяга резинки', 'lfk'], push: ['Упор на пальцы', 'lfk'],
    kettlebell: ['Комплекс с гирей', 'sport'], ddx: ['DDX Атлетика', 'sport'], run: ['Бег', 'sport'], tennis: ['Теннис', 'sport'],
  };
  var NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  var today = '2026-10-20';
  var marks = { '2026-10-20': { stretch: true }, '2026-10-19': { stretch: true, pullPush: false, ddx: true } };
  var rest = /[?&]rest=1/.test(location.search);

  function view(iso, wd) {
    var m = marks[iso] || {};
    return {
      date: iso, weekdayName: NAMES[wd], pain: (marks[iso] || {}).pain === undefined ? null : marks[iso].pain,
      list: Object.keys(LABELS).map(function (k) {
        var session = k === 'pull' || k === 'push';
        var status = k === 'stretch' ? 'required' : session ? (rest ? 'rest' : 'required') : k === 'kettlebell' ? (wd === 0 ? 'off' : 'required') : 'optional';
        var note = { stretch: '10 раз · каждый день', pull: 'статика 45 с × 3 · занятие 4 из 6 · 1 из 3 за неделю', push: '45 с × 3 · 1 из 3 за неделю', kettlebell: wd === 0 ? 'сегодня DDX' : '1 из 3 за неделю' }[k] || 'по желанию';
        if (session && rest) note = 'сегодня отдых';
        var dose = { stretch: '10 × 5 с, отдых 10 с', pull: 'статика 45 с × 3', push: '45 с × 3' }[k] || '';
        var tags = { stretch: ['каждый день'], pull: ['этап 4/6', 'неделя 1/3'], push: ['неделя 1/3'], kettlebell: [wd === 0 ? 'сегодня DDX' : 'неделя 1/3'], run: ['неделя 0/1'], ddx: ['по понедельникам'], tennis: ['неделя 0/1'] }[k] || ['по желанию'];
        if (session && rest) tags = ['отдых'];
        return { item: k, label: LABELS[k][0], group: LABELS[k][1], status: status, done: !!m[k], timed: !!m[k + 'Timed'], dose: dose, tags: tags, note: note };
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
      days['2026-10-19'] = { done: { stretch: true, pull: true, push: true, pullPush: true, ddx: true }, misses: [], plan: { pullPush: 'required', kettlebell: 'off' }, timed: { stretch: true, pull: false, push: false } };
      days['2026-10-13'] = { done: { stretch: true, pull: true }, misses: ['push'], plan: { pullPush: 'required' }, timed: { stretch: false, pull: true, push: false } };
      days['2026-10-15'] = { done: { stretch: true, kettlebell: true }, misses: [], plan: { pullPush: 'rest' }, timed: { stretch: true, pull: false, push: false } };
      days['2026-10-20'] = { done: { stretch: !!(marks[today] || {}).stretch }, misses: [], plan: {}, timed: {} };
    }
    return { calendar: out, days: days };
  }

  function calDays(month) {
    var out = {};
    for (var d = 1; d <= 31; d++) {
      var iso = month + '-' + (d < 10 ? '0' : '') + d;
      var o = { p: 0, fill: false, miss: false, today: false, future: false, k: false, s: false, chain: false };
      if (month === '2026-10') {
        if (d > 20) { o.future = true; }
        else if (d === 20) { o.today = true; o.p = 0.33; }
        else if (d >= 14) { o.p = 1; o.fill = d % 2 === 0; o.chain = true; o.k = d % 3 === 0; o.r = d === 16; o.d = d === 12 || d === 19; o.t = d === 17; }
        else if (d === 13) { o.p = 0.66; o.miss = true; }
        else if (d >= 11) { o.p = 0.5; o.k = d === 12; }
      }
      out[iso] = o;
    }
    return out;
  }

  function courseMap() {
    var out = {};
    var d = new Date(Date.UTC(2026, 9, 11));
    while (d <= new Date(Date.UTC(2027, 0, 11))) {
      var iso = d.toISOString().slice(0, 10);
      var day = +iso.slice(8, 10);
      var o = { p: 0, fill: false, miss: false, today: iso === today, future: iso > today };
      if (iso < today && iso >= '2026-10-11') { o.p = day % 5 === 3 ? 0.66 : 1; o.miss = iso === '2026-10-13'; o.fill = day % 2 === 0; }
      out[iso] = o;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }

  var mockPlans = [{ id: '2026-10-22@1170:run', item: 'run', date: '2026-10-22', at: 1170 }];

  var mockSettings = { stretchAt: 780, ddxAt: 1140, lfk: { from: 1200, to: 1380 }, kb: { from: 1200, to: 1380 }, run: { from: 1020, to: 1140 } };

  function state(month) {
    var m = month || today.slice(0, 7);
    var cal = calendar(m);
    return {
      version: (window.LFK_CONFIG || {}).version || 'dev',
      today: view(today, 1), yesterday: view('2026-10-19', 0),
      pullPhase: { phase: 'static', done: 3, staticSessions: 6 },
      settings: mockSettings,
      course: courseMap(),
      plans: mockPlans,
      calDays: calDays(m),
      progress: { bestStreak: 6, kbWeeks: 2, streakStart: '2026-10-15', timed: { timed: 4, total: 5 }, streak: 6, totalMisses: 0, misses: [], daysLeft: 83, daysDone: 9, daysTotal: 92, week: { pullPush: 1, kettlebell: 1, run: 1 }, runWeeks: 2, kettlebellShortWeeks: [] },
      month: m, calendar: cal.calendar, days: cal.days,
    };
  }

  window.LfkMock = {
    call: function (body) {
      if (body.action === 'plan') {
        var plan = { id: body.date + '@' + body.at + ':' + body.item, item: body.item, date: body.date, at: body.at };
        mockPlans = mockPlans.filter(function (p) { return !(p.item === body.item && p.date === body.date); }).concat([plan])
          .sort(function (a, b) { return a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1; });
        return { ok: true, plan: plan };
      }
      if (body.action === 'unplan') {
        mockPlans = mockPlans.filter(function (p) { return p.id !== body.id; });
        return { ok: true };
      }
      if (body.action === 'snapshot') {
        var K = ['stretch', 'pull', 'push', 'kettlebell', 'ddx', 'run', 'tennis'];
        var day = function (list) { var o = {}; K.forEach(function (k) { o[k] = list.indexOf(k) >= 0; }); return o; };
        return { snapshot: {
          launchDate: '2026-10-20',
          history: {
            '2026-10-11': day(['pull', 'push']), '2026-10-13': day(['pull', 'push', 'kettlebell']), '2026-10-15': day(['pull', 'push', 'kettlebell']),
            '2026-10-19': day(['ddx']), '2026-10-20': day(['stretch', 'pull', 'push']), '2026-10-21': day(['stretch']),
          },
          settings: mockSettings, plans: [],
        } };
      }
      if (body.action === 'pain') {
        (marks[body.date] = marks[body.date] || {}).pain = body.value;
        return { ok: true };
      }
      if (body.action === 'report' || body.action === 'sendReport') {
        if (body.action === 'sendReport') return { ok: true };
        return { report: {
          period: { from: '2026-10-20', to: '2026-10-19', days: 9 }, compliance: { goodDays: 8, percent: 89 }, streak: 6, bestStreak: 6,
          sessions: { stretch: 9, pull: 4, push: 4, timed: 7 }, phase: { phase: 'static', done: 3, staticSessions: 6 },
          pain: { series: [{ date: '2026-10-12', value: 5 }, { date: '2026-10-14', value: 4 }, { date: '2026-10-16', value: 4 }, { date: '2026-10-18', value: 3 }, { date: '2026-10-19', value: 2 }], avg7: 3.3, max: 5 },
          misses: [{ date: '2026-10-13', items: ['push'] }], daysLeft: 83, week: { pullPush: 1, kettlebell: 1, run: 1, tennis: 0 },
        } };
      }
      if (body.action === 'saveSettings') {
        mockSettings = body.settings;
        return { ok: true, settings: mockSettings };
      }
      if (body.action === 'mark') {
        if (rest && (body.item === 'pull' || body.item === 'push') && body.value && !body.confirm) return { needsConfirm: true };
        var day = (marks[body.date] = marks[body.date] || {});
        day[body.item] = body.value;
        day[body.item + 'Timed'] = !!(body.value && body.timed);
        return { ok: true, state: state(body.month) };
      }
      return state(body.month);
    },
  };
})();
