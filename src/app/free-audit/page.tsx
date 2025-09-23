"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Zap, Search, CheckCircle2, AlertTriangle } from "lucide-react";

export default function FreeAuditPage() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "analyzing" | "completed" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<any>(null);

  const startAudit = async () => {
    setResult(null);
    setStatus("starting");
    try {
      const res = await fetch("/api/crawl/firecrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", url: normalizeUrl(url), maxPages: 30 }),
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
    pollRef.current = setInterval(async () => {
      try {
        const sres = await fetch(`/api/crawl/firecrawl?jobId=${encodeURIComponent(jobId)}`);
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
        // keep polling; transient
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [jobId, status]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold text-slate-900">Free SEO Audit</h1>
          <p className="text-slate-600 mt-2">Scan up to 30 pages for technical SEO issues. No sign‑up required.</p>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <span className="absolute right-3 top-3.5 text-slate-400">
                <Search size={18} />
              </span>
            </div>
            <button
              onClick={startAudit}
              disabled={!url || status === "starting" || status === "running" || status === "analyzing"}
              className="px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50"
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
          <div className="mt-3 text-xs text-slate-500">Tip: include your full domain (we’ll follow internal links).</div>
        </div>

        {/* Status / Progress */}
        {status !== "idle" && status !== "error" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Step label="Start" active={status !== "idle"} done={status !== "idle"} />
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
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 text-violet-700 px-4 py-2 text-sm">Want help fixing these? ✨</div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Link href="/login?mode=signup" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-lg font-semibold">Start $1 trial</Link>
                <a href="https://calendly.com/alec-aleclindz/30min" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-3 rounded-lg font-semibold hover:bg-slate-50">Talk to us</a>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">We couldn’t complete the audit. Please check the URL and try again.</div>
        )}
      </div>
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
  const v = u.trim();
  if (!v) return v;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}
