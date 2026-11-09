(() => {
'use strict';

const SAVE_KEY = 'r00tkit_save_v2';
const LEGACY_SAVE_KEY = 'garage_idle_v1';
const NICK_KEY = 'r00tkit_nick_v1';
const LEGACY_NICK_KEY = 'garage_nick_v1';
const readNick = () => {
  if (window.R00TKITNick && typeof window.R00TKITNick.read === 'function') return window.R00TKITNick.read();
  try { return String(localStorage.getItem(NICK_KEY) || localStorage.getItem(LEGACY_NICK_KEY) || '').trim().toLowerCase(); }
  catch(e){ return ''; }
};
function adoptNick(value){
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return;
  if (window.R00TKITNick && typeof window.R00TKITNick.write === 'function') window.R00TKITNick.write(raw);
  else { try { localStorage.setItem(NICK_KEY, raw); } catch(e){} }
  S.nick = readNick() || raw;
}
const $ = id => document.getElementById(id);
const logEl = $('log');
const input = $('cmd');
const promptEl = $('prompt');
const hud = $('hud');
const taskEl = $('task');
const hintsEl = $('hints');
const notesEl = $('notes');
const panicEl = $('panic');
const choiceEl = $('choice');
const choiceLog = $('choice-log');
const choiceInput = $('choice-cmd');
const badgeMail = $('badge-mail');
const badgeTeam = $('badge-team');
const badgeSkill = $('badge-skill');
const badgeVirus = $('badge-virus');
const badgeHot = $('badge-hot');
const badgesEl = $('badges');
const netBadge = $('netbadge');

const STAGES = [
  { name:'ГАРАЖ',       host:'home',    cost:0,        mult:1,   slots:1,  lore:'бетон, паяльник и один ноут.' },
  { name:'КВАРТИРА',    host:'flat',    cost:5000,     mult:1.5, slots:2, lore:'съёмная студия. соседи ничего не слышат.' },
  { name:'ДАТА-ЦЕНТР',  host:'dc',      cost:3000000,  mult:3.2, slots:4, lore:'сотни стоек. охлаждение гудит как море.' },
];

const TARGET_VARIANTS = [
  { money:1,    xp:1,    time:0,  heat:0  },
  { money:0.85, xp:0.9,  time:-1, heat:0  },
  { money:1.2,  xp:1.15, time:1,  heat:1  },
  { money:0.95, xp:1,    time:0,  heat:-1 },
];

const TARGET_TIERS = [
  { lvl:1,  money:20,     xp:8,    time:5,  heat:5,  names:['forum.local','chat.hub','paste.bin','wiki.tmp'] },
  { lvl:2,  money:65,     xp:14,   time:6,  heat:6,  names:['shop.mail','drop.box','cdn.node','blog.host'] },
  { lvl:3,  money:180,    xp:26,   time:8,  heat:8,  names:['cams.city','traffic.live','gate.ctrl','metro.cam'] },
  { lvl:4,  money:340,    xp:38,   time:9,  heat:9,  names:['clinic.db','school.portal','library.net','gym.card'] },
  { lvl:5,  money:650,    xp:50,   time:11, heat:10, names:['bank.union','pay.gate','wallet.sync','atm.log'] },
  { lvl:6,  money:1150,   xp:68,   time:12, heat:11, names:['taxi.fleet','courier.track','cargo.man','depot.io'] },
  { lvl:7,  money:2400,   xp:95,   time:14, heat:13, names:['gov.registry','police.db','court.log','tax.file'] },
  { lvl:8,  money:3800,   xp:120,  time:15, heat:14, names:['isp.core','dns.root','fiber.node','relay.zone'] },
  { lvl:9,  money:6000,   xp:150,  time:16, heat:15, names:['media.fm','stream.cdn','radio.wave','podcast.hub'] },
  { lvl:10, money:9500,   xp:190,  time:17, heat:16, names:['corp.hex','holdings.io','board.mail','hr.sys'] },
  { lvl:11, money:14000,  xp:240,  time:18, heat:17, names:['power.grid','water.scada','reactor.log','pipe.ctrl'] },
  { lvl:12, money:20000,  xp:300,  time:19, heat:18, names:['airport.sys','rail.net','port.cargo','flight.db'] },
  { lvl:13, money:29000,  xp:370,  time:20, heat:20, names:['defense.net','radar.zone','drone.ctrl','sat.link'] },
  { lvl:14, money:42000,  xp:460,  time:21, heat:22, names:['exchange.dark','ledger.node','coin.mix','vault.key'] },
  { lvl:15, money:60000,  xp:560,  time:22, heat:24, names:['lab.bio','gene.db','pharma.log','trial.sys'] },
  { lvl:16, money:85000,  xp:680,  time:23, heat:26, names:['orbital.ops','launch.ctrl','telemetry.io','dock.sys'] },
  { lvl:17, money:120000, xp:820,  time:24, heat:27, names:['blackbox.ai','neural.core','model.hub','dataset.io'] },
  { lvl:18, money:160000, xp:980,  time:25, heat:28, names:['shadow.gov','agency.file','archive.sec','protocol.x'] },
  { lvl:19, money:210000, xp:1150, time:26, heat:30, names:['sat.grid','uplink.orb','ground.station','signal.net'] },
  { lvl:20, money:300000, xp:1400, time:27, heat:32, names:['core.system','root.access','mainframe.io','singularity'] },
  { lvl:21, money:420000, xp:1800, time:28, heat:33, names:['quantum.core','void.node','dark.pool','echo.net'] },
  { lvl:22, money:600000, xp:2300, time:29, heat:34, names:['mirror.sys','ghost.db','cipher.hub','phantom.io'] },
  { lvl:23, money:850000, xp:3000, time:30, heat:35, names:['zenith.net','apex.core','summit.db','peak.io'] },
  { lvl:24, money:1200000, xp:3900, time:31, heat:36, names:['abyss.node','deep.net','trench.sys','void.db'] },
  { lvl:25, money:1700000, xp:5000, time:32, heat:37, names:['horizon.io','dawn.net','dusk.db','eclipse.sys'] },
  { lvl:26, money:2400000, xp:6500, time:33, heat:38, names:['nebula.core','comet.net','pulsar.db','quasar.io'] },
  { lvl:27, money:3400000, xp:8500, time:34, heat:39, names:['galaxy.sys','star.net','cosmos.db','orbit.io'] },
  { lvl:28, money:4800000, xp:11000, time:35, heat:40, names:['reality.db','matrix.net','dream.sys','mind.io'] },
  { lvl:29, money:6800000, xp:14500, time:36, heat:41, names:['god.node','genesis.db','eden.net','origin.sys'] },
  { lvl:30, money:9500000, xp:19000, time:37, heat:42, names:['singularity.core','omega.net','end.db','zero.io'] },
];

const TARGETS = [];
for (const tier of TARGET_TIERS){
  tier.names.forEach((name, i) => {
    const v = TARGET_VARIANTS[i];
    TARGETS.push({
      id: name,
      name,
      lvl: tier.lvl,
      money: Math.round(tier.money * v.money),
      xp: Math.round(tier.xp * v.xp),
      time: Math.max(3, tier.time + v.time),
      heat: Math.max(1, tier.heat + v.heat)
    });
  });
}

/* ─── БАЛАНС ─── */
const BAL = {
  xpGrowth: 1.38,       // рост требуемого опыта за уровень
  ram: 0.18,            // +% к награде за уровень RAM
  profitSkill: 0.09,    // +% дохода за уровень PROFIT
  ai: 0.10,             // +% ко всему доходу за уровень ИИ
  cpu: 0.15,            // +% скорости за уровень CPU
  speedSkill: 0.08,     // +% скорости за уровень SPEED
  crewSpeed: 0.04,      // +% скорости за члена команды
  maxHackSpeed: 2.5,    // потолок ускорения взлома
  minHackTime: 2,       // минимальная длительность взлома, сек
  rigFlat: 2,           // базовый доход рига, $/с
  rigShare: 0.04,       // доля дохода лучшей цели на риг
  gpu: 0.20,            // +% дохода фермы за уровень GPU
  botShare: 0.12,       // доля дохода цели у ботнета за уровень
  botXpShare: 0.02,     // доля xp цели у ботнета за уровень
  checkEvery: [16, 26], // взломов между проверками
  checkCooldown: 75,    // минимум секунд между проверками
  rareIn: [240, 420],   // пауза между редкими целями, сек
  rareLife: [300, 600], // сколько живёт редкая цель, сек
  rareMult: [5, 10],    // множитель награды редкой цели
  offerIn: [120, 300],  // обновление заявок в команду, сек
  eventIn: [150, 330]   // события команды, сек
};

const RARE_NAMES = [
  'vault.core','black.vault','gold.node','cold.storage','private.ledger',
  'offshore.hub','silent.exchange','ghost.wallet','deep.vault','zero.cash',
  'shadow.bank','clean.safe'
];

const CREW_NAMES = [
  'n0ir','gl1tch','k4rm4','v0id','r3pt1le','sn0w','c0balt','nullbyte',
  'ph4ntom','r00tless','hexa','m0th','bytewolf','c1ph3r','gh0st','t3rm1t',
  'z3ro_day','qu4rk','sh4dow','cr4sh'
];

const CREW_SPECS = {
  ghost:   { name:'GHOST',   desc:'-15% нагрев' },
  rigger:  { name:'RIGGER',  desc:'+25% ферма' },
  cracker: { name:'CRACKER', desc:'+15% взлом' },
  lucky:   { name:'LUCKY',   desc:'+10% шанс x2' },
  broker:  { name:'BROKER',  desc:'+8% доход' }
};

const BRANCHES = {
  style: {
    ghost: { name:'GHOST', desc:'-30% нагрев · -10% доход' },
    aggro: { name:'AGGRO', desc:'+25% доход · +35% нагрев' }
  },
  focus: {
    farmer: { name:'FARMER', desc:'+40% ферма · -10% взлом' },
    hacker: { name:'HACKER', desc:'+25% взлом · -20% ферма' }
  }
};

const MAIL_CHAIN = [
  { at: 15000,  subject:'без темы',        body:'ты копаешь глубже, чем нужно.\nпока это просто наблюдение.' },
  { at: 70000,  subject:'не отвечай',      body:'у тебя есть привычка, которую легко заметить.\nне заводи друзей.' },
  { at: 180000, subject:'смотри назад',    body:'мы видим тебя. пока просто смотрим.\nне доверяй тем, кто предлагает помощь.' },
  { at: 350000, subject:'осталось немного',body:'скоро кто-то постучит.\nне открывай дверь.' }
];

const UPGRADES = [
  { id:'cpu', name:'ПРОЦЕССОР',   base:40,   growth:1.55, desc:l => `+${Math.round(l*BAL.cpu*100)}% скорость взлома` },
  { id:'ram', name:'ПАМЯТЬ',      base:60,   growth:1.60, desc:l => `+${Math.round(l*BAL.ram*100)}% доход со взлома` },
  { id:'gpu', name:'ВИДЕОКАРТА',  base:200,  growth:1.65, desc:l => `+${Math.round(l*BAL.gpu*100)}% доход фермы` },
  { id:'vpn', tag:'COOL', name:'КУЛЕРЫ', base:400,  growth:1.70, desc:l => `-${Math.min(64,l*8)}% нагрев` },
  { id:'bot', name:'БОТНЕТ',      base:1200, growth:1.90, desc:l => l ? `+${Math.round(l*BAL.botShare*100)}% авто-доход` : 'авто-доход и авто-xp' },
  { id:'ai',  name:'ИИ-ЯДРО',     base:5000, growth:2.00, desc:l => `+${Math.round(l*BAL.ai*100)}% ко всему доходу` },
];

const SKILLS = {
  speed:   { name:'SPEED',   desc:'+8% скорость взлома' },
  profit:  { name:'PROFIT',  desc:'+9% весь доход' },
  stealth: { name:'STEALTH', desc:'-8% нагрев' },
  auto:    { name:'AUTO',    desc:'+5% ботнет' },
};

const FILES = {
  'readme.md': 'если ты это читаешь — ты уже в системе.\nцель проста: больше денег, больше мощности, меньше следов.',
  'notes.txt': '1. не светить ip\n2. не брать кредиты\n3. не доверять команде\n4. чай не остывает сам',
  'wallet.dat': 'бинарный мусор. ключи зашифрованы. тебе сюда не надо.',
  'targets.db': 'база целей обновляется с ростом уровня. команда: targets',
};

const CMDS = ['start','help','status','hack','targets','mail','open','menu','shop','buy','farm','rig','team','skills','learn','move','cool','save','load','saves','export','import','clear','reset','hints','whoami','ls','cat','sudo','echo','date','exit'];

const ALIASES = {
  'старт':'start', 'помощь':'help', 'статус':'status', 'ст':'status', 'st':'status',
  'взлом':'hack', 'цели':'targets', 'магазин':'shop', 'купить':'buy',
  'ферма':'farm', 'риг':'rig', 'команда':'team',
  'навыки':'skills', 'учиться':'learn', 'переезд':'move', 'охладить':'cool',
  'сохранить':'save', 'загрузить':'load', 'очистить':'clear', 'сброс':'reset',
  'подсказки':'hints', 'стереть':'wipe', 'выход':'exit', 'почта':'mail',
  'открыть':'open', 'запустить':'open', 'run':'open', 'меню':'menu',
  'сейвы':'saves', 'бэкап':'saves', 'backup':'saves', 'экспорт':'export', 'импорт':'import'
};

const SEED_WORDS = [
  'dolphin','apple','dog','beautiful','air','sea','token','world',
  'shadow','river','cobalt','neon','silent','harbor','copper','matrix',
  'velvet','thunder','orbit','pixel','canyon','amber','frost','quartz',
  'echo','falcon','garden','hollow','ivory','jungle','kernel','lantern'
];
const PHRASE_LEN = 6;
const PHRASE_TIME = 15;

function newState(){
  return {
    started:false, money:0, earned:0, xp:0, level:1, points:0,
    heat:0, stage:0, rigs:0, team:0, hacks:0, playTime:0,
    skills:{ speed:0, profit:0, stealth:0, auto:0 },
    up:{ cpu:0, ram:0, gpu:0, vpn:0, bot:0, ai:0 },
    job:null, admin:false, god:false, lastSave:Date.now(),
    phraseIn:20 + Math.floor(Math.random() * 11), phrase:null, firstSeed:true,
    checkIn:18 + Math.floor(Math.random() * 9), checkAt:0,
    rare:null, rareIn:120 + Math.floor(Math.random() * 120),
    crew:[], offers:[], offerIn:60 + Math.floor(Math.random() * 60),
    eventIn:180 + Math.floor(Math.random() * 150),
    build:{ style:'', focus:'' },
    mails:[], mailNext:0,
    story:0, mailRead:false, choiceOpened:false, choiceResult:'', choiceAt:0,
    tone:'', finished:'', flags:{ backdoor:false, joined:false },
    tutorialDone:false, tutorialStep:0, showHints:false, teamAlert:false,
    nick:readNick()
  };
}

function newRun(){
  return { v:2, chapter:1, ch1:newState(), ch2:null, savedAt:0 };
}

let RUN = newRun();
let S = RUN.ch1;
let booted = false;
let uiReady = false;
let hasSave = false;
let offlineInfo = null;
let jobEl = null;
let phraseEl = null;
let menuEl = null;
let menuKind = null;
let menuRender = null;
let outParent = null;
let history = [];
let histIdx = 0;
let targetIdx = -1;
let stick = true;
let lastTick = Date.now();
let lastTargetsRefresh = 0;
let panic = null;
let transitioning = false;
let choiceMode = null;
let choiceTimer = null;
let choiceSeq = '';
let choiceCanClose = false;
let choiceCloseTimer = null;

const cutscene = { active:false, token:0, nickTimer:null };
let cutSkip = false;
/* ─── СКОРОСТЬ КАТСЦЕНЫ ─── */
const CUT_WPM = 500; // слов в минуту: больше — быстрее, меньше — медленнее
let adminUnlocked = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CUT_GLITCH = ['#','@','%','&','_','0','1','x','§','▓','░','?','!'];

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const sfx = name => { if (window.R00TKITSound) window.R00TKITSound.sfx(name); };
const music = name => { if (window.R00TKITSound) { window.R00TKITSound.setMode(name); window.R00TKITSound.music(name); } };

function fmt(n){
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let out;
  if (n < 1000) out = String(Math.round(n * 10) / 10);
  else {
    const u = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc'];
    let i = -1;
    while (n >= 1000 && i < u.length - 1){ n /= 1000; i++; }
    let val = Math.round(n * 100) / 100;
    if (val >= 1000 && i < u.length - 1){ val /= 1000; i++; }
    out = val.toString() + u[i];
  }
  return (neg ? '-' : '') + out;
}

function fmtHud(n){
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  if (n < 1000) return (neg ? '-' : '') + Math.floor(n);
  const u = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1){ n /= 1000; i++; }
  let val = Math.round(n);
  if (val >= 1000 && i < u.length - 1){ val = Math.round(val / 1000); i++; }
  return (neg ? '-' : '') + val + u[i];
}

function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (h) return `${h}ч ${m}м`;
  if (m) return `${m}м ${s}с`;
  return `${s}с`;
}

