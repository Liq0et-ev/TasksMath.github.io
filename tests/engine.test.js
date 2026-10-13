// Palaist: node tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');

// Pareizā atbilde → ievades objekts, kādu ierakstītu students
function solve(part) {
  const a = part.answer;
  if (part.kind === 'int' || part.kind === 'select') return { v: String(a) };
  if (part.kind === 'rawfrac') return { n: String(a.n), d: String(a.d) };
  if (part.kind === 'mixed') { const m = E.toMixed(a.n, a.d); return { w: String(m.w), n: String(m.n), d: String(m.d) }; }
  if (part.kind === 'any') { // gan neīsta, gan jaukta forma jāpieņem
    const m = E.toMixed(a.n, a.d);
    return m.w > 0 && m.n > 0 ? { w: String(m.w), n: String(m.n), d: String(m.d) } : { n: String(a.n), d: String(a.d) };
  }
  return { n: String(a.n), d: String(a.d) };
}

let total = 0;
for (const lvl of E.LEVELS) {
  assert(lvl.lesson && lvl.title && lvl.gen, 'level ' + lvl.id + ' incomplete');
  for (let i = 0; i < 1500; i++) {
    const q = lvl.gen();
    total++;
    assert(q.parts.length > 0 && q.steps.length > 0, `L${lvl.id}: no parts/steps`);
    const slots = [...q.prompt.matchAll(/\{\{(\d+)\}\}/g)].map((m) => +m[1]);
    for (let p = 0; p < q.parts.length; p++) assert.strictEqual(slots.filter((x) => x === p).length, 1, `L${lvl.id}: slot ${p} must appear exactly once`);
    assert.strictEqual(slots.length, q.parts.length, `L${lvl.id}: unknown slot`);
    const inputs = q.parts.map(solve);
    const res = E.checkQuestion(q, inputs);
    assert(res.ok, `L${lvl.id}: own answer rejected: ${JSON.stringify(q.parts)} ${JSON.stringify(res)}`);
    assert(!/NaN|undefined|Infinity/.test(q.prompt + q.steps.join('')), `L${lvl.id}: bad text`);

    // brīvā-formas pārbaudes
    q.parts.forEach((part, p) => {
      const ok = inputs[p];
      if (part.kind === 'frac' || part.kind === 'any' || part.kind === 'mixed') {
        const n = +(ok.n), d = +(ok.d);
        // neSaīsināta forma jāatraida (ja iespējams pavairot)
        const un = { ...ok, n: String(n * 2), d: String(d * 2) };
        const r = E.checkPart(part, un);
        assert(!r.ok && r.code === 'notReduced', `L${lvl.id}: unreduced accepted ${JSON.stringify(un)} ${r.code}`);
        // nepareiza vērtība
        const wrong = { ...ok, n: String(n + 1) };
        const rw = E.checkPart(part, wrong);
        if (part.kind !== 'mixed' || true) assert(!rw.ok || E.sameValue({ n: +(wrong.w || 0) * d + n + 1, d }, part.answer), `L${lvl.id}: wrong accepted`);
      }
      if (part.kind === 'int') assert(!E.checkPart(part, { v: String(part.answer + 1) }).ok);
      assert.strictEqual(E.checkPart(part, {}).code, 'empty');
    });
  }
}
// Konkrēti gadījumi no skolnieces darba lapām
const mixedPart = { kind: 'mixed', answer: { n: 25, d: 8 } };   // 5/8 · 5 = 3 1/8
assert.strictEqual(E.checkPart(mixedPart, { w: '3', n: '1', d: '8' }).ok, true);
assert.strictEqual(E.checkPart(mixedPart, { n: '25', d: '8' }).code, 'wrongForm');
assert.strictEqual(E.checkPart(mixedPart, { w: '4', n: '25', d: '40' }).ok, false);
const frac = { kind: 'frac', answer: { n: 7, d: 4 }, wrong: [{ v: { n: 7, d: 16 }, msg: 'M' }] }; // 7/8 · 2
assert.strictEqual(E.checkPart(frac, { n: '7', d: '4' }).ok, true);
assert.strictEqual(E.checkPart(frac, { n: '14', d: '8' }).code, 'notReduced');
assert.strictEqual(E.checkPart(frac, { n: '7', d: '16' }).msg, 'M');
const sel = { kind: 'select', answer: 1 };
assert.strictEqual(E.checkPart(sel, { v: '1' }).ok, true);
assert.strictEqual(E.checkPart(sel, { v: '0' }).ok, false);
// ļaunprātīga ievade
assert.strictEqual(E.checkPart({ kind: 'int', answer: 5 }, { v: '5<script>' }).code, 'empty');
assert.strictEqual(E.checkPart(frac, { n: '1', d: '0' }).ok, false);
console.log(`OK — ${total} ģenerēti uzdevumi, ${E.LEVELS.length} līmeņi`);
