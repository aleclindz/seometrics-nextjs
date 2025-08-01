'use client';

import LandingHeader from '@/components/LandingHeader';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import SocialProof from '@/components/SocialProof';
import GEOSection from '@/components/GEOSection';
import LandingFooter from '@/components/LandingFooter';
import Script from 'next/script';

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SEOAgent",
    "url": "https://seoagent.com",
    "description": "Put your technical SEO on autopilot with Google Search Console integration, automated fixes, and AI-powered issue resolution for indie hackers",
    "applicationCategory": "SEO Software",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "description": "14-day free trial, no credit card required"
    },
    "creator": {
      "@type": "Organization",
      "name": "SEOAgent",
      "url": "https://seoagent.com"
    },
    "featureList": [
      "Google Search Console Integration",
      "Smart.js Autopilot System",
      "Automated Sitemap Management",
      "AI-Powered Fix Suggestions",
      "Real-Time Technical SEO Dashboard",
      "Schema Markup Automation",
      "24/7 Technical SEO Monitoring"
    ],
    "screenshot": "https://seoagent.com/og-image.jpg",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127",
      "bestRating": "5"
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingHeader />
      <main>
        <HeroSection />
        <FeatureCards />
        <SocialProof />
        <GEOSection />
      </main>
      <LandingFooter />
    </div>
  );
}