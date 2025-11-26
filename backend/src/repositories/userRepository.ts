import { getDatabasePool } from '../config/database';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin' | 'brand';
  is_verified: boolean;
  verification_token?: string | null;
  verification_expires?: Date | null;
  reset_password_token?: string | null;
  reset_password_expires?: Date | null;
  refresh_token?: string | null;
  influencer_id?: string | null;
  last_login_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  name: string;
  role?: 'user' | 'admin' | 'brand';
  verification_token?: string;
  verification_expires?: Date;
}

export interface UpdateUserInput {
  email?: string;
  password_hash?: string;
  name?: string;
  role?: 'user' | 'admin' | 'brand';
  is_verified?: boolean;
  verification_token?: string | null;
  verification_expires?: Date | null;
  reset_password_token?: string | null;
  reset_password_expires?: Date | null;
  refresh_token?: string | null;
  influencer_id?: string | null;
  last_login_at?: Date | null;
}

class UserRepository {
  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, name, role, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.email.toLowerCase(),
        input.password_hash,
        input.name,
        input.role || 'user',
        input.verification_token || null,
        input.verification_expires || null,
      ]
    );

    logger.info('User created', { userId: result.rows[0].id, email: input.email });
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token: string): Promise<User | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      `SELECT * FROM users 
       WHERE verification_token = $1 
       AND verification_expires > NOW()`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by reset password token
   */
  async findByResetToken(token: string): Promise<User | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      `SELECT * FROM users 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW()`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(token: string): Promise<User | null> {
    const pool = getDatabasePool();
    
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE refresh_token = $1',
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const pool = getDatabasePool();
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await pool.query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows[0]) {
      logger.info('User updated', { userId: id });
    }

    return result.rows[0] || null;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const pool = getDatabasePool();
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info('User deleted', { userId: id });
      return true;
    }

    return false;
  }

  /**
   * Get all users (admin only)
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    role?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    const pool = getDatabasePool();
    const { page = 1, limit = 20, role } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const values: any[] = [];
    
    if (role) {
      whereClause = 'WHERE role = $1';
      values.push(role);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const selectValues = [...values, limit, offset];
    const result = await pool.query<User>(
      `SELECT id, email, name, role, is_verified, influencer_id, last_login_at, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      selectValues
    );

    return { users: result.rows, total };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const pool = getDatabasePool();
    
    const result = await pool.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    return result.rows.length > 0;
  }
}

export const userRepository = new UserRepository();