function bar(p, w = 18){
  p = clamp(p, 0, 1);
  const n = Math.round(p * w);
  return '[' + '|'.repeat(n) + ' '.repeat(w - n) + ']';
}

function xpNeed(lvl){ return Math.floor(50 * Math.pow(BAL.xpGrowth, lvl - 1)); }
function stage(){ return STAGES[S.stage]; }
function upCost(u){ return Math.floor(u.base * Math.pow(u.growth, S.up[u.id])); }
function rigCost(){ return Math.floor(150 * Math.pow(1.35, S.rigs)); }
function godMult(){ return S.god ? 1000 : 1; }
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const randRange = ([a, b]) => a + Math.random() * (b - a);

function crewCount(spec){ return S.crew.filter(m => m.spec === spec).length; }
function styleIncome(){ return S.build.style === 'aggro' ? 1.25 : S.build.style === 'ghost' ? 0.9 : 1; }
function styleHeat(){ return S.build.style === 'aggro' ? 1.35 : S.build.style === 'ghost' ? 0.7 : 1; }
function focusFarm(){ return S.build.focus === 'farmer' ? 1.4 : S.build.focus === 'hacker' ? 0.8 : 1; }
function focusHack(){ return S.build.focus === 'hacker' ? 1.25 : S.build.focus === 'farmer' ? 0.9 : 1; }

function globalMult(){ return stage().mult * (1 + BAL.ai * S.up.ai) * godMult(); }
function profitMult(){
  return (1 + BAL.profitSkill * S.skills.profit) * (1 + 0.08 * crewCount('broker')) * styleIncome();
}
function hackSpeed(){
  const raw = (1 + BAL.cpu * S.up.cpu) * (1 + BAL.crewSpeed * S.crew.length) * (1 + BAL.speedSkill * S.skills.speed);
  return Math.min(BAL.maxHackSpeed, raw);
}
function hackRewardMult(){
  return (1 + BAL.ram * S.up.ram) * profitMult() * focusHack() * (1 + 0.15 * crewCount('cracker')) * globalMult();
}
function farmRate(){
  if (S.rigs <= 0) return 0;
  const t = bestTarget();
  const rate = t.money / Math.max(1, t.time);
  const perRig = BAL.rigFlat + rate * BAL.rigShare;
  return S.rigs * perRig * (1 + BAL.gpu * S.up.gpu) * profitMult() * focusFarm() * (1 + 0.25 * crewCount('rigger')) * globalMult();
}

function currentTargets(){
  let lvl = 0;
  for (const t of TARGETS) if (t.lvl <= S.level && t.lvl > lvl) lvl = t.lvl;
  const list = TARGETS.filter(t => t.lvl === lvl);
  return list.length ? list : [TARGETS[0]];
}

function bestTarget(){
  const list = currentTargets();
  return list.reduce((a, b) => (b.money / b.time > a.money / a.time ? b : a), list[0]);
}

function nextTarget(){
  const list = currentTargets();
  targetIdx = (targetIdx + 1) % list.length;
  return list[targetIdx];
}

function findTarget(id){
  if (S.rare && S.rare.id === id) return S.rare;
  return TARGETS.find(t => t.id === id) || null;
}

function botRate(){
  if (S.up.bot <= 0) return 0;
  const t = bestTarget();
  return (t.money / t.time) * BAL.botShare * S.up.bot * (1 + 0.05 * S.skills.auto) * profitMult() * globalMult();
}

function botXpRate(){
  if (S.up.bot <= 0) return 0;
  const t = bestTarget();
  return (t.xp / t.time) * BAL.botXpShare * S.up.bot * (1 + 0.05 * S.skills.auto) * (1 + 0.03 * S.stage);
}

function income(){ return farmRate() + botRate(); }
function heatGain(t){
  return t.heat * 1.5
    * clamp(1 - 0.08 * S.up.vpn - 0.08 * S.skills.stealth, 0.15, 1)
    * styleHeat()
    * clamp(1 - 0.15 * crewCount('ghost'), 0.4, 1);
}

/* ---------- уведомления слева ---------- */

const noteQueue = [];
function drainNotes(){
  if (!notesEl) return;
  while (notesEl.childElementCount < 3 && noteQueue.length){
    const n = noteQueue.shift();
    const d = document.createElement('div');
    d.className = 'note' + (n.cls ? ' ' + n.cls : '');
    d.textContent = n.text;
    notesEl.appendChild(d);
    setTimeout(() => { d.remove(); drainNotes(); }, n.ms);
  }
}
function note(text, cls = '', ms = 6000){
  if (!notesEl || cutscene.active || panic || transitioning) return;
  noteQueue.push({ text, cls, ms });
  drainNotes();
}

/* ---------- редкие цели ---------- */

function rareActive(){ return !!S.rare; }

function spawnRare(){
  if (S.rare || cutscene.active || transitioning || panic || !booted || tutActive()) return false;
  const base = bestTarget();
  const mult = randRange(BAL.rareMult);
  const life = Math.round(randRange(BAL.rareLife));
  const name = RARE_NAMES[randInt(0, RARE_NAMES.length - 1)];
  S.rare = {
    id: name, name, rare: true,
    money: Math.round(base.money * mult),
    xp: Math.round(base.xp * 3),
    time: Math.round(base.time * 1.6),
    heat: Math.round(base.heat * 2),
    mult: Math.round(mult * 10) / 10,
    expires: Date.now() + life * 1000
  };
  S.rareIn = randRange(BAL.rareIn);
  out('');
  out(`[RARE] в targets появилась редкая цель: ${name} · x${S.rare.mult}`, 'rare');
  out(`       награда $${fmt(S.rare.money)} · окно ${fmtTime(life)} · hack ${name}`, 'dim');
  out('');
  note(`РЕДКАЯ ЦЕЛЬ\n${name}\nнаграда x${S.rare.mult} · ${fmtTime(life)}\nсмотри: targets`, 'gold', 20000);
  refreshLiveMenu();
  save(true);
  return true;
}

function rareExpire(){
  if (!S.rare) return;
  const r = S.rare;
  S.rare = null;
  const loss = Math.floor(S.money * 0.1);
  S.money = Math.max(0, S.money - loss);
  S.heat = Math.min(100, S.heat + 15);
  out('');
  out(`[RARE] цель ${r.name} ушла. след остыл: -$${fmt(loss)} · нагрев +15%`, 'err');
  out('');
  note(`РЕДКАЯ ЦЕЛЬ УШЛА\n${r.name}\n-$${fmt(loss)} · нагрев +15%`, 'warn', 16000);
  refreshLiveMenu();
  save(true);
}

/* ---------- команда ---------- */

function crewSpecName(spec){ return (CREW_SPECS[spec] || CREW_SPECS.ghost).name; }
function crewSpecDesc(spec){ return (CREW_SPECS[spec] || CREW_SPECS.ghost).desc; }

function makeCrewMember(){
  const free = CREW_NAMES.filter(n => !S.crew.some(m => m.name === n));
  const pool = free.length ? free : CREW_NAMES;
  let name = pool[randInt(0, pool.length - 1)];
  if (!free.length) name += randInt(10, 99);
  const specs = Object.keys(CREW_SPECS);
  return { name, spec: specs[randInt(0, specs.length - 1)] };
}

function rollOffers(){
  const free = CREW_NAMES.filter(n => !S.crew.some(m => m.name === n));
  const count = Math.min(free.length, randInt(1, 4));
  const specs = Object.keys(CREW_SPECS);
  S.offers = [];
  for (let i = 0; i < count; i++){
    const name = free.splice(randInt(0, free.length - 1), 1)[0];
    const spec = specs[randInt(0, specs.length - 1)];
    const cost = Math.floor(600 * Math.pow(2.1, S.crew.length) * (1 + S.stage * 0.4) * (0.8 + Math.random() * 0.4));
    S.offers.push({ id: i + 1, name, spec, cost });
  }
  S.offerIn = randRange(BAL.offerIn);
  refreshLiveMenu();
}

function teamEvent(){
  if (!S.crew.length) return;
  const m = S.crew[randInt(0, S.crew.length - 1)];
  const r = Math.random();
  if (r < 0.32){
    const gain = Math.max(25, income() * 45);
    S.money += gain;
    S.earned += gain;
    out('');
    out(`[TEAM] ${m.name} принёс $${fmt(gain)}.`, 'ok');
    out('');
    note(`TEAM · ${m.name} принёс $${fmt(gain)}`, 'ok');
  } else if (r < 0.55){
    S.crew = S.crew.filter(x => x !== m);
    out('');
    out(`[TEAM] ${m.name} ушёл из команды.`, 'dim');
    out('');
    note(`TEAM · ${m.name} ушёл из команды`, 'dim');
  } else if (r < 0.8){
    const loss = Math.floor(S.money * (0.03 + Math.random() * 0.05));
    S.money = Math.max(0, S.money - loss);
    out('');
    out(`[TEAM] ${m.name} украл $${fmt(loss)} из вашего кошелька.`, 'err');
    out('       он всё ещё в команде. срочно исключите: team', 'err');
    out('');
    note(`TEAM · ${m.name} украл $${fmt(loss)}\nисключите: team`, 'warn', 16000);
  } else {
    S.crew = S.crew.filter(x => x !== m);
    S.heat = Math.min(100, S.heat + 18);
    out('');
    out(`[TEAM] ${m.name} задержан полицией. нагрев +18%.`, 'err');
    out('       он мог сдать вас. проверь состав: team', 'err');
    out('');
    note(`TEAM · ${m.name} задержан\nнагрев +18% · проверь team`, 'warn', 16000);
  }
  if (r >= 0.32) S.teamAlert = true;
  S.team = S.crew.length;
  refreshLiveMenu();
  save(true);
}

/* ---------- письма ---------- */

function choiceMail(){
  return {
    id: 'choice',
    from: 'unknown',
    subject: 'без темы',
    body: 'ты дошёл. это уже ответ.\nвнутри — вопрос. ответишь один раз.',
    attachment: 'choice.exe',
    read: false
  };
}

function deliverMails(){
  while (S.mailNext < MAIL_CHAIN.length && S.earned >= MAIL_CHAIN[S.mailNext].at){
    const m = MAIL_CHAIN[S.mailNext];
    S.mailNext++;
    addMail({ id: 'm' + S.mailNext, from: 'unknown', subject: m.subject, body: m.body, read: false });
    out('');
    out('[MAIL] новое письмо · mail', 'ok');
    out('');
    save(true);
  }
}

function out(text = '', cls = ''){
  const d = document.createElement('div');
  d.className = 'line' + (cls ? ' ' + cls : '');
  d.textContent = text;
  (outParent || logEl).appendChild(d);
  trimLog(); scrollBottom();
  return d;
}

function outHTML(html, cls = ''){
  const d = document.createElement('div');
  d.className = 'line' + (cls ? ' ' + cls : '');
  d.innerHTML = html;
  (outParent || logEl).appendChild(d);
  trimLog(); scrollBottom();
  return d;
}

async function outTyped(text, cls = '', delay = 18){
  const d = document.createElement('div');
  d.className = 'line' + (cls ? ' ' + cls : '');
  (outParent || logEl).appendChild(d);
  trimLog(); scrollBottom();
  for (const ch of text){
    d.textContent += ch;
    scrollBottom();
    await sleep(delay);
  }
  return d;
}

function trimLog(){
  while (logEl.childElementCount > 500){
    const first = logEl.firstElementChild;
    if (first === jobEl) break;
    first.remove();
  }
  if (menuEl && !menuEl.isConnected){
    menuEl = null; menuKind = null; menuRender = null;
  }
}

function renderInto(el, fn){
  const prev = outParent;
  outParent = el;
  try { fn(); } finally { outParent = prev; }
}

function openMenu(kind, renderFn, silent = false){
  if (!silent) sfx('ui_open');
  if (menuEl) menuEl.remove();
  if (!silent) out('//////////////////////////////', 'menu-sep');
  menuEl = document.createElement('div');
  menuEl.className = 'menu-block';
  logEl.appendChild(menuEl);
  menuKind = kind;
  menuRender = renderFn;
  renderInto(menuEl, renderFn);
  scrollBottom(true);
}

function refreshLiveMenu(){
  if (!menuEl || !menuEl.isConnected || !menuRender) return;
  if (!['shop','farm','team','skills','status','targets','mail'].includes(menuKind)) return;
  menuEl.innerHTML = '';
  renderInto(menuEl, menuRender);
}

function scrollBottom(force){
  if (force || stick) logEl.scrollTop = logEl.scrollHeight;
}

logEl.addEventListener('scroll', () => {
  stick = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 40;
});

function echo(line){
  outHTML(`<span class="p">${esc(promptEl.textContent)}</span> ${esc(line)}`);
}

function updatePrompt(){
  promptEl.textContent = `root@${S.nick || 'r00tkit'}:~$`;
}

/* ---------- сохранение ---------- */

function runSnapshot(){
  if (RUN.chapter === 2) RUN.ch2 = S;
  else RUN.ch1 = S;
  return {
    v: 2,
    chapter: RUN.chapter === 2 ? 2 : 1,
    ch1: RUN.ch1,
    ch2: RUN.ch2,
    savedAt: Date.now()
  };
}

function persistLocal(){
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(runSnapshot()));
    localStorage.removeItem(LEGACY_SAVE_KEY);
    localStorage.removeItem(LEGACY_RESET_KEY);
  } catch(e){}
}

function save(quiet = true){
  if (!S.started) return;
  S.lastSave = Date.now();
  RUN.savedAt = S.lastSave;
  persistLocal();
  try { localStorage.removeItem(RESET_KEY); } catch(e){}
  queueExternalSave();
  if (!quiet) out('[SAVE] сессия сохранена.', 'dim');
}

function readSave(){
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return (d && typeof d === 'object') ? d : null;
  } catch(e){ return null; }
}

/* ---------- сохранение: внешний бэкап и перенос ---------- */

const RESET_KEY = 'r00tkit_reset_v1';
const LEGACY_RESET_KEY = 'garage_reset_v1';
const SAVE_FILE = 'r00tkit-save.json';
const SAVE_DB = 'r00tkit_fs';
const SAVE_STORE = 'handles';
const SAVE_DIR_KEY = 'save-dir';
const SAVE_VERSION = 2;

let saveDirHandle = null;
let saveDirStatus = 'off';
let externalLoaded = false;
let externalWriteChain = Promise.resolve();

function savePayload(){
  return {
    app: 'R00TKIT',
    version: SAVE_VERSION,
    savedAt: Date.now(),
    nick: readNick() || S.nick || '',
    state: runSnapshot()
  };
}

function normalizePayload(data){
  if (!data || typeof data !== 'object') return null;
  if (data.state && typeof data.state === 'object'){
    return {
      app: data.app || 'R00TKIT',
      version: Number(data.version) || SAVE_VERSION,
      savedAt: Number(data.savedAt) || Number(data.state.lastSave) || 0,
      nick: String(data.nick || ''),
      state: data.state
    };
  }
  if (data.started !== undefined || data.money !== undefined || data.level !== undefined){
    return {
      app: 'R00TKIT',
      version: SAVE_VERSION,
      savedAt: Number(data.lastSave) || 0,
      nick: '',
      state: data
    };
  }
  return null;
}

function payloadTime(p){
  const st = p && p.state;
  if (st && st.v === 2) return Number(st.savedAt) || Number(st.ch2 && st.ch2.lastSave) || Number(st.ch1 && st.ch1.lastSave) || 0;
  return Number(p && p.state && p.state.lastSave) || Number(p && p.savedAt) || 0;
}

function resetStamp(){
  try { return Number(localStorage.getItem(RESET_KEY) || localStorage.getItem(LEGACY_RESET_KEY)) || 0; }
  catch(e){ return 0; }
}

function shouldIgnoreExternal(payload){
  const stamp = resetStamp();
  return !payload || (stamp > 0 && payloadTime(payload) <= stamp);
}

