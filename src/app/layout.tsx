import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}