(() => {
'use strict';

const intro = document.getElementById('intro');
const log = document.getElementById('intro-log');
const app = document.getElementById('app');
if (!intro || !log || !app) return;

const Nick = window.GarageNick;
const welcome = document.getElementById('welcome');
const welcomeVol = document.getElementById('welcome-vol');
const welcomeVal = document.getElementById('welcome-vol-val');
const welcomeGo = document.getElementById('welcome-go');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const SCRAMBLE = '0123456789abcdef@#$%&_?/\\';

let skipped = false;
let done = false;
let waitingForNick = false;
let login = '';
let hardCap = null;
let fallback = null;
let skipBound = false;

window.GarageIntro = {
  get waitingForNick(){ return waitingForNick; },
  get done(){ return done; },
  makeLeet: value => Nick ? Nick.makeLeet(value) : String(value || '')
};

function addLine(prefix, cls){
  const d = document.createElement('div');
  d.className = 'iline' + (cls ? ' ' + cls : '');
  if (prefix){
    const p = document.createElement('span');
    p.className = 'dim';
    p.textContent = prefix;
    d.appendChild(p);
  }
  const v = document.createElement('span');
  v.className = 'val';
  d.appendChild(v);
  log.appendChild(d);
  return { line: d, val: v };
}

async function type(el, text, base = 100, jitter = 40){
  const line = el.parentElement;
  if (line) line.classList.add('typing');
  for (const ch of text){
    if (skipped) return;
    el.textContent += ch;
    if (window.GarageSound && window.GarageSound.type) window.GarageSound.type(ch);
    let d = base + rnd(-jitter, jitter);
    if (ch === ' ' || ch === '_' || ch === '.' || ch === '@') d += rnd(20, 60);
    if (Math.random() < 0.045) d += rnd(70, 150);
    await sleep(Math.max(25, d));
  }
  if (line) line.classList.remove('typing');
}

async function typeMasked(el, n){
  const line = el.parentElement;
  if (line) line.classList.add('typing');
  for (let i = 0; i < n; i++){
    if (skipped) return;
    el.textContent += '*';
    if (window.GarageSound && window.GarageSound.type) window.GarageSound.type('*');
    let d = rnd(52, 95);
    if (Math.random() < 0.07) d += rnd(70, 130);
    await sleep(d);
  }
  if (line) line.classList.remove('typing');
}

function bindSkip(){
  if (skipBound) return;
  skipBound = true;
  document.addEventListener('keydown', onSkip);
  document.addEventListener('pointerdown', onSkip);
}

function unbindSkip(){
  if (!skipBound) return;
  skipBound = false;
  document.removeEventListener('keydown', onSkip);
  document.removeEventListener('pointerdown', onSkip);
}

function startCaps(){
  clearTimeout(hardCap);
  clearTimeout(fallback);
  // жёсткий лимит: интро не должно затягиваться дольше ~7 секунд
  hardCap = setTimeout(() => { if (!done) finish(); }, 6800);
  // страховка: если сценарий зависнет, меню всё равно откроется
  fallback = setTimeout(() => { if (!done) finish(); }, 12000);
}

function finish(){
  if (done) return;
  done = true;
  skipped = true;
  waitingForNick = false;
  clearTimeout(hardCap);
  clearTimeout(fallback);
  unbindSkip();
  if (window.GarageSound && window.GarageSound.sfx) window.GarageSound.sfx('enter');
  intro.classList.remove('nick-mode');
  intro.classList.add('hide');
  app.classList.add('app-ready');
  if (window.Garage && typeof window.Garage.init === 'function') window.Garage.init();
  setTimeout(() => { intro.style.display = 'none'; }, 450);
}

function onSkip(){
  if (done || waitingForNick) return;
  finish();
}

// первый запуск: даём выставить громкость до интро, чтобы не оглохнуть
function welcomeGate(){
  if (!welcome) return Promise.resolve();

  return new Promise(resolve => {
    const apply = v => {
      const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
      if (welcomeVol) welcomeVol.value = String(n);
      if (welcomeVal) welcomeVal.textContent = String(n);
      if (window.GarageSound && window.GarageSound.setVolume) window.GarageSound.setVolume(n);
    };

    apply(window.GarageSound && window.GarageSound.getVolume ? window.GarageSound.getVolume() : 75);
    if (welcomeVol) welcomeVol.addEventListener('input', () => apply(welcomeVol.value));

    welcome.hidden = false;
    if (welcomeVol) welcomeVol.focus();

    const close = e => {
      if (e && e.type === 'keydown'){
        if (e.key !== 'Enter') return;
        e.preventDefault();
      }
      if (welcomeGo) welcomeGo.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
      welcome.hidden = true;
      if (window.GarageSound && window.GarageSound.music) window.GarageSound.music('menu');
      resolve();
    };

    if (welcomeGo) welcomeGo.addEventListener('click', close);
    document.addEventListener('keydown', close);
  });
}

async function askNick(){
  waitingForNick = true;
  intro.classList.add('nick-mode');
  log.innerHTML = '';

  const ask = document.createElement('div');
  ask.className = 'iline nick-ask';
  const askPrompt = document.createElement('span');
  askPrompt.className = 'dim';
  askPrompt.textContent = '> ';
  const askVal = document.createElement('span');
  askVal.className = 'val';
  askVal.textContent = 'введите свой ник';
  ask.appendChild(askPrompt);
  ask.appendChild(askVal);
  log.appendChild(ask);

  const row = document.createElement('div');
  row.className = 'iline nick-inputline';
  const rowPrompt = document.createElement('span');
  rowPrompt.className = 'dim';
  rowPrompt.textContent = '> ';
  const input = document.createElement('input');
  input.id = 'nick';
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.maxLength = 16;
  input.setAttribute('aria-label', 'ваш ник');
  row.appendChild(rowPrompt);
  row.appendChild(input);
  log.appendChild(row);

  const feedback = document.createElement('div');
  feedback.className = 'iline nick-feedback';
  log.appendChild(feedback);
  input.focus();

  return new Promise(resolve => {
    let busy = false;

    input.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace' || e.key.length === 1){
        if (window.GarageSound && window.GarageSound.type) window.GarageSound.type(e.key);
      }
    });

    input.addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (busy) return;

      const checked = Nick
        ? Nick.validate(input.value)
        : { ok: true, value: String(input.value || '').trim().toLowerCase() };

      if (!checked.ok){
        feedback.textContent = '  ' + checked.error;
        feedback.classList.add('err');
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        return;
      }

      busy = true;
      waitingForNick = false;
      input.disabled = true;
      feedback.textContent = '';
      feedback.classList.remove('err');

      const raw = checked.value;
      const leet = Nick ? Nick.makeLeet(raw) : raw;

      row.remove();
      ask.classList.remove('nick-ask');
      ask.classList.add('nick-result');
      askVal.textContent = '';

      await type(askVal, raw, 50, 18);
      await sleep(240);

      // короткий «взлом»: часть символов на секунду превращается в мусор
      const len = Math.max(raw.length, leet.length);
      for (let step = 0; step < 10; step++){
        let s = '';
        for (let i = 0; i < len; i++){
          if (i >= leet.length) continue;
          if (Math.random() < 0.32){
            s += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
          } else {
            s += leet[i];
          }
        }
        askVal.textContent = s;
        await sleep(45 + Math.random() * 35);
      }

      askVal.textContent = leet;
      ask.classList.add('ok');
      if (Nick && !Nick.write(leet)) console.warn('[R00TKIT] не удалось сохранить ник');
      login = leet;

      await sleep(420);
      log.innerHTML = '';
      intro.classList.remove('nick-mode');
      resolve();
    });
  });
}

