import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from '@/contexts/auth';

export const metadata: Metadata = {
  title: "SEOAgent.com - Put Your SEO on Auto-Pilot | AI SEO Automation for Bootstrappers",
  description: "Automated technical SEO, content writing, and strategic optimization for indie hackers. Built for apps made with Lovable, v0, Create, Replit. Multi-CMS support beats SurferSEO&apos;s WordPress-only limitation.",
  keywords: ["SEO automation", "AI SEO", "technical SEO", "content writer", "multi-CMS", "indie hackers", "bootstrappers", "Lovable", "v0", "Create", "Replit", "SurferSEO alternative"],
  authors: [{ name: "SEOAgent" }],
  creator: "SEOAgent",
  publisher: "SEOAgent",
  robots: "index, follow",
  metadataBase: new URL("https://seoagent.com"),
  alternates: {
    canonical: "https://seoagent.com",
  },
  openGraph: {
    title: "SEOAgent.com - Put Your SEO on Auto-Pilot",
    description: "Automated technical SEO, content writing, and strategic optimization for indie hackers and bootstrappers. Multi-CMS support for Strapi, WordPress, Webflow, Shopify, Ghost.",
    url: "https://seoagent.com",
    siteName: "SEOAgent",
    type: "website",
    locale: "en_US",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "SEOAgent - AI SEO Automation for Bootstrappers"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SEOAgent.com - Put Your SEO on Auto-Pilot",
    description: "Automated technical SEO, content writing, and strategic optimization for indie hackers. Multi-CMS support beats SurferSEO&apos;s WordPress-only limitation.",
    images: ["/og-image.jpg"],
    creator: "@seoagent"
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
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
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