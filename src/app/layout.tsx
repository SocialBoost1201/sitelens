import type { Metadata } from "next";
import Script from "next/script";
import { PostHogProvider } from "@/lib/posthog/provider";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-V6GWNNBJRT";

export const metadata: Metadata = {
  metadataBase: new URL('https://sitelens.app'),
  title: {
    default: 'SiteLens — Website Analysis & Audit Dashboard',
    template: '%s | SiteLens',
  },
  description: 'Unified website analysis and audit dashboard. SEO audits, performance insights, and site health monitoring.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'SiteLens',
    title: 'SiteLens — Website Analysis & Audit Dashboard',
    description: 'Unified website analysis and audit dashboard.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "@id": "https://sitelens.app/#application",
              name: "SiteLens",
              url: "https://sitelens.app",
              applicationCategory: "WebApplication",
              description: "Unified website analysis and audit dashboard. SEO audits, performance insights, and site health monitoring.",
              operatingSystem: "Web",
            }),
          }}
        />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
