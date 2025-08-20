'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, Zap, BarChart3, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AuditIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  fixableByAgent: boolean;
  category: 'technical' | 'content' | 'performance';
}

interface AuditResults {
  websiteUrl: string;
  overallScore: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  fixableByAgent: number;
  issues: AuditIssue[];
  completedAt: string;
}

export default function FreeAuditPage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/free-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          email: email.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audit failed');
      }

      setResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (results) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SEO Audit Results for {results.websiteUrl}
            </h1>
            <div className="flex justify-center items-center mb-6">
              <div className="text-6xl font-bold mr-4 ${getScoreColor(results.overallScore)}">
                {results.overallScore}
              </div>
              <div className="text-left">
                <div className="text-2xl font-semibold text-gray-700">Overall SEO Score</div>
                <div className="text-gray-500">Out of 100</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardContent className="flex items-center p-6">
                <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{results.totalIssues}</div>
                  <div className="text-gray-600">Total Issues</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Zap className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{results.fixableByAgent}</div>
                  <div className="text-gray-600">Auto-fixable</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.criticalIssues}</div>
                  <div className="text-gray-600">Critical Issues</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{results.warningIssues}</div>
                  <div className="text-gray-600">Warnings</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="mb-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                🚀 SEOAgent can automatically fix {results.fixableByAgent} of these {results.totalIssues} issues
              </h2>
              <p className="text-xl mb-6 opacity-90">
                Stop doing SEO manually. Let our AI agent fix these issues while you focus on growing your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <Link href="/login?mode=signup">Start Free Trial - Fix These Issues</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
                  <Link href="/login">I Already Have an Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Issues Found</h2>
            
            {results.issues.map((issue, index) => (
              <Card key={index} className="border-l-4 border-l-gray-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(issue.severity)}
                      <div>
                        <CardTitle className="text-lg">{issue.title}</CardTitle>
                        <CardDescription className="mt-1">{issue.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {issue.fixableByAgent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto-fixable
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{issue.recommendation}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <Card className="mt-12 bg-gray-900 text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to fix these issues automatically?</h3>
              <p className="text-gray-300 mb-6">
                Join 1,000+ websites using SEOAgent to automate their technical SEO
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/login?mode=signup">Get Started - 14 Day Free Trial</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Free SEO Audit
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Get a comprehensive SEO analysis of your website in seconds. 
            Discover what&apos;s holding back your search rankings.
          </p>
          <div className="flex justify-center space-x-8 text-sm opacity-80">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              No signup required
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Results in 30 seconds
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Actionable recommendations
            </div>
          </div>
        </div>
      </div>

      {/* Audit Form */}
      <div className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Enter Your Website</CardTitle>
              <CardDescription className="text-center">
                We&apos;ll analyze your website and show you exactly what needs to be fixed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="website">Website URL *</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Get a detailed report sent to your email
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Audit...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Free SEO Audit
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What Our SEO Audit Checks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Technical SEO</h3>
              <p className="text-gray-600">
                Meta tags, robots.txt, sitemap, URL structure, and technical elements that impact search rankings.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Content Analysis</h3>
              <p className="text-gray-600">
                Heading structure, content quality, keyword optimization, and on-page SEO factors.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Auto-Fix Opportunities</h3>
              <p className="text-gray-600">
                Issues that SEOAgent can automatically fix for you, saving hours of manual work.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Trusted by 1,000+ Websites
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-4xl font-bold text-green-600 mb-2">47%</p>
              <p className="text-gray-600">Average ranking improvement</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-4xl font-bold text-blue-600 mb-2">10 min</p>
              <p className="text-gray-600">Average setup time</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-4xl font-bold text-purple-600 mb-2">24/7</p>
              <p className="text-gray-600">Automated monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}