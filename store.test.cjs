const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validate, save, load } = require('./store.cjs');
test('add, complete, delete survive reload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-test-')), file = path.join(dir, 'tasks.json');
  try {
    assert.deepEqual(load(file), []);
    save(file, [{ id: '1', text: ' 阅读 ', done: false }]);
    assert.equal(load(file)[0].text, '阅读');
    save(file, [{ ...load(file)[0], done: true }]); assert.equal(load(file)[0].done, true);
    save(file, []); assert.deepEqual(load(file), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('reject invalid content and duplicate ids', () => {
  assert.throws(() => validate([{ id: '1', text: '', done: false }]));
  assert.throws(() => validate([{ id: '1', text: 'a', done: 'false' }]));
  assert.throws(() => validate(Array(2).fill({ id: '1', text: 'a', done: false })));
});
test('corrupt file is not silently overwritten on load', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-test-')), file = path.join(dir, 'tasks.json');
  try { fs.writeFileSync(file, 'broken'); assert.throws(() => load(file)); assert.equal(fs.readFileSync(file, 'utf8'), 'broken'); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
