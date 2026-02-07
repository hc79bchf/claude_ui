import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const router = Router();

// In Docker, we mount the host's home to /host-home
// This environment variable tells us the mount point
const HOST_HOME_MOUNT = process.env.HOST_HOME_PATH || null;

// Try to detect the actual host home path from the mount
// The .claude directory contains paths that reveal the host home
function getActualHostHome(): string {
  if (!HOST_HOME_MOUNT) return os.homedir();

  // Try to read a file that might contain the host path
  try {
    const claudeDir = path.join(HOST_HOME_MOUNT, '.claude', 'projects');
    if (fs.existsSync(claudeDir)) {
      const entries = fs.readdirSync(claudeDir);
      for (const entry of entries) {
        // Project dir names are like "-Users-username-project"
        if (entry.startsWith('-Users-') || entry.startsWith('-home-')) {
          const parts = entry.split('-').filter(Boolean);
          if (parts.length >= 2) {
            return '/' + parts.slice(0, 2).join('/');
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return os.homedir();
}

const ACTUAL_HOST_HOME = getActualHostHome();

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Convert a container path to host path for display
function toHostPath(containerPath: string): string {
  if (HOST_HOME_MOUNT && containerPath.startsWith(HOST_HOME_MOUNT)) {
    return containerPath.replace(HOST_HOME_MOUNT, ACTUAL_HOST_HOME);
  }
  return containerPath;
}

// Convert a host path to container path for filesystem access
function toContainerPath(hostPath: string): string {
  if (HOST_HOME_MOUNT && hostPath.startsWith(ACTUAL_HOST_HOME)) {
    return hostPath.replace(ACTUAL_HOST_HOME, HOST_HOME_MOUNT);
  }
  return hostPath;
}

// GET /api/filesystem/list?path=/some/path
router.get('/list', async (req, res) => {
  try {
    let requestedPath = (req.query.path as string) || ACTUAL_HOST_HOME;

    // Expand ~ to home directory
    if (requestedPath.startsWith('~')) {
      requestedPath = requestedPath.replace('~', ACTUAL_HOST_HOME);
    }

    // Resolve to absolute path
    requestedPath = path.resolve(requestedPath);

    // Convert to container path for actual filesystem access
    const containerPath = toContainerPath(requestedPath);

    // Security: ensure path exists and is a directory
    if (!fs.existsSync(containerPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = fs.statSync(containerPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    // Read directory contents
    const entries = fs.readdirSync(containerPath, { withFileTypes: true });

    // Filter and map to directory entries (only show directories, hide hidden files)
    const directories: DirectoryEntry[] = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: toHostPath(path.join(containerPath, entry.name)),
        isDirectory: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory
    const parentContainerPath = path.dirname(containerPath);
    const hasParent = parentContainerPath !== containerPath;

    // Don't allow navigating above the mount point
    const canGoUp = hasParent && (!HOST_HOME_MOUNT || containerPath !== HOST_HOME_MOUNT);

    res.json({
      currentPath: toHostPath(containerPath),
      parentPath: canGoUp ? toHostPath(parentContainerPath) : null,
      entries: directories,
    });
  } catch (error) {
    console.error('Error listing directory:', error);
    res.status(500).json({ error: 'Failed to list directory' });
  }
});

// GET /api/filesystem/home - Get home directory path
router.get('/home', (_req, res) => {
  res.json({ path: ACTUAL_HOST_HOME });
});

export default router;
