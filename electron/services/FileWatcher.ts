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
