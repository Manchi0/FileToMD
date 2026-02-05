const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File selection
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),

  // Conversion control
  startConversion: (inputPaths, outputFolder) =>
    ipcRenderer.invoke('start-conversion', { inputPaths, outputFolder }),
  cancelConversion: () => ipcRenderer.invoke('cancel-conversion'),

  // Progress updates from main process
  onConversionProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('conversion-progress', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('conversion-progress', handler);
  },
});
