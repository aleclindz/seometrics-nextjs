import type { Metadata } from "next";
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
      </body>
    </html>
  );
}