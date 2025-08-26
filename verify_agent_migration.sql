-- Verification script for Agent Operating System migration
-- Run this after applying the main migration to verify everything worked

-- Check that all tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'agent_%'
ORDER BY table_name;

-- Check that all custom types were created
SELECT 
    typname as type_name,
    typtype as type_type
FROM pg_type 
WHERE typname LIKE 'agent_%' OR typname IN ('risk_level', 'environment_type')
ORDER BY typname;

-- Check that capabilities were inserted
SELECT 
    COUNT(*) as capability_count,
    array_agg(DISTINCT category) as categories
FROM agent_capabilities;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename LIKE 'agent_%'
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE 'agent_%'
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Test basic functionality by creating a sample idea (optional)
-- Uncomment the lines below if you want to test with sample data

/*
-- Get a sample user token first
SELECT token as sample_user_token FROM login_users LIMIT 1;

-- Create a test idea (replace 'YOUR_TOKEN_HERE' with actual token from above)
INSERT INTO agent_ideas (
    user_token, 
    site_url, 
    title, 
    hypothesis, 
    evidence, 
    ice_score
) VALUES (
    'YOUR_TOKEN_HERE',
    'example.com',
    'Test Agent System Integration',
    'Agent operating system should work seamlessly',
    '{"test": true, "migration_applied": true}',
    95
);

-- Verify the idea was created and event was logged
SELECT 
    ai.title,
    ai.status,
    ai.created_at,
    ae.event_type,
    ae.event_data
FROM agent_ideas ai
LEFT JOIN agent_events ae ON ae.entity_id = ai.id
WHERE ai.title = 'Test Agent System Integration';
*/

SELECT 'Migration verification complete! ✅' as status;