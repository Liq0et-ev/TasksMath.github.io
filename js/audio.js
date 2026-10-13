/* Daļu piedzīvojums — skaņa: sintezēti efekti un cilpotā mūzika (WebAudio, bez audio failiem). */
(function () {
  'use strict';
  const KEY = 'dalu.sound.v1';
  const pref = { music: true, sfx: true };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(KEY))); } catch (e) { /* nekas */ }
  const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* nekas */ } };

  let ctx = null, master, musicGain, sfxGain, noiseBuf, unlocked = false;
  const stats = { notes: 0, sfx: 0 };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = pref.music ? 1 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = pref.sfx ? 1 : 0; sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (s) => (s === '_' ? null : 12 * (parseInt(s.slice(-1), 10) + 1) + NOTE[s[0]] + (s[1] === '#' ? 1 : 0));
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const seq = (str) => str.trim().split(/\s+/).map(midi);

  function tone(o) {
    const a = ctx, at = o.at != null ? o.at : a.currentTime + (o.t || 0), dur = o.dur || 0.15, vol = o.vol || 0.15;
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(o.dest || sfxGain);
    osc.start(at); osc.stop(at + dur + 0.04);
    stats.notes++;
  }
  function noise(o) {
    const a = ctx, at = o.at != null ? o.at : a.currentTime + (o.t || 0), dur = o.dur || 0.04;
    const src = a.createBufferSource(); src.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = o.filter || 'highpass'; f.frequency.value = o.freq || 6000;
    const g = a.createGain(); g.gain.setValueAtTime(o.vol || 0.05, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxGain);
    src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.02);
  }

  // ---------- efekti ----------
  function sfx(fn) {
    if (!pref.sfx || !ensure()) return;
    if (ctx.state === 'suspended') { ctx.resume(); if (!unlocked) return; }
    stats.sfx++; fn();
  }
  const f = (n) => mtof(midi(n));
  const SFX = {
    click() { sfx(() => tone({ f: 720, to: 960, dur: 0.06, vol: 0.08 })); },
    correct(first) {
      sfx(() => { const ns = first ? ['C6', 'E6', 'G6'] : ['E6', 'G6']; ns.forEach((n, i) => tone({ f: f(n), t: i * 0.08, dur: 0.14, vol: 0.12 })); });
    },
    wrong() { sfx(() => { tone({ f: 260, to: 170, dur: 0.28, type: 'sawtooth', vol: 0.1 }); }); },
    heart() {
      sfx(() => { [400, 300, 200].forEach((fr, i) => tone({ f: fr, t: i * 0.1, dur: 0.16, type: 'triangle', vol: 0.18 })); tone({ f: 90, to: 50, t: 0.3, dur: 0.3, type: 'sine', vol: 0.25 }); });
    },
    win() {
      sfx(() => {
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone({ f: f(n), t: i * 0.11, dur: 0.16, vol: 0.13 }));
        ['G5', 'C6', 'E6'].forEach((n) => tone({ f: f(n), t: 0.46, dur: 0.7, vol: 0.1, type: 'triangle' }));
        tone({ f: f('C4'), t: 0.46, dur: 0.7, vol: 0.14, type: 'triangle' });
      });
    },
    lose() { sfx(() => ['E4', 'D4', 'C4', 'B3'].forEach((n, i) => tone({ f: f(n), t: i * 0.22, dur: 0.3, type: 'triangle', vol: 0.18 }))); },
    coin() { sfx(() => { tone({ f: f('B5'), dur: 0.07, vol: 0.1 }); tone({ f: f('E6'), t: 0.07, dur: 0.28, vol: 0.1 }); }); },
    star() {
      sfx(() => { ['E6', 'G6', 'B6', 'E7'].forEach((n, i) => { tone({ f: f(n), t: i * 0.07, dur: 0.2, vol: 0.09 }); tone({ f: f(n) / 2, t: i * 0.07, dur: 0.24, vol: 0.07, type: 'triangle' }); }); });
    },
    step() { sfx(() => noise({ dur: 0.05, vol: 0.035, filter: 'lowpass', freq: 900 })); },
    bonk() { sfx(() => tone({ f: 170, to: 70, dur: 0.2, type: 'square', vol: 0.12 })); },
    enter() { sfx(() => { tone({ f: 300, to: 1000, dur: 0.28, type: 'sawtooth', vol: 0.07 }); tone({ f: f('G5'), t: 0.2, dur: 0.18, vol: 0.08 }); }); },
    ping() { sfx(() => tone({ f: 1250, dur: 0.09, type: 'triangle', vol: 0.06 })); },
  };

  // ---------- mūzika ----------
  // Katrs celiņš: tempo, soļu skaits taktī (astotdaļas), un takšu saraksts {bass, mel}
  const TRACKS = {
    world: {
      bpm: 118, lead: 'square', leadVol: 0.05, bassVol: 0.13, hats: true,
      bars: [
        { bass: 'C3 _ _ _ G3 _ C3 _', mel: 'E5 G5 C6 G5 E5 G5 E5 D5' },
        { bass: 'A2 _ _ _ E3 _ A2 _', mel: 'E5 A5 C6 A5 E5 A5 G5 E5' },
        { bass: 'F2 _ _ _ C3 _ F2 _', mel: 'F5 A5 C6 A5 F5 A5 G5 F5' },
        { bass: 'G2 _ _ _ D3 _ G2 _', mel: 'D5 G5 B5 G5 D5 G5 F5 D5' },
        { bass: 'C3 _ _ _ G3 _ C3 _', mel: 'G5 _ E5 _ C5 E5 G5 _' },
        { bass: 'A2 _ _ _ E3 _ A2 _', mel: 'A5 _ E5 _ C5 E5 A5 _' },
        { bass: 'F2 _ _ _ C3 _ F2 _', mel: 'A5 _ F5 _ C5 F5 A5 _' },
        { bass: 'G2 _ _ _ D3 _ G2 _', mel: 'B5 _ G5 D5 G5 B5 D6 B5' },
      ],
    },
    quiz: {
      bpm: 92, lead: 'triangle', leadVol: 0.07, bassVol: 0.1, hats: false,
      bars: [
        { bass: 'C3 _ _ _ _ _ _ _', mel: 'C4 _ E4 _ G4 _ E4 _' },
        { bass: 'G2 _ _ _ _ _ _ _', mel: 'B3 _ D4 _ G4 _ D4 _' },
        { bass: 'A2 _ _ _ _ _ _ _', mel: 'A3 _ C4 _ E4 _ C4 _' },
        { bass: 'F2 _ _ _ _ _ _ _', mel: 'A3 _ C4 _ F4 _ E4 D4' },
      ],
    },
  };
  Object.values(TRACKS).forEach((t) => t.bars.forEach((b) => { b.bass = seq(b.bass); b.mel = seq(b.mel); }));

  let want = null, playing = null, step = 0, nextTime = 0, timer = null;
  function tick() {
    if (!ctx || ctx.state !== 'running' || !playing) return;
    const tr = TRACKS[playing], stepDur = 60 / tr.bpm / 2;
    while (nextTime < ctx.currentTime + 0.3) {
      const bar = tr.bars[Math.floor(step / 8) % tr.bars.length], i = step % 8;
      const b = bar.bass[i], m = bar.mel[i];
      if (b != null) tone({ at: nextTime, f: mtof(b), dur: stepDur * 3.2, type: 'triangle', vol: tr.bassVol, dest: musicGain, attack: 0.01 });
      if (m != null) tone({ at: nextTime, f: mtof(m), dur: stepDur * 1.7, type: tr.lead, vol: tr.leadVol, dest: musicGain, attack: 0.012 });
      if (tr.hats && i % 2 === 1) noise({ at: nextTime, dur: 0.03, vol: 0.018, dest: musicGain });
      nextTime += stepDur; step++;
    }
  }
  function startMusic() {
    if (!ctx || !unlocked || !pref.music || !want) return;
    if (playing !== want) { playing = want; step = 0; nextTime = ctx.currentTime + 0.08; }
    if (!timer) timer = setInterval(tick, 40);
  }
  function stopMusic() { clearInterval(timer); timer = null; playing = null; }

  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    const go = () => { unlocked = true; startMusic(); };
    if (ctx.state === 'running') go(); else ctx.resume().then(go, () => {});
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !unlocked) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // ---------- pogas ----------
  function buildUI() {
    const bar = document.createElement('div'); bar.id = 'snd';
    const mk = (key, on, off, label) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'snd-btn'; b.setAttribute('aria-label', label);
      const paint = () => { b.textContent = pref[key] ? on : off; b.classList.toggle('off', !pref[key]); b.setAttribute('aria-pressed', String(pref[key])); };
      b.onclick = (e) => {
        e.stopPropagation(); pref[key] = !pref[key]; savePref(); paint(); unlock();
        if (ensure()) {
          const g = key === 'music' ? musicGain : sfxGain; g.gain.setTargetAtTime(pref[key] ? 1 : 0, ctx.currentTime, 0.02);
          if (key === 'music') (pref.music ? startMusic() : stopMusic());
          if (key === 'sfx' && pref.sfx) SFX.click();
        }
      };
      paint(); bar.appendChild(b);
    };
    mk('music', '🎵', '🔇', 'Mūzika'); mk('sfx', '🔊', '🔈', 'Skaņas efekti');
    document.body.appendChild(bar);
  }
  if (document.body) buildUI(); else addEventListener('DOMContentLoaded', buildUI);

  // klikšķu skaņa visām pogām
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.btn, .node, .avatars button, .avatar-btn')) SFX.click();
  }, true);

  window.Sound = Object.assign({
    unlock,
    music(name) { want = name || null; if (!want) stopMusic(); else startMusic(); },
    _stats: () => ({ ...stats, state: ctx && ctx.state, unlocked, playing, pref: { ...pref } }),
  }, SFX);
})();
