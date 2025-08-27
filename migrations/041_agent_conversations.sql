-- Migration 041: Add Agent Conversations Table for Persistent Chat History
-- This enables storing complete conversation transcripts for each website's SEO agent

-- Create conversations table
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token TEXT NOT NULL,
    website_token TEXT NOT NULL,
    conversation_id UUID NOT NULL, -- Groups messages in a conversation thread
    message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
    message_content TEXT NOT NULL,
    function_call JSONB, -- Store OpenAI function calls
    action_card JSONB, -- Store action cards from responses
    message_order INTEGER NOT NULL, -- Order within conversation (1, 2, 3...)
    session_id TEXT, -- Browser session identifier for grouping
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique message ordering within conversations
    UNIQUE(conversation_id, message_order)
);

-- Create indexes for efficient querying
CREATE INDEX idx_agent_conversations_user_token ON agent_conversations(user_token);
CREATE INDEX idx_agent_conversations_website_token ON agent_conversations(website_token);
CREATE INDEX idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
CREATE INDEX idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
CREATE INDEX idx_agent_conversations_user_website ON agent_conversations(user_token, website_token);
CREATE INDEX idx_agent_conversations_role ON agent_conversations(message_role);

-- Add Row Level Security (RLS) policies
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversations
CREATE POLICY agent_conversations_user_policy ON agent_conversations
    FOR ALL USING (user_token = current_setting('app.user_token', true));

-- Create function to generate conversation IDs
CREATE OR REPLACE FUNCTION generate_conversation_id()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Comment the table
COMMENT ON TABLE agent_conversations IS 'Stores persistent chat conversation history for each website SEO agent';
COMMENT ON COLUMN agent_conversations.conversation_id IS 'Groups related messages into conversation threads';
COMMENT ON COLUMN agent_conversations.message_order IS 'Sequential order of messages within a conversation (1, 2, 3...)';
COMMENT ON COLUMN agent_conversations.function_call IS 'OpenAI function call data when assistant used tools';
COMMENT ON COLUMN agent_conversations.action_card IS 'UI action cards displayed to user with results';