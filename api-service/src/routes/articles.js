import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Placeholder routes - will be moved from Next.js API routes
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Get articles endpoint - to be implemented' });
});

router.post('/generate', authenticateToken, (req, res) => {
  res.json({ message: 'Generate article endpoint - to be implemented' });
});

router.post('/publish', authenticateToken, (req, res) => {
  res.json({ message: 'Publish article endpoint - to be implemented' });
});

router.get('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Get article by ID endpoint - to be implemented' });
});

router.put('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Update article endpoint - to be implemented' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Delete article endpoint - to be implemented' });
});

export default router;