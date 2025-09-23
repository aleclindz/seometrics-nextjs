'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Rocket, ArrowRight, Bot, Zap, Search, Lightbulb, Sparkles, Send } from 'lucide-react';
import PricingSection from '@/components/PricingSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeaderV2 />
      <main>
        <HeroV2 />
        <SocialProofV2 />
        <ValuePropsV2 />
        <ResultsV2 />
        <IntegrationsV2 />
        <AudienceV2 />
        <HowItWorksV2 />
        <PricingSection />
        <FAQV2 />
        <FinalCTAV2 />
      </main>
      <FooterV2 />
    </div>
  );
}

function HeaderV2() {
  const router = useRouter();
  const { user } = useAuth();

  const startTrial = () => {
    // If already authenticated, send to pricing to enable trial/checkout
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
          <div className="relative group">
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Integrations</span>
            <div className="absolute left-0 mt-2 hidden group-hover:block">
              <div className="w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                <Link href="/wordpress" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">WordPress</Link>
                <Link href="/strapi" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Strapi</Link>
                <Link href="/shopify" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Shopify</Link>
                <Link href="/vercel" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Vercel</Link>
              </div>
            </div>
          </div>
          <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
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
          <a href="/login" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900">Log in</a>
          <button
            onClick={startTrial}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90"
          >
            Start trial <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroV2() {
  const router = useRouter();
  const { user } = useAuth();
  const handleStartTrial = () => {
    if (user?.token) router.push('/pricing'); else router.push('/login?mode=signup');
  };
  return (
    <section className="relative overflow-hidden" id="hero">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-3 py-1 text-xs mb-4 shadow">
              <Bot size={14} /> <span>Autonomous SEO Agent</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
              Grow your traffic with an AI agent that gets you found on Google and ChatGPT.
            </h1>
            <p className="mt-4 text-slate-600 max-w-xl">
              SEOAgent plugs into your site, handles the technical SEO that makes you visible to search & answer engines, and automates high‑quality publishing—so your reach grows every day.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartTrial}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 px-5 py-3 rounded-lg font-semibold shadow hover:opacity-90"
              >
                <Rocket size={18} /> Start trial
              </button>
              <Link
                href="/free-audit"
                className="inline-flex items-center gap-2 border border-indigo-300 text-indigo-700 px-5 py-3 rounded-lg font-semibold hover:bg-indigo-50"
              >
                Get free website audit
              </Link>
              <a
                href="https://calendly.com/alec-aleclindz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-3 rounded-lg font-semibold hover:bg-slate-50"
              >
                Contact Us
              </a>
            </div>
          </div>
          <div>
            <ChatShowcaseV2 />
          </div>
      </div>
    </div>
  </section>
  );
}

function ValuePropsV2() {
  return (
    <section className="bg-gradient-to-b from-slate-50/50 to-white py-16" id="value">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow">
              <Zap size={20} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Automate the boring stuff</h3>
            <p className="text-slate-600 max-w-sm mx-auto">SEOAgent handles technical SEO and publishes new content on schedule, so your site grows every week.</p>
          </div>
          <div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow">
              <Search size={20} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Get discovered sooner</h3>
            <p className="text-slate-600 max-w-sm mx-auto">Fresh sitemaps, robots updates, and structure that search and ChatGPT understand.</p>
          </div>
          <div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow">
              <Lightbulb size={20} />
            </div>
            <h3 className="text-xl font-semibold mb-2">SEO Strategy you can understand</h3>
            <p className="text-slate-600 max-w-sm mx-auto">Clear explanations and prioritized next steps in plain English.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Lightweight reimplementation of the chat card without Framer Motion
function ChatShowcaseV2() {
  const suggestions = [
    'Help me understand how many people find my business from ChatGPT',
    'Recommend new keywords for my landing page',
    'Write and auto‑publish 10 more blog articles this week',
    'Help me understand the reports from Google Search Console',
  ];
  const [active, setActive] = React.useState(0);
  const [fadeState, setFadeState] = React.useState<'in' | 'out'>('in');

  React.useEffect(() => {
    const id = setInterval(() => {
      setFadeState('out');
      const t = setTimeout(() => {
        setActive((prev) => (prev + 1) % suggestions.length);
        setFadeState('in');
      }, 220);
      return () => clearTimeout(t);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="border-slate-200/70 shadow-lg">
      <CardContent className="p-0">
        <div className="p-4 sm:p-6">
          {/* Fake window chrome */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>

          {/* Chat stream */}
          <div className="space-y-3">
            <AssistantBubble>
              One of the blog articles published last month is getting a lot of traction. Would you like me to write 10 more articles on the same topic?
            </AssistantBubble>
          </div>

          {/* Rotating suggestion pill (CSS fade/slide) */}
          <div className="mt-5 h-10 relative">
            <div
              className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600 text-white px-3 py-2 text-sm shadow transition-all duration-200 ${
                fadeState === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
              }`}
            >
              <Sparkles size={14} className="opacity-80" />
              <span className="whitespace-nowrap">{suggestions[active]}</span>
            </div>
          </div>

          {/* Input row (non-functional) */}
          <div className="mt-5 flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Type a message…</div>
            <Button disabled className="gap-1" variant="outline">
              <Send size={16} /> Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[520px] rounded-2xl bg-slate-50 text-slate-800 border border-slate-200 p-3 text-sm shadow-sm">
      {children}
    </div>
  );
}

function SocialProofV2() {
  const stats = [
    '500% traffic growth',
    '87% faster indexing',
    '42% more ChatGPT mentions',
    '10x organic leads',
    '3x better rankings',
    '91% less maintenance',
  ];
  return (
    <section className="bg-white border-y border-slate-100" id="proof">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-5">Teams growing with SEOAgent</p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 max-w-5xl mx-auto">
          {stats.map((s) => (
            <div key={s} className="text-sm font-medium text-slate-700">{s}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsV2() {
  return (
    <section className="bg-white py-16" id="results">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Traffic outcomes, not checklists</h2>
          <p className="mt-3 text-slate-600 max-w-3xl mx-auto">Faster discovery, clearer insights, and consistent publishing—grow without becoming an SEO expert.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <Stat label="Indexing" value="+27%" up />
              <Stat label="Clicks" value="+41%" up />
              <Stat label="Avg. Pos." value="3.2" />
            </div>
            <div className="w-full lg:w-auto">
              <MiniSparklineV2 />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
      {up !== undefined && <span className={up ? 'text-emerald-600' : 'text-rose-600'}>{up ? '↑' : '↓'}</span>}
    </div>
  );
}

function MiniSparklineV2() {
  return (
    <div className="h-16 w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#g2)" strokeWidth="3" points="0,45 20,40 40,42 60,30 80,34 100,22 120,28 140,18 160,24 180,16 200,20" />
        <polyline fill="url(#g2)" opacity="0.12" points="0,60 0,45 20,40 40,42 60,30 80,34 100,22 120,28 140,18 160,24 180,16 200,20 200,60" />
      </svg>
    </div>
  );
}

function IntegrationsV2() {
  const cmsList = [
    { name: 'Strapi', desc: 'Auto-publish drafts or scheduled releases', key: 'strapi' },
    { name: 'WordPress', desc: 'Posts & pages with featured images and meta', key: 'wordpress' },
    { name: 'Shopify', desc: 'Blog posts and product SEO updates', key: 'shopify' },
  ];
  const hosts = [
    { name: 'Vercel', key: 'vercel' },
    { name: 'Netlify', key: 'netlify' },
  ];
  return (
    <section className="bg-gradient-to-b from-white to-slate-50/30 py-16" id="integrations">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold">Works with your stack</h2>
          <p className="text-slate-600 mt-2">CMS & hosting integrations out of the box.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {cmsList.map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold mb-1">{c.name}</div>
              <div className="text-sm text-slate-600">{c.desc}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {hosts.map((h) => (
            <div key={h.key} className="h-12 w-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center">
              <span className="text-xs font-medium text-slate-600">{h.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceV2() {
  const cards = [
    { title: 'Software & SaaS', body: 'Turn docs, changelogs, and features into clusters that capture demand.' },
    { title: 'Local & small business', body: 'Fix schema/NAP, publish service pages, and rank for “near me” searches.' },
    { title: 'E‑commerce', body: 'Fill content gaps, optimize collections, and auto‑link related items.' },
  ];
  return (
    <section className="bg-white py-16" id="who">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold">Built for software, small business, and e‑commerce</h2>
          <p className="text-slate-600 mt-2 max-w-3xl mx-auto">The agent adapts to your model—product‑led growth, service‑led leads, or storefronts—and executes a strategy that fits.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold mb-2">{c.title}</div>
              <div className="text-slate-600 text-sm">{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksV2() {
  const steps = [
    { title: 'Connect & verify', body: 'SEOAgent.js + GSC so the agent can act and measure.' },
    { title: 'Plan your topics', body: 'Pick clusters and let the agent propose briefs and cadence.' },
    { title: 'Publish & monitor', body: 'Agent drafts, publishes, and keeps pages healthy.' },
  ];
  return (
    <section className="bg-gradient-to-b from-slate-50/50 to-white py-16" id="how">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold">How it works</h2>
          <p className="text-slate-600 mt-2">Three steps to autonomous SEO.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 grid place-items-center font-semibold mb-4">{i + 1}</div>
              <div className="text-lg font-semibold mb-2">{s.title}</div>
              <div className="text-slate-600 text-sm">{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQV2() {
  const faqs = [
    {
      q: 'What is an AI SEO agent?',
      a: 'SEOAgent is an autonomous SEO system that manages technical SEO (sitemaps, robots, canonicals, schema), publishes optimized content on a schedule, and measures results using Google Search Console.'
    },
    {
      q: 'How does SEOAgent automate technical SEO?',
      a: 'It continuously audits your site, fixes metadata issues, updates sitemaps and robots.txt, maintains schema markup, and builds internal links—reducing manual SEO tickets and engineering overhead.'
    },
    {
      q: 'Does SEOAgent work with WordPress, Strapi, Shopify, and Vercel?',
      a: 'Yes. We support WordPress, Strapi (headless), Shopify blogs, and sites deployed on Vercel. Connect once and SEOAgent handles publishing and technical SEO automatically.'
    },
    {
      q: 'Will this replace my SEO agency?',
      a: 'No. SEOAgent automates repetitive technical and on‑page tasks so your team or agency can focus on strategy, brand, and high‑impact content.'
    },
    {
      q: 'Is it safe to let an agent change my site?',
      a: 'Yes. All changes are logged with optional approval flows and instant rollback. You can start in review mode and enable auto‑apply when comfortable.'
    },
    {
      q: 'How fast will I see results?',
      a: 'Most sites see improved crawl coverage and indexing within weeks, followed by compounding traffic growth as content is published and internal links build authority.'
    },
    {
      q: 'Do I need Google Search Console connected?',
      a: 'We recommend connecting GSC so the agent can track impressions, clicks, and coverage. It helps the agent prioritize fixes and validate impact.'
    },
    {
      q: 'What’s included in the paid plans?',
      a: 'All plans include automated technical SEO and AI content publishing. Higher tiers increase article volume, site count, analytics depth, and support levels.'
    }
  ];
  return (
    <section className="bg-gradient-to-b from-white to-slate-50/50 py-16" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{f.q}</summary>
              <p className="mt-2 text-slate-600 text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTAV2() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-12 text-center">
      <div className="mx-auto max-w-6xl px-4">
        <h3 className="text-2xl font-semibold text-white">Ready to grow with an AI SEO agent?</h3>
        <p className="text-violet-100 mt-2">Start a $1 trial, get a free audit, or talk to us.</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <a href="/login?mode=signup" className="inline-flex items-center gap-2 bg-white text-violet-700 px-5 py-3 rounded-lg font-semibold shadow hover:bg-violet-50">Start Trial</a>
          <a href="/free-audit" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-5 py-3 rounded-lg font-semibold hover:bg-white/20">Free Audit</a>
          <a href="https://calendly.com/alec-aleclindz/30min" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-5 py-3 rounded-lg font-semibold hover:bg-white/20">Contact Us</a>
        </div>
      </div>
    </section>
  );
}

function FooterV2() {
  return (
    <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500 bg-white">
      <div className="mx-auto max-w-6xl px-4">© {new Date().getFullYear()} SEOAgent. All rights reserved.</div>
    </footer>
  );
}
