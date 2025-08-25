import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from '@/contexts/auth';
import OnboardingGate from '@/components/OnboardingGate';

export const metadata: Metadata = {
  title: "SEOAgent — AI SEO Agent that Fixes the Boring Stuff",
  description: "Auto-audits, instant on-page fixes, and indexation guardrails. Set it and forget it in 3 minutes.",
  keywords: ["AI SEO agent", "automated SEO fixes", "technical SEO", "indexing guardrails", "on-page optimization", "SEO automation", "indie hackers", "bootstrappers"],
  authors: [{ name: "SEOAgent" }],
  creator: "SEOAgent",
  publisher: "SEOAgent",
  robots: "index, follow",
  metadataBase: new URL("https://seoagent.com"),
  alternates: {
    canonical: "https://seoagent.com",
  },
  openGraph: {
    title: "SEOAgent — AI SEO Agent that Fixes the Boring Stuff",
    description: "Set it and forget it: auto-audits, instant on-page fixes, and indexation guardrails—so your content actually ranks.",
    url: "https://seoagent.com",
    siteName: "SEOAgent",
    type: "website",
    locale: "en_US",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "SEOAgent - AI SEO Agent that Fixes the Boring Stuff"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SEOAgent — AI SEO Agent that Fixes the Boring Stuff",
    description: "Set it and forget it: auto-audits, instant on-page fixes, and indexation guardrails—so your content actually ranks.",
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
          <OnboardingGate>
            {children}
          </OnboardingGate>
        </AuthProvider>
        
        {/* SEOAgent.js */}
        <Script src="https://seoagent.com/smart.js" strategy="afterInteractive" />
        <Script id="seoagent-config" strategy="afterInteractive">
          {`const idv = '6c75fd38-4b80-4a48-be65-66077efb92d9';`}
        </Script>
      </body>
    </html>
  );
}