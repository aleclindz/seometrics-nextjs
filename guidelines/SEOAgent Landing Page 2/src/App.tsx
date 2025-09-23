import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Rocket, Sparkles, ArrowRight, CheckCircle2, Bot, Send, Plug, FileText, Edit3, Globe, ShoppingCart, Building2, Zap, Search, Lightbulb, ChevronDown } from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import seoAgentLogo from "figma:asset/1a0e5e2394282cb3b1c2de4ad9784b80ec26d7dd.png";
import seoAgentIcon from "figma:asset/96c0d438bd0edbfd6752ddabcedb44c528d4bafc.png";

// --------------------------------------
// Small UI helpers (visuals & separators)
// --------------------------------------
function StatBadge({ label, value, trend }: { label: string; value: string; trend?: "up" | "down" }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
      {trend === "up" && <span className="text-emerald-600">↑</span>}
      {trend === "down" && <span className="text-rose-600">↓</span>}
    </div>
  );
}

function MiniSparkline() {
  return (
    <div className="h-16 w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#g)" strokeWidth="3" points="0,45 20,40 40,42 60,30 80,34 100,22 120,28 140,18 160,24 180,16 200,20" />
        <polyline fill="url(#g)" opacity="0.12" points="0,60 0,45 20,40 40,42 60,30 80,34 100,22 120,28 140,18 160,24 180,16 200,20 200,60" />
      </svg>
    </div>
  );
}

function DividerGlow() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />
    </div>
  );
}

/**
 * SEOAgent Landing Wireframe (React)
 * -------------------------------------------------
 * Clean landing hero + chat demo with rotating suggestions, benefit-first copy,
 * integrations, outcome-driven sections, and a no-agency pitch. Designed to be
 * iterated in Figma or shipped directly.
 */

// --- Configurable content ---
const SUGGESTIONS = [
  "Help me understand how many people find my business from ChatGPT",
  "Recommend new keywords for my landing page",
  "Write and auto-publish 10 more blog articles this week",
  "Help me understand the reports from Google Search Console",
];

const FEATURE_POINTS = [
  { 
    boldText: "Automate the boring stuff:", 
    regularText: "SEOAgent handles technical SEO and publishes new content on schedule, so your site grows every week." 
  },
  { 
    boldText: "Get discovered sooner:", 
    regularText: "fresh sitemaps, robots updates, and structure that search and ChatGPT understand." 
  },
  { 
    boldText: "SEO Strategy you can understand:", 
    regularText: "clear explanations and prioritized next steps in plain English." 
  },
];

// --- Integrations & Benefits content ---
const INTEGRATIONS = [
  { name: "Strapi", desc: "Auto-publish drafts or scheduled releases via API/webhooks.", key: "strapi" },
  { name: "WordPress", desc: "Publish posts & pages with featured images and meta.", key: "wordpress" },
  { name: "Shopify", desc: "Push blog posts and product SEO updates to your store.", key: "shopify" },
];

const BENEFIT_CARDS = [
  { icon: <FileText />, title: "Be found faster", body: "We keep sitemap.xml & sitemap.xml.gz fresh, update robots.txt, and nudge crawlers so new pages get discovered sooner—no more waiting weeks." },
  { icon: <Globe />, title: "Semantic visibility", body: "We structure content, schema, and internal links so search engines and AI assistants understand your topics, entities, and intent." },
  { icon: <Edit3 />, title: "Write & auto‑publish", body: "The agent drafts, reviews, and ships articles aligned to the strategy you develop together—on a reliable weekly cadence." },
  { icon: <MessageSquare />, title: "Plain‑English insights", body: "Understand your Search Console reports without jargon—plus prioritized next steps you can approve in one click." },
];

