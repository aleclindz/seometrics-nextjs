import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from '@/contexts/auth';

export const metadata: Metadata = {
  title: "SEO Metrics - Put Your SEO on Auto-Pilot | AI-Powered SEO Automation",
  description: "Automate your SEO with AI-powered alt-tags, meta descriptions, and Generative Engine Optimization. Perfect for side projects and developers. Get discovered by ChatGPT, Claude, and AI search engines.",
  keywords: ["SEO automation", "AI SEO", "alt-tags", "meta descriptions", "GEO", "ChatGPT SEO", "Claude SEO", "side projects", "developers"],
  authors: [{ name: "SEO Metrics" }],
  creator: "SEO Metrics",
  publisher: "SEO Metrics",
  robots: "index, follow",
  openGraph: {
    title: "SEO Metrics - Put Your SEO on Auto-Pilot",
    description: "AI-powered SEO automation for developers and side projects. Auto-generate alt-tags, meta descriptions, and optimize for AI search engines.",
    url: "https://seometrics.com",
    siteName: "SEO Metrics",
    type: "website",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "SEO Metrics - AI-Powered SEO Automation"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Metrics - Put Your SEO on Auto-Pilot",
    description: "AI-powered SEO automation for developers and side projects. Auto-generate alt-tags, meta descriptions, and optimize for AI search engines.",
    images: ["/og-image.jpg"]
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#7c3aed"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        
        {/* SEO Metrics Smart.js */}
        <Script src="/smart.js" strategy="afterInteractive" />
        <Script id="seo-metrics-config" strategy="afterInteractive">
          {`const idv = '1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8';`}
        </Script>
      </body>
    </html>
  );
}