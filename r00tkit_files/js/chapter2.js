(() => {
'use strict';

const Core = window.R00TKITCore;
const D = window.R00TKITChapter2Data;
if (!Core || !D) return;

const out = (...a) => Core.out(...a);
const fmt = Core.fmt;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

const SP_CAP = 5;
const SKILL_COST_CAP = 5;

let pendingEscape = false;
let mailLock = null;
let mailTimer = null;
let mailKeyBound = false;
let pauseUntil = 0;
let digEl = null;

/* ---------- состояние ---------- */

function createState(){
  return {
    v: 2,
    introSeen: false,
    tutorial: { step: 0, done: false, skillPrompt: false },
    n3x: 0,
    sp: 0,
    virusInfected: 0,
    virusPoints: 0,
    virusRate: 0,
    networks: {},
    skills: { speed:0, depth:0, accuracy:0, autodig:0 },
    case: null,
    sideCase: null,
    digJob: null,
    storyIndex: 0,
    completed: [],
    mail: { nextId: 1, items: [] },
    darknet: { offers: [], hot: null, rumors: [], nextRoll: 0 },
    burnAt: 0,
    burnAlert: false,
    pendingMail: null,
    storyDone: false,
    legacy: null
  };
}

function ensureState(s){
  if (!s) return null;
  if (!s.ch2State) s.ch2State = true;
  s.v = 2;
  if (!s.tutorial || typeof s.tutorial !== 'object') s.tutorial = { step:0, done:false, skillPrompt:false };
  s.tutorial.step = clamp(Math.floor(Number(s.tutorial.step) || 0), 0, 7);
  s.tutorial.done = !!s.tutorial.done;
  if (typeof s.tutorial.skillPrompt !== 'boolean') s.tutorial.skillPrompt = false;
  s.n3x = Math.max(0, Number(s.n3x) || 0);
  s.sp = Math.max(0, Math.floor(Number(s.sp) || 0));
  s.virusInfected = Math.max(0, Math.floor(Number(s.virusInfected) || 0));
  s.virusPoints = Math.max(0, Number(s.virusPoints) || 0);
  s.virusRate = Math.max(0, Number(s.virusRate) || 0);
  if (!s.networks || typeof s.networks !== 'object') s.networks = {};
  if (!s.skills || typeof s.skills !== 'object') s.skills = {};
  for (const id of Object.keys(D.SKILLS)) if (!isFinite(Number(s.skills[id]))) s.skills[id] = 0;
  if (!Array.isArray(s.completed)) s.completed = [];
  if (!s.mail || typeof s.mail !== 'object') s.mail = { nextId:1, items:[] };
  if (!Array.isArray(s.mail.items)) s.mail.items = [];
  if (!s.darknet || typeof s.darknet !== 'object') s.darknet = { offers:[], hot:null, rumors:[], nextRoll:0 };
  if (!Array.isArray(s.darknet.offers)) s.darknet.offers = [];
  if (!Array.isArray(s.darknet.rumors)) s.darknet.rumors = [];
  if (typeof s.burnAlert !== 'boolean') s.burnAlert = false;
  if (typeof s.storyDone !== 'boolean') s.storyDone = false;
  if (!s.case || typeof s.case !== 'object') s.case = null;
  if (!s.sideCase || typeof s.sideCase !== 'object') s.sideCase = null;
  if (!s.digJob || typeof s.digJob !== 'object' ||
      !isFinite(Number(s.digJob.elapsed)) || !isFinite(Number(s.digJob.duration)) ||
      Number(s.digJob.duration) <= 0) s.digJob = null;
  if (!s.pendingMail) s.pendingMail = null;
  return s;
}

function ensure(){ return ensureState(Core.state); }

function stashLegacy(s){
  if (!s || s.legacy) return s;
  s.legacy = {
    chapter1Earned: Math.max(0, Number(s.earned) || 0),
    chapter1Hacks: Math.max(0, Number(s.hacks) || 0),
    archivedAt: Date.now()
  };
  return s;
}

function makeCase(id){
  const tut = D.TUTORIAL_CASES.find(c => c.id === id);
  const def = tut || D.CASES.find(c => c.id === id);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    title: def.title,
    need: def.need,
    digs: def.digs,
    progress: 0,
    story: !tut,
    tutorial: !!tut,
    lore: def.lore || ''
  };
}

function currentCase(c){ return c && c.case ? c.case : null; }
function currentSide(c){ return c && c.sideCase ? c.sideCase : null; }

function ensureStoryCase(c){
  if (!c || c.case || !c.tutorial.done || c.storyDone) return;
  if (c.storyIndex >= D.CASES.length) return;
  if (c.pendingMail || unreadRequired(c)) return;
  c.case = makeCase(D.CASES[c.storyIndex].id);
}

function digDuration(c){
  const speed = Math.min(10, Math.max(0, Number(c.skills.speed) || 0));
  return Math.max(1.25, 2.5 * (1 - speed * 0.05));
}

function bar(p, n){
  const f = clamp(Math.round(p * n), 0, n);
  return '[' + '|'.repeat(f) + '.'.repeat(n - f) + ']';
}

function digTargetName(c, side){
  const target = activeTarget(c, side);
  return (target ? (target.title || target.name) : 'dig').slice(0, 18);
}

function digGain(c, target){
  if (!target) return 0;
  const depth = Math.min(10, Math.max(0, Number(c.skills.depth) || 0));
  return (target.need / target.digs) * (1 + depth * 0.10);
}

function findChance(c){
  const acc = Math.min(10, Math.max(0, Number(c.skills.accuracy) || 0));
  return Math.min(0.55, 0.05 + acc * 0.05);
}

function autodigFraction(c){
  const lvl = Math.min(10, Math.max(0, Number(c.skills.autodig) || 0));
  return Math.min(0.15, 0.05 + lvl * 0.01);
}

function activeTarget(c, side){
  return side ? c.sideCase : c.case;
}

/* ---------- письма ---------- */

function unreadRequired(c){
  return (c.mail.items || []).some(m => m.required && !m.read);
}

function blockByMail(c){
  if (c.pendingMail || unreadRequired(c)){
    out('сначала прочитай письмо: mail', 'err');
    return true;
  }
  return false;
}

function addMail(c, id){
  if (!D.MAILS[id]) return;
  if (c.mail.items.some(m => m.id === id)) return;
  const d = D.MAILS[id];
  c.mail.items.push({
    id,
    from: 'cyberleek',
    subject: d.subject,
    body: d.body,
    read: false,
    required: true,
    at: Date.now()
  });
  c.pendingMail = id;
  Core.note(`НОВОЕ ПИСЬМО\ncyberleek · ${d.subject}`, 'gold', 7000);
  Core.updateBadges();
}

function mailList(c){
  Core.clearConsole();
  out('ПОЧТА · cyberleek', 'head');
  out('');
  if (!c.mail.items.length){
    out('  пусто.', 'dim');
  } else {
    for (const m of c.mail.items){
      out(`  [${m.id}] ${m.subject}${m.read ? '' : ' · новое'}`, m.read ? 'dim' : '');
    }
  }
  out('');
  out('  mail read <id> — открыть письмо · письма не удаляются', 'dim');
  out('');
}

function bindMailKey(){
  if (mailKeyBound) return;
  mailKeyBound = true;
  document.addEventListener('keydown', onMailKey, true);
  document.addEventListener('keyup', onMailKey, true);
  document.addEventListener('pointerdown', onMailPointer, true);
  document.addEventListener('pointerup', onMailPointer, true);
}

function unbindMailKey(){
  if (!mailKeyBound) return;
  mailKeyBound = false;
  document.removeEventListener('keydown', onMailKey, true);
  document.removeEventListener('keyup', onMailKey, true);
  document.removeEventListener('pointerdown', onMailPointer, true);
  document.removeEventListener('pointerup', onMailPointer, true);
}

function onMailKey(e){
  if (!mailLock || mailLock.phase !== 'close') return;
  e.preventDefault();
  e.stopPropagation();
  closeMail();
}

function onMailPointer(e){
  if (!mailLock || mailLock.phase !== 'close') return;
  e.preventDefault();
  e.stopPropagation();
  closeMail();
}

function showMail(c, id){
  const m = c.mail.items.find(x => x.id === id);
  if (!m){ out('нет такого письма. mail — список.', 'err'); return; }
  if (mailLock) return;
  if (Core.state !== c) return;
  out('');
  out('────────────────────────', 'dim');
  out(`ПИСЬМО · ${m.from}`, 'head');
  out('');
  out('  ' + m.subject, '');
  out('');
  for (const line of String(m.body || '').split('\n')) out('  ' + line, '');
  out('');
  Core.setTask('письмо · закрой после прочтения');
  Core.disableInput();
  mailLock = { id, phase: 'wait' };
  const token = c;
  if (mailTimer){ clearTimeout(mailTimer); mailTimer = null; }
  mailTimer = setTimeout(() => {
    mailTimer = null;
    if (!mailLock || Core.state !== token) return;
    mailLock.phase = 'close';
    out('  нажми любую клавишу или кликни, чтобы закрыть.', 'dim');
    out('');
    bindMailKey();
  }, 3000);
}

function closeMail(){
  if (!mailLock) return;
  const c = ensure();
  const id = mailLock.id;
  mailLock = null;
  if (mailTimer){ clearTimeout(mailTimer); mailTimer = null; }
  unbindMailKey();
  const m = c && c.mail.items.find(x => x.id === id);
  if (m) m.read = true;
  if (c && c.pendingMail === id) c.pendingMail = null;
  if (c) ensureStoryCase(c);
  if (c && c.digJob){
    Core.disableInput();
    setTaskFor(c);
    Core.save();
    Core.updateBadges();
    return;
  }
  Core.enableInput();
  Core.focusInput();
  if (c) setTaskFor(c);
  Core.save();
  Core.updateBadges();
  if (c) cmdCase(c);
}

function maybeShowPendingMail(c){
  if (!c || !c.pendingMail || mailLock || Core.cutsceneActive()) return;
  const id = c.pendingMail;
  setTimeout(() => {
    const cur = ensure();
    if (!cur || cur.pendingMail !== id || mailLock || Core.cutsceneActive()) return;
    showMail(cur, id);
  }, 900);
}

/* ---------- HUD / задачи ---------- */

function effectiveVirusRate(c){
  if (!c || c.sp >= SP_CAP) return 0;
  return Number(c.virusRate) || 0;
}

function setTaskFor(c){
  if (!c) return;
  if (!c.tutorial.done){
    const step = c.tutorial.step || 1;
    const p = c.case ? Math.floor(c.case.progress) : 0;
    if (step <= 1) return Core.setTask('ОБУЧЕНИЕ 1/7 · открой darknet: darknet');
    if (step === 2) return Core.setTask('ОБУЧЕНИЕ 2/7 · возьми заказ: darknet take <id>');
    if (step === 3) return Core.setTask(`ОБУЧЕНИЕ 3/7 · копай: dig · ИНФО ${p}/50`);
    if (step === 4) return Core.setTask('ОБУЧЕНИЕ 4/7 · информация собрана. отправь данные хакеру — expose');
    if (step === 5) return Core.setTask('ОБУЧЕНИЕ 5/7 · открой сети: virus');
    if (step === 6) return Core.setTask('ОБУЧЕНИЕ 6/7 · купи сеть ботов');
    if (c.sp < 1) return Core.setTask(`ОБУЧЕНИЕ 7/7 · жди VIRUS ${c.virusPoints.toFixed(1)}/10 (+${effectiveVirusRate(c).toFixed(1)}/с)`);
    if (!c.tutorial.skillPrompt) return Core.setTask('ОБУЧЕНИЕ 7/7 · открой навыки: skills');
    return Core.setTask('ОБУЧЕНИЕ 7/7 · вложи SP в Speed: skills buy 1');
  }
  if (c.pendingMail || unreadRequired(c)) return Core.setTask('новое письмо · открой: mail');
  if (c.case) return Core.setTask(`ИНФО ${c.case.title || c.case.name} · ${Math.floor(c.case.progress)}/${c.case.need}`);
  if (c.storyDone) return Core.setTask('история главы 2 завершена');
  return Core.setTask('case — текущее дело · darknet — заказы');
}

function showStatus(){
  const c = ensure();
  if (!c) return;
  Core.clearConsole();
  const target = c.case;
  out('ТИХАЯ КОМНАТА', 'head');
  out(`  N3X ${c.n3x.toFixed(1)} · SP ${c.sp} · VIRUS ${c.virusPoints.toFixed(1)}/10 ${c.sp >= SP_CAP ? '(пауза, SP максимум)' : '(+' + effectiveVirusRate(c).toFixed(1) + '/с)'} · ${c.virusInfected} ПК`, '');
  out('');
  if (target){
    out(`  дело: ${target.title || target.name} · ${Math.floor(target.progress)}/${target.need}`, '');
  } else if (c.tutorial.done && !c.storyDone){
    out('  дело: нет · case — начать текущее', 'dim');
  } else if (c.storyDone){
    out('  история главы 2 завершена.', 'dim');
  } else {
    out('  обучение: смотри задачу внизу.', 'dim');
  }
  out('');
}

/* ---------- катсцена и старт ---------- */

async function introCutscene(){
  const c = ensure();
  if (!c) return;
  Core.clearConsole();
  Core.setTask('');
  Core.music('gameplay');
  const token = Core.beginCutscene();
  await Core.sleep(600);
  if (!Core.cutAlive(token)) return;
  for (const [who, text] of D.CUTSCENE){
    if (!Core.cutAlive(token)) return;
    await Core.cutLine(who, text, token, '', who === 'hacker' ? 'cyberleek' : 'you');
  }
  if (!Core.cutAlive(token)) return;
  Core.finishCutscene(token);
  c.introSeen = true;
  c.tutorial.step = Math.max(1, c.tutorial.step);
  Core.clearConsole();
  out('ГЛАВА 2 · ТИХАЯ КОМНАТА', 'head');
  out('');
  out('  cyberleek: «Для начала зайди в darknet. Возьми простой заказ.',
      '');
  out('  Пойми, как работает dig. Потом сдай инфу через expose.»', 'dim');
  out('');
  Core.setTask('darknet → возьми тестовый заказ');
  Core.focusInput();
  Core.renderHUD();
  Core.save();
  maybeShowPendingMail(c);
}

function menu(){
  Core.clearConsole();
  out('R00TKIT // ГЛАВА 2', 'head');
  out('');
  out('  ТИХАЯ КОМНАТА', '');
  out('  введите "start" чтобы продолжить', '');
  out('  help — команды', 'dim');
  out('');
}

function start(){
  const c = ensure();
  if (!c) return;
  if (!c.introSeen){ introCutscene().catch(() => {}); return; }
  ensureStoryCase(c);
  showStatus();
  setTaskFor(c);
  Core.hideHints();
  if (c.digJob){
    digEl = null;
    updateDigLine(c);
    Core.disableInput();
  } else {
    Core.focusInput();
  }
  Core.renderHUD();
  Core.save();
  maybeShowPendingMail(c);
}

/* ---------- dig / expose ---------- */

function cmdCase(c){
  Core.clearConsole();
  if (!c.tutorial.done && c.tutorial.step <= 1){
    out('ОБУЧЕНИЕ', 'head');
    out('');
    out('  открой darknet: darknet', 'ok');
    out('');
    setTaskFor(c);
    return;
  }
  ensureStoryCase(c);
  const main = c.case;
  const side = c.sideCase;
  out('ДЕЛА', 'head');
  out('');
  if (main){
    out(`  [main] ${main.title || main.name} · ИНФО ${Math.floor(main.progress)}/${main.need}`, '');
    out(`  ${main.lore || ''}`, 'dim');
  } else if (c.storyDone){
    out('  основная история завершена.', 'dim');
  } else if (!c.tutorial.done){
    out('  обучение: смотри задачу внизу.', 'dim');
  } else {
    out('  основного дела нет. проверь почту или начни case.', 'dim');
  }
  if (side){
    out('');
    out(`  [side] ${side.title} · ИНФО ${Math.floor(side.progress)}/${side.need}`, '');
    out(`  награда: ${side.reward} N3X`, 'dim');
  }
  out('');
  out('  dig — копать основное · dig side — побочное', 'dim');
  out('  expose — сдать при 100% · expose side — побочное', 'dim');
  out('');
  setTaskFor(c);
}

function announceFullInfo(c){
  if (!c.tutorial.done && c.tutorial.step === 3) c.tutorial.step = 4;
  out('ИНФО 100% · информация собрана.', 'ok');
  out('Отправь инфу хакеру - expose', 'ok');
  out('');
}

function updateDigLine(c){
  if (!c || !c.digJob) return;
  if (!digEl || !digEl.isConnected) digEl = out('', 'job');
  const p = clamp(Number(c.digJob.elapsed) / Number(c.digJob.duration), 0, 1);
  digEl.className = 'line job';
  digEl.textContent = `  ${digTargetName(c, c.digJob.side).padEnd(18)} ${bar(p, 18)} ${String(Math.floor(p * 100)).padStart(3)}%`;
}

function finishDigInput(c){
  if (mailLock || (c && (c.pendingMail || unreadRequired(c)))){ Core.disableInput(); return; }
  Core.focusInput();
}

function completeDig(c){
  const job = c.digJob;
  c.digJob = null;
  const target = activeTarget(c, job.side);
  const failed = !!target && target.progress >= target.need * 0.2 && Math.random() < 0.06;
  const gain = target ? digGain(c, target) : 0;
  if (target && !failed) target.progress = Math.min(target.need, target.progress + gain);

  if (digEl){
    if (failed){
      digEl.className = 'line warn';
      digEl.textContent = '  dig провалился · след пустой · прогресс не изменился';
    } else if (target){
      digEl.className = 'line ok';
      digEl.textContent = `  dig: +${gain.toFixed(1)} ИНФО · ИНФО ${Math.floor(target.progress)}/${target.need}`;
    }
    digEl = null;
  }
  if (target && !failed && Math.random() < findChance(c)){
    const found = Math.round(rnd(0.2, 0.8) * 10) / 10;
    c.n3x += found;
    out(`  находка: +${found.toFixed(1)} N3X`, 'gold');
    Core.note(`НАХОДКА · +${found.toFixed(1)} N3X`, 'gold', 6000);
  }
  if (target && !failed && target.progress >= target.need) announceFullInfo(c);
  finishDigInput(c);
  setTaskFor(c);
  Core.save();
  Core.renderHUD();
}

function cmdDig(c, side){
  if (c.digJob) return;
  if (blockByMail(c)) return;
  if (!c.tutorial.done && side){
    out('в обучении доступно только основное дело: dig', 'dim');
    return;
  }
  if (!c.tutorial.done && !c.case){
    out('сейчас обучение: смотри задачу внизу', 'dim');
    return;
  }
  if (!side) ensureStoryCase(c);
  const target = activeTarget(c, side);
  if (!target){
    if (!side && c.sideCase){ out('это побочный заказ. копать: dig side', 'dim'); return; }
    out(side ? 'побочного дела нет. darknet — заказы.' : 'дела нет. darknet — заказы.', 'dim');
    return;
  }
  if (target.progress >= target.need){
    announceFullInfo(c);
    setTaskFor(c);
    return;
  }
  c.digJob = { side: !!side, elapsed: 0, duration: digDuration(c) };
  digEl = null;
  out('');
  updateDigLine(c);
  Core.disableInput();
  Core.save();
}

function cmdExpose(c, side){
  if (c.digJob) return;
  if (blockByMail(c)) return;
  const target = activeTarget(c, side);
  if (!target){
    if (!side && c.sideCase){ out('это побочный заказ. сдать: expose side', 'dim'); return; }
    if (!c.tutorial.done){
      out('сейчас обучение: смотри задачу внизу', 'dim');
      return;
    }
    out(side ? 'побочного дела нет.' : 'дела нет. открой darknet: darknet', 'dim');
    return;
  }
  if (target.progress < target.need){
    out(`ИНФО ${Math.floor(target.progress)}/${target.need}. нужно 100%.`, 'err');
    return;
  }
  if (!side && target.tutorial){
    c.n3x += 5;
    c.case = null;
    c.tutorial.step = 5;
    out('');
    out('[EXPOSE] тестовый заказ сдан · +5.0 N3X', 'ok');
    out('');
    setTaskFor(c);
    Core.save();
    Core.renderHUD();
    return;
  }
  if (side){
    c.n3x += target.reward;
    c.sideCase = null;
    out('');
    out(`[EXPOSE] побочный заказ закрыт · +${target.reward} N3X`, 'ok');
    out('');
    setTaskFor(c);
    Core.save();
    Core.renderHUD();
    return;
  }
  const story = target;
  c.n3x += story.reward;
  c.storyIndex = Math.min(D.CASES.length, c.storyIndex + 1);
  c.completed.push(story.id);
  c.case = null;
  out('');
  out(`[EXPOSE] ${story.title || story.name} сдан · +${story.reward} N3X`, 'ok');
  out('');
  if (c.storyIndex < D.CASES.length){
    const next = makeCase(D.CASES[c.storyIndex].id);
    c.case = next;
    addMail(c, 'm' + (c.storyIndex + 1));
  } else {
    c.storyDone = true;
    addMail(c, 'm7');
  }
  setTaskFor(c);
  Core.save();
  Core.renderHUD();
  maybeShowPendingMail(c);
}

/* ---------- virus ---------- */

function networkPrice(net, owned){
  return Math.round(net.price * Math.pow(1.6, owned));
}

function ownedNetworkCount(c){
  let n = 0;
  for (const net of D.NETWORKS) n += Number(c.networks[net.id]) || 0;
  return n;
}

function recomputeVirus(c){
  let pc = 0, rate = 0;
  for (const net of D.NETWORKS){
    const owned = Number(c.networks[net.id]) || 0;
    if (!owned) continue;
    pc += net.pc * owned;
    for (let i = 0; i < owned; i++) rate += net.rate * Math.pow(0.85, i);
  }
  c.virusInfected = pc;
  c.virusRate = rate;
}

function virusList(){
  const c = ensure();
  if (!c) return;
  Core.clearConsole();
  out('VIRUS · СЕТИ', 'head');
  out('');
  out(`  VIRUS ${c.virusPoints.toFixed(1)}/10 · ${c.sp >= SP_CAP ? 'пауза, SP максимум' : '+' + effectiveVirusRate(c).toFixed(1) + '/с'} · ${c.virusInfected} ПК`, 'dim');
  out('');
  const list = c.tutorial.done ? D.NETWORKS : D.NETWORKS.slice(0, 1);
  for (const net of list){
    const owned = c.networks[net.id] || 0;
    const price = networkPrice(net, owned);
    const addRate = net.rate * Math.pow(0.85, owned);
    out(`  [${net.id}] ${net.label.padEnd(16)} ур.${owned} · ${price} N3X · +${net.pc} ПК · +${addRate.toFixed(1)}/с`, '');
  }
  out('');
  if (!c.tutorial.done){
    out('  остальные сети откроются после обучения.', 'dim');
    out('  virus buy <id>      купить сеть за N3X', 'dim');
  } else {
    out('  virus list          список сетей', 'dim');
    out('  virus buy <id>      купить сеть за N3X', 'ok');
  }
  out('');
}

function cmdVirus(c, args){
  if (!args || !args[0] || args[0] === 'list'){
    virusList();
    c.burnAlert = false;
    if (!c.tutorial.done && c.tutorial.step === 5){
      c.tutorial.step = 6;
      setTaskFor(c);
      Core.save();
    }
    return;
  }
  const what = String(args[0]).toLowerCase();
  if (what !== 'buy'){ virusList(); return; }
  if (blockByMail(c)) return;
  const net = D.NETWORKS.find(n => String(n.id) === String(args[1]) || n.name === String(args[1] || '').toLowerCase());
  if (!net){ out('virus buy <id>. id смотри в virus list.', 'err'); return; }
  if (!c.tutorial.done && net.id !== 1){
    out('во время обучения доступна только сеть ботов: virus buy 1', 'dim');
    return;
  }
  if (!c.tutorial.done && (c.networks[1] || 0) >= 1){
    out('для обучения хватит одной сети. остальные — после.', 'dim');
    return;
  }
  const owned = c.networks[net.id] || 0;
  const price = networkPrice(net, owned);
  if (c.n3x < price){ out(`нужно ${price} N3X. не хватает ${(price - c.n3x).toFixed(1)}.`, 'err'); return; }
  c.n3x -= price;
  c.networks[net.id] = owned + 1;
  recomputeVirus(c);
  out(`[VIRUS] ${net.label} · +${net.pc} ПК · +${(net.rate * Math.pow(0.85, owned)).toFixed(1)}/с`, 'ok');
  out(`  VIRUS ${c.virusPoints.toFixed(1)}/10 · ${c.sp >= SP_CAP ? 'пауза, SP максимум' : '+' + effectiveVirusRate(c).toFixed(1) + '/с'} · ${c.virusInfected} ПК`, 'dim');
  if (!c.tutorial.done && c.tutorial.step >= 5 && c.tutorial.step <= 6){
    c.tutorial.step = 7;
    out('  [ОБУЧЕНИЕ] сеть поставлена. жди VIRUS-поинты.', 'dim');
  }
  setTaskFor(c);
  Core.save();
  Core.renderHUD();
}

/* ---------- skills ---------- */

function skillCost(id, level){
  const def = D.SKILLS[id];
  return Math.min(SKILL_COST_CAP, Math.max(1, Math.round(def.base * Math.pow(1.5, level))));
}

function skillKey(value){
  const n = Number(value);
  return D.SKILL_ORDER.find(k => D.SKILLS[k].id === n) || null;
}

function cmdSkills(c, args){
  if (!args || !args[0]){
    Core.clearConsole();
    out('SKILLS', 'head');
    out('');
    out(`  SP: ${c.sp}/${SP_CAP}`, '');
    out('');
    const list = c.tutorial.done ? D.SKILL_ORDER : ['speed'];
    for (const id of list){
      const def = D.SKILLS[id];
      const lvl = c.skills[id] || 0;
      const cost = lvl >= def.cap ? '—' : skillCost(id, lvl) + ' SP';
      out(`  [${def.id}] ${def.name.padEnd(9)} · цена ${cost} · ${def.desc} · ур.${lvl}`, '');
    }
    out('');
    if (!c.tutorial.done){
      out('  остальные навыки откроются после обучения.', 'dim');
      out('  skills buy <id>      потратить SP', 'dim');
      if (c.tutorial.step === 7 && c.sp > 0){
        c.tutorial.skillPrompt = true;
        setTaskFor(c);
        Core.save();
      }
    } else {
      out('  skills buy <id>      потратить SP', 'ok');
    }
    out('');
    return;
  }
  const what = String(args[0]).toLowerCase();
  if (what !== 'buy'){ out('skills buy <id>', 'err'); return; }
  if (blockByMail(c)) return;
  const id = skillKey(args[1]);
  if (!id){ out('skills buy <id>. id смотри в skills.', 'err'); return; }
  if (!c.tutorial.done && c.tutorial.step < 7){
    out('сейчас обучение: сначала купи сеть ботов: virus buy 1', 'dim');
    return;
  }
  if (!c.tutorial.done && id !== 'speed'){
    out('во время обучения вложи SP в Speed: skills buy 1', 'dim');
    return;
  }
  const def = D.SKILLS[id];
  const lvl = c.skills[id] || 0;
  if (lvl >= def.cap){ out(`${def.name} уже максимальный.`, 'dim'); return; }
  const cost = skillCost(id, lvl);
  if (c.sp < cost){ out(`нужно ${cost} SP. сейчас ${c.sp}.`, 'err'); return; }
  c.sp -= cost;
  c.skills[id] = lvl + 1;
  out(`[SKILL] ${def.name} → ур.${c.skills[id]} · -${cost} SP`, 'ok');
  if (!c.tutorial.done && c.tutorial.step === 7){
    c.tutorial.done = true;
    c.tutorial.step = 7;
    c.tutorial.skillPrompt = false;
    c.storyIndex = 0;
    c.case = makeCase(D.CASES[0].id);
    addMail(c, 'm1');
    out('  [ОБУЧЕНИЕ] готово. дальше — s1mka. письмо в почте.', 'dim');
  }
  setTaskFor(c);
  Core.save();
  Core.renderHUD();
  maybeShowPendingMail(c);
}

/* ---------- darknet ---------- */

function dnMakeOffer(c, id, tpl){
  tpl = tpl || pick(D.DARKNET.offers);
  const title = tpl.replace(/\{(\w+)\}/g, (_, k) => pick(D.DARKNET[k + 's'] || D.DARKNET.nicks));
  const need = 20 + Math.floor(Math.random() * 31);
  return {
    id,
    title,
    need,
    digs: Math.max(3, Math.ceil(need / 5)),
    reward: 1 + Math.floor(Math.random() * 3),
    expires: Date.now() + (20 + Math.floor(Math.random() * 21)) * 60000
  };
}

function dnRoll(c, force){
  const now = Date.now();
  if (!force && now < (c.darknet.nextRoll || 0)) return;
  const pool = D.DARKNET.offers.slice();
  const ids = ['1', '2', '3'];
  c.darknet.offers = ids.map(id => {
    const i = Math.floor(Math.random() * pool.length);
    return dnMakeOffer(c, id, pool.splice(i, 1)[0]);
  });
  c.darknet.rumors = [pick(D.DARKNET.rumors)];
  c.darknet.hot = null;
  if (Math.random() < 0.15){
    const h = pick(D.DARKNET.hot);
    c.darknet.hot = {
      id:'hot',
      title:h.text,
      need:h.need,
      digs:Math.max(5, Math.ceil(h.need / 5)),
      reward:h.reward,
      expires:Date.now() + h.minutes * 60000
    };
  }
  c.darknet.nextRoll = now + 10 * 60000;
}

function dnMenu(c){
  Core.clearConsole();
  out('DARKNET', 'head');
  out('');
  if (!c.tutorial.done){
    for (let i = 0; i < D.TUTORIAL_CASES.length; i++){
      const t = D.TUTORIAL_CASES[i];
      out(`  [${i + 1}] ${t.title} · ${t.need} ИНФО · ${t.reward} N3X`, '');
    }
    out('');
    if (c.tutorial.step <= 1){
      c.tutorial.step = 2;
      setTaskFor(c);
      Core.save();
    }
    return;
  }
  dnRoll(c);
  for (const o of c.darknet.offers){
    const left = Math.max(0, Math.ceil((o.expires - Date.now()) / 60000));
    out(`  [${o.id}] ${o.title} · ${o.need} ИНФО · ${o.reward} N3X · ${left}м`, '');
  }
  if (c.darknet.hot){
    const h = c.darknet.hot;
    const left = Math.max(0, Math.ceil((h.expires - Date.now()) / 60000));
    out(`  [hot] ${h.title} · ${h.need} ИНФО · ${h.reward} N3X · ${left}м`, '');
  }
  out('');
  if (c.darknet.rumors[0]) out(`  слух: ${c.darknet.rumors[0]}`, 'dim');
  out('');
  out('  взять: darknet take <id>', 'ok');
  out('');
}

function cmdDarknet(c, args){
  if (!args || !args[0]){ dnMenu(c); return; }
  if (String(args[0]).toLowerCase() !== 'take'){ dnMenu(c); return; }
  if (blockByMail(c)) return;
  const id = String(args[1] || '').toLowerCase();
  if (!c.tutorial.done){
    let tut = null;
    if (id === 'test') tut = D.TUTORIAL_CASES[0];
    else tut = D.TUTORIAL_CASES[Number(id) - 1] || null;
    if (!tut){
      out('выбери заказ 1–5: darknet take <id>', 'dim');
      return;
    }
    if (c.case && c.case.tutorial){
      out('заказ уже взят. копай: dig', 'dim');
      return;
    }
    Core.clearConsole();
    c.case = makeCase(tut.id);
    c.tutorial.step = 3;
    out(`[DARKNET] заказ взят: ${tut.title} · ${tut.need} ИНФО`, 'ok');
    out('');
    setTaskFor(c);
    Core.save();
    return;
  }
  if (c.sideCase){ out('побочное дело уже идёт. сначала expose side.', 'dim'); return; }
  let offer = c.darknet.offers.find(o => o.id === id);
  if (id === 'hot' && c.darknet.hot) offer = c.darknet.hot;
  if (!offer){ out('нет такого заказа. darknet — список.', 'err'); return; }
  if (offer.expires < Date.now()){
    out('заказ уже исчез.', 'dim');
    dnRoll(c, true);
    return;
  }
  c.sideCase = {
    id: offer.id,
    title: offer.title,
    need: offer.need,
    digs: offer.digs,
    reward: offer.reward,
    progress: 0,
    expires: offer.expires,
    story: false
  };
  if (id === 'hot') c.darknet.hot = null;
  else c.darknet.offers = c.darknet.offers.filter(o => o.id !== id);
  out(`[DARKNET] взято: ${offer.title} · ${offer.need} ИНФО · ${offer.reward} N3X`, 'ok');
  out('  dig side — копать · expose side — сдать.', 'dim');
  setTaskFor(c);
  Core.save();
}

/* ---------- help / reset ---------- */

function help(){
  Core.clearConsole();
  out('ГЛАВА 2 · КОМАНДЫ', 'head');
  out('');
  out('  case      текущее дело        status    состояние', '');
  out('  dig       копать              mail      почта', '');
  out('  expose    сдать данные        help      справка', '');
  out('  darknet   заказы              reset     начать главу 2 заново', '');
  out('  virus     сети', '');
  out('  skills    навыки', '');
  out('');
}

function cmdReset(c, arg){
  if (String(arg || '').toLowerCase() !== 'confirm'){
    out('это сотрёт главу 2 и вернёт её в начало. введи: reset confirm', 'err');
    return;
  }
  Core.restartChapter2();
}

/* ---------- диспетчер ---------- */

function handle(cmd, args, line){
  const s = Core.state;
  if (!s) return false;

  if (Core.chapter !== 2){
    if (s.finished === 'prison' && cmd === 'start'){ prisonEnding(); return true; }
    if (pendingEscape){
      if (cmd === '1' || cmd === 'сбежать'){ pendingEscape = false; escapeToChapter2().catch(() => {}); return true; }
      if (cmd === '2' || cmd === 'остаться'){ pendingEscape = false; prisonEnding(); return true; }
    }
    if (cmd === 'open' && String(args[0] || '').toLowerCase() === 'data.txt'){ openData(); return true; }
    return false;
  }

  const c = ensure();
  if (!c) return false;

  if (pendingEscape){
    if (cmd === '1'){ pendingEscape = false; return true; }
    if (cmd === '2'){ pendingEscape = false; return true; }
  }

  switch(cmd){
    case 'case': cmdCase(c); return true;
    case 'dig': cmdDig(c, String(args[0] || '').toLowerCase() === 'side'); return true;
    case 'expose': cmdExpose(c, String(args[0] || '').toLowerCase() === 'side'); return true;
    case 'darknet': cmdDarknet(c, args); return true;
    case 'virus': cmdVirus(c, args); return true;
    case 'skills': cmdSkills(c, args); return true;
    case 'mail':
      if (String(args[0] || '').toLowerCase() === 'read'){
        const id = String(args[1] || '').toLowerCase();
        if (!id){ mailList(c); return true; }
        showMail(c, id);
      } else {
        mailList(c);
      }
      return true;
    case 'help': help(); return true;
    case 'hints': help(); return true;
    case 'reset': cmdReset(c, args[0]); return true;
    case 'status': showStatus(); return true;
    case 'whoami': out('operator · глава 2 · тихая комната', ''); return true;
    case 'hack': case 'shop': case 'buy': case 'farm': case 'rig': case 'team': case 'move': case 'cool': case 'targets': case 'menu': case 'learn':
      out('в главе 2 этой механики нет. help — команды.', 'dim');
      return true;
    default:
      return false;
  }
}

/* ---------- глава 1 → глава 2 ---------- */

function openData(){
  const s = Core.state;
  if (!s.mails || !s.mails.some(m => m.attachment === 'data.txt')){
    out('файла data.txt нет. проверь почту: mail', 'err');
    return;
  }
  Core.clearConsole();
  out('data.txt', 'head');
  out('');
  out('  координаты: 21.919520, -71.94013', '');
  out('  билет: 3P-0917 · место 13A', '');
  out('  аэропорт: вылет через 6 часов', 'dim');
  out('');
  out('  QR:', 'dim');
  out('  █▀▀▀█ ▄▀▄ █▀▀▀█', 'dim');
  out('  █ ▄ █ ▀▄▀ █ ▄ █', 'dim');
  out('  █▄▄▄█ █▀█ █▄▄▄█', 'dim');
  out('');
  out('  1 — сбежать', '');
  out('  2 — не слушать unknown', '');
  out('');
  pendingEscape = true;
  Core.setTask('решение: 1 — сбежать · 2 — остаться');
  Core.focusInput();
}

function prisonEnding(){
  const s = Core.state;
  s.finished = 'prison';
  s.pendingEscape = false;
  Core.save();
  Core.clearConsole();
  Core.setTask('');
  out('СИГНАЛ ПОТЕРЯН', 'head');
  out('');
  out('ОНИ задержали тебя и везут в тюрьму.', 'err');
  out('тебе приписали 18 статей.', 'err');
  out('срок — 99 лет, без права на досрочное.', 'err');
  out('');
  out('reset confirm — начать заново.', 'dim');
  out('');
}

async function escapeToChapter2(){
  const old = Core.state;
  const nick = old.nick || Core.readNick();
  const next = createState();
  next.started = true;
  next.nick = nick;
  next.legacy = {
    chapter1Earned: Math.max(0, Number(old.earned) || 0),
    chapter1Hacks: Math.max(0, Number(old.hacks) || 0),
    archivedAt: Date.now()
  };
  Core.switchChapter(2, { nextState: next, wipeCh1: true, autoStart: false });
  Core.bootChapter();
  await introCutscene();
}

/* ---------- тик ---------- */

function tick(dt){
  const c = ensure();
  if (!c) return;
  if (Core.cutsceneActive() || mailLock || Core.state !== c) return;
  if (c.pendingMail || unreadRequired(c)) return;
  const now = Date.now();
  dt = clamp(Number(dt) || 0.1, 0, 1);

  // VIRUS passive; пока есть непотраченный SP, не копится
  if (c.sp < SP_CAP && c.virusRate > 0){
    c.virusPoints += c.virusRate * dt;
    if (c.virusPoints >= 10){
      c.virusPoints -= 10;
      c.sp++;
      Core.note('SP +1 · 10 VIRUS сконвертированы', 'ok', 6000);
      Core.updateBadges();
    }
  }

  if (!c.tutorial.done && c.tutorial.step === 3 && c.case && c.case.progress >= c.case.need){
    c.tutorial.step = 4;
    setTaskFor(c);
  }

  // ручной dig с полосой прогресса
  if (c.digJob){
    c.digJob.elapsed = Math.min(c.digJob.duration, Number(c.digJob.elapsed || 0) + dt);
    updateDigLine(c);
    if (c.digJob.elapsed >= c.digJob.duration) completeDig(c);
  } else if (c.case && c.case.progress < c.case.need){
    const gain = digGain(c, c.case);
    const rate = (gain / digDuration(c)) * autodigFraction(c);
    c.case.progress = Math.min(c.case.need, c.case.progress + rate * dt);
  }

  // сгорание сети — только вне обучения и только если сетей больше одной
  if (!c.burnAt) c.burnAt = now + (6 + Math.floor(Math.random() * 5)) * 60000;
  if (now >= c.burnAt){
    c.burnAt = now + (6 + Math.floor(Math.random() * 5)) * 60000;
    if (c.tutorial.done && ownedNetworkCount(c) > 1 && Math.random() < 0.20){
      const alive = D.NETWORKS.filter(net => (Number(c.networks[net.id]) || 0) > 0);
      const burned = pick(alive);
      c.networks[burned.id]--;
      recomputeVirus(c);
      c.burnAlert = true;
      Core.note(`СЕТЬ СГОРЕЛА · ${burned.label}\nдокупи сеть: virus`, 'warn', 8000);
      Core.save();
    }
  }

  // побочные заказы истекают
  if (c.sideCase && c.sideCase.expires && now >= c.sideCase.expires){
    c.sideCase = null;
    Core.note('побочный заказ исчез', 'dim', 6000);
    Core.save();
  }
  if (c.darknet.hot && c.darknet.hot.expires < now){
    c.darknet.hot = null;
    Core.note('горячий заказ истёк', 'dim', 6000);
    Core.save();
  }
  dnRoll(c);
  if (!c.tutorial.done || c.case) setTaskFor(c);
}

/* ---------- экспорт ---------- */

window.R00TKITChapter2 = {
  createState,
  normalizeState: ensureState,
  handle,
  tick,
  menu,
  start,
  introCutscene,
  escapeToChapter2,
  openData: () => openData(),
  mailUnread: () => { const c = ensure(); return !!(c && c.mail.items.some(m => !m.read)); },
  hasSp: () => { const c = ensure(); return !!(c && c.sp > 0); },
  burnAlert: () => { const c = ensure(); return !!(c && c.burnAlert); },
  hotActive: () => { const c = ensure(); return !!(c && c.darknet && c.darknet.hot); },
  resetMail: () => { mailLock = null; if (mailTimer){ clearTimeout(mailTimer); mailTimer = null; } unbindMailKey(); pendingEscape = false; }
};
})();
