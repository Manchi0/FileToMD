const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Docling Converter',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    killPythonProcess();
  });
}

function getPythonPath() {
  if (isDev) {
    // In development, use system Python
    return 'python';
  } else {
    // In production, use bundled executable
    const resourcePath = process.resourcesPath;
    if (process.platform === 'win32') {
      return path.join(resourcePath, 'python', 'converter.exe');
    } else {
      return path.join(resourcePath, 'python', 'converter');
    }
  }
}

function getConverterScript() {
  if (isDev) {
    return path.join(__dirname, '../python/converter.py');
  }
  return null; // Not needed in production (using executable)
}

function killPythonProcess() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killPythonProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Supported Documents',
        extensions: ['pdf', 'docx', 'pptx', 'xlsx', 'html', 'htm', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp']
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return { canceled: true, files: [] };
  }

  return { canceled: false, files: result.filePaths };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return { canceled: true, folder: null };
  }

  return { canceled: false, folder: result.filePaths[0] };
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled) {
    return { canceled: true, folder: null };
  }

  return { canceled: false, folder: result.filePaths[0] };
});

ipcMain.handle('start-conversion', async (event, { inputPaths, outputFolder }) => {
  killPythonProcess(); // Kill any existing process

  return new Promise((resolve) => {
    const pythonPath = getPythonPath();
    const converterScript = getConverterScript();

    let args;
    if (isDev) {
      args = [converterScript, '--input', ...inputPaths, '--output', outputFolder];
    } else {
      args = ['--input', ...inputPaths, '--output', outputFolder];
    }

    try {
      if (isDev) {
        pythonProcess = spawn(pythonPath, args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else {
        pythonProcess = spawn(pythonPath, args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }

      let outputBuffer = '';

      pythonProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();

        // Process complete JSON lines
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const status = JSON.parse(line);
              mainWindow?.webContents.send('conversion-progress', status);
            } catch (e) {
              console.error('Failed to parse JSON:', line);
            }
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Python stderr:', data.toString());
        mainWindow?.webContents.send('conversion-progress', {
          status: 'error',
          message: data.toString(),
          error: data.toString()
        });
      });

      pythonProcess.on('close', (code) => {
        pythonProcess = null;
        resolve({ success: code === 0, exitCode: code });
      });

      pythonProcess.on('error', (err) => {
        pythonProcess = null;
        mainWindow?.webContents.send('conversion-progress', {
          status: 'error',
          message: `Failed to start converter: ${err.message}`,
          error: err.message
        });
        resolve({ success: false, error: err.message });
      });

    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('cancel-conversion', async () => {
  killPythonProcess();
  return { canceled: true };
});
