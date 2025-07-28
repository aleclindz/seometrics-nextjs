import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Placeholder routes - will be moved from Next.js API routes
router.get('/connection', authenticateToken, (req, res) => {
  res.json({ message: 'GSC connection status endpoint - to be implemented' });
});

router.get('/oauth/start', authenticateToken, (req, res) => {
  res.json({ message: 'GSC OAuth start endpoint - to be implemented' });
});

router.get('/oauth/callback', (req, res) => {
  res.json({ message: 'GSC OAuth callback endpoint - to be implemented' });
});

router.post('/oauth/refresh', authenticateToken, (req, res) => {
  res.json({ message: 'GSC OAuth refresh endpoint - to be implemented' });
});

router.get('/properties', authenticateToken, (req, res) => {
  res.json({ message: 'GSC properties endpoint - to be implemented' });
});

router.post('/sync', authenticateToken, (req, res) => {
  res.json({ message: 'GSC sync endpoint - to be implemented' });
});

router.get('/performance', authenticateToken, (req, res) => {
  res.json({ message: 'GSC performance data endpoint - to be implemented' });
});

export default router;