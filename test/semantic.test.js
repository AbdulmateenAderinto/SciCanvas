// Antibodies know where their antigen-binding arms are: aiming and docking point them at a target.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('docking turns an antibody to face its target and puts the arm tips on the outline', () => {
  const target = A.Make.ellipse(400, 400, 100, 100);
  for (const [x, y] of [[100, 100], [700, 450], [450, 800], [120, 450]]) {
    const ab = A.Make.icon('im-igg', x, y, 60);
    G.aimAntibody(ab, target, true);
    const c = { x: ab.x + ab.w / 2, y: ab.y + ab.h / 2 }, t = Math.atan2(450 - c.y, 450 - c.x);
    const fab = ((ab.rot - 90) * Math.PI) / 180;                   // arms point up (−90°) at rotation 0
    assert.ok(Math.cos(fab - t) > 0.999, `arms face the target from ${x},${y}`);
    const tipDist = Math.hypot(450 - c.x, 450 - c.y) - 0.47 * 60;
    assert.ok(Math.abs(tipDist - 50) < 2, `arm tips on the outline (${tipDist.toFixed(1)})`);
  }
});

test('ring around a target: evenly spaced copies facing out from the surface or in to bind it', () => {
  const cell = A.Make.ellipse(400, 400, 200, 200), ab = A.Make.icon('im-igg', 0, 0, 50);
  for (const facing of ['out', 'in']) {
    const ring = G.ringAround(ab, cell, { n: 6, facing });
    assert.equal(ring.length, 6);
    assert.equal(new Set(ring.map((o) => o.id)).size, 6, 'each copy has its own id');
    for (const o of ring) {
      const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, out = Math.atan2(c.y - 500, c.x - 500), fab = ((o.rot - 90) * Math.PI) / 180;
      assert.ok(Math.cos(fab - out) * (facing === 'out' ? 1 : -1) > 0.999, `${facing}: arms point ${facing === 'out' ? 'away from' : 'at'} the cell`);
      assert.ok(Math.abs(Math.hypot(c.x - 500, c.y - 500) - (100 + 0.47 * 50)) < 1, 'sits on the outline');
    }
  }
});
