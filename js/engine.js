/* Daļu piedzīvojums — matemātikas dzinējs: uzdevumu ģeneratori un atbilžu pārbaude.
   Darbojas gan pārlūkā (window.Engine), gan Node (testiem). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- palīgfunkcijas ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[rnd(0, arr.length - 1)];
  const reduce = (n, d) => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
  const sameValue = (a, b) => a.n * b.d === b.n * a.d;
  const toMixed = (n, d) => { const r = reduce(n, d); return { w: Math.floor(r.n / r.d), n: r.n % r.d, d: r.d }; };

  // HTML daļu attēlošana
  const F = (n, d) => `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span>`;
  const M = (w, n, d) => `<span class="mixed"><span class="whole">${w}</span>${F(n, d)}</span>`;
  const B = (s) => `<b>${s}</b>`;

  // ---------- atbilžu pārbaude ----------
  const parseNat = (s) => {
    s = String(s == null ? '' : s).trim();
    return /^\d{1,6}$/.test(s) ? parseInt(s, 10) : null;
  };

  const MSG = {
    empty: 'Aizpildi visus laukus.',
    notReduced: 'Vērtība ir pareiza, bet daļu vēl var saīsināt!',
    notProper: 'Vērtība ir pareiza, bet jāizslēdz veselie — skaitītājam jābūt mazākam par saucēju.',
    wrongForm: 'Vērtība ir pareiza! Izslēdz veselos un raksti kā jauktu skaitli.',
    wrong: 'Šī atbilde nav pareiza.',
  };

  function findPattern(part, value) {
    for (const p of part.wrong || []) {
      const hit = typeof p.v === 'number' ? (typeof value === 'number' && value === p.v)
        : (typeof value === 'object' && value && sameValue(value, p.v));
      if (hit) return p;
    }
    return null;
  }

  // input: { v } (int/select) vai { w, n, d } (daļas)
  function checkPart(part, input) {
    input = input || {};
    const bad = (code, msg, tag) => ({ ok: false, code, msg: msg || MSG[code], tag: tag || code });

    if (part.kind === 'int' || part.kind === 'select') {
      const v = parseNat(input.v);
      if (v === null) return bad('empty');
      if (v === part.answer) return { ok: true, code: 'ok' };
      const p = findPattern(part, v);
      return bad('wrong', p && p.msg, p && p.tag);
    }

    const n = parseNat(input.n), d = parseNat(input.d);
    const w = parseNat(input.w);
    if (n === null || d === null) return bad('empty');
    if (part.kind === 'mixed' && w === null) {
      // Atļaujam tukšu veselo tikai tad, ja students ierakstījis neīstu daļu ar pareizo vērtību
      if (d !== 0 && sameValue({ n, d }, part.answer)) return bad('wrongForm');
      return bad('empty');
    }
    if (d === 0) return bad('wrong', 'Saucējs nevar būt 0.');

    const val = { n: (w || 0) * d + n, d };

    if (part.kind === 'rawfrac') {
      if (n === part.answer.n && d === part.answer.d) return { ok: true, code: 'ok' };
      if (sameValue(val, part.answer)) return bad('wrong', 'Vērtība sakrīt, bet šeit jāraksta tieši tā neīstā daļa, kas rodas, pārveidojot jaukto skaitli: veselais × saucējs + skaitītājs.', 'rawform');
      const p = findPattern(part, val);
      return bad('wrong', p && p.msg, p && p.tag);
    }

    if (!sameValue(val, part.answer)) {
      const p = findPattern(part, val);
      return bad('wrong', p && p.msg, p && p.tag);
    }
    // vērtība pareiza — pārbaudām formu
    if (part.kind === 'mixed') {
      if (n >= d) return bad('notProper');
      if (gcd(n, d) !== 1) return bad('notReduced');
      return { ok: true, code: 'ok' };
    }
    // 'frac' un 'any'
    if (w !== null && w > 0 && n >= d) return bad('notProper');
    if (part.proper && n >= d) return bad('notProper');
    if (gcd(n, d) !== 1) return bad('notReduced');
    return { ok: true, code: 'ok' };
  }

  function checkQuestion(q, inputs) {
    const results = q.parts.map((p, i) => checkPart(p, inputs[i]));
    return { ok: results.every((r) => r.ok), results };
  }

  // ---------- uzdevumu ģeneratori ----------
  // Slots {{i}} tekstā tiek aizstāti ar ievades laukiem.
  const Q = (prompt, parts, steps, extra) => Object.assign({ prompt, parts, steps }, extra || {});

  // 1. a/b : n
  function genDivFrac() {
    for (;;) {
      const b = rnd(5, 13), n = rnd(2, 9), a = rnd(1, b - 1);
      const divisible = a % n === 0;
      if (Math.random() < 0.5 && !divisible) continue;
      const r = reduce(a, b * n);
      const steps = divisible
        ? [`Skaitītājs dalās ar ${n}: ${a} : ${n} = ${a / n}, saucējs paliek.`, `${F(a, b)} : ${n} = ${F(a / n, b)}`]
        : [`Skaitītājs nedalās ar ${n}, tāpēc saucēju reizinām ar ${n}: ${b} · ${n} = ${b * n}.`,
          `${F(a, b)} : ${n} = ${F(a, b * n)}` + (r.d !== b * n ? ` = ${F(r.n, r.d)}` : '')];
      return Q(`Izdali daļu ar veselu skaitli! Rezultātu saīsini!<div class="eq">${F(a, b)} : ${n} = {{0}}</div>`,
        [{ kind: 'frac', answer: r, wrong: [
          { v: reduce(a * n, b), msg: 'Tu daļu reizināji ar ' + n + ', bet vajadzēja dalīt. Dalot daļu ar veselu skaitli, saucēju reizina (vai skaitītāju dala).', tag: 'op-swap' }] }],
        steps);
    }
  }

  // 2. a/b · n, saīsina (n un b ir kopīgs dalītājs), rezultāts daļa
  function genMulFracCancel() {
    for (;;) {
      const b = rnd(4, 12), n = rnd(2, 9), a = rnd(1, b - 1);
      const g = gcd(n, b);
      if (g === 1) continue;
      const r = reduce(a * n, b);
      if (r.d === 1) continue;
      return Q(`Aprēķini izteiksmes vērtību! (Ievadi saīsinātu daļu!)<div class="eq">${F(a, b)} · ${n} = {{0}}</div>`,
        [{ kind: 'frac', answer: r, wrong: [
          { v: reduce(a, b * n), msg: 'Reizinot daļu ar veselu skaitli, ar to jāreizina skaitītājs, nevis saucējs.', tag: 'mul-den' }] }],
        [`Reizinām skaitītāju: ${a} · ${n} = ${a * n}.`, `${F(a * n, b)}, saīsinām ar ${g}: ${F(r.n, r.d)}.`,
          `Var arī saīsināt jau pirms reizināšanas: ${n} un ${b} dalās ar ${g}.`]);
    }
  }

  // 3./4. a/b · n, kur n dalās ar b, rezultāts vesels
  function genMulWhole(max, minN, flip) {
    for (;;) {
      const b = rnd(3, 12), k = rnd(2, 12), a = rnd(2, b - 1);
      const n = b * k;
      if (a * k > max || n < minN || n > max) continue;
      const lead = flip ? `${n} · ${F(a, b)}` : `${F(a, b)} · ${n}`;
      return Q(`Sareizini, vispirms saīsinot ar skaitli, kurš ir ${B(n)} un ${B(b)} lielākais kopīgais dalītājs!
        <div class="eq">${lead} = ${a} · {{0}} = {{1}}</div>
        <div class="small">Kad saīsini ${n} un ${b} ar ${b}, skaitlis ${n} pārvēršas par pirmo atbildi, bet saucējs kļūst par 1.</div>`,
        [{ kind: 'int', answer: k }, { kind: 'int', answer: a * k, wrong: [
          { v: a * n, msg: 'Tu sareizināji skaitītāju ar visu ' + n + ', bet saucēju aizmirsi. Vispirms saīsini ' + n + ' ar ' + b + '.', tag: 'forgot-den' }] }],
        [`Lielākais kopīgais dalītājs skaitļiem ${n} un ${b} ir ${b}.`, `${n} : ${b} = ${k}, ${b} : ${b} = 1.`, `${a} · ${k} = ${a * k}.`]);
    }
  }

  // 5. a/b · n, rezultāts jaukts skaitlis
  function genMulToMixed() {
    for (;;) {
      const b = rnd(3, 11), n = rnd(2, 9), a = rnd(1, b - 1);
      if (gcd(n, b) !== 1) continue;
      const total = a * n;
      if (total <= b || total % b === 0) continue;
      const m = toMixed(total, b);
      return Q(`Sareizini un izslēdz veselos!<div class="eq">${F(a, b)} · ${n} = {{0}}</div>`,
        [{ kind: 'mixed', answer: { n: total, d: b }, wrong: [
          { v: reduce(a, b * n), msg: 'Reizinot daļu ar veselu skaitli, jāreizina skaitītājs — saucējs paliek.', tag: 'mul-den' }] }],
        [`${a} · ${n} = ${total}, tātad ${F(total, b)}.`, `Izslēdzam veselos: ${total} : ${b} = ${m.w} un atlikums ${m.n}.`, `Atbilde: ${M(m.w, m.n, m.d)}.`]);
    }
  }

  // 6. jaukts · vesels, rezultāts jaukts
  function genMixedMul() {
    for (;;) {
      const w = rnd(1, 8), b = rnd(3, 11), a = rnd(1, b - 1), n = rnd(2, 9);
      const P = w * b + a;
      const r = reduce(P * n, b);
      if (r.d === 1) continue;
      const m = toMixed(r.n, r.d);
      return Q(`Sareizini jaukto skaitli ar veselu skaitli!<div class="eq">${M(w, a, b)} · ${n} = {{0}}</div>`,
        [{ kind: 'mixed', answer: r, wrong: [
          { v: { n: (w * n) * b + a, d: b }, msg: 'Tu sareizināji tikai veselo daļu ar ' + n + '. Jāreizina viss jauktais skaitlis — vispirms pārveido to par neīstu daļu.', tag: 'whole-only' }] }],
        [`Pārveidojam par neīstu daļu: ${w} · ${b} + ${a} = ${P}, tātad ${F(P, b)}.`,
          `${F(P, b)} · ${n} = ${F(P * n, b)}${r.n !== P * n || r.d !== b ? ' = ' + F(r.n, r.d) : ''}.`,
          `Izslēdzam veselos: ${M(m.w, m.n, m.d)}.`]);
    }
  }

  // 7. jaukts : vesels, kad veselais dalās (36 5/9 : 9)
  function genMixedDivWhole() {
    for (;;) {
      const n = rnd(2, 9), k = rnd(2, 9), b = rnd(3, 11), a = rnd(1, b - 1);
      if (gcd(a, n) !== 1 || gcd(a, b) !== 1) continue;
      const w = n * k;
      return Q(`Izdali jaukto skaitli ar veselu skaitli!<div class="small">Daļu raksti saīsinātu!</div>
        <div class="eq">${M(w, a, b)} : ${n} = {{0}}</div>`,
        [{ kind: 'mixed', answer: { n: k * b * n + a, d: b * n } }],
        [`Veselo daļu dalām ar ${n}: ${w} : ${n} = ${k}.`, `Daļu dalām ar ${n}: ${F(a, b)} : ${n} = ${F(a, b * n)}.`, `Atbilde: ${M(k, a, b * n)}.`]);
    }
  }

  // 8. jaukts : vesels, kad gan veselais, gan skaitītājs dalās (24 16/17 : 4)
  function genMixedDivBoth() {
    for (;;) {
      const n = rnd(2, 6), k = rnd(1, 9), b = rnd(7, 19), j = rnd(1, 4);
      const a = n * j;
      if (a >= b) continue;
      const r = reduce(j, b);
      return Q(`Izdali!<div class="eq">${M(n * k, a, b)} : ${n}</div>
        <div>Izteiksmes vērtība ir {{0}}</div>`,
        [{ kind: 'mixed', answer: { n: k * b + j, d: b } }],
        [`Veselo daļu dalām ar ${n}: ${n * k} : ${n} = ${k}.`, `Skaitītāju dalām ar ${n}: ${a} : ${n} = ${j}, saucējs paliek ${b}.`,
          `Atbilde: ${M(k, r.n, r.d)}.`]);
    }
  }

  // 9. ar pārveidošanu — soļi (5 3/5 : 7 = 28/5 : 7 = 4/5)
  function genMixedDivGuided() {
    for (;;) {
      const n = rnd(2, 9), b = rnd(3, 11), w = rnd(1, 9), a = rnd(1, b - 1);
      const P = w * b + a;
      if (P % n !== 0) continue;
      const r = reduce(P / n, b);
      return Q(`Izdali, jaukto skaitli pārveidojot par neīstu daļu! <i>Rezultātu saīsini!</i>
        <div class="eq">${M(w, a, b)} : ${n} = {{0}} : ${n} = {{1}}</div>`,
        [{ kind: 'rawfrac', answer: { n: P, d: b }, wrong: [] }, { kind: 'any', answer: r }],
        [`${w} · ${b} + ${a} = ${P}, tātad ${M(w, a, b)} = ${F(P, b)}.`, `${P} : ${n} = ${P / n}, saucējs paliek ${b}: ${F(P / n, b)}.`,
          r.n === P / n && r.d === b ? '' : `Saīsinām: ${F(r.n, r.d)}.`].filter(Boolean));
    }
  }

  // 10. jaukts : vesels, bez norādēm (5 5/7 : 8)
  function genMixedDivII() {
    for (;;) {
      const n = rnd(2, 9), b = rnd(3, 11), w = rnd(1, 9), a = rnd(1, b - 1);
      const P = w * b + a;
      if (Math.random() < 0.5 && P % n !== 0) continue;
      const r = reduce(P, b * n);
      const m = r.n >= r.d ? toMixed(r.n, r.d) : null;
      return Q(`Izdali!<div class="small">Atbildi raksti saīsinātu. Ja iznāk neīsta daļa, vari izslēgt veselos.</div>
        <div class="eq">${M(w, a, b)} : ${n} = {{0}}</div>`,
        [{ kind: 'any', answer: r }],
        [`Pārveidojam: ${M(w, a, b)} = ${F(P, b)}.`, `${F(P, b)} : ${n} = ${F(P, b * n)}${r.n !== P || r.d !== b * n ? ' = ' + F(r.n, r.d) : ''}.`,
          m ? `Izslēdzot veselos: ${M(m.w, m.n, m.d)}.` : ''].filter(Boolean));
    }
  }

  // 11. n reizes mazāks nekā jaukts skaitlis
  function genTimesSmaller() {
    for (;;) {
      const n = rnd(2, 5), w = rnd(1, 5), b = rnd(3, 9), a = rnd(1, b - 1);
      const P = w * b + a;
      const r = reduce(P, b * n);
      if (r.d === 1) continue;
      return Q(`Uzraksti skaitli, kurš ir ${B(n)} reizes mazāks nekā ${M(w, a, b)}.
        <div class="small">(Atbilde var būt arī neīsta daļa.)</div><div class="eq">{{0}}</div>`,
        [{ kind: 'any', answer: r, wrong: [
          { v: reduce(P * n, b), msg: '„Mazāks“ nozīmē dalīt, nevis reizināt. Tu skaitli palielināji.', tag: 'op-swap' }] }],
        [`„${n} reizes mazāks“ nozīmē: jādala ar ${n}.`, `${M(w, a, b)} = ${F(P, b)}.`, `${F(P, b)} : ${n} = ${F(P, b * n)}${r.n !== P || r.d !== b * n ? ' = ' + F(r.n, r.d) : ''}.`]);
    }
  }

  // 12. teksta uzdevums par apsveikumiem
  const CARD_TEMPLATES = [
    (a, b, n, name) => [`No ${F(a, b)} papīra loksnes ${name} izgatavoja ${B(n)} apsveikuma kartiņas. <b>Kādu daļu no papīra loksnes ${name} izlietoja katrai apsveikuma kartiņai?</b>`, 'Katrai kartiņai izlietoja', 'papīra loksnes'],
    (a, b, n, name) => [`${name} no ${F(a, b)} auduma gabala sašuva ${B(n)} vienādas somiņas. <b>Kādu daļu no auduma gabala ${name} izlietoja vienai somiņai?</b>`, 'Vienai somiņai izlietoja', 'auduma gabala'],
    (a, b, n, name) => [`No ${F(a, b)} koka dēļa ${name} izzāģēja ${B(n)} vienādus putnu būrīša sānus. <b>Kādu daļu no dēļa izlietoja vienam sānam?</b>`, 'Vienam sānam izlietoja', 'dēļa'],
    (a, b, n, name) => [`${name} nolēma ${F(a, b)} no šokolādes tāfeles vienādās daļās sadalīt starp ${B(n)} draugiem. <b>Kādu daļu no tāfeles saņēma katrs draugs?</b>`, 'Katrs draugs saņēma', 'tāfeles'],
  ];
  const NAMES = ['Nika', 'Anna', 'Līga', 'Elza', 'Marta', 'Liene'];
  function genCards() {
    for (;;) {
      const b = rnd(5, 13), n = rnd(2, 6), a = rnd(2, b - 1);
      const r = reduce(a, b * n);
      if (a % n !== 0 && Math.random() < 0.4) continue;
      const [text, lead, of] = pick(CARD_TEMPLATES)(a, b, n, pick(NAMES));
      return Q(`${text}<div class="eq small-eq">${lead} {{0}} no ${of}.</div>`,
        [{ kind: 'frac', answer: r, wrong: [{ v: reduce(a * n, b), msg: 'Šeit jādala, nevis jāreizina — daļu sadala vienādās daļās.', tag: 'op-swap' }] }],
        [`Jādala ${F(a, b)} ar ${n}.`, `${F(a, b)} : ${n} = ${F(a, b * n)}${r.d !== b * n ? ' = ' + F(r.n, r.d) : ''}.`]);
    }
  }

  // 13. teksta uzdevums par soliņiem
  const BENCH = [
    { who: 'Rinalds', start: 'nolēma nokrāsot visus dārza soliņus', unit: 'soliņa', per: 'Viena soliņa nokrāsošanai nepieciešams', cont: 'no krāsas spainīša', cnt: 'soliņu', cntQ: 'nokrāsošanai', vessel: 'spainīšus', vesselGen: 'spainīša' },
    { who: 'Mārtiņš', start: 'krāso žoga lauciņus', unit: 'lauciņa', per: 'Viena lauciņa nokrāsošanai vajag', cont: 'no krāsas bundžas', cnt: 'lauciņu', cntQ: 'nokrāsošanai', vessel: 'bundžas', vesselGen: 'bundžas' },
  ];
  function genBenches() {
    for (;;) {
      const b = rnd(3, 9), n = rnd(3, 8), a = rnd(2, b - 1);
      const total = a * n;
      if (total <= b || total % b === 0) continue;
      const m = toMixed(total, b);
      const t = pick(BENCH);
      return Q(`${t.who} ${t.start}. ${t.per} ${F(a, b)} ${t.cont}.
        <p><b>1. Cik daudz krāsas ${t.who} patērēs ${n} ${t.cnt} ${t.cntQ}?</b><br>
        Veselu ${t.vessel}: {{0}} un vēl {{1}} no ${t.vesselGen}.</p>
        <p><b>2. Cik ${t.vessel} ar krāsu viņam jānopērk veikalā?</b><br><i>Ņem vērā, ka veikalā pārdod tikai pilnus ${t.vessel}!</i><br>
        Jānopērk {{2}} ${t.vessel}.</p>`,
        [{ kind: 'int', answer: m.w }, { kind: 'frac', proper: true, answer: { n: m.n, d: m.d } }, { kind: 'int', answer: m.w + 1 }],
        [`${n} · ${F(a, b)} = ${F(total, b)} = ${M(m.w, m.n, m.d)}.`, `Tātad ${m.w} veseli un ${F(m.n, m.d)} no ${t.vesselGen}.`,
          `Daļu ${t.vesselGen} nopirkt nevar, tāpēc jāpērk ${m.w + 1}.`]);
    }
  }

  // 14. teksta uzdevums par maizes kukulīšiem (boss)
  function genBread() {
    for (;;) {
      const b = rnd(3, 9), n = rnd(5, 9), a = rnd(2, b - 1);
      const total = a * n;
      if (total <= b || total % b === 0) continue;
      const need = toMixed(total, b);
      const enough = Math.random() < 0.5;
      const have = enough ? need.w + 1 : need.w;
      if (have < 1) continue;
      const diff = enough ? reduce((need.w + 1) * b - total, b) : reduce(need.n, need.d);
      return Q(`Adeles vecmāmiņa gatavojas cept maizes kukulīšus, katram kukulītim ir nepieciešams ${F(a, b)} kg rudzu miltu.
        Adele no veikala atnesa <b>${have}</b> kilogramus miltu. Vai vecmāmiņai pietiks ar Adeles atnestajiem miltiem, ja viņa nolēmusi cept <b>${n}</b> vienādus kukulīšus?
        <p><b>1. Cik kg miltu nepieciešams ${n} kukulīšiem?</b><br>{{0}} kg</p>
        <p><b>2. Kāda daļa no kilograma</b> {{1}} ?<br>{{2}} kg</p>`,
        [{ kind: 'mixed', answer: { n: total, d: b } },
          { kind: 'select', options: ['paliks pāri', 'pietrūks'], answer: enough ? 0 : 1 },
          { kind: 'frac', proper: true, answer: diff }],
        [`${n} · ${F(a, b)} = ${F(total, b)} = ${M(need.w, need.n, need.d)} kg vajag.`,
          `Atnesa ${have} kg, tāpēc miltu ${enough ? 'paliks pāri' : 'pietrūks'}.`,
          enough ? `${have} − ${M(need.w, need.n, need.d)} = ${F(diff.n, diff.d)} kg.` : `${M(need.w, need.n, need.d)} − ${have} = ${F(diff.n, diff.d)} kg.`]);
    }
  }

  // ---------- līmeņi ----------
  const LESSONS = {
    1: `Daļu <b>dala</b> ar veselu skaitli divējādi:<ul>
      <li>ja skaitītājs dalās ar skaitli — dala <b>skaitītāju</b>: ${F(9, 11)} : 9 = ${F(1, 11)}</li>
      <li>citādi <b>saucēju reizina</b> ar skaitli: ${F(3, 4)} : 2 = ${F(3, 8)}</li></ul>`,
    2: `Daļu reizinot ar veselu skaitli, reizina <b>skaitītāju</b>, saucējs paliek: ${F(2, 5)} · 3 = ${F(6, 5)}.<br>
      Ja skaitlis un saucējs dalās ar vienu un to pašu, <b>saīsini</b>: ${F(7, 8)} · 2 = ${F(7, 4)}.`,
    3: `Ja vesels skaitlis dalās ar saucēju, saīsini <b>pirms</b> reizināšanas:<br>
      ${F(4, 5)} · 35 = 4 · 7 = 28 (jo 35 : 5 = 7).`,
    4: `Tas pats triks ar lielākiem skaitļiem: 140 · ${F(9, 10)}: 140 : 10 = 14, tad 14 · 9 = 126.`,
    5: `Ja reizinājums iznāk neīsta daļa, <b>izslēdz veselos</b>: ${F(5, 8)} · 3 = ${F(15, 8)} = ${M(1, 7, 8)}.`,
    6: `Jaukto skaitli vispirms <b>pārveido par neīstu daļu</b>: ${M(2, 1, 3)} = ${F(7, 3)} (2·3 + 1 = 7).<br>
      Tad reizina un izslēdz veselos: ${M(2, 1, 3)} · 2 = ${F(14, 3)} = ${M(4, 2, 3)}.`,
    7: `Ja <b>veselā daļa dalās</b> ar skaitli, nav jāpārveido: dali veselo atsevišķi, daļu — atsevišķi.<br>
      ${M(12, 1, 3)} : 4 = 3 un ${F(1, 3)} : 4 = ${F(1, 12)}, tātad ${M(3, 1, 12)}.`,
    8: `Ja gan veselā daļa, gan skaitītājs dalās ar skaitli, dali abus atsevišķi:<br>
      ${M(24, 16, 17)} : 4 = ${M(6, 4, 17)} (24:4 = 6, 16:4 = 4).`,
    9: `Pārveido jaukto skaitli par neīstu daļu, tad dali ar veselu skaitli:<br>
      ${M(5, 3, 5)} : 7 = ${F(28, 5)} : 7 = ${F(4, 5)}.`,
    10: `Tagad pats izlem, kā ērtāk — dalīt atsevišķi vai pārveidot par neīstu daļu.<br>
      ${M(5, 5, 7)} : 8 = ${F(40, 7)} : 8 = ${F(5, 7)}.`,
    11: `„<b>n reizes mazāks</b>” nozīmē <b>dalīt</b> ar n. „n reizes lielāks” — reizināt.<br>
      3 reizes mazāks nekā ${M(1, 1, 2)}: ${M(1, 1, 2)} = ${F(3, 2)}, ${F(3, 2)} : 3 = ${F(1, 2)}.`,
    12: `Ja kaut ko <b>sadala vienādās daļās</b>, tad jādala. Pārliecinies, vai atbilde ir saīsināta daļa.`,
    13: `Cik kopā vajag? Reizini: ${F(5, 6)} · 5 = ${F(25, 6)} = ${M(4, 1, 6)}.<br>Veikalā pārdod tikai <b>veselus</b> traukus — noapaļo uz augšu.`,
    14: `Galvenais pārbaudījums! Izmanto visu: reizini daļu ar skaitli, izslēdz veselos un salīdzini ar to, kas ir.`,
  };

  const ZONES = [
    { id: 1, name: 'Daļu mežs', icon: '🌲', color: '#3fb950' },
    { id: 2, name: 'Jauktā pilsēta', icon: '🏙️', color: '#2f81f7' },
    { id: 3, name: 'Teksta uzdevumu pils', icon: '🏰', color: '#a371f7' },
  ];

  const LEVELS = [
    { id: 1, zone: 1, title: 'Daļas dalīšana ar veselu', icon: '🍕', gen: genDivFrac },
    { id: 2, zone: 1, title: 'Reizināšana, saīsināšana', icon: '✂️', gen: genMulFracCancel },
    { id: 3, zone: 1, title: 'Daļas reizināšana ar veselu skaitli. Rezultāts vesels skaitlis līdz 100', icon: '🍎', short: 'Reizināšana — vesels līdz 100', gen: () => genMulWhole(100, 10, false) },
    { id: 4, zone: 1, title: 'Daļas reizināšana ar veselu skaitli. Rezultāts vesels skaitlis līdz 200', icon: '🍊', short: 'Reizināšana — vesels līdz 200', gen: () => genMulWhole(200, 60, true) },
    { id: 5, zone: 1, title: 'Daļas reizināšana ar veselu skaitli. Rezultāts jaukts skaitlis', icon: '🧩', short: 'Reizināšana — jaukts rezultāts', gen: genMulToMixed },
    { id: 6, zone: 2, title: 'Jaukta skaitļa reizināšana ar veselu skaitli', icon: '🏠', short: 'Jaukts · vesels', gen: genMixedMul },
    { id: 7, zone: 2, title: 'Jaukta skaitļa dalīšana, kad veselo nav jāpārveido', icon: '🏢', short: 'Dalīšana bez pārveidošanas', gen: genMixedDivWhole },
    { id: 8, zone: 2, title: 'Jaukta skaitļa dalīšana ar veselu skaitli', icon: '🏬', short: 'Jaukts : vesels', gen: genMixedDivBoth },
    { id: 9, zone: 2, title: 'Jaukta skaitļa dalīšana ar veselu skaitli I', icon: '🏗️', short: 'Jaukts : vesels (I)', gen: genMixedDivGuided },
    { id: 10, zone: 2, title: 'Jaukta skaitļa dalīšana ar veselu skaitli II', icon: '🌉', short: 'Jaukts : vesels (II)', gen: genMixedDivII },
    { id: 11, zone: 2, title: 'Darbība ar jauktu skaitli', icon: '🎲', gen: genTimesSmaller },
    { id: 12, zone: 3, title: 'Teksta uzdevums par apsveikumiem', icon: '💌', gen: genCards },
    { id: 13, zone: 3, title: 'Teksta uzdevums par soliņiem', icon: '🎨', gen: genBenches, need: 4 },
    { id: 14, zone: 3, title: 'Teksta uzdevums par maizes kukulīšiem', icon: '🥖', gen: genBread, need: 3, boss: true },
  ].map((l) => Object.assign({ need: 5, lesson: LESSONS[l.id], short: l.short || l.title }, l));

  return { gcd, reduce, sameValue, toMixed, F, M, checkPart, checkQuestion, LEVELS, ZONES, MSG };
});