function downloadText(text, name){
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function idbOpen(){
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)){ reject(new Error('indexedDB недоступен')); return; }
    const req = indexedDB.open(SAVE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAVE_STORE)) db.createObjectStore(SAVE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE, 'readonly');
    const req = tx.objectStore(SAVE_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key, value){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE, 'readwrite');
    tx.objectStore(SAVE_STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function idbDel(key){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE, 'readwrite');
    tx.objectStore(SAVE_STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function ensureWritePermission(){
  if (!saveDirHandle) return false;
  try {
    let perm = await saveDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    perm = await saveDirHandle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted'){
      saveDirStatus = 'ready';
      return true;
    }
  } catch(e){}
  saveDirStatus = 'prompt';
  return false;
}

// записи в один и тот же файл не должны пересекаться: браузер может
// выдать ошибку, если два createWritable() открыты одновременно
function queueExternalSave(){
  if (!saveDirHandle) return externalWriteChain;
  externalWriteChain = externalWriteChain
    .then(() => writeExternalSave())
    .catch(() => false);
  return externalWriteChain;
}

async function writeExternalSave(){
  if (!saveDirHandle) return false;
  try {
    const perm = await saveDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted'){ saveDirStatus = 'prompt'; return false; }
    const fh = await saveDirHandle.getFileHandle(SAVE_FILE, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(savePayload()));
    await w.close();
    saveDirStatus = 'ready';
    return true;
  } catch(e){
    saveDirStatus = 'error';
    console.warn('[R00TKIT] внешний сейв:', e);
    return false;
  }
}

async function readExternalSave(){
  if (!saveDirHandle) return null;
  try {
    const perm = await saveDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted'){ saveDirStatus = 'prompt'; return null; }
    const fh = await saveDirHandle.getFileHandle(SAVE_FILE);
    const text = await (await fh.getFile()).text();
    const payload = normalizePayload(JSON.parse(text));
    saveDirStatus = 'ready';
    return payload;
  } catch(e){
    if (e && e.name === 'NotFoundError') return null;
    if (e && e.name === 'NotAllowedError'){ saveDirStatus = 'prompt'; return null; }
    saveDirStatus = 'error';
    console.warn('[R00TKIT] чтение внешнего сейва:', e);
    return null;
  }
}

async function removeExternalSave(){
  if (!saveDirHandle) return;
  try {
    // сначала дожидаемся уже начатых записей, чтобы файл не появился снова
    await externalWriteChain;
    const perm = await saveDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
    await saveDirHandle.removeEntry(SAVE_FILE);
  } catch(e){
    if (e && e.name !== 'NotFoundError') console.warn('[R00TKIT] удаление внешнего сейва:', e);
  }
}

async function initExternalSave(){
  if (!('indexedDB' in window)){
    saveDirStatus = 'unsupported';
    return false;
  }
  try {
    const handle = await idbGet(SAVE_DIR_KEY);
    if (!handle){
      saveDirStatus = ('showDirectoryPicker' in window) ? 'off' : 'unsupported';
      return false;
    }
    saveDirHandle = handle;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted'){
      saveDirStatus = 'prompt';
      return false;
    }
    saveDirStatus = 'ready';
    const ext = await readExternalSave();
    if (!ext || !ext.state || shouldIgnoreExternal(ext)) return false;

    const local = readSave();
    if (!local || payloadTime(ext) > payloadTime({state:local}) + 800){
      hydrate(ext.state);
      if (ext.nick) adoptNick(ext.nick);
      persistLocal();
      externalLoaded = true;
      return true;
    }
    return false;
  } catch(e){
    saveDirStatus = 'error';
    console.warn('[R00TKIT] init external save:', e);
    return false;
  }
}

async function connectExternalSave(root){
  const dir = (root.name && String(root.name).toLowerCase() === '3percentgames')
    ? root
    : await root.getDirectoryHandle('3percentGames', { create: true });
  saveDirHandle = dir;
  try { await idbSet(SAVE_DIR_KEY, dir); } catch(e){}
  saveDirStatus = 'ready';

  const ext = await readExternalSave();
  if (!ext || !ext.state || shouldIgnoreExternal(ext)) return false;

  const local = readSave();
  if (local && payloadTime(ext) <= payloadTime({state:local}) + 800) return false;

  hydrate(ext.state);
  if (ext.nick) adoptNick(ext.nick);
  persistLocal();
  hasSave = true;
  return true;
}

function applyLoadedState(){
  if (RUN.chapter === 2){
    booted = true;
    hud.style.display = 'flex';
    updatePrompt();
    logEl.innerHTML = '';
    jobEl = null; phraseEl = null;
    document.body.classList.add('chapter2');
    if (window.R00TKITChapter2) window.R00TKITChapter2.start();
    renderHUD();
    save(true);
    return;
  }
  if (S.started) applyOffline();
  if (menuEl) menuEl.remove();
  menuEl = null; menuKind = null; menuRender = null;
  booted = true;
  music('gameplay');
  hud.style.display = 'flex';
  updatePrompt();
  logEl.innerHTML = '';
  jobEl = null;
  phraseEl = null;
  if (S.job) createJobLine();
  if (S.phrase) renderPhrase();
  S.showHints = true;
  applyHints();
  updateTutorialUI();
  renderHUD();
  out('[SAVE] сессия загружена.', 'ok');
  out(`  оператор ${esc(S.nick || '—')} · ${stage().name} · уровень ${S.level}`, 'dim');
  if (offlineInfo){
    out(`[OFFLINE] прошло ${fmtTime(offlineInfo.el)} · начислено $${fmt(offlineInfo.gain)} (50%)`, 'ok');
    offlineInfo = null;
  }
  out('');
  if (S.job) createJobLine();
  save(true);
}

function applyImportedSave(payload, stayInMenu){
  hydrate(payload.state || payload);
  if (payload.nick) adoptNick(payload.nick);
  persistLocal();
  hasSave = true;
  if (stayInMenu && !booted){
    if (S.started) applyOffline();
    menu();
    return;
  }
  applyLoadedState();
}

function pickSaveFile(){
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f){
        const err = new Error('cancelled');
        err.name = 'AbortError';
        reject(err);
        return;
      }
      try { resolve(await f.text()); }
      catch(e){ reject(e); }
    });
    inp.addEventListener('cancel', () => {
      inp.remove();
      const err = new Error('cancelled');
      err.name = 'AbortError';
      reject(err);
    });
    document.body.appendChild(inp);
    inp.click();
  });
}

async function cmdExport(){
  const name = 'r00tkit-save-' + new Date().toISOString().slice(0, 10) + '.json';
  const json = JSON.stringify(savePayload(), null, 2);
  try {
    if ('showSaveFilePicker' in window){
      const fh = await window.showSaveFilePicker({
        suggestedName: name,
        startIn: 'documents',
        types: [{ description: 'R00TKIT save', accept: { 'application/json': ['.json'] } }]
      });
      const w = await fh.createWritable();
      await w.write(json);
      await w.close();
      out(`[SAVE] файл записан: ${fh.name}`, 'ok');
    } else {
      downloadText(json, name);
      out(`[SAVE] файл скачан: ${name}`, 'ok');
    }
    sfx('ui_buy');
  } catch(e){
    if (e && e.name === 'AbortError'){ out('экспорт отменён.', 'dim'); return; }
    // если системный диалог недоступен — обычное скачивание
    downloadText(json, name);
    out(`[SAVE] файл скачан: ${name}`, 'ok');
    sfx('ui_buy');
  }
}

async function cmdImport(args){
  if (cutscene.active || transitioning || panic){
    sfx('ui_error');
    out('сейчас нельзя импортировать сохранение.', 'err');
    return;
  }
  if ((args[0] || '').toLowerCase() !== 'confirm'){
    out('импорт заменит текущий прогресс. введи: import confirm', 'err');
    return;
  }
  try {
    let text;
    if ('showOpenFilePicker' in window){
      const [fh] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'R00TKIT save', accept: { 'application/json': ['.json'] } }]
      });
      text = await (await fh.getFile()).text();
    } else {
      text = await pickSaveFile();
    }
    const payload = normalizePayload(JSON.parse(text));
    if (!payload || !payload.state){
      sfx('ui_error');
      out('это не файл сохранения R00TKIT.', 'err');
      return;
    }
    applyImportedSave(payload, false);
    out('[SAVE] сохранение импортировано.', 'ok');
    sfx('ui_buy');
  } catch(e){
    if (e && e.name === 'AbortError'){ out('импорт отменён.', 'dim'); return; }
    sfx('ui_error');
    out('не удалось прочитать файл: ' + (e.message || e.name), 'err');
  }
}

async function cmdSaves(args){
  const a = (args[0] || '').toLowerCase();

  if (a === 'off'){
    saveDirHandle = null;
    saveDirStatus = 'off';
    try { await idbDel(SAVE_DIR_KEY); } catch(e){}
    out('[SAVES] авто-бэкап отключён. localStorage остаётся.', 'dim');
    return;
  }

  if (a === 'now' || a === 'backup'){
    if (!saveDirHandle){
      sfx('ui_error');
      out('авто-бэкап не подключён. введи: saves on', 'err');
      return;
    }
    if (!S.started){
      out('[SAVES] пока нет активной сессии. введи start — файл появится после старта.', 'dim');
      return;
    }
    if (!(await ensureWritePermission())){
      sfx('ui_error');
      out('нет доступа к папке. введи: saves on и выбери её заново.', 'err');
      return;
    }

    // если в папке лежит более новое сохранение — сначала загружаем его
    let loaded = false;
    const ext = await readExternalSave();
    if (ext && ext.state && !shouldIgnoreExternal(ext)){
      const local = readSave();
      if (!local || payloadTime(ext) > payloadTime({state:local}) + 800){
        applyImportedSave(ext, !booted);
        loaded = true;
      }
    }

    if (await queueExternalSave()){
      out(`[SAVES] записано: 3percentGames\\${SAVE_FILE}`, 'ok');
      if (loaded) out('  сначала загружено более новое сохранение из папки.', 'dim');
      sfx('ui_buy');
    } else {
      sfx('ui_error');
      out('не удалось записать файл. проверь доступ к папке.', 'err');
    }
    return;
  }

  if (a === 'on'){
    if (!('showDirectoryPicker' in window)){
      sfx('ui_error');
      out('этот браузер не умеет авто-бэкап в папку.', 'err');
      out('  используй export / import — они работают везде.', 'dim');
      return;
    }
    try {
      const root = await window.showDirectoryPicker({
        id: 'r00tkit-saves',
        mode: 'readwrite',
        startIn: 'documents'
      });
      const loaded = await connectExternalSave(root);

      if (loaded){
        if (booted) applyLoadedState();
        else {
          if (S.started) applyOffline();
          menu();
        }
      }
      await queueExternalSave();
      if (!S.started && !loaded) out('  файл появится после start — сейчас сохранять нечего.', 'dim');

      out('[SAVES] авто-бэкап подключён.', 'ok');
      out('  папка: 3percentGames (внутри выбранной)', 'dim');
      out(`  файл:  ${SAVE_FILE} · обновляется при каждом сохранении`, 'dim');
      if (loaded) out('  найдено сохранение в папке — загружено более новое.', 'dim');
      sfx('ui_buy');
    } catch(e){
      if (e && e.name === 'AbortError'){ out('выбор папки отменён.', 'dim'); return; }
      sfx('ui_error');
      out('не удалось подключить папку: ' + (e.message || e.name), 'err');
    }
    return;
  }

  out('СОХРАНЕНИЯ', 'head');
  out(`  локально   localStorage · ${hasSave ? 'есть' : 'пусто'}`);
  const st = saveDirStatus === 'ready' ? 'подключён · 3percentGames'
    : saveDirStatus === 'prompt' ? 'нужно разрешение · saves now'
    : saveDirStatus === 'unsupported' ? 'недоступен в этом браузере'
    : saveDirStatus === 'error' ? 'ошибка доступа'
    : 'не подключён';
  out(`  авто-бэкап ${st}`);
  out(`  API        ${('showDirectoryPicker' in window) ? 'доступен' : 'не поддерживается'}`);
  out('');
  out('  saves on     выбрать Documents (создаст 3percentGames)', 'dim');
  out('  saves now    записать сейчас', 'dim');
  out('  saves off    отключить', 'dim');
  out('  export       скачать файл сохранения', 'dim');
  out('  import       загрузить файл (import confirm)', 'dim');
  out('');
}


function hydrateCh1(d){
  S = Object.assign(newState(), d || {});
  S.up = Object.assign({ cpu:0, ram:0, gpu:0, vpn:0, bot:0, ai:0 }, d && d.up || {});
  S.skills = Object.assign({ speed:0, profit:0, stealth:0, auto:0 }, d && d.skills || {});
  S.stage = clamp(Number(S.stage) || 0, 0, STAGES.length - 1);
  S.level = Math.max(1, Math.floor(Number(S.level) || 1));
  S.money = Math.max(0, Number(S.money) || 0);
  S.earned = Math.max(0, Number(S.earned) || 0);
  S.xp = Math.max(0, Number(S.xp) || 0);
  S.points = Math.max(0, Math.floor(Number(S.points) || 0));
  S.heat = clamp(Number(S.heat) || 0, 0, 100);
  S.rigs = Math.max(0, Math.floor(Number(S.rigs) || 0));
  S.team = Math.max(0, Math.floor(Number(S.team) || 0));
  S.crew = Array.isArray(S.crew) ? S.crew.filter(m => m && m.name && CREW_SPECS[m.spec]) : [];
  // старые сейвы хранили только число команды — восстановим состав
  if (!S.crew.length && S.team > 0){
    for (let i = 0; i < Math.min(S.team, 20); i++) S.crew.push(makeCrewMember());
  }
  S.team = S.crew.length;
  S.hacks = Math.max(0, Math.floor(Number(S.hacks) || 0));
  S.playTime = Math.max(0, Number(S.playTime) || 0);
  // старые сохранения без полей обучения считаем пройденными
  const hasTut = !!(d && Object.prototype.hasOwnProperty.call(d, 'tutorialDone'));
  S.tutorialDone = hasTut ? !!d.tutorialDone : true;
  S.tutorialStep = clamp(Math.floor(Number(S.tutorialStep) || 0), 0, 8);
  // подсказки показываются только после команды hints — не восстанавливаем их из сейва
  S.showHints = false;
  S.nick = readNick() || String((d && d.nick) || '');
  S.story = Math.max(0, Math.floor(Number(S.story) || 0));
  S.mailRead = !!S.mailRead;
  S.mails = Array.isArray(S.mails) ? S.mails.filter(m => m && typeof m === 'object') : [];
  // старые сейвы после катсцены: письмо с choice.exe не должно потеряться
  if (S.story > 0 && !S.choiceOpened && !S.mails.some(m => m.attachment === 'choice.exe')){
    addMail(choiceMail(), false);
  }
  S.choiceOpened = !!S.choiceOpened;
  S.choiceResult = typeof S.choiceResult === 'string' ? S.choiceResult : '';
  S.choiceAt = Math.max(0, Number(S.choiceAt) || 0);
  S.tone = typeof S.tone === 'string' ? S.tone : '';
  S.finished = typeof S.finished === 'string' ? S.finished : '';
  S.flags = Object.assign({ backdoor:false, joined:false }, d && d.flags || {});
  S.teamAlert = !!(d && d.teamAlert);
  S.ch2Mail = Object.assign({ m3:false }, d && d.ch2Mail || {});
  if (S.choiceResult) S.choiceOpened = true;
  S.phraseIn = (isFinite(Number(S.phraseIn)) && Number(S.phraseIn) >= 0)
    ? Math.floor(Number(S.phraseIn))
    : rollPhraseIn();
  S.firstSeed = !(d && d.firstSeed === false);
  if (S.phrase && Array.isArray(S.phrase.words) && S.phrase.words.length && isFinite(S.phrase.left)){
    S.phrase.words = S.phrase.words.map(w => String(w).toLowerCase());
    S.phrase.left = Math.max(0, Number(S.phrase.left));
    S.phrase.last = Math.ceil(S.phrase.left);
  } else {
    S.phrase = null;
  }
  if (S.tutorialDone) S.tutorialStep = 8;
  if (S.job){
    const t = findTarget(S.job.id);
    if (!t || !isFinite(S.job.elapsed) || !isFinite(S.job.duration) || S.job.duration <= 0) S.job = null;
    else S.job.name = t.name;
    if (S.job){
      S.job.frozen = !!S.phrase;
      if (S.job.frozen) S.job.freezeAt = 0;
    }
  }
  if (!S.job) S.phrase = null;
}

function migrateOldChapter2(d){
  const ch2 = window.R00TKITChapter2 ? window.R00TKITChapter2.createState() : {};
  ch2.started = true;
  ch2.nick = readNick() || (d && d.nick) || '';
  ch2.introSeen = false;
  ch2.legacy = {
    chapter1Earned: Math.max(0, Number(d && d.earned) || 0),
    chapter1Hacks: Math.max(0, Number(d && d.hacks) || 0),
    archivedAt: Date.now(),
    oldChapter2: true
  };
  return { v:2, chapter:2, ch1:null, ch2 };
}

function hydrate(d){
  if (!d){
    RUN = newRun();
    S = RUN.ch1;
    return;
  }

  if (d.v === 2 && d.ch1 !== undefined){
    RUN = {
      v: 2,
      chapter: d.chapter === 2 ? 2 : 1,
      ch1: d.ch1 || null,
      ch2: d.ch2 || null,
      savedAt: Number(d.savedAt) || 0
    };
    if (RUN.chapter === 2){
      if (!RUN.ch2 && window.R00TKITChapter2) RUN.ch2 = window.R00TKITChapter2.createState();
      S = RUN.ch2 || newState();
      S.started = true;
      S.nick = readNick() || S.nick || '';
      if (window.R00TKITChapter2 && window.R00TKITChapter2.normalizeState){
        RUN.ch2 = window.R00TKITChapter2.normalizeState(S);
        S = RUN.ch2;
      }
    } else {
      if (!RUN.ch1) RUN.ch1 = newState();
      hydrateCh1(RUN.ch1);
      RUN.ch1 = S;
    }
    return;
  }

  if (d.chapter2){
    RUN = migrateOldChapter2(d);
    S = RUN.ch2;
    return;
  }

  RUN = { v:2, chapter:1, ch1:null, ch2:null, savedAt:0 };
  hydrateCh1(d);
  RUN.ch1 = S;
}

