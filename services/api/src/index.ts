import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { rateLimit } from 'express-rate-limit';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import onboardingRoutes from './routes/onboarding';
import profileRoutes from './routes/profile';
import careerContextRoutes from './routes/career-context';
import matchingRoutes from './routes/matching';
import swipeRoutes from './routes/swipe';
import messageRoutes from './routes/messages';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'hirewire-api',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/career-context', careerContextRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  logger.info(`🚀 HireWire API running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Resume Parser: ${process.env.RESUME_PARSER_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
