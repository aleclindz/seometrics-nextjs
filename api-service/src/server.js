import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import gscRoutes from './routes/gsc.js';
import cmsRoutes from './routes/cms.js';
import articlesRoutes from './routes/articles.js';
import subscriptionRoutes from './routes/subscriptions.js';
import seoRoutes from './routes/seo.js';
import healthRoutes from './routes/health.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://seometrics.ai',
    'https://app.seometrics.ai',
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// API versioning and routes
const API_VERSION = '/v1';

app.use(`${API_VERSION}/health`, healthRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/gsc`, gscRoutes);
app.use(`${API_VERSION}/cms`, cmsRoutes);
app.use(`${API_VERSION}/articles`, articlesRoutes);
app.use(`${API_VERSION}/subscriptions`, subscriptionRoutes);
app.use(`${API_VERSION}/seo`, seoRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SEOMetrics API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: `${API_VERSION}/health`,
      auth: `${API_VERSION}/auth`,
      gsc: `${API_VERSION}/gsc`,
      cms: `${API_VERSION}/cms`,
      articles: `${API_VERSION}/articles`,
      subscriptions: `${API_VERSION}/subscriptions`,
      seo: `${API_VERSION}/seo`
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SEOMetrics API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}${API_VERSION}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;