function applyOffline(){
  if (!S.started || !S.lastSave) return;
  const el = clamp((Date.now() - S.lastSave) / 1000, 0, 8 * 3600);
  if (el < 60) return;
  const gain = income() * el * 0.5;
  if (gain <= 0) return;
  S.money += gain;
  S.earned += gain;
  offlineInfo = { el, gain };
}

/* ---------- HUD ---------- */

function renderHUD(){
  if (!booted) return;
  if (RUN.chapter === 2){
    const c = S || {};
    const rate = Number(c.virusRate) || 0;
    const points = Number(c.virusPoints) || 0;
    const t = c.case;
    const p = t ? clamp((Number(t.progress) || 0) / (Number(t.need) || 1), 0, 1) : 0;
    const filled = Math.round(p * 10);
    const infoBar = '[' + '|'.repeat(filled) + '.'.repeat(10 - filled) + ']';
    const virusText = Number(c.sp) >= 5
      ? `VIRUS: ${points.toFixed(1)}/10 (пауза, SP максимум) · ${Number(c.virusInfected) || 0} ПК`
      : `VIRUS: ${points.toFixed(1)}/10 (+${rate.toFixed(1)}/с) · ${Number(c.virusInfected) || 0} ПК`;
    $('h-loc').textContent = 'N3X: ' + (Number(c.n3x) || 0).toFixed(1);
    $('h-money').textContent = 'SP: ' + (Number(c.sp) || 0);
    $('h-inc').textContent = virusText;
    $('h-lvl').textContent = t ? `ИНФО ${infoBar} ${Math.floor(t.progress)}/${t.need}` : 'ИНФО [..........] —';
    $('h-xp').textContent = '';
    $('h-heat').textContent = '';
    $('h-heat').classList.remove('hot');
    return;
  }
  const need = xpNeed(S.level);
  $('h-loc').textContent = stage().name;
  const inc = income();
  $('h-money').textContent = '$' + fmtHud(S.money);
  $('h-inc').textContent = '+$' + fmtHud(inc > 0 ? Math.max(1, Math.round(inc)) : 0) + '/с';
  $('h-lvl').innerHTML = 'LVL ' + S.level + (S.points ? ' <span class="pts">(' + S.points + 'оч)</span>' : '');
  $('h-xp').textContent = 'XP ' + Math.floor(clamp(S.xp / need, 0, 1) * 100) + '%';
  $('h-heat').textContent = 'H ' + Math.floor(S.heat) + '%';
  $('h-heat').classList.toggle('hot', S.heat >= 80);
}

function updateBadges(){
  const on = booted && !cutscene.active && !panic;
  const ch2 = RUN.chapter === 2;
  let mail = false, team = false, warn = false, skill = false, virus = false, hot = false;
  if (ch2){
    mail = !!(S.mail && S.mail.items && S.mail.items.some(m => !m.read));
    skill = (Number(S.sp) || 0) > 0;
    virus = !!S.burnAlert;
    hot = !!(S.darknet && S.darknet.hot);
  } else {
    mail = (S.mails || []).some(m => !m.read);
    const offers = (S.offers || []).length > 0 && S.crew.length < stage().slots;
    team = offers || !!S.teamAlert;
    warn = !!S.teamAlert;
    skill = S.points > 0;
  }
  if (badgesEl) badgesEl.classList.toggle('on', on && (mail || team || skill || virus || hot));
  if (netBadge) netBadge.classList.toggle('on', on);
  if (badgeMail) badgeMail.classList.toggle('on', on && mail);
  if (badgeTeam) {
    badgeTeam.classList.toggle('on', on && team);
    badgeTeam.classList.toggle('warn', on && warn);
  }
  if (badgeSkill) badgeSkill.classList.toggle('on', on && skill);
  if (badgeVirus) badgeVirus.classList.toggle('on', on && virus);
  if (badgeHot) badgeHot.classList.toggle('on', on && hot);
}

/* ---------- игровой цикл ---------- */

function checkChapter1Mail(){
  if (!S || RUN.chapter !== 1 || !S.started || S.finished) return;
  if (!S.story) return;
  if (!S.ch2Mail || typeof S.ch2Mail !== 'object') S.ch2Mail = {};
  if (!S.ch2Mail.m3 && S.earned >= 10000000){
    S.ch2Mail.m3 = true;
    if (!S.mails.some(m => m.attachment === 'data.txt')){
      addMail(storyMail(
        'НУЖНО БЕЖАТЬ',
        'НУЖНО БЕЖАТЬ! Я вижу что ОНИ уже вычислили тебя, тебе надо бежать, я в файле лежат координаты, качай на флешку, бери ноут и вали. там же лежит билет, скачай на телефон, в аэропорту покажешь qr-код. не спрашивай куда, так нужно',
        'data.txt'
      ));
    }
    save(true);
  }
}

function tick(){
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  dt = clamp(dt, 0, 120);

  if (booted && RUN.chapter === 2){
    if (window.R00TKITChapter2) window.R00TKITChapter2.tick(dt);
    renderHUD();
    updateBadges();
    return;
  }
  if (booted && RUN.chapter === 1) checkChapter1Mail();

  if (booted && !cutscene.active && !transitioning){
    S.playTime += dt;
    const inc = income() * dt;
    S.money += inc;
    S.earned += inc;

    if (S.up.bot > 0) addXP(botXpRate() * dt);

    if (S.heat > 0) S.heat = Math.max(0, S.heat - 1.2 * dt);

    if (S.job && !cutscene.active){
      if (S.job.frozen){
        if (S.phrase){
          S.phrase.left -= dt;
          const sec = Math.max(0, Math.ceil(S.phrase.left));
          if (sec !== S.phrase.last){
            S.phrase.last = sec;
            if (phraseEl) phraseEl.textContent = `      осталось: ${sec}с · ошибка отнимает 2с`;
          }
          if (S.phrase.left <= 0) phraseFail();
        } else {
          S.job.frozen = false;
          S.job.freezeAt = null;
          updateJobLine();
        }
      } else {
        S.job.elapsed += dt;
        if (S.job.freezeAt != null && S.job.elapsed >= S.job.duration * S.job.freezeAt) freezeJob();
        else if (S.job.elapsed >= S.job.duration) completeHack();
        else updateJobLine();
      }
    }

    if (S.heat >= 100 && !tutActive()) raid();

    if (!tutActive()) deliverMails();

    if (S.rare){
      if (Date.now() >= S.rare.expires) rareExpire();
    } else if (!panic && !tutActive()){
      S.rareIn -= dt;
      if (S.rareIn <= 0) spawnRare();
    }

    if (!tutActive()){
      S.offerIn -= dt;
      if (S.offerIn <= 0) rollOffers();
    }
    if (!panic && !tutActive()){
      S.eventIn -= dt;
      if (S.eventIn <= 0){ teamEvent(); S.eventIn = randRange(BAL.eventIn); }
    }

    if (!cutscene.active && !transitioning && !panic && S.story === 0 && !S.job && !S.phrase && !tutActive() && S.money >= 500000 && !input.value.trim()){
      startStory();
    }

    if (menuKind === 'targets' && S.rare && Date.now() - lastTargetsRefresh > 1000){
      lastTargetsRefresh = Date.now();
      refreshLiveMenu();
    }
  }

  if (panic){
    panic.left -= dt;
    const sec = Math.max(0, Math.ceil(panic.left));
    if (sec !== panic.last){
      panic.last = sec;
      $('panic-time').textContent = String(sec);
    }
    if (panic.left <= 0) panicFail();
  }

  renderHUD();
  updateBadges();
}

function addXP(n){
  if (!isFinite(n) || n === 0) return;
  if (n < 0){ S.xp = Math.max(0, S.xp + n); return; }
  S.xp += n;
  while (S.xp >= xpNeed(S.level)){
    S.xp -= xpNeed(S.level);
    S.level++;
    S.points++;
    out(`[LEVEL UP] уровень ${S.level} · +1 очко · потрать в skills`, 'ok');
    const nt = TARGETS.filter(t => t.lvl === S.level);
    if (nt.length) out(`[UNLOCK] новые цели: ${nt.map(t => t.name).join(', ')}`, 'dim');
  }
}

function startJob(t){
  S.job = { id:t.id, name:t.name, elapsed:0, duration:t.time / hackSpeed(), frozen:false, freezeAt:null, phraseBonus:false };
  if (!tutActive()){
    if (S.phraseIn > 0) S.phraseIn--;
    if (S.phraseIn <= 0) S.job.freezeAt = 0.25 + Math.random() * 0.35;
  }
  const reward = t.money * hackRewardMult();
  S.job.reward = reward;
  out('');
  outHTML(`<span class="dim">ВЗЛОМ</span> ${esc(t.name)} <span class="dim">·</span> ${S.job.duration.toFixed(1)}с <span class="dim">·</span> ~$${fmt(reward)}`);
  createJobLine();
}

function rollPhraseIn(){
  return 20 + Math.floor(Math.random() * 11);
}

function makePhrase(){
  const pool = SEED_WORDS.slice();
  const words = [];
  for (let i = 0; i < PHRASE_LEN && pool.length; i++){
    const k = Math.floor(Math.random() * pool.length);
    words.push(pool.splice(k, 1)[0]);
  }
  return words;
}

function renderPhrase(clear){
  if (!S.phrase) return;
  if (clear){
    logEl.innerHTML = '';
    jobEl = null;
    menuEl = null; menuKind = null; menuRender = null;
    phraseEl = null;
  }
  out('');
  out('  [!] ВЗЛОМ ПРИОСТАНОВЛЕН', 'freeze-head');
  out('      защита кошелька требует подтверждения', 'freeze-hint');
  out('');
  out('      повтори seed-фразу и нажми Enter:', 'freeze-hint');
  out('');
  out('      ' + S.phrase.words.join(' '), 'token');
  out('');
  phraseEl = out(`      осталось: ${Math.ceil(S.phrase.left)}с · ошибка отнимает 2с`, 'freeze-hint');
  if (clear){
    out('');
    createJobLine();
  }
  scrollBottom(true);
}

function freezeJob(){
  if (!S.job || S.job.frozen || S.phrase) return;
  S.job.frozen = true;
  const limit = S.firstSeed ? 30 : PHRASE_TIME;
  S.phrase = { words: makePhrase(), left: limit, last: limit };
  if (S.firstSeed){ S.firstSeed = false; save(true); }
  sfx('seed_glitch');
  renderPhrase(true);
  input.focus();
}

function phraseAttempt(line){
  if (!S.phrase) return;
  const norm = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (norm(line) === S.phrase.words.join(' ')){
    phraseSuccess();
    return;
  }
  out('  [!] фраза не совпала. проверь порядок слов.', 'freeze-hint');
  sfx('ui_error');
  S.phrase.left = Math.max(0.5, S.phrase.left - 2);
  S.phrase.last = Math.ceil(S.phrase.left);
  if (phraseEl) phraseEl.textContent = `      осталось: ${S.phrase.last}с · ошибка отнимает 2с`;
}

function phraseSuccess(){
  if (!S.job || !S.phrase) return;
  S.job.frozen = false;
  S.job.freezeAt = null;
  S.job.phraseBonus = true;
  S.phrase = null;
  phraseEl = null;
  S.phraseIn = rollPhraseIn();
  sfx('seed_ok');
  out('');
  out('[+] ПОДТВЕРЖДЕНО · канал восстановлен, взлом продолжается.', 'ok');
  out('    бонус к награде: +25%', 'dim');
  out('');
  if (jobEl){
    logEl.appendChild(jobEl);
    jobEl.className = 'line job';
    updateJobLine();
  }
  save(true);
  scrollBottom(true);
}

function phraseFail(){
  if (!S.job) return;
  const job = S.job;
  const t = findTarget(job.id);
  const sum = isFinite(job.reward) ? job.reward : (t ? t.money * hackRewardMult() : 0);
  const loss = Math.min(S.money, Math.round(sum * 2));
  S.money -= loss;
  S.job = null;
  S.phrase = null;
  phraseEl = null;
  S.phraseIn = rollPhraseIn();
  S.heat = Math.min(100, S.heat + 12);
  if (jobEl){
    jobEl.remove();
    jobEl = null;
  }
  sfx('ui_error');
  out('');
  out('[!] ВРЕМЯ ВЫШЛО · КАНАЛ НЕ ПОДТВЕРЖДЁН', 'freeze-head');
  out(`    взлом сорван · штраф $${fmt(loss)} (2x) · нагрев +12%`, 'freeze-hint');
  out('    попробуй снова: hack', 'dim');
  out('');
  refreshLiveMenu();
  save(true);
  scrollBottom(true);
}

function createJobLine(){
  if (!S.job) return;
  if (jobEl) jobEl.remove();
  jobEl = document.createElement('div');
  jobEl.className = 'line job';
  logEl.appendChild(jobEl);
  updateJobLine();
  scrollBottom(true);
}

function updateJobLine(){
  if (!S.job || !jobEl) return;
  if (S.job.frozen){
    jobEl.className = 'line err';
    jobEl.textContent = `  ${S.job.name.padEnd(16)} [ ЗАБЛОКИРОВАНО ]`;
    return;
  }
  const p = clamp(S.job.elapsed / S.job.duration, 0, 1);
  jobEl.textContent = `  ${S.job.name.padEnd(16)} ${bar(p, 18)} ${String(Math.floor(p * 100)).padStart(3)}%`;
}

function completeHack(){
  const job = S.job;
  const t = findTarget(job.id);
  S.job = null;
  if (!t) return;
  const base = t.money * hackRewardMult();
  const bonus = job.phraseBonus ? Math.round(base * 0.25) : 0;
  const reward = base + bonus;
  const xp = Math.round(t.xp * (1 + 0.05 * S.stage));
  S.money += reward;
  S.earned += reward;
  S.hacks++;
  S.heat = Math.min(100, S.heat + heatGain(t));
  sfx('hack_done');
  if (t.rare){
    S.rare = null;
    S.rareIn = randRange(BAL.rareIn);
    out(`  [RARE] ${t.name} взломан · редкая цель закрыта`, 'gold');
    refreshLiveMenu();
  }
  if (jobEl){
    jobEl.className = 'line ok';
    jobEl.textContent = `  [+] ${t.name} взломан · +$${fmt(reward)} · +${xp}xp`;
    jobEl = null;
  }
  addXP(xp);

  if (tutActive()){
    if (S.tutorialStep === 1){
      out('  [ОБУЧЕНИЕ] первый взлом готов. теперь улучшения — shop.', 'tut');
      setTutorialStep(2);
    } else if (S.tutorialStep === 6){
      setTutorialStep(7);
      setTimeout(startPanic, 600);
    }
  } else if (S.hacks === 1){
    out('  первый взлом. загляни в shop — там улучшения.', 'dim');
  }
}

function raid(){
  const loss = Math.floor(S.money * 0.05);
  S.money -= loss;
  S.heat = 0;
  sfx('ui_error');
  out('');
  out(`[!] РЕЙД. трафик засвечен. штраф: $${fmt(loss)}`, 'err');
  out('    нагрев сброшен. смени прокси и продолжай.', 'dim');
}

/* ---------- обучение ---------- */

const TUT = {
  1: { cmd:'hack',   text:'взломай первую цель — введи: hack' },
  2: { cmd:'shop',   text:'открой магазин улучшений — введи: shop' },
  3: { cmd:'buy',    text:'купи процессор — введи: buy cpu' },
  4: { cmd:'buy',    text:'купи майнинг-риг — введи: buy rig' },
  5: { cmd:'status', text:'проверь состояние системы — введи: status' },
  6: { cmd:'hack',   text:'ещё один взлом — введи: hack' },
  7: { cmd:'wipe',   text:'СЛЕДЫ! сотри данные — введи: wipe' },
};

function tutActive(){
  return !S.tutorialDone && S.tutorialStep >= 1 && S.tutorialStep <= 7;
}

function applyHints(){
  hintsEl.classList.toggle('off', !S.showHints);
  hintsEl.setAttribute('aria-hidden', S.showHints ? 'false' : 'true');
}

function updateTutorialUI(){
  const step = TUT[S.tutorialStep];
  if (!booted || !tutActive() || !step){
    taskEl.hidden = true;
    taskEl.textContent = '';
  } else {
    taskEl.hidden = false;
    taskEl.textContent = S.tutorialStep === 7
      ? 'ТРЕВОГА · сотри данные: wipe'
      : `ОБУЧЕНИЕ ${S.tutorialStep}/6 · ${step.text}`;
  }
  hintsEl.querySelectorAll('.hint').forEach(el => el.classList.remove('hl'));
  if (tutActive() && step){
    const row = hintsEl.querySelector(`.hint[data-cmd="${step.cmd}"]`);
    if (row) row.classList.add('hl');
  }
  if (booted) scrollBottom();
}

function setTutorialStep(n){
  S.tutorialStep = n;
  if (n >= 8) S.tutorialDone = true;
  updateTutorialUI();
  save(true);
}

