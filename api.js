// Запросы к Apps Script. text/plain — чтобы браузер не делал CORS preflight.
(function () {
  var mock = /[?&]mock=1/.test(location.search);

  window.apiCall = function (body) {
    // Тестовый режим: все запросы идут в песочницу на копии данных, на сервер не уходит ничего.
    if (window.LfkTest && window.LfkTest.active) return Promise.resolve(window.LfkTest.call(body));
    if (mock) return Promise.resolve(window.LfkMock.call(body));
    var initData = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || '';
    var payload = Object.assign({}, body, { initData: initData });
    return fetch(window.LFK_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  };

  // Запрос к настоящему серверу в обход тестового режима — нужен только для снимка данных при входе в тест.
  window.apiCallReal = function (body) {
    if (mock) return Promise.resolve(window.LfkMock.call(body));
    var initData = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || '';
    return fetch(window.LFK_CONFIG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({}, body, { initData: initData })) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  };

  window.LFK_MOCK = mock;
})();
