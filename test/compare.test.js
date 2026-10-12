// Version comparison: what was added, removed and changed between a saved version and now.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('diffPage reports added, removed, moved, resized, text and style changes', () => {
  const keep = A.Make.rect(10, 10, 50, 50), move = A.Make.rect(100, 10, 50, 50), gone = A.Make.ellipse(200, 10, 40, 40), word = A.Make.text('Old label', 10, 100);
  const old = { width: 400, height: 300, objects: [keep, move, gone, word] };
  const now = JSON.parse(JSON.stringify(old));
  now.objects = now.objects.filter((o) => o.id !== gone.id);
  now.objects[1].x += 30; now.objects[1].w += 20;
  now.objects[2].text = 'New label';
  now.objects[0].fill = '#ff0000';
  const added = A.Make.text('Brand new', 10, 200); now.objects.push(added);
  const d = G.diffPage(old, now);
  assert.equal(JSON.stringify(d.added.map((o) => o.id)), JSON.stringify([added.id]));
  assert.equal(JSON.stringify(d.removed.map((o) => o.id)), JSON.stringify([gone.id]));
  const by = Object.fromEntries(d.changed.map((c) => [c.o.id, c.what.join(',')]));
  assert.equal(by[move.id], 'moved,resized');
  assert.equal(by[word.id], 'text changed');
  assert.equal(by[keep.id], 'restyled');
});
