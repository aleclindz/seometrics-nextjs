-- Migration: Fix business_detection_confidence data type
-- Issue: Column is INTEGER but API tries to save decimal values (0.3, 0.7, etc)
-- Date: 2025-10-21

-- Change business_detection_confidence from INTEGER to DECIMAL(3,2)
ALTER TABLE websites
ALTER COLUMN business_detection_confidence TYPE DECIMAL(3,2);

-- Verify the change
COMMENT ON COLUMN websites.business_detection_confidence IS 'LLM confidence score for business detection (0.00 to 1.00 as decimal)';
