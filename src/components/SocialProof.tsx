'use client';

export default function SocialProof() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Indie Developer",
      project: "TaskFlow",
      avatar: "SC",
      content: "SEO Metrics saved me 20+ hours per week. I used to spend ages writing alt-text and meta descriptions. Now it's all automated and my traffic has increased 40%!",
      metrics: "↑ 40% organic traffic"
    },
    {
      name: "Mike Rodriguez",
      role: "Side Project Builder",
      project: "BudgetBuddy",
      avatar: "MR",
      content: "Perfect for side projects! The one-script installation is genius. Set it up once and forget it. My SEO scores improved dramatically without any effort.",
      metrics: "↑ 65% SEO score"
    },
    {
      name: "Emma Thompson",
      role: "Freelance Developer",
      project: "ClientPortal",
      avatar: "ET",
      content: "The GEO features are incredible. My clients' sites are now appearing in ChatGPT responses. It's like having a crystal ball for the future of search.",
      metrics: "↑ 85% AI visibility"
    },
    {
      name: "David Kim",
      role: "Startup Founder",
      project: "AnalyticsHub",
      avatar: "DK",
      content: "We tried 5 different SEO tools before finding SEO Metrics. The automation is unmatched. Our engineering team focuses on product, not SEO tasks.",
      metrics: "↑ 120% efficiency"
    },
    {
      name: "Lisa Parker",
      role: "Agency Owner",
      project: "WebCraft Studio",
      avatar: "LP",
      content: "Our agency uses SEO Metrics for all client projects. The ROI is incredible - we can handle 3x more clients with the same team size.",
      metrics: "↑ 300% capacity"
    },
    {
      name: "Alex Johnson",
      role: "E-commerce Owner",
      project: "TechGadgets",
      avatar: "AJ",
      content: "Every product page gets perfect alt-text and meta descriptions automatically. Our accessibility scores are through the roof and sales have increased.",
      metrics: "↑ 55% conversions"
    }
  ];

  const stats = [
    {
      number: "25,000+",
      label: "Websites Automated",
      description: "Sites using SEO Metrics"
    },
    {
      number: "2.5M+",
      label: "Tags Generated",
      description: "Alt-tags and meta descriptions"
    },
    {
      number: "150+",
      label: "Hours Saved",
      description: "Average per user per month"
    },
    {
      number: "99.9%",
      label: "Uptime",
      description: "Reliable automation"
    }
  ];

  return (
    <section id="social-proof" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by indie hackers & bootstrappers worldwide
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            You&apos;ve built your app with Lovable, v0, Create, or Replit. Now let it grow with automated SEO.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400 mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {/* Header */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role} • {testimonial.project}
                  </div>
                </div>
              </div>

              {/* Content */}
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Metrics */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium">
                {testimonial.metrics}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center space-x-8 text-gray-400 dark:text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm">Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}