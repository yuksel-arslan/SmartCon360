import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'TaktFlow AI — Takt Planning Platform',
  description: 'AI-Powered Takt Planning for Construction. Combines LBMS, Takt Time Construction, and Last Planner System with artificial intelligence.',
  keywords: ['takt planning', 'construction', 'lean construction', 'flowline', 'LPS', 'PPC', 'AI'],
  authors: [{ name: 'Yuksel Arslan' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/taktflow-icon.svg', type: 'image/svg+xml' },
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
    title: 'TaktFlow AI',
  },
  openGraph: {
    type: 'website',
    title: 'TaktFlow AI — Takt Planning Platform',
    description: 'AI-Powered Takt Planning for Construction',
    siteName: 'TaktFlow AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
