/* Forge: start-up. Loads the data, wires the tabs and the hub, and keeps the page honest when the day or the data changes. */
(function () {
  'use strict';
  var FU = window.FU, FG = window.FG, T = window.TS, dk = T.dkey;
  var VIEWS = ['today', 'reset', 'mission', 'stats', 'review', 'setup'];
  FG.load();
  var BG = /[?&]bg=1/.test(location.search), asked = !BG;      /* loaded in the background by the hub: never show the Android prompt from here */
  document.querySelectorAll('#top button').forEach(function (b) { b.onclick = function () { T.haptic(6); FU.go(b.dataset.v); }; });
  /* deep links from the hub (a reminder tapped, a link from another app) */
  window.addEventListener('message', function (e) {
    var d = e.data; if (!d) return;
    if (VIEWS.indexOf(d.goView) >= 0) FU.go(d.goView);
    /* the hub just showed this tab. If it was loaded in the background, the permission question is still open: ask now, in context. */
    if (d.hubRefresh && !asked) { asked = true; FU.initNotif(true).then(function () { return FU.reschedule(); }); }
  });
  /* Goals or Berserker wrote new data, the hub asked for a refresh, or the page came back: read again, unless you are typing */
  T.onData(function () { FG.dropExt(); if (!FU.editing()) FU.render(); FU.rescheduleSoon(); });
  /* a new day or a new part of the day (morning, afternoon, night) while the app stays open */
  var stamp = function () { var n = new Date(), h = n.getHours(); return dk(n) + (h < 12 ? 'm' : h < 18 ? 'a' : 'n'); }, last = stamp();
  setInterval(function () { var s = stamp(); if (s !== last && !FU.editing()) { last = s; FG.dropExt(); FU.render(); } }, 30000);
  FU.go('today');
  FU.initNotif(!BG).then(function () { return FU.reschedule(); });
})();
