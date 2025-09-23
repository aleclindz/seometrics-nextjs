import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Globe } from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'SEOAgent for Vercel - Automated SEO for Next.js & Jamstack Sites',
  description: 'Deploy SEO automation with Vercel. SEOAgent fixes technical SEO, optimizes pages, manages sitemaps, and publishes content for Next.js and Jamstack apps.',
  keywords: 'Vercel SEO, Next.js SEO automation, Jamstack SEO, automated technical SEO, sitemap management',
  openGraph: {
    title: 'SEOAgent for Vercel - Automated SEO for Next.js',
    description: 'Automate technical SEO and content publishing on Vercel for Next.js and Jamstack sites.',
    type: 'website',
    url: 'https://seoagent.com/vercel',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOAgent for Vercel - Automated SEO for Next.js',
    description: 'Automate technical SEO and content publishing on Vercel.',
  }
};

export default function VercelPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-indigo-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automated SEO for <span className="text-indigo-600">Vercel</span> Sites
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Ship fast on Vercel and let SEOAgent handle technical SEO, sitemaps, schema, and content publishing for your Next.js or Jamstack app.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pricing" className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 flex items-center">
              Start Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-sm text-gray-500">Works great with Next.js 13/14 App Router</div>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-500">
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Zero-plugin overhead</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Static & SSR friendly</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>GSC insights built‑in</span></div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <Zap className="w-8 h-8 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Automated technical SEO</h3>
              <p className="text-gray-600">Canonical tags, meta, schema, robots, and sitemaps managed for you—ideal for frameworks and headless sites.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <Globe className="w-8 h-8 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Search‑friendly publishing</h3>
              <p className="text-gray-600">Plan topics and publish high‑quality articles that build topical authority and internal links.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <CheckCircle className="w-8 h-8 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Measure impact</h3>
              <p className="text-gray-600">Connect Google Search Console to track impressions, clicks, and indexing progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-center">
        <div className="mx-auto max-w-4xl px-4">
          <h3 className="text-2xl font-semibold text-white mb-2">Ready to automate SEO on Vercel?</h3>
          <p className="text-violet-100 mb-4">Start a 7‑day trial for $1. Cancel anytime.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-violet-50">Start Trial <ArrowRight size={18} /></Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

