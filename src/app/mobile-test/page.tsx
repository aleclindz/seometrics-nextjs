'use client';

import { useState } from 'react';
import { Metadata } from 'next';

export default function MobileTestPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTest, setIsRunningTest] = useState(false);

  const runMobileUsabilityTest = () => {
    setIsRunningTest(true);
    
    // Simulate testing different mobile usability aspects
    setTimeout(() => {
      const results = {
        viewportTest: checkViewport(),
        touchTargetTest: checkTouchTargets(),
        textSizeTest: checkTextSizes(),
        horizontalScrollTest: checkHorizontalScroll(),
        interactiveElementsTest: checkInteractiveElements(),
        overallScore: 0
      };
      
      // Calculate overall score
      const scores = Object.values(results).slice(0, -1) as number[];
      results.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      setTestResults(results);
      setIsRunningTest(false);
    }, 2000);
  };

  const checkViewport = (): number => {
    const viewport = document.querySelector('meta[name="viewport"]');
    return viewport?.getAttribute('content')?.includes('width=device-width') ? 100 : 0;
  };

  const checkTouchTargets = (): number => {
    const buttons = document.querySelectorAll('button, a.btn, .btn');
    let passCount = 0;
    
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      const minSize = 44; // 44px minimum touch target
      if (rect.width >= minSize && rect.height >= minSize) {
        passCount++;
      }
    });
    
    return buttons.length > 0 ? Math.round((passCount / buttons.length) * 100) : 100;
  };

  const checkTextSizes = (): number => {
    const textElements = document.querySelectorAll('p, span, div, button, input, label, a');
    let passCount = 0;
    
    textElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const fontSize = parseFloat(computedStyle.fontSize);
      if (fontSize >= 16) { // 16px minimum for mobile readability
        passCount++;
      }
    });
    
    return textElements.length > 0 ? Math.round((passCount / textElements.length) * 100) : 100;
  };

  const checkHorizontalScroll = (): number => {
    const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
    return hasHorizontalScroll ? 0 : 100;
  };

  const checkInteractiveElements = (): number => {
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, a');
    let passCount = 0;
    
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      // Check if elements are properly spaced (at least 8px apart)
      const nextElement = element.nextElementSibling;
      if (nextElement) {
        const nextRect = nextElement.getBoundingClientRect();
        const distance = nextRect.top - rect.bottom;
        if (distance >= 8 || distance < 0) { // 8px spacing or elements are not vertically adjacent
          passCount++;
        }
      } else {
        passCount++; // Last element passes by default
      }
    });
    
    return interactiveElements.length > 0 ? Math.round((passCount / interactiveElements.length) * 100) : 100;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return '✅';
    if (score >= 70) return '⚠️';
    return '❌';
  };

  return (
    <div className="min-h-screen bg-gray-50 mobile-padding py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Mobile Usability Test
          </h1>
          <p className="text-mobile-base text-gray-600 max-w-2xl mx-auto">
            Test your website&apos;s mobile usability across key metrics including touch targets, 
            text readability, viewport configuration, and overall user experience.
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <button
              onClick={runMobileUsabilityTest}
              disabled={isRunningTest}
              className="btn bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-8 py-4 text-mobile-base font-semibold"
            >
              {isRunningTest ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                'Run Mobile Usability Test'
              )}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Test Results</h2>
            
            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-4">
                <span className="text-3xl font-bold text-gray-900">{testResults.overallScore}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Mobile Usability Score</h3>
              <p className="text-gray-600">
                {testResults.overallScore >= 90 ? 'Excellent! Your site is highly mobile-friendly.' :
                 testResults.overallScore >= 70 ? 'Good, but there are some improvements to be made.' :
                 'Needs improvement. Several mobile usability issues detected.'}
              </p>
            </div>

            {/* Individual Test Results */}
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(testResults.viewportTest)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getScoreIcon(testResults.viewportTest)}</span>
                  <div>
                    <h4 className="font-medium">Viewport Configuration</h4>
                    <p className="text-sm opacity-75">Proper mobile viewport meta tag</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{testResults.viewportTest}%</div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(testResults.touchTargetTest)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getScoreIcon(testResults.touchTargetTest)}</span>
                  <div>
                    <h4 className="font-medium">Touch Target Size</h4>
                    <p className="text-sm opacity-75">Minimum 44px touch targets</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{testResults.touchTargetTest}%</div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(testResults.textSizeTest)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getScoreIcon(testResults.textSizeTest)}</span>
                  <div>
                    <h4 className="font-medium">Text Readability</h4>
                    <p className="text-sm opacity-75">Minimum 16px font size</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{testResults.textSizeTest}%</div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(testResults.horizontalScrollTest)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getScoreIcon(testResults.horizontalScrollTest)}</span>
                  <div>
                    <h4 className="font-medium">Horizontal Scroll</h4>
                    <p className="text-sm opacity-75">No unwanted horizontal scrolling</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{testResults.horizontalScrollTest}%</div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(testResults.interactiveElementsTest)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getScoreIcon(testResults.interactiveElementsTest)}</span>
                  <div>
                    <h4 className="font-medium">Element Spacing</h4>
                    <p className="text-sm opacity-75">Adequate spacing between interactive elements</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{testResults.interactiveElementsTest}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Sample Elements for Testing */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sample Mobile Elements</h2>
          <div className="space-y-8">
            
            {/* Touch Target Examples */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Touch Target Examples</h3>
              <div className="flex flex-wrap gap-4">
                <button className="btn bg-blue-600 text-white">Standard Button</button>
                <button className="btn-sm bg-green-600 text-white">Small Button</button>
                <button className="touch-target bg-red-600 text-white rounded">Custom Touch Target</button>
              </div>
            </div>

            {/* Form Elements */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Form Elements</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-mobile-base font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-mobile-base"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-mobile-base font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-mobile-base"
                    rows={4}
                    placeholder="Enter your message"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Typography Examples */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Typography Examples</h3>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-gray-900">Heading 1 (Mobile Optimized)</h1>
                <h2 className="text-xl font-semibold text-gray-900">Heading 2 (Mobile Optimized)</h2>
                <h3 className="text-lg font-medium text-gray-900">Heading 3 (Mobile Optimized)</h3>
                <p className="text-mobile-base text-gray-700">
                  This is body text optimized for mobile readability with proper font size and line height.
                </p>
                <p className="text-mobile-sm text-gray-600">
                  This is smaller text that still maintains readability on mobile devices.
                </p>
              </div>
            </div>

            {/* Navigation Example */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Navigation Example</h3>
              <nav className="space-y-2">
                <a href="#" className="nav-link block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                  Dashboard
                </a>
                <a href="#" className="nav-link block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                  Settings
                </a>
                <a href="#" className="nav-link block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                  Help & Support
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Testing Guidelines */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Mobile Usability Guidelines</h3>
          <div className="space-y-3 text-blue-800 text-sm">
            <div className="flex items-start space-x-2">
              <span className="font-medium">•</span>
              <span>Touch targets should be at least 44px × 44px with adequate spacing</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">•</span>
              <span>Text should be at least 16px to prevent zoom on iOS devices</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">•</span>
              <span>Viewport should be properly configured with responsive meta tag</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">•</span>
              <span>Content should not cause horizontal scrolling on mobile devices</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">•</span>
              <span>Interactive elements should have sufficient spacing to prevent accidental taps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}