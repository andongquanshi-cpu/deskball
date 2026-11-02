const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, dialog } = require('electron');
const path = require('node:path');
const store = require('./store.cjs');
let win, tray, file, tasks = [], readFailed = false, expanded = false, drag;
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    file = path.join(app.getPath('userData'), 'tasks.json');
    try { tasks = store.load(file); } catch (e) { readFailed = true; dialog.showErrorBox('待办文件读取失败', `为保护原有数据，本次禁止覆盖保存。请备份并检查：\n${file}\n${e.message}`); }
    const area = screen.getPrimaryDisplay().workArea;
    win = new BrowserWindow({ width: 80, height: 80, x: area.x + area.width - 110, y: area.y + 130, frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.loadFile('index.html');
    if (process.argv.includes('--smoke-test')) {
      const timer = setTimeout(() => { console.error('SMOKE_TIMEOUT'); app.exit(1); }, 15000);
      win.webContents.once('did-finish-load', async () => {
        try {
          const ok = await win.webContents.executeJavaScript("Boolean(window.orb && document.querySelector('#ball') && document.querySelector('#panel'))");
          if (!ok) throw new Error('UI or preload missing');
          console.log('SMOKE_OK: desktop window, renderer and preload loaded');
          clearTimeout(timer); app.exit(0);
        } catch (e) { console.error(e); clearTimeout(timer); app.exit(1); }
      });
    }
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    // A generated native tray icon needs no external image assets.
    const pixels = Buffer.alloc(24 * 24 * 4);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const i = (y * 24 + x) * 4;
      if ((x - 11.5) ** 2 + (y - 11.5) ** 2 < 115) { pixels[i] = 220; pixels[i + 1] = 190; pixels[i + 2] = 105; pixels[i + 3] = 255; }
    }
    tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 24, height: 24 }));
    tray.setToolTip('轻待办 · w老大的桌面清单');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '显示悬浮球', click: () => { win.show(); win.focus(); } },
      { label: '隐藏悬浮球', click: () => win.hide() },
      { label: '打开数据目录', click: () => shell.openPath(app.getPath('userData')) },
      { type: 'separator' }, { label: '退出', click: () => app.quit() }
    ]));
    tray.on('click', () => { win.show(); win.focus(); });
  });
}
function fit(x, y, width, height) {
  const a = screen.getDisplayNearestPoint({ x, y }).workArea;
  return { x: Math.max(a.x, Math.min(x, a.x + a.width - width)), y: Math.max(a.y, Math.min(y, a.y + a.height - height)), width, height };
}
ipcMain.handle('confirm-delete', async (_, id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return false;
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['取消', '删除整组'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    message: `删除“${task.text}”及其 ${task.children?.length || 0} 个子任务？`,
    detail: '此操作无法撤销。'
  });
  return result.response === 1;
});
ipcMain.handle('load', () => ({ tasks, readFailed }));
ipcMain.handle('save', (_, next) => {
  if (readFailed) throw new Error('原数据读取失败，已阻止覆盖');
  tasks = store.save(file, next);
  return tasks;
});
ipcMain.on('expand', (_, value) => {
  expanded = Boolean(value);
  const b = win.getBounds();
  const width = expanded ? 380 : 80, height = expanded ? 560 : 80;
  win.setBounds(fit(b.x + b.width - width, b.y, width, height));
});
ipcMain.on('drag-start', () => { drag = { cursor: screen.getCursorScreenPoint(), bounds: win.getBounds() }; });
ipcMain.on('drag-move', () => {
  if (!drag) return;
  const p = screen.getCursorScreenPoint(), b = drag.bounds;
  win.setBounds(fit(b.x + p.x - drag.cursor.x, b.y + p.y - drag.cursor.y, b.width, b.height));
});
ipcMain.on('drag-end', () => { drag = null; });
ipcMain.on('hide', () => win.hide());
ipcMain.on('quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
