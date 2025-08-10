'use client';

export default function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: 29,
      originalPrice: null,
      description: "Perfect for single projects and indie hackers",
      features: [
        "1 site",
        "5k pages crawled/mo", 
        "Issue alerts",
        "50 AI fixes/mo",
        "Weekly report",
        "Indexing guardrails",
        "AI titles & metas",
        "Alt text suggestions"
      ],
      cta: "Start free audit",
      popular: false
    },
    {
      name: "Pro",
      price: 79,
      originalPrice: 139,
      description: "Best for growing businesses with multiple sites",
      features: [
        "10 sites",
        "50k pages crawled/mo",
        "Auto-fix rules", 
        "Internal-link suggestions",
        "A/B test titles/metas",
        "Template regression alerts",
        "Slack/Email notifications",
        "Weekly health report"
      ],
      cta: "Start free audit",
      popular: true
    },
    {
      name: "Agency",
      price: 299,
      originalPrice: null,
      description: "For agencies managing multiple client sites",
      features: [
        "Unlimited sites",
        "250k pages crawled/mo",
        "Multi-client dashboard",
        "Webhooks/Slack alerts",
        "White-label reports",
        "Priority support",
        "Custom integrations",
        "Advanced analytics"
      ],
      cta: "Start free audit",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple plans that scale with you
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            All plans include 14-day trial. No credit card to start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border transition-all duration-200 hover:shadow-xl ${
                plan.popular 
                  ? 'border-violet-500 ring-2 ring-violet-500 ring-opacity-50 scale-105' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-xl text-gray-600 dark:text-gray-400 ml-1">
                        /mo
                      </span>
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 dark:text-gray-500 line-through ml-2">
                          ${plan.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <a
                  href="/login"
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
                    plan.popular
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.cta}
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            All plans include 14-day trial. No credit card to start.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cancel anytime
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              30-day money-back guarantee
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Setup support included
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}