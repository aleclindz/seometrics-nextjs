'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  const [domain, setDomain] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuditStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setIsLoading(true);
    // Normalize domain (remove protocol, www, trailing slash)
    const normalizedDomain = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    
    // Redirect to free audit page with domain pre-filled
    window.location.href = `/free-audit?domain=${encodeURIComponent(normalizedDomain)}`;
  };

  return (
    <section id="hero" className="bg-gradient-to-br from-white via-violet-50/30 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-16 lg:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="text-left">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              An AI SEO agent that fixes the{' '}
              <span className="text-violet-600 relative">
                boring stuff
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-violet-300 dark:text-violet-500" preserveAspectRatio="none" viewBox="0 0 100 8">
                  <path d="M0,6 Q50,0 100,6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>
              {' '}for you
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Set it and forget it: auto-audits, instant on-page fixes, and indexation guardrails—so your content actually ranks.
            </p>

            {/* Domain Input Form */}
            <form onSubmit={handleAuditStart} className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="yourdomain.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || !domain.trim()}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  {isLoading ? 'Starting...' : 'Run a free audit'}
                </button>
              </div>
            </form>

            {/* Secondary CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-start mb-8">
              <button
                onClick={() => setShowDemo(true)}
                className="flex items-center text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 00.707-.293l4.414-4.414a1 1 0 111.414 1.414L12.707 11H9v4a1 1 0 01-1 1H7a1 1 0 01-1 1v-4a1 1 0 011-1z" />
                </svg>
                Watch 60-sec demo
              </button>
            </div>

            {/* Micro-trust */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              No credit card • Safe read-only by default • 3-min setup
            </div>

            {/* Micro-proof strip */}
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
              Catches deindexing, fixes titles/metas, and keeps pages fast—automatically.
            </div>
          </div>

          {/* Right Column - Demo/Visual */}
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
              {/* Mock Dashboard Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Technical SEO Dashboard</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 dark:text-green-400">Live monitoring</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">127</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Auto-fixes applied</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">98%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Pages indexed</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Missing alt tags fixed</span>
                    </div>
                    <span className="text-xs text-gray-500">2 min ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Meta descriptions optimized</span>
                    </div>
                    <span className="text-xs text-gray-500">5 min ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Schema markup added</span>
                    </div>
                    <span className="text-xs text-gray-500">12 min ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDemo(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">SEOAgent Demo</h3>
                <button
                  onClick={() => setShowDemo(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-600 dark:text-gray-400">
                  <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 00.707-.293l4.414-4.414a1 1 0 111.414 1.414L12.707 11H9v4a1 1 0 01-1 1H7a1 1 0 01-1 1v-4a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <p className="font-medium">Demo video coming soon</p>
                  <p className="text-sm mt-2">See how SEOAgent automatically fixes technical SEO issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}