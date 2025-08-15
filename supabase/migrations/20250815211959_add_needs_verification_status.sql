-- Add 'needs_verification' status to seo_action_items table
-- This allows action items that have been completed but failed verification to have a distinct status

-- Drop the existing CHECK constraint
ALTER TABLE public.seo_action_items 
DROP CONSTRAINT IF EXISTS seo_action_items_status_check;

-- Add the new CHECK constraint with 'needs_verification' included
ALTER TABLE public.seo_action_items 
ADD CONSTRAINT seo_action_items_status_check 
CHECK (status IN ('detected', 'assigned', 'in_progress', 'completed', 'needs_verification', 'verified', 'closed', 'dismissed'));

-- Update the comment to reflect the new status
COMMENT ON COLUMN public.seo_action_items.status IS 'Current status of the action item. Lifecycle: detected -> assigned -> in_progress -> completed -> [needs_verification if verification fails] -> verified -> closed';