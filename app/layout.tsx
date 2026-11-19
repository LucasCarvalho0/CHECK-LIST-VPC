import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import { PwaManager } from '@/components/PwaManager';

export const metadata: Metadata = {
  title: 'Checklist de Instalação Multimídia Nissan – SESÉ QA',
  description: 'Sistema de Inspeção de Multimídia e Controle de Qualidade VPC - SESÉ QA',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SESÉ QA',
  },
};

export const viewport: Viewport = {
  themeColor: '#C3002F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Redirecionamento automático caso acesse uma URL temporária com hash de preview da Vercel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var h = window.location.hostname;
                if (h.endsWith('.vercel.app') && h !== 'nissan-checklist-multimidia.vercel.app') {
                  window.location.replace('https://nissan-checklist-multimidia.vercel.app' + window.location.pathname + window.location.search);
                }
              } catch(e) {}
            `,
          }}
        />
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
