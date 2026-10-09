// The shared DNA helix (SoftKit.helix, src/softicons.js): base pairs are evenly spaced (8 per turn) and every bar
// starts and ends exactly on the two strands, so none run off the helix.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const K = A.globals.SoftKit;

// Each base pair is two half-bars: "M x yA V ymid" then "M x ymid V yB".
const bars = (svg) => [...svg.matchAll(/<path d="M([\d.-]+) ([\d.-]+) V([\d.-]+)"/g)].map((m) => ({ x: +m[1], y0: +m[2], y1: +m[3] }));

test('helix base pairs sit on the strands and are evenly spaced', () => {
  const x0 = 4, x1 = 96, yc = 30, amp = 10, turns = 1.5;
  const svg = K.helix(x0, x1, yc, amp, turns, { w: 5 });
  const halves = bars(svg);
  assert.ok(halves.length >= 16, `found ${halves.length} half-bars`);
  const xs = [];
  for (let i = 0; i < halves.length; i += 2) {
    const a = halves[i], b = halves[i + 1];
    assert.equal(a.x, b.x, 'both halves of a pair share one x');
    assert.equal(a.y1, b.y0, 'the halves meet in the middle');
    const t = (a.x - x0) / (x1 - x0), y = amp * Math.sin(t * turns * Math.PI * 2);
    assert.ok(Math.abs(a.y0 - (yc + y)) < 0.15, `top end on strand A at x=${a.x}`);
    assert.ok(Math.abs(b.y1 - (yc - y)) < 0.15, `bottom end on strand B at x=${a.x}`);
    assert.ok(Math.abs(a.y1 - yc) < 0.05, 'pairs meet on the helix axis');
    xs.push(a.x);
  }
  // Pairs are left out only where the strands cross; the rest keep one fixed spacing.
  const step = (x1 - x0) / Math.round(turns * 8), gaps = xs.slice(1).map((x, i) => (x - xs[i]) / step);
  for (const g of gaps) assert.ok(Math.abs(g - Math.round(g)) < 0.03 && g >= 0.97, `even spacing (gap ${g.toFixed(2)} steps)`);
});

test('every DNA icon that uses the helix draws cleanly', () => {
  const dna = A.ICONS.filter((ic) => !ic.refined && /DNA|helix/.test(ic.name));
  assert.ok(dna.length > 20);
  for (const ic of dna) assert.doesNotMatch(ic.draw(ic.color), /NaN|undefined|Infinity/, ic.name);
});
