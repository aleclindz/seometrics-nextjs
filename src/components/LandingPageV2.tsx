'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Rocket, ArrowRight, Bot, Zap, Search, Lightbulb } from 'lucide-react';

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeaderV2 />
      <main>
        <HeroV2 />
        <ValuePropsV2 />
      </main>
      <FooterV2 />
    </div>
  );
}

function HeaderV2() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/SEOAgent_logo.png" alt="SEOAgent" width={140} height={36} />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
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
          <Link href="/login" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900">Log in</Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90"
          >
            Start trial <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroV2() {
  return (
    <section className="relative overflow-hidden">
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
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 px-5 py-3 rounded-lg font-semibold shadow hover:opacity-90"
              >
                <Rocket size={18} /> Start trial
              </Link>
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="font-semibold">Always‑on technical SEO</div>
                  <div className="text-sm text-slate-500">Indexing guardrails, meta/schema, internal links</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><span className="h-2 w-2 bg-green-500 rounded-full" /> Auto‑updates sitemaps & robots.txt</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 bg-green-500 rounded-full" /> Fixes titles/descriptions at scale</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 bg-green-500 rounded-full" /> Publishes articles on a weekly cadence</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValuePropsV2() {
  return (
    <section className="bg-gradient-to-b from-slate-50/50 to-white py-16">
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

function FooterV2() {
  return (
    <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500 bg-white">
      <div className="mx-auto max-w-6xl px-4">© {new Date().getFullYear()} SEOAgent. All rights reserved.</div>
    </footer>
  );
}
