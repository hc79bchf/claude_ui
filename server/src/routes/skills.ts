import { Router } from 'express';
import { SkillService } from '../services/SkillService.js';

const router = Router();
const skillService = new SkillService();

// GET /api/skills
router.get('/', async (req, res) => {
  try {
    const skills = await skillService.getSkills();
    res.json(skills);
  } catch (error) {
    console.error('Error getting skills:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

export default router;
