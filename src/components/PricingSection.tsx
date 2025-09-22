'use client';

export default function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: 19,
      originalPrice: null,
      description: "Perfect for small blogs and personal sites",
      features: [
        "12 AI articles/month",
        "1 website",
        "DALL-E 3 images",
        "SEO optimization",
        "Multi-CMS publishing",
        "Technical SEO automation",
        "Sitemap generation",
        "Meta tags & alt text"
      ],
      cta: "Start generating content",
      popular: false,
      tier: "starter",
      frequency: "3 articles/week"
    },
    {
      name: "Pro",
      price: 39,
      originalPrice: null,
      description: "Ideal for growing businesses and content creators",
      features: [
        "30 AI articles/month",
        "10 websites",
        "DALL-E 3 images",
        "SEO optimization",
        "Multi-CMS publishing",
        "Technical SEO automation",
        "Priority support",
        "Advanced analytics"
      ],
      cta: "Start generating content",
      popular: true,
      tier: "pro",
      frequency: "1 article/day"
    },
    {
      name: "Scale",
      price: 99,
      originalPrice: null,
      description: "For high-volume content needs and agencies",
      features: [
        "90 AI articles/month",
        "Unlimited websites",
        "DALL-E 3 images",
        "SEO optimization",
        "Multi-CMS publishing",
        "Technical SEO automation",
        "Priority support",
        "Custom integrations"
      ],
      cta: "Start generating content",
      popular: false,
      tier: "scale",
      frequency: "3 articles/day"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Automated content generation plans
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            All plans include AI-powered article generation, SEO optimization, and multi-CMS publishing.
            No free tier - professional content requires professional tools.
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
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {plan.description}
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-sm font-medium">
                    {plan.frequency}
                  </div>
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
                  href="/free-audit"
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
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Professional content generation starting at just $19/month. All plans include complete SEO automation.
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
              DALL-E 3 images included
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Multi-CMS publishing
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Full SEO automation
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              💡 <strong>Why no free tier?</strong> Professional content generation requires premium AI models (GPT-4, DALL-E 3)
              and advanced SEO analysis. We pass the savings of DALL-E 3 (vs $0.40/image alternatives) directly to you
              with transparent, affordable pricing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}