'use client';

import LandingHeader from '@/components/LandingHeader';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import SocialProof from '@/components/SocialProof';
import PricingSection from '@/components/PricingSection';
import FAQSection from '@/components/FAQSection';
import LandingFooter from '@/components/LandingFooter';
import Script from 'next/script';

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SEOAgent",
    "url": "https://seoagent.com",
    "description": "An AI SEO agent that fixes the boring stuff for you. Set it and forget it: auto-audits, instant on-page fixes, and indexation guardrails—so your content actually ranks.",
    "applicationCategory": "SEO Software",
    "operatingSystem": "Web Browser",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter",
        "price": "29",
        "priceCurrency": "USD",
        "description": "1 site • 5k pages crawled/mo • Issue alerts • 50 AI fixes/mo"
      },
      {
        "@type": "Offer", 
        "name": "Pro",
        "price": "79",
        "priceCurrency": "USD",
        "description": "10 sites • 50k pages • Auto-fix rules • Internal-link suggestions"
      },
      {
        "@type": "Offer",
        "name": "Agency", 
        "price": "299",
        "priceCurrency": "USD",
        "description": "Unlimited sites • 250k pages • Multi-client dashboard • White-label reports"
      }
    ],
    "creator": {
      "@type": "Organization",
      "name": "SEOAgent",
      "url": "https://seoagent.com"
    },
    "featureList": [
      "Indexing Guardrails",
      "On-Page Fix Bot", 
      "Always-On Alerts",
      "Google Search Console Integration",
      "SEOAgent.js Autopilot System",
      "AI-Powered Fix Suggestions",
      "Real-Time Technical SEO Dashboard"
    ],
    "screenshot": "https://seoagent.com/og-image.jpg"
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How safe are auto-fixes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Everything is logged. You can require approval or enable instant rollback. We never make changes that could break your site - all fixes are reversible and follow SEO best practices."
        }
      },
      {
        "@type": "Question",
        "name": "Will this replace my SEO agency?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. It handles 80% of repetitive technical/on-page work so your humans focus on strategy. Think of it as your technical SEO assistant that works 24/7."
        }
      },
      {
        "@type": "Question",
        "name": "Does it work with WordPress/Webflow/Shopify/Next.js?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes—via snippet or plugins. Server-side integrations coming. Our lightweight script works with any website regardless of the technology stack."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <LandingHeader />
      <main>
        <HeroSection />
        <FeatureCards />
        <SocialProof />
        <PricingSection />
        <FAQSection />
      </main>
      <LandingFooter />
    </div>
  );
}