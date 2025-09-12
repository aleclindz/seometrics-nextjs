"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.createClientComponentClient = void 0;
const ssr_1 = require("@supabase/ssr");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}
const createClientComponentClient = () => (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Disable auto refresh to prevent focus-related authentication issues
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false, // Disable URL session detection to prevent router issues
        flowType: 'pkce', // Use PKCE flow for better security
    }
});
exports.createClientComponentClient = createClientComponentClient;
// Legacy export for backward compatibility
exports.supabase = (0, exports.createClientComponentClient)();