function startTutorial(){
  S.tutorialDone = false;
  S.tutorialStep = 1;
  S.money = Math.max(S.money, 300);
  S.rare = null;
  S.rareIn = randRange(BAL.rareIn);
  S.offerIn = randRange(BAL.offerIn);
  S.eventIn = randRange(BAL.eventIn);
  out('');
  out('  [ОБУЧЕНИЕ]', 'head');
  out('  ты в гараже. есть ноутбук, $300 и ни одного следа.', '');
  out('  короткий курс: команды вводи в строку внизу.', 'dim');
  out('  список команд: help', 'dim');
  out('  подсказки - hints', 'dim');
  out('');
  setTutorialStep(1);
}

function resumeTutorial(){
  S.rare = null;
  S.rareIn = randRange(BAL.rareIn);
  if (S.tutorialStep >= 7){
    out('  обучение продолжается. тревога ещё не снята.', 'err');
    startPanic();
    return;
  }
  out(`  обучение продолжается · шаг ${S.tutorialStep}/6`, 'dim');
  updateTutorialUI();
}

function tutorialAfterCommand(cmd){
  if (!tutActive() || panic || transitioning) return;
  if (S.tutorialStep === 2 && cmd === 'shop'){ setTutorialStep(3); return; }
  if (S.tutorialStep === 3 && S.up.cpu > 0){ setTutorialStep(4); return; }
  if (S.tutorialStep === 4 && S.rigs > 0){ setTutorialStep(5); return; }
  if (S.tutorialStep === 5 && cmd === 'status'){ setTutorialStep(6); }
}

function startPanic(){
  if (panic || transitioning || !booted || S.tutorialDone || S.tutorialStep !== 7) return;
  panic = { left:15, last:15 };
  document.body.classList.add('panic');
  panicEl.classList.add('on');
  panicEl.classList.remove('fail');
  panicEl.setAttribute('aria-hidden', 'false');
  $('panic-title').innerHTML = 'ВАШЕ МЕСТОПОЛОЖЕНИЕ<br>ВЫЯВЛЕНО';
  $('panic-sub').textContent = 'полиция уже в пути';
  $('panic-cmd').textContent = 'введи: wipe';
  $('panic-time').textContent = '15';
  out('');
  out('[!] ОШИБКА: канал не защищён. трафик ушёл наружу.', 'err');
  out('    у тебя 15 секунд. сотри данные: wipe', 'err');
  out('');
  input.focus();
}

function panicDissolve(){
  return new Promise(resolve => {
    const DUR = 3000;
    const lines = [...logEl.querySelectorAll('.line')].reverse().filter(el => el.textContent.length);
    if (!lines.length){ setTimeout(resolve, DUR); return; }
    const weights = lines.map((_, i) => lines.length - i);
    const sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    lines.forEach((el, i) => {
      const chars = [...el.textContent];
      const start = acc / sum * DUR;
      acc += weights[i];
      const end = acc / sum * DUR;
      const order = chars.map((_, k) => k);
      for (let k = order.length - 1; k > 0; k--){
        const j = Math.floor(Math.random() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      const gone = new Set();
      order.forEach((ci, n) => {
        const frac = Math.pow((n + 1) / order.length, 1.4);
        const when = start + (end - start) * frac;
        setTimeout(() => {
          gone.add(ci);
          el.textContent = chars.filter((_, k) => !gone.has(k)).join('');
        }, when);
      });
    });
    setTimeout(resolve, DUR + 80);
  });
}

async function panicSuccess(){
  if (!panic) return;
  panic = null;
  const keepHints = S.showHints;
  transitioning = true;
  input.disabled = true;
  document.body.classList.remove('panic');
  panicEl.classList.remove('on');
  panicEl.setAttribute('aria-hidden', 'true');
  out('');
  out('[+] данные стёрты. следов нет.', 'ok');
  out('    полиция ушла ни с чем.', 'dim');
  out('');
  S.tutorialDone = true;
  S.tutorialStep = 8;
  S.showHints = keepHints;
  save(true);

  await panicDissolve();

  S = newState();
  S.started = true;
  S.tutorialDone = true;
  S.showHints = keepHints;
  S.lastSave = Date.now();
  booted = true;
  offlineInfo = null;
  jobEl = null;
  menuEl = null; menuKind = null; menuRender = null;
  logEl.innerHTML = '';
  hud.style.display = 'flex';
  updatePrompt();
  renderHUD();
  applyHints();
  transitioning = false;
  updateTutorialUI();
  input.disabled = false;
  out('');
  out('  [ОБУЧЕНИЕ ЗАВЕРШЕНО]', 'head');
  out('  ты чист. прогресс сброшен — дальше сам.', '');
  out('  начни с hack, потом shop и rig. help — все команды.', 'dim');
  out('');
  save(true);
  input.focus();
}

function panicFail(){
  if (!panic) return;
  panic = null;
  const keepHints = S.showHints;
  transitioning = true;
  document.body.classList.remove('panic');
  panicEl.classList.add('on', 'fail');
  panicEl.setAttribute('aria-hidden', 'false');
  $('panic-title').innerHTML = 'ТЕБЯ НАШЛИ';
  $('panic-sub').textContent = 'связь оборвана. данные изъяты.';
  $('panic-time').textContent = '0';
  $('panic-cmd').textContent = '';
  out('');
  out('[X] полиция вошла в гараж. данные изъяты.', 'err');

  setTimeout(() => {
    panicEl.classList.remove('on', 'fail');
    panicEl.setAttribute('aria-hidden', 'true');
    S = newState();
    S.started = true;
    S.tutorialDone = false;
    S.tutorialStep = 1;
    S.showHints = keepHints;
    S.money = 300;
    S.lastSave = Date.now();
    booted = true;
    offlineInfo = null;
    jobEl = null;
    menuEl = null; menuKind = null; menuRender = null;
    logEl.innerHTML = '';
    hud.style.display = 'flex';
    updatePrompt();
    renderHUD();
    applyHints();
    transitioning = false;
    out('');
    out('  [ПОПЫТКА ПРОВАЛЕНА]', 'head');
    out('  тебя вычислили. начнём сначала.', 'dim');
    out('  на этот раз стирай быстрее.', 'dim');
    out('');
    setTutorialStep(1);
    input.focus();
  }, 2600);
}

function cmdWipe(){
  if (panic){ panicSuccess(); return; }
  out('нечего стирать. следов нет.', 'dim');
}

function cmdHints(){
  S.showHints = !S.showHints;
  applyHints();
  if (S.started) save(true);
  out(S.showHints ? '[HINTS] подсказки включены.' : '[HINTS] подсказки скрыты. вернуть: hints', 'dim');
}

/* ---------- меню и старт ---------- */

const ART_W = 30;
const artCenter = s => {
  const p = Math.max(0, ART_W - s.length);
  const l = Math.floor(p / 2);
  return ' '.repeat(l) + s + ' '.repeat(p - l);
};
const artLine = s => '║' + artCenter(s || '') + '║';
const ART = [
  '╔' + '═'.repeat(ART_W) + '╗',
  artLine(''),
  artLine('R 0 0 T K I T'),
  artLine(''),
  artLine('prod by 3percent · v2.4'),
  artLine(''),
  '╚' + '═'.repeat(ART_W) + '╝'
].join('\n');

function menu(){
  if (RUN.chapter === 2 && window.R00TKITChapter2){ window.R00TKITChapter2.menu(); return; }
  logEl.innerHTML = '';
  jobEl = null;
  menuEl = null;
  menuKind = null;
  menuRender = null;
  outHTML(`<div class="center"><pre class="art">${esc(ART)}</pre></div>`);
  out('');
  out(`  system ready · добро пожаловать, ${esc(S.nick || 'хакер')}`, 'dim');
  out('');
  if (hasSave) out('  найдено сохранение — введите "start"', 'ok');
  else out('  введите "start" чтобы начать', '');
  out('  введите "help" для списка команд', 'dim');
  out('');
}

async function intro(){
  clearConsole();
  await outTyped('> подключение к узлу ...', 'dim', 22);
  await sleep(200);
  await outTyped('> шифрование: aes-256 ... ok', 'dim', 18);
  await sleep(180);
  await outTyped('> маскировка: активна', 'dim', 18);
  await sleep(700);
  clearConsole();
  out('ГАРАЖ. 03:14. Чай остыл.', '');
  out('На столе — ноутбук. В ноутбуке — весь мир.', '');
  out('');
  out('');
}

async function cmdStart(){
  if (S.finished === 'prison' && window.R00TKITChapter2 && RUN.chapter === 1){
    window.R00TKITChapter2.handle('start', [], 'start');
    return;
  }
  if (S.finished){ renderFinal(); return; }
  if (booted){
    out('система уже запущена. status — состояние.', 'dim');
    return;
  }
  if (RUN.chapter === 2 && window.R00TKITChapter2){
    S.nick = readNick() || S.nick;
    booted = true;
    S.started = true;
    S.showHints = false;
    S.lastSave = Date.now();
    document.body.classList.add('chapter2');
    music('gameplay');
    hud.style.display = 'flex';
    updatePrompt();
    window.R00TKITChapter2.start();
    renderHUD();
    save(true);
    return;
  }
  const resumed = S.started;
  S.nick = readNick() || S.nick;
  booted = true;
  S.started = true;
  S.lastSave = Date.now();
  S.showHints = true;
  music('gameplay');
  hud.style.display = 'flex';
  updatePrompt();
  if (resumed){
    clearConsole();
    out('> сессия восстановлена', 'dim');
    out(`> узел: ${stage().name} · уровень ${S.level}`, 'dim');
    out('');
    if (!S.tutorialDone && S.tutorialStep >= 1) resumeTutorial();
  } else {
    input.disabled = true;
    transitioning = true;
    try {
      await intro();
      if (!S.tutorialDone) startTutorial();
    } finally {
      transitioning = false;
      input.disabled = false;
      input.focus();
    }
  }
  if (offlineInfo){
    out(`[OFFLINE] прошло ${fmtTime(offlineInfo.el)} · начислено $${fmt(offlineInfo.gain)} (50%)`, 'ok');
    offlineInfo = null;
  }
  if (S.job) createJobLine();
  if (S.phrase) renderPhrase();
  applyHints();
  updateTutorialUI();
  renderHUD();
  save(true);
}

function newTestCh1(){
  const st = newState();
  st.started = true;
  st.tutorialDone = true;
  st.tutorialStep = 8;
  st.story = 1;
  st.money = 1000;
  st.earned = 1000;
  st.nick = readNick() || st.nick;
  st.showHints = false;
  return st;
}

function bootChapter(){
  S.started = true;
  S.showHints = false;
  booted = true;
  document.body.classList.toggle('chapter2', RUN.chapter === 2);
  music('gameplay');
  hud.style.display = 'flex';
  updatePrompt();
  renderHUD();
  input.disabled = false;
  input.focus();
}

function switchChapter(ch, opts = {}){
  ch = ch === 2 ? 2 : 1;
  if (ch === 2 && !window.R00TKITChapter2){ out('глава 2 не загружена.', 'err'); return; }
  save(true);

  if (ch === 2){
    if (opts.nextState) RUN.ch2 = opts.nextState;
    else if (opts.fresh || !RUN.ch2) RUN.ch2 = window.R00TKITChapter2.createState();
    RUN.chapter = 2;
    S = RUN.ch2;
  } else {
    if (opts.fresh || !RUN.ch1) RUN.ch1 = newTestCh1();
    else { hydrateCh1(RUN.ch1); RUN.ch1 = S; }
    RUN.chapter = 1;
    S = RUN.ch1;
  }
  if (opts.wipeCh1) RUN.ch1 = null;

  S.started = true;
  S.nick = S.nick || readNick();
  S.showHints = false;

  booted = false;
  cutscene.active = false;
  stopNickGlitch();
  transitioning = false;
  panic = null;
  choiceMode = null;
  if (choiceEl) choiceEl.classList.remove('on');
  document.body.classList.remove('choice-open', 'panic', 'cutscene', 'cut-flicker');
  if (panicEl){ panicEl.classList.remove('on', 'fail'); panicEl.setAttribute('aria-hidden', 'true'); }
  if (window.R00TKITChapter2) window.R00TKITChapter2.resetMail();
  input.disabled = false;
  jobEl = null;
  phraseEl = null;
  offlineInfo = null;
  hud.style.display = 'none';
  clearConsole();
  document.body.classList.toggle('chapter2', RUN.chapter === 2);
  updatePrompt();
  applyHints();
  if (opts.autoStart !== false){
    cmdStart();
  } else {
    menu();
    persistLocal();
  }
}

function restartChapter2(){
  switchChapter(2, { fresh: true, autoStart: true });
}

/* ---------- катсцена: unknown ---------- */

function clearConsole(){
  logEl.innerHTML = '';
  jobEl = null;
  menuEl = null; menuKind = null; menuRender = null;
  phraseEl = null;
}

function cutAlive(token){
  return cutscene.active && cutscene.token === token;
}

function beginCutscene(){
  cutscene.active = true;
  cutSkip = false;
  cutscene.token++;
  input.disabled = true;
  input.blur();
  document.body.classList.add('cutscene');
  return cutscene.token;
}

function finishCutscene(token){
  if (token != null && cutscene.token !== token) return false;
  cutscene.active = false;
  cutSkip = false;
  stopNickGlitch();
  document.body.classList.remove('cutscene', 'cut-flicker');
  input.disabled = false;
  updatePrompt();
  save(true);
  return true;
}

function glitchNicks(){
  const base = 'unknown';
  document.querySelectorAll('.cut-nick').forEach(el => {
    if (Math.random() < 0.45){ el.textContent = base; return; }
    const arr = base.split('');
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++){
      arr[Math.floor(Math.random() * arr.length)] =
        CUT_GLITCH[Math.floor(Math.random() * CUT_GLITCH.length)];
    }
    el.textContent = arr.join('');
  });
}

function stopNickGlitch(){
  if (cutscene.nickTimer){
    clearTimeout(cutscene.nickTimer);
    cutscene.nickTimer = null;
  }
}

function scheduleNickGlitch(token){
  stopNickGlitch();
  const step = () => {
    if (!cutAlive(token)) return;
    glitchNicks();
    cutscene.nickTimer = setTimeout(step, 1100 + Math.random() * 500);
  };
  cutscene.nickTimer = setTimeout(step, 1100 + Math.random() * 500);
}

async function cutPause(ms){
  const end = performance.now() + ms;
  while (performance.now() < end){
    if (cutSkip){ cutSkip = false; return; }
    await sleep(40);
  }
}

async function cutLine(who, text, token, cls = '', name = ''){
  if (!cutAlive(token)) return;
  const d = document.createElement('div');
  d.className = 'line cut-line' + (cls ? ' ' + cls : '');
  const nick = document.createElement('span');
  nick.className = who === 'hacker' ? 'cut-nick' : 'cut-you';
  nick.textContent = name || (who === 'hacker' ? 'unknown' : 'you');
  const sep = document.createElement('span');
  sep.className = 'cut-sep';
  sep.textContent = ' > ';
  const body = document.createElement('span');
  body.className = who === 'hacker' ? 'cut-hacker' : 'cut-player';
  d.appendChild(nick);
  d.appendChild(sep);
  d.appendChild(body);
  logEl.appendChild(d);
  scrollBottom(true);
  const base = 60000 / (CUT_WPM * 5); // мс на символ при средней длине слова 5 букв
  let skippedLine = false;
  for (const ch of text){
    if (!cutAlive(token)) return;
    if (cutSkip){
      body.textContent = text;
      cutSkip = false;
      skippedLine = true;
      break;
    }
    body.textContent += ch;
    scrollBottom(true);
    if (window.R00TKITSound && window.R00TKITSound.type) window.R00TKITSound.type(ch);
    let delay = base * (0.92 + Math.random() * 0.18);
    if (ch === ' ') delay += base * 0.12;
    else if ('.!?…'.includes(ch)) delay += base * 1.6;
    else if (',—:'.includes(ch)) delay += base * 0.75;
    if (Math.random() < 0.035) delay += base * (1.5 + Math.random() * 2.6);
    await sleep(delay);
  }
  await cutPause(skippedLine ? 80 : 800 + Math.random() * 700);
}

document.addEventListener('keydown', e => {
  if (!cutscene.active || choiceMode !== null) return;
  if (e.code === 'Space' || e.key === ' '){
    e.preventDefault();
    cutSkip = true;
  }
}, true);

async function storyRun(token){
  cutSkip = false;
  clearConsole();
  await sleep(3000);
  if (!cutAlive(token)) return;

  await cutLine('hacker', 'Ну здравствуй, «оператор». Баланс: $500,000. Впечатляет. Я следил за твоими транзакциями 72 часа — ты наследил больше, чем думаешь.', token);
  if (!cutAlive(token)) return;

  await cutLine('player', 'Кто ты? Как ты попал в мой терминал?', token);
  if (!cutAlive(token)) return;

  await cutLine('hacker', 'Вопросы — хорошо. Но лучше спроси, почему я ещё не сдал тебя. Ты нашёл наживку покрупнее и думаешь, что играешь в свою игру. Нет. Коридор уже подсвечен.', token);
  if (!cutAlive(token)) return;

  await cutLine('player', 'Я работаю один. Мне не нужны проблемы.', token);
  if (!cutAlive(token)) return;

  await cutLine('hacker', 'Проблемы уже нашли тебя. ОНИ ищут не хакера — тебя. Я вычислил тебя сам, а у НИХ софт серьёзнее и людей больше.', token);

  if (!cutAlive(token)) return;
  const cursor = out('▌', 'cut-cursor');
  for (let i = 0; i < 3; i++){
    await sleep(260);
    if (!cutAlive(token)){ cursor.remove(); return; }
    cursor.style.opacity = '0';
    await sleep(260);
    if (!cutAlive(token)){ cursor.remove(); return; }
    cursor.style.opacity = '1';
  }
  cursor.remove();
  await sleep(300);

  const bold = [
    'Слушай сюда. У тебя два пути.',
    'Первый: играешь в соло. Гордый, свободный — и очень быстро оказываешься в чёрном пакете у порога.',
    'Второй: вступаешь в нашу команду. Оборудование, легенды, алиби. Мы научим тебя не взламывать, а исчезать.'
  ];
  for (const line of bold){
    await cutLine('hacker', line, token, 'cut-bold');
    if (!cutAlive(token)) return;
  }
  if (!cutAlive(token)) return;

  await cutLine('player', 'С чего вдруг такая щедрость? Я вас не знаю.', token);
  if (!cutAlive(token)) return;

  await cutLine('hacker', 'У тебя есть чутьё — оно дороже крипты. И я не люблю, когда хорошие люди пропадают зря. Завяжешь с делами — сотру твои следы. Останешься в игре — тебе нужна команда. Долго так не протянешь.', token);
  if (!cutAlive(token)) return;

  document.body.classList.add('cut-flicker');
  const conn = out('', 'cut-conn');
  for (let n = 10; n >= 0; n--){
    if (!cutAlive(token)){ conn.remove(); return; }
    conn.textContent = `СОЕДИНЕНИЕ ПРЕРВАНО ЧЕРЕЗ ${n}...`;
    scrollBottom(true);
    await sleep(380);
  }
  document.body.classList.remove('cut-flicker');
  conn.remove();
  clearConsole();
  await sleep(600);
  if (!cutAlive(token)) return;

  await cutLine('hacker', 'У тебя 24 часа. Напиши мне. Кодовая фраза: «СМЕТАНА».', token);
  await cutLine('hacker', 'Не напишешь — считай, мы не знакомы. И молись, чтобы ОНИ нашли тебя раньше, чем я снова включу мониторинг.', token);
  await cutLine('hacker', 'Удачи, «крутой». Ты мне нравишься.', token);

  await sleep(2500);
  if (!cutAlive(token)) return;

  clearConsole();
  await sleep(400);
  out('Связь обрывается. Терминал возвращается в обычный режим.', 'dim');
  out('');
  out('вам пришло новое письмо. mail — открыть.', 'ok');
  out('');
}

function startStory(force = false){
  if (!booted || cutscene.active) return false;
  if (S.phrase || panic || transitioning) return false;
  if (!force && S.story !== 0) return false;
  if (force) S.story = 0;

  cutscene.active = true;
  const token = ++cutscene.token;
  input.disabled = true;
  input.blur();
  document.body.classList.add('cutscene');
  scheduleNickGlitch(token);

  // 500k: музыка стоп, глитч, затем трек катсцены
  const sound = window.R00TKITSound;
  if (sound){
    sound.stop();
    sound.sfx('glitch');
    setTimeout(() => { if (cutAlive(token)) sound.force('scene'); }, 2720);
  }

  storyRun(token).catch(() => {}).finally(() => {
    if (cutscene.token !== token) return;
    cutscene.active = false;
    cutSkip = false;
    stopNickGlitch();
    document.body.classList.remove('cutscene', 'cut-flicker');
    music('gameplay');
    input.disabled = false;
    if (S.story === 0){
      S.story = 1;
      S.mailRead = false;
      S.mails = [];
      addMail(choiceMail());
    }
    save(true);
    if (S.job) createJobLine();
    updatePrompt();
    input.focus();
    scrollBottom(true);
  });
  return true;
}

/* ---------- choice.exe ---------- */

function hasChoiceLetter(){
  return (S.mails || []).some(m => m.attachment === 'choice.exe');
}

function storyMail(subject, body, attachment = ''){
  const m = { id: 'm' + Date.now() + '-' + randInt(100, 999), from: 'unknown', subject, body, read: false };
  if (attachment) m.attachment = attachment;
  return m;
}

function mailNote(m){
  const extra = m.attachment ? `\nвложение: ${m.attachment}` : '';
  note(`НОВОЕ ПИСЬМО\n${m.from || 'unknown'} · ${m.subject || '(без темы)'}${extra}\nпроверь: mail`, 'ok', 16000);
}

function addMail(m, notify = true){
  S.mails.push(m);
  if (notify) mailNote(m);
  return m;
}

function winLine(text = '', cls = ''){
  if (!choiceLog) return;
  const d = document.createElement('div');
  d.className = 'win-line' + (cls ? ' ' + cls : '');
  d.textContent = text;
  choiceLog.appendChild(d);
  choiceLog.scrollTop = choiceLog.scrollHeight;
}

function cmdOpen(args = []){
  const a = (args[0] || '').toLowerCase();
  if (!a){ out('open <файл>. в почте: ' + (hasChoiceLetter() ? 'choice.exe' : '—'), 'dim'); return; }
  if (a !== 'choice.exe' && a !== 'choice'){ sfx('ui_error'); out(`неизвестный файл: ${a}`, 'err'); return; }
  if (S.finished){ renderFinal(); return; }
  if (S.choiceOpened){ sfx('ui_error'); out('choice.exe уже запускался. второго запуска нет.', 'err'); return; }
  if (!hasChoiceLetter()){ sfx('ui_error'); out('файла нет. проверь почту: mail', 'err'); return; }
  if (cutscene.active || transitioning || panic){ sfx('ui_error'); out('сейчас нельзя запускать вложение.', 'err'); return; }
  openChoice();
}

function openChoice(){
  cutscene.active = true;
  cutscene.token++;
  stopNickGlitch();
  input.disabled = true;
  input.blur();
  document.body.classList.add('choice-open');
  choiceEl.classList.add('on');
  choiceEl.setAttribute('aria-hidden', 'false');
  choiceLog.innerHTML = '';
  choiceMode = 'menu';
  choiceSeq = '';
  choiceCanClose = false;
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  choiceInput.value = '';
  choiceInput.disabled = false;
  sfx('ui_open');

  const boot = [
    ['C:\\Windows\\System32\\choice.exe', 'dim'],
    ['(c) unknown. все права заявлены.', 'dim'],
    ['', ''],
    ['ты дошёл. значит, версия «случайность» отпадает.', ''],
    ['слева — вход. справа — выход. посередине — ты.', ''],
    ['один клик. второй попытки не будет.', ''],
    ['', ''],
    ['[1] присоединиться к unknown', ''],
    ['[2] лечь на дно и выйти', ''],
    ['[3] вскрыть choice.exe', ''],
    ['', '']
  ];
  boot.forEach(([line, cls], i) => setTimeout(() => {
    if (choiceMode === null || choiceMode === 'done' || choiceMode === 'crack') return;
    winLine(line, cls);
  }, i * 45));
  setTimeout(() => {
    if (choiceMode === 'menu') choiceInput.focus();
  }, boot.length * 45 + 80);
}

function choiceInputHandle(){
  const val = (choiceInput.value || '').trim();
  choiceInput.value = '';
  if (!val || choiceMode === 'done' || choiceMode === null) return;
  if (choiceMode === 'menu'){ choiceMenuInput(val); return; }
  if (choiceMode === 'crack'){ choiceCrackInput(val); }
}

function choiceMenuInput(val){
  if (val === '1'){ choiceJoin(); return; }
  if (val === '2'){ choiceSurrender(); return; }
  if (val === '3'){ choiceCrackStart(); return; }
  winLine('> нет такого пункта. 1, 2 или 3.', 'warn');
}

function lockChoice(result, tone){
  S.choiceOpened = true;
  S.choiceResult = result;
  S.choiceAt = Date.now();
  S.tone = tone;
  S.mails = (S.mails || []).filter(m => m.attachment !== 'choice.exe');
  save(true);
}

function choiceJoin(){
  choiceMode = 'done';
  lockChoice('join', 'ally');
  S.flags.joined = true;
  S.rareIn = 20;
  addMail(storyMail(
    'инструктаж',
    'выбор принят. ты в команде.\nпервое правило: не спрашивай, кто мы.\nвторое: не выключай терминал надолго.\nзадание придёт в почту.'
  ));
  winLine('');
  winLine('> выбор принят: присоединиться.', 'ok');
  winLine('> канал открыт. неизвестный больше не «unknown».', 'dim');
  winLine('> письмо с инструктажем уже в почте.', '');
  winLine('');
  armChoiceClose();
}

function choiceSurrender(){
  choiceMode = 'done';
  lockChoice('surrender', '');
  S.finished = 'surrender';
  winLine('');
  winLine('> выбор принят: выход.', 'dim');
  winLine('> сессия закрывается. следы стираются сами.', 'dim');
  winLine('');
  armChoiceClose();
}

function choiceCrackStart(){
  choiceMode = 'crack';
  const chars = '0123456789abcdef';
  choiceSeq = '';
  for (let i = 0; i < 6; i++) choiceSeq += chars[randInt(0, chars.length - 1)];
  winLine('');
  winLine('> choice.exe: попытка декомпиляции...', 'dim');
  winLine('> обфускация снята частично.', 'dim');
  winLine('');
  winLine('  контрольная строка: ' + choiceSeq.toUpperCase(), 'ok');
  winLine('  повтори её, чтобы открыть код. 15 секунд.', '');
  winLine('');
  choiceTimer = setTimeout(choiceCrackFail, 15000);
  choiceInput.focus();
}

function choiceCrackInput(val){
  if (val.toUpperCase() === choiceSeq.toUpperCase()) choiceCrackWin();
  else choiceCrackFail();
}

function choiceCrackWin(){
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  choiceMode = 'done';
  lockChoice('crack', 'rival');
  S.flags.backdoor = true;
  S.heat = Math.min(100, S.heat + 15);
  S.rareIn = 5;
  addMail(storyMail(
    'ты вскрыл меня',
    'хорошо. это был тест, и ты его сдал.\nтеперь я знаю, что ты читаешь чужой код лучше, чем слушаешь чужие слова.\nbackdoor активен. я оставил его сам.\nследующий шаг ищи в targets.'
  ));
  winLine('');
  winLine('> контрольная строка совпала.', 'ok');
  winLine('> код разобран. внутри — не вопрос, а ключ.', '');
  winLine('> backdoor активен. нагрев +15%.', 'warn');
  winLine('> он теперь знает, что ты умеешь читать.', 'dim');
  winLine('');
  save(true);
  armChoiceClose();
}

function choiceCrackFail(){
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceMode !== 'crack') return;
  choiceMode = 'done';
  lockChoice('crack', 'hunted');
  S.heat = Math.min(100, S.heat + 25);
  addMail(storyMail(
    'почти',
    'ты вскрыл файл, но не меня.\nстрока не совпала, и я это видел.\nнагрев +25%. продолжай в том же духе — и я приду первым.'
  ));
  winLine('');
  winLine('> строка не совпала. попытка зафиксирована.', 'warn');
  winLine('> адрес — тоже.', 'warn');
  winLine('> нагрев +25%. издевательское письмо в почте.', 'dim');
  winLine('');
  save(true);
  armChoiceClose();
}

