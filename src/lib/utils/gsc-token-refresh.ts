import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Ensures a valid GSC access token for the given user
 *
 * Checks if the current token expires within 5 minutes
 * If expiring soon, automatically refreshes the token
 *
 * @param userToken - The user's authentication token
 * @returns The valid access token or null if refresh fails
 */
export async function ensureValidGSCToken(userToken: string): Promise<string | null> {
  try {
    console.log('[GSC TOKEN REFRESH] Checking token validity for user:', userToken);

    // Get current GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .maybeSingle();

    if (connectionError || !connection) {
      console.error('[GSC TOKEN REFRESH] No active GSC connection found');
      return null;
    }

    // Check if token is expiring within 5 minutes
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      // Token is still valid for more than 5 minutes
      console.log('[GSC TOKEN REFRESH] Token is still valid until:', expiresAt.toISOString());
      return connection.access_token;
    }

    // Token is expiring soon or already expired - refresh it
    console.log('[GSC TOKEN REFRESH] Token expires at', expiresAt.toISOString(), '- refreshing...');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[GSC TOKEN REFRESH] Missing OAuth credentials');
      return null;
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      console.error('[GSC TOKEN REFRESH] Failed to refresh access token');
      return null;
    }

    // Calculate new expiry time
    const newExpiresAt = new Date(
      Date.now() + (credentials.expiry_date || Date.now() + 3600 * 1000)
    );

    // Update connection in database
    const { error: updateError } = await supabase
      .from('gsc_connections')
      .update({
        access_token: credentials.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[GSC TOKEN REFRESH] Database update error:', updateError);
      return null;
    }

    console.log('[GSC TOKEN REFRESH] Successfully refreshed token, expires at:', newExpiresAt.toISOString());

    return credentials.access_token;

  } catch (error) {
    console.error('[GSC TOKEN REFRESH] Unexpected error:', error);
    return null;
  }
}

/**
 * Refreshes GSC token if a 401 or 403 error occurs during API call
 *
 * @param userToken - The user's authentication token
 * @param apiCall - The API call function to retry after refresh
 * @returns Result of the API call or throws error
 */
export async function retryWithTokenRefresh<T>(
  userToken: string,
  apiCall: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    // First attempt - use current token
    const accessToken = await ensureValidGSCToken(userToken);
    if (!accessToken) {
      throw new Error('Failed to obtain valid GSC token');
    }

    return await apiCall(accessToken);
  } catch (error: any) {
    // Check if error is 401/403 (auth error)
    if (error?.code === 401 || error?.code === 403 ||
        error?.message?.includes('permission') ||
        error?.message?.includes('unauthorized')) {

      console.log('[GSC TOKEN REFRESH] Auth error detected, forcing token refresh...');

      // Force refresh by setting expires_at to now
      const { data: connection } = await supabase
        .from('gsc_connections')
        .select('id')
        .eq('user_token', userToken)
        .eq('is_active', true)
        .maybeSingle();

      if (connection) {
        await supabase
          .from('gsc_connections')
          .update({ expires_at: new Date().toISOString() })
          .eq('id', connection.id);
      }

      // Retry with refreshed token
      const newAccessToken = await ensureValidGSCToken(userToken);
      if (!newAccessToken) {
        throw new Error('Failed to refresh GSC token after auth error');
      }

      return await apiCall(newAccessToken);
    }

    // If not auth error, rethrow
    throw error;
  }
}
