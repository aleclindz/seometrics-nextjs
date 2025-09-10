'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function FreeAuditPage() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<any>(null);

  const startAudit = async () => {
    setResult(null);
    setStatus('starting');
    try {
      const res = await fetch('/api/crawl/firecrawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', url: normalizeUrl(url), maxPages: 30 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start crawl');
      setJobId(data.job?.jobId || data.job?.id);
      setStatus('running');
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!jobId || status !== 'running') return;
    pollRef.current = setInterval(async () => {
      try {
        const sres = await fetch(`/api/crawl/firecrawl?jobId=${encodeURIComponent(jobId)}`);
        const sdata = await sres.json();
        if (sdata.success && sdata.status?.done) {
          clearInterval(pollRef.current);
          setStatus('analyzing');
          const ares = await fetch(`/api/free-audit/analyze?jobId=${encodeURIComponent(jobId)}`);
          const adata = await ares.json();
          if (adata.success) {
            setResult(adata);
            setStatus('completed');
          } else {
            setStatus('error');
          }
        }
      } catch (e) {
        // keep polling; transient
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [jobId, status]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Free SEO Audit</h1>
        <p className="text-gray-600 mb-6">Enter your website to scan up to 30 pages for common technical SEO issues. No sign‑up required.</p>

        <div className="flex gap-3 mb-8">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <button
            onClick={startAudit}
            disabled={!url || status === 'starting' || status === 'running' || status === 'analyzing'}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {status === 'starting' ? 'Starting…' : status === 'running' ? 'Crawling…' : status === 'analyzing' ? 'Analyzing…' : 'Start Audit'}
          </button>
        </div>

        {status === 'completed' && result && (
          <div className="space-y-6">
            <div className="border rounded p-4">
              <div className="font-medium text-gray-900 mb-2">Audit Summary</div>
              <div className="text-sm text-gray-700">Analyzed {result.totals.analyzed_pages} of {result.totals.total_pages} pages.</div>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <li>Missing titles: <strong>{result.totals.issues.missing_title}</strong></li>
                <li>Missing meta descriptions: <strong>{result.totals.issues.missing_meta_description}</strong></li>
                <li>Missing H1: <strong>{result.totals.issues.missing_h1}</strong></li>
                <li>Missing canonical: <strong>{result.totals.issues.missing_canonical}</strong></li>
                <li>Noindex: <strong>{result.totals.issues.noindex}</strong></li>
              </ul>
            </div>

            {result.recommendations?.length > 0 && (
              <div className="border rounded p-4">
                <div className="font-medium text-gray-900 mb-2">Top Recommendations</div>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {result.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {result.totals?.samples?.length > 0 && (
              <div className="border rounded p-4">
                <div className="font-medium text-gray-900 mb-2">Sample Pages with Issues</div>
                <ul className="text-sm text-gray-700 space-y-2">
                  {result.totals.samples.map((s: any, i: number) => (
                    <li key={i}>
                      <div className="text-blue-700 break-all">{s.url}</div>
                      <div className="text-xs text-gray-600">{s.issues.join(', ')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeUrl(u: string): string {
  const v = u.trim();
  if (!v) return v;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `https://${v}`;
}

