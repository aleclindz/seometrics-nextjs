import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Placeholder routes - will be moved from Next.js API routes
router.get('/connections', authenticateToken, (req, res) => {
  res.json({ message: 'CMS connections endpoint - to be implemented' });
});

router.post('/connections', authenticateToken, (req, res) => {
  res.json({ message: 'Create CMS connection endpoint - to be implemented' });
});

router.get('/connections/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Get CMS connection endpoint - to be implemented' });
});

router.delete('/connections/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Delete CMS connection endpoint - to be implemented' });
});

router.get('/oauth/start', authenticateToken, (req, res) => {
  res.json({ message: 'CMS OAuth start endpoint - to be implemented' });
});

router.get('/oauth/callback/:type', (req, res) => {
  res.json({ message: 'CMS OAuth callback endpoint - to be implemented' });
});

router.post('/test-connection', authenticateToken, (req, res) => {
  res.json({ message: 'Test CMS connection endpoint - to be implemented' });
});

export default router;