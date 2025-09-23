'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image 
                src="/assets/SEOAgent_logo.png" 
                alt="SEOAgent" 
                width={140}
                height={36}
                style={{ height: '36px', width: 'auto' }}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            <a href="#features" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Features
            </a>
            <div className="relative group">
              <span className="text-gray-600 group-hover:text-violet-600 dark:text-gray-300 dark:group-hover:text-violet-400 transition-colors cursor-pointer">
                Integrations
              </span>
              <div className="absolute left-0 mt-2 hidden group-hover:block">
                <div className="w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                  <Link href="/wordpress" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">WordPress</Link>
                  <Link href="/strapi" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Strapi</Link>
                  <Link href="/shopify" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Shopify</Link>
                  <Link href="/vercel" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">Vercel</Link>
                </div>
              </div>
            </div>
            <a href="#social-proof" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Testimonials
            </a>
            <a href="#geo" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              GEO
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
              Pricing
            </a>
            <a
              href="https://calendly.com/alec-aleclindz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors"
            >
              Contact Us
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user?.token ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Account
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
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
              <div className="pt-2">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Integrations</div>
                <div className="flex flex-col space-y-2">
                  <Link href="/wordpress" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">WordPress</Link>
                  <Link href="/strapi" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">Strapi</Link>
                  <Link href="/shopify" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">Shopify</Link>
                  <Link href="/vercel" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">Vercel</Link>
                </div>
              </div>
              <a href="#social-proof" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                Testimonials
              </a>
              <a href="#geo" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                GEO
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">
                Pricing
              </a>
              <a
                href="https://calendly.com/alec-aleclindz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors"
              >
                Contact Us
              </a>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                {user?.token ? (
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="flex-1 text-gray-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 transition-colors">Dashboard</Link>
                    <Link href="/account" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-center transition-colors">Account</Link>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
