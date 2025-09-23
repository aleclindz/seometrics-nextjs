import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, RefreshCw, Link2, Shield, Clock } from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'SEOAgent for WordPress - Automated SEO & Publishing | Technical SEO on Autopilot',
  description: 'Automate WordPress SEO: fix technical SEO, publish optimized content, manage sitemaps, and improve rankings with an AI SEO agent built to work with WordPress.',
  keywords: 'WordPress SEO automation, WordPress SEO plugin alternative, automated SEO, technical SEO for WordPress, AI content publishing',
  openGraph: {
    title: 'SEOAgent for WordPress - Automated SEO & Publishing',
    description: 'Automate WordPress SEO: fix technical SEO, publish optimized content, manage sitemaps, and improve rankings with an AI SEO agent.',
    type: 'website',
    url: 'https://seoagent.com/wordpress',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOAgent for WordPress - Automated SEO & Publishing',
    description: 'Automate WordPress SEO with an AI agent that fixes technical SEO and publishes optimized content.',
  }
};

export default function WordPressPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automated <span className="text-blue-600">WordPress SEO</span> & Publishing
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            SEOAgent automatically fixes technical SEO, optimizes metadata, manages sitemaps, and publishes SEO‑optimized articles to WordPress—so rankings and traffic grow every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pricing" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 flex items-center">
              Start Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-sm text-gray-500">Connect your WordPress site in minutes</div>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-500">
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>No plugin bloat</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Theme‑agnostic</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Set‑and‑forget automation</span></div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Why WordPress Sites Lose SEO Momentum</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Manual fixes, plugin sprawl, and slow publishing create SEO drag. Let an agent handle the busywork.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-500">
              <Clock className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Time‑consuming technical SEO</h3>
              <p className="text-gray-600">Meta updates, canonicals, schema, and sitemaps take constant effort in wp‑admin.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-orange-500">
              <RefreshCw className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Publishing bottlenecks</h3>
              <p className="text-gray-600">Drafting, optimizing, and scheduling posts by hand slows down content velocity.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <Link2 className="w-8 h-8 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Weak internal links</h3>
              <p className="text-gray-600">Related posts often miss links that pass authority and improve ranking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Put WordPress SEO on Autopilot</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Connect once and SEOAgent handles optimization and publishing—measuring impact in Google Search Console.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center mb-6"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4"><Zap className="w-6 h-6 text-blue-600" /></div><h3 className="text-2xl font-bold text-gray-900">Automated technical SEO</h3></div>
              <p className="text-gray-600 mb-6">Fixes metadata, schema, canonical tags, and keeps sitemaps fresh—without more plugins.</p>
              <ul className="space-y-3">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Meta titles & descriptions optimization</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Robots.txt and sitemap management</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Schema markup maintenance</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50"><div className="text-sm text-blue-700 font-semibold">Errors fixed</div><div className="text-2xl font-bold">128</div></div>
                <div className="p-4 rounded-lg bg-emerald-50"><div className="text-sm text-emerald-700 font-semibold">Indexed pages</div><div className="text-2xl font-bold">+41%</div></div>
                <div className="p-4 rounded-lg bg-indigo-50"><div className="text-sm text-indigo-700 font-semibold">Clicks (GSC)</div><div className="text-2xl font-bold">+27%</div></div>
                <div className="p-4 rounded-lg bg-violet-50"><div className="text-sm text-violet-700 font-semibold">Avg. position</div><div className="text-2xl font-bold">↑ 3.2</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-center">
        <div className="mx-auto max-w-4xl px-4">
          <h3 className="text-2xl font-semibold text-white mb-2">Ready to automate WordPress SEO?</h3>
          <p className="text-violet-100 mb-4">Start a 7‑day trial for $1. Cancel anytime.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-violet-50">Start Trial <ArrowRight size={18} /></Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

