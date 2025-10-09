'use client';

/**
 * Strategy Onboarding Modal
 *
 * 5-screen onboarding flow for initializing SEO strategy:
 * 1. Welcome - Introduce the strategy discovery process
 * 2. Business Info - Collect brand, geo focus
 * 3. Topics - Collect seed topics
 * 4. URLs - Collect seed URLs for scraping (optional)
 * 5. Processing - Show progress while running discovery
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, Globe, Lightbulb, Link, Loader2, CheckCircle } from 'lucide-react';

interface StrategyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteToken: string;
  domain: string;
  onComplete?: () => void;
}

interface OnboardingData {
  brand: string;
  geoFocus: string[];
  seedTopics: string[];
  seedUrls: string[];
  rawOwnerContext?: string;
}

type OnboardingStep = 'welcome' | 'business' | 'topics' | 'urls' | 'processing';

export default function StrategyOnboardingModal({
  isOpen,
  onClose,
  websiteToken,
  domain,
  onComplete
}: StrategyOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>({
    brand: '',
    geoFocus: ['United States'],
    seedTopics: [],
    seedUrls: [],
    rawOwnerContext: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);

  // Load suggestions from API
  useEffect(() => {
    if (isOpen) {
      loadOnboardingData();
    }
  }, [isOpen, websiteToken]);

  const loadOnboardingData = async () => {
    try {
      const response = await fetch(`/api/strategy/onboarding?websiteToken=${websiteToken}`);
      if (!response.ok) throw new Error('Failed to load onboarding data');

      const result = await response.json();

      // Pre-fill with suggestions
      setData(prev => ({
        ...prev,
        brand: result.websiteData.brand || prev.brand,
        geoFocus: result.websiteData.geoFocus || prev.geoFocus,
        seedTopics: result.suggestions.seedTopics || prev.seedTopics,
        seedUrls: result.suggestions.seedUrls || prev.seedUrls
      }));
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const handleNext = () => {
    const steps: OnboardingStep[] = ['welcome', 'business', 'topics', 'urls', 'processing'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: OnboardingStep[] = ['welcome', 'business', 'topics', 'urls', 'processing'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleStartDiscovery = async () => {
    setCurrentStep('processing');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/strategy/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteToken,
          domain,
          brand: data.brand,
          geoFocus: data.geoFocus,
          seedTopics: data.seedTopics,
          seedUrls: data.seedUrls.filter(url => url.trim() !== ''),
          rawOwnerContext: data.rawOwnerContext,
          discoveryType: 'initial'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Discovery failed');
      }

      const result = await response.json();
      setDiscoveryResult(result);
      setLoading(false);

      // Wait 2 seconds to show success, then close
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Discovery error:', error);
      setError(error instanceof Error ? error.message : 'Discovery failed');
      setLoading(false);
    }
  };

  const addItem = (field: keyof OnboardingData, value: string) => {
    if (value.trim() === '') return;
    setData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value.trim()]
    }));
  };

  const removeItem = (field: keyof OnboardingData, index: number) => {
    setData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Strategy Discovery</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'welcome' && <WelcomeScreen onNext={handleNext} domain={domain} />}
          {currentStep === 'business' && (
            <BusinessInfoScreen
              data={data}
              setData={setData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 'topics' && (
            <TopicsScreen
              topics={data.seedTopics}
              addTopic={(topic) => addItem('seedTopics', topic)}
              removeTopic={(index) => removeItem('seedTopics', index)}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 'urls' && (
            <URLsScreen
              urls={data.seedUrls}
              addUrl={(url) => addItem('seedUrls', url)}
              removeUrl={(index) => removeItem('seedUrls', index)}
              onNext={handleStartDiscovery}
              onBack={handleBack}
            />
          )}
          {currentStep === 'processing' && (
            <ProcessingScreen
              loading={loading}
              error={error}
              result={discoveryResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Screen Components
// ============================================================================

function WelcomeScreen({ onNext, domain }: { onNext: () => void; domain: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-blue-600" />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">Welcome to Strategy Discovery</h3>
        <p className="text-gray-600">
          Let&apos;s build a comprehensive SEO content strategy for <strong>{domain}</strong>
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 text-left space-y-3">
        <h4 className="font-semibold text-blue-900">What we&apos;ll create:</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span><strong>5-12 Topic Clusters</strong> - Semantic groups of related keywords</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span><strong>Pillar Articles</strong> - Comprehensive guides (1 primary + 4-10 secondary keywords)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span><strong>Supporting Articles</strong> - Deep-dive content (1 primary + 0-5 secondary keywords)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span><strong>Section Mapping</strong> - H2/FAQ assignments for every secondary keyword</span>
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-500">
        This process takes 3-5 minutes. We&apos;ll ask you a few questions to personalize your strategy.
      </p>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function BusinessInfoScreen({
  data,
  setData,
  onNext,
  onBack
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [geoInput, setGeoInput] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-600">
        <Globe className="w-6 h-6" />
        <h3 className="text-xl font-bold">Business Information</h3>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Brand Name</label>
        <input
          type="text"
          value={data.brand}
          onChange={(e) => setData({ ...data, brand: e.target.value })}
          placeholder="e.g., MetricPilot, SunCo Citrus"
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Geographic Focus</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={geoInput}
            onChange={(e) => setGeoInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setData({ ...data, geoFocus: [...data.geoFocus, geoInput] });
                setGeoInput('');
              }
            }}
            placeholder="e.g., United States, Miami, South Florida"
            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              if (geoInput.trim()) {
                setData({ ...data, geoFocus: [...data.geoFocus, geoInput] });
                setGeoInput('');
              }
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.geoFocus.map((geo, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {geo}
              <button
                onClick={() => setData({ ...data, geoFocus: data.geoFocus.filter((_, i) => i !== index) })}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Additional Context (Optional)</label>
        <textarea
          value={data.rawOwnerContext}
          onChange={(e) => setData({ ...data, rawOwnerContext: e.target.value })}
          placeholder="Describe your business, target audience, unique value proposition..."
          rows={4}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.brand || data.geoFocus.length === 0}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function TopicsScreen({
  topics,
  addTopic,
  removeTopic,
  onNext,
  onBack
}: {
  topics: string[];
  addTopic: (topic: string) => void;
  removeTopic: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [topicInput, setTopicInput] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-600">
        <Lightbulb className="w-6 h-6" />
        <h3 className="text-xl font-bold">Seed Topics</h3>
      </div>

      <p className="text-gray-600">
        What topics should your content strategy cover? Add 3-10 seed topics.
      </p>

      <div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && topicInput.trim()) {
                addTopic(topicInput);
                setTopicInput('');
              }
            }}
            placeholder="e.g., product analytics, coffee roasting, fresh lemons"
            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              if (topicInput.trim()) {
                addTopic(topicInput);
                setTopicInput('');
              }
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {topics.map((topic, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg"
            >
              <span>{topic}</span>
              <button
                onClick={() => removeTopic(index)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {topics.length === 0 && (
          <p className="text-sm text-gray-500 italic">No topics added yet. Add at least 3 topics to continue.</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={topics.length < 3}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function URLsScreen({
  urls,
  addUrl,
  removeUrl,
  onNext,
  onBack
}: {
  urls: string[];
  addUrl: (url: string) => void;
  removeUrl: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-600">
        <Link className="w-6 h-6" />
        <h3 className="text-xl font-bold">Seed URLs (Optional)</h3>
      </div>

      <p className="text-gray-600">
        Add URLs from your website to scrape for content analysis. This helps us understand your existing content.
      </p>

      <div>
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && urlInput.trim()) {
                addUrl(urlInput);
                setUrlInput('');
              }
            }}
            placeholder="https://example.com/about"
            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              if (urlInput.trim()) {
                addUrl(urlInput);
                setUrlInput('');
              }
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg"
            >
              <span className="text-sm truncate">{url}</span>
              <button
                onClick={() => removeUrl(index)}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {urls.length === 0 && (
          <p className="text-sm text-gray-500 italic">No URLs added. You can skip this step if you prefer.</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Generate Strategy
        </button>
      </div>
    </div>
  );
}

function ProcessingScreen({
  loading,
  error,
  result
}: {
  loading: boolean;
  error: string | null;
  result: any;
}) {
  if (error) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2 text-red-600">Discovery Failed</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">Generating Your Strategy...</h3>
          <p className="text-gray-600">
            This may take 2-5 minutes. We&apos;re analyzing your website, clustering keywords, and creating your content plan.
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-left text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Scraping seed URLs...</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Clustering keywords into topics...</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Assigning pillar and supporting articles...</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Mapping secondary keywords to sections...</span>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">Strategy Created!</h3>
          <p className="text-gray-600">Your SEO content strategy is ready.</p>
        </div>
        <div className="bg-green-50 rounded-lg p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Topic Clusters:</span>
            <span className="text-2xl font-bold text-green-600">{result.summary.clusters}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">Pillar Articles:</span>
            <span className="text-2xl font-bold text-green-600">{result.summary.pillars}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">Supporting Articles:</span>
            <span className="text-2xl font-bold text-green-600">{result.summary.supporting}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Redirecting to your strategy dashboard...
        </p>
      </div>
    );
  }

  return null;
}
