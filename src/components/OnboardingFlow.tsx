'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';

interface OnboardingFlowProps {
  onComplete?: () => void;
  className?: string;
}

export default function OnboardingFlow({ onComplete, className = '' }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { user } = useAuth();

  const steps = [
    {
      id: 1,
      title: 'Install Snippet on Website',
      description: 'Add our tracking code to monitor your site&apos;s SEO performance and identify content opportunities.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      status: 'pending',
      action: 'Get Snippet Code'
    },
    {
      id: 2,
      title: 'Connect Your CMS',
      description: 'Link your Strapi, WordPress, or other CMS so we can automatically publish optimized articles.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      status: 'pending',
      action: 'Connect CMS'
    },
    {
      id: 3,
      title: 'SEO on Autopilot',
      description: 'Sit back and watch as we automatically generate, optimize, and publish high-quality SEO content to grow your traffic.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      status: 'future',
      action: 'Start Growing'
    }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white border-green-600';
      case 'current':  
        return 'bg-violet-600 text-white border-violet-600';
      case 'upcoming':
        return 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const handleStepAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        // Navigate to snippet installation page
        window.location.href = '/add-website';
        break;
      case 2:
        // Navigate to CMS connections
        window.location.href = '/cms-connections';
        break;
      case 3:
        // Navigate to article writer
        window.location.href = '/article-writer';
        break;
    }
  };

  const handleBookCall = () => {
    window.open('https://calendly.com/alec-aleclindz/30min', '_blank');
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome to SEOAgent.com! 👋
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get started in 3 simple steps to automate your SEO content
            </p>
          </div>
          <button
            onClick={handleBookCall}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Free Onboarding Call
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="p-6">
        <div className="space-y-6">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            
            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-200 dark:bg-gray-700"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Step Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center ${getStepClasses(status)}`}>
                    {isCompleted ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className={isCurrent ? 'text-white' : 'text-gray-400'}>
                        {step.icon}
                      </div>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {step.title}
                      </h3>
                      {isCurrent && (
                        <button
                          onClick={() => handleStepAction(step.id)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                        >
                          {step.action}
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-violet-900 dark:text-violet-200">
                Need help getting started?
              </h4>
              <p className="text-xs text-violet-600 dark:text-violet-300 mt-1">
                Book a free 30-minute onboarding call with our founder
              </p>
            </div>
            <button
              onClick={handleBookCall}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}