// Code plots: the example code is valid, and the plot runner returns SVG with editable text from a real Python
// (skipped where Python with matplotlib isn't installed).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const A = require('./load-app');

const T = A.globals.PLOT_TEMPLATES;
const python = (() => { for (const p of ['python3', 'python']) { try { execFileSync(p, ['-c', 'import matplotlib'], { stdio: 'ignore' }); return p; } catch { /* next */ } } return null; })();
const pythonAny = (() => { for (const p of ['python3', 'python']) { try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return p; } catch { /* next */ } } return null; })();

test('there are Python and R examples', () => {
  assert.ok(T.python.length >= 3 && T.r.length >= 3);
  for (const [name, code] of [...T.python, ...T.r]) assert.ok(name && code.trim().length > 20, name);
});

test('the Python examples are valid Python', { skip: !pythonAny && 'no Python' }, () => {
  for (const [, code] of T.python) execFileSync(pythonAny, ['-c', 'import sys, ast; ast.parse(sys.stdin.read())'], { input: code });
  assert.ok(true);
});

test('the runner draws a matplotlib plot as SVG with text kept as text', { skip: !python && 'no Python with matplotlib' }, async () => {
  const Module = require('module'), orig = Module._load, ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-plot-'));
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud, on() {} } } : orig.call(this, r, ...a); };
  const runner = require('../plotrunner.js');
  Module._load = orig;
  const csv = path.join(ud, 'd.csv'); fs.writeFileSync(csv, 'x,y\n1,2\n2,4\n3,6\n');
  try {
    const r = await runner.plot({ lang: 'python', interpreter: execFileSync(python, ['-c', 'import sys; print(sys.executable)']).toString().trim(), code: 'd = read("d.csv")\nfig, ax = plt.subplots()\nax.plot([1, 2, 3], [2, 4, 6], color=PALETTE[0])\nax.set_xlabel("Dose (µM)")\nprint("ok", WIDTH)', data: { 'd.csv': csv }, width: 3, height: 2, fontSize: 7, palette: ['#123456'] });
    assert.equal(r.error, null);
    assert.match(r.svg, /<svg/);
    assert.match(r.svg, /Dose \(µM\)/); // text, not glyph outlines
    assert.match(r.svg, /#123456/);   // the figure palette reached the plot
    assert.match(r.log, /ok 3/);
    const bad = await runner.plot({ lang: 'python', interpreter: r.interpreter, code: 'fig, ax = plt.subplots()\nax.plot(nope)', width: 3, height: 2 });
    assert.equal(bad.svg, null);
    assert.match(bad.error, /NameError/);
  } finally { runner.stopAll(); }
});

test('rich text keeps a space at the end of a styled run (xml:space="preserve")', () => {
  assert.match(A.globals.textSvg('Wt / {i|Maea}', { fontSize: 10 }), /<text xml:space="preserve"/);
});

test('the runner honours printed sizes, script minimum, shared code, fixed margins and data carried as base64', { skip: !python && 'no Python with matplotlib' }, async () => {
  const Module = require('module'), orig = Module._load, ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-plot-'));
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud, on() {} } } : orig.call(this, r, ...a); };
  delete require.cache[require.resolve('../plotrunner.js')];
  const runner = require('../plotrunner.js');
  Module._load = orig;
  const exe = execFileSync(python, ['-c', 'import sys; print(sys.executable)']).toString().trim();
  const sizes = (svg) => [...svg.matchAll(/font(?:-size)?:\s*([\d.]+)px/g)].map((m) => +m[1]);
  try {
    const r = await runner.plot({
      lang: 'python', interpreter: exe, width: 2.4, height: 1.8, fontSize: 7, tickSize: 6, minScriptPt: 6,
      prelude: 'def label(ax):\n    ax.set_ylabel(r"$Aicda^{-/-}$")', margins: { left: 12, right: 2, top: 2, bottom: 9 },
      data: { 'd.csv': { base64: Buffer.from('x,y\n1,10\n2,1000\n').toString('base64') } },
      code: 'd = read("d.csv")\nfig, ax = plt.subplots()\nax.plot(d["x"], d["y"])\nax.set_yscale("log")\nlabel(ax)\nprint(TICK_SIZE)',
    });
    assert.equal(r.error, null);
    assert.ok(Math.min(...sizes(r.svg)) >= 6 - 1e-6, `smallest text ${Math.min(...sizes(r.svg))}`); // superscripts too
    assert.deepEqual(Object.fromEntries(Object.entries(r.axes).filter(([k]) => k !== 'count').map(([k, v]) => [k, +v.toFixed(2)])), { left: 12, right: 2, top: 2, bottom: 9 });
    assert.match(r.log, /^6(\.0)?$/m);
    const bad = await runner.plot({ lang: 'python', interpreter: exe, prelude: 'x = 1/0', code: 'fig, ax = plt.subplots()', width: 2, height: 2 });
    assert.match(bad.error, /Shared plot code/);
  } finally { runner.stopAll(); }
});