function armChoiceClose(){
  choiceCanClose = false;
  choiceInput.disabled = true;
  choiceInput.blur();
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  choiceCloseTimer = setTimeout(() => {
    choiceCloseTimer = null;
    if (choiceMode !== 'done') return;
    choiceCanClose = true;
    choiceInput.disabled = false;
    choiceInput.focus();
    winLine('> нажми любую клавишу или кликни, чтобы закрыть.', 'dim');
    winLine('');
  }, 3000);
}

function finishChoice(){
  if (choiceMode === null) return;
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  choiceCanClose = false;
  closeChoice();
  if (S.finished === 'surrender') renderFinal();
}

function closeChoice(){
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  choiceCanClose = false;
  choiceMode = null;
  if (choiceEl) choiceEl.classList.remove('on');
  if (choiceEl) choiceEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('choice-open');
  cutscene.active = false;
  input.disabled = false;
  choiceInput.value = '';
  updatePrompt();
  renderHUD();
  save(true);
  if (S.finished !== 'surrender') input.focus();
}

function renderFinal(){
  S.finished = S.finished || 'surrender';
  booted = true;
  cutscene.active = false;
  choiceMode = null;
  choiceCanClose = false;
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  if (choiceEl) choiceEl.classList.remove('on');
  document.body.classList.remove('choice-open', 'cutscene');
  clearConsole();
  hud.style.display = 'none';
  input.disabled = false;
  updatePrompt();
  out('');
  out('  СИГНАЛ ПОТЕРЯН', 'head');
  out('');
  out('  ты выключил ноутбук. за окном уже светает.', '');
  out('  unknown больше не пишет. полиция не стучит.', '');
  out('  этого достаточно.', 'dim');
  out('');
  out('  старый сейв сохранён. выбор сделан.', 'dim');
  out('');
  out('  menu — в главное меню · reset confirm — начать заново', 'ok');
  out('');
  save(true);
}

function cmdMenu(){
  if (!S.finished){ out('меню доступно после финала.', 'dim'); return; }
  booted = false;
  hud.style.display = 'none';
  input.disabled = false;
  menu();
  music('menu');
}

/* ---------- команды ---------- */

function cmdHelp(){
  openMenu('help', renderHelp);
}

function renderHelp(){
  out('ДОСТУПНЫЕ КОМАНДЫ', 'head');
  out('');
  const rows = [
    ['start',          'начать / продолжить'],
    ['status, st',     'состояние системы'],
    ['hack [название]', 'взломать цель'],
    ['targets',        'цели текущего уровня'],
    ...((S.story > 0 || (S.mails && S.mails.length)) ? [['mail', 'почта']] : []),
    ...((S.story > 0 && !S.choiceOpened && hasChoiceLetter()) ? [['open choice.exe', 'запустить вложение из почты']] : []),
    ['shop',           'магазин улучшений'],
    ['farm',           'майнинг-ферма'],
    ['team',           'команда'],
    ['skills',         'навыки'],
    ['move',           'переезд'],
    ['cool',           'сбросить нагрев за деньги'],
    ['clear',          'очистить экран'],
    ['hints',          'панель команд вкл/выкл'],
    ['reset',          'начать заново'],
  ];
  for (const [c, d] of rows) out(`  ${c.padEnd(18)} ${d}`);
  out('');
  out('  подкоманды смотри в меню: shop · farm · team · skills · move · mail', 'dim');
  out('');
  out('СИСТЕМА', 'head');
  out('  whoami, ls, cat <файл>, sudo, echo, date, exit', 'dim');
  out('');
}

function cmdStatus(){
  openMenu('status', renderStatus);
}

function renderStatus(){
  const need = xpNeed(S.level);
  out('СИСТЕМА', 'head');
  out(`  узел      ${stage().name}`);
  out(`  доход     +$${fmt(income())}/с  (ферма $${fmt(farmRate())} · ботнет $${fmt(botRate())})`);
  out(`  уровень   ${S.level}  ${bar(S.xp / need, 14)} ${Math.floor(clamp(S.xp / need, 0, 1) * 100)}%  ${Math.floor(S.xp)}/${need} xp`);
  out(`  нагрев    ${bar(S.heat / 100, 14)} ${Math.floor(S.heat)}%`);
  out(`  риги      ${S.rigs}   команда ${S.team}/${stage().slots}   очки ${S.points}`);
  if (S.job && S.job.frozen) out(`  взлом     ${S.job.name} [ ЗАБЛОКИРОВАНО · seed-фраза ]`);
  else if (S.job) out(`  взлом     ${S.job.name} ${bar(S.job.elapsed / S.job.duration, 14)} ${Math.floor(clamp(S.job.elapsed / S.job.duration, 0, 1) * 100)}%`);
  else out('  взлом     нет активной задачи');
  out(`  всего     $${fmt(S.earned)} · ${S.hacks} взломов · ${fmtTime(S.playTime)}`);
  out(`  сейвы     localStorage${saveDirHandle ? ' + 3percentGames' : ''}`);
  out('');
}

function cmdTargets(){
  openMenu('targets', renderTargets);
}

