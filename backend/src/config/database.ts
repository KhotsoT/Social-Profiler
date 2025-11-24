import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Test connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        logger.error('Database connection failed', err);
      } else {
        logger.info('Database connected successfully');
      }
    });
  }

  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

// Helper function for queries
export async function query(text: string, params?: any[]): Promise<any> {
  const db = getDatabasePool();
  const start = Date.now();
  try {
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
}





