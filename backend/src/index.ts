import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { join } from 'path';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { influencerRoutes } from './routes/influencer';
import { analyticsRoutes } from './routes/analytics';
import { campaignRoutes } from './routes/campaign';
import { healthRoutes } from './routes/health';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { getDatabasePool, closeDatabasePool } from './config/database';

// Load .env from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize database connection
if (process.env.DATABASE_URL) {
  getDatabasePool();
  logger.info('Database connection initialized');
} else {
  logger.warn('DATABASE_URL not set, using in-memory storage');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database pool');
  await closeDatabasePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database pool');
  await closeDatabasePool();
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/influencers', influencerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;

