/**
 * Shared utility for tracking resource usage across all generation endpoints
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Track usage for a resource (article, brief, etc.)
 * @param userToken - User's token
 * @param resourceType - Type of resource ('article', 'brief', etc.)
 * @param siteId - Optional site ID
 */
export async function trackUsage(
  userToken: string,
  resourceType: string,
  siteId?: number
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Check if usage record exists for this month
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, count')
      .eq('user_token', userToken)
      .eq('resource_type', resourceType)
      .eq('month_year', currentMonth)
      .maybeSingle();

    if (existing) {
      // Update existing record
      await supabase
        .from('usage_tracking')
        .update({
          count: existing.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      console.log(`[USAGE TRACKING] Incremented ${resourceType} count for ${userToken}: ${existing.count} → ${existing.count + 1}`);
    } else {
      // Create new record
      await supabase
        .from('usage_tracking')
        .insert({
          user_token: userToken,
          site_id: siteId || null,
          resource_type: resourceType,
          month_year: currentMonth,
          count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`[USAGE TRACKING] Created new ${resourceType} tracking for ${userToken}: count = 1`);
    }
  } catch (error) {
    console.error('[USAGE TRACKING] Failed to track usage:', error);
    // Don't throw - usage tracking failure shouldn't break article generation
  }
}

/**
 * Get current usage for a user
 * @param userToken - User's token
 * @param resourceType - Type of resource
 * @returns Current usage count
 */
export async function getCurrentUsage(
  userToken: string,
  resourceType: string
): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('user_token', userToken)
      .eq('resource_type', resourceType)
      .eq('month_year', currentMonth)
      .maybeSingle();

    return data?.count || 0;
  } catch (error) {
    console.error('[USAGE TRACKING] Failed to get current usage:', error);
    return 0;
  }
}
