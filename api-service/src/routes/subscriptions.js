import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Placeholder routes - will be moved from Next.js API routes
router.get('/manage', authenticateToken, (req, res) => {
  res.json({ message: 'Manage subscription endpoint - to be implemented' });
});

router.post('/manage', authenticateToken, (req, res) => {
  res.json({ message: 'Update subscription endpoint - to be implemented' });
});

router.post('/create-checkout-session', authenticateToken, (req, res) => {
  res.json({ message: 'Create Stripe checkout session endpoint - to be implemented' });
});

router.post('/webhook', (req, res) => {
  res.json({ message: 'Stripe webhook endpoint - to be implemented' });
});

router.get('/usage', authenticateToken, (req, res) => {
  res.json({ message: 'Get usage stats endpoint - to be implemented' });
});

export default router;