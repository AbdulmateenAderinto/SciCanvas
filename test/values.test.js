// Live values in text come from the data file, with formatting, and unresolvable ones are flagged.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

const TABLE = 'Library,Delivered,Passed\nWt 2,5000,2729\nWt 3,5000,1906\nWt 4,4558,911\nKO 1,5000,1492\nKO 2,5000,1163\nKO 3,5000,1239\nC1,4483,2903\nD3,3924,1062\nD5,4235,1602\nC3,2336,1050\nC4,3153,1558\nD1,3939,1412';

test('values in text are computed from the linked table', async () => {
  A.state.doc = { version: 2, pages: [{ width: 800, height: 400, objects: [] }], assets: {}, dataFiles: { 'reads.csv': { name: 'reads.csv', table: TABLE, sha1: 'a' } } };
  const r = (t) => G.resolveValues(t);
  assert.equal(r('QC-passing {=range(reads.csv:Passed)}'), 'QC-passing 911–2,903');
  assert.equal(r('delivered {=range(reads.csv:Delivered)}'), 'delivered 2,336–5,000');
  assert.equal(r('n = {=count(reads.csv:Passed)}'), 'n = 12');
  assert.equal(r('{=mean(reads.csv:Passed;1)}'), '1,585.6', 'mean matches the handoff note');
  assert.equal(r('{=median(reads.csv:Passed)}'), '1,452', 'median matches the handoff note');
  assert.equal(r('{=reads.csv:Library:3} had {=reads.csv:passed:3}'), 'Wt 4 had 911', 'single cells; column names ignore case');
  assert.equal(r('{=mean(reads.csv:Nope)}'), '⟨?⟩');
  const t = A.Make.text('QC-passing {=range(reads.csv:Passed)}', 10, 10), bad = A.Make.text('{=sum(missing.csv:X)}', 10, 60);
  A.state.doc.pages[0].objects.push(t, bad);
  assert.match(A.pageSvgString(A.state.doc.pages[0]), /911–2,903/, 'drawn with the value');
  const c = await G.checkFigure(A.state.doc.pages[0]);
  assert.ok(c.issues.some((i) => i.kind === 'Data' && i.id === bad.id && /can't be computed/.test(i.msg)));
  assert.ok(!c.issues.some((i) => i.kind === 'Data' && i.id === t.id));
});
