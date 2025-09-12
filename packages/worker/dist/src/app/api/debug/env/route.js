"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
async function GET() {
    // Only allow in development or with a specific debug token
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
        return server_1.NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }
    return server_1.NextResponse.json({
        environment: process.env.NODE_ENV,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        hasVercelUrl: !!process.env.VERCEL_URL,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'undefined',
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
        vercelUrl: process.env.VERCEL_URL
    });
}
