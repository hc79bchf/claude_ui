# Claude Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Electron desktop app for monitoring Claude Code sessions, costs, MCP tools, and skills with an integrated chat interface.

**Architecture:** Electron main process handles filesystem operations (watching ~/.claude/, spawning Claude CLI). React renderer provides the UI. IPC bridge connects them securely. Zustand manages state, TanStack Query handles async data.

**Tech Stack:** Electron 28+, React 18, TypeScript, TailwindCSS, Zustand, TanStack Query, chokidar, FlexSearch

---

## Phase 1: Project Foundation

### Task 1.1: Initialize Electron + React + TypeScript Project

**Files:**
- Create: `package.json` (update existing)
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `index.html`

**Step 1: Install dependencies**

Run:
```bash
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react electron electron-builder concurrently wait-on @types/react @types/react-dom
```
Expected: packages added to package.json

**Step 2: Create TypeScript config**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist-electron"
  },
  "include": ["electron/**/*", "vite.config.ts"]
}
```

**Step 3: Create Vite config**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 4: Create Electron main process**

Create `electron/main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

**Step 5: Create preload script**

Create `electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Sessions
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSession: (id: string) => ipcRenderer.invoke('get-session', id),

  // File watching
  onSessionUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('session-update', (_event, data) => callback(data));
  },

  // Chat
  startChat: (projectPath: string) => ipcRenderer.invoke('start-chat', projectPath),
  sendMessage: (message: string) => ipcRenderer.invoke('send-message', message),
  onChatResponse: (callback: (data: unknown) => void) => {
    ipcRenderer.on('chat-response', (_event, data) => callback(data));
  },

  // MCP & Skills
  getMcpServers: () => ipcRenderer.invoke('get-mcp-servers'),
  toggleMcpServer: (id: string, enabled: boolean) => ipcRenderer.invoke('toggle-mcp-server', id, enabled),
  getSkills: () => ipcRenderer.invoke('get-skills'),

  // Stats
  getStats: (period: string) => ipcRenderer.invoke('get-stats', period),
});
```

**Step 6: Create React entry point**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:
```typescript
export default function App() {
  return (
    <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
      <h1 className="text-2xl font-bold">Claude Dashboard</h1>
    </div>
  );
}
```

**Step 7: Update package.json scripts**

Update `package.json`:
```json
{
  "name": "claude-dashboard",
  "version": "0.1.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && NODE_ENV=development electron .",
    "build": "tsc -p tsconfig.node.json && vite build",
    "build:electron": "npm run build && electron-builder",
    "preview": "vite preview"
  }
}
```

**Step 8: Verify setup runs**

Run: `npm run build && npm run dev:vite`
Expected: Vite server starts at localhost:5173

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Electron + React + TypeScript project"
```

---

### Task 1.2: Add TailwindCSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/index.css`

**Step 1: Install Tailwind**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure Tailwind**

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 3: Create CSS entry**

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900 text-gray-100;
}
```

**Step 4: Verify Tailwind works**

Update `src/App.tsx` temporarily:
```typescript
export default function App() {
  return (
    <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-blue-600 px-4 py-2 rounded-lg">
        Claude Dashboard
      </div>
    </div>
  );
}
```

Run: `npm run dev:vite`
Expected: Blue button visible at localhost:5173

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TailwindCSS configuration"
```

---

### Task 1.3: Create Core Types

**Files:**
- Create: `src/types/index.ts`
- Create: `src/types/session.ts`
- Create: `src/types/mcp.ts`
- Create: `src/types/skill.ts`

**Step 1: Create types directory and main export**

Create `src/types/session.ts`:
```typescript
export interface Session {
  id: string;
  slug: string;
  projectPath: string;
  gitBranch: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  tokenUsage: TokenUsage;
  estimatedCost: number;
  toolsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
  status: 'active' | 'idle' | 'archived';
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface Message {
  id: string;
  sessionId: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: Date;
  model?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
}

export interface SessionMeta {
  id: string;
  slug: string;
  projectPath: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
}
```

Create `src/types/mcp.ts`:
```typescript
export interface McpServer {
  id: string;
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  source: string;
  tools: string[];
  description?: string;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
  disabledMcpServers?: string[];
}

export interface McpServerConfig {
  type?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  description?: string;
}
```

