import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('login_users')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Database connection failed:', error);
      return false;
    }

    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection error:', error);
    return false;
  }
};

// Database query helper with error handling
export const dbQuery = async (query) => {
  try {
    const result = await query;
    
    if (result.error) {
      logger.error('Database query error:', result.error);
      throw new Error(result.error.message);
    }

    return result.data;
  } catch (error) {
    logger.error('Database query failed:', error);
    throw error;
  }
};