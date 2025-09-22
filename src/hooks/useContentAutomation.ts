import { useState, useEffect } from 'react';

interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  billing_period: {
    start: string | null;
    end: string | null;
  };
}

interface SchedulingSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  auto_publish: boolean;
  next_scheduled_at: string | null;
}

interface WebsiteAutomationSettings {
  id: number;
  domain: string;
  website_token: string;
  enable_automated_content: boolean;
  scheduling: SchedulingSettings;
}

interface UseContentAutomationReturn {
  websites: WebsiteAutomationSettings[];
  quota: QuotaInfo;
  loading: boolean;
  error: string | null;
  updateAutomationSettings: (websiteToken: string, settings: Partial<WebsiteAutomationSettings>) => Promise<void>;
  checkQuota: () => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

export function useContentAutomation(userToken: string, websiteToken?: string): UseContentAutomationReturn {
  const [websites, setWebsites] = useState<WebsiteAutomationSettings[]>([]);
  const [quota, setQuota] = useState<QuotaInfo>({
    limit: 0,
    used: 0,
    remaining: 0,
    billing_period: { start: null, end: null }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ userToken });
      if (websiteToken) {
        params.append('websiteToken', websiteToken);
      }

      const response = await fetch(`/api/content/automation-settings?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch automation settings');
      }

      setWebsites(data.data.websites || []);
      setQuota(data.data.quota || {
        limit: 0,
        used: 0,
        remaining: 0,
        billing_period: { start: null, end: null }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateAutomationSettings = async (
    targetWebsiteToken: string,
    settings: Partial<WebsiteAutomationSettings>
  ) => {
    try {
      const response = await fetch('/api/content/automation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteToken: targetWebsiteToken,
          enable_automated_content: settings.enable_automated_content,
          scheduling: settings.scheduling
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      // Update local state
      setWebsites(prev => prev.map(website =>
        website.website_token === targetWebsiteToken
          ? { ...website, ...settings }
          : website
      ));

    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const checkQuota = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/content/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          action: 'check_quota'
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to check quota');
      }

      return data.data.can_generate;
    } catch (err) {
      console.error('Error checking quota:', err);
      return false;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    if (userToken) {
      fetchSettings();
    }
  }, [userToken, websiteToken]);

  return {
    websites,
    quota,
    loading,
    error,
    updateAutomationSettings,
    checkQuota,
    refreshSettings
  };
}