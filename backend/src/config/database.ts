import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let poolInstance: Pool | null = null;

// Export pool getter for services that need direct access
export const pool = {
  query: async (text: string, params?: unknown[]) => {
    const db = getDatabasePool();
    return db.query(text, params);
  },
  connect: async () => {
    const db = getDatabasePool();
    return db.connect();
  },
};

export function getDatabasePool(): Pool {
  if (!poolInstance) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    poolInstance = new Pool(config);

    poolInstance.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Test connection
    poolInstance.query('SELECT NOW()', (err, res) => {
      if (err) {
        logger.error('Database connection failed', err);
      } else {
        logger.info('Database connected successfully');
      }
    });
  }

  return poolInstance;
}

export async function closeDatabasePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
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





