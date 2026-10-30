(() => {
  'use strict';

  const input = document.getElementById('cmd');
  const range = document.getElementById('vol');
  const valueEl = document.getElementById('vol-val');
  if (!input) return;

  const VOLUME_KEY = 'garage_volume_v1';
  const DEFAULT_VOLUME = 75;
  const MIN_GAP = 18;      // мс: защита от слишком частого повтора
  const FADE_MS = 900;     // плавная смена музыки

  const KEY_FILES = Array.from({ length: 10 }, (_, i) => `key_typing #${i + 1}.wav`);
  const SPACE_FILES = [1, 2].map(n => `space_typing #${n}.wav`);

  const SFX_FILES = {
    ui_open:      'ui_open.wav',
    ui_buy:       'ui_buy.wav',
    ui_error:     'ui_error.wav',
    hack_done:    'hack_done.wav',
    seed_glitch:  'seed_glitch.wav',
    seed_ok:      'seed_ok.wav',
    enter:        'enter.wav',
    glitch:       'glitch.wav'
  };

  const MUSIC_FILES = {
    menu:        'menu.ogg',
    gameplay:    '3percent - FIRST ACTION.ogg',
    hunting:     '3percent - Hunting Time.ogg',
    double_cash: '3percent - Double Ca$h.ogg',
    scene:       '500k_scene.ogg'
  };

  // названия треков для плеера
  const TRACKS = [
    { id: 'menu',        title: '3percent - light lab', menuOnly: true },
    { id: 'gameplay',    title: '3percent - FIRST ACTION' },
    { id: 'hunting',     title: '3percent - Hunting Time' },
    { id: 'double_cash', title: '3percent - Double Ca$h' }
  ];
  const trackNameEl = document.getElementById('tr-name');
  let manualTrack = null;
  let currentMode = 'menu';

  // в игре трек меню не показываем и не даём выбрать
  function visibleTracks(){
    return TRACKS.filter(t => currentMode === 'menu' || !t.menuOnly);
  }

  // баланс громкости: menu.ogg заметно тише остальных; новые треки выровнены по FIRST ACTION (ffmpeg volumedetect)
  const KEY_VOLUME = 0.28;
  const SPACE_VOLUME = 0.36;
  const SFX_VOLUME = {
    ui_open: 0.7,
    ui_buy: 1.0,
    ui_error: 0.9,
    hack_done: 1.0,
    seed_glitch: 0.8,
    seed_ok: 1.0,
    enter: 1.0,
    glitch: 1.0
  };
  const MUSIC_VOLUME = { menu: 0.85, gameplay: 0.3, hunting: 0.23, double_cash: 0.24, scene: 0.45 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function readVolume(){
    try {
      const raw = parseInt(localStorage.getItem(VOLUME_KEY), 10);
      if (isFinite(raw)) return clamp(raw, 0, 100);
    } catch (e) {}
    return DEFAULT_VOLUME;
  }

  let master = readVolume() / 100;
  let enabled = true;
  let lastAt = 0;
  let lastKey = -1;
  let lastSpace = -1;

  function makeAudio(src, loop){
    const a = new Audio(src);
    a.preload = 'auto';
    a.loop = !!loop;
    a.load();
    return a;
  }

  const keys = KEY_FILES.map(name => makeAudio('sounds/typing/' + encodeURIComponent(name)));
  const spaces = SPACE_FILES.map(name => makeAudio('sounds/typing/' + encodeURIComponent(name)));
  const sfx = {};
  const music = {};

  for (const [name, file] of Object.entries(SFX_FILES)){
    sfx[name] = makeAudio('sounds/sfx/' + encodeURIComponent(file));
  }
  for (const [name, file] of Object.entries(MUSIC_FILES)){
    music[name] = makeAudio('sounds/music/' + encodeURIComponent(file), true);
  }

  const gains = Object.fromEntries(Object.keys(music).map(n => [n, 0]));
  let activeName = null;
  let targetName = null;
  let desiredName = 'menu';
  let unlocked = false;
  let fadeTimer = null;

  function level(){ return enabled ? master : 0; }

  function applyVolumes(){
    const l = level();
    for (const a of keys) a.volume = clamp(KEY_VOLUME * l, 0, 1);
    for (const a of spaces) a.volume = clamp(SPACE_VOLUME * l, 0, 1);
    for (const [name, a] of Object.entries(sfx)){
      a.volume = clamp((SFX_VOLUME[name] ?? 0.9) * l, 0, 1);
    }
    for (const [name, a] of Object.entries(music)){
      a.volume = clamp(MUSIC_VOLUME[name] * l * (gains[name] || 0), 0, 1);
    }
  }

  function playSfx(name){
    if (!enabled || master <= 0) return;
    const a = sfx[name];
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function startTrack(name){
    const a = music[name];
    if (!a || !a.paused) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function setTrackLabel(id){
    const t = TRACKS.find(x => x.id === id);
    if (trackNameEl && t) trackNameEl.textContent = t.title;
  }

  function fadeTo(name, ms = FADE_MS){
    if (!music[name]) return;
    if (manualTrack && name !== manualTrack) return;
    desiredName = name;
    if (!manualTrack) setTrackLabel(name);
    if (!unlocked) return;

    const target = music[name];
    if ((activeName === name || targetName === name) && !target.paused) return;

    targetName = name;
    if (fadeTimer) clearInterval(fadeTimer);
    const from = { ...gains };
    startTrack(name);

    const t0 = performance.now();
    fadeTimer = setInterval(() => {
      const p = clamp((performance.now() - t0) / ms, 0, 1);
      for (const n of Object.keys(music)){
        const goal = n === name ? 1 : 0;
        gains[n] = from[n] + (goal - from[n]) * p;
      }
      applyVolumes();

      if (p >= 1){
        clearInterval(fadeTimer);
        fadeTimer = null;
        for (const n of Object.keys(music)){
          if (n === name) continue;
          music[n].pause();
          try { music[n].currentTime = 0; } catch (e) {}
          gains[n] = 0;
        }
        applyVolumes();
        activeName = name;
        targetName = null;
      }
    }, 40);
  }

  function unlock(){
    if (unlocked) return;
    unlocked = true;
    fadeTo(desiredName, 700);
  }

  function stopMusic(){
    if (fadeTimer){ clearInterval(fadeTimer); fadeTimer = null; }
    for (const n of Object.keys(music)){
      music[n].pause();
      try { music[n].currentTime = 0; } catch (e) {}
      gains[n] = 0;
    }
    activeName = null;
    targetName = null;
    applyVolumes();
  }

  // трек катсцены: играет вне плейлиста и сбрасывает ручной выбор
  function forceMusic(name){
    if (!music[name]) return;
    manualTrack = null;
    desiredName = name;
    stopMusic();
    fadeTo(name, 600);
  }

  function selectTrack(delta){
    const list = visibleTracks();
    let i = list.findIndex(t => t.id === (manualTrack || desiredName));
    if (i < 0) i = 0;
    i = (i + delta + list.length) % list.length;
    manualTrack = list[i].id;
    desiredName = manualTrack;
    setTrackLabel(manualTrack);
    fadeTo(manualTrack, 350);
    if (input) input.focus();
  }

  // вызывается из game.js при смене меню/геймплей
  function setMode(name){
    currentMode = name === 'menu' ? 'menu' : 'game';
    if (currentMode === 'game' && manualTrack === 'menu'){
      manualTrack = null;
      fadeTo('gameplay', 400);
    }
  }

  const prevBtn = document.getElementById('tr-prev');
  const nextBtn = document.getElementById('tr-next');
  if (prevBtn) prevBtn.addEventListener('click', () => selectTrack(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => selectTrack(1));
  setTrackLabel(desiredName);

  document.addEventListener('keydown', unlock, { capture: true, once: true });
  document.addEventListener('pointerdown', unlock, { capture: true, once: true });

  function syncVolumeUI(){
    const v = String(Math.round(master * 100));
    if (range) range.value = v;
    if (valueEl) valueEl.textContent = v;
  }

  function setVolume(v, persist = true){
    master = clamp(Number(v) || 0, 0, 100) / 100;
    syncVolumeUI();
    applyVolumes();
    if (persist){
      try { localStorage.setItem(VOLUME_KEY, String(Math.round(master * 100))); } catch (e) {}
    }
  }

  if (range){
    range.addEventListener('input', () => setVolume(range.value));
    range.value = String(Math.round(master * 100));
  }
  syncVolumeUI();
  applyVolumes();

  // на первом экране трек меню пробуем запустить сразу; если браузер запретит,
  // музыка стартует с первого клика/клавиши (unlock ниже)
  (function tryAutoplay(){
    const a = music[desiredName];
    if (!a) return;
    try {
      const p = a.play();
      if (p && p.then) p.then(() => {
        if (unlocked) return;
        unlocked = true;
        fadeTo(desiredName, 900);
      }).catch(() => {});
    } catch (e) {}
  })();

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA' && !t.isContentEditable)) return;
    if (t.tagName === 'INPUT' && t.type === 'range') return;
    if (!enabled || master <= 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.repeat) return;

    const now = performance.now();
    if (now - lastAt < MIN_GAP) return;

    if (e.key === ' '){
      lastAt = now;
      lastSpace = pick(spaces, lastSpace);
      playOne(spaces, lastSpace);
      return;
    }

    if (e.key === 'Backspace' || (e.key.length === 1 && e.key !== ' ')){
      lastAt = now;
      lastKey = pick(keys, lastKey);
      playOne(keys, lastKey);
    }
  });

  function pick(list, last){
    if (list.length < 2) return 0;
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (i === last);
    return i;
  }

  function playOne(list, i){
    const a = list[i];
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function typeChar(ch){
    if (!enabled || master <= 0) return;
    const now = performance.now();
    if (now - lastAt < MIN_GAP) return;
    lastAt = now;
    if (ch === ' '){
      lastSpace = pick(spaces, lastSpace);
      playOne(spaces, lastSpace);
    } else {
      lastKey = pick(keys, lastKey);
      playOne(keys, lastKey);
    }
  }

  window.GarageSound = {
    sfx: playSfx,
    music: fadeTo,
    setMode: name => setMode(name),
    stop: stopMusic,
    force: forceMusic,
    type: typeChar,
    setVolume: v => setVolume(v),
    getVolume: () => Math.round(master * 100),
    setEnabled(v){ enabled = !!v; applyVolumes(); },
    isEnabled(){ return enabled; }
  };
})();
