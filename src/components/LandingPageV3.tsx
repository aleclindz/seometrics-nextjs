'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { ArrowRight, X, Network, Link2, FileText, Target, ChevronDown, Key, Clock, Zap, Shield, Search, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Utility: intersection observer hook for each section
function useSectionInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setInView(entry.isIntersecting));
      },
      {
        root: options?.root ?? null,
        rootMargin: options?.rootMargin ?? "-20% 0px -20% 0px",
        threshold: options?.threshold ?? 0.6,
      }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [options?.root, options?.rootMargin, options?.threshold]);

  return { ref, inView } as const;
}

export default function LandingPageV3() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SEOAgent",
    "applicationCategory": "BusinessApplication",
    "description": "Automated SEO content generation with strategic topic clusters, interlinking, and authoritative citations. Drive organic traffic on autopilot.",
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "49",
      "highPrice": "399",
      "priceCurrency": "USD",
      "priceSpecification": [
        {
          "@type": "UnitPriceSpecification",
          "price": "49",
          "priceCurrency": "USD",
          "name": "Starter Plan"
        },
        {
          "@type": "UnitPriceSpecification",
          "price": "149",
          "priceCurrency": "USD",
          "name": "Pro Plan"
        },
        {
          "@type": "UnitPriceSpecification",
          "price": "399",
          "priceCurrency": "USD",
          "name": "Scale Plan"
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "127"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#4E555C] overflow-x-hidden">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* Background Effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C5D8E4]/30 via-white to-white"></div>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[800px] h-[600px] bg-gradient-radial from-[#C5D8E4]/20 via-[#E8EEF2]/10 to-transparent blur-3xl opacity-60"></div>
      </div>

      {/* Header */}
      <HeaderV3 />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        <HeroV3 />
        <PlatformLogos />
        <TestimonialsSection />
        <HowItWorksV3 />
        <SEOInAgeOfAISection />
        <StrategicSEOScrollSnap />
        <ForFreelancersSection />
        <PricingSectionV3 />
        <ResultsSection />
        <FAQSection />
        <FinalCTA />
      </main>

      {/* Footer */}
      <FooterV3 />
    </div>
  );
}

