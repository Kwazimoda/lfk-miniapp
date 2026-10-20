// Подсказки по упражнениям ЛФК — по записям с приёма реабилитолога.
(function (root) {
  var PAIN = 'Нагрузку подбирать так, чтобы боль была не выше 3–4 из 10. Хорошо, если через 10–15 секунд она притупляется.';
  var REST = 'Тяга и упор — 3 раза в неделю, между занятиями 1–2 дня отдыха для восстановления.';
  var SETUP = 'Сидя, прижать резинку стопой. Руку согнуть в локте и опереть о колено. Взять резинку ладонью на уровне верхних фаланг пальцев.';

  function hintFor(item, phase) {
    if (item === 'pull') {
      var p = phase || { phase: 'static', done: 0, staticSessions: 6 };
      if (p.phase === 'static') {
        return {
          title: 'Тяга резинки — статика',
          steps: [SETUP, 'Удерживать 45 секунд, 3 подхода.', 'Занятие ' + (p.done + 1) + ' из ' + p.staticSessions + ' на статике, потом — динамика.'],
          notes: [PAIN, REST],
        };
      }
      return {
        title: 'Тяга резинки — динамика',
        steps: [SETUP, 'Сгибать пальцы и кисть с резинкой: 10 повторений, 3 подхода.'],
        notes: [PAIN, REST],
      };
    }
    if (item === 'push') {
      return {
        title: 'Упор на пальцы',
        steps: ['Упереться кончиками пальцев в стол.', 'Удерживать 45 секунд, 3 подхода.'],
        notes: [PAIN, REST],
      };
    }
    if (item === 'stretch') {
      return {
        title: 'Растяжка нерва',
        steps: ['Растяжка ладони с упором о голову или о стену.', '10 раз, каждый день — в любое время.'],
        notes: [],
      };
    }
    return null;
  }

  var COURSE_NOTE = 'Делать минимум 3 месяца, дальше по самочувствию — лучше дольше.';
  var api = { hintFor: hintFor, COURSE_NOTE: COURSE_NOTE };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LfkHints = api;
})(this);
