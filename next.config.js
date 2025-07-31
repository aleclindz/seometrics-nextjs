/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./supabase/**/*', './strapi-cms/**/*'],
    },
  },
}

module.exports = nextConfig