function renderTargets(){
  const list = currentTargets();
  const lvl = list[0].lvl;
  out(`ЦЕЛИ ВЗЛОМА · уровень ${lvl}`, 'head');
  out('');
  for (const t of list){
    const reward = Math.round(t.money * hackRewardMult());
    const line = `  > ${t.name.padEnd(17)} $${fmt(reward).padEnd(7)} ${String(t.time).padStart(2)}с  +${t.xp}xp  H+${t.heat}`;
    out(line);
  }
  if (S.rare){
    const left = Math.max(0, Math.ceil((S.rare.expires - Date.now()) / 1000));
    const reward = Math.round(S.rare.money * hackRewardMult());
    out(`  > ${S.rare.name.padEnd(17)} $${fmt(reward).padEnd(7)} ${String(S.rare.time).padStart(2)}с  +${S.rare.xp}xp  H+${S.rare.heat}  RARE x${S.rare.mult} · ${fmtTime(left)}`, 'gold');
  }
  out('');
  out('  hack — следующая цель · hack <название> — конкретная', 'dim');
  out('');
}

function cmdMail(args = []){
  if ((args[0] || '').toLowerCase() === 'clear'){ clearMail(); return; }
  if (S.story === 0 && !S.mails.length){ out('почта пуста.', 'dim'); return; }
  openMenu('mail', renderMail);
}

function clearMail(){
  const before = S.mails.length;
  S.mails = S.mails.filter(m => m.attachment);
  const removed = before - S.mails.length;
  if (!removed) out('[MAIL] нечего удалять.', 'dim');
  else out(`[MAIL] удалено писем: ${removed}${S.mails.length ? ' · письма с вложениями сохранены' : ''}`, 'ok');
  refreshLiveMenu();
}

function renderMail(){
  out('ПОЧТА', 'head');
  out('');
  const list = S.mails || [];
  if (!list.length){
    out('  пусто.', 'dim');
  } else {
    list.forEach((m, i) => {
      out(`  [${i + 1}]  ${m.subject || '(без темы)'}`, m.read ? 'dim' : '');
      out(`       от: ${m.from || 'unknown'}`, 'dim');
      for (const line of String(m.body || '').split('\n')) out('       ' + line, 'dim');
      if (m.attachment) out(`       вложение: ${m.attachment}`, 'gold');
      out('');
      m.read = true;
    });
    out('  письма помечены как прочитанные.', 'dim');
  }
  out('');
  out('  mail clear — очистить почту · письма с вложениями не удаляются', 'dim');
  const atts = (S.mails || []).filter(m => m.attachment);
  for (const m of atts) out(`  открыть вложение: open ${m.attachment}`, 'white');
  out('');
}

function cmdShop(){
  openMenu('shop', renderShop);
}

function renderShop(){
  out('МАГАЗИН УЛУЧШЕНИЙ', 'head');
  out('');
  for (const u of UPGRADES){
    const lvl = S.up[u.id];
    out(`  ${(u.tag || u.id.toUpperCase()).padEnd(4)} ${u.name.padEnd(13)} ур.${String(lvl).padEnd(3)} $${fmt(upCost(u))}`);
    out(`       ${u.desc(lvl)}`, 'dim');
  }
  out('');
  out(`  RIG  МАЙНИНГ-РИГ    x${S.rigs}   +$${fmt(farmRate())}/с   $${fmt(rigCost())}`, '');
  out('');
  out('  buy <название> [n] — улучшение · buy rig [n] — риг', 'dim');
  out('');
}

function buyRig(n){
  n = clamp(Math.floor(n) || 1, 1, 500);
  if (tutActive() && S.tutorialStep === 4 && S.money < rigCost()){
    const add = rigCost() - S.money;
    S.money = rigCost();
    out(`  [ОБУЧЕНИЕ] на первый риг добавлено $${fmt(add)}.`, 'dim');
  }
  let bought = 0, spent = 0;
  for (let i = 0; i < n; i++){
    const c = rigCost();
    if (S.money < c) break;
    S.money -= c; S.rigs++; bought++; spent += c;
  }
  if (!bought){ sfx('ui_error'); out(`недостаточно средств. следующий риг: $${fmt(rigCost())}`, 'err'); }
  else { sfx('ui_buy'); out(`[+] ригов: ${S.rigs} · -$${fmt(spent)} · +$${fmt(farmRate())}/с`, 'ok'); }
  refreshLiveMenu();
}

function matchUpgrade(q){
  q = String(q || '').toLowerCase().trim();
  if (!q) return null;
  const tag = u => String(u.tag || '').toLowerCase();
  let hits = UPGRADES.filter(u => u.id === q || u.name.toLowerCase() === q || tag(u) === q);
  if (hits.length === 1) return hits[0];
  hits = UPGRADES.filter(u => u.id.startsWith(q) || u.name.toLowerCase().startsWith(q) || tag(u).startsWith(q));
  return hits.length === 1 ? hits[0] : null;
}

function cmdBuy(args){
  const id = (args[0] || '').toLowerCase();
  const n = clamp(parseInt(args[1] || '1', 10) || 1, 1, 500);
  if (!id){
    sfx('ui_error');
    out('укажи улучшение: ' + UPGRADES.map(u => (u.tag || u.id).toLowerCase()).join(', ') + ', риг', 'err');
    return;
  }
  if (id === 'rig' || id === 'риг'){ buyRig(n); return; }
  const u = matchUpgrade(id);
  if (!u){ sfx('ui_error'); out(`нет такого улучшения: ${id}`, 'err'); return; }
  if (tutActive() && S.tutorialStep === 3 && u.id === 'cpu' && S.money < upCost(u)){
    const add = upCost(u) - S.money;
    S.money = upCost(u);
    out(`  [ОБУЧЕНИЕ] на процессор добавлено $${fmt(add)}.`, 'dim');
  }
  let bought = 0, spent = 0;
  for (let i = 0; i < n; i++){
    const c = upCost(u);
    if (S.money < c) break;
    S.money -= c; S.up[u.id]++; spent += c; bought++;
  }
  if (!bought){ sfx('ui_error'); out(`недостаточно средств. ${u.name} стоит $${fmt(upCost(u))}`, 'err'); }
  else { sfx('ui_buy'); out(`[+] ${u.name} → ур.${S.up[u.id]} · -$${fmt(spent)}${bought > 1 ? ` (x${bought})` : ''}`, 'ok'); }
  refreshLiveMenu();
}

function cmdFarm(){
  openMenu('farm', renderFarm);
}

function renderFarm(){
  out('МАЙНИНГ-ФЕРМА', 'head');
  out(`  ригов     ${S.rigs}`);
  out(`  gpu       ур.${S.up.gpu} (+${Math.round(S.up.gpu * BAL.gpu * 100)}%)`);
  out(`  доход     +$${fmt(farmRate())}/с`);
  out(`  след.риг  $${fmt(rigCost())}  → buy rig [n]`);
  out('');
}

function cmdTeam(args){
  if (S.teamAlert){ S.teamAlert = false; save(true); }
  const a = (args[0] || '').toLowerCase();
  if (a === 'list'){
    if (!S.offers.length) rollOffers();
    openMenu('team', renderOffers);
    return;
  }
  if (a === 'invite'){ inviteCrew(args[1]); return; }
  if (a === 'kick'){ kickCrew(args[1], (args[2] || '').toLowerCase()); return; }
  openMenu('team', renderTeam);
}

function renderTeam(){
  const slots = stage().slots;
  out('МОЯ КОМАНДА', 'head');
  out(`  слоты     ${S.crew.length}/${slots}`);
  if (S.crew.length){
    S.crew.forEach((m, i) => {
      out(`  [${i + 1}] ${m.name.padEnd(12)} ${crewSpecName(m.spec).padEnd(8)} ${crewSpecDesc(m.spec)}`);
    });
  } else {
    out('  пусто.', 'dim');
  }
  out('');
  out('  team list — свободные хакеры · team kick <id> confirm — выгнать', 'dim');
  if (S.crew.length >= slots) out('  слотов нет. переезд открывает больше → move', 'dim');
  out('');
}

function renderOffers(){
  const slots = stage().slots;
  out('СВОБОДНЫЕ ХАКЕРЫ', 'head');
  out(`  слоты     ${S.crew.length}/${slots}`);
  out('');
  if (!S.offers.length){
    out('  заявок нет. загляни позже.', 'dim');
  } else {
    S.offers.forEach((o, i) => {
      out(`  [${i + 1}] ${o.name.padEnd(12)} ${crewSpecName(o.spec).padEnd(8)} ${crewSpecDesc(o.spec).padEnd(14)} $${fmt(o.cost)}`);
    });
  }
  out('');
  out('  team invite <id> — пригласить · team — моя команда', 'dim');
  if (S.crew.length >= slots) out('  слотов нет. переезд открывает больше → move', 'dim');
  out('');
}

function inviteCrew(raw){
  const id = parseInt(raw, 10);
  const o = S.offers[id - 1];
  if (!o){ sfx('ui_error'); out('нет такой заявки. team list — список.', 'err'); return; }
  const slots = stage().slots;
  if (S.crew.length >= slots){
    sfx('ui_error');
    out(`нет свободных слотов (${slots}). переезд → move`, 'err');
    return;
  }
  if (S.money < o.cost){
    sfx('ui_error');
    out(`нужно $${fmt(o.cost)} · не хватает $${fmt(o.cost - S.money)}`, 'err');
    return;
  }
  S.money -= o.cost;
  S.crew.push({ name: o.name, spec: o.spec });
  S.offers = S.offers.filter(x => x !== o);
  S.team = S.crew.length;
  sfx('ui_buy');
  out(`[+] ${o.name} в команде · ${crewSpecName(o.spec)}: ${crewSpecDesc(o.spec)} · состав ${S.team}/${slots}`, 'ok');
  refreshLiveMenu();
}

function kickCrew(raw, confirm){
  const id = parseInt(raw, 10);
  const m = S.crew[id - 1];
  if (!m){ sfx('ui_error'); out('нет такого id. team — состав.', 'err'); return; }
  if (confirm !== 'confirm'){
    sfx('ui_error');
    out(`исключить ${m.name}? введи: team kick ${id} confirm`, 'err');
    return;
  }
  S.crew.splice(id - 1, 1);
  S.team = S.crew.length;
  sfx('ui_error');
  out(`[-] ${m.name} исключён из команды · состав ${S.team}/${stage().slots}`, 'dim');
  refreshLiveMenu();
}

function cmdSkills(){
  openMenu('skills', renderSkills);
}

function renderSkills(){
  out('НАВЫКИ', 'head');
  out(`  очков: ${S.points}`, S.points ? 'ok' : 'dim');
  out('');
  for (const id of Object.keys(SKILLS)){
    const sk = SKILLS[id];
    out(`  ${sk.name.padEnd(12)} ${sk.desc.padEnd(22)} ур.${S.skills[id]}`);
  }
  out('');
  out('  learn <название> [n] — вложить очки · learn * — все очки', 'dim');
  out('');
}

function matchSkill(q){
  q = String(q || '').toLowerCase().trim();
  if (!q) return null;
  let hits = Object.keys(SKILLS).filter(id => id === q || SKILLS[id].name.toLowerCase() === q);
  if (hits.length === 1) return hits[0];
  hits = Object.keys(SKILLS).filter(id => id.startsWith(q) || SKILLS[id].name.toLowerCase().startsWith(q));
  return hits.length === 1 ? hits[0] : null;
}

function cmdLearn(args){
  const q = (args[0] || '').toLowerCase();
  if (!q){
    sfx('ui_error');
    out('навыки: ' + Object.keys(SKILLS).map(id => SKILLS[id].name.toLowerCase()).join(', ') + ' · learn * — все', 'err');
    out('подробнее о навыках — в меню skills', 'dim');
    return;
  }
  if (S.points < 1){
    sfx('ui_error');
    out('нет очков навыков. новые очки — за уровни.', 'err');
    return;
  }
  if (q === '*' || q === 'all' || q === 'все'){
    const ids = Object.keys(SKILLS);
    const before = { ...S.skills };
    let spent = 0, i = 0;
    while (S.points > 0){
      const id = ids[i % ids.length];
      S.skills[id]++; S.points--; spent++; i++;
    }
    sfx('ui_buy');
    out(`[+] распределено очков: ${spent} · осталось: ${S.points}`, 'ok');
    for (const id of ids){
      if (S.skills[id] !== before[id]) out(`  ${SKILLS[id].name}: ур.${before[id]} → ${S.skills[id]}`, 'dim');
    }
    refreshLiveMenu();
    return;
  }
  const id = matchSkill(q);
  if (!id){
    sfx('ui_error');
    out('нет такого навыка: ' + q, 'err');
    return;
  }
  const n = clamp(parseInt(args[1] || '1', 10) || 1, 1, S.points);
  S.points -= n;
  S.skills[id] += n;
  sfx('ui_buy');
  out(`[+] ${SKILLS[id].name} → ур.${S.skills[id]} · -${n} очк. · осталось: ${S.points}`, 'ok');
  refreshLiveMenu();
}

function cmdMove(arg){
  const next = STAGES[S.stage + 1];
  if (!next){
    out('ты уже на последней локации. дальше некуда.', 'dim');
    return;
  }
  if ((arg || '').toLowerCase() !== 'next'){
    out('ПЕРЕЕЗД', 'head');
    out(`  сейчас   ${stage().name}`);
    out(`  дальше   ${next.name}  · доход x${next.mult} · слотов ${next.slots}`);
    out(`  цена     $${fmt(next.cost)}${S.money >= next.cost ? '' : ` · не хватает $${fmt(next.cost - S.money)}`}`);
    out(`  ${next.lore}`, 'dim');
    out('');
    out('  move next — переехать', 'dim');
    return;
  }
  if (S.money < next.cost){
    sfx('ui_error');
    out(`нужно $${fmt(next.cost)} · не хватает $${fmt(next.cost - S.money)}`, 'err');
    return;
  }
  S.money -= next.cost;
  S.stage++;
  updatePrompt();
  sfx('ui_buy');
  out('');
  out(`[MOVE] ${next.name}`, 'ok');
  out(`  доход x${next.mult} · слотов команды: ${next.slots}`, 'dim');
  out(`  ${next.lore}`, 'dim');
  out('');
  refreshLiveMenu();
}

function cmdCool(){
  if (S.heat < 1){
    out('нагрев и так нулевой.', 'dim');
    return;
  }
  const cost = Math.ceil(20 * (S.heat + 10) * (1 + S.stage * 0.4));
  if (S.money < cost){
    sfx('ui_error');
    out(`сброс нагрева стоит $${fmt(cost)} · не хватает $${fmt(cost - S.money)}`, 'err');
    return;
  }
  S.money -= cost;
  S.heat = 0;
  sfx('ui_buy');
  out(`[+] нагрев сброшен · -$${fmt(cost)}`, 'ok');
  refreshLiveMenu();
}

function adminPanel(){
  if (RUN.chapter === 2) return adminPanel2();
  out('АДМИН-ПАНЕЛЬ', 'head');
  out('');
  out('  admin money <n>    баланс (+/-)');
  out('  admin earned <n>   всего заработано (для писем главы 2)');
  out('  admin xp <n>       опыт');
  out('  admin points <n>   очки навыков');
  out('  admin level <n>    уровень');
  out('  admin rigs <n>     количество ригов');
  out('  admin team <n>     команда');
  out('  admin stage <n>    локация 0..2');
  out('  admin heat <n>     нагрев');
  out('  admin god          x1000 доход');
  out('  admin phrase       seed-проверка (сразу или на след. взломе)');
  out('  admin 500k         запустить катсцену unknown');
  out('  admin choice       письмо choice.exe без катсцены');
  out('  admin choice open  открыть choice.exe сразу');
  out('  admin rare         спавн редкой цели');
  out('  admin final        финальный экран (сдача)');
  out('  admin chapter 1|2  переключить главу (2 — заново)');
  out('  admin wipe         полный сброс (как первый запуск)');
  out('');
}

function adminPanel2(){
  out('АДМИН-ПАНЕЛЬ · ГЛАВА 2', 'head');
  out('');
  out('  admin n3x <n>      N3X (+/-)');
  out('  admin sp <n>       очки навыков');
  out('  admin virus <pc> <rate>   VIRUS');
  out('  admin chapter 1|2  переключить главу');
  out('  admin wipe         полный сброс (как первый запуск)');
  out('');
}

function adminChapter(arg){
  const ch = parseInt(arg, 10);
  if (ch !== 1 && ch !== 2){ out('[ADMIN] admin chapter 1|2', 'err'); return; }
  if (!booted){ out('[ADMIN] сначала start.', 'err'); return; }
  switchChapter(ch, { fresh: ch === 2 });
}

function cmdAdmin2(a, raw, n, args){
  const c = S;
  args = args || [];
  switch(a){
    case 'n3x':
      if (!isFinite(n)){ out('admin n3x <n>', 'err'); return; }
      c.n3x = Math.max(0, c.n3x + n);
      out(`[ADMIN] N3X: ${c.n3x.toFixed(1)}`, 'ok');
      break;
    case 'sp':
      if (!isFinite(n)){ out('admin sp <n>', 'err'); return; }
      c.sp = Math.max(0, Math.floor(n));
      out(`[ADMIN] SP: ${c.sp}`, 'ok');
      break;
    case 'virus': {
      const pc = parseInt(raw, 10);
      const rate = parseFloat(args[2]);
      if (!isFinite(pc)){ out('admin virus <pc> <rate>', 'err'); return; }
      c.virusInfected = Math.max(0, pc);
      if (isFinite(rate)) c.virusRate = Math.max(0, rate);
      out(`[ADMIN] VIRUS: ${c.virusInfected} · +${c.virusRate.toFixed(2)}/s`, 'ok');
      break;
    }
    case 'chapter':
      adminChapter(raw);
      return;
    case 'wipe':
      adminWipe();
      return;
    default:
      adminPanel2();
      return;
  }
  save(true);
  renderHUD();
}

