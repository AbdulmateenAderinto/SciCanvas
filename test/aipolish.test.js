// AI drafts are reviewed before they are shown: antibodies face their target, safe layout fixes are applied.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('a messy draft comes back with antibodies aimed and layout fixed', async () => {
  const cell = A.Make.ellipse(400, 300, 160, 160);
  const ab = A.Make.icon('im-igg', 300, 320, 60, { rot: 90 });                        // arms pointing away (left of the cell, arms right… then flipped)
  ab.rot = 270;                                                                        // arms pointing left, away from the cell
  const panel = A.Make.rect(40, 40, 300, 200, { fill: '#f5f7f9', stroke: 'none' });
  const spill = A.Make.text('A label that runs well past its panel', 200, 80, { fontSize: 18 });
  const t1 = A.Make.text('Overlapping one', 60, 400, { fontSize: 18 }), t2 = A.Make.text('Overlapping two', 70, 405, { fontSize: 18 });
  const objs = [cell, ab, panel, spill, t1, t2];
  A.state.doc = { version: 2, pages: [{ width: 800, height: 600, objects: objs }], assets: {} };
  const r = await G.polishDraft(objs, 800, 600);
  assert.equal(r.aimed, 1);
  const c = { x: ab.x + ab.w / 2, y: ab.y + ab.h / 2 }, t = Math.atan2(380 - c.y, 480 - c.x), fab = ((ab.rot - 90) * Math.PI) / 180;
  assert.ok(Math.cos(fab - t) > 0.99, 'antibody now faces the cell');
  assert.ok(spill.x + spill.w <= panel.x + panel.w, 'label moved back inside its panel');
  const overlap = Math.min(t1.y + t1.h, t2.y + t2.h) - Math.max(t1.y, t2.y);
  assert.ok(overlap <= 0, 'overlapping labels separated');
  assert.ok(r.fixed >= 2);
});
