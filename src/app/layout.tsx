import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { AuthProvider } from '@/contexts/auth';

export const metadata: Metadata = {
  title: "SEO Metrics Tool",
  description: "AI-powered SEO content generation and optimization platform",
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