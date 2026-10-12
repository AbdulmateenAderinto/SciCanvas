// Figure legends are checked against the panel letters on the page.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('legend letters are read from (A), (B, C), (D and E) and (F–H)', () => {
  assert.equal([...G.legendLetters('Figure 1. Design. (A) Mice. (B, C) Reads. (D and E) Calls. (F–H) Data. (i) not a panel')].join(''), 'ABCDEFGH');
});

test('the Check tab flags legend–figure mismatches and panel order', async () => {
  const letter = (t, x, y) => A.Make.text(t, x, y, { fontSize: 30, bold: true });
  const p = { width: 1000, height: 800, objects: [letter('A', 20, 20), letter('C', 520, 20), letter('B', 20, 420), A.Make.text('body text', 100, 100)], legend: 'Figure 1. (A) One. (B) Two. (D) Four.' };
  A.state.doc = { version: 2, pages: [p], assets: {} };
  const r = await G.checkFigure(p), msgs = r.issues.filter((i) => i.kind === 'Legend').map((i) => i.msg);
  assert.ok(msgs.some((m) => m.includes('(D) but there is no panel D')));
  assert.ok(msgs.some((m) => m.includes('Panel C isn')));
  assert.ok(msgs.some((m) => m.includes('read A, C, B')), 'C sits before B in reading order');
});
