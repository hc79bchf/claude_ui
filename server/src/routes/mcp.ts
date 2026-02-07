import { Router } from 'express';
import { McpConfigService } from '../services/McpConfigService.js';

const router = Router();
const mcpService = new McpConfigService();

// GET /api/mcp-servers
router.get('/', async (req, res) => {
  try {
    const servers = await mcpService.getMcpServers();
    res.json(servers);
  } catch (error) {
    console.error('Error getting MCP servers:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// POST /api/mcp-servers/:id/toggle
router.post('/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    await mcpService.toggleMcpServer(req.params.id, enabled);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling MCP server:', error);
    res.status(500).json({ error: 'Failed to toggle MCP server' });
  }
});

export default router;
