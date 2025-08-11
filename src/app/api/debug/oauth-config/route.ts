import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
  const redirectUri = `${baseUrl}/api/gsc/oauth/callback`;

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    baseUrl,
    redirectUri,
    timestamp: new Date().toISOString()
  });
}