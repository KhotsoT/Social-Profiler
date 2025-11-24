import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'social-profiler-api',
  });
});