async function runLogin(){
  await sleep(250);
  if (skipped) return;

  let l = addLine('> ');
  await type(l.val, 'ssh ' + login + '@10.13.37.7', 30, 14);
  if (skipped) return;
  await sleep(130);
  if (skipped) return;

  l = addLine('login: ');
  await type(l.val, login, 58, 22);
  if (skipped) return;
  await sleep(120);
  if (skipped) return;

  const passLen = 9 + Math.floor(Math.random() * 4);
  l = addLine('password: ');
  await typeMasked(l.val, passLen);
  if (skipped) return;
  await sleep(180);
  if (skipped) return;

  l = addLine('> ');
  await type(l.val, 'проверка ключей', 28, 10);
  if (skipped) return;
  await sleep(180);
  if (skipped) return;
  l.val.textContent += ' ..... ok';
  await sleep(140);
  if (skipped) return;

  l = addLine('> ');
  await type(l.val, 'доступ разрешён', 30, 12);
  l.line.classList.add('ok');
  if (skipped) return;
  await sleep(280);
  finish();
}

async function boot(){
  const stored = Nick ? Nick.read() : '';
  if (stored){
    login = stored;
    bindSkip();
    startCaps();
    await runLogin();
    return;
  }

  await welcomeGate();
  await askNick();
  bindSkip();
  startCaps();
  await runLogin();
}

boot();
})();
