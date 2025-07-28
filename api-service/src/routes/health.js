import express from 'express';
import { testDatabaseConnection } from '../config/database.js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
      }
    };

    const statusCode = dbConnected ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check for monitoring
router.get('/detailed', async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    
    const detailed = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        human: formatUptime(process.uptime())
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      memory: process.memoryUsage(),
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          url: process.env.SUPABASE_URL ? 'configured' : 'missing'
        },
        authentication: {
          jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
        },
        integrations: {
          google: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
          stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
          openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
        }
      }
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(detailed);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database disconnected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Liveness probe
router.get('/alive', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router;