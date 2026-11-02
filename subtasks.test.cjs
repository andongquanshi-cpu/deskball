const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validate, save, load } = require('./store.cjs');
const child = (id, done = false) => ({ id, text: id, done });
const parent = children => ({ id: 'parent', text: '面试', done: false, children });

test('legacy tasks retain their identity and completion', () => {
  const legacy = [child('old', true)];
  assert.deepEqual(validate(legacy), legacy);
});
test('parent completes only when every child is done', () => {
  assert.equal(validate([parent([child('a', true), child('b')])])[0].done, false);
  const complete = validate([parent([child('a', true), child('b', true)])])[0];
  assert.equal(complete.done, true);
  complete.children[0].done = false;
  assert.equal(validate([complete])[0].done, false);
});
test('adding an incomplete child reopens a completed parent', () => {
  const complete = validate([parent([child('a', true)])])[0];
  complete.children.push(child('b'));
  assert.equal(validate([complete])[0].done, false);
});
test('empty parents support manual completion', () => {
  assert.equal(validate([{ ...parent([]), done: true }])[0].done, true);
});
test('reject nested children, duplicate ids and invalid child data', () => {
  assert.throws(() => validate([parent([{ ...child('a'), children: [] }])]));
  assert.throws(() => validate([parent([child('parent')])]));
  assert.throws(() => validate([parent([child('a'), child('a')])]));
  assert.throws(() => validate([parent([{ ...child('a'), text: ' ' }])]));
  assert.throws(() => validate([parent(Array.from({ length: 201 }, (_, i) => child(String(i))))]));
});
test('children and derived completion survive disk reload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-subtasks-'));
  try {
    const file = path.join(dir, 'tasks.json');
    const saved = save(file, [parent([child('a', true)])]);
    assert.deepEqual(load(file), saved);
    assert.equal(load(file)[0].done, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
