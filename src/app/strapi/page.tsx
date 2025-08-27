import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Globe, RefreshCw, Link2, BarChart3, Shield, Clock } from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'SEOAgent for Strapi - Automated SEO for Headless CMS | Put Your Technical SEO on Autopilot',
  description: 'The first SEO automation platform built for Strapi and headless CMS. Auto-publish content, optimize technical SEO, manage sitemaps, and boost rankings without manual work.',
  keywords: 'Strapi SEO, headless CMS SEO, automated SEO, Strapi optimization, technical SEO automation, content publishing automation',
  openGraph: {
    title: 'SEOAgent for Strapi - Automated SEO for Headless CMS',
    description: 'The first SEO automation platform built for Strapi and headless CMS. Auto-publish content, optimize technical SEO, manage sitemaps, and boost rankings without manual work.',
    type: 'website',
    url: 'https://seoagent.com/strapi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOAgent for Strapi - Automated SEO for Headless CMS',
    description: 'The first SEO automation platform built for Strapi and headless CMS. Auto-publish content, optimize technical SEO, manage sitemaps, and boost rankings without manual work.',
  }
};

export default function StrapiPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-2xl font-bold text-gray-400">+</span>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">SEO</span>
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            The First <span className="text-blue-600">SEO Automation Platform</span><br />
            Built for Strapi & Headless CMS
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Stop losing traffic because your headless CMS can&apos;t handle SEO. SEOAgent automatically optimizes 
            technical SEO, publishes content, manages sitemaps, and builds internal links for your Strapi site.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 flex items-center"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-sm text-gray-500">
              Connect your Strapi site in 2 minutes
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>No WordPress Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Headless CMS Native</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Set & Forget Automation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why Strapi Sites Struggle with SEO
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Headless CMS gives you development freedom, but traditional SEO tools are built for WordPress. 
              Your modern stack deserves modern SEO automation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="text-red-500 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Manual Technical SEO</h3>
              <p className="text-gray-600">
                Checking sitemaps, fixing canonical tags, and optimizing meta data manually eats up development time 
                that should be spent building features.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="text-orange-500 mb-4">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Content Publishing Bottlenecks</h3>
              <p className="text-gray-600">
                Creating SEO-optimized content through Strapi&apos;s admin panel is slow. No automated publishing, 
                no bulk operations, no content optimization suggestions.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <div className="text-yellow-500 mb-4">
                <Link2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Missing Internal Links</h3>
              <p className="text-gray-600">
                Headless CMS content exists in isolation. No automated internal linking means you&apos;re missing 
                crucial SEO signals that help pages rank higher.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              SEOAgent Puts Your Strapi SEO on Autopilot
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The only SEO platform built specifically for headless CMS. Connect once, then watch as your 
              technical SEO optimizes itself and content publishes automatically.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Automated Technical SEO</h3>
              </div>
              <p className="text-gray-600 mb-6">
                SEOAgent continuously monitors your Strapi site and automatically fixes technical SEO issues. 
                No more manual sitemap updates, canonical tag fixes, or schema markup maintenance.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Automated sitemap generation & submission to search engines</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Dynamic robots.txt optimization for maximum crawlability</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Canonical tag management across all content types</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Schema markup injection for rich search results</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Technical SEO Status</span>
                  <span className="text-sm text-green-600 font-medium">All Automated ✓</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Sitemap Updates</span>
                    <span className="text-green-600">✓ Auto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Schema Markup</span>
                    <span className="text-green-600">✓ Auto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Meta Optimization</span>
                    <span className="text-green-600">✓ Auto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Internal Linking</span>
                    <span className="text-green-600">✓ Auto</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-lg order-2 lg:order-1">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Content Pipeline</span>
                  <span className="text-sm text-blue-600 font-medium">Publishing...</span>
                </div>
                <div className="space-y-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">10 SEO-Optimized Articles</div>
                    <div className="text-xs text-gray-500 mt-1">Auto-publishing to Strapi CMS</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Next batch: Tomorrow at 9:00 AM
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Automated Content Publishing</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Generate SEO-optimized articles and automatically publish them to your Strapi CMS. No manual 
                content entry, no copy-pasting. Just high-quality, search-optimized content flowing into your site.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Direct integration with Strapi&apos;s Content API</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Automated article scheduling and publishing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>SEO-optimized content structure and formatting</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Custom content types and field mapping</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Smart Internal Linking</h3>
              </div>
              <p className="text-gray-600 mb-6">
                SEOAgent analyzes your existing Strapi content and automatically creates internal links between 
                related articles. This helps search engines understand your content structure and boosts rankings.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>AI-powered content relationship analysis</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Automatic link insertion in existing content</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Anchor text optimization for maximum SEO impact</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Cross-content type linking (articles, pages, products)</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-lg">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Internal Link Analysis</span>
                  <span className="text-sm text-purple-600 font-medium">Optimized</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Links Added Today</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Content Connections</span>
                    <span className="font-medium">156</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">SEO Score Increase</span>
                    <span className="text-green-600 font-medium">+15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why Choose SEOAgent Over Traditional SEO Tools?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Most SEO tools are built for WordPress. SEOAgent is built specifically for modern, headless CMS architectures.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-3 text-center">
              <div className="p-8 border-r border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Traditional SEO Tools</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ WordPress Only</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Manual Content Entry</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ No API Integration</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Limited Automation</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Plugin Dependencies</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-blue-50 border-r border-gray-200">
                <h3 className="text-xl font-bold text-blue-600 mb-4">SEOAgent for Strapi</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Headless CMS Native</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Automated Publishing</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Direct API Integration</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Full Automation</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Zero Dependencies</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Manual SEO</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Time Intensive</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Error Prone</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Inconsistent</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Hard to Scale</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Developer Bottleneck</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Put Your Strapi SEO on Autopilot?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
            Join developers who&apos;ve automated their SEO workflow with SEOAgent. 
            Connect your Strapi site in 2 minutes and watch your rankings grow.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link 
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 flex items-center"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-blue-100">
              14-day free trial • No credit card required
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">2 min</div>
              <div className="text-blue-100">Setup Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Automation</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">0</div>
              <div className="text-blue-100">Manual Work</div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}