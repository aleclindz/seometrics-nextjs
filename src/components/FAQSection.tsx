'use client';

import { useState } from 'react';

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs = [
    {
      question: "How safe are auto-fixes?",
      answer: "Everything is logged. You can require approval or enable instant rollback. We never make changes that could break your site - all fixes are reversible and follow SEO best practices."
    },
    {
      question: "Will this replace my SEO agency?",
      answer: "No. It handles 80% of repetitive technical/on-page work so your humans focus on strategy. Think of it as your technical SEO assistant that works 24/7."
    },
    {
      question: "Does it work with WordPress/Webflow/Shopify/Next.js?",
      answer: "Yes—via snippet or plugins. Server-side integrations coming. Our lightweight script works with any website regardless of the technology stack."
    },
    {
      question: "Is AI content generation included?",
      answer: "We optimize existing pages and briefs. Full article generation is optional. Our focus is on technical SEO automation, not content creation."
    },
    {
      question: "What happens to my data?",
      answer: "Read-only by default. Write actions require explicit scopes. Every change is logged with instant rollback. We never sell your data and follow strict privacy policies."
    },
    {
      question: "How quickly will I see results?",
      answer: "Technical fixes are applied within minutes. SEO improvements typically show in Google Search Console within 1-2 weeks, with ranking improvements following 2-8 weeks later."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently asked questions
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Everything you need to know about SEOAgent
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl"
                aria-expanded={openFAQ === index}
              >
                <span className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  {faq.question}
                </span>
                <div className={`flex-shrink-0 transform transition-transform duration-200 ${
                  openFAQ === index ? 'rotate-180' : ''
                }`}>
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {openFAQ === index && (
                <div className="px-6 pb-5">
                  <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Get in touch with our team or start your free audit to see SEOAgent in action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Start free audit
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="mailto:hello@seoagent.com"
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}