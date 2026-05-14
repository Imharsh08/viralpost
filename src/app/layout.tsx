import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import '../styles/tailwind.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'ViralPost — Write, Enhance with AI, Earn from Your Content',
  description: 'ViralPost helps creators write high-engagement posts using AI, publish to a social feed, and earn reward points from ad impressions.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="google-adsense-account" content="ca-pub-6613650835809676" />
      </head>
      <body className={plusJakartaSans.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
            },
          }}
        />

        {/* AdSense — strategy="afterInteractive" avoids Next.js injecting data-component-id */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6613650835809676"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fviralpost7072back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.18" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}