Create `src/types/skill.ts`:
```typescript
export interface Skill {
  id: string;
  name: string;
  plugin: string;
  path: string;
  description: string;
  triggers: string[];
  usageCount: number;
  lastUsedAt: Date | null;
}

export interface SkillUsage {
  skillId: string;
  sessionId: string;
  timestamp: Date;
}
```

Create `src/types/index.ts`:
```typescript
export * from './session';
export * from './mcp';
export * from './skill';

export interface UsageStats {
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byProject: Array<{ path: string; cost: number; sessions: number }>;
  byDay: Array<{ date: string; tokens: number; cost: number; sessions: number }>;
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add core TypeScript types"
```

---

### Task 1.4: Create Basic Layout Components

**Files:**
- Create: `src/components/layout/Layout.tsx`
- Create: `src/components/layout/NavRail.tsx`
- Create: `src/components/layout/TitleBar.tsx`
- Update: `src/App.tsx`

**Step 1: Create TitleBar**

Create `src/components/layout/TitleBar.tsx`:
```typescript
export function TitleBar() {
  return (
    <div className="h-10 bg-gray-800 flex items-center px-4 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="w-20" /> {/* Space for traffic lights on macOS */}
      <span className="text-sm font-medium text-gray-300">Claude Dashboard</span>
      <div className="flex-1" />
      <button
        className="text-gray-400 hover:text-white px-2 py-1 rounded text-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        Settings
      </button>
    </div>
  );
}
```

**Step 2: Create NavRail**

Create `src/components/layout/NavRail.tsx`:
```typescript
import { useState } from 'react';

type View = 'chat' | 'sessions' | 'tools' | 'skills' | 'stats';

interface NavRailProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const navItems: { id: View; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'sessions', icon: '📁', label: 'Sessions' },
  { id: 'tools', icon: '🔧', label: 'Tools' },
  { id: 'skills', icon: '⚡', label: 'Skills' },
  { id: 'stats', icon: '📊', label: 'Stats' },
];

export function NavRail({ activeView, onViewChange }: NavRailProps) {
  return (
    <nav className="w-14 bg-gray-800 flex flex-col items-center py-2 gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
            activeView === item.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}

export type { View };
```

**Step 3: Create Layout**

Create `src/components/layout/Layout.tsx`:
```typescript
import { useState, ReactNode } from 'react';
import { TitleBar } from './TitleBar';
import { NavRail, View } from './NavRail';

interface LayoutProps {
  children: (view: View) => ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeView, setActiveView] = useState<View>('sessions');

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <NavRail activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-auto">
          {children(activeView)}
        </main>
      </div>
    </div>
  );
}
```

**Step 4: Update App**

Update `src/App.tsx`:
```typescript
import { Layout } from './components/layout/Layout';
import { View } from './components/layout/NavRail';

function MainContent({ view }: { view: View }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <p className="text-lg">
        {view.charAt(0).toUpperCase() + view.slice(1)} View
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      {(view) => <MainContent view={view} />}
    </Layout>
  );
}
```

**Step 5: Verify layout works**

Run: `npm run dev:vite`
Expected: See title bar, nav rail with 5 icons, clicking changes view text

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add basic layout with TitleBar and NavRail"
```

---

## Phase 2: Session Parsing & Display

### Task 2.1: Create Session Parser Service (Electron Main)

**Files:**
- Create: `electron/services/SessionParser.ts`
- Create: `electron/services/types.ts`

**Step 1: Create shared types for electron services**

Create `electron/services/types.ts`:
```typescript
export interface RawSessionMessage {
  type: 'user' | 'assistant' | 'progress';
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  cwd: string;
  version: string;
  gitBranch: string;
  slug: string;
  message?: {
    role: 'user' | 'assistant';
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
      text?: string;
      thinking?: string;
      name?: string;
      input?: object;
    }>;
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

export interface ParsedSession {
  id: string;
  slug: string;
  projectPath: string;
  gitBranch: string;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  toolsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
  model: string;
}
```

**Step 2: Create SessionParser**

Create `electron/services/SessionParser.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { RawSessionMessage, ParsedSession } from './types';

export class SessionParser {
  parseSessionFile(filePath: string): ParsedSession | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length === 0) return null;

