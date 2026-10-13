/* Daļu piedzīvojums — spēles loģika un saskarne */
(function () {
  'use strict';
  const E = window.Engine;
  const $app = document.getElementById('app');
  const KEY = 'daluPiedzivojums.v1';
  const TEACHER_CODE = 'skolotajs'; // tikai aizsardzība pret nejaušu atvēršanu — nav drošības līdzeklis
  const START_AVATARS = ['🙂', '😎', '🤠'];
  const REWARDS = ['🦊', '🐼', '🐸', '🦄', '🐯', '🐧', '🤖', '👽', '🐲', '🦖', '🧙', '🦸', '🏆', '👑']; // 1 par katru līmeni
  const ERROR_LABELS = {
    'op-swap': 'Sajauca darbību (reizināja, kur jādala, vai otrādi)',
    'mul-den': 'Reizināja saucēju, nevis skaitītāju',
    'whole-only': 'Reizināja tikai jaukta skaitļa veselo daļu',
    'forgot-den': 'Aizmirsa saīsināt ar saucēju',
    rawform: 'Nepārveidoja jaukto skaitli par neīstu daļu',
    notReduced: 'Neuzsaīsināja daļu',
    notProper: 'Neizslēdza veselos',
    wrongForm: 'Neizslēdza veselos',
    wrong: 'Cita kļūda',
  };

  // ---------- saglabāšana ----------
  const blank = () => ({ v: 1, name: '', avatar: START_AVATARS[0], coins: 0, levels: {}, errors: {}, unlockAll: false, view: '3d', lastLevel: 0 });
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(blank(), s); } catch (e) { /* privātais režīms */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignorējam */ } }

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lv = (id) => S.levels[id] || (S.levels[id] = { done: false, stars: 0, attempts: 0, correct: 0, firstTry: 0, plays: 0 });
  const isDone = (id) => !!(S.levels[id] && S.levels[id].done);
  const isOpen = (id) => S.unlockAll || id === 1 || isDone(id - 1);
  const doneCount = () => E.LEVELS.filter((l) => isDone(l.id)).length;
  const unlockedAvatars = () => START_AVATARS.concat(E.LEVELS.filter((l) => isDone(l.id)).map((l) => REWARDS[l.id - 1]));

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const set = ['🎉', '⭐', '🍕', '✨', '🏅'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      s.className = 'confetti'; s.textContent = set[i % set.length];
      s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * 0.8 + 's';
      document.body.appendChild(s); setTimeout(() => s.remove(), 3500);
    }
  }

  // ---------- ekrāni ----------
  let W = null; // aktīvā 3D pasaule
  function render(html) {
    if (W) { W.destroy(); W = null; }
    document.body.classList.remove('in-world');
    $app.innerHTML = html; window.scrollTo(0, 0);
  }

  function screenWelcome() {
    render(`<div class="card center">
      <div class="big-emoji">🍕</div>
      <h1>Daļu piedzīvojums</h1>
      <p>Risini uzdevumus ar daļām un jauktajiem skaitļiem, atslēdz jaunus līmeņus un vāc balvas!</p>
      <label for="nm"><b>Kā tevi sauc?</b></label>
      <input id="nm" class="name-in" maxlength="20" autocomplete="off" placeholder="Tavs vārds">
      <div class="small">Izvēlies savu varoni:</div>
      <div class="avatars" id="av" style="justify-content:center">${START_AVATARS.map((a, i) => `<button type="button" data-a="${a}" class="${i ? '' : 'sel'}" aria-label="Varonis ${a}">${a}</button>`).join('')}</div>
      <button class="btn green" id="go">Sākt spēli</button>
    </div>`);
    let av = START_AVATARS[0];
    document.getElementById('av').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      av = b.dataset.a;
      document.querySelectorAll('#av button').forEach((x) => x.classList.toggle('sel', x === b));
    });
    const go = () => {
      const name = document.getElementById('nm').value.trim();
      if (!name) { toast('Ieraksti savu vārdu!'); document.getElementById('nm').focus(); return; }
      S.name = name; S.avatar = av; save(); screenMap();
    };
    document.getElementById('go').onclick = go;
    document.getElementById('nm').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  function screenMap() {
    if (!S.name) return screenWelcome();
    if (S.view !== '2d' && window.World && World.supported()) {
      try { return screenWorld(); } catch (err) { console.error(err); if (W) { W.destroy(); W = null; } toast('3D nav pieejams — rādu 2D karti'); }
    }
    screenMap2D();
  }

  function screenWorld() {
    const done = doneCount(), total = E.LEVELS.length;
    const cur = S.lastLevel || (E.LEVELS.find((l) => isOpen(l.id) && !isDone(l.id)) || E.LEVELS[0]).id;
    const touch = matchMedia('(pointer: coarse)').matches;
    render(`<div class="world" id="world">
      <div class="hud">
        <button class="avatar-btn sm" id="avBtn" aria-label="Mainīt varoni">${esc(S.avatar)}</button>
        <div class="hud-mid"><b>${esc(S.name)}</b>
          <div class="bar-wrap"><div class="bar-fill" style="width:${(done / total) * 100}%"></div></div>
          <span class="small" style="color:#fff">${done} / ${total} līmeņi</span></div>
        <span class="pill">🪙 ${S.coins}</span>
        <button class="btn small ghost" id="to2d" title="2D karte">🗺️</button>
        <button class="btn small ghost" id="teacher" title="Skolotājam">👩‍🏫</button>
      </div>
      <div class="hint">${touch ? '🕹️ Stienis — iet · velc ekrānu — pagriezt kameru' : 'W A S D — iet · ← → — pagriezt kameru · E — ieiet līmenī'}</div>
      <button class="btn gold enter" id="enter" hidden></button>
    </div>`);
    document.body.classList.add('in-world');
    const enter = document.getElementById('enter');
    W = World.create(document.getElementById('world'), {
      levels: E.LEVELS, zones: E.ZONES, avatar: S.avatar, name: S.name, startLevel: cur,
      isOpen, isDone, stars: (id) => lv(id).stars || 0,
      onNear: (l) => { enter.hidden = !l; if (l) { enter.textContent = `▶ ${l.id}. līmenis — ${l.short}`; enter.dataset.id = l.id; } },
      onEnter: (id) => { S.lastLevel = id; save(); screenIntro(id); },
      onBlocked: (l) => toast(`🔒 Pabeidz ${l.id - 1}. līmeni, lai atvērtu ceļu tālāk!`),
    });
    enter.onclick = () => W && W.interact();
    window.__world = W; // testēšanai
    document.getElementById('avBtn').onclick = screenAvatars;
    document.getElementById('to2d').onclick = () => { S.view = '2d'; save(); screenMap2D(); };
    document.getElementById('teacher').onclick = screenTeacher;
  }

  function screenMap2D() {
    if (!S.name) return screenWelcome();
    const done = doneCount(), total = E.LEVELS.length;
    const zones = E.ZONES.map((z) => {
      const ls = E.LEVELS.filter((l) => l.zone === z.id);
      const zd = ls.filter((l) => isDone(l.id)).length;
      return `<section class="zone">
        <div class="zone-head" style="background:${z.color}"><span class="z-icon">${z.icon}</span>${esc(z.name)}<small>${zd}/${ls.length}</small></div>
        <div class="path">${ls.map((l) => {
          const open = isOpen(l.id), d = isDone(l.id);
          const cls = ['node', d ? 'done' : open ? 'open' : 'locked', l.boss ? 'boss' : ''].join(' ');
          return `<button class="${cls}" data-id="${l.id}" aria-label="Līmenis ${l.id}: ${esc(l.title)}${open ? '' : ' (slēgts)'}">
            <span class="badge"><i>${l.id}</i>${open ? l.icon : '🔒'}</span>
            <span><span class="t">${esc(l.short)}</span><br>
            <span class="stars" style="color:${d ? '#c98d00' : '#5d6978'}">${open ? stars(lv(l.id).stars) : 'Slēgts'}</span></span></button>`;
        }).join('')}</div></section>`;
    }).join('<div class="gate">🚪 Vārti uz nākamo zonu 🚪</div>');

    render(`<div class="top">
        <button class="avatar-btn" id="avBtn" aria-label="Mainīt varoni">${esc(S.avatar)}</button>
        <div class="hello"><b>Sveiks, ${esc(S.name)}!</b>
          <div class="bar-wrap" aria-label="Progress"><div class="bar-fill" style="width:${(done / total) * 100}%"></div></div>
          <div class="small">Pabeigti līmeņi: ${done} / ${total}</div></div>
        <span class="pill">🪙 ${S.coins}</span>
      </div>
      ${done === total ? `<div class="card center"><div class="big-emoji">👑</div><h2>Tu esi daļu čempions!</h2><p>Visi līmeņi pabeigti. Vari tos spēlēt atkārtoti, lai iegūtu 3 zvaigznes.</p></div>` : ''}
      ${zones}
      <div class="center" style="margin-top:26px">
        ${window.World && World.supported() ? '<button class="btn gold small" id="to3d">🧊 3D pasaule</button>' : ''}
        <button class="btn ghost small" id="teacher">👩‍🏫 Skolotājam</button></div>`);
    const b3 = document.getElementById('to3d'); if (b3) b3.onclick = () => { S.view = '3d'; save(); screenMap(); };

    $app.querySelectorAll('.node').forEach((n) => n.addEventListener('click', () => {
      const id = +n.dataset.id;
      if (!isOpen(id)) {
        n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake');
        toast('🔒 Pabeidz iepriekšējo līmeni, lai atslēgtu šo!'); return;
      }
      screenIntro(id);
    }));
    document.getElementById('avBtn').onclick = screenAvatars;
    document.getElementById('teacher').onclick = screenTeacher;
  }

  function screenAvatars() {
    const have = unlockedAvatars();
    const all = START_AVATARS.concat(REWARDS);
    render(`<div class="card"><h2>Mans varonis</h2>
      <p class="small">Katrs pabeigts līmenis atver jaunu varoni.</p>
      <div class="avatars">${all.map((a, i) => {
        const ok = have.includes(a);
        return `<button data-a="${a}" class="${a === S.avatar ? 'sel' : ''}" ${ok ? '' : 'disabled'} aria-label="${ok ? 'Varonis ' + a : 'Slēgts'}">${ok ? a : '🔒'}</button>`;
      }).join('')}</div>
      <button class="btn ghost" id="back">← Atpakaļ</button></div>`);
    document.querySelector('.avatars').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      S.avatar = b.dataset.a; save(); screenAvatars();
    });
    document.getElementById('back').onclick = screenMap;
  }

  function screenIntro(id) {
    const l = E.LEVELS.find((x) => x.id === id);
    render(`<div class="card">
        <div class="row spread"><button class="btn ghost small" id="back">← Karte</button><span class="pill">Līmenis ${l.id}</span></div>
        <h2 style="margin-top:12px">${l.icon} ${esc(l.title)}</h2>
        <div class="card lesson"><b>📘 Atceries:</b><br>${l.lesson}</div>
        <p>🎯 <b>Mērķis:</b> atbildi pareizi uz <b>${l.need}</b> uzdevumiem. Tev ir <b>3 ❤️</b> — zaudē sirdi, ja kļūdies divas reizes pēc kārtas vienā uzdevumā.</p>
        <button class="btn green" id="start">${l.boss ? '⚔️ Cīnīties ar bosu' : 'Sākt līmeni'}</button>
      </div>`);
    document.getElementById('back').onclick = screenMap;
    document.getElementById('start').onclick = () => startLevel(l);
  }

  // ---------- spēles gaita ----------
  let G = null; // aktīvā sesija

  function startLevel(l) {
    S.lastLevel = l.id;
    G = { l, correct: 0, hearts: 3, q: null, attempt: 1, coins: 0, firstTry: 0, asked: 0, state: 'answer' };
    lv(l.id).plays = (lv(l.id).plays || 0) + 1; save();
    nextQuestion();
  }

  function widget(part, i) {
    const attrs = (f, label, cls) => `<input class="in ${cls || ''}" data-p="${i}" data-f="${f}" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="${label}">`;
    const fin = (nl, dl) => `<span class="fin">${attrs('n', nl)}<span class="bar"></span>${attrs('d', dl)}</span>`;
    let inner;
    switch (part.kind) {
      case 'int': inner = attrs('v', 'atbilde', 'wide'); break;
      case 'select': inner = `<select data-p="${i}" data-f="v" aria-label="izvēle"><option value="">izvēlies…</option>${part.options.map((o, k) => `<option value="${k}">${esc(o)}</option>`).join('')}</select>`; break;
      case 'frac': case 'rawfrac': inner = fin('skaitītājs', 'saucējs'); break;
      default: inner = attrs('w', 'veselā daļa') + fin('skaitītājs', 'saucējs');
    }
    return `<span class="slot" data-slot="${i}">${inner}</span>`;
  }

  function nextQuestion() {
    G.q = G.l.gen(); G.attempt = 1; G.state = 'answer'; G.asked++;
    const q = G.q;
    const prompt = q.prompt.replace(/\{\{(\d+)\}\}/g, (_, i) => widget(q.parts[+i], +i));
    const hasAny = q.parts.some((p) => p.kind === 'any');
    const hasMixed = q.parts.some((p) => p.kind === 'mixed');
    render(`<div class="top">
        <button class="btn ghost small" id="quit">✕ Iziet</button>
        <div class="progress" aria-label="Pareizi ${G.correct} no ${G.l.need}">${Array.from({ length: G.l.need }, (_, i) => `<span class="${i < G.correct ? 'on' : ''}"></span>`).join('')}</div>
        <span class="hearts" aria-label="Dzīvības: ${G.hearts}">${'❤️'.repeat(G.hearts)}${'🖤'.repeat(3 - G.hearts)}</span>
      </div>
      <div class="card">
        <div class="small">${G.l.icon} ${esc(G.l.short)}</div>
        <div id="q">${prompt}</div>
        ${hasAny ? '<div class="small">💡 Veselo skaitli raksti tikai tad, ja atbildi dod kā jauktu skaitli.</div>' : ''}
        ${hasMixed ? '<div class="small">💡 Jauktam skaitlim: kreisajā laukā — veselie, labajā — daļa.</div>' : ''}
        <div id="fb"></div>
        <div class="row" style="margin-top:16px"><button class="btn green" id="act">Pārbaudīt</button></div>
      </div>`);
    document.getElementById('quit').onclick = () => { if (confirm('Iziet no līmeņa? Progress šajā mēģinājumā netiks saglabāts.')) screenMap(); };
    document.getElementById('act').onclick = onAction;
    const first = $app.querySelector('#q input, #q select'); if (first) first.focus();
  }

  const collect = () => G.q.parts.map((_, i) => {
    const o = {};
    $app.querySelectorAll(`[data-p="${i}"]`).forEach((el) => { o[el.dataset.f] = el.value; });
    return o;
  });

  function setFb(cls, html) { document.getElementById('fb').innerHTML = `<div class="feedback ${cls}" role="alert">${html}</div>`; }
  const stepsHtml = (q) => `<ol>${q.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;

  function onAction() {
    if (!G) return;
    if (G.state === 'next') return afterQuestion();
    const res = E.checkQuestion(G.q, collect());
    if (res.results.some((r) => r.code === 'empty')) { setFb('info', E.MSG.empty); return; }

    const st = lv(G.l.id);
    res.results.forEach((r, i) => {
      const slot = $app.querySelector(`[data-slot="${i}"]`);
      slot.classList.toggle('ok', r.ok); slot.classList.toggle('bad', !r.ok);
    });

    if (res.ok) {
      const gain = G.attempt === 1 ? 10 : 5;
      G.coins += gain; G.correct++; if (G.attempt === 1) G.firstTry++;
      st.attempts++; st.correct++; if (G.attempt === 1) st.firstTry++;
      save();
      lockInputs();
      setFb('good', `✅ ${G.attempt === 1 ? 'Super!' : 'Labi, tagad pareizi!'} +${gain} 🪙`);
      endQuestion(G.correct >= G.l.need ? 'Tālāk →' : 'Nākamais uzdevums →');
      return;
    }

    // kļūda
    const tags = res.results.filter((r) => !r.ok).map((r) => r.tag || r.code);
    tags.forEach((t) => { S.errors[t] = (S.errors[t] || 0) + 1; });
    const msgs = [...new Set(res.results.filter((r) => !r.ok).map((r) => r.msg).filter(Boolean))];
    if (G.attempt === 1) {
      G.attempt = 2; save();
      setFb('bad', `❌ Gandrīz! Pamēģini vēlreiz.<br><span style="font-weight:600">${msgs.map(esc).join('<br>') || 'Pārbaudi aprēķinu un mēģini vēlreiz.'}</span>`);
      const bad = $app.querySelector('.slot.bad input, .slot.bad select'); if (bad) bad.focus();
      return;
    }
    // otrā kļūda — zaudē sirdi, rāda risinājumu
    st.attempts++; G.hearts--; save();
    lockInputs();
    setFb('bad', `💔 Šoreiz neizdevās. Aplūko risinājumu:${stepsHtml(G.q)}`);
    endQuestion(G.hearts <= 0 ? 'Tālāk →' : 'Nākamais uzdevums →');
  }

  function lockInputs() { $app.querySelectorAll('#q input, #q select').forEach((el) => { el.disabled = true; }); }
  function endQuestion(label) {
    G.state = 'next';
    const b = document.getElementById('act'); b.textContent = label; b.focus();
    // sirdis uzreiz atjaunojam
    const h = $app.querySelector('.hearts'); if (h) h.textContent = '❤️'.repeat(G.hearts) + '🖤'.repeat(3 - G.hearts);
    const p = $app.querySelectorAll('.progress span'); p.forEach((s, i) => s.classList.toggle('on', i < G.correct));
  }

  function afterQuestion() {
    if (G.correct >= G.l.need) return screenWin();
    if (G.hearts <= 0) return screenLose();
    nextQuestion();
  }

  function screenWin() {
    const l = G.l, st = lv(l.id);
    const starsGot = Math.max(1, G.hearts);
    const first = !st.done;
    st.done = true; st.stars = Math.max(st.stars, starsGot);
    const bonus = (l.boss ? 60 : 25) + starsGot * 5;
    S.coins += G.coins + bonus; save();
    const reward = REWARDS[l.id - 1];
    const next = E.LEVELS.find((x) => x.id === l.id + 1);
    const nextZone = next && next.zone !== l.zone ? E.ZONES.find((z) => z.id === next.zone) : null;
    render(`<div class="card center">
      <div class="big-emoji">${l.boss ? '👑' : '🎉'}</div>
      <h1>${l.boss ? 'Boss uzvarēts!' : 'Līmenis pabeigts!'}</h1>
      <div class="stars-big" style="color:#c98d00">${stars(starsGot)}</div>
      <p>🪙 +${G.coins} par atbildēm, +${bonus} bonuss</p>
      ${first ? `<p>🎁 Jauns varonis atslēgts: <span style="font-size:36px">${reward}</span></p>` : ''}
      ${next && first ? `<p>🔓 Atslēgts nākamais līmenis: <b>${esc(next.short)}</b></p>` : ''}
      ${nextZone && first ? `<p>🚪 Vārti uz zonu <b>${nextZone.icon} ${esc(nextZone.name)}</b> ir vaļā!</p>` : ''}
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="btn ghost" id="map">Karte</button>
        ${next ? '<button class="btn green" id="nxt">Nākamais līmenis →</button>' : ''}
      </div></div>`);
    confetti();
    document.getElementById('map').onclick = screenMap;
    if (next) document.getElementById('nxt').onclick = () => screenIntro(next.id);
  }

  function screenLose() {
    const l = G.l;
    render(`<div class="card center">
      <div class="big-emoji">💪</div>
      <h1>Šoreiz neizdevās</h1>
      <p>Pareizi: <b>${G.correct}</b> no <b>${l.need}</b>. Tas ir normāli — kļūdas palīdz mācīties! Pārlasi atgādinājumu un mēģini vēlreiz.</p>
      <div class="card lesson" style="text-align:left"><b>📘 Atceries:</b><br>${l.lesson}</div>
      <div class="row" style="justify-content:center">
        <button class="btn ghost" id="map">Karte</button>
        <button class="btn green" id="again">Mēģināt vēlreiz</button>
      </div></div>`);
    document.getElementById('map').onclick = screenMap;
    document.getElementById('again').onclick = () => startLevel(l);
  }

  // ---------- skolotāja panelis ----------
  function screenTeacher() {
    const code = prompt('Skolotāja kods:');
    if (code === null) return;
    if (code.trim().toLowerCase() !== TEACHER_CODE) { toast('Nepareizs kods'); return; }
    const rows = E.LEVELS.map((l) => {
      const s = S.levels[l.id] || {};
      const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) + '%' : '–';
      const ft = s.attempts ? Math.round((s.firstTry / s.attempts) * 100) + '%' : '–';
      return `<tr><td>${l.id}</td><td>${esc(l.short)}</td><td>${s.done ? '✔' : ''}</td><td>${s.stars ? stars(s.stars) : ''}</td><td>${s.plays || 0}</td><td>${s.attempts || 0}</td><td>${acc}</td><td>${ft}</td></tr>`;
    }).join('');
    const errs = Object.entries(S.errors).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<tr><td>${esc(ERROR_LABELS[k] || k)}</td><td>${v}</td></tr>`).join('') || '<tr><td colspan="2">Kļūdu vēl nav.</td></tr>';
    render(`<div class="card"><div class="row spread"><h2>👩‍🏫 Skolotāja panelis</h2><button class="btn ghost small" id="back">← Karte</button></div>
      <p class="small">Skolēns: <b>${esc(S.name)}</b> · Monētas: ${S.coins}. Dati tiek glabāti tikai šajā ierīcē.</p>
      <h3>Līmeņi</h3><div class="tbl"><table><tr><th>#</th><th>Tēma</th><th>Gatavs</th><th>Zvaigznes</th><th>Mēģ.</th><th>Atbildes</th><th>Precizitāte</th><th>Pirmajā reizē</th></tr>${rows}</table></div>
      <h3 style="margin-top:16px">Biežākās kļūdas</h3><div class="tbl"><table><tr><th>Kļūdas veids</th><th>Skaits</th></tr>${errs}</table></div>
      <div class="row" style="margin-top:16px">
        <button class="btn small" id="unl">${S.unlockAll ? 'Atcelt visu līmeņu atvēršanu' : 'Atvērt visus līmeņus'}</button>
        <button class="btn small ghost" id="exp">Eksportēt JSON</button>
        <button class="btn small red" id="rst">Dzēst progresu</button>
      </div></div>`);
    document.getElementById('back').onclick = screenMap;
    document.getElementById('unl').onclick = () => { S.unlockAll = !S.unlockAll; save(); screenMap(); };
    document.getElementById('exp').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
      a.download = 'dalu-piedzivojums-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    document.getElementById('rst').onclick = () => {
      if (confirm('Vai tiešām dzēst visu progresu šajā ierīcē?')) { S = blank(); save(); screenWelcome(); }
    };
  }

  // Enter = pārbaudīt / tālāk
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && G && document.getElementById('act') && !e.target.closest('button')) { e.preventDefault(); onAction(); }
  });

  S.name ? screenMap() : screenWelcome();
})();
