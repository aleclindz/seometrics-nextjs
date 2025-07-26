import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | SEOAgent.com',
  description: 'SEOAgent terms of service - our terms and conditions for using our SEO automation platform.',
  robots: 'index, follow',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Terms of Service
          </h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using SEOAgent.com, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>

            <h2>Service Description</h2>
            <p>
              SEOAgent provides automated SEO services including technical SEO optimization, 
              content generation, and strategic SEO analysis for websites and web applications.
            </p>

            <h2>User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account.
            </p>

            <h2>Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose or to solicit unlawful activity</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use the service to spam or send unsolicited messages</li>
            </ul>

            <h2>Payment Terms</h2>
            <p>
              Paid plans are billed in advance on a monthly or annual basis. All payments are 
              non-refundable except as required by law.
            </p>

            <h2>Free Trial</h2>
            <p>
              We offer a 14-day free trial with no credit card required. The trial automatically 
              expires after 14 days unless you upgrade to a paid plan.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              SEOAgent shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of the service.
            </p>

            <h2>Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violation of these terms. 
              You may cancel your account at any time.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of 
              any material changes.
            </p>

            <h2>Contact Information</h2>
            <p>
              For questions about these Terms of Service, contact us at{' '}
              <a href="mailto:legal@seoagent.com" className="text-violet-600 hover:underline">
                legal@seoagent.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}