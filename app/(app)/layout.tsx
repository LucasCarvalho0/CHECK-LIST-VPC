'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Spinner } from '@/components/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Fecha a barra lateral automaticamente quando o operador clica em um link e a rota muda
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) return <Spinner />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Barra Superior com o botão dos 3 risquinhos */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="relative flex flex-1 overflow-x-hidden">
        {/* Barra Lateral Gaveta Retrátil */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Conteúdo Principal: ganha 100% da largura no Tablet quando a sidebar fecha */}
        <main className="min-w-0 flex-1 p-3 md:p-6 transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </div>
  );
}
