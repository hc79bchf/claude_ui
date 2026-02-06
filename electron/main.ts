import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { FileWatcher } from './services/FileWatcher';
import { SessionParser } from './services/SessionParser';

let mainWindow: BrowserWindow | null = null;
const fileWatcher = new FileWatcher();
const sessionParser = new SessionParser();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-sessions', async () => {
  const claudeDir = fileWatcher.getClaudeDir();
  const projectsDir = path.join(claudeDir, 'projects');

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const files = await glob(path.join(projectsDir, '**/*.jsonl'));
  const sessions = files
    .map(file => sessionParser.parseSessionFile(file))
    .filter(Boolean)
    .sort((a, b) => new Date(b!.lastActivityAt).getTime() - new Date(a!.lastActivityAt).getTime());

  return sessions;
});

ipcMain.handle('get-session', async (_event, sessionId: string) => {
  const claudeDir = fileWatcher.getClaudeDir();
  const projectsDir = path.join(claudeDir, 'projects');
  const files = await glob(path.join(projectsDir, '**/*.jsonl'));

  for (const file of files) {
    const session = sessionParser.parseSessionFile(file);
    if (session?.id === sessionId) {
      const messages = sessionParser.getSessionMessages(file);
      return { session, messages };
    }
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();
  fileWatcher.start();

  fileWatcher.on('session-changed', (filePath) => {
    const session = sessionParser.parseSessionFile(filePath);
    if (session && mainWindow) {
      mainWindow.webContents.send('session-update', session);
    }
  });
});

app.on('window-all-closed', () => {
  fileWatcher.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
