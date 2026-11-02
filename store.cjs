const fs = require('node:fs');
const path = require('node:path');
function validate(tasks) {
  if (!Array.isArray(tasks) || tasks.length > 2000) throw new Error('待办数量超出限制');
  const ids = new Set();
  function item(t) {
    if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 300 || typeof t.done !== 'boolean') throw new Error('待办数据格式不正确');
    ids.add(t.id);
    return { id: t.id, text: t.text.trim(), done: t.done };
  }
  return tasks.map(t => {
    const parent = item(t);
    if (t.children === undefined) return parent;
    if (!Array.isArray(t.children) || t.children.length > 200) throw new Error('每项最多支持 200 个子任务');
    const children = t.children.map(child => {
      if (child && child.children !== undefined) throw new Error('不支持三级任务');
      return item(child);
    });
    return { ...parent, done: children.length ? children.every(c => c.done) : parent.done, children };
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
