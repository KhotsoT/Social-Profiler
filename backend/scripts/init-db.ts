import dotenv from 'dotenv';
import { getDatabasePool } from '../src/config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/utils/logger';

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../../.env') });

async function initializeDatabase() {
  try {
    const pool = getDatabasePool();
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    logger.info(`Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            logger.warn(`SQL statement warning: ${error.message}`);
          }
        }
      }
    }

    logger.info('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();



