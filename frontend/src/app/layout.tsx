import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'SmartCon360 — Construction Management Platform',
  description: 'AI-Powered Unified Construction Management Platform. 13 integrated modules covering all PMBOK areas plus OHS and ESG.',
  keywords: ['construction management', 'takt planning', 'lean construction', 'EVM', 'quality', 'safety', 'risk', 'AI', 'PMBOK', 'SmartCon360'],
  authors: [{ name: 'Yuksel Arslan' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/smartcon360-icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartCon360',
  },
  openGraph: {
    type: 'website',
    title: 'SmartCon360 — Construction Management Platform',
    description: 'AI-Powered Unified Construction Management. 13 modules, one platform.',
    siteName: 'SmartCon360',
  },
};

export const viewport: Viewport = {
  themeColor: '#E8731A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
