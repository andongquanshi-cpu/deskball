const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('orb', {
  load: () => ipcRenderer.invoke('load'),
  confirmDelete: id => ipcRenderer.invoke('confirm-delete', id),
  save: tasks => ipcRenderer.invoke('save', tasks),
  expand: value => ipcRenderer.send('expand', value),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  hide: () => ipcRenderer.send('hide'),
  quit: () => ipcRenderer.send('quit')
});
