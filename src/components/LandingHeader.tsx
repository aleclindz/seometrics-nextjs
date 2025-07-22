'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">SEO Metrics</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Features
            </a>
            <a href="#social-proof" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Testimonials
            </a>
            <a href="#geo" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              GEO
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?mode=signup"
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                Features
              </a>
              <a href="#social-proof" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                Testimonials
              </a>
              <a href="#geo" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                GEO
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                Pricing
              </a>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/login"
                  className="block text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 mb-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="block bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-center transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}