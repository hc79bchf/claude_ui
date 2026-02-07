import { Router } from 'express';
import { glob } from 'glob';
import * as path from 'path';
import * as os from 'os';
import { SessionParser } from '../services/SessionParser.js';
import { CostService, TimePeriod } from '../services/CostService.js';

const router = Router();
const sessionParser = new SessionParser();
const costService = new CostService();

// GET /api/stats?period=week
router.get('/', async (req, res) => {
  try {
    const period = (req.query.period as TimePeriod) || 'week';

    // Validate period
    if (!['today', 'week', 'month', 'all'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use: today, week, month, or all' });
    }

    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    const sessions = sessionFiles
      .map(file => sessionParser.parseSessionFile(file))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const stats = costService.aggregateStats(sessions, period);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
