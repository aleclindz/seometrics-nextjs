'use client';

import LandingHeader from '@/components/LandingHeader';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import SocialProof from '@/components/SocialProof';
import GEOSection from '@/components/GEOSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeatureCards />
        <SocialProof />
        <GEOSection />
      </main>
    </div>
  );
}