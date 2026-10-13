/* Daļu piedzīvojums — 3D pasaule (Three.js, Roblox stila bloku vide).
   Varonis staigā pa ceļu; katrs līmenis ir platforma. Slēgtos līmeņus aizsedz barjera. */
(function () {
  'use strict';
  const HALF = 7;        // ceļa pusplatums (kustības koridors)
  const SPACING = 17;    // attālums starp līmeņu platformām
  const SPEED = 11;
  const ZONE_PATH = { 1: '#e6d79c', 2: '#9aa5b1', 3: '#c3a6f5' };

  function supported() {
    try {
      if (!window.THREE) return false;
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  function create(container, o) {
    const T = window.THREE;
    const levels = o.levels;

    // ---------- ceļš ----------
    const lp = levels.map((l, i) => ({ x: Math.sin(i * 0.85) * 9, z: -i * SPACING }));
    const pts = [{ x: 0, z: 26 }].concat(lp, [{ x: lp[lp.length - 1].x, z: lp[lp.length - 1].z - 26 }]);
    const segs = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z);
      segs.push({ a, b, len, s0: total, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, zone: levels[Math.min(Math.max(i, 1), levels.length) - 1].zone });
      total += len;
    }
    const levelS = levels.map((l, i) => segs[i].s0 + segs[i].len); // loka garums līdz platformai (i-tā segmenta beigas)

    function nearest(x, z) {
      let best = null;
      for (const sg of segs) {
        let t = ((x - sg.a.x) * sg.dx + (z - sg.a.z) * sg.dz);
        t = Math.max(0, Math.min(sg.len, t));
        const px = sg.a.x + sg.dx * t, pz = sg.a.z + sg.dz * t, d = Math.hypot(x - px, z - pz);
        if (!best || d < best.d) best = { d, px, pz, s: sg.s0 + t, seg: sg };
      }
      return best;
    }
    function pointAt(s) {
      s = Math.max(0, Math.min(total, s));
      for (const sg of segs) if (s <= sg.s0 + sg.len + 1e-6) {
        const t = s - sg.s0; return { x: sg.a.x + sg.dx * t, z: sg.a.z + sg.dz * t, ang: Math.atan2(sg.dx, sg.dz), zone: sg.zone };
      }
      const sg = segs[segs.length - 1]; return { x: sg.b.x, z: sg.b.z, ang: Math.atan2(sg.dx, sg.dz), zone: sg.zone };
    }
    const firstLockedIdx = () => levels.findIndex((l) => !o.isOpen(l.id));
    const limitS = () => { const k = firstLockedIdx(); return k < 0 ? total : levelS[k] - 6 - 1.5; };

    // ---------- skats ----------
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const canvas = renderer.domElement; canvas.className = 'world-canvas';
    container.insertBefore(canvas, container.firstChild);
    const scene = new T.Scene();
    scene.background = new T.Color(0x8fd3ff);
    scene.fog = new T.Fog(0x8fd3ff, 70, 190);
    const camera = new T.PerspectiveCamera(55, 1, 0.5, 400);

    scene.add(new T.HemisphereLight(0xffffff, 0x7fa07a, 0.85));
    const sun = new T.DirectionalLight(0xffffff, 0.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
    scene.add(sun); scene.add(sun.target);

    const disposables = [];
    const track = (x) => { disposables.push(x); return x; };
    const mat = (color, extra) => track(new T.MeshLambertMaterial(Object.assign({ color }, extra || {})));
    function box(w, h, d, material, x, y, z, shadow) {
      const m = new T.Mesh(track(new T.BoxGeometry(w, h, d)), material);
      m.position.set(x, y, z); m.castShadow = shadow !== false; m.receiveShadow = true; scene.add(m); return m;
    }
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = track(new T.CanvasTexture(c)); t.anisotropy = 4; return t;
    }
    function label(text, size, bg, fg) {
      return canvasTex(256, 96, (g) => {
        g.fillStyle = bg || 'rgba(20,26,36,.85)'; g.beginPath(); g.roundRect ? g.roundRect(4, 4, 248, 88, 22) : g.rect(4, 4, 248, 88); g.fill();
        g.fillStyle = fg || '#fff'; g.font = `bold ${size || 40}px Trebuchet MS, Segoe UI, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 50);
      });
    }
    function sprite(tex, sx, sy) {
      const s = new T.Sprite(track(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })));
      s.scale.set(sx, sy, 1); return s;
    }

    // ---------- zeme (Roblox "studs") ----------
    const studTex = canvasTex(64, 64, (g) => {
      g.fillStyle = '#5fae4f'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#74c463'; g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fill();
      g.fillStyle = '#4c9640'; g.beginPath(); g.arc(32, 36, 14, 0.2, 2.9); g.fill();
      g.fillStyle = '#74c463'; g.beginPath(); g.arc(32, 31, 13, 0, 7); g.fill();
    });
    studTex.wrapS = studTex.wrapT = T.RepeatWrapping; studTex.repeat.set(160, 180);
    const ground = new T.Mesh(track(new T.PlaneGeometry(640, 720)), mat(0xffffff, { map: studTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -total / 2 + 30); ground.receiveShadow = true; scene.add(ground);

    // ceļa plāksnes
    segs.forEach((sg, i) => {
      const cx = (sg.a.x + sg.b.x) / 2, cz = (sg.a.z + sg.b.z) / 2;
      const m = box(HALF * 2 + 1, 0.3, sg.len + 6, mat(ZONE_PATH[sg.zone]), cx, 0.15, cz, false);
      m.rotation.y = Math.atan2(sg.dx, sg.dz);
      m.position.y = 0.15 + (i % 2) * 0.01;
    });
    pts.forEach((p, i) => { box(HALF * 2 + 1, 0.3, HALF * 2 + 1, mat(ZONE_PATH[segs[Math.min(i, segs.length - 1)].zone]), p.x, 0.17, p.z, false); });

    // ---------- līmeņu platformas ----------
    const pads = levels.map((l, i) => {
      const open = o.isOpen(l.id), done = o.isDone(l.id);
      const color = done ? 0x2ea043 : open ? 0xffc233 : 0x8b96a5;
      const g = new T.Group(); g.position.set(lp[i].x, 0, lp[i].z); scene.add(g);
      const base = new T.Mesh(track(new T.BoxGeometry(7, 0.9, 7)), mat(color)); base.position.y = 0.55; base.castShadow = base.receiveShadow = true; g.add(base);
      const rim = new T.Mesh(track(new T.BoxGeometry(5, 0.3, 5)), mat(done ? 0x69d77a : open ? 0xfff0b3 : 0xb9c2cd)); rim.position.y = 1.1; g.add(rim);
      if (l.boss) [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([dx, dz]) => { const p = new T.Mesh(track(new T.BoxGeometry(1, 5, 1)), mat(0xe5484d)); p.position.set(dx, 3, dz); p.castShadow = true; g.add(p); });
      const stars = o.stars(l.id);
      const tex = canvasTex(256, 256, (c) => {
        c.fillStyle = '#141a24'; c.fillRect(8, 8, 240, 240);
        c.fillStyle = done ? '#2ea043' : open ? '#ffc233' : '#aab4c2'; c.fillRect(16, 16, 224, 224);
        c.font = '110px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(open ? l.icon : '🔒', 128, 100);
        c.fillStyle = '#141a24'; c.font = 'bold 58px Trebuchet MS, sans-serif'; c.fillText(String(l.id), 128, 180);
        if (done) { c.fillStyle = '#fff'; c.font = '34px sans-serif'; c.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 128, 222); }
      });
      const sp = sprite(tex, 4.6, 4.6); sp.position.y = 5; g.add(sp);
      const title = sprite(label(l.short.length > 22 ? l.short.slice(0, 21) + '…' : l.short, 26), 7, 2.6); title.position.y = 8.6; if (!open) title.visible = false; g.add(title);
      return { g, sp, open, id: l.id, i };
    });

    // ---------- barjera pirms pirmā slēgtā līmeņa ----------
    const k = firstLockedIdx();
    if (k > 0) {
      const p = pointAt(levelS[k] - 6);
      const bar = new T.Group(); bar.position.set(p.x, 0, p.z); bar.rotation.y = p.ang; scene.add(bar);
      const w = HALF * 2 + 3;
      [-w / 2, w / 2].forEach((x) => { const post = new T.Mesh(track(new T.BoxGeometry(1.2, 6, 1.2)), mat(0x141a24)); post.position.set(x, 3, 0); post.castShadow = true; bar.add(post); });
      for (let r = 0; r < 3; r++) {
        const stripe = canvasTex(128, 32, (c) => { for (let q = 0; q < 8; q++) { c.fillStyle = q % 2 ? '#fff' : '#e5484d'; c.fillRect(q * 16, 0, 16, 32); } });
        const m = new T.Mesh(track(new T.BoxGeometry(w, 0.9, 0.6)), mat(0xffffff, { map: stripe })); m.position.y = 1.2 + r * 1.7; m.castShadow = true; bar.add(m);
      }
      const lock = sprite(label('🔒 Pabeidz ' + (k) + '. līmeni', 30, '#e5484d'), 9, 3.4); lock.position.y = 7.4; bar.add(lock);
    }

    // ---------- zonu arkas ----------
    levels.forEach((l, i) => {
      if (i === 0 || l.zone === levels[i - 1].zone) return;
      const p = pointAt(levelS[i] - SPACING / 2 - 0.5);
      const z = o.zones.find((x) => x.id === l.zone);
      const arch = new T.Group(); arch.position.set(p.x, 0, p.z); arch.rotation.y = p.ang; scene.add(arch);
      const col = new T.Color(z.color).getHex();
      [-HALF - 1.5, HALF + 1.5].forEach((x) => { const pil = new T.Mesh(track(new T.BoxGeometry(2, 11, 2)), mat(col)); pil.position.set(x, 5.5, 0); pil.castShadow = true; arch.add(pil); });
      const beam = new T.Mesh(track(new T.BoxGeometry(HALF * 2 + 5.5, 2, 2.4)), mat(col)); beam.position.y = 11; beam.castShadow = true; arch.add(beam);
      const nm = sprite(label(z.icon + ' ' + z.name, 30, 'rgba(20,26,36,.9)'), 11, 4.1); nm.position.y = 14.5; arch.add(nm);
    });

    // ---------- dekori ----------
    let seed = 1234567;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const winTex = canvasTex(64, 128, (c) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 128);
      for (let y = 8; y < 128; y += 20) for (let x = 8; x < 64; x += 20) { c.fillStyle = '#6fb7ee'; c.fillRect(x, y, 10, 12); }
    });
    const palette = [0xf2a65a, 0xe5707e, 0x6dc6c1, 0xf4d35e, 0xb89cf0, 0xff9f68];
    function tree(x, z) {
      const h = 2.5 + rand() * 2;
      box(0.9, h, 0.9, mat(0x7a4b25), x, h / 2, z);
      const lc = 0x2e8b3a + (rand() > 0.5 ? 0x102010 : 0);
      box(3.6, 2.6, 3.6, mat(lc), x, h + 1.2, z); box(2.2, 2, 2.2, mat(0x3fa94b), x, h + 3.2, z);
    }
    function building(x, z) {
      const w = 5 + rand() * 4, d = 5 + rand() * 4, h = 8 + rand() * 12;
      const tx = winTex.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(Math.round(w / 3), Math.round(h / 6)); track(tx);
      box(w, h, d, mat(palette[Math.floor(rand() * palette.length)], { map: tx }), x, h / 2, z);
      box(w + 0.6, 0.8, d + 0.6, mat(0x555e6b), x, h + 0.4, z);
    }
    function tower(x, z) {
      const h = 10 + rand() * 8, w = 4.5;
      box(w, h, w, mat(0xc9ced6), x, h / 2, z);
      for (let a = -1; a <= 1; a += 2) for (let b = -1; b <= 1; b += 2) box(1.2, 1.2, 1.2, mat(0xaab1bb), x + a * 1.6, h + 0.6, z + b * 1.6);
      box(0.3, 3, 0.3, mat(0x555e6b), x, h + 2.4, z); box(2, 1.2, 0.2, mat(0xe5484d), x + 1, h + 3.4, z);
    }
    let placed = 0, tries = 0;
    while (placed < 130 && tries < 1500) {
      tries++;
      const s = rand() * total, p = pointAt(s), side = rand() > 0.5 ? 1 : -1, off = HALF + 4 + rand() * 38;
      const x = p.x + Math.cos(p.ang) * off * side, z = p.z - Math.sin(p.ang) * off * side;
      if (nearest(x, z).d < HALF + 3.5) continue;
      placed++;
      if (p.zone === 1) tree(x, z); else if (p.zone === 2) (rand() > 0.35 ? building : tree)(x, z); else (rand() > 0.4 ? tower : tree)(x, z);
    }
    // mākoņi
    const cloudMat = mat(0xffffff, { transparent: true, opacity: 0.92 });
    const clouds = [];
    for (let i = 0; i < 16; i++) {
      const c = new T.Group(); const n = 2 + Math.floor(rand() * 3);
      for (let j = 0; j < n; j++) { const b = new T.Mesh(track(new T.BoxGeometry(6 + rand() * 6, 2, 4 + rand() * 3)), cloudMat); b.position.set(j * 4, rand(), rand() * 2); c.add(b); }
      c.position.set((rand() - 0.5) * 220, 38 + rand() * 12, 30 - rand() * (total + 60)); scene.add(c); clouds.push(c);
    }

    // ---------- varonis ----------
    const player = new T.Group(); scene.add(player);
    const skin = mat(0xffd54a), shirt = mat(0x2f81f7), pants = mat(0x2ea043);
    const faceTex = canvasTex(128, 128, (c) => {
      c.fillStyle = '#ffd54a'; c.fillRect(0, 0, 128, 128);
      c.font = '92px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.avatar, 64, 70);
    });
    const headMats = [skin, skin, skin, skin, track(new T.MeshLambertMaterial({ map: faceTex })), skin];
    const head = new T.Mesh(track(new T.BoxGeometry(1.7, 1.7, 1.7)), headMats); head.position.y = 4.9; head.castShadow = true; player.add(head);
    const torso = new T.Mesh(track(new T.BoxGeometry(2, 2, 1.1)), shirt); torso.position.y = 3; torso.castShadow = true; player.add(torso);
    function limb(w, h, m, x, y) { const g = new T.Group(); g.position.set(x, y, 0); const l = new T.Mesh(track(new T.BoxGeometry(w, h, w)), m); l.position.y = -h / 2; l.castShadow = true; g.add(l); player.add(g); return g; }
    const armL = limb(0.9, 2, skin, -1.45, 4), armR = limb(0.9, 2, skin, 1.45, 4);
    const legL = limb(0.95, 2, pants, -0.5, 2), legR = limb(0.95, 2, pants, 0.5, 2);
    const nameTag = sprite(label(o.name.slice(0, 14), 40, 'rgba(20,26,36,.8)'), 3.4, 1.3); nameTag.position.y = 7; player.add(nameTag);

    // sākuma pozīcija
    const startIdx = Math.max(0, levels.findIndex((l) => l.id === o.startLevel));
    const sp0 = pointAt(Math.max(0, levelS[startIdx] - 6));
    player.position.set(sp0.x, 0, sp0.z); let facing = sp0.ang + Math.PI; facing = sp0.ang; player.rotation.y = facing;
    let yaw = 0, targetYaw = 0;
    camera.position.set(player.position.x, 13, player.position.z + 18);

    // ---------- ievade ----------
    const keys = {}; const joy = { x: 0, y: 0 };
    const onKeyDown = (e) => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const k2 = e.key.toLowerCase(); keys[k2] = true;
      if (['arrowleft', 'arrowright', ' ', 'arrowup', 'arrowdown'].includes(k2)) e.preventDefault();
      if (k2 === 'e' || k2 === 'enter' || k2 === ' ') api.interact();
    };
    const onKeyUp = (e) => { keys[e.key.toLowerCase()] = false; };
    addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp);

    // kameras pagriešana ar vilkšanu
    let drag = null;
    const onDown = (e) => { drag = { x: e.clientX, id: e.pointerId }; };
    const onMove = (e) => { if (drag && e.pointerId === drag.id) { targetYaw -= (e.clientX - drag.x) * 0.008; drag.x = e.clientX; } };
    const onUp = () => { drag = null; };
    canvas.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);

    // virtuālais stienis (skārienekrāniem)
    let joyEl = null;
    if (matchMedia('(pointer: coarse)').matches) {
      joyEl = document.createElement('div'); joyEl.className = 'joy'; joyEl.innerHTML = '<div class="knob"></div>'; container.appendChild(joyEl);
      const knob = joyEl.firstChild; let jid = null;
      const setJ = (e) => {
        const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
        joy.x = dx; joy.y = -dy; knob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`;
      };
      joyEl.addEventListener('pointerdown', (e) => { jid = e.pointerId; joyEl.setPointerCapture(jid); setJ(e); e.stopPropagation(); });
      joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === jid) setJ(e); });
      const end = (e) => { if (e.pointerId === jid) { jid = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
      joyEl.addEventListener('pointerup', end); joyEl.addEventListener('pointercancel', end);
    }

    function resize() {
      const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
      renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%';
      camera.aspect = w / h;
      // šaurā (portreta) ekrānā palielinām redzes lauku, lai pietiek vietas ceļam
      camera.fov = Math.max(50, Math.min(100, (2 * Math.atan(Math.tan((36 * Math.PI) / 180) / camera.aspect) * 180) / Math.PI));
      camera.updateProjectionMatrix();
    }
    addEventListener('resize', resize); resize();

    // ---------- cikls ----------
    let near = null, lastBlock = 0, running = true, last = performance.now(), walk = 0, raf = 0;
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      update(now);
    }
    function update(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;

      if (keys.arrowleft) targetYaw += 2.2 * dt; if (keys.arrowright) targetYaw -= 2.2 * dt;
      yaw += (targetYaw - yaw) * Math.min(1, dt * 10);
      let ix = joy.x + ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)), iy = joy.y + ((keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0));
      const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
      const moving = m > 0.08;
      if (moving) {
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const vx = fx * iy + rx * ix, vz = fz * iy + rz * ix;
        const old = { x: player.position.x, z: player.position.z };
        let nx = old.x + vx * SPEED * dt, nz = old.z + vz * SPEED * dt;
        let n = nearest(nx, nz);
        if (n.d > HALF) { const k3 = HALF / n.d; nx = n.px + (nx - n.px) * k3; nz = n.pz + (nz - n.pz) * k3; n = nearest(nx, nz); }
        if (n.s > limitS()) {
          nx = old.x; nz = old.z;
          if (now - lastBlock > 2500) { lastBlock = now; o.onBlocked && o.onBlocked(levels[firstLockedIdx()]); }
        }
        player.position.x = nx; player.position.z = nz;
        const target = Math.atan2(vx, vz); let df = target - facing; df = Math.atan2(Math.sin(df), Math.cos(df)); facing += df * Math.min(1, dt * 12);
        player.rotation.y = facing; walk += dt * 11;
      } else walk *= 0.8;
      const sw = Math.sin(walk) * (moving ? 0.9 : Math.abs(walk) * 0.1);
      armL.rotation.x = sw; armR.rotation.x = -sw; legL.rotation.x = -sw; legR.rotation.x = sw;
      player.position.y = moving ? Math.abs(Math.sin(walk)) * 0.15 : 0;

      // kamera
      const d = 18, hgt = 13;
      const tx = player.position.x + Math.sin(yaw) * d, tz = player.position.z + Math.cos(yaw) * d;
      camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 6); camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 6); camera.position.y = hgt;
      camera.lookAt(player.position.x, 3, player.position.z);
      sun.position.set(player.position.x + 40, 90, player.position.z + 25); sun.target.position.copy(player.position);

      // platformu animācija un tuvums
      const t = now / 1000; let nn = null, nd = 4.2;
      pads.forEach((p) => {
        p.sp.position.y = 5 + (p.open ? Math.sin(t * 2 + p.i) * 0.35 : 0);
        const dd = Math.hypot(player.position.x - p.g.position.x, player.position.z - p.g.position.z);
        if (p.open && dd < nd) { nd = dd; nn = p; }
      });
      const id = nn ? nn.id : null;
      if (id !== near) { near = id; o.onNear && o.onNear(id ? levels.find((l) => l.id === id) : null); }
      clouds.forEach((c, i) => { c.position.x += dt * (0.6 + (i % 3) * 0.3); if (c.position.x > 130) c.position.x = -130; });
      renderer.render(scene, camera);
    }
    let now0 = performance.now();
    raf = requestAnimationFrame(frame);

    const api = {
      // testēšanai: simulē laika soli un atdod spēlētāja stāvokli
      _step(ms, n) { for (let i = 0; i < (n || 1); i++) { last = now0; now0 += ms; update(now0); } return { x: player.position.x, z: player.position.z, near }; },
      interact() { if (near && o.onEnter) o.onEnter(near); },
      destroy() {
        if (!running) return; running = false; cancelAnimationFrame(raf);
        removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('resize', resize);
        removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
        disposables.forEach((d2) => d2.dispose && d2.dispose());
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* nekas */ }
        canvas.remove(); if (joyEl) joyEl.remove();
      },
    };
    return api;
  }

  window.World = { supported, create };
})();