      const messages: RawSessionMessage[] = lines.map(line => JSON.parse(line));

      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];

      // Aggregate stats
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheRead = 0;
      let cacheCreation = 0;
      const toolsUsed: Record<string, number> = {};
      const skillsUsed: Record<string, number> = {};
      let model = 'unknown';
      let messageCount = 0;

      for (const msg of messages) {
        if (msg.message?.usage) {
          inputTokens += msg.message.usage.input_tokens || 0;
          outputTokens += msg.message.usage.output_tokens || 0;
          cacheRead += msg.message.usage.cache_read_input_tokens || 0;
          cacheCreation += msg.message.usage.cache_creation_input_tokens || 0;
        }

        if (msg.message?.model) {
          model = msg.message.model;
        }

        if (msg.message?.role) {
          messageCount++;
        }

        // Track tool usage
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_use' && block.name) {
              toolsUsed[block.name] = (toolsUsed[block.name] || 0) + 1;

              // Track skill invocations
              if (block.name === 'Skill' && block.input) {
                const skillName = (block.input as { skill?: string }).skill;
                if (skillName) {
                  skillsUsed[skillName] = (skillsUsed[skillName] || 0) + 1;
                }
              }
            }
          }
        }
      }

      return {
        id: firstMsg.sessionId,
        slug: firstMsg.slug || path.basename(filePath, '.jsonl'),
        projectPath: firstMsg.cwd,
        gitBranch: firstMsg.gitBranch || 'unknown',
        startedAt: firstMsg.timestamp,
        lastActivityAt: lastMsg.timestamp,
        messageCount,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          cacheRead,
          cacheCreation,
        },
        toolsUsed,
        skillsUsed,
        model,
      };
    } catch (error) {
      console.error(`Error parsing session file ${filePath}:`, error);
      return null;
    }
  }

  getSessionMessages(filePath: string): RawSessionMessage[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add SessionParser service for reading .jsonl files"
```

---

### Task 2.2: Create File Watcher Service

**Files:**
- Create: `electron/services/FileWatcher.ts`
- Update: `electron/main.ts`

**Step 1: Install chokidar**

Run:
```bash
npm install chokidar
npm install -D @types/node
```

**Step 2: Create FileWatcher**

Create `electron/services/FileWatcher.ts`:
```typescript
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private claudeDir: string;

  constructor() {
    super();
    this.claudeDir = path.join(os.homedir(), '.claude');
  }

  start() {
    const projectsDir = path.join(this.claudeDir, 'projects');

    if (!fs.existsSync(projectsDir)) {
      console.log('Projects directory does not exist:', projectsDir);
      return;
    }

    this.watcher = chokidar.watch(path.join(projectsDir, '**/*.jsonl'), {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath) => {
      this.emit('session-added', filePath);
    });

    this.watcher.on('change', (filePath) => {
      this.emit('session-changed', filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      this.emit('session-removed', filePath);
    });

    console.log('FileWatcher started, watching:', projectsDir);
  }

  stop() {
    this.watcher?.close();
    this.watcher = null;
  }

  getClaudeDir(): string {
    return this.claudeDir;
  }
}
```

**Step 3: Update main.ts to use services**

Update `electron/main.ts`:
```typescript
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
```

**Step 4: Install glob**

Run:
```bash
npm install glob
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add FileWatcher service and IPC handlers for sessions"
```

---

### Task 2.3: Create Sessions View UI

**Files:**
- Create: `src/components/sessions/SessionsView.tsx`
- Create: `src/components/sessions/SessionCard.tsx`
- Create: `src/hooks/useSessions.ts`
- Create: `src/lib/electron.ts`
- Update: `src/App.tsx`

**Step 1: Install dependencies**

Run:
```bash
npm install @tanstack/react-query zustand
```

**Step 2: Create electron API types**

Create `src/lib/electron.ts`:
```typescript
import type { ParsedSession } from '../../electron/services/types';

declare global {
  interface Window {
    electronAPI: {
      getSessions: () => Promise<ParsedSession[]>;
      getSession: (id: string) => Promise<{ session: ParsedSession; messages: unknown[] } | null>;
      onSessionUpdate: (callback: (data: ParsedSession) => void) => void;
      getMcpServers: () => Promise<unknown[]>;
      toggleMcpServer: (id: string, enabled: boolean) => Promise<void>;
      getSkills: () => Promise<unknown[]>;
      getStats: (period: string) => Promise<unknown>;
      startChat: (projectPath: string) => Promise<void>;
      sendMessage: (message: string) => Promise<void>;
      onChatResponse: (callback: (data: unknown) => void) => void;
    };
  }
}

export const electronAPI = window.electronAPI;
```

**Step 3: Create useSessions hook**

Create `src/hooks/useSessions.ts`:
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { electronAPI } from '../lib/electron';

export function useSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: () => electronAPI.getSessions(),
  });

  useEffect(() => {
    electronAPI.onSessionUpdate((updatedSession) => {
      queryClient.setQueryData(['sessions'], (old: unknown[] | undefined) => {
        if (!old) return [updatedSession];
        const index = old.findIndex((s: any) => s.id === updatedSession.id);
        if (index >= 0) {
          const newSessions = [...old];
          newSessions[index] = updatedSession;
          return newSessions;
        }
        return [updatedSession, ...old];
      });
    });
  }, [queryClient]);

  return query;
}
```

**Step 4: Create SessionCard**

Create `src/components/sessions/SessionCard.tsx`:
```typescript
interface SessionCardProps {
  session: {
    id: string;
    slug: string;
    projectPath: string;
    gitBranch: string;
    lastActivityAt: string;
    messageCount: number;
    tokenUsage: {
      input: number;
      output: number;
    };
    toolsUsed: Record<string, number>;
  };
  onClick: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const topTools = Object.entries(session.toolsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const projectName = session.projectPath.split('/').pop() || session.projectPath;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{session.slug}</h3>
          <p className="text-sm text-gray-400 truncate">{projectName}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatRelativeTime(session.lastActivityAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>{session.messageCount} messages</span>
        <span>{formatTokens(session.tokenUsage.input + session.tokenUsage.output)} tokens</span>
        <span className="text-gray-600">{session.gitBranch}</span>
      </div>

      {topTools.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {topTools.map(([tool, count]) => (
            <span
              key={tool}
              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
            >
              {tool} ({count})
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
```

**Step 5: Create SessionsView**

Create `src/components/sessions/SessionsView.tsx`:
```typescript
import { useSessions } from '../../hooks/useSessions';
import { SessionCard } from './SessionCard';

export function SessionsView() {
  const { data: sessions, isLoading, error } = useSessions();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-400">Error loading sessions</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No sessions found</p>
          <p className="text-sm text-gray-500 mt-1">
            Start using Claude Code to see sessions here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Sessions</h1>
      <div className="grid gap-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => console.log('Open session:', session.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 6: Update App.tsx**

Update `src/App.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { View } from './components/layout/NavRail';
import { SessionsView } from './components/sessions/SessionsView';

const queryClient = new QueryClient();

function MainContent({ view }: { view: View }) {
  switch (view) {
    case 'sessions':
      return <SessionsView />;
    case 'chat':
      return <PlaceholderView name="Chat" />;
    case 'tools':
      return <PlaceholderView name="Tools" />;
    case 'skills':
      return <PlaceholderView name="Skills" />;
    case 'stats':
      return <PlaceholderView name="Stats" />;
    default:
      return <PlaceholderView name="Unknown" />;
  }
}

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <p className="text-lg">{name} View - Coming Soon</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        {(view) => <MainContent view={view} />}
      </Layout>
    </QueryClientProvider>
  );
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add SessionsView with session cards and real data"
```

---

## Phase 3-5: Remaining Implementation

The remaining phases follow the same pattern. Due to length, I'll summarize the key tasks:

### Phase 3: Chat Integration
- Task 3.1: Create ChatService in Electron (spawn Claude CLI)
- Task 3.2: Create ChatView component with message bubbles
- Task 3.3: Add streaming response rendering
- Task 3.4: Implement tool chip expand/collapse

### Phase 4: Tools & Skills
- Task 4.1: Create McpConfigService (read/write .mcp.json)
- Task 4.2: Create ToolsView with McpServerCard
- Task 4.3: Create SkillService (discover skills from plugins)
- Task 4.4: Create SkillsView with usage tracking
- Task 4.5: Add skill invocation functionality

### Phase 5: Stats & Polish
- Task 5.1: Create CostService with pricing calculation
- Task 5.2: Create StatsView with summary cards
- Task 5.3: Add usage charts (consider recharts library)
- Task 5.4: Implement CSV export
- Task 5.5: Add CommandPalette (⌘K)
- Task 5.6: Add keyboard shortcuts
- Task 5.7: Polish dark theme

---

## Testing Strategy

For each component:
1. Unit tests with Vitest for services
2. Component tests with React Testing Library
3. E2E tests with Playwright for critical flows

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## Build & Distribution

```bash
# Build for distribution
npm run build:electron

# Output in dist-electron/
```

Configure `electron-builder.yml` for macOS, Windows, Linux targets.
