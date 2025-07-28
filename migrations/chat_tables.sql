-- Chat threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token TEXT NOT NULL,
  site_id TEXT NOT NULL, -- corresponds to website_token
  title TEXT NOT NULL DEFAULT 'New Chat',
  last_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token TEXT NOT NULL,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system', 'function_call')),
  content TEXT NOT NULL,
  function_call JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_token ON chat_threads(user_token);
CREATE INDEX IF NOT EXISTS idx_chat_threads_site_id ON chat_threads(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_token ON chat_messages(user_token);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_threads
CREATE POLICY "Users can view their own chat threads" ON chat_threads
  FOR SELECT USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can insert their own chat threads" ON chat_threads
  FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can update their own chat threads" ON chat_threads
  FOR UPDATE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can delete their own chat threads" ON chat_threads
  FOR DELETE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

-- Policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can delete their own chat messages" ON chat_messages
  FOR DELETE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');