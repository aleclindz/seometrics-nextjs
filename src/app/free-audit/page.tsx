"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Zap, Search, CheckCircle2, AlertTriangle, Sparkles, Shield, Clock } from "lucide-react";

export default function FreeAuditPage() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "analyzing" | "completed" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);
  const pollIntervalRef = useRef<number>(2000);

  // Load URL from sessionStorage on mount
  useEffect(() => {
    const savedUrl = sessionStorage.getItem('auditWebsite');
    if (savedUrl) {
      setUrl(savedUrl);
      sessionStorage.removeItem('auditWebsite'); // Clear after loading
    }
  }, []);

  const startAudit = async () => {
    setResult(null);
    setStatus("starting");
    retryCountRef.current = 0;
    pollIntervalRef.current = 2000;
    try {
      const res = await fetch("/api/crawl/firecrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", url: normalizeUrl(url), maxPages: 10 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to start crawl");
      setJobId(data.job?.jobId || data.job?.id);
      setStatus("running");
    } catch (e) {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!jobId || status !== "running") return;

    const poll = async () => {
      // Max 60 attempts (2 minutes with initial 2s polling)
      if (retryCountRef.current >= 60) {
        clearInterval(pollRef.current);
        setStatus("error");
        return;
      }

      retryCountRef.current++;

      try {
        const sres = await fetch(`/api/crawl/firecrawl?jobId=${encodeURIComponent(jobId)}`);

        if (!sres.ok) {
          // On error, implement exponential backoff
          if (pollIntervalRef.current < 30000) {
            clearInterval(pollRef.current);
            pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 30000);
            pollRef.current = setInterval(poll, pollIntervalRef.current);
          }
          return;
        }

        const sdata = await sres.json();
        if (sdata.success && sdata.status?.done) {
          clearInterval(pollRef.current);
          setStatus("analyzing");
          const ares = await fetch(`/api/free-audit/analyze?jobId=${encodeURIComponent(jobId)}`);
          const adata = await ares.json();
          if (adata.success) {
            setResult(adata);
            setStatus("completed");
          } else {
            setStatus("error");
          }
        }
      } catch (e) {
        // On error, implement exponential backoff
        if (pollIntervalRef.current < 30000) {
          clearInterval(pollRef.current);
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 30000);
          pollRef.current = setInterval(poll, pollIntervalRef.current);
        }
      }
    };

    pollRef.current = setInterval(poll, pollIntervalRef.current);
    return () => clearInterval(pollRef.current);
  }, [jobId, status]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header with Logo */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/assets/SEOAgent_logo.png" alt="SEOAgent" width={140} height={36} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Log in</Link>
            <Link href="/login?mode=signup" className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:opacity-90">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles size={16} />
            No credit card required
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Free SEO Audit
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Get a comprehensive technical SEO analysis of your website in minutes. We&apos;ll scan up to 10 pages and identify critical issues.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <div className="w-12 h-12 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-3">
              <Zap size={24} />
            </div>
            <div className="font-semibold text-slate-900 mb-1">Lightning Fast</div>
            <div className="text-sm text-slate-600">Results in under 2 minutes</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Shield size={24} />
            </div>
            <div className="font-semibold text-slate-900 mb-1">No Sign-Up</div>
            <div className="text-sm text-slate-600">Completely free, no account needed</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Search size={24} />
            </div>
            <div className="font-semibold text-slate-900 mb-1">Deep Analysis</div>
            <div className="text-sm text-slate-600">Scans up to 10 critical pages</div>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Enter your website URL</h2>
            <p className="text-slate-600">We&apos;ll crawl your site and generate a detailed technical SEO report</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <input
                className="w-full border-2 border-slate-300 rounded-lg px-5 py-4 text-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <span className="absolute right-4 top-4.5 text-slate-400">
                <Search size={20} />
              </span>
            </div>
            <button
              onClick={startAudit}
              disabled={!url || status === "starting" || status === "running" || status === "analyzing"}
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90 text-white text-lg font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {status === "starting"
                ? "Starting…"
                : status === "running"
                ? "Crawling…"
                : status === "analyzing"
                ? "Analyzing…"
                : "Start Audit"}
            </button>
          </div>
          <div className="mt-4 text-center text-sm text-slate-500">
            💡 Tip: Enter your full domain (e.g., https://example.com) and we&apos;ll automatically follow internal links
          </div>
        </div>

        {/* Status / Progress */}
        {status !== "idle" && status !== "error" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* In this block, status is one of: "starting" | "running" | "analyzing" | "completed" */}
            <Step label="Start" active={status === "starting"} done={status !== "starting"} />
            <Step label="Crawl" active={status === "running"} done={status === "analyzing" || status === "completed"} />
            <Step label="Analyze" active={status === "analyzing"} done={status === "completed"} />
          </div>
        )}

        {/* Loading Skeletons */}
        {(status === "starting" || status === "running" || status === "analyzing") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {status === "completed" && result && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
                  <CheckCircle2 size={18} />
                </div>
                <div className="text-lg font-semibold text-slate-900">Audit Summary</div>
              </div>
              <div className="text-sm text-slate-700">Analyzed {result.totals.analyzed_pages} of {result.totals.total_pages} pages.</div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <Metric label="Missing titles" value={result.totals.issues.missing_title} />
                <Metric label="Missing meta desc" value={result.totals.issues.missing_meta_description} />
                <Metric label="Missing H1" value={result.totals.issues.missing_h1} />
                <Metric label="Missing canonical" value={result.totals.issues.missing_canonical} />
                <Metric label="Noindex" value={result.totals.issues.noindex} />
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">
                    <Zap size={18} />
                  </div>
                  <div className="text-lg font-semibold text-slate-900">Top Recommendations</div>
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {result.recommendations.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Issues */}
            {result.totals?.samples?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="text-lg font-semibold text-slate-900">Sample Pages with Issues</div>
                </div>
                <ul className="text-sm text-slate-700 space-y-2">
                  {result.totals.samples.map((s: any, i: number) => (
                    <li key={i} className="p-3 rounded-lg border border-slate-200">
                      <div className="text-indigo-700 break-all">{s.url}</div>
                      <div className="text-xs text-slate-600 mt-1">{s.issues.join(", ")}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-indigo-50 rounded-2xl border border-violet-200 p-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white text-violet-700 px-4 py-2 text-sm font-medium mb-4 shadow-sm">
                <Sparkles size={16} />
                Want help fixing these issues?
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Let SEOAgent fix these automatically
              </h3>
              <p className="text-slate-600 mb-6 max-w-xl mx-auto">
                Start your $1 trial and let our AI agent handle technical SEO, content optimization, and more—completely on autopilot.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/login?mode=signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all">
                  Start $1 Trial
                </Link>
                <a href="https://calendly.com/alec-aleclindz/30min" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 shadow-sm transition-all">
                  Talk to an expert
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-700 text-center">
            <div className="font-semibold mb-2">Oops! Something went wrong</div>
            <div className="text-sm">We couldn&apos;t complete the audit. Please check the URL and try again.</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/assets/SEOAgent_logo.png" alt="SEOAgent" width={120} height={30} />
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/login" className="hover:text-slate-900">Log in</Link>
              <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
              <a href="https://calendly.com/alec-aleclindz/30min" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Contact</a>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500 mt-6">
            © 2025 SEOAgent. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${done ? 'border-emerald-200' : active ? 'border-violet-200' : 'border-slate-200'}`}>
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className={`mt-2 h-2 rounded-full ${done ? 'bg-emerald-400' : active ? 'bg-violet-400 animate-pulse' : 'bg-slate-200'}`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function normalizeUrl(u: string): string {
  let v = u.trim();
  if (!v) return v;

  // Remove protocol if present
  v = v.replace(/^https?:\/\//, '');

  // Remove 'www.' if present
  v = v.replace(/^www\./, '');

  // Remove trailing slash
  v = v.replace(/\/$/, '');

  // Add https:// back
  return `https://${v}`;
}
