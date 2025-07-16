-- Create alt_tags table to store generated image alt-tags
CREATE TABLE IF NOT EXISTS alt_tags (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL,
    image_url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, image_url)
);

-- Create meta_tags table to store generated meta titles and descriptions
CREATE TABLE IF NOT EXISTS meta_tags (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL,
    page_url TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, page_url)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alt_tags_website_token ON alt_tags(website_token);
CREATE INDEX IF NOT EXISTS idx_meta_tags_website_token ON meta_tags(website_token);

-- Add foreign key constraints to link to websites table
ALTER TABLE alt_tags ADD CONSTRAINT fk_alt_tags_website_token 
    FOREIGN KEY (website_token) REFERENCES websites(website_token) ON DELETE CASCADE;

ALTER TABLE meta_tags ADD CONSTRAINT fk_meta_tags_website_token 
    FOREIGN KEY (website_token) REFERENCES websites(website_token) ON DELETE CASCADE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_alt_tags_updated_at 
    BEFORE UPDATE ON alt_tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_tags_updated_at 
    BEFORE UPDATE ON meta_tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();