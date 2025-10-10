'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import {
  Code,
  Rocket,
  Shield,
  TrendingUp,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Search
} from 'lucide-react';

export default function WebDevelopmentPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <main>
        <HeroSection />
        <BenefitsSection />
        <ExpertiseSection />
        <PartnerSpotlight />
        <ProcessSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const router = useRouter();
  const { user } = useAuth();

  const startTrial = () => {
    if (user?.token) {
      router.push('/pricing');
    } else {
      router.push('/login?mode=signup');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/SEOAgent_logo.png" alt="SEOAgent" width={140} height={36} />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
          <a
            href="https://calendly.com/alec-aleclindz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900 transition-colors"
          >
            Contact Us
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user?.token ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900">Dashboard</Link>
              <Link href="/account" className="inline-flex items-center gap-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50">
                Account
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900">Log in</Link>
              <button
                onClick={startTrial}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90"
              >
                Start trial <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-3 py-1 text-xs mb-6 shadow">
            <Code size={14} /> <span>Professional Web Development</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-tight mb-6">
            The Benefits of Hiring a Professional Web Developer
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            In today&apos;s digital landscape, your website is often the first impression customers have of your business. Investing in professional web development isn&apos;t just about building a site—it&apos;s about creating a powerful digital asset that drives growth.
          </p>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: Rocket,
      title: 'Custom Solutions for Your Business',
      description: 'Generic templates can&apos;t capture your unique value proposition. Professional developers create tailored solutions that align perfectly with your business goals and brand identity.'
    },
    {
      icon: Shield,
      title: 'Security & Reliability',
      description: 'Professional developers implement robust security measures, regular updates, and best practices to protect your site from vulnerabilities and ensure consistent uptime.'
    },
    {
      icon: TrendingUp,
      title: 'SEO-Optimized from Day One',
      description: 'A well-built website is search-engine friendly by design. Professional developers understand technical SEO fundamentals—fast loading speeds, mobile responsiveness, clean code, and proper meta structure.'
    },
    {
      icon: Zap,
      title: 'Performance That Converts',
      description: 'Every second counts. Professional developers optimize your site for lightning-fast load times, smooth interactions, and exceptional user experience that turns visitors into customers.'
    },
    {
      icon: Users,
      title: 'Scalability for Growth',
      description: 'As your business grows, your website needs to grow with it. Professional developers build scalable architectures that handle increased traffic and new features without breaking.'
    },
    {
      icon: Code,
      title: 'Clean, Maintainable Code',
      description: 'Professional code is easier to update, debug, and extend. This means lower maintenance costs and faster feature development as your needs evolve.'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold mb-4">Why Professional Development Matters</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            The difference between a DIY website and professional development can mean the difference between struggling online and dominating your market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 shadow">
                <benefit.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpertiseSection() {
  const expertise = [
    { icon: Globe, label: 'Modern Frameworks', description: 'React, Next.js, Vue, Angular' },
    { icon: Code, label: 'E-commerce', description: 'Shopify, WooCommerce, Custom' },
    { icon: Search, label: 'CMS Integration', description: 'WordPress, Strapi, Contentful' },
    { icon: Sparkles, label: 'Performance', description: 'Speed optimization & Core Web Vitals' }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-semibold mb-4">Expert-Level Capabilities</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Professional web developers bring specialized skills across multiple platforms and technologies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {expertise.map((item, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-lg p-6 text-center hover:border-indigo-300 transition-colors">
              <item.icon className="w-10 h-10 mx-auto mb-4 text-indigo-600" />
              <h4 className="font-semibold mb-2">{item.label}</h4>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerSpotlight() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 rounded-2xl p-8 md:p-12 border border-indigo-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Sparkles size={14} /> Trusted Partner
              </div>
              <h2 className="text-3xl font-semibold mb-4">Looking for Shopify & WordPress Expertise?</h2>
              <p className="text-slate-700 mb-6 leading-relaxed">
                When it comes to e-commerce and content management, working with specialists makes all the difference. For businesses needing Shopify development, WordPress customization, or comprehensive SEO integration, we recommend partnering with certified experts who understand both the technical and business sides.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Certified Shopify experts with proven e-commerce results</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">WordPress agency experience for scalable content sites</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">SEO-focused development that drives organic traffic</span>
                </div>
              </div>
              <a
                href="https://bkthemes.design/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-opacity"
              >
                Visit BKThemes <ArrowRight size={18} />
              </a>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-semibold text-lg mb-2">BKThemes</h3>
                  <p className="text-sm text-slate-600">
                    Certified Shopify expert, freelance web developer, and SEO specialist offering quality web development and SEO services with a focus on client satisfaction and proven results.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Specializations:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Shopify Expert', 'WordPress Agency', 'SEO Specialist', 'E-commerce', 'Custom Development'].map((tag) => (
                      <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const steps = [
    {
      number: '01',
      title: 'Discovery & Planning',
      description: 'Understanding your business goals, target audience, and technical requirements to create a roadmap for success.'
    },
    {
      number: '02',
      title: 'Design & Development',
      description: 'Building a custom solution with clean code, modern frameworks, and best practices for performance and SEO.'
    },
    {
      number: '03',
      title: 'Testing & Launch',
      description: 'Rigorous testing across devices and browsers, followed by a smooth launch with monitoring and support.'
    },
    {
      number: '04',
      title: 'Growth & Optimization',
      description: 'Ongoing maintenance, performance optimization, and feature development as your business scales.'
    }
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold mb-4">The Development Process</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Professional web development follows a proven process to ensure quality results and minimize risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-xl p-6 h-full border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="text-5xl font-bold text-indigo-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-indigo-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const router = useRouter();
  const { user } = useAuth();

  const handleStartTrial = () => {
    if (user?.token) {
      router.push('/pricing');
    } else {
      router.push('/login?mode=signup');
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-semibold mb-6">
          Ready to Level Up Your Website?
        </h2>
        <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
          Whether you&apos;re building a new site or optimizing an existing one, professional development combined with automated SEO is the winning formula.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleStartTrial}
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-indigo-50 transition-colors"
          >
            <Rocket size={20} /> Try SEOAgent Free
          </button>
          <a
            href="https://calendly.com/alec-aleclindz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
          >
            Schedule Consultation
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="inline-block mb-4">
              <Image src="/assets/SEOAgent_logo.png" alt="SEOAgent" width={120} height={30} className="brightness-0 invert" />
            </Link>
            <p className="text-sm text-slate-400">
              Autonomous SEO agent that helps you get found on Google and ChatGPT.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/free-audit" className="hover:text-white">Free Audit</Link></li>
              <li><Link href="/" className="hover:text-white">How it Works</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Integrations</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/wordpress" className="hover:text-white">WordPress</Link></li>
              <li><Link href="/shopify" className="hover:text-white">Shopify</Link></li>
              <li><Link href="/strapi" className="hover:text-white">Strapi</Link></li>
              <li><Link href="/vercel" className="hover:text-white">Vercel</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li>
                <a
                  href="https://calendly.com/alec-aleclindz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} SEOAgent. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
