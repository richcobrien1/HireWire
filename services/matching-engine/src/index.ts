import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, transports, format } from 'winston';
import matchingRoutes from './routes/matching';
import explanationRoutes from './routes/explanations';
import { connectDatabases, closeDatabases } from './db/connections';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Logger
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/matching', matchingRoutes);
app.use('/api/ai', explanationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'matching-engine',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize databases and start server
async function start() {
  try {
    await connectDatabases();
    logger.info('Database connections established');
    
    app.listen(PORT, () => {
      logger.info(`Matching Engine running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeDatabases();
  process.exit(0);
});

start();
