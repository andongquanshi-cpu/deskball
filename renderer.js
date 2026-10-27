const $ = s => document.querySelector(s);
let tasks = [], filter = 'all', saving = false, blocked = false;
function expand(value) { $('#ball').hidden = value; $('#panel').hidden = !value; window.orb.expand(value); }
function render() {
  const count = tasks.filter(t => !t.done).length;
  $('#badge').textContent = count > 99 ? '99+' : count;
  $('#remaining').textContent = count;
  $('#encourage').textContent = count ? '不必一次完成全部，先向前一步。' : '把脑海里的事，先放在这里。';
  const list = $('#list'); list.replaceChildren();
  const visible = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  if (!visible.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = filter === 'done' ? '完成的每一步，都会留在这里。' : '这里很清爽。\n给自己安排一件小事吧。'; list.append(p); }
  for (const task of visible) {
    const row = document.createElement('div'); row.className = 'task' + (task.done ? ' done' : '');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.disabled = saving || blocked; check.setAttribute('aria-label', '切换完成状态：' + task.text);
    check.addEventListener('change', () => persist(tasks.map(t => t.id === task.id ? { ...t, done: check.checked } : t)));
    const text = document.createElement('span'); text.textContent = task.text;
    const del = document.createElement('button'); del.textContent = '×'; del.className = 'delete'; del.disabled = saving || blocked; del.setAttribute('aria-label', '删除：' + task.text);
    del.addEventListener('click', () => persist(tasks.filter(t => t.id !== task.id)));
    row.append(check, text, del); list.append(row);
  }
  $('#add-form button').disabled = saving || blocked;
}
async function persist(next) {
  if (saving || blocked) return false;
  saving = true; render();
  try { tasks = await window.orb.save(next); $('#error').textContent = ''; return true; }
  catch (e) { $('#error').textContent = '保存失败，操作未生效：' + e.message; return false; }
  finally { saving = false; render(); }
}
$('#add-form').addEventListener('submit', async e => {
  e.preventDefault(); const input = $('#task-input'), text = input.value.trim();
  if (text && await persist([{ id: crypto.randomUUID(), text, done: false }, ...tasks])) { input.value = ''; input.focus(); }
});
for (const b of document.querySelectorAll('[data-filter]')) b.addEventListener('click', () => {
  filter = b.dataset.filter;
  for (const item of document.querySelectorAll('[data-filter]')) item.classList.toggle('active', item === b);
  render();
});
$('#collapse').addEventListener('click', () => expand(false));
$('#hide').addEventListener('click', () => window.orb.hide());
$('#quit').addEventListener('click', () => window.orb.quit());
document.addEventListener('keydown', e => { if (e.key === 'Escape') expand(false); });
function draggable(el, click) {
  let start = null, moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || (e.target.closest('button') && el.id !== 'ball')) return;
    start = { x: e.screenX, y: e.screenY }; moved = false;
    el.setPointerCapture(e.pointerId); window.orb.dragStart();
  });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    if (Math.abs(e.screenX - start.x) + Math.abs(e.screenY - start.y) > 5) moved = true;
    if (moved) window.orb.dragMove();
  });
  el.addEventListener('pointerup', () => { if (!start) return; start = null; window.orb.dragEnd(); if (!moved && click) click(); });
  el.addEventListener('lostpointercapture', () => { start = null; window.orb.dragEnd(); });
}
draggable($('#ball'), () => expand(true)); draggable($('#handle'));
$('#ball').addEventListener('click', e => { if (e.detail === 0) expand(true); });
window.orb.load().then(data => { tasks = data.tasks; blocked = data.readFailed; if (blocked) { $('#error').textContent = '数据读取失败，已禁止覆盖保存。请检查托盘中的数据目录。'; expand(true); } render(); }).catch(e => { blocked = true; $('#error').textContent = e.message; expand(true); render(); });
