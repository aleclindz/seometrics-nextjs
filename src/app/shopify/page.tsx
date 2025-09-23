import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, RefreshCw, Link2 } from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'SEOAgent for Shopify - Automated SEO for Ecommerce | Publish & Optimize at Scale',
  description: 'Automate Shopify SEO: fix technical SEO, optimize product/collection pages, publish blogs, and improve rankings with an AI SEO agent built for ecommerce.',
  keywords: 'Shopify SEO automation, Shopify blog SEO, ecommerce SEO automation, technical SEO for Shopify',
  openGraph: {
    title: 'SEOAgent for Shopify - Automated Ecommerce SEO',
    description: 'Automate Shopify SEO: technical fixes, optimized publishing, and internal linking for growth.',
    type: 'website',
    url: 'https://seoagent.com/shopify',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOAgent for Shopify - Automated Ecommerce SEO',
    description: 'Automate Shopify SEO with an AI agent for product, collection, and blog pages.',
  }
};

export default function ShopifyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automated <span className="text-emerald-600">Shopify SEO</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            SEOAgent fixes technical SEO, optimizes product and collection pages, and publishes SEO‑optimized blog posts—so your Shopify store ranks and converts better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pricing" className="bg-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-700 flex items-center">
              Start Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-sm text-gray-500">Connect your Shopify store in minutes</div>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-500">
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Theme‑safe changes</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Product & blog SEO</span></div>
            <div className="flex items-center space-x-2"><CheckCircle className="w-5 h-5 text-green-500" /><span>Automated internal links</span></div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Shopify SEO Stalls</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Manual fixes and slow content cycles hold back ecommerce growth. Automate the essentials.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-500">
              <RefreshCw className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Manual product SEO</h3>
              <p className="text-gray-600">Writing titles, meta, and alt text for every product takes forever.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-orange-500">
              <Zap className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Thin blog content</h3>
              <p className="text-gray-600">Irregular posting cadence hurts topical authority and discovery.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <Link2 className="w-8 h-8 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold mb-3">Missing internal links</h3>
              <p className="text-gray-600">Collections and posts don’t reinforce each other with SEO‑friendly links.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Grow Organic Sales with Automation</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">SEOAgent handles technical SEO and content so your team focuses on products and customers.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center mb-6"><div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4"><Zap className="w-6 h-6 text-emerald-600" /></div><h3 className="text-2xl font-bold text-gray-900">Automated SEO for products & blogs</h3></div>
              <p className="text-gray-600 mb-6">Optimizes meta, schema, and internal links; publishes blog content on a schedule to build authority.</p>
              <ul className="space-y-3">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Product titles, meta, and alt text</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Collection and blog schema</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" />Authority‑building internal links</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50"><div className="text-sm text-emerald-700 font-semibold">Clicks (GSC)</div><div className="text-2xl font-bold">+32%</div></div>
                <div className="p-4 rounded-lg bg-teal-50"><div className="text-sm text-teal-700 font-semibold">Indexed pages</div><div className="text-2xl font-bold">+28%</div></div>
                <div className="p-4 rounded-lg bg-indigo-50"><div className="text-sm text-indigo-700 font-semibold">Top 10 keywords</div><div className="text-2xl font-bold">+19%</div></div>
                <div className="p-4 rounded-lg bg-violet-50"><div className="text-sm text-violet-700 font-semibold">Revenue assist</div><div className="text-2xl font-bold">↑</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-center">
        <div className="mx-auto max-w-4xl px-4">
          <h3 className="text-2xl font-semibold text-white mb-2">Ready to automate Shopify SEO?</h3>
          <p className="text-violet-100 mb-4">Start a 7‑day trial for $1. Cancel anytime.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-violet-50">Start Trial <ArrowRight size={18} /></Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

