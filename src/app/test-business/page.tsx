'use client';

import { useState } from 'react';
import BusinessOnboardingWizard from '@/components/BusinessOnboardingWizard';

export default function TestBusinessPage() {
  const [completed, setCompleted] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);

  const handleComplete = (info: any) => {
    setBusinessInfo(info);
    setCompleted(true);
  };

  const handleSkip = () => {
    console.log('User skipped business setup');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Test Business Detection & Onboarding
          </h1>
          <p className="text-gray-600 mt-2">
            Test the local business detection and schema markup system
          </p>
        </div>

        {!completed ? (
          <BusinessOnboardingWizard
            userToken="test-user-token" // In real app, this would come from auth context
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-green-600 mb-4">
              ✅ Business Setup Complete!
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Saved Business Information:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(businessInfo, null, 2)}
              </pre>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">What happens next:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• SEOAgent will generate optimized LocalBusiness schema markup</li>
                <li>• Schema will be automatically injected into your website</li>
                <li>• Search engines will better understand your business</li>
                <li>• Improved local SEO rankings and rich search results</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setCompleted(false);
                setBusinessInfo(null);
              }}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Test Again
            </button>
          </div>
        )}

        {/* Demo Examples */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-2">🍕 Local Business</h3>
            <p className="text-sm text-gray-600 mb-3">
              Try: https://www.joespizza.com
            </p>
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Expected: Local (90%+ confidence)
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-2">💻 Online Business</h3>
            <p className="text-sm text-gray-600 mb-3">
              Try: https://stripe.com
            </p>
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Expected: Online/Hybrid
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-2">🏥 Service Business</h3>
            <p className="text-sm text-gray-600 mb-3">
              Try: Local dentist/doctor website
            </p>
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              Expected: Local + Service category
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}