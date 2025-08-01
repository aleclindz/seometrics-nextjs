'use client';

export default function FeatureCards() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "🔍 Google Search Console Integration",
      description: "Connect your GSC account and get real-time technical SEO analysis. Automatic URL inspection, indexing status monitoring, and issue detection.",
      benefits: ["1-click GSC connection", "URL inspection API", "Indexing monitoring", "Real-time sync"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "⚡ Smart.js Autopilot System",
      description: "One lightweight script that runs 24/7 on your website. Automatically fixes schema markup, canonical tags, meta descriptions, and alt text.",
      benefits: ["24/7 monitoring", "Automatic fixes", "Schema markup", "Meta optimization"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      title: "🗺️ Automated Sitemap Management",
      description: "Generate XML sitemaps automatically and submit them to Google Search Console. Discovers pages from GSC data and common website patterns.",
      benefits: ["Auto-generation", "GSC submission", "URL discovery", "XML optimization"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "🤖 AI-Powered Fix Suggestions",
      description: "Get intelligent fix suggestions for complex technical SEO issues that can't be auto-fixed. Copy-paste instructions for developers or AI builders.",
      benefits: ["AI diagnostics", "Copy-paste fixes", "Developer-ready", "Issue resolution"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "📊 Real-Time Dashboard",
      description: "Monitor your technical SEO health with live metrics. Track indexable pages, mobile-friendliness, schema markup coverage, and automated fixes.",
      benefits: ["Live monitoring", "Technical metrics", "Fix activity", "Issue tracking"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
        </svg>
      ),
      title: "🚀 Built for Indie Hackers",
      description: "Perfect for bootstrappers and side projects. Works with any website or framework. Affordable pricing that scales with your growth.",
      benefits: ["Framework agnostic", "Affordable pricing", "Indie-focused", "Easy setup"]
    }
  ];

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Technical SEO Automation
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Stop manually fixing technical SEO issues. Our automation system monitors, detects, and fixes problems 24/7 while you focus on building.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-lg transition-shadow duration-200 group"
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {feature.description}
              </p>

              {/* Benefits */}
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2 h-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-violet-600 text-white rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to put your technical SEO on autopilot?
            </h3>
            <p className="text-xl text-violet-100 mb-6">
              Join indie hackers who have automated their technical SEO and never worry about indexing issues, broken sitemaps, or missing schema markup again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/login"
                className="bg-white text-violet-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center"
              >
                Start Free Trial
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                14-day free trial • No credit card required
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}