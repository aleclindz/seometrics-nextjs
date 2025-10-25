import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from '@/contexts/auth';
import OnboardingGate from '@/components/OnboardingGate';

export const metadata: Metadata = {
  title: "SEOAgent — Strategic SEO Articles Auto-Published Every Day",
  description: "Drive organic traffic on autopilot. Automated SEO content generation with strategic topic clusters, interlinking, and citations. No Slop. Just Strategic.",
  keywords: ["automated SEO", "AI content generation", "strategic SEO", "topic clusters", "content automation", "organic traffic", "SEO agent", "auto-publishing", "SEO strategy"],
  authors: [{ name: "SEOAgent" }],
  creator: "SEOAgent",
  publisher: "SEOAgent",
  robots: "index, follow",
  metadataBase: new URL("https://seoagent.com"),
  alternates: {
    canonical: "https://seoagent.com",
  },
  openGraph: {
    title: "SEOAgent — Strategic SEO Articles Auto-Published Every Day",
    description: "Drive organic traffic on autopilot. Automated SEO content with strategic topic clusters, interlinking, and authoritative citations.",
    url: "https://seoagent.com",
    siteName: "SEOAgent",
    type: "website",
    locale: "en_US",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "SEOAgent - Strategic SEO Articles Auto-Published Every Day"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SEOAgent — Strategic SEO Articles Auto-Published Every Day",
    description: "Drive organic traffic on autopilot. Automated SEO content with strategic topic clusters, interlinking, and authoritative citations.",
    images: ["/og-image.jpg"],
    creator: "@seoagent"
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#6B35F5"
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
          <OnboardingGate>
            {children}
          </OnboardingGate>
        </AuthProvider>
        
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-V6T409KL12"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-V6T409KL12');
          `}
        </Script>

        {/* SEOAgent.js - Our own SEO automation tool */}
        <Script
          src="/seoagent.js"
          strategy="afterInteractive"
        />

      </body>
    </html>
  );
}