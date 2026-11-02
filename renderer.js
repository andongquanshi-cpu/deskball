const $ = s => document.querySelector(s);
let tasks = [], filter = 'all', saving = false, blocked = false;
function expand(value) { $('#ball').hidden = value; $('#panel').hidden = !value; window.orb.expand(value); }
const opened = new Set();
const drafts = new Map();
function button(label, action, className = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.className = className;
  el.disabled = saving || blocked;
  el.addEventListener('click', action);
  return el;
}
function changeParent(id, update) {
  return persist(tasks.map(t => t.id === id ? update(t) : t));
}
function taskRow(task, parent) {
  const row = document.createElement('div');
  row.className = 'task' + (task.done ? ' done' : '');
  const children = task.children || [];
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = task.done;
  check.disabled = saving || blocked || children.length > 0;
  check.title = children.length ? '由子任务完成状态自动决定' : '切换完成状态';
  check.setAttribute('aria-label', check.title + '：' + task.text);
  check.addEventListener('change', () => {
    if (parent) changeParent(parent.id, t => ({ ...t, children: t.children.map(c => c.id === task.id ? { ...c, done: check.checked } : c) }));
    else changeParent(task.id, t => ({ ...t, done: check.checked }));
  });
  if (!parent) {
    const toggle = button(opened.has(task.id) ? '⌄' : '›', () => {
      if (opened.has(task.id)) opened.delete(task.id); else opened.add(task.id);
      render();
    }, 'toggle');
    toggle.setAttribute('aria-label', '展开或收起：' + task.text);
    toggle.setAttribute('aria-expanded', String(opened.has(task.id)));
    row.append(toggle);
  }
  const text = document.createElement('span');
  text.textContent = task.text;
  row.append(check, text);
  if (children.length) {
    const progress = document.createElement('small');
    progress.className = 'progress';
    progress.textContent = `${children.filter(c => c.done).length}/${children.length}`;
    row.append(progress);
  }
  if (!parent) {
    const add = button('＋', () => {
      opened.add(task.id);
      render();
      document.getElementById('child-' + task.id)?.focus();
    }, 'add-child');
    add.title = '添加子任务';
    add.setAttribute('aria-label', '添加子任务：' + task.text);
    row.append(add);
  }
  const del = button('×', async () => {
    if (parent) {
      await changeParent(parent.id, t => {
        const remaining = t.children.filter(c => c.id !== task.id);
        return { ...t, children: remaining, done: remaining.length ? t.done : false };
      });
    } else {
      if (children.length && !await window.orb.confirmDelete(task.id)) return;
      await persist(tasks.filter(t => t.id !== task.id));
    }
  }, 'delete');
  del.setAttribute('aria-label', '删除：' + task.text);
  row.append(del);
  return row;
}
function childEditor(task) {
  const form = document.createElement('form');
  form.className = 'child-form';
  const input = document.createElement('input');
  input.id = 'child-' + task.id;
  input.maxLength = 300;
  input.placeholder = '添加一个小步骤';
  input.setAttribute('aria-label', '为' + task.text + '添加子任务');
  input.value = drafts.get(task.id) || '';
  input.addEventListener('input', () => drafts.set(task.id, input.value));
  const add = button('＋', () => {});
  add.type = 'submit';
  add.setAttribute('aria-label', '保存子任务');
  form.append(input, add);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const ok = await changeParent(task.id, t => ({ ...t, children: [...(t.children || []), { id: crypto.randomUUID(), text, done: false }] }));
    if (ok) {
      drafts.delete(task.id);
      render();
      document.getElementById(input.id)?.focus();
    }
  });
  return form;
}
function render() {
  const count = tasks.filter(t => !t.done).length;
  $('#badge').textContent = count > 99 ? '99+' : count;
  $('#remaining').textContent = count;
  $('#encourage').textContent = count ? '不必一次完成全部，先向前一步。' : '把脑海里的事，先放在这里。';
  const list = $('#list'); list.replaceChildren();
  const visible = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  if (!visible.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = filter === 'done' ? '完成的每一步，都会留在这里。' : '这里很清爽。\n给自己安排一件小事吧。'; list.append(p); }
  for (const task of visible) {
    const group = document.createElement('section');
    group.className = 'task-group';
    group.append(taskRow(task));
    if (opened.has(task.id)) {
      const children = document.createElement('div');
      children.className = 'children';
      for (const child of task.children || []) children.append(taskRow(child, task));
      children.append(childEditor(task));
      group.append(children);
    }
    list.append(group);
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
