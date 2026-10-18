import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import { PwaManager } from '@/components/PwaManager';

export const viewport: Viewport = {
  themeColor: '#C3002F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Checklist Multimídia – SESÉ QA',
  description: 'Sistema de Inspeção de Multimídia e Controle de Qualidade VPC – SESÉ QA',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/grupo-sese.png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SESÉ QA',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SESÉ QA" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AuthProvider>
          <PwaManager />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