function HeaderV3() {
  const router = useRouter();
  const { user } = useAuth();

  const handleCreateAccount = () => {
    if (user?.token) {
      router.push('/pricing');
    } else {
      router.push('/login?mode=signup');
    }
  };

  return (
    <div className="relative z-50 w-full flex justify-between items-center px-6 md:px-12 lg:px-20 xl:px-32 py-6">
      <Link href="/" className="flex items-center">
        <div className="text-2xl sm:text-3xl tracking-tight text-[#4E555C] font-semibold">
          SEOAgent
        </div>
      </Link>
      <div className="flex items-center gap-8">
        <nav className="hidden md:flex items-center gap-6">
          <a href="#how" className="text-[#6B7278] hover:text-[#6B35F5] transition-colors">
            How it Works
          </a>
          <a href="#pricing" className="text-[#6B7278] hover:text-[#6B35F5] transition-colors">
            Pricing
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-[#6B7278] hover:text-[#6B35F5] transition-colors bg-transparent border-0">
              Integrations
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/wordpress">WordPress</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/strapi">Strapi</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Ghost
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/shopify">Shopify</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Webflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="text-[#6B7278] hover:text-[#6B35F5] transition-colors">
            For SEO Professionals
          </button>
          <a href="#faq" className="text-[#6B7278] hover:text-[#6B35F5] transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user?.token ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex text-[#6B7278] hover:text-[#6B35F5]">
                Dashboard
              </Link>
              <Link href="/account">
                <Button variant="ghost" className="text-[#6B7278] hover:text-[#6B35F5]">
                  Account
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-[#6B7278] hover:text-[#6B35F5]">
                  Log In
                </Button>
              </Link>
              <Button
                onClick={handleCreateAccount}
                className="bg-[#6B35F5] hover:bg-[#582ED6] text-white"
              >
                Create Account
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroV3() {
  const router = useRouter();
  const [website, setWebsite] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store the website in sessionStorage for the audit page
    if (website) {
      sessionStorage.setItem('auditWebsite', website);
    }
    router.push('/free-audit');
  };

  return (
    <section className="text-center px-4 pt-8 md:pt-16 pb-8 max-w-6xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 mb-8 shadow-sm"
      >
        <span className="text-xs text-gray-600">Automated SEO Content Generation</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-6 text-[#4E555C] tracking-tight max-w-5xl mx-auto"
      >
        Strategic SEO Articles
        <br />
        <span className="text-[#6B35F5]">Auto-Published Every Day</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto"
      >
        Drive organic traffic on autopilot. No Slop. Just Strategic.
      </motion.p>

      {/* CTA Input */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto mb-6"
      >
        <div className="bg-white border-2 border-[#6B35F5]/30 rounded-xl p-2 shadow-[0_8px_30px_rgba(107,53,245,0.15)] hover:shadow-[0_8px_40px_rgba(107,53,245,0.25)] hover:border-[#6B35F5] transition-all duration-300 relative overflow-hidden">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6B35F5]/10 via-[#F3F6FF]/20 to-[#6B35F5]/10 animate-pulse"></div>

          <div className="relative flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full flex items-center">
              <Input
                type="url"
                placeholder="What&apos;s your website?"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xl py-6 px-4 placeholder:text-gray-400 placeholder:animate-glow-pulse"
                style={{
                  textShadow: '0 2px 12px rgba(107, 53, 245, 0.2)'
                }}
              />
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#6B35F5] to-[#582ED6] hover:from-[#582ED6] hover:to-[#4A25B8] text-white px-8 py-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                See what SEOAgent can do for you
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </div>
      </motion.form>
    </section>
  );
}

function PlatformLogos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="w-full py-12"
    >
      <p className="text-center text-sm text-gray-600 mb-6">Works with your existing website and content management system</p>
      <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
        <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-gray-700">WordPress</span>
        </div>
        <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-gray-700">Strapi</span>
        </div>
        <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-gray-700">Ghost</span>
        </div>
        <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-gray-700">Shopify</span>
        </div>
        <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-gray-700">Webflow</span>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialsSection() {
  const testimonials1 = [
    {
      quote: "SEOAgent transformed our content strategy. We&apos;ve seen a 300% increase in organic traffic in just 2 months.",
      name: "TechFlow SaaS",
      role: "B2B SaaS Platform",
      color: "#6B35F5",
      initials: "TF"
    },
    {
      quote: "Finally, SEO content that doesn&apos;t sound like it was written by a robot. The quality is outstanding.",
      name: "Michael Rodriguez",
      role: "SEO Freelancer",
      color: "#10B981",
      initials: "MR"
    },
    {
      quote: "We&apos;ve tried every SEO tool out there. SEOAgent is the only one that actually delivers on its promises.",
      name: "Bella&apos;s Cafe",
      role: "Local Coffee Shop Chain",
      color: "#3B82F6",
      initials: "BC"
    },
    {
      quote: "The strategic interlinking and topic clusters are game-changers. Our domain authority has skyrocketed.",
      name: "SaaSify",
      role: "Project Management SaaS",
      color: "#6B35F5",
      initials: "SF"
    }
  ];

  const testimonials2 = [
    {
      quote: "Set it and forget it. SEOAgent handles everything while we focus on building our product.",
      name: "Peak Roofing",
      role: "Regional Home Services",
      color: "#3B82F6",
      initials: "PR"
    },
    {
      quote: "The ROI is incredible. We&apos;re getting more qualified leads than ever before from organic search.",
      name: "Sarah Kim",
      role: "Independent SEO Consultant",
      color: "#10B981",
      initials: "SK"
    },
    {
      quote: "Best investment we&apos;ve made. Our blog traffic has 5x&apos;d and we&apos;re ranking for dozens of new keywords.",
      name: "CloudScale",
      role: "Analytics SaaS Platform",
      color: "#6B35F5",
      initials: "CS"
    },
    {
      quote: "Unlike other tools, SEOAgent creates content that actually ranks. No fluff, just results.",
      name: "Green Thumb Nursery",
      role: "Garden Center & Landscaping",
      color: "#3B82F6",
      initials: "GF"
    }
  ];

  const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonials1[0] }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 w-[400px] shrink-0 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[#4E555C] mb-4 italic">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
          style={{ backgroundColor: testimonial.color }}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-[#4E555C] font-medium">{testimonial.name}</p>
          <p className="text-sm text-[#6B7278]">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full py-20 overflow-hidden bg-gradient-to-b from-white to-[#F3F6FF]/30">
      <div className="text-center mb-12 px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          Loved by <span className="text-[#6B35F5]">SaaS Teams</span>, <span className="text-[#3B82F6]">SMBs</span>, and <span className="text-[#10B981]">SEO Freelancers</span>
        </h2>
        <p className="text-lg text-[#6B7278] max-w-2xl mx-auto">
          See what our customers are saying about SEOAgent
        </p>
      </div>

      {/* First Row - Scrolling Right - Seamless Infinite Loop */}
      <div className="relative mb-6 overflow-hidden">
        <div className="flex animate-scroll-right">
          {/* Duplicate the array enough times for seamless loop */}
          {[...Array(6)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {testimonials1.map((testimonial, index) => (
                <TestimonialCard key={`${setIndex}-${index}`} testimonial={testimonial} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Second Row - Scrolling Left - Seamless Infinite Loop */}
      <div className="relative overflow-hidden">
        <div className="flex animate-scroll-left">
          {/* Duplicate the array enough times for seamless loop */}
          {[...Array(6)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {testimonials2.map((testimonial, index) => (
                <TestimonialCard key={`${setIndex}-${index}`} testimonial={testimonial} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Add CSS for infinite scroll animation */}
      <style jsx>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-right {
          animation: scroll-right 60s linear infinite;
          will-change: transform;
        }

        .animate-scroll-left {
          animation: scroll-left 55s linear infinite;
          will-change: transform;
        }

        .animate-scroll-right:hover,
        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

function HowItWorksV3() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto px-4 pt-20 pb-12"
      id="how"
    >
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          How it works
        </h2>
        <p className="text-lg text-[#6B7278] max-w-2xl mx-auto">
          Watch SEOAgent in action
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* YouTube Video Embed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{ paddingBottom: '56.25%' }}
        >
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/MNf-abaTToo"
            title="SEOAgent - How it Works"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SEOInAgeOfAISection() {
  const router = useRouter();
  const [website, setWebsite] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store the website in sessionStorage for the audit page
    if (website) {
      sessionStorage.setItem('auditWebsite', website);
    }
    router.push('/free-audit');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto px-4 pt-20 pb-12"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-6 text-[#4E555C] tracking-tight">
          SEO is Different in the Age of AI
        </h2>
        <p className="text-lg text-[#6B7278] max-w-3xl mx-auto mb-8">
          Search engines are smarter than ever. Google&apos;s algorithm now prioritizes content that demonstrates{' '}
          <span className="text-[#6B35F5]">expertise, authority, and trust</span>. Generic AI-generated content doesn&apos;t cut it anymore.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-8"
          >
            <div className="flex items-start gap-3 mb-4">
              <X className="h-6 w-6 text-red-600 shrink-0 mt-1" />
              <h3 className="text-[#4E555C]">The Old Way</h3>
            </div>
            <ul className="space-y-3 text-[#6B7278]">
              <li className="flex items-start gap-2">
                <span className="text-red-500 shrink-0">•</span>
                <span>Pump out generic AI content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 shrink-0">•</span>
                <span>Hope for the best with search rankings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 shrink-0">•</span>
                <span>No strategic interlinking or structure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 shrink-0">•</span>
                <span>Isolated articles with no authority signals</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#F3F6FF] border-2 border-[#6B35F5]/30 rounded-2xl p-8"
          >
            <div className="flex items-start gap-3 mb-4">
              <Target className="h-6 w-6 text-[#6B35F5] shrink-0 mt-1" />
              <h3 className="text-[#4E555C]">The SEOAgent Way</h3>
            </div>
            <ul className="space-y-3 text-[#6B7278]">
              <li className="flex items-start gap-2">
                <span className="text-[#6B35F5] shrink-0">•</span>
                <span>Strategic topic clusters for topical authority</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6B35F5] shrink-0">•</span>
                <span>Intelligent internal linking architecture</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6B35F5] shrink-0">•</span>
                <span>Authoritative citations from trusted sources</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6B35F5] shrink-0">•</span>
                <span>Content designed for both humans and AI</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="text-lg text-[#6B7278] mb-8">
          Businesses that adapt to the new SEO landscape will dominate organic search. Those who don&apos;t will be left behind with unranked, low-quality content that search engines ignore.
        </p>
      </div>

      {/* CTA Input */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white border-2 border-[#6B35F5]/30 rounded-xl p-2 shadow-[0_8px_30px_rgba(107,53,245,0.15)] hover:shadow-[0_8px_40px_rgba(107,53,245,0.25)] hover:border-[#6B35F5] transition-all duration-300 relative overflow-hidden">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6B35F5]/10 via-[#F3F6FF]/20 to-[#6B35F5]/10 animate-pulse"></div>

          <div className="relative flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full flex items-center">
              <Input
                type="url"
                placeholder="What&apos;s your website?"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xl py-6 px-4 placeholder:text-gray-400 placeholder:animate-glow-pulse"
                style={{
                  textShadow: '0 2px 12px rgba(107, 53, 245, 0.2)'
                }}
              />
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#6B35F5] to-[#582ED6] hover:from-[#582ED6] hover:to-[#4A25B8] text-white px-8 py-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                See what SEOAgent can do for you
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}

function StrategicSEOScrollSnap() {
  const [active, setActive] = useState(1);
  const [maxActive, setMaxActive] = useState(1);
  const leftColRef = useRef<HTMLDivElement | null>(null);

  const s1 = useSectionInView<HTMLDivElement>({ root: leftColRef.current });
  const s2 = useSectionInView<HTMLDivElement>({ root: leftColRef.current });
  const s3 = useSectionInView<HTMLDivElement>({ root: leftColRef.current });
  const s4 = useSectionInView<HTMLDivElement>({ root: leftColRef.current });
  const s5 = useSectionInView<HTMLDivElement>({ root: leftColRef.current });

  useEffect(() => {
    let newActive = 1;
    if (s5.inView) newActive = 5;
    else if (s4.inView) newActive = 4;
    else if (s3.inView) newActive = 3;
    else if (s2.inView) newActive = 2;

    setActive(newActive);
    setMaxActive(prev => Math.max(prev, newActive));
  }, [s1.inView, s2.inView, s3.inView, s4.inView, s5.inView]);

  const PURPLE = "#6B35F5";
  const GREEN = "#86efac";

  const showClusterBadge = active >= 2;
  const showInterlinkHighlights = active >= 3;
  const showCitationHighlights = active >= 4;
  const showImageHighlights = active >= 5;

  return (
    <div className="w-full bg-white pt-20 pb-12">
      <div className="text-center mb-16 px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          Strategic SEO, Not AI Slop
        </h2>
        <p className="text-lg text-[#6B7278] max-w-3xl mx-auto">
          Watch how SEOAgent transforms a simple article into a strategic content asset.
        </p>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT: Sticky waterfall column */}
          <div
            ref={leftColRef}
            className="h-[85vh] overflow-y-auto snap-y snap-mandatory scrollbar-hide relative"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollSnapStop: "always"
            }}
          >
            {/* Section 1: AI Slop - Scrolls away */}
            <div ref={s1.ref} className="snap-start min-h-[85vh] pt-12 flex items-start">
              <div className="w-full max-w-xl">
                <div className="flex items-center gap-3 mb-4">
                  <X className="h-7 w-7 text-red-600" />
                  <h3 className="text-2xl md:text-3xl text-[#4E555C]">AI Article Slop</h3>
                </div>
                <p className="text-[#6B7278] text-base md:text-lg leading-relaxed">
                  Generic AI-generated content with no strategy, no structure, and no value for search engines.
                </p>
              </div>
            </div>

            {/* Single container for all sticky sections */}
            <div className="relative" style={{ minHeight: '340vh' }}>
              {/* All sticky elements rendered once at top of container */}
              <div
                className="sticky top-0 bg-white pb-6 pt-6 z-40"
                style={{
                  opacity: maxActive >= 2 ? 1 : 0,
                  transform: maxActive >= 2 ? 'translateY(0)' : 'translateY(20px)',
                  transition: maxActive >= 2 ? 'opacity 0.5s ease, transform 0.5s ease' : 'none',
                  pointerEvents: maxActive >= 2 ? 'auto' : 'none'
                }}
              >
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Network className="h-7 w-7" color="#6B35F5" />
                    <h3 className="text-2xl md:text-3xl text-[#4E555C]">Topic Clusters</h3>
                  </div>
                  <p className="text-[#6B7278] text-base md:text-lg leading-relaxed">
                    Content organized into strategic clusters around pillar topics to establish topical authority.
                  </p>
                </div>
              </div>

              <div
                className="sticky bg-white pb-6 pt-6 z-30"
                style={{
                  top: '136px',
                  opacity: maxActive >= 3 ? 1 : 0,
                  transform: maxActive >= 3 ? 'translateY(0)' : 'translateY(20px)',
                  transition: maxActive >= 3 ? 'opacity 0.5s ease, transform 0.5s ease' : 'none',
                  pointerEvents: maxActive >= 3 ? 'auto' : 'none'
                }}
              >
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Link2 className="h-7 w-7" color="#16a34a" />
                    <h3 className="text-2xl md:text-3xl text-[#4E555C]">Strategic Interlinking</h3>
                  </div>
                  <p className="text-[#6B7278] text-base md:text-lg leading-relaxed">
                    Intelligent contextual links between related articles to boost authority and keep readers engaged.
                  </p>
                </div>
              </div>

              <div
                className="sticky bg-white pb-6 pt-6 z-20"
                style={{
                  top: '272px',
                  opacity: maxActive >= 4 ? 1 : 0,
                  transform: maxActive >= 4 ? 'translateY(0)' : 'translateY(20px)',
                  transition: maxActive >= 4 ? 'opacity 0.5s ease, transform 0.5s ease' : 'none',
                  pointerEvents: maxActive >= 4 ? 'auto' : 'none'
                }}
              >
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-7 w-7" color="#6B35F5" />
                    <h3 className="text-2xl md:text-3xl text-[#4E555C]">Authoritative Citations</h3>
                  </div>
                  <p className="text-[#6B7278] text-base md:text-lg leading-relaxed">
                    Credible references from reputable sources to build trust with both readers and answer engines.
                  </p>
                </div>
              </div>

              <div
                className="sticky bg-white pb-6 pt-6 z-10"
                style={{
                  top: '408px',
                  opacity: maxActive >= 5 ? 1 : 0,
                  transform: maxActive >= 5 ? 'translateY(0)' : 'translateY(20px)',
                  transition: maxActive >= 5 ? 'opacity 0.5s ease, transform 0.5s ease' : 'none',
                  pointerEvents: maxActive >= 5 ? 'auto' : 'none'
                }}
              >
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <ImageIcon className="h-7 w-7" color="#6B35F5" />
                    <h3 className="text-2xl md:text-3xl text-[#4E555C]">Relevant Images</h3>
                  </div>
                  <p className="text-[#6B7278] text-base md:text-lg leading-relaxed">
                    Engaging, contextually-relevant images that enhance your content and improve reader engagement.
                  </p>
                </div>
              </div>

              {/* Invisible spacers for scroll snap points */}
              <div ref={s2.ref} className="snap-start" style={{ height: '85vh' }}></div>
              <div ref={s3.ref} className="snap-start" style={{ height: '85vh' }}></div>
              <div ref={s4.ref} className="snap-start" style={{ height: '85vh' }}></div>
              <div ref={s5.ref} className="snap-start" style={{ height: '85vh' }}></div>
            </div>
          </div>

          {/* RIGHT: Sticky article column */}
          <div className="relative h-[85vh]">
            <div className="sticky top-8 h-fit">
              <div className="rounded-2xl bg-white shadow-lg p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <motion.h4
                      key={active}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl md:text-2xl text-[#4E555C] mb-1"
                    >
                      {active === 1 ? 'Lorem Ipsum Dolor Sit Amet' : 'Marketing Automation Strategies for 2025'}
                    </motion.h4>
                  </div>

                  {/* Cluster Badge (appears at Section >= 2) */}
                  <AnimatePresence>
                    {showClusterBadge && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.35 }}
                        className="shrink-0"
                      >
                        <span
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white"
                          style={{ backgroundColor: PURPLE }}
                        >
                          <Network className="h-3 w-3" /> Cluster
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Article body - AI Slop version */}
                {active === 1 && (
                  <motion.div
                    key="slop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-11/12"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-10/12"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-9/12"></div>
                  </motion.div>
                )}

                {/* Article body - Strategic version */}
                {active >= 2 && (
                  <motion.div
                    key="strategic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Title Section */}
                    <div className="mt-4 mb-3">
                      <div className="h-2 rounded w-16" style={{ backgroundColor: PURPLE }}></div>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-11/12"></div>

                    {/* Header 1 Section */}
                    <div className="mt-5 mb-3">
                      <div className="h-2 rounded w-20" style={{ backgroundColor: PURPLE }}></div>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>

                    {/* Link with icon */}
                    {showInterlinkHighlights && (
                      <div className="flex items-center gap-2 my-2">
                        <Link2 className="h-3 w-3 text-green-500 shrink-0" />
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: GREEN }}
                          transition={{ duration: 0.5 }}
                          className="h-2.5 rounded w-10/12"
                        />
                      </div>
                    )}

                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>

                    {/* First Image (appears only at Section 5) */}
                    {showImageHighlights && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="rounded-lg overflow-hidden my-3"
                      >
                        <Image
                          src="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600&q=80"
                          alt="Business analytics dashboard"
                          width={600}
                          height={150}
                          className="w-full h-32 object-cover"
                        />
                      </motion.div>
                    )}

                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>

                    {/* Another link with icon */}
                    {showInterlinkHighlights && (
                      <div className="flex items-center gap-2 my-2">
                        <Link2 className="h-3 w-3 text-green-500 shrink-0" />
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: GREEN }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="h-2.5 rounded w-8/12"
                        />
                      </div>
                    )}

                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-10/12"></div>

                    {/* FAQ Section */}
                    <div className="mt-5 mb-3">
                      <div className="h-2 rounded w-14" style={{ backgroundColor: PURPLE }}></div>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-2.5 bg-gray-200 rounded w-11/12"></div>

                    {/* Third link with icon */}
                    {showInterlinkHighlights && (
                      <div className="flex items-center gap-2 my-2">
                        <Link2 className="h-3 w-3 text-green-500 shrink-0" />
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: GREEN }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-2.5 rounded w-9/12"
                        />
                      </div>
                    )}

                    <div className="h-2.5 bg-gray-200 rounded w-full"></div>

                    {/* Citations at the end */}
                    {showCitationHighlights && (
                      <>
                        <div className="mt-6 mb-2">
                          <div className="h-1.5 bg-gray-300 rounded w-20"></div>
                        </div>
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: PURPLE }}
                          transition={{ duration: 0.5 }}
                          className="h-2 rounded w-9/12"
                        />
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: PURPLE }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="h-2 rounded w-10/12"
                        />
                        <motion.div
                          initial={{ backgroundColor: "#e5e7eb" }}
                          animate={{ backgroundColor: PURPLE }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-2 rounded w-8/12"
                        />
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForFreelancersSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto px-4 pt-20 pb-12"
    >
      <div className="bg-gradient-to-br from-[#F3F6FF] via-[#F3F6FF]/70 to-white rounded-3xl p-8 md:p-12 border border-[#6B35F5]/20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 border border-[#6B35F5]/30 bg-white rounded-full px-4 py-2 mb-6 shadow-sm">
            <span className="text-xs text-[#6B35F5]">For Agencies & Freelancers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
            Level Up Your Client Results
          </h2>
          <p className="text-lg text-[#6B7278] max-w-3xl mx-auto">
            SEOAgent is built for SEO professionals who manage multiple clients and need to deliver consistent results at scale.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Manage Unlimited Websites */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#F3F6FF] rounded-xl flex items-center justify-center flex-shrink-0">
                <Network className="w-6 h-6 text-[#6B35F5]" />
              </div>
              <div>
                <h3 className="text-lg text-[#4E555C] mb-2">Manage Unlimited Websites</h3>
                <p className="text-sm text-[#6B7278] mb-3">
                  One unified interface to manage content across all your client websites. No more juggling multiple WordPress dashboards or CMSs.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#6B35F5]">
                  <span>✓ Multi-client dashboard</span>
                  <span>✓ Bulk operations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Automate Publishing */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#F3F6FF] rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-[#6B35F5]" />
              </div>
              <div>
                <h3 className="text-lg text-[#4E555C] mb-2">Automate Across All Clients</h3>
                <p className="text-sm text-[#6B7278] mb-3">
                  Set up content plans once and let SEOAgent auto-publish strategic articles for every client on your schedule.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#6B35F5]">
                  <span>✓ Scheduled publishing</span>
                  <span>✓ Custom calendars</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Strategy Assistant */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#D6D0E0]/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-[#A0B49D]" />
              </div>
              <div>
                <h3 className="text-lg text-[#4E555C] mb-2">AI-Assisted Strategy</h3>
                <p className="text-sm text-[#6B7278] mb-3">
                  Let AI help with the heavy lifting: keyword research, topic clustering, content gaps analysis, and competitive research.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#A0B49D]">
                  <span>✓ Smart recommendations</span>
                  <span>✓ Data-driven insights</span>
                </div>
              </div>
            </div>
          </div>

          {/* GSC & Technical SEO */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#A0B49D]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-[#7E9279]" />
              </div>
              <div>
                <h3 className="text-lg text-[#4E555C] mb-2">GSC Analysis & Technical SEO</h3>
                <p className="text-sm text-[#6B7278] mb-3">
                  Connect Google Search Console to analyze performance, identify opportunities, and get AI-powered technical SEO recommendations.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#7E9279]">
                  <span>✓ Performance tracking</span>
                  <span>✓ Technical audits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA for freelancers */}
        <div className="mt-10 text-center">
          <p className="text-[#6B7278] mb-4">
            Scale your SEO agency without hiring more writers or content managers.
          </p>
          <Button className="bg-[#6B35F5] hover:bg-[#582ED6] text-white px-8 py-6 rounded-lg shadow-md">
            <span className="flex items-center gap-2">
              Learn More
              <ArrowRight className="w-4 h-4" />
            </span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function PricingSectionV3() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGetStarted = (tier: string) => {
    if (user?.token) {
      router.push('/pricing');
    } else {
      router.push('/login?mode=signup');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl mx-auto px-4 pt-20 pb-12"
      id="pricing"
    >
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          Simple, Transparent Pricing
        </h2>
        <p className="text-lg text-[#6B7278] max-w-2xl mx-auto">
          Choose the plan that fits your growth goals. All plans include strategic topic clusters, interlinking, and citations.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Starter Plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-[#6B35F5]/50 hover:shadow-xl transition-all"
        >
          <div className="mb-6">
            <h3 className="text-xl text-[#4E555C] mb-2">Starter</h3>
            <p className="text-sm text-[#6B7278]">Perfect for new websites and blogs</p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl text-[#4E555C]">$49</span>
              <span className="text-[#6B7278]">/month</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="bg-[#F3F6FF] rounded-lg px-4 py-3 mb-4">
              <div className="text-2xl text-[#6B35F5] mb-1">3 articles/week</div>
              <div className="text-xs text-[#6B7278]">~12 articles per month</div>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Strategic topic clusters</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Auto-interlinking</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Authoritative citations</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>SEO optimization</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>1 website</span>
            </li>
          </ul>

          <Button
            onClick={() => handleGetStarted('starter')}
            className="w-full bg-white border-2 border-[#6B35F5] text-[#6B35F5] hover:bg-[#F3F6FF] py-6 rounded-lg"
          >
            Get Started
          </Button>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-br from-[#6B35F5] to-[#582ED6] border-2 border-[#6B35F5] rounded-2xl p-8 relative shadow-xl transform md:scale-105"
        >
          <div className="absolute top-0 right-6 -mt-3">
            <div className="bg-white text-[#6B35F5] text-xs px-3 py-1 rounded-full shadow-md">
              Most Popular
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl text-white mb-2">Pro</h3>
            <p className="text-sm text-white/80">For growing businesses</p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl text-white">$149</span>
              <span className="text-white/80">/month</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 mb-4 border border-white/30">
              <div className="text-2xl text-white mb-1">1 article/day</div>
              <div className="text-xs text-white/80">~30 articles per month</div>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2 text-sm text-white">
              <span className="mt-0.5">✓</span>
              <span>Everything in Starter, plus:</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white">
              <span className="mt-0.5">✓</span>
              <span>Daily publishing</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white">
              <span className="mt-0.5">✓</span>
              <span>Advanced topic research</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white">
              <span className="mt-0.5">✓</span>
              <span>GSC integration</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white">
              <span className="mt-0.5">✓</span>
              <span>3 websites</span>
            </li>
          </ul>

          <Button
            onClick={() => handleGetStarted('pro')}
            className="w-full bg-white text-[#6B35F5] hover:bg-white/90 py-6 rounded-lg shadow-lg"
          >
            Get Started
          </Button>
        </motion.div>

        {/* Scale Plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-[#6B35F5]/50 hover:shadow-xl transition-all"
        >
          <div className="mb-6">
            <h3 className="text-xl text-[#4E555C] mb-2">Scale</h3>
            <p className="text-sm text-[#6B7278]">For agencies & high-growth companies</p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl text-[#4E555C]">$399</span>
              <span className="text-[#6B7278]">/month</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="bg-gradient-to-br from-[#F3F6FF] to-[#F3F6FF]/80 rounded-lg px-4 py-3 mb-4 border border-[#6B35F5]/30">
              <div className="text-2xl text-[#6B35F5] mb-1">3 articles/day</div>
              <div className="text-xs text-[#6B7278]">~90 articles per month</div>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Everything in Pro, plus:</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>High-volume publishing</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Priority support</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>White-label option</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#6B7278]">
              <span className="text-[#6B35F5] mt-0.5">✓</span>
              <span>Unlimited websites</span>
            </li>
          </ul>

          <Button
            onClick={() => handleGetStarted('scale')}
            className="w-full bg-white border-2 border-[#6B35F5] text-[#6B35F5] hover:bg-[#F3F6FF] py-6 rounded-lg"
          >
            Get Started
          </Button>
        </motion.div>
      </div>

      {/* Additional info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-[#6B7278] mb-2">
          All plans include a 14-day trial for just $1 (fully refundable).
        </p>
        <p className="text-sm text-[#6B7278]">
          Need custom volume? <button className="text-[#6B35F5] hover:underline">Contact us</button> for enterprise pricing.
        </p>
      </div>
    </motion.div>
  );
}

function ResultsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="text-center px-4 pb-12 pt-20 max-w-6xl mx-auto w-full"
      id="results"
    >
      <div className="mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          Real results from real businesses
        </h2>
        <p className="text-lg text-[#6B7278] max-w-2xl mx-auto">
          Businesses using automated SEO content to drive consistent organic traffic
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#6B35F5]/50 hover:shadow-lg transition-all">
          <div className="text-4xl mb-2 text-[#6B35F5]">18K</div>
          <p className="text-[#6B7278]">Monthly Visitors</p>
          <p className="text-sm text-[#6B7278]/70 mt-2">Fintech SaaS</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#6B35F5]/50 hover:shadow-lg transition-all">
          <div className="text-4xl mb-2 text-[#6B35F5]">22K</div>
          <p className="text-[#6B7278]">Monthly Visitors</p>
          <p className="text-sm text-[#6B7278]/70 mt-2">Project Management</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#6B35F5]/50 hover:shadow-lg transition-all">
          <div className="text-4xl mb-2 text-[#6B35F5]">15K</div>
          <p className="text-[#6B7278]">Monthly Visitors</p>
          <p className="text-sm text-[#6B7278]/70 mt-2">Sales Platform</p>
        </div>
      </div>
    </motion.div>
  );
}

function FAQSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does automated content generation work?",
      answer: "Our AI analyzes your website and industry to identify high-value keywords and topics. It then generates 100 strategic article ideas optimized for SEO, and automatically writes and publishes them over a 3-month period. The content is designed to rank on Google, ChatGPT, and other search platforms."
    },
    {
      question: "Will AI-written content rank on Google?",
      answer: "Yes. Google has stated that AI-generated content is acceptable as long as it&apos;s high-quality and provides value. Our system creates well-researched, comprehensive articles that target long-tail keywords with lower competition, giving you the best chance to rank quickly."
    },
    {
      question: "How long does it take to see results?",
      answer: "Most businesses start seeing measurable traffic improvements within 3-6 months. SEO is a long-term strategy, but our automated approach ensures consistent publishing, which helps you build authority faster than manual content creation."
    },
    {
      question: "Can I review articles before they&apos;re published?",
      answer: "Absolutely. You can choose to review and approve each article before publication, or let the system run on full autopilot. The choice is yours based on your comfort level and time availability."
    },
    {
      question: "What happens to my main website domain?",
      answer: "Your main website stays completely safe. We offer two options: hosting on our subdomain (blog.seoagent.com/yourcompany) or on your own subdomain (blog.yourcompany.com). Both options keep your primary domain isolated from any SEO experiments."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time with no questions asked. All published content remains live, and you keep everything we&apos;ve created for you."
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-12 pb-12" id="faq">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 text-[#4E555C] tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-lg text-[#6B7278] max-w-2xl mx-auto">
          Everything you need to know about automated SEO
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#6B35F5]/50 transition-all shadow-sm"
            >
              <button
                className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              >
                <span className="text-base sm:text-lg text-[#4E555C] flex-1">
                  {faq.question}
                </span>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F3F6FF] flex items-center justify-center">
                  <span
                    className="text-[#6B35F5] transition-transform duration-200"
                    style={{
                      transform: openFaqIndex === index ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    +
                  </span>
                </div>
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: openFaqIndex === index ? '500px' : '0px',
                  opacity: openFaqIndex === index ? 1 : 0,
                }}
              >
                <div className="px-6 pb-5 text-[#6B7278] text-sm sm:text-base border-t border-gray-100 pt-4">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  const router = useRouter();
  const [website, setWebsite] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store the website in sessionStorage for the audit page
    if (website) {
      sessionStorage.setItem('auditWebsite', website);
    }
    router.push('/free-audit');
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#F3F6FF] to-white py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 mb-8 shadow-sm">
          <span className="text-xs text-[#6B7278]">Start Growing Today</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl mb-6 text-[#4E555C] tracking-tight">
          Ready to automate your SEO?
        </h2>

        <p className="text-lg text-[#6B7278] mb-10 max-w-2xl mx-auto">
          Enter your website and get 100 strategic article ideas, auto-published over 3 months.
        </p>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-lg hover:border-[#6B35F5]/50 transition-all">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                placeholder="https://yourwebsite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              />
              <Button
                type="submit"
                className="bg-[#6B35F5] hover:bg-[#582ED6] text-white px-8 py-6 rounded-lg shadow-md"
              >
                Get Started
              </Button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F3F6FF] flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6 text-[#6B35F5]" />
            </div>
            <div className="text-[#4E555C] text-sm mb-1">SEO Expertise</div>
            <div className="text-[#6B7278] text-xs">Built-in optimization</div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F3F6FF] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-[#6B35F5]" />
            </div>
            <div className="text-[#4E555C] text-sm mb-1">Set & Forget</div>
            <div className="text-[#6B7278] text-xs">Fully automated</div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F3F6FF] flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-[#6B35F5]" />
            </div>
            <div className="text-[#4E555C] text-sm mb-1">Fast Results</div>
            <div className="text-[#6B7278] text-xs">See traffic in weeks</div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F3F6FF] flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-[#6B35F5]" />
            </div>
            <div className="text-[#4E555C] text-sm mb-1">Zero Risk</div>
            <div className="text-[#6B7278] text-xs">Safe setup options</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterV3() {
  return (
    <footer className="relative z-10 w-full border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-8">
          <div className="md:col-span-6 lg:col-span-5">
            <div className="mb-4">
              <span className="text-xl text-gray-900">SEOAgent</span>
            </div>
            <p className="text-gray-600 text-sm mb-4 max-w-sm">
              Automated SEO content generation. Get 100 strategic articles auto-published over 3 months.
            </p>
          </div>

          <div className="md:col-span-6 lg:col-span-7">
            <div className="grid grid-cols-2 gap-8 md:gap-12">
              <div>
                <h4 className="text-base text-gray-900 mb-4">Product</h4>
                <div className="space-y-3">
                  <a href="#how" className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    How It Works
                  </a>
                  <a href="#results" className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    Results
                  </a>
                  <a href="#pricing" className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    Pricing
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-base text-gray-900 mb-4">Company</h4>
                <div className="space-y-3">
                  <button className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    About
                  </button>
                  <Link href="/privacy" className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    Privacy
                  </Link>
                  <Link href="/terms" className="block text-gray-600 hover:text-blue-600 transition-colors text-sm text-left">
                    Terms
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="text-gray-500 text-xs text-center">
            © 2025 SEOAgent. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
