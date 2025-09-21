-- Create table for storing generated llms.txt files
CREATE TABLE IF NOT EXISTS llms_txt_files (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    content TEXT NOT NULL,
    structure_detected JSONB DEFAULT '{}',
    articles_included INTEGER DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_size INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'serving', 'error')),

    -- Unique constraint to prevent duplicates per website
    UNIQUE(user_token, website_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_llms_txt_files_user_token ON llms_txt_files(user_token);
CREATE INDEX IF NOT EXISTS idx_llms_txt_files_website_id ON llms_txt_files(website_id);
CREATE INDEX IF NOT EXISTS idx_llms_txt_files_site_url ON llms_txt_files(site_url);
CREATE INDEX IF NOT EXISTS idx_llms_txt_files_generated_at ON llms_txt_files(generated_at DESC);

-- Add RLS policy
ALTER TABLE llms_txt_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own llms.txt files"
ON llms_txt_files
FOR ALL
USING (user_token = current_setting('app.user_token', true));

-- Grant permissions
GRANT ALL ON llms_txt_files TO authenticated;
GRANT USAGE ON SEQUENCE llms_txt_files_id_seq TO authenticated;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llms_txt_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_llms_txt_files_updated_at
    BEFORE UPDATE ON llms_txt_files
    FOR EACH ROW
    EXECUTE FUNCTION update_llms_txt_files_updated_at();

COMMENT ON TABLE llms_txt_files IS 'Generated llms.txt files for websites with AI-readable documentation';
COMMENT ON COLUMN llms_txt_files.content IS 'The generated llms.txt file content';
COMMENT ON COLUMN llms_txt_files.structure_detected IS 'JSON object containing detected website structure and pages';
COMMENT ON COLUMN llms_txt_files.articles_included IS 'Number of recent articles included in the llms.txt file';