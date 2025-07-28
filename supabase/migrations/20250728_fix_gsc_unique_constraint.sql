-- Ensure unique constraint exists on gsc_connections.user_token
-- This fixes the ON CONFLICT issue in upsert operations

-- Drop existing constraint if it exists with different name
ALTER TABLE gsc_connections DROP CONSTRAINT IF EXISTS gsc_connections_user_token_key;
ALTER TABLE gsc_connections DROP CONSTRAINT IF EXISTS gsc_connections_user_token_unique;

-- Add the unique constraint with a specific name
ALTER TABLE gsc_connections ADD CONSTRAINT gsc_connections_user_token_unique UNIQUE (user_token);

-- Verify the constraint exists
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'gsc_connections'::regclass;