const AUDIENCE_CARDS = [
  { icon: <Building2 />, title: "Software & SaaS", body: "Turn docs, changelogs, and feature pages into cohesive topic clusters that capture solution‑aware demand." },
  { icon: <Building2 />, title: "Local & small business", body: "Fix schema/NAP, publish service pages, and rank for 'near me' searches—without hiring an agency." },
  { icon: <ShoppingCart />, title: "E‑commerce", body: "Fill content gaps, optimize collection pages, and auto‑link related items to boost long‑tail traffic." },
];

export default function App() {
  // Lightweight client-side smoke tests (dev-only)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.assert(SUGGESTIONS.length > 0, "SUGGESTIONS should have items");
      console.assert(BENEFIT_CARDS.length === 4, "Expected 4 benefit cards");
      console.assert(INTEGRATIONS.length === 3, "Expected 3 integrations");
      console.assert(AUDIENCE_CARDS.length === 3, "Expected 3 audience cards");
    }
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Background */}
      <BackgroundCanvas />

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center">
            <img src={seoAgentLogo} alt="SEOAgent" className="h-8" />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a className="hover:text-slate-900 transition-colors" href="#how">How it works</a>
            <a className="hover:text-slate-900 transition-colors" href="#pricing">Pricing</a>
            <IntegrationsDropdown />
            <a className="hover:text-slate-900 transition-colors" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:inline-flex">Log in</Button>
            <Button className="gap-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90">Start trial <ArrowRight size={16} /></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        {/* Floating Visual Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-600/20 blur-xl"
          />
          <motion.div
            animate={{ 
              x: [0, -25, 0],
              y: [0, 15, 0],
              rotate: [0, -3, 0]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute top-32 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-pink-600/20 blur-xl"
          />
          <motion.div
            animate={{ 
              x: [0, 20, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4
            }}
            className="absolute bottom-20 left-1/4 w-40 h-40 rounded-full bg-gradient-to-br from-violet-400/15 to-indigo-600/15 blur-2xl"
          />
          

        </div>

        <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 sm:pt-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Headline + value prop */}
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-3 py-1 text-xs mb-4 shadow-md">
                <Bot size={14} /> <span>Autonomous SEO Agent</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
                Grow your traffic with an AI agent that gets you found on Google and ChatGPT.
              </h1>
              <p className="mt-4 text-slate-600 max-w-xl">SEOAgent plugs into your site, handles the technical SEO that makes you visible to search & answer engines, and automates high‑quality publishing—so your reach grows every day.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90"><Rocket size={18} /> Start trial</Button>
                <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50">Get free website audit</Button>
              </div>

            </div>

            {/* Right: Chat demo */}
            <div className="relative">
              <ChatShowcase suggestions={SUGGESTIONS} />
              
              {/* Additional glow behind chat */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 rounded-2xl blur-3xl -z-10 scale-110" />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 bg-white border-y border-slate-200/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-6">100+ teams growing with SEOAgent</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 max-w-5xl mx-auto">
              {[
                "500% traffic growth",
                "87% faster indexing",
                "42% more ChatGPT mentions",
                "10x organic leads",
                "3x better rankings", 
                "91% less maintenance"
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="text-sm font-medium text-slate-700"
                >
                  {stat}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="relative z-10 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-fuchsia-500/5" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow-lg">
                  <Zap size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Automate the boring stuff</h3>
                <p className="text-slate-600 leading-relaxed">SEOAgent handles technical SEO and publishes new content on schedule, so your site grows every week.</p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow-lg">
                  <Search size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Get discovered sooner</h3>
                <p className="text-slate-600 leading-relaxed">fresh sitemaps, robots updates, and structure that search and ChatGPT understand.</p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 mx-auto shadow-lg">
                  <Lightbulb size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">SEO Strategy you can understand</h3>
                <p className="text-slate-600 leading-relaxed">clear explanations and prioritized next steps in plain English.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 bg-gradient-to-b from-white to-slate-50/30" id="integrations">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Integrates with your stack
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Connect in minutes—publish directly from your CMS and storefront.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Website Builders Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-6 mx-auto shadow-lg">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Website Builders</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Deploy SEO optimizations directly to your site without touching staging environments or build processes.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Lovable", key: "lovable" },
                  { name: "v0", key: "v0" },
                  { name: "Wix", key: "wix" },
                  { name: "Replit", key: "replit" }
                ].map((builder, i) => (
                  <motion.div
                    key={builder.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="h-12 w-20 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center hover:from-slate-200 hover:to-slate-300 transition-all duration-200"
                  >
                    <span className="text-xs font-medium text-slate-600">{builder.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CMS Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-6 mx-auto shadow-lg">
                <FileText size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Content Management</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Auto-publish SEO-optimized content directly to your CMS with proper meta tags, featured images, and schema markup.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Strapi", key: "strapi" },
                  { name: "WordPress", key: "wordpress" },
                  { name: "Contentful", key: "contentful" }
                ].map((cms, i) => (
                  <motion.div
                    key={cms.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="h-12 w-20 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center hover:from-slate-200 hover:to-slate-300 transition-all duration-200"
                  >
                    <span className="text-xs font-medium text-slate-600">{cms.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Web Hosts Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-6 mx-auto shadow-lg">
                <Rocket size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Web Hosting</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Automatically update sitemaps, robots.txt, and trigger redeployments to ensure search engines discover your latest content faster.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Vercel", key: "vercel" },
                  { name: "Netlify", key: "netlify" }
                ].map((host, i) => (
                  <motion.div
                    key={host.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="h-12 w-20 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center hover:from-slate-200 hover:to-slate-300 transition-all duration-200"
                  >
                    <span className="text-xs font-medium text-slate-600">{host.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Results & Benefits */}
      <section className="relative z-10 bg-white" id="outcomes">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-white to-white" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Traffic outcomes, not feature checklists
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
              We emphasize results: faster discovery, clearer insights, and consistent publishing—so you grow without becoming an SEO expert.
            </p>
          </motion.div>

          {/* Results Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <Card className="border border-slate-200/60 shadow-xl bg-white/95 backdrop-blur">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <StatBadge label="Indexing" value="+27%" trend="up" />
                    <StatBadge label="Clicks" value="+41%" trend="up" />
                    <StatBadge label="Avg. Pos." value="3.2" trend="up" />
                  </div>
                  <div className="w-full lg:w-auto">
                    <MiniSparkline />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFIT_CARDS.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 bg-white h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-4 shadow-md">
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{benefit.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Sections */}
      <section className="relative z-10 bg-gradient-to-b from-slate-50/50 to-white" id="who">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Built for software, small business, and e‑commerce
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
              The agent adapts to your model—product‑led growth, service‑led leads, or online storefronts—and executes a strategy that fits.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {AUDIENCE_CARDS.map((audience, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur h-full">
                  <CardContent className="p-8 text-center">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white grid place-items-center mb-6 mx-auto shadow-lg">
                      {audience.icon}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-3">{audience.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{audience.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 bg-white" id="how">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Get started in minutes, not hours. Three simple steps to automated SEO.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center relative"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-100 to-violet-100 rounded-full text-indigo-600 font-semibold text-lg mb-6">
                01
              </div>
              
              <div className="mb-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        <span className="text-sm font-mono">&lt;script src="seoagent.js"&gt;</span>
                      </div>
                      <div className="text-xs text-indigo-100">One line of code</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Connect your site</h3>
              <p className="text-slate-600">Add our lightweight snippet or install the plugin.</p>
              
              {/* Connecting line - hidden on mobile */}
              <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-indigo-300 to-transparent transform -translate-y-1/2 -translate-x-6"></div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center relative"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-100 to-violet-100 rounded-full text-indigo-600 font-semibold text-lg mb-6">
                02
              </div>
              
              <div className="mb-6">
                <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto-fix</span>
                        <div className="w-10 h-5 bg-white rounded-full relative">
                          <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0.5 right-0.5 transition-all"></div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-100">Fully automated</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Choose automation level</h3>
              <p className="text-slate-600">Flag issues only, one-click apply, or fully automatic with rollback.</p>
              
              {/* Connecting line - hidden on mobile */}
              <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-indigo-300 to-transparent transform -translate-y-1/2 -translate-x-6"></div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-center relative"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-100 to-violet-100 rounded-full text-indigo-600 font-semibold text-lg mb-6">
                03
              </div>
              
              <div className="mb-6">
                <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ranking</span>
                        <span className="text-lg font-semibold">↗ +23%</span>
                      </div>
                      <div className="text-xs text-emerald-100">This month</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Watch rankings compound</h3>
              <p className="text-slate-600">Weekly health report, instant fixes, fewer SEO tickets.</p>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Button className="gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90 px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300">
              Start your free audit
              <ArrowRight size={20} />
            </Button>
            <p className="text-sm text-slate-500 mt-3">No credit card required • 3-minute setup</p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 bg-gradient-to-b from-white to-slate-50/50" id="pricing">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-fuchsia-500/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
              Choose the plan that fits your growth goals. All plans include our core technical SEO automation.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 bg-white h-full relative">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Starter</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-semibold text-slate-900">$19</span>
                      <span className="text-slate-600">/month</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">Perfect for small businesses getting started</p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Technical SEO Management</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Sitemap & Robots.txt Management</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">3 automated articles per week</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Basic analytics & reporting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Email support</span>
                    </div>
                  </div>
                  
                  <Button className="w-full gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white">
                    Start trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-indigo-500/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-white h-full relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Pro</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-semibold text-slate-900">$39</span>
                      <span className="text-slate-600">/month</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">Ideal for growing businesses</p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Everything in Starter</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700"><strong>1 automated article per day</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Advanced schema markup</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Content optimization suggestions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Priority support</span>
                    </div>
                  </div>
                  
                  <Button className="w-full gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90">
                    Start trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Scale Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 bg-white h-full relative">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Scale</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-semibold text-slate-900">$99</span>
                      <span className="text-slate-600">/month</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">For enterprises and high-growth companies</p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Everything in Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700"><strong>3 automated articles per day</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Custom content strategy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Multiple site management</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">Dedicated success manager</span>
                    </div>
                  </div>
                  
                  <Button className="w-full gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white">
                    Start trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* FAQ or additional info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-sm text-slate-600">
              Start with a 7-day trial for $1. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 bg-slate-50" id="faq">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-slate-600">
              Everything you need to know about SEOAgent
            </p>
          </motion.div>

          <FAQSection />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  Still have questions?
                </h3>
                <p className="text-slate-600 mb-6">
                  Get in touch with our team or start your free audit to see SEOAgent in action.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90">
                    Start free audit
                    <ArrowRight size={16} />
                  </Button>
                  <Button variant="outline" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50">
                    Contact us
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-fuchsia-500/10" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-6">
              Ready to grow your organic traffic?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using SEOAgent to automate their SEO and grow their traffic every week.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button className="gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white border-0 hover:opacity-90 px-8 py-3">
                <Rocket size={18} /> 
                Start trial
              </Button>
              <Button variant="outline" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3">
                Get free website audit
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-50 border-t border-slate-200/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={seoAgentIcon} alt="SEOAgent" className="h-8 w-8" />
              <span className="font-semibold tracking-tight text-slate-900">SEOAgent</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-600">
              <a className="hover:text-slate-900 transition-colors" href="#privacy">Privacy</a>
              <a className="hover:text-slate-900 transition-colors" href="#terms">Terms</a>
              <a className="hover:text-slate-900 transition-colors" href="#security">Security</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/50 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} SEOAgent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ---------------------
// Supporting components
// ---------------------
function BackgroundCanvas() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {/* soft radial glow */}
      <div className="absolute inset-0 opacity-60" style={{
        background: "radial-gradient(50% 40% at 75% 0%, rgba(99,102,241,0.22) 0%, rgba(255,255,255,0) 60%), radial-gradient(45% 35% at 15% 25%, rgba(168,85,247,0.18) 0%, rgba(255,255,255,0) 60%), radial-gradient(35% 25% at 80% 60%, rgba(236,72,153,0.14) 0%, rgba(255,255,255,0) 60%)"
      }} />
      {/* subtle grid */}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-40" style={{
        backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)`,
        backgroundSize: "28px 28px"
      }} />
    </div>
  );
}

function ChatShowcase({ suggestions }: { suggestions: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % suggestions.length);
    }, 2800);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [suggestions.length]);

  const activeSuggestion = suggestions[activeIndex];

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

          {/* Rotating suggestion (single pill) */}
          <div className="mt-5">
            <div className="relative h-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSuggestion}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600 text-white px-3 py-2 text-sm shadow"
                >
                  <Sparkles size={14} className="opacity-70" />
                  <span className="whitespace-nowrap">{activeSuggestion}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Input row (non-functional) */}
          <div className="mt-5 flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Type a message…</div>
            <Button disabled className="gap-1"><Send size={16}/> Send</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
        <img src={seoAgentIcon} alt="SEOAgent" className="h-5 w-5" />
      </div>
      <div className="max-w-[32rem] rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-3 text-base shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[32rem] rounded-2xl rounded-tr-sm border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm">
        {children}
      </div>
      <div className="h-8 w-8 rounded-full bg-emerald-500 text-white grid place-items-center">A</div>
    </div>
  );
}

function IntegrationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1 hover:text-slate-900 transition-colors">
        Integrations
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200/60 py-2 z-50"
          >
            <a 
              href="https://seoagent.com/strapi" 
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Strapi
            </a>
            <a 
              href="https://seoagent.com/vercel" 
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Vercel
            </a>
            <a 
              href="https://seoagent.com/wordpress" 
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              WordPress
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How safe are auto-fixes?",
      answer: "All auto-fixes are thoroughly tested and reversible. SEOAgent implements changes gradually, monitors for any issues, and can instantly roll back if needed. We only make changes that follow established SEO best practices and never touch critical site functionality."
    },
    {
      question: "Will this replace my SEO agency?",
      answer: "SEOAgent handles the technical foundation and content production, but you may still want strategic guidance for complex campaigns. Many of our users reduce agency costs by 60-80% while achieving better results, using agencies only for high-level strategy rather than execution."
    },
    {
      question: "Does it work with WordPress/Webflow/Shopify/Next.js?",
      answer: "Yes! SEOAgent integrates with all major platforms including WordPress, Shopify, Webflow, Next.js, Strapi, and many others. We connect via APIs, webhooks, or direct file management depending on your setup."
    },
    {
      question: "Is AI content generation included?",
      answer: "Yes, all plans include AI-powered content generation. SEOAgent creates SEO-optimized blog posts, product descriptions, and landing pages that align with your strategy. Content is fact-checked, brand-aligned, and ready to publish or can be reviewed before going live."
    },
    {
      question: "What happens to my data?",
      answer: "Your data remains completely private and secure. We use enterprise-grade encryption, never share information with third parties, and you can export or delete your data at any time. SEOAgent only accesses what's necessary to optimize your site."
    },
    {
      question: "How quickly will I see results?",
      answer: "Technical improvements are implemented within 24-48 hours. You'll typically see indexing improvements within 1-2 weeks, and traffic growth within 4-8 weeks as new content gains traction. The timeline depends on your site's current state and competition level."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          viewport={{ once: true }}
        >
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardContent className="p-0">
              <button
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                aria-expanded={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-slate-900 pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown size={20} className="text-slate-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}