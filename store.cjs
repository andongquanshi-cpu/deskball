const fs = require('node:fs');
const path = require('node:path');
function validate(tasks) {
  if (!Array.isArray(tasks) || tasks.length > 2000) throw new Error('待办数量超出限制');
  const ids = new Set();
  return tasks.map(t => {
    if (!t || typeof t.id !== 'string' || ids.has(t.id) || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 300 || typeof t.done !== 'boolean') throw new Error('待办数据格式不正确');
    ids.add(t.id);
    return { id: t.id, text: t.text.trim(), done: t.done };
  });
}
function save(file, tasks) {
  const clean = validate(tasks);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(clean, null, 2), 'utf8');
  fs.renameSync(file + '.tmp', file);
  return clean;
}
function load(file) {
  try { return validate(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
module.exports = { validate, save, load };
