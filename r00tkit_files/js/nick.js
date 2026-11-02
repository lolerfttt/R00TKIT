(() => {
'use strict';

const KEY = 'r00tkit_nick_v1';
const LEGACY_KEY = 'garage_nick_v1';
const MAX_RAW = 16;
const MAX_STORED = 32;

const LEET = {
  a: ['4', '@'],
  b: ['8'],
  e: ['3'],
  g: ['9', '6'],
  i: ['1', '!'],
  l: ['1'],
  o: ['0'],
  s: ['5', '$'],
  t: ['7', '1'],
  y: ['9'],
  z: ['2'],
  а: ['4'], б: ['6'], в: ['b'], г: ['r'], д: ['d'], е: ['3'], ж: ['*'], з: ['3'],
  и: ['1'], к: ['k'], л: ['l'], м: ['m'], н: ['h'], о: ['0'], п: ['n'], р: ['p'],
  с: ['5'], т: ['7'], у: ['y'], ф: ['f'], х: ['x'], ц: ['u'], ч: ['4'], ш: ['w'],
  щ: ['w'], ъ: ['b'], ы: ['b'], ь: ['b'], э: ['3'], ю: ['10'], я: ['9'], ё: ['e']
};

function normalize(value){
  return String(value == null ? '' : value).trim().toLowerCase();
}

function cleanStored(value){
  return normalize(value).replace(/[^a-z0-9а-яё_-]/gi, '').slice(0, MAX_STORED);
}

function read(){
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || '';
    const nick = cleanStored(raw);
    if (nick && !localStorage.getItem(KEY)){
      localStorage.setItem(KEY, nick);
      localStorage.removeItem(LEGACY_KEY);
    }
    return nick;
  } catch (e) {
    return '';
  }
}

function write(value){
  const nick = cleanStored(value);
  if (!nick) return false;
  try {
    localStorage.setItem(KEY, nick);
    try { localStorage.removeItem(LEGACY_KEY); } catch(e){}
    return true;
  } catch (e) {
    return false;
  }
}

function clear(){
  try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
}

function validate(value){
  const raw = normalize(value);
  if (!raw) return { ok: false, error: 'ник не может быть пустым.' };
  if (raw.length < 2) return { ok: false, error: 'минимум 2 символа.' };
  if (raw.length > MAX_RAW) return { ok: false, error: 'максимум ' + MAX_RAW + ' символов.' };
  if (!/^[a-z0-9а-яё_-]+$/.test(raw)) return { ok: false, error: 'только буквы, цифры, _ и -.' };
  return { ok: true, value: raw };
}

function makeLeet(value){
  const raw = normalize(value);
  if (!raw) return '';

  const chars = Array.from(raw);
  const spots = [];
  for (let i = 1; i < chars.length; i++){
    if (LEET[chars[i]]) spots.push(i);
  }

  for (let i = spots.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = spots[i];
    spots[i] = spots[j];
    spots[j] = tmp;
  }

  // чем длиннее ник, тем больше символов можно «взломать», но не больше трёх
  const want = Math.min(3, Math.max(1, Math.floor(chars.length / 4)));
  const count = Math.min(spots.length, want);
  let changed = 0;

  for (let k = 0; k < count; k++){
    const i = spots[k];
    const variants = LEET[chars[i]];
    chars[i] = variants[Math.floor(Math.random() * variants.length)];
    changed++;
  }

  let out = chars.join('');

  // изредка добавляем хакерское украшение, если ник почти не изменился
  if (changed === 0 || Math.random() < 0.28){
    if (!/_\d{3,4}$/.test(out) && !/^xx_.+_xx$/.test(out)){
      out = Math.random() < 0.6 ? out + '_1337' : 'xx_' + out + '_xx';
    }
  }

  return out;
}

window.R00TKITNick = {
  KEY,
  read,
  write,
  clear,
  validate,
  makeLeet
};
})();
