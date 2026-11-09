(() => {
  'use strict';

  // Вставь сюда URL веб-приложения Google Apps Script.
  // Пока строка пустая — телеметрия полностью отключена.
  const ENDPOINT = '';

  if (!ENDPOINT) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  const PID_KEY = 'r00tkit_pid_v1';
  const VISITS_KEY = 'r00tkit_visits_v1';
  const TOTAL_KEY = 'r00tkit_total_sec_v1';
  const startedAt = Date.now();

  const readInt = key => {
    try { return Math.max(0, Math.floor(Number(localStorage.getItem(key)) || 0)); } catch (e) { return 0; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  };
  const uid = () => {
    try { return crypto.randomUUID(); } catch (e) {}
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  };

  let playerId = '';
  try { playerId = localStorage.getItem(PID_KEY) || ''; } catch (e) {}
  if (!playerId){ playerId = uid(); write(PID_KEY, playerId); }

  const baseTotal = readInt(TOTAL_KEY);
  const visits = readInt(VISITS_KEY) + 1;
  write(VISITS_KEY, visits);

  function snapshot(){
    const core = window.R00TKITCore;
    if (!core || !core.state) return null;
    const run = core.run || {};
    const s = core.state;
    const nick = (core.readNick && core.readNick()) || s.nick || '';

    if (run.chapter === 2){
      const c = run.ch2 || s;
      const tut = c.tutorial || {};
      const cs = c.case;
      let status;
      if (!tut.done) status = 'обучение ' + (tut.step || 0) + '/7';
      else if (c.storyDone) status = 'история завершена';
      else status = 'в игре';
      if (cs && !tut.done) status += ' · ИНФО ' + Math.floor(cs.progress) + '/' + cs.need;
      return {
        nick,
        chapter: 2,
        status,
        caseTitle: cs ? (cs.title || cs.name || '') : '',
        progress: cs ? Math.floor(cs.progress) + '/' + cs.need : '',
        n3x: Math.round((Number(c.n3x) || 0) * 10) / 10,
        sp: Math.floor(Number(c.sp) || 0),
        virus: Math.round((Number(c.virusPoints) || 0) * 10) / 10,
        level: 0,
        money: 0,
        completed: (c.completed || []).length
      };
    }

    const c = run.ch1 || s;
    let status = 'меню';
    if (c.finished) status = 'финал';
    else if (c.started) status = 'в игре';
    return {
      nick,
      chapter: 1,
      status,
      caseTitle: '',
      progress: '',
      n3x: 0,
      sp: 0,
      virus: 0,
      level: Math.floor(Number(c.level) || 0),
      money: Math.round(Number(c.money) || 0),
      completed: Math.floor(Number(c.hacks) || 0)
    };
  }

  function persistTotal(){
    write(TOTAL_KEY, Math.round(baseTotal + (Date.now() - startedAt) / 1000));
  }

  function send(final){
    const snap = snapshot();
    if (!snap) return;
    const sessionSec = Math.max(0, (Date.now() - startedAt) / 1000);
    const totalSec = baseTotal + sessionSec;
    const body = JSON.stringify({
      ...snap,
      playerId,
      sessionSec,
      totalSec,
      lastSessionMin: Math.round(sessionSec / 6) / 10,
      totalMin: Math.round(totalSec / 6) / 10,
      visits,
      ua: String(navigator.userAgent || '').slice(0, 180)
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }))){
        persistTotal();
        return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body,
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
    persistTotal();
  }

  setTimeout(() => send(false), 8000);
  setInterval(() => send(false), 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden){ send(true); persistTotal(); }
    else send(false);
  });
  window.addEventListener('pagehide', () => { send(true); persistTotal(); });
})();
