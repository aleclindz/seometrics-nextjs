"use strict";
/**
 * HostingProviderDatabase - Database integration for hosting provider fingerprints
 *
 * This service manages hosting provider fingerprints stored in the database,
 * allowing for dynamic updates without code deployments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostingProviderDatabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class HostingProviderDatabase {
    /**
     * Get all active fingerprints for provider detection
     */
    static async getActiveFingerprints(providerName) {
        try {
            let query = supabase
                .from('hosting_provider_fingerprints')
                .select('*')
                .eq('is_active', true)
                .order('confidence_weight', { ascending: false });
            if (providerName) {
                query = query.eq('provider_name', providerName);
            }
            const { data, error } = await query;
            if (error) {
                console.error('[HOST DB] Error fetching fingerprints:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[HOST DB] Error in getActiveFingerprints:', error);
            return [];
        }
    }
    /**
     * Get fingerprints by type (header, dns, path, etc.)
     */
    static async getFingerprintsByType(type) {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_fingerprints')
                .select('*')
                .eq('fingerprint_type', type)
                .eq('is_active', true)
                .order('confidence_weight', { ascending: false });
            if (error) {
                console.error('[HOST DB] Error fetching fingerprints by type:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[HOST DB] Error in getFingerprintsByType:', error);
            return [];
        }
    }
    /**
     * Save detection result to database
     */
    static async saveDetectionResult(userToken, siteUrl, domain, detectedProviders, primaryProvider, confidenceScore, detectionMethods, fingerprintsMatched, detectionDurationMs, userAgent = 'SEOAgent-HostDetection/1.0') {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_detections')
                .insert({
                user_token: userToken,
                site_url: siteUrl,
                domain,
                detected_providers: detectedProviders,
                primary_provider: primaryProvider,
                confidence_score: confidenceScore,
                detection_methods: detectionMethods,
                fingerprints_matched: fingerprintsMatched,
                detection_duration_ms: detectionDurationMs,
                user_agent: userAgent
            })
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error saving detection result:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in saveDetectionResult:', error);
            return null;
        }
    }
    /**
     * Get recent detection results for a user
     */
    static async getUserDetections(userToken, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_detections')
                .select('*')
                .eq('user_token', userToken)
                .order('detected_at', { ascending: false })
                .limit(limit);
            if (error) {
                console.error('[HOST DB] Error fetching user detections:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[HOST DB] Error in getUserDetections:', error);
            return [];
        }
    }
    /**
     * Get latest detection for a specific domain
     */
    static async getLatestDetection(userToken, domain) {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_detections')
                .select('*')
                .eq('user_token', userToken)
                .eq('domain', domain)
                .order('detected_at', { ascending: false })
                .limit(1)
                .single();
            if (error) {
                console.error('[HOST DB] Error fetching latest detection:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in getLatestDetection:', error);
            return null;
        }
    }
    /**
     * Create or update hosting provider integration
     */
    static async upsertIntegration(integration) {
        try {
            const { data, error } = await supabase
                .from('hosting_integrations')
                .upsert(integration, {
                onConflict: 'user_token,site_url,provider_name'
            })
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error upserting integration:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in upsertIntegration:', error);
            return null;
        }
    }
    /**
     * Get user's hosting integrations
     */
    static async getUserIntegrations(userToken) {
        try {
            const { data, error } = await supabase
                .from('hosting_integrations')
                .select('*')
                .eq('user_token', userToken)
                .order('created_at', { ascending: false });
            if (error) {
                console.error('[HOST DB] Error fetching user integrations:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[HOST DB] Error in getUserIntegrations:', error);
            return [];
        }
    }
    /**
     * Get active integrations for a specific site
     */
    static async getSiteIntegrations(userToken, siteUrl) {
        try {
            const { data, error } = await supabase
                .from('hosting_integrations')
                .select('*')
                .eq('user_token', userToken)
                .eq('site_url', siteUrl)
                .eq('status', 'active')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('[HOST DB] Error fetching site integrations:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[HOST DB] Error in getSiteIntegrations:', error);
            return [];
        }
    }
    /**
     * Update integration status
     */
    static async updateIntegrationStatus(integrationId, status, errorMessage) {
        try {
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };
            if (errorMessage) {
                updateData.last_error_message = errorMessage;
                updateData.last_error_at = new Date().toISOString();
                // Note: Increment will be handled by a separate update query
            }
            const { data, error } = await supabase
                .from('hosting_integrations')
                .update(updateData)
                .eq('id', integrationId)
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error updating integration status:', error);
                return null;
            }
            // Increment error count if needed
            if (errorMessage && data) {
                await supabase
                    .from('hosting_integrations')
                    .update({ error_count: (data.error_count || 0) + 1 })
                    .eq('id', integrationId);
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in updateIntegrationStatus:', error);
            return null;
        }
    }
    /**
     * Record successful deployment
     */
    static async recordDeployment(integrationId) {
        try {
            // First get current deployment count
            const { data: currentData, error: fetchError } = await supabase
                .from('hosting_integrations')
                .select('deployment_count')
                .eq('id', integrationId)
                .single();
            if (fetchError) {
                console.error('[HOST DB] Error fetching current deployment count:', fetchError);
                return null;
            }
            const { data, error } = await supabase
                .from('hosting_integrations')
                .update({
                last_deployment_at: new Date().toISOString(),
                deployment_count: (currentData?.deployment_count || 0) + 1,
                updated_at: new Date().toISOString()
            })
                .eq('id', integrationId)
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error recording deployment:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in recordDeployment:', error);
            return null;
        }
    }
    /**
     * Add new fingerprint (admin only)
     */
    static async addFingerprint(fingerprint) {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_fingerprints')
                .insert(fingerprint)
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error adding fingerprint:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in addFingerprint:', error);
            return null;
        }
    }
    /**
     * Update fingerprint (admin only)
     */
    static async updateFingerprint(fingerprintId, updates) {
        try {
            const { data, error } = await supabase
                .from('hosting_provider_fingerprints')
                .update(updates)
                .eq('id', fingerprintId)
                .select()
                .single();
            if (error) {
                console.error('[HOST DB] Error updating fingerprint:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[HOST DB] Error in updateFingerprint:', error);
            return null;
        }
    }
    /**
     * Deactivate fingerprint (admin only)
     */
    static async deactivateFingerprint(fingerprintId) {
        try {
            const { error } = await supabase
                .from('hosting_provider_fingerprints')
                .update({ is_active: false })
                .eq('id', fingerprintId);
            if (error) {
                console.error('[HOST DB] Error deactivating fingerprint:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('[HOST DB] Error in deactivateFingerprint:', error);
            return false;
        }
    }
    /**
     * Get provider statistics
     */
    static async getProviderStats() {
        try {
            // Get fingerprint counts by provider
            const { data: fingerprintStats, error: fpError } = await supabase
                .from('hosting_provider_fingerprints')
                .select('provider_name')
                .eq('is_active', true);
            if (fpError) {
                console.error('[HOST DB] Error fetching fingerprint stats:', fpError);
                return {};
            }
            // Get detection counts by provider (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: detectionStats, error: detError } = await supabase
                .from('hosting_provider_detections')
                .select('primary_provider')
                .gte('detected_at', thirtyDaysAgo.toISOString())
                .not('primary_provider', 'is', null);
            if (detError) {
                console.error('[HOST DB] Error fetching detection stats:', detError);
                return {};
            }
            // Get integration counts by provider
            const { data: integrationStats, error: intError } = await supabase
                .from('hosting_integrations')
                .select('provider_name, status')
                .eq('status', 'active');
            if (intError) {
                console.error('[HOST DB] Error fetching integration stats:', intError);
                return {};
            }
            // Aggregate statistics
            const stats = {};
            // Count fingerprints by provider
            const fingerprintCounts = {};
            fingerprintStats?.forEach(fp => {
                fingerprintCounts[fp.provider_name] = (fingerprintCounts[fp.provider_name] || 0) + 1;
            });
            // Count detections by provider
            const detectionCounts = {};
            detectionStats?.forEach(det => {
                if (det.primary_provider) {
                    detectionCounts[det.primary_provider] = (detectionCounts[det.primary_provider] || 0) + 1;
                }
            });
            // Count integrations by provider
            const integrationCounts = {};
            integrationStats?.forEach(int => {
                integrationCounts[int.provider_name] = (integrationCounts[int.provider_name] || 0) + 1;
            });
            // Combine all provider names
            const allProviders = new Set([
                ...Object.keys(fingerprintCounts),
                ...Object.keys(detectionCounts),
                ...Object.keys(integrationCounts)
            ]);
            allProviders.forEach(provider => {
                stats[provider] = {
                    fingerprints: fingerprintCounts[provider] || 0,
                    detections_30d: detectionCounts[provider] || 0,
                    active_integrations: integrationCounts[provider] || 0
                };
            });
            return stats;
        }
        catch (error) {
            console.error('[HOST DB] Error in getProviderStats:', error);
            return {};
        }
    }
    /**
     * Check if hosting provider tables exist (for graceful degradation)
     */
    static async checkTablesExist() {
        try {
            const { error } = await supabase
                .from('hosting_provider_fingerprints')
                .select('id')
                .limit(1)
                .single();
            // If table doesn't exist, we'll get a relation does not exist error
            return !error || !error.message.includes('relation') && !error.message.includes('does not exist');
        }
        catch (error) {
            console.error('[HOST DB] Error checking tables exist:', error);
            return false;
        }
    }
}
exports.HostingProviderDatabase = HostingProviderDatabase;
// Types are already exported with their interface declarations above
