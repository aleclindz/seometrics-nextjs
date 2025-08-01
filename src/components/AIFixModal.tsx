'use client';

import { useState } from 'react';
import { X, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface AIFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: {
    type: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  };
  suggestion: string;
  isLoading: boolean;
}

export default function AIFixModal({ isOpen, onClose, issue, suggestion, isLoading }: AIFixModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {getSeverityIcon(issue.severity)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Fix Suggestion
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {issue.type}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Issue Description */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Issue Description:</h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {issue.description}
            </p>
          </div>

          {/* AI Suggestion */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">AI-Generated Fix:</h4>
              <button
                onClick={copyToClipboard}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-800/30'
                }`}
                disabled={isLoading}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Fix</span>
                  </>
                )}
              </button>
            </div>

            {isLoading ? (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border-l-4 border-blue-500">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                  {suggestion}
                </pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-300 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Next Steps:
            </h4>
            <div className="text-sm text-violet-800 dark:text-violet-300 space-y-2">
              <p className="flex items-start">
                <span className="bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">1</span>
                <span>Copy the fix above using the &ldquo;Copy Fix&rdquo; button</span>
              </p>
              <p className="flex items-start">
                <span className="bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">2</span>
                <span>Feed this input to your website building agent (Claude, ChatGPT, v0, etc.) for instructions to fix the error</span>
              </p>
              <p className="flex items-start">
                <span className="bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">3</span>
                <span>Implement the suggested changes on your website</span>
              </p>
              <p className="flex items-start">
                <span className="bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">4</span>
                <span>Return here and click &ldquo;Run GSC Analysis&rdquo; to confirm the issues are fixed!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
            disabled={isLoading}
          >
            <Copy className="h-4 w-4" />
            <span>Copy & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}