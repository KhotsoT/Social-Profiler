import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../../.env') });

import { getDatabasePool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function removeDuplicates() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find duplicates by email (most reliable identifier)
    const duplicateQuery = `
      SELECT email, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
      FROM influencers
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    const duplicates = await client.query(duplicateQuery);

    if (duplicates.rows.length === 0) {
      logger.info('No duplicates found by email');
    } else {
      logger.info(`Found ${duplicates.rows.length} duplicate groups by email`);
      
      for (const group of duplicates.rows) {
        const ids = group.ids;
        // Keep the oldest one (first in array), delete the rest
        const toKeep = ids[0];
        const toDelete = ids.slice(1);
        
        logger.info(`Email: ${group.email}, Keeping: ${toKeep}, Deleting: ${toDelete.join(', ')}`);
        
        for (const id of toDelete) {
          // Delete social accounts first (foreign key constraint)
          await client.query('DELETE FROM social_accounts WHERE influencer_id = $1', [id]);
          // Delete influencer
          await client.query('DELETE FROM influencers WHERE id = $1', [id]);
          logger.info(`Deleted duplicate influencer: ${id}`);
        }
      }
    }

    // Also check for duplicates by name (if no email)
    const nameDuplicatesQuery = `
      SELECT name, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
      FROM influencers
      WHERE email IS NULL
      GROUP BY name
      HAVING COUNT(*) > 1
    `;

    const nameDuplicates = await client.query(nameDuplicatesQuery);

    if (nameDuplicates.rows.length === 0) {
      logger.info('No duplicates found by name');
    } else {
      logger.info(`Found ${nameDuplicates.rows.length} duplicate groups by name`);
      
      for (const group of nameDuplicates.rows) {
        const ids = group.ids;
        const toKeep = ids[0];
        const toDelete = ids.slice(1);
        
        logger.info(`Name: ${group.name}, Keeping: ${toKeep}, Deleting: ${toDelete.join(', ')}`);
        
        for (const id of toDelete) {
          await client.query('DELETE FROM social_accounts WHERE influencer_id = $1', [id]);
          await client.query('DELETE FROM influencers WHERE id = $1', [id]);
          logger.info(`Deleted duplicate influencer: ${id}`);
        }
      }
    }

    await client.query('COMMIT');
    logger.info('Duplicate removal completed');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing duplicates:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

removeDuplicates();