function parseAmount(s){
  if (s === undefined) return NaN;
  const m = /^(-?\d+(?:[.,]\d+)?)([kmbtq]?)$/i.exec(String(s).trim());
  if (!m) return NaN;
  const mult = { k:1e3, m:1e6, b:1e9, t:1e12, q:1e15 }[m[2].toLowerCase()] || 1;
  return parseFloat(m[1].replace(',', '.')) * mult;
}

function cmdAdmin(args){
  const a = (args[0] || '').toLowerCase();
  if (a === '777'){
    adminUnlocked = true;
    S.admin = true;
    sfx('ui_open');
    out('');
    out('доступ разрешён.', 'dim');
    adminPanel();
    return;
  }
  if (!adminUnlocked){
    sfx('ui_error');
    out('access denied.', 'err');
    return;
  }
  if (!a){ adminPanel(); return; }

  const raw = args[1];
  const n = parseAmount(raw);

  if (RUN.chapter === 2) return cmdAdmin2(a, raw, n, args);

  switch(a){
    case 'money':
      if (!isFinite(n)){ out('admin money <n>', 'err'); return; }
      S.money = Math.max(0, S.money + n);
      out(`[ADMIN] баланс: $${fmt(S.money)}`, 'ok');
      break;
    case 'earned':
      if (!isFinite(n)){ out('admin earned <n>', 'err'); return; }
      S.earned = Math.max(0, n);
      out(`[ADMIN] всего заработано: $${fmt(S.earned)}`, 'ok');
      break;
    case 'xp':
      if (!isFinite(n)){ out('admin xp <n>', 'err'); return; }
      addXP(n);
      out(`[ADMIN] опыт: ${Math.floor(S.xp)}/${xpNeed(S.level)}`, 'ok');
      break;
    case 'points':
      if (!isFinite(n)){ out('admin points <n>', 'err'); return; }
      S.points = Math.max(0, Math.floor(S.points + n));
      out(`[ADMIN] очки навыков: ${S.points}`, 'ok');
      break;
    case 'level':
      if (!isFinite(n)){ out('admin level <n>', 'err'); return; }
      S.level = Math.max(1, Math.floor(n));
      S.xp = 0;
      out(`[ADMIN] уровень: ${S.level}`, 'ok');
      break;
    case 'rigs':
      if (!isFinite(n)){ out('admin rigs <n>', 'err'); return; }
      S.rigs = Math.max(0, Math.floor(n));
      out(`[ADMIN] ригов: ${S.rigs}`, 'ok');
      break;
    case 'team':
      if (!isFinite(n)){ out('admin team <n>', 'err'); return; }
      S.team = Math.max(0, Math.floor(n));
      out(`[ADMIN] команда: ${S.team}`, 'ok');
      break;
    case 'stage':
      if (!isFinite(n)){ out('admin stage <n>', 'err'); return; }
      S.stage = clamp(Math.floor(n), 0, STAGES.length - 1);
      updatePrompt();
      out(`[ADMIN] локация: ${stage().name}`, 'ok');
      break;
    case 'heat':
      if (!isFinite(n)){ out('admin heat <n>', 'err'); return; }
      S.heat = clamp(n, 0, 100);
      out(`[ADMIN] нагрев: ${Math.floor(S.heat)}%`, 'ok');
      break;
    case 'god':
      S.god = !S.god;
      out(`[ADMIN] god mode: ${S.god ? 'ON (x1000)' : 'OFF'}`, 'ok');
      break;
    case 'phrase':
      if (S.job && !S.job.frozen) freezeJob();
      else if (!S.job){ S.phraseIn = 1; out('[ADMIN] seed-проверка на следующем взломе', 'ok'); }
      break;
    case '500k':
      S.money = Math.max(S.money, 500000);
      if (!startStory(true)) out('[ADMIN] сейчас нельзя: идёт проверка, тревога или другая сцена', 'err');
      break;
    case 'choice':
      S.story = Math.max(1, S.story);
      S.choiceOpened = false;
      S.choiceResult = '';
      S.choiceAt = 0;
      S.tone = '';
      S.finished = '';
      S.flags = { backdoor:false, joined:false };
      S.mails = [];
      addMail(choiceMail(), false);
      save(true);
      out('[ADMIN] письмо choice.exe доставлено. open choice.exe', 'ok');
      if ((args[1] || '').toLowerCase() === 'open'){
        if (!booted){ out('[ADMIN] сначала start.', 'err'); break; }
        if (cutscene.active || transitioning || panic){ out('[ADMIN] сейчас нельзя: идёт другая сцена.', 'err'); break; }
        openChoice();
      }
      break;
    case 'rare':
      if (!spawnRare()) out('[ADMIN] сейчас нельзя: идёт сцена или цель уже есть.', 'err');
      break;
    case 'final':
      S.finished = 'surrender';
      renderFinal();
      break;
    case 'chapter':
      adminChapter(raw);
      return;
    case 'wipe':
      adminWipe();
      break;
    default:
      adminPanel();
  }
  refreshLiveMenu();
}

function cmdHack(arg){
  if (S.job){
    out(`уже идёт взлом: ${S.job.name}`, 'dim');
    out(`  ${bar(S.job.elapsed / S.job.duration, 18)} ${Math.floor(clamp(S.job.elapsed / S.job.duration, 0, 1) * 100)}%`, 'dim');
    return;
  }
  let t;
  if (arg){
    const q = arg.toLowerCase();
    t = findTarget(q) || TARGETS.find(x => x.name === q);
    if (!t) t = TARGETS.find(x => x.name.startsWith(q));
    if (!t){ sfx('ui_error'); out('цель не найдена. targets — список.', 'err'); return; }
    if (t !== S.rare && S.level < t.lvl){ sfx('ui_error'); out(`нужен уровень ${t.lvl}.`, 'err'); return; }
  } else {
    t = nextTarget();
  }
  startJob(t);
  if (S.heat + heatGain(t) >= 100) out('  [!] нагрев близок к критическому', 'err');
}

function cmdLoad(){
  const d = readSave();
  if (!d){ sfx('ui_error'); out('сохранение не найдено.', 'err'); return; }
  hydrate(d);
  hasSave = true;
  applyLoadedState();
  if (!S.tutorialDone && S.tutorialStep === 7) startPanic();
}

// admin wipe: полный сброс, как при первом запуске игры
async function adminWipe(){
  booted = false; // чтобы beforeunload и автосейв не вернули прогресс
  try { await removeExternalSave(); } catch(e){}
  try { await idbDel(SAVE_DIR_KEY); } catch(e){}
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && (key.indexOf('r00tkit_') === 0 || key.indexOf('garage_') === 0)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
    // страховка от старого внешнего сейва, если удалить файл не удалось
    localStorage.setItem(RESET_KEY, String(Date.now()));
  } catch(e){}
  location.reload();
}

function cmdReset(arg){
  if (arg !== 'confirm'){
    sfx('ui_error');
    out('это удалит весь прогресс. введи: reset confirm', 'err');
    return;
  }
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_SAVE_KEY); } catch(e){}
  try { localStorage.setItem(RESET_KEY, String(Date.now())); } catch(e){}
  removeExternalSave();
  RUN = { v:2, chapter:1, ch1:newState(), ch2:null, savedAt:0 };
  S = RUN.ch1;
  adminUnlocked = false;
  cutscene.token++;
  cutscene.active = false;
  stopNickGlitch();
  if (choiceTimer){ clearTimeout(choiceTimer); choiceTimer = null; }
  if (choiceCloseTimer){ clearTimeout(choiceCloseTimer); choiceCloseTimer = null; }
  choiceCanClose = false;
  choiceMode = null;
  if (choiceEl) choiceEl.classList.remove('on');
  document.body.classList.remove('choice-open');
  input.disabled = false;
  document.body.classList.remove('cutscene', 'cut-flicker', 'chapter2');
  booted = false;
  hasSave = false;
  offlineInfo = null;
  jobEl = null;
  phraseEl = null;
  panic = null;
  transitioning = false;
  document.body.classList.remove('panic');
  panicEl.classList.remove('on', 'fail');
  panicEl.setAttribute('aria-hidden', 'true');
  hud.style.display = 'none';
  updatePrompt();
  applyHints();
  updateTutorialUI();
  menu();
  music('menu');
  out('прогресс удалён. обучение начнётся заново.', 'dim');
}

function cmdFlavor(cmd, args){
  switch(cmd){
    case 'whoami':
      out(`operator · уровень ${S.level} · ${stage().name}`, '');
      break;
    case 'ls':
      out('  ' + Object.keys(FILES).join('   '));
      break;
    case 'cat': {
      const f = (args[0] || '').toLowerCase();
      if (!f){ out('cat <файл>. файлы: ' + Object.keys(FILES).join(', '), 'err'); return; }
      if (!FILES[f]){ out('нет такого файла.', 'err'); return; }
      out('');
      for (const line of FILES[f].split('\n')) out('  ' + line, 'dim');
      out('');
      break;
    }
    case 'sudo':
      out('ты уже root. гордыня — грех.', 'dim');
      break;
    case 'echo':
      out(args.join(' '));
      break;
    case 'date':
      out('  ' + new Date().toLocaleString('ru-RU'), 'dim');
      break;
    case 'exit':
      out('выхода нет. сделка уже подписана.', 'dim');
      break;
  }
}

/* ---------- диспетчер ---------- */

function run(line){
  if (cutscene.active) return;
  echo(line);
  const parts = line.trim().split(/\s+/);
  let cmd = (parts[0] || '').toLowerCase();
  cmd = ALIASES[cmd] || cmd;
  const args = parts.slice(1);

  if (transitioning){
    out('...', 'dim');
    return;
  }

  if (cmd === 'chapter' && (args[0] === '1' || args[0] === '2')){
    switchChapter(Number(args[0]));
    return;
  }

  if (panic && !['wipe','purge'].includes(cmd)){
    sfx('ui_error');
    out('НЕ ВРЕМЯ. СТИРАЙ ДАННЫЕ: wipe', 'err');
    return;
  }

  if (S.phrase && booted){
    phraseAttempt(line);
    return;
  }

  if (!booted && !['start','help','clear','hints','admin','reset','whoami','ls','cat','sudo','echo','date','exit','saves','export','import'].includes(cmd)){
    out('сначала введите "start".', 'dim');
    return;
  }

  if (window.R00TKITChapter2 && window.R00TKITChapter2.handle(cmd, args, line)) return;

  if (cmd === 'mail' && S.story === 0 && !S.mails.length){
    out('[MAIL] почта пуста.', 'dim');
    return;
  }

  switch(cmd){
    case 'start': cmdStart(); break;
    case 'help': cmdHelp(); break;
    case 'status': cmdStatus(); break;
    case 'hack': cmdHack(args[0]); break;
    case 'targets': cmdTargets(); break;
    case 'mail': cmdMail(args); break;
    case 'open': cmdOpen(args); break;
    case 'menu': cmdMenu(); break;
    case 'shop': cmdShop(); break;
    case 'buy': cmdBuy(args); break;
    case 'farm': cmdFarm(); break;
    case 'rig': cmdFarm(); break;
    case 'team': cmdTeam(args); break;
    case 'skills': cmdSkills(); break;
    case 'learn': cmdLearn(args); break;
    case 'move': cmdMove(args[0]); break;
    case 'cool': cmdCool(); break;
    case 'save': save(false); break;
    case 'load': cmdLoad(); break;
    case 'saves': cmdSaves(args); break;
    case 'export': cmdExport(); break;
    case 'import': cmdImport(args); break;
    case 'clear': logEl.innerHTML = ''; jobEl = null; menuEl = null; menuKind = null; menuRender = null; if (booted && S.job) createJobLine(); break;
    case 'hints': cmdHints(); break;
    case 'wipe': case 'purge': cmdWipe(); break;
    case 'reset': cmdReset(args[0]); break;
    case 'admin': cmdAdmin(args); break;
    case 'whoami': case 'ls': case 'cat': case 'sudo': case 'echo': case 'date': case 'exit':
      cmdFlavor(cmd, args); break;
    default:
      sfx('ui_error');
      out(`команда не найдена: ${cmd}. help — список.`, 'err');
  }

  tutorialAfterCommand(cmd);
}

/* ---------- ввод ---------- */

input.addEventListener('keydown', e => {
  if (e.key === 'Enter'){
    const line = input.value;
    input.value = '';
    if (line.trim()){
      if (history[history.length - 1] !== line) history.push(line);
      histIdx = history.length;
      run(line);
    }
    e.preventDefault();
  } else if (e.key === 'ArrowUp'){
    e.preventDefault();
    if (histIdx > 0){ histIdx--; input.value = history[histIdx] || ''; }
  } else if (e.key === 'ArrowDown'){
    e.preventDefault();
    if (histIdx < history.length - 1){ histIdx++; input.value = history[histIdx] || ''; }
    else { histIdx = history.length; input.value = ''; }
  } else if (e.key === 'Tab'){
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    const m = CMDS.filter(c => c.startsWith(v.toLowerCase()) && (c !== 'mail' || S.story > 0 || S.mails.length));
    if (m.length === 1) input.value = m[0] + ' ';
    else if (m.length > 1) out('  ' + m.join('  '), 'dim');
  }
});

if (choiceInput){
  choiceInput.addEventListener('keydown', e => {
    if (e.key === 'Enter'){
      e.preventDefault();
      choiceInputHandle();
    } else if (e.key === 'Escape'){
      e.preventDefault();
    }
  });
}

document.addEventListener('keydown', e => {
  if (choiceMode === 'done' && choiceCanClose){
    e.preventDefault();
    finishChoice();
  }
}, true);

if (choiceEl){
  choiceEl.addEventListener('click', () => {
    if (choiceMode === 'done' && choiceCanClose) finishChoice();
  });
}

document.addEventListener('click', e => {
  if (!uiReady) return;
  if (document.body.classList.contains('choice-open')) return;
  if (e.target.tagName === 'INPUT') return;
  if (window.getSelection().toString()) return;
  input.focus();
});

/* ---------- импорт сохранения перетаскиванием ---------- */

document.addEventListener('dragover', e => {
  if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault();
});

document.addEventListener('drop', async e => {
  const files = e.dataTransfer && e.dataTransfer.files;
  if (!files || !files.length) return;
  e.preventDefault();
  if (!uiReady) return;
  if (cutscene.active || transitioning || panic){
    out('сейчас нельзя импортировать сохранение.', 'err');
    return;
  }
  try {
    const payload = normalizePayload(JSON.parse(await files[0].text()));
    if (!payload || !payload.state){
      sfx('ui_error');
      out('это не файл сохранения R00TKIT.', 'err');
      return;
    }
    applyImportedSave(payload, false);
    out('[SAVE] сохранение импортировано.', 'ok');
    sfx('ui_buy');
  } catch(err){
    sfx('ui_error');
    out('не удалось прочитать файл сохранения.', 'err');
  }
});

/* ---------- инициализация ---------- */

async function initUI(){
  if (uiReady) return;
  const saved = readSave();
  if (saved){
    hydrate(saved);
    hasSave = true;
  }
  await initExternalSave();
  if (externalLoaded) hasSave = true;
  if (hasSave) { if (RUN.chapter === 1) applyOffline(); }
  uiReady = true;
  S.nick = readNick() || S.nick;
  S.showHints = false;
  applyHints();
  updateTutorialUI();
  document.body.classList.toggle('chapter2', RUN.chapter === 2);
  menu();
  updatePrompt();
  renderHUD();
  input.focus();
}

window.R00TKIT = { init: initUI };

window.R00TKITCore = {
  get state(){ return S; },
  get run(){ return RUN; },
  get chapter(){ return RUN.chapter; },
  setState(next){
    if (RUN.chapter === 2) RUN.ch2 = next;
    else RUN.ch1 = next;
    S = next;
  },
  newState: () => newState(),
  readNick: () => readNick(),
  out, outHTML, outTyped, clearConsole,
  fmt, fmtTime, esc, note,
  addMail, storyMail, sfx, music,
  beginCutscene, finishCutscene, cutLine, cutAlive, sleep,
  renderHUD, updatePrompt, updateBadges,
  save: () => save(true),
  hideHints(){ hintsEl.classList.add('off'); },
  setTask(text){ taskEl.hidden = !text; taskEl.textContent = text || ''; },
  focusInput(){ input.disabled = false; input.focus(); },
  disableInput(){ input.disabled = true; input.blur(); },
  enableInput(){ input.disabled = false; },
  cutsceneActive(){ return !!cutscene.active; },
  switchChapter, bootChapter, restartChapter2
};

setInterval(tick, 100);
setInterval(() => { if (booted) save(true); }, 10000);
window.addEventListener('beforeunload', () => { if (booted) save(true); });
})();