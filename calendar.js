// Сетка календаря: недели с понедельника, null — пустые клетки.
(function (root) {
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function monthGrid(year, month1) {
    var days = new Date(Date.UTC(year, month1, 0)).getUTCDate();
    var lead = (new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay() + 6) % 7;
    var cells = [];
    for (var i = 0; i < lead; i++) cells.push(null);
    for (var d = 1; d <= days; d++) cells.push(year + '-' + pad2(month1) + '-' + pad2(d));
    while (cells.length % 7) cells.push(null);
    var weeks = [];
    for (var j = 0; j < cells.length; j += 7) weeks.push(cells.slice(j, j + 7));
    return weeks;
  }

  function shiftMonth(ym, delta) {
    var y = +ym.slice(0, 4);
    var m = +ym.slice(5, 7) - 1 + delta;
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return y + '-' + pad2(m + 1);
  }

  // Дата «сегодня» по Москве (UTC+3) — по ней приложение замечает смену дня.
  function todayMsk(nowMs) {
    return new Date(nowMs + 3 * 3600000).toISOString().slice(0, 10);
  }

  var api = { monthGrid: monthGrid, shiftMonth: shiftMonth, todayMsk: todayMsk };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkCalendar = api;
})(this);
