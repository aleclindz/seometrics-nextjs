'use client';

export default function FeatureCards() {
  const valueProps = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.5-2.5L21 7m-9 4v6m4-6v6m4-8a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Indexing Guardrails",
      description: "Stops accidental deindexing, robots.txt mistakes, and canonical errors—24/7."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "On-Page Fix Bot",
      description: "Autogenerates titles, metas, alt text, and internal links. Approve once or set to auto."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      title: "Always-On Alerts",
      description: "Notifies you when H1s disappear, pages slow down, or templates break."
    }
  ];

  const howItWorksSteps = [
    {
      step: "01",
      title: "Connect your site",
      description: "Add our lightweight snippet or install the plugin.",
      visual: (
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-sm">&lt;script src=&quot;seoagent.js&quot;&gt;</span>
            </div>
            <div className="text-xs text-violet-100">One line of code</div>
          </div>
        </div>
      )
    },
    {
      step: "02", 
      title: "Choose automation level",
      description: "Flag issues only, one-click apply, or fully automatic with rollback.",
      visual: (
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-6 text-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-fix</span>
              <div className="w-10 h-5 bg-white rounded-full relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0.5 right-0.5 transition-all"></div>
              </div>
            </div>
            <div className="text-xs text-blue-100">Fully automated</div>
          </div>
        </div>
      )
    },
    {
      step: "03",
      title: "Watch rankings compound",
      description: "Weekly health report, instant fixes, fewer SEO tickets.",
      visual: (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Ranking</span>
              <span className="text-lg font-bold">↗ +23%</span>
            </div>
            <div className="text-xs text-green-100">This month</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      {/* Value Props Section */}
      <section id="value" className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What SEOAgent automates for you
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-200">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center mb-6 text-violet-600 dark:text-violet-400">
                  {prop.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {prop.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get started in minutes, not hours. Three simple steps to automated SEO.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center relative">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-100 dark:bg-violet-900/20 rounded-full text-violet-600 dark:text-violet-400 font-bold text-lg mb-6">
                  {step.step}
                </div>
                
                {/* Visual */}
                <div className="mb-6">
                  {step.visual}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>

                {/* Connector Line (except last item) */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-violet-300 to-transparent transform -translate-y-1/2 -translate-x-6"></div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <a
              href="/free-audit"
              className="inline-flex items-center bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Start your free audit
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              No credit card required • 3-minute setup
            </p>
          </div>
        </div>
      </section>
    </>
  );
}