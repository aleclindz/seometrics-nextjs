'use client';

export default function FeatureCards() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "🤖 Technical SEO Autopilot",
      description: "Complete technical SEO automation. Meta tags, alt-text, sitemaps, Core Web Vitals monitoring, and fixes—all handled automatically.",
      benefits: ["Google Search Console sync", "Automated fixes", "Real-time monitoring", "Zero maintenance"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      title: "✍️ Multi-CMS Content Writer",
      description: "AI-powered article generation with automated publishing to Strapi, WordPress, Webflow, Shopify, and Ghost. SurferSEO only does WordPress!",
      benefits: ["5+ CMS platforms", "SurferSEO-quality content", "Auto-publishing", "Competitive advantage"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "📊 SEO Strategy Intelligence",
      description: "Your personal SEO strategist. Automated keyword research, competitor analysis, and dynamic strategy updates based on your performance data.",
      benefits: ["SERP.dev integration", "Competitor tracking", "Performance-based updates", "Coming soon"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: "Future-Proof Your SEO",
      description: "Get discovered by ChatGPT, Claude, and other AI search engines. Optimize for both traditional search and Generative Engine Optimization (GEO).",
      benefits: ["AI search optimized", "ChatGPT visibility", "Claude indexing", "Next-gen SEO"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Built for Bootstrappers",
      description: "Perfect for apps built with Lovable, v0, Create, Replit, GitHub Spark. You&apos;ve built your app—now let it grow with automated SEO.",
      benefits: ["Zero-config setup", "Affordable pricing", "Indie hacker focused", "Growth automation"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Growth Analytics",
      description: "Track your SEO improvements with detailed analytics. Monitor automated fixes, content performance, and organic growth.",
      benefits: ["Real-time tracking", "Growth metrics", "Performance insights", "ROI monitoring"]
    }
  ];

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need for automated SEO
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Stop wasting time on manual SEO tasks. Let our AI handle the heavy lifting while you focus on building your product.
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
              Ready to automate your SEO?
            </h3>
            <p className="text-xl text-violet-100 mb-8">
              Join thousands of indie hackers and bootstrappers who have already put their SEO on auto-pilot.
            </p>
            <a
              href="/login"
              className="bg-white text-violet-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center"
            >
              Start Free Trial
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}