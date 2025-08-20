-- Add local business support to websites table
-- This enables automatic detection and LocalBusiness schema generation

-- Add business type and info columns to websites table
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT '{}';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_detection_confidence INTEGER DEFAULT 0;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_detection_signals JSONB DEFAULT '[]';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_confirmed BOOLEAN DEFAULT false;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS business_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN websites.business_type IS 'Type of business: local, online, hybrid, unknown';
COMMENT ON COLUMN websites.business_info IS 'JSON object containing business details (address, hours, phone, etc.)';
COMMENT ON COLUMN websites.business_detection_confidence IS 'Confidence score 0-100 for automatic detection';
COMMENT ON COLUMN websites.business_detection_signals IS 'Array of detected signals that indicate business type';
COMMENT ON COLUMN websites.business_confirmed IS 'Whether user has confirmed/edited business information';
COMMENT ON COLUMN websites.business_updated_at IS 'Last time business info was updated';

-- Create index for business type queries
CREATE INDEX IF NOT EXISTS idx_websites_business_type ON websites(business_type);
CREATE INDEX IF NOT EXISTS idx_websites_business_confirmed ON websites(business_confirmed);
CREATE INDEX IF NOT EXISTS idx_websites_business_confidence ON websites(business_detection_confidence);

-- Create table for business detection patterns
CREATE TABLE IF NOT EXISTS business_detection_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL, -- 'contact', 'hours', 'location', 'service'
    pattern_regex TEXT NOT NULL,
    pattern_keywords TEXT[], -- Array of keywords to match
    confidence_weight INTEGER DEFAULT 10, -- How much this pattern contributes to confidence
    business_category VARCHAR(100), -- What type of business this suggests (restaurant, service, retail, etc.)
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common local business detection patterns
INSERT INTO business_detection_patterns (pattern_type, pattern_regex, pattern_keywords, confidence_weight, business_category, description) VALUES
-- Address patterns
('contact', '\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)\b', ARRAY['address', 'located at', 'visit us at', 'find us at'], 25, 'local', 'Physical address detection'),
('contact', '\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4}', ARRAY['phone', 'call us', 'telephone', 'contact'], 20, 'local', 'Phone number patterns'),

-- Business hours patterns
('hours', '(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun).*?(?:\d{1,2}:\d{2}|\d{1,2}(?:am|pm))', ARRAY['hours', 'open', 'closed', 'business hours', 'store hours'], 30, 'local', 'Business hours detection'),
('hours', 'open\s+(?:24/7|24\s+hours|daily)', ARRAY['24/7', '24 hours', 'always open'], 25, 'local', '24/7 business hours'),

-- Location/service area patterns
('location', '\b(?:serving|service area|we serve|located in|based in)\s+[A-Za-z\s,]+', ARRAY['serving', 'service area', 'local service'], 20, 'service', 'Service area mentions'),
('location', '\b[A-Za-z\s]+(?:,\s*[A-Z]{2}|\s+[A-Z]{2})\s+\d{5}(?:-\d{4})?\b', ARRAY['zip code', 'postal code'], 15, 'local', 'ZIP code patterns'),

-- Appointment/booking patterns
('service', '\b(?:book|schedule|appointment|reservation|call to schedule|book now|schedule online)\b', ARRAY['appointment', 'booking', 'schedule', 'reservation'], 25, 'service', 'Appointment-based business'),
('service', '\b(?:emergency|24.*hour.*emergency|on.*call|after.*hours)\b', ARRAY['emergency', 'urgent', 'on-call'], 20, 'emergency_service', 'Emergency service indicators'),

-- Local business indicators
('business', '\b(?:family.*owned|locally.*owned|established.*\d{4}|since.*\d{4}|generations?|community)\b', ARRAY['family owned', 'local', 'established', 'community'], 15, 'local', 'Local business heritage indicators'),
('business', '\b(?:showroom|warehouse|storefront|retail.*location|brick.*mortar)\b', ARRAY['showroom', 'physical location', 'retail'], 20, 'retail', 'Physical location indicators');

-- Create index for pattern queries
CREATE INDEX IF NOT EXISTS idx_business_patterns_type ON business_detection_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_business_patterns_active ON business_detection_patterns(is_active);

-- Add business-specific schema types
CREATE TABLE IF NOT EXISTS business_schema_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_category VARCHAR(100) NOT NULL,
    schema_type VARCHAR(100) NOT NULL, -- LocalBusiness, Restaurant, ProfessionalService, etc.
    required_fields JSONB DEFAULT '[]', -- Required fields for this schema type
    optional_fields JSONB DEFAULT '[]', -- Optional fields that enhance the schema
    priority_score INTEGER DEFAULT 50, -- Priority when multiple types match
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_category, schema_type)
);

-- Insert schema type mappings
INSERT INTO business_schema_types (business_category, schema_type, required_fields, optional_fields, priority_score, description) VALUES
('local', 'LocalBusiness', '["name", "address"]', '["telephone", "openingHours", "url", "description"]', 50, 'Generic local business'),
('restaurant', 'Restaurant', '["name", "address", "telephone"]', '["openingHours", "servesCuisine", "priceRange", "acceptsReservations", "menu"]', 80, 'Food service establishments'),
('service', 'ProfessionalService', '["name", "address", "telephone"]', '["openingHours", "areaServed", "serviceType"]', 70, 'Professional services (lawyers, consultants, etc.)'),
('emergency_service', 'EmergencyService', '["name", "telephone"]', '["address", "areaServed", "availableService"]', 90, 'Emergency services (plumbers, HVAC, etc.)'),
('retail', 'Store', '["name", "address"]', '["telephone", "openingHours", "paymentAccepted", "department"]', 75, 'Retail stores and shops'),
('medical', 'MedicalOrganization', '["name", "address", "telephone"]', '["openingHours", "medicalSpecialty", "acceptedInsurance"]', 85, 'Healthcare providers'),
('automotive', 'AutomotiveBusiness', '["name", "address", "telephone"]', '["openingHours", "paymentAccepted", "brand"]', 75, 'Auto repair, dealerships, etc.');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schema_types_category ON business_schema_types(business_category);
CREATE INDEX IF NOT EXISTS idx_schema_types_priority ON business_schema_types(priority_score DESC);

-- Update the updated_at column when business info changes
CREATE OR REPLACE FUNCTION update_business_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.business_type IS DISTINCT FROM NEW.business_type OR 
        OLD.business_info IS DISTINCT FROM NEW.business_info OR 
        OLD.business_confirmed IS DISTINCT FROM NEW.business_confirmed) THEN
        NEW.business_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_business_updated_at ON websites;
CREATE TRIGGER trigger_update_business_updated_at
    BEFORE UPDATE ON websites
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();