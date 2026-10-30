(() => {
'use strict';

const Core = window.GarageCore;
if (!Core) return;

const out = (...a) => Core.out(...a);
const fmt = Core.fmt;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = Core.sleep;

/* ---------- цели главы 2 ---------- */

const TARGETS = [
  { id:1, name:'Виктор Ланской', role:'торговец людьми', need:'счета', stars:2, reward:900, trust:7, minTrust:0, risk:22,
    brief:'держит сеть перевозки людей через три страны. деньги спрятаны в подставных фирмах.' },
  { id:2, name:'Олег Круг', role:'крышует грабежи', need:'переписка', stars:1, reward:600, trust:5, minTrust:0, risk:15,
    brief:'мелкий посредник. сводит исполнителей с заказчиками и берёт процент.' },
  { id:3, name:'Марина Соболь', role:'коррупционер', need:'доказательства', stars:3, reward:1200, trust:9, minTrust:55, risk:30,
    brief:'чиновница. подписывает контракты через родственников и не любит внимания.' },
  { id:4, name:'Аркадий Лис', role:'подпольный делец', need:'адреса жертв', stars:3, reward:1400, trust:10, minTrust:62, risk:36,
    brief:'скупает чужие долги и выбивает их людьми без лиц. жертвы исчезают из списков.' },
  { id:5, name:'Сергей Волк', role:'наркоторговец', need:'счета', stars:4, reward:1700, trust:13, minTrust:72, risk:46,
    brief:'держит логистику и платит полиции. осторожен, почти не оставляет цифровых следов.' },
  { id:6, name:'Nadia Rex', role:'торговец данными', need:'переписка', stars:5, reward:2000, trust:16, minTrust:82, risk:58,
    brief:'продаёт базы на закрытых форумах. знает, кто стоит за «НИМИ», и молчит об этом.' }
];

const METHOD_NAMES = { phish:'фишинг', social:'соц. инженерия', hack:'технический взлом', bribe:'подкуп' };

/* ---------- сеть: мелкие задания ---------- */

const NET_NAMES = ['Виктор Ланской','Олег Круг','Марина Соболь','Аркадий Лис','Сергей Волк','Алиса Ветрова','Дмитрий Ким','Роман Барс'];
const NET_NICKS = ['ghost_77','nullbyte','kira.exe','m4x','v0id','rootcat','n3on','saint'];
const NET_SITES = ['bank-ural.ru','crypto-pay.io','forum.garage','market.dark','login-secure.tk','pastebin.cc','cloud-dump.net'];
const NET_ORGS = ['банк «Урал»','картель «Ночь»','фонд «Доверие»','портал «Сеть»','логистика «Восток»'];

const NET_POOLS = { name:NET_NAMES, nick:NET_NICKS, site:NET_SITES, org:NET_ORGS };

const NET_TEMPLATES = [
  { id:'s1', verb:'scan', text:'найти открытый профиль {name}' },
  { id:'s2', verb:'scan', text:'найти инфу про хакера {nick}' },
  { id:'s3', verb:'scan', text:'проверить утечку {site}' },
  { id:'s4', verb:'scan', text:'собрать архив по {name}' },
  { id:'s5', verb:'scan', text:'найти докс на {name}' },
  { id:'s6', verb:'scan', text:'найти след {nick} в {site}' },
  { id:'s7', verb:'scan', text:'снести тг-аккаунт {nick}' },
  { id:'c1', verb:'check', text:'проверить уязвимость сайта {site}' },
  { id:'c2', verb:'check', text:'проверить данные {name}' },
  { id:'c3', verb:'check', text:'сверить базу {org}' },
  { id:'c4', verb:'check', text:'проверить платежи {org}' },
  { id:'c5', verb:'check', text:'проверить фишинговый домен {site}' },
  { id:'c6', verb:'check', text:'проверить слив базы {org}' },
  { id:'c7', verb:'check', text:'проверить адрес {name}' },
  { id:'f1', verb:'confirm', text:'подтвердить личность {name}' },
  { id:'f2', verb:'confirm', text:'подтвердить утечку {site}' },
  { id:'f3', verb:'confirm', text:'подтвердить адрес {name}' },
  { id:'f4', verb:'confirm', text:'подтвердить связь {name} и {org}' },
  { id:'f5', verb:'confirm', text:'дефнуть от доксеров {name}' },
  { id:'f6', verb:'confirm', text:'перевести деньги {nick} на благотворительность' },
  { id:'f7', verb:'confirm', text:'подтвердить слив {site}' }
];

function pickFrom(list){ return list[Math.floor(Math.random() * list.length)]; }

function makeNetTask(verb, c){
  const pool = NET_TEMPLATES.filter(t => t.verb === verb);
  const seen = Array.isArray(c.netSeen) ? c.netSeen : [];
  let available = pool.filter(t => !seen.includes(t.id));
  if (!available.length) available = pool;
  const tpl = pickFrom(available);
  seen.push(tpl.id);
  while (seen.length > 8) seen.shift();
  c.netSeen = seen;
  const title = tpl.text.replace(/\{(\w+)\}/g, (_, key) => pickFrom(NET_POOLS[key] || ['—']));
  return {
    verb,
    tpl: tpl.id,
    title,
    trust: 1 + Math.floor(Math.random() * 3),
    money: 5 + Math.floor(Math.random() * 26),
    duration: 3 + Math.floor(Math.random() * 4)
  };
}

let netLineEl = null;

/* ---------- состояние ---------- */

let pendingEscape = false;
let socialPick = false;

function state(){ return Core.state; }

function ensure(){
  const s = state();
  if (!s || !s.chapter2) return null;
  if (!s.ch2 || typeof s.ch2 !== 'object') s.ch2 = {};
  const c = s.ch2;
  if (!isFinite(Number(c.trust))) c.trust = 50;
  if (!isFinite(Number(c.done))) c.done = 0;
  if (!isFinite(Number(c.sp))) c.sp = 0;
  if (!c.skills || typeof c.skills !== 'object') c.skills = {};
  for (const k of Object.keys(METHOD_NAMES)) if (!isFinite(Number(c.skills[k]))) c.skills[k] = 0;
  if (!Array.isArray(c.completed)) c.completed = [];
  if (!c.closed || typeof c.closed !== 'object') c.closed = {};
  if (!c.extra || typeof c.extra !== 'object') c.extra = {};
  if (!Array.isArray(c.netSeen)) c.netSeen = [];
  if (!c.netTasks || typeof c.netTasks !== 'object') c.netTasks = {};
  for (const v of ['scan', 'check', 'confirm']){
    if (!c.netTasks[v] || typeof c.netTasks[v] !== 'object' || !c.netTasks[v].title) c.netTasks[v] = makeNetTask(v, c);
  }
  if (!c.netJob || typeof c.netJob !== 'object') c.netJob = null;
  if (typeof c.introSeen !== 'boolean') c.introSeen = false;
  if (!c.op || typeof c.op !== 'object') c.op = null;
  if (typeof c.ended !== 'boolean') c.ended = false;
  if (typeof c.finalOffered !== 'boolean') c.finalOffered = false;
  return c;
}

function targetById(id){
  return TARGETS.find(t => t.id === Number(id)) || null;
}

function bar(p){
  p = clamp(Number(p) || 0, 0, 1);
  const n = Math.round(p * 20);
  return '█'.repeat(n) + '░'.repeat(20 - n);
}

function stars(n){
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

/* ---------- письма главы 1 ---------- */

function tickChapter1(){
  const s = state();
  if (!s || !s.started || s.chapter2 || !s.story || s.finished) return;
  if (!s.ch2Mail || typeof s.ch2Mail !== 'object') s.ch2Mail = { m1:false, m2:false, m3:false };
  const m = s.ch2Mail;
  if (!m.m1 && s.earned >= 1500000){
    m.m1 = true;
    Core.addMail(Core.storyMail('скоро', 'заработай ещё немного, скоро увидимся'));
    Core.save();
  }
  if (!m.m2 && s.earned >= 5000000){
    m.m2 = true;
    Core.addMail(Core.storyMail('цель близко', 'ты очень близок к цели'));
    Core.save();
  }
  if (!m.m3 && s.earned >= 10000000){
    m.m3 = true;
    Core.addMail(Core.storyMail(
      'НУЖНО БЕЖАТЬ',
      'НУЖНО БЕЖАТЬ! Я вижу что ОНИ уже вычислили тебя, тебе надо бежать, я в файле лежат координаты, качай на флешку, бери ноут и вали. там же лежит билет, скачай на телефон, в аэропорту покажешь qr-код. не спрашивай куда, так нужно',
      'data.txt'
    ));
    Core.save();
  }
}

/* ---------- data.txt и выбор побега ---------- */

function openData(){
  const s = state();
  if (!s.mails || !s.mails.some(m => m.attachment === 'data.txt')){
    out('файла data.txt нет. проверь почту: mail', 'err');
    return;
  }
  Core.clearConsole();
  out('data.txt', 'head');
  out('');
  out('  координаты: 67.565094, 30.478012', '');
  out('  билет: 3P-0917 · место 13A', '');
  out('  аэропорт: Мурманск · вылет через 6 часов', 'dim');
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

function escapeEnding(){
  out('');
  out('ты закрываешь ноутбук.', 'dim');
  out('флешка в кармане. билет в телефоне. дверь скрипит.', 'dim');
  out('');
  enterChapter2().catch(() => {});
}

function prisonEnding(){
  const s = state();
  s.finished = 'prison';
  Core.save();
  Core.clearConsole();
  Core.setTask('');
  out('СИГНАЛ ПОТЕРЯН', 'head');
  out('');
  out('ОНИ задержали тебя и везут в тюрьму.', 'err');
  out('тебе приписали 18 статей.', 'err');
  out('срок — 99 лет, без права на досрочное.', 'err');
  out('');
  out('проверка связи завершена. терминал замолчал.', 'dim');
  out('');
  out('reset confirm — начать заново.', 'dim');
  out('');
}

/* ---------- вход в главу 2 ---------- */

async function enterChapter2(){
  pendingEscape = false;
  socialPick = false;
  netLineEl = null;
  const old = state();
  const nick = old.nick || Core.readNick();
  const next = Core.newState();
  next.started = true;
  next.nick = nick;
  next.money = 1000;
  next.tutorialDone = true;
  next.tutorialStep = 8;
  next.chapter2 = true;
  next.ch2 = {
    trust: 50, done: 0, sp: 0,
    skills: { phish:0, social:0, hack:0, bribe:0 },
    completed: [], closed: {}, op: null,
    introSeen: false, ended: false, finalOffered: false
  };
  Core.setState(next);
  Core.clearConsole();
  Core.updatePrompt();
  Core.hideHints();
  Core.renderHUD();
  Core.save();
  await introCutscene();
}

async function introCutscene(){
  const s = state();
  const c = ensure();
  if (!s || !c) return;
  Core.clearConsole();
  Core.setTask('');
  Core.music('gameplay');
  const token = Core.beginCutscene();
  await sleep(700);
  if (!Core.cutAlive(token)) return;

  const lines = [
    ['hacker', 'Дыши. Ты в безопасности. Пока.'],
    ['player', 'Кто ты? И где я?'],
    ['hacker', 'Меня зовут cyber_leek. Раньше я работал на картель. Взламывал всё, что плохо лежит. Заработал миллионы.'],
    ['hacker', 'Однажды мой взлом открыл не ту дверь. Погиб человек. Не мой заказ, но моя работа.'],
    ['hacker', 'С тех пор я не беру грязных денег. Сливаю тех, кто торгует людьми, крышует грабежи, прячет коррупцию.'],
    ['player', 'Почему я?'],
    ['hacker', 'У меня нет лица в базах. У тебя тоже. Но у тебя есть скорость и молодость. Я сгорел как личность — ты чистый лист.'],
    ['hacker', 'Я не идеалист. Иногда придётся выбирать меньшее зло. Иногда — врать себе, что иначе было нельзя.'],
    ['hacker', 'Меня ищут ОНИ. Те же, кто гнал тебя. Я в бегах дольше и тише. Поэтому мне нужен ты.'],
    ['player', 'Что мне делать?'],
    ['hacker', 'Слушай задания. Ищи людей. Собирай доказательства. Отдавай их тем, кто сможет остановить цель.'],
    ['hacker', 'Доверие важнее денег. Чем чище работаешь — тем серьёзнее цели. Гранты небольшие. На жизнь хватит.'],
    ['hacker', 'Начнём с простого. targets — список. op <id> — операция. И не называй меня unknown. Теперь у меня есть имя.']
  ];

  for (const [who, text] of lines){
    if (!Core.cutAlive(token)) return;
    await Core.cutLine(who, text, token, who === 'hacker' ? 'cut-hacker' : '', who === 'hacker' ? 'cyber_leek' : 'you');
  }
  if (!Core.cutAlive(token)) return;

  Core.finishCutscene(token);
  c.introSeen = true;
  Core.clearConsole();
  out('ГЛАВА 2', 'head');
  out('ТИХАЯ КОМНАТА · $1000 на счету', '');
  out('');
  out('  мы работаем на cyber_leek. денег мало, цели серьёзные.', 'dim');
  out('  targets — список людей · dossier <id> — досье', 'dim');
  out('  op <id> — начать операцию · jobs — текущая операция', 'dim');
  out('  help — все команды', 'dim');
  out('');
  Core.setTask('выбери цель: targets');
  Core.focusInput();
  Core.renderHUD();
  Core.save();
}

/* ---------- меню и старт главы 2 ---------- */

function menu(){
  Core.clearConsole();
  out('R00TKIT // ГЛАВА 2', 'head');
  out('');
  out('  ТИХАЯ КОМНАТА · $1000', '');
  out('');
  out('  введите "start" чтобы продолжить', '');
  out('  help — список команд', 'dim');
  out('');
}

function start(){
  const s = state();
  const c = ensure();
  if (!s || !c) return;
  if (!c.introSeen){ introCutscene().catch(() => {}); return; }
  Core.clearConsole();
  out('ТИХАЯ КОМНАТА', 'head');
  out(`  $${fmt(s.money)} · доверие ${Math.round(c.trust)} · операций ${c.done}`, '');
  out('');
  out('  targets — цели · op <id> — операция · jobs — текущая', 'dim');
  out('  net — задания сети для Trust · help — все команды', 'dim');
  out('');
  if (c.ended) out('  история главы 2 завершена.', 'dim');
  Core.setTask(c.op ? `операция: ${targetById(c.op.id)?.name || 'цель'} · ${stepName(c.op)}` : 'выбери цель: targets');
  Core.hideHints();
  Core.focusInput();
  Core.renderHUD();
  Core.save();
}

function stepName(op){
  if (!op) return '';
  if (op.step === 'access') return 'доступ';
  if (op.step === 'search') return 'поиск данных';
  if (op.step === 'leak') return 'слив';
  return op.step;
}

/* ---------- команды ---------- */

function help(){
  out('ГЛАВА 2 · КОМАНДЫ', 'head');
  out('');
  out('ЦЕЛИ', 'head');
  out('  targets              список людей', '');
  out('  dossier <id>         досье цели', '');
  out('');
  out('ОПЕРАЦИЯ', 'head');
  out('  op <id>              начать операцию', '');
  out('  jobs                 текущая операция', '');
  out('  phish | social | hack | bribe   доступ', '');
  out('  copy accounts|messages|evidence|all   поиск', '');
  out('  cover                замести следы ($250)', '');
  out('');
  out('СЛИВ', 'head');
  out('  leak press|police|leek   отдать данные', '');
  out('  sell                 продать на сторону (-Trust)', '');
  out('');
  out('РАЗВИТИЕ И СВЯЗЬ', 'head');
  out('  trust                текущее доверие', '');
  out('  net                  задания сети (+1–3 trust)', '');
  out('  net scan|check|confirm   взять задание', '');
  out('  skills               навыки', '');
  out('  learn <метод>        потратить очко навыка', '');
  out('  leek                 связаться с cyber_leek', '');
  out('  status               состояние', '');
  out('  mail                 почта', '');
  out('');
  out('ФИНАЛ', 'head');
  out('  stay | leave         решение после шести операций', '');
  out('');
}

function cmdTargets(c){
  out('ЦЕЛИ · люди', 'head');
  out(`  доверие ${Math.round(c.trust)} · операций ${c.done}`, 'dim');
  out('');
  for (const t of TARGETS){
    const done = c.completed.includes(t.id);
    const closed = (c.closed[t.id] || 0) > Date.now();
    const locked = c.trust < t.minTrust;
    let status = '';
    if (done) status = 'закрыто';
    else if (closed) status = 'в тени · ' + Core.fmtTime(Math.ceil((c.closed[t.id] - Date.now()) / 1000));
    else if (locked) status = 'нужно доверие ' + t.minTrust + ' · net';
    out(`  [${t.id}] ${t.name} · ${t.role} · ${stars(t.stars)} · $${fmt(t.reward)} · +${t.trust} trust`, done ? 'dim' : '');
    out(`       ищем: ${t.need}${status ? ' · ' + status : ''}`, 'dim');
  }
  out('');
  out('  dossier <id> — подробнее · op <id> — начать', 'dim');
  out('');
}

function cmdDossier(t){
  out(`ДОСЬЕ · ${t.name}`, 'head');
  out(`  кто:        ${t.role}`, '');
  out(`  ищем:       ${t.need}`, '');
  out(`  сложность:  ${stars(t.stars)}`, '');
  out(`  риск:       ${t.risk}%`, '');
  out(`  награда:    $${fmt(t.reward)} · +${t.trust} trust`, '');
  out(`  порог:      доверие ${t.minTrust}`, 'dim');
  out('');
  out('  ' + t.brief, 'dim');
  out('');
}

function cmdOp(c, id){
  if (c.ended){ out('история завершена. новых операций нет.', 'dim'); return; }
  if (c.op){ out(`уже идёт операция: ${targetById(c.op.id)?.name || 'цель'} · jobs`, 'dim'); return; }
  const t = targetById(id);
  if (!t){ out('op <id>. targets — список целей.', 'err'); return; }
  if (c.completed.includes(t.id)){ out(`${t.name}: цель уже закрыта.`, 'dim'); return; }
  const until = c.closed[t.id] || 0;
  if (until > Date.now()){ out(`${t.name} в тени ещё ${Core.fmtTime(Math.ceil((until - Date.now()) / 1000))}.`, 'dim'); return; }
  if (c.trust < t.minTrust){ out(`нужно доверие ${t.minTrust}. сейчас ${Math.round(c.trust)}. используй net — задания сети.`, 'err'); return; }
  c.op = { id:t.id, step:'access', progress:15, risk:t.risk, fails:0, hardened:false };
  out('');
  out(`ОПЕРАЦИЯ · ${t.name}`, 'head');
  out(`  ${t.role} · ${stars(t.stars)} · риск ${t.risk}%`, '');
  out(`  ищем: ${t.need}`, 'dim');
  out('');
  out('  шаг 1: как войти?', '');
  out('  phish — фишинг · social — соц. инженерия', 'dim');
  out('  hack — технический взлом · bribe — подкуп', 'dim');
  out('');
  Core.setTask(`операция: ${t.name} · доступ (phish/social/hack/bribe)`);
  Core.save();
  Core.updateBadges();
}

function cmdJobs(c){
  if (!c.op){ out('активных операций нет. op <id>', 'dim'); return; }
  const t = targetById(c.op.id);
  const op = c.op;
  out('ТЕКУЩАЯ ОПЕРАЦИЯ', 'head');
  out(`  цель: ${t ? t.name : '—'}`, '');
  out(`  шаг:  ${stepName(op)} · ${op.progress}% · риск ${op.risk}%`, '');
  out(`  ${bar(op.progress / 100)}`, 'dim');
  if (op.step === 'access') out('  дальше: phish | social | hack | bribe', 'dim');
  else if (op.step === 'search') out('  дальше: copy accounts|messages|evidence|all', 'dim');
  else if (op.step === 'leak') out('  дальше: leak press|police|leek · sell', 'dim');
  if (op.hardened) out('  цель насторожилась. другой метод может сработать лучше.', 'dim');
  out('');
}

function cmdTrust(c){
  out('ДОВЕРИЕ', 'head');
  out(`  сейчас: ${Math.round(c.trust)} / 100`, '');
  out('');
  out('  влияет на доступные цели, размер грантов и письма.', 'dim');
  out('  растёт за чистые операции · падает за грязные методы.', 'dim');
  out('');
}

function cmdSkills(c){
  out('НАВЫКИ ГЛАВЫ 2', 'head');
  out(`  свободных очков: ${c.sp}`, '');
  out('');
  for (const id of Object.keys(METHOD_NAMES)){
    const lvl = c.skills[id];
    let bonus = '';
    if (id === 'phish') bonus = `+${lvl * 5}% успех`;
    else if (id === 'social') bonus = `+${lvl * 5}% успех`;
    else if (id === 'hack') bonus = `-$${lvl * 15} цена · +${lvl * 3}% успех`;
    else if (id === 'bribe') bonus = `-$${lvl * 20} цена`;
    out(`  ${id.padEnd(7)} ур.${lvl}  ${bonus}`, '');
  }
  out('');
  out('  learn <phish|social|hack|bribe> — потратить очко', 'dim');
  out('');
}

function cmdLearn(c, q){
  q = String(q || '').toLowerCase();
  if (!METHOD_NAMES[q]){ out('learn phish|social|hack|bribe', 'err'); return; }
  if (c.sp < 1){ out('нет свободных очков. они даются за успешные операции.', 'err'); return; }
  c.sp--;
  c.skills[q]++;
  out(`[+] ${METHOD_NAMES[q]} → ур.${c.skills[q]} · осталось очков: ${c.sp}`, 'ok');
  Core.save();
}

function cmdLeek(c){
  out('cyber_leek', 'head');
  if (c.trust >= 75) out('  «ты держишься. я вижу. продолжай в том же духе.»', '');
  else if (c.trust >= 50) out('  «не спеши. чистая работа важнее громкой. я рядом.»', '');
  else out('  «я не прошу быть святым. прошу не превращаться в них.»', '');
  out('');
  out('  он не отвечает мгновенно. письма приходят в mail.', 'dim');
  out('');
}

function method(c, id){
  const op = c.op;
  if (!op || op.step !== 'access'){ out('сейчас не шаг доступа. jobs — статус.', 'dim'); return; }
  const t = targetById(op.id);
  if (!t) return;
  if (id === 'social'){
    Core.clearConsole();
    out('СОЦ. ИНЖЕНЕРИЯ · выбери реплику', 'head');
    out('');
    out('  1) «Здравствуйте, я из службы безопасности банка. Нужно уточнить платёж.»', '');
    out('  2) «Извините, я ошибся номером. Раз вы ответили — у вас есть минута?»', '');
    out('  3) «Откройте доступ. Иначе пожалеете.»', '');
    out('');
    socialPick = true;
    Core.setTask('social: выбери 1, 2 или 3');
    Core.save();
    return;
  }
  let cost = 0, chance = 0, label = METHOD_NAMES[id] || id;
  if (id === 'phish'){
    chance = 0.72 + c.skills.phish * 0.05 - (t.stars - 1) * 0.05 - (op.hardened ? 0.10 : 0);
  } else if (id === 'hack'){
    cost = Math.max(120, 150 + t.stars * 80 - c.skills.hack * 15);
    chance = 0.86 + c.skills.hack * 0.03 - (t.stars - 1) * 0.04 - (op.hardened ? 0.06 : 0);
  } else if (id === 'bribe'){
    cost = Math.max(220, 300 + t.stars * 100 - c.skills.bribe * 20);
    chance = 0.95 + c.skills.bribe * 0.01;
  } else {
    out('метод: phish | social | hack | bribe', 'err');
    return;
  }
  if (cost > 0) cost = Math.round(cost * (1 + 0.25 * (c.extra[t.id] || 0)));
  if (cost > 0 && state().money < cost){ out(`нужно $${fmt(cost)} на ${label}. не хватает $${fmt(cost - state().money)}.`, 'err'); return; }
  if (cost > 0) state().money -= cost;
  out('');
  out(`> ${label}${cost ? ' · -$' + fmt(cost) : ''}`, 'dim');
  if (Math.random() < clamp(chance, 0.15, 0.98)){
    op.progress = Math.min(100, op.progress + 30);
    op.step = 'search';
    op.hardened = false;
    out('> доступ получен. цель пока ничего не поняла.', 'ok');
    out('');
    out('  шаг 2: что копируем?', '');
    out('  copy accounts · messages · evidence · all', 'dim');
    Core.setTask(`операция: ${t.name} · поиск данных (copy ...)`);
  } else {
    accessFail(c, op, t, label);
  }
  Core.save();
}

function resolveSocial(pick){
  socialPick = false;
  const s = state();
  const c = ensure();
  if (!s || !c || !c.op){ return; }
  const op = c.op;
  const t = targetById(op.id);
  if (!t) return;
  const chance = (pick === '2' ? 0.90 : pick === '1' ? 0.55 : 0.18) + c.skills.social * 0.05;
  if (pick === '2') out('> «Конечно, спрашивайте.» — голос на другом конце устал, но не подозревает.', '');
  else if (pick === '1') out('> «Служба безопасности? У меня нет счетов в этом банке.» — пауза слишком длинная.', '');
  else out('> «Кто вы вообще такой?» — трубка замолкает.', 'dim');
  if (Math.random() < clamp(chance, 0.1, 0.97)){
    op.progress = Math.min(100, op.progress + 30);
    op.step = 'search';
    op.hardened = false;
    out('> контакт сработал. доступ есть.', 'ok');
    out('');
    out('  шаг 2: что копируем?', '');
    out('  copy accounts · messages · evidence · all', 'dim');
    Core.setTask(`операция: ${t.name} · поиск данных (copy ...)`);
  } else {
    accessFail(c, op, t, 'social');
  }
  Core.save();
}

function accessFail(c, op, t, label){
  op.fails++;
  op.hardened = true;
  op.progress = Math.max(0, op.progress - 10);
  op.risk = Math.min(100, op.risk + 10);
  out(`> ${label}: цель насторожилась. защита усилена.`, 'err');
  if (op.fails >= 3){
    targetFled(c, t, 'доступ не удался');
    return;
  }
  out('  попробуй другой метод или cover, чтобы сбить след.', 'dim');
  out('');
}

function cmdCopy(c, kind){
  const op = c.op;
  if (!op || op.step !== 'search'){ out('сейчас не шаг поиска. jobs — статус.', 'dim'); return; }
  const t = targetById(op.id);
  if (!t) return;
  kind = String(kind || '').toLowerCase();
  if (!['accounts', 'messages', 'evidence', 'all'].includes(kind)){
    out('copy accounts|messages|evidence|all', 'err');
    return;
  }
  const all = kind === 'all';
  const chance = clamp(0.84 - op.risk / 500 - (all ? 0.16 : 0) + (kind === t.need ? 0.06 : 0), 0.25, 0.95);
  out('');
  out(`> копирую: ${kind === 'all' ? 'всё сразу' : kind}${all ? ' · дольше и рискованнее' : ''}`, 'dim');
  if (Math.random() < chance){
    op.progress = Math.min(100, op.progress + (all ? 55 : 35));
    op.risk = Math.min(100, op.risk + (all ? 10 : 4));
    op.step = 'leak';
    out('> данные у тебя. след пока холодный.', 'ok');
    out('');
    out('  шаг 3: кому слить?', '');
    out('  leak press · leak police · leak leek · sell', 'dim');
    Core.setTask(`операция: ${t.name} · слив (leak ... / sell)`);
  } else {
    op.fails++;
    op.risk = Math.min(100, op.risk + 12);
    op.progress = Math.max(0, op.progress - 10);
    out('> цель заметила копирование. защита усложнилась.', 'err');
    if (op.fails >= 3){ targetFled(c, t, 'копирование сорвалось'); Core.save(); return; }
    out('  попробуй другой набор или cover.', 'dim');
    out('');
  }
  Core.save();
}

function cmdLeak(c, kind){
  const op = c.op;
  if (!op || op.step !== 'leak'){ out('сейчас не шаг слива. jobs — статус.', 'dim'); return; }
  const t = targetById(op.id);
  if (!t) return;
  kind = String(kind || '').toLowerCase();
  if (kind !== 'press' && kind !== 'police' && kind !== 'leek' && kind !== 'sell'){
    out('leak press|police|leek · sell', 'err');
    return;
  }
  let chance = kind === 'police' ? 0.86 : kind === 'press' ? 0.76 : kind === 'sell' ? 0.88 : 0.90;
  chance = clamp(chance - op.risk / 500, 0.3, 0.96);
  out('');
  if (Math.random() >= chance){
    targetFled(c, t, 'слив провалился');
    return;
  }
  const base = Math.round(t.reward * (0.78 + c.trust / 250));
  let grant = base, dTrust = t.trust, line = '';
  if (kind === 'police'){ grant = Math.round(base * 0.8); dTrust = t.trust + 2; line = 'дело ушло в следствие. тихо, но надолго.'; }
  else if (kind === 'press'){ grant = base; dTrust = t.trust; line = 'журналисты подхватили. громко — цель может уйти.'; }
  else if (kind === 'leek'){ grant = Math.round(base * 0.7); dTrust = t.trust + 3; line = 'cyber_leek забрал данные. он решит, что с ними делать.'; }
  else { grant = Math.round(base * 1.8); dTrust = -Math.max(3, Math.round(t.trust * 0.8)); line = 'ты продал данные на сторону. деньги есть. доверие — нет.'; }
  grant = Math.max(500, Math.round(grant));

  state().money += grant;
  c.trust = clamp(c.trust + dTrust, 0, 100);
  c.done++;
  c.sp++;
  c.completed.push(t.id);
  c.op = null;
  out(`[ОПЕРАЦИЯ] ${t.name} — закрыта.`, 'ok');
  out(`  ${line}`, 'dim');
  out(`  +$${fmt(grant)} · trust ${dTrust >= 0 ? '+' : ''}${dTrust} · операций: ${c.done}`, '');
  out('');
  mailAfter(c, t, kind, grant);
  if (c.done === 3){
    Core.addMail({
      id:'c2story3' + Date.now(), from:'cyber_leek', subject:'они уже рядом',
      body:'три операции. ты начал понимать, как это работает.\nОНИ тоже начали понимать, что кто-то чистит их людей.\nне расслабляйся. и не думай, что ты герой.',
      read:false
    });
  }
  if (c.done === 5){
    Core.addMail({
      id:'c2story5' + Date.now(), from:'cyber_leek', subject:'последний шаг',
      body:'ещё одна цель — и я скажу тебе то, что не говорил никому.\nпосле этого решай сам, остаёшься ты или уходишь.\nя не буду держать.',
      read:false
    });
  }
  if (c.done >= 6 && !c.finalOffered) offerFinal(c);
  Core.setTask('выбери цель: targets');
  Core.save();
  Core.updateBadges();
}

function targetFled(c, t, why){
  c.op = null;
  c.trust = Math.max(0, c.trust - 2);
  c.closed[t.id] = Date.now() + 120000;
  c.extra[t.id] = (c.extra[t.id] || 0) + 1;
  out(`[ПРОВАЛ] ${t.name} ушла в тень. ${why}.`, 'err');
  out('  вернётся через 2 минуты. повтор будет дороже.', 'dim');
  out('');
  Core.setTask('выбери цель: targets');
  Core.save();
}

function mailAfter(c, t, kind, grant){
  const subjects = {
    press: 'шум в прессе',
    police: 'передано в следствие',
    leek: 'работа принята',
    sell: 'это был не тот выбор'
  };
  const bodies = {
    press: `«${t.name}» в новостях. журналисты копают. громко, но цель могла уйти.`,
    police: `«${t.name}» передан в следствие. тихо. иногда это лучше громких заголовков.`,
    leek: `«${t.name}» — чисто. я видел, как ты сделал это. продолжай.`,
    sell: `ты продал «${t.name}» на сторону. деньги твои. только не говори, что это была чистая работа.`
  };
  Core.addMail({
    id: 'c2m' + Date.now() + '-' + c.done,
    from: 'cyber_leek',
    subject: subjects[kind] || 'отчёт',
    body: (bodies[kind] || 'работа закрыта.') + `\nгрант: $${fmt(grant)}.`,
    read: false
  });
}

function offerFinal(c){
  c.finalOffered = true;
  Core.addMail({
    id: 'c2final' + Date.now(),
    from: 'cyber_leek',
    subject: 'последнее дело',
    body: 'шесть целей позади. ты больше не тот, кто сидел в гараже и слушал unknown.\nя могу дать тебе новую личность и тихую работу до конца жизни.\nили ты можешь уйти своим путём. я не буду держать.\nнапиши: stay или leave.',
    read: false
  });
}

function cmdCover(c){
  if (!c.op){ out('нечего заметать. активной операции нет.', 'dim'); return; }
  if (state().money < 250){ out('cover стоит $250. не хватает.', 'err'); return; }
  state().money -= 250;
  c.op.risk = Math.max(0, c.op.risk - 20);
  c.op.progress = Math.min(100, c.op.progress + 5);
  out('[COVER] следы подчищены · -$250 · риск -20%', 'ok');
  Core.save();
  Core.updateBadges();
}

/* ---------- сеть: задания ---------- */

function netMenu(c){
  out('ПОМОЩЬ СЕТИ · cyber_leek', 'head');
  out('  мелкие задания информаторов: +1–3 trust и немного денег.', 'dim');
  out('');
  if (c.netJob){
    const job = c.netJob;
    const p = clamp((Date.now() - (job.startedAt || Date.now())) / (job.duration * 1000), 0, 1);
    out(`  выполняется: ${job.title}`, '');
    out(`  ${bar(p)} ${Math.floor(p * 100)}%`, 'dim');
    out('');
    return;
  }
  for (const verb of ['scan', 'check', 'confirm']){
    const t = c.netTasks[verb];
    out(`  net ${verb.padEnd(7)} ${t.title}`, '');
    out(`             +${t.trust} trust · $${t.money} · ~${t.duration}с`, 'dim');
  }
  out('');
  out('  net scan | net check | net confirm — взять задание', 'dim');
  out('');
}

function startNet(c, verb){
  if (c.ended){ out('история завершена.', 'dim'); return; }
  if (c.netJob){ out('сначала дождись текущего задания сети. jobs — статус.', 'dim'); return; }
  const task = c.netTasks[verb];
  if (!task){ out('net scan | net check | net confirm', 'err'); return; }
  c.netJob = Object.assign({}, task, { startedAt: Date.now() });
  out('');
  out(`[NET] ${task.title}`, '');
  netLineEl = Core.out('', 'job');
  Core.setTask(`сеть: ${task.title}`);
  Core.save();
  netTick(c);
}

function netTick(c){
  const job = c.netJob;
  if (!job) return;
  if (!job.startedAt) job.startedAt = Date.now();
  if (!netLineEl || !netLineEl.isConnected) netLineEl = Core.out('', 'job');
  const p = clamp((Date.now() - job.startedAt) / (job.duration * 1000), 0, 1);
  if (netLineEl) netLineEl.textContent = `  ${job.title} ${bar(p)} ${Math.floor(p * 100)}%`;
  if (p >= 1) finishNet(c, job);
}

function finishNet(c, job){
  const s = state();
  s.money += job.money;
  c.trust = clamp(c.trust + job.trust, 0, 100);
  c.netDone = (c.netDone || 0) + 1;
  c.netTasks[job.verb] = makeNetTask(job.verb, c);
  c.netJob = null;
  if (netLineEl){
    netLineEl.className = 'line ok';
    netLineEl.textContent = `  [+] ${job.title} · +${job.trust} trust · +$${fmt(job.money)}`;
    netLineEl = null;
  }
  out(`[NET] готово · доверие ${Math.round(c.trust)} · деньги $${fmt(s.money)}`, 'dim');
  out('');
  Core.setTask('сеть: net · цели: targets');
  Core.save();
  Core.updateBadges();
}

function cmdNet(c, arg){
  const verb = String(arg || '').toLowerCase();
  if (!verb){ netMenu(c); return; }
  if (verb !== 'scan' && verb !== 'check' && verb !== 'confirm'){
    out('net scan | net check | net confirm', 'dim');
    return;
  }
  startNet(c, verb);
}

function cmdStatus(c){
  out('СИСТЕМА · ГЛАВА 2', 'head');
  out('  локация   ТИХАЯ КОМНАТА', '');
  out(`  деньги    $${fmt(state().money)}`, '');
  out(`  доверие   ${Math.round(c.trust)} / 100`, '');
  out(`  операции  ${c.done}`, '');
  out(`  навыки    очков ${c.sp}`, 'dim');
  if (c.op) out(`  текущая   ${targetById(c.op.id)?.name || '—'} · ${stepName(c.op)} · ${c.op.progress}%`, '');
  else out('  текущая   нет', 'dim');
  if (c.netJob) out(`  сеть      ${c.netJob.title}`, '');
  out('');
}

function cmdStay(c){
  if (!c.finalOffered || c.ended){ out('сейчас это не решение.', 'dim'); return; }
  c.ended = true;
  Core.clearConsole();
  Core.setTask('');
  out('ТЫ ОСТАЁШЬСЯ', 'head');
  out('');
  out('  cyber_leek даёт тебе новую личность и новую тихую работу.', '');
  out('  ты больше не будешь один. но и свободы станет меньше.', 'dim');
  out('');
  out('  конец главы 2. продолжение — в следующем обновлении.', 'dim');
  out('');
  Core.save();
}

function cmdLeave(c){
  if (!c.finalOffered || c.ended){ out('сейчас это не решение.', 'dim'); return; }
  c.ended = true;
  Core.clearConsole();
  Core.setTask('');
  out('ТЫ УХОДИШЬ', 'head');
  out('');
  out('  ты забираешь свои данные и уходишь в холод.', '');
  out('  cyber_leek не пытается тебя остановить. он просто кивает.', 'dim');
  out('');
  out('  конец главы 2. продолжение — в следующем обновлении.', 'dim');
  out('');
  Core.save();
}

/* ---------- админ-переключение ---------- */

function adminExit(){
  pendingEscape = false;
  socialPick = false;
  netLineEl = null;
  const old = state();
  const nick = old.nick || Core.readNick();
  const next = Core.newState();
  next.started = true;
  next.nick = nick;
  next.money = 1000;
  next.earned = 1000;
  next.story = 1;
  next.tutorialDone = true;
  next.tutorialStep = 8;
  next.chapter2 = false;
  Core.setState(next);
  Core.clearConsole();
  Core.updatePrompt();
  Core.renderHUD();
  Core.hideHints();
  Core.setTask('');
  out('ГЛАВА 1 · ПЕСОЧНИЦА', 'head');
  out('  гараж · $1000 · прогресс главы 2 сброшен', '');
  out('  admin earned <n> — поднять заработок для писем главы 2', 'dim');
  out('  admin chapter 2 — перейти в главу 2 заново', 'dim');
  out('');
  Core.focusInput();
  Core.save();
}

/* ---------- диспетчер ---------- */

function handle(cmd, args, line){
  const s = state();
  if (!s) return false;

  if (!s.chapter2){
    if (s.finished === 'prison' && cmd === 'start'){
      prisonEnding();
      return true;
    }
    if (pendingEscape){
      if (cmd === '1' || cmd === 'сбежать' || cmd === 'escape'){ pendingEscape = false; escapeEnding(); return true; }
      if (cmd === '2' || cmd === 'остаться' || cmd === 'ignore'){ pendingEscape = false; prisonEnding(); return true; }
    }
    if (cmd === 'open' && String(args[0] || '').toLowerCase() === 'data.txt'){
      openData();
      return true;
    }
    return false;
  }

  const c = ensure();
  if (!c) return false;

  if (socialPick){
    if (cmd === '1' || cmd === '2' || cmd === '3'){
      resolveSocial(cmd);
    } else {
      out('выбери реплику: 1, 2 или 3.', 'dim');
    }
    return true;
  }
  if (pendingEscape){
    if (cmd === '1'){ pendingEscape = false; escapeEnding(); return true; }
    if (cmd === '2'){ pendingEscape = false; prisonEnding(); return true; }
  }

  switch(cmd){
    case 'targets': cmdTargets(c); return true;
    case 'dossier': {
      const t = targetById(args[0]);
      if (!t){ out('dossier <id>. targets — список.', 'err'); return true; }
      cmdDossier(t);
      return true;
    }
    case 'op': cmdOp(c, args[0]); return true;
    case 'jobs': cmdJobs(c); return true;
    case 'status': cmdStatus(c); return true;
    case 'trust': cmdTrust(c); return true;
    case 'net': cmdNet(c, args[0]); return true;
    case 'skills': cmdSkills(c); return true;
    case 'learn': cmdLearn(c, args[0]); return true;
    case 'leek': cmdLeek(c); return true;
    case 'cover': cmdCover(c); return true;
    case 'phish': case 'social': case 'bribe':
      method(c, cmd); return true;
    case 'hack':
      method(c, 'hack'); return true;
    case 'copy':
      cmdCopy(c, args[0]); return true;
    case 'accounts': case 'messages': case 'evidence':
      cmdCopy(c, cmd); return true;
    case 'leak':
      cmdLeak(c, args[0]); return true;
    case 'sell':
      cmdLeak(c, 'sell'); return true;
    case 'stay': cmdStay(c); return true;
    case 'leave': cmdLeave(c); return true;
    case 'help': case 'hints':
      help(); return true;
    case 'shop': case 'farm': case 'rig': case 'buy': case 'team': case 'move': case 'cool':
      out('в главе 2 этой механики нет. help — список команд.', 'dim');
      return true;
    case 'open':
      out('открыть можно только вложение из почты. mail — список.', 'dim');
      return true;
    case 'mail':
      return false;
    default:
      return false;
  }
}

window.GarageChapter2 = {
  handle,
  tick(){ const c = ensure(); if (c) netTick(c); },
  tickChapter1,
  menu,
  start,
  adminEnter: () => enterChapter2(),
  adminExit
};
})();
