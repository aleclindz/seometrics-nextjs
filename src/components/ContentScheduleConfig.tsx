'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Settings, Save, Loader2 } from 'lucide-react';

interface ContentScheduleConfig {
  id?: number;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  daily_count: number;
  weekly_count: number;
  monthly_count: number;
  timezone: string;
  preferred_hours: number[];
  content_style: 'professional' | 'casual' | 'technical' | 'creative';
  target_word_count: number;
  include_images: boolean;
  auto_publish: boolean;
  topic_sources: string[];
  avoid_topics: string[];
  content_pillars: string[];
  next_scheduled_at?: string;
  last_generated_at?: string;
}

interface ContentScheduleConfigProps {
  userToken: string;
  websiteToken: string;
  domain: string;
}

const timezoneOptions = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`
}));

export default function ContentScheduleConfig({
  userToken,
  websiteToken,
  domain
}: ContentScheduleConfigProps) {
  const [config, setConfig] = useState<ContentScheduleConfig>({
    enabled: false,
    frequency: 'daily',
    daily_count: 1,
    weekly_count: 3,
    monthly_count: 10,
    timezone: 'UTC',
    preferred_hours: [9, 12, 15],
    content_style: 'professional',
    target_word_count: 1200,
    include_images: true,
    auto_publish: false,
    topic_sources: [],
    avoid_topics: [],
    content_pillars: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      if (!userToken || !websiteToken) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/content/schedule-config?userToken=${userToken}&websiteToken=${websiteToken}`);
        const data = await response.json();

        if (data.success && data.config) {
          setConfig({
            ...config,
            ...data.config,
            topic_sources: data.config.topic_sources || [],
            avoid_topics: data.config.avoid_topics || [],
            content_pillars: data.config.content_pillars || [],
            preferred_hours: data.config.preferred_hours || [9, 12, 15]
          });
        }
      } catch (error) {
        console.error('Failed to load schedule config:', error);
        showToast('Failed to load scheduling configuration', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [userToken, websiteToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save configuration
  const handleSave = async () => {
    if (!userToken || !websiteToken) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/content/schedule-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userToken,
          websiteToken,
          config
        })
      });

      const data = await response.json();

      if (data.success) {
        setConfig(prev => ({ ...prev, ...data.config }));
        showToast('Scheduling configuration saved successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save schedule config:', error);
      showToast('Failed to save configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayInput = (field: keyof ContentScheduleConfig, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setConfig(prev => ({ ...prev, [field]: items }));
  };

  const handleHourToggle = (hour: number) => {
    setConfig(prev => ({
      ...prev,
      preferred_hours: prev.preferred_hours.includes(hour)
        ? prev.preferred_hours.filter(h => h !== hour)
        : [...prev.preferred_hours, hour].sort((a, b) => a - b)
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading scheduling configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      {/* Toast */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Automated Content Scheduling</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        <div>
          <div className="font-medium text-gray-900">Enable Automated Content Generation</div>
          <div className="text-sm text-gray-500">
            {config.enabled
              ? 'SEOAgent will automatically generate and schedule blog posts for this website'
              : 'Content scheduling is currently disabled'
            }
          </div>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Frequency Settings */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Publishing Frequency</label>
              <select
                value={config.frequency}
                onChange={(e) => setConfig(prev => ({ ...prev, frequency: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posts per {config.frequency.replace('ly', '')}
              </label>
              <input
                type="number"
                min="1"
                max={config.frequency === 'daily' ? 10 : config.frequency === 'weekly' ? 7 : 31}
                value={config.frequency === 'daily' ? config.daily_count : config.frequency === 'weekly' ? config.weekly_count : config.monthly_count}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setConfig(prev => ({
                    ...prev,
                    [config.frequency === 'daily' ? 'daily_count' : config.frequency === 'weekly' ? 'weekly_count' : 'monthly_count']: value
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Time Preferences */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={config.timezone}
                onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timezoneOptions.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto Publish</label>
              <select
                value={config.auto_publish ? 'publish' : 'draft'}
                onChange={(e) => setConfig(prev => ({ ...prev, auto_publish: e.target.value === 'publish' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Save as Draft</option>
                <option value="publish">Auto-Publish</option>
              </select>
            </div>
          </div>

          {/* Preferred Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Publishing Hours</label>
            <div className="grid grid-cols-12 gap-1">
              {hourOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleHourToggle(value)}
                  className={`px-2 py-1 text-xs rounded ${
                    config.preferred_hours.includes(value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected: {config.preferred_hours.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ')}
            </p>
          </div>

          {/* Content Preferences */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Style</label>
              <select
                value={config.content_style}
                onChange={(e) => setConfig(prev => ({ ...prev, content_style: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
                <option value="creative">Creative</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Word Count</label>
              <input
                type="number"
                min="500"
                max="5000"
                step="100"
                value={config.target_word_count}
                onChange={(e) => setConfig(prev => ({ ...prev, target_word_count: parseInt(e.target.value) || 1200 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_images}
                  onChange={(e) => setConfig(prev => ({ ...prev, include_images: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="ml-3 text-sm font-medium text-gray-700">Include Images</span>
            </div>
          </div>

          {/* Topic Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Topic Configuration</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Pillars (main themes)</label>
              <textarea
                placeholder="e.g., SEO best practices, content marketing, digital strategy"
                value={config.content_pillars.join(', ')}
                onChange={(e) => handleArrayInput('content_pillars', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic Sources (keywords/topics to write about)</label>
              <textarea
                placeholder="e.g., keyword research, on-page SEO, link building, analytics"
                value={config.topic_sources.join(', ')}
                onChange={(e) => handleArrayInput('topic_sources', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topics to Avoid</label>
              <textarea
                placeholder="e.g., political topics, controversial subjects"
                value={config.avoid_topics.join(', ')}
                onChange={(e) => handleArrayInput('avoid_topics', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>
          </div>

          {/* Status Information */}
          {(config.next_scheduled_at || config.last_generated_at) && (
            <div className="border-t pt-4 mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Schedule Status</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {config.next_scheduled_at && (
                  <div>
                    <div className="text-gray-500">Next Scheduled Post</div>
                    <div className="font-medium text-gray-900">
                      {new Date(config.next_scheduled_at).toLocaleString()}
                    </div>
                  </div>
                )}
                {config.last_generated_at && (
                  <div>
                    <div className="text-gray-500">Last Generated</div>
                    <div className="font-medium text-gray-900">
                      {new Date(config.last_generated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}