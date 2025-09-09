import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Globe, RefreshCw, Link2, BarChart3, Shield, Clock } from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'SEOAgent for Vercel - Automated SEO File Deployment | Serve Sitemaps, Robots.txt & LLMs.txt',
  description: 'The first SEO automation platform built for Vercel. Automatically deploy and serve sitemaps, robots.txt, and llms.txt files for your websites without manual uploads.',
  keywords: 'Vercel SEO, automated SEO deployment, sitemap deployment, robots.txt automation, Vercel integration, SEO file hosting',
  openGraph: {
    title: 'SEOAgent for Vercel - Automated SEO File Deployment',
    description: 'The first SEO automation platform built for Vercel. Automatically deploy and serve sitemaps, robots.txt, and llms.txt files for your websites without manual uploads.',
    type: 'website',
    url: 'https://seoagent.com/vercel',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOAgent for Vercel - Automated SEO File Deployment',
    description: 'The first SEO automation platform built for Vercel. Automatically deploy and serve sitemaps, robots.txt, and llms.txt files for your websites without manual uploads.',
  }
};

export default function VercelPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-black to-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center border border-white">
                <span className="text-white font-bold text-lg">▲</span>
              </div>
              <span className="text-2xl font-bold text-gray-400">+</span>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">SEO</span>
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-6">
            <span className="text-blue-400">Automated SEO File Deployment</span><br />
            Built for Vercel Projects
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Stop manually uploading sitemaps and robots.txt files. SEOAgent automatically deploys and serves 
            SEO files for your Vercel projects, ensuring search engines can always access your latest content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 flex items-center"
            >
              Connect Your Vercel Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-sm text-gray-400">
              Setup takes 30 seconds with OAuth
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Zero Manual Uploads</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Real-time Deployment</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Multiple Deploy Methods</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why Vercel Projects Struggle with SEO File Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vercel makes deployment easy, but managing SEO files like sitemaps and robots.txt across 
              multiple projects still requires manual work that slows down your development workflow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="text-red-500 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Manual File Uploads</h3>
              <p className="text-gray-600">
                Every time your content changes, you need to manually generate and upload new sitemaps, 
                update robots.txt files, and ensure all SEO files are current across your projects.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="text-orange-500 mb-4">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Deployment Bottlenecks</h3>
              <p className="text-gray-600">
                Your Vercel projects deploy quickly, but SEO files get forgotten. This creates gaps 
                where search engines can&apos;t find your latest content or follow outdated crawling instructions.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <div className="text-yellow-500 mb-4">
                <Link2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Multiple Project Management</h3>
              <p className="text-gray-600">
                Managing SEO files across multiple Vercel projects becomes a nightmare. Each project 
                needs its own sitemap, robots.txt, and llms.txt configuration.
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
              SEOAgent Automates Your Vercel SEO File Deployment
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect your Vercel account once, then watch as SEOAgent automatically deploys and serves 
              optimized SEO files for all your projects without any manual intervention.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Automated File Deployment</h3>
              </div>
              <p className="text-gray-600 mb-6">
                SEOAgent integrates directly with Vercel&apos;s API to automatically deploy sitemaps, robots.txt, 
                and llms.txt files to your projects. No manual uploads, no forgotten deployments.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Automatic sitemap generation and deployment to /sitemap.xml</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Dynamic robots.txt creation and optimization</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>LLMs.txt deployment for AI crawler optimization</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Real-time deployment status monitoring</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Deployment Status</span>
                  <span className="text-sm text-green-600 font-medium">All Projects ✓</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">my-portfolio.vercel.app</span>
                    <span className="text-green-600">✓ Deployed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">company-website.vercel.app</span>
                    <span className="text-green-600">✓ Deployed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">blog-platform.vercel.app</span>
                    <span className="text-green-600">✓ Deployed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">ecommerce-store.vercel.app</span>
                    <span className="text-blue-600">⟲ Deploying</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-lg order-2 lg:order-1">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Deployment Methods</span>
                  <span className="text-sm text-blue-600 font-medium">Optimized</span>
                </div>
                <div className="space-y-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">Redirects (Recommended)</div>
                    <div className="text-xs text-gray-500 mt-1">Non-intrusive • Works with any framework</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">Edge Functions</div>
                    <div className="text-xs text-gray-500 mt-1">Ultra-fast • Global edge network</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">Static Files</div>
                    <div className="text-xs text-gray-500 mt-1">Simple • Direct file deployment</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Multiple Deployment Methods</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Choose the deployment method that works best for your project architecture. Each method 
                is optimized for different use cases and performance requirements.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span><strong>Redirects:</strong> Non-intrusive, works with existing projects</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span><strong>Edge Functions:</strong> Ultra-fast serverless deployment</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span><strong>Static Files:</strong> Simple direct file deployment</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span><strong>API Routes:</strong> Perfect for Next.js applications</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Secure OAuth Integration</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Connect your Vercel account securely using OAuth 2.0. SEOAgent only requests the minimum 
                permissions needed to deploy SEO files to your projects.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Industry-standard OAuth 2.0 authentication</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Granular permission scopes for security</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Revokable access tokens anytime</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Real-time deployment monitoring and logs</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-lg">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Integration Health</span>
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">OAuth Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Projects Access</span>
                    <span className="font-medium">4 Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Last Deployment</span>
                    <span className="font-medium">2 min ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Success Rate</span>
                    <span className="text-green-600 font-medium">100%</span>
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
              Why Choose SEOAgent Over Manual SEO File Management?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop wasting time on repetitive SEO file uploads. SEOAgent automates everything so you can focus on building great products.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-3 text-center">
              <div className="p-8 border-r border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Manual Upload Process</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Generate sitemaps manually</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Upload files to each project</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Remember to update after changes</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Monitor multiple projects</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Risk of outdated SEO files</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-blue-50 border-r border-gray-200">
                <h3 className="text-xl font-bold text-blue-600 mb-4">SEOAgent Automation</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Automatic sitemap generation</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Instant deployment via API</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Real-time content updates</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Multi-project management</span>
                  </div>
                  <div className="flex items-center justify-center text-green-600">
                    <span>✅ Always up-to-date SEO files</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Other SEO Tools</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ No Vercel integration</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ WordPress-focused</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Limited automation</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Complex setup</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span>❌ Manual file management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-black to-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Automate Your Vercel SEO Files?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-300">
            Join developers who&apos;ve eliminated manual SEO file uploads with SEOAgent. 
            Connect your Vercel account in 30 seconds and never upload another sitemap.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link 
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 flex items-center"
            >
              Connect Your Vercel Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <div className="text-gray-400">
              Free trial • No credit card required
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">30 sec</div>
              <div className="text-gray-400">Setup Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-gray-400">Automation</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">0</div>
              <div className="text-gray-400">Manual Uploads</div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}