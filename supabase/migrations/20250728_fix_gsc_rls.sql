-- Fix RLS issues for GSC tables
-- These tables should be accessible by service role since we use token-based auth

-- Disable RLS on GSC tables (service role handles security)
ALTER TABLE gsc_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_performance_data DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service role
GRANT ALL ON gsc_connections TO service_role;
GRANT ALL ON gsc_properties TO service_role;
GRANT ALL ON gsc_performance_data TO service_role;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;