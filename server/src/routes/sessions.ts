import { Router } from 'express';
import { glob } from 'glob';
import * as path from 'path';
import * as os from 'os';
import { SessionParser } from '../services/SessionParser.js';

const router = Router();
const sessionParser = new SessionParser();

// GET /api/sessions - List all sessions
router.get('/', async (req, res) => {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    const sessions = sessionFiles
      .map(file => sessionParser.parseSessionFile(file))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    res.json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:id - Get session details with messages
router.get('/:id', async (req, res) => {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    for (const file of sessionFiles) {
      const session = sessionParser.parseSessionFile(file);
      if (session && session.id === req.params.id) {
        const messages = sessionParser.getSessionMessages(file);
        return res.json({ session, messages });
      }
    }

    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

export default router;
