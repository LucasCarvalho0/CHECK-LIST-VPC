'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Checa atualizações periodicamente
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Nova versão do PWA Nissan disponível.');
                }
              };
            }
          };
        })
        .catch((err) => console.warn('PWA SW Register:', err));
    }

    // 2. Monitorar status de rede
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 3. Capturar evento de instalação nativa
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {/* Banner de Conexão Offline */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md animate-fade-in"
        >
          <span>⚠️</span>
          <span>Você está operando offline. As alterações locais serão sincronizadas ao reconectar.</span>
        </div>
      )}

      {/* Banner moderno para Instalar App PWA */}
      {isInstallable && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 p-1.5">
            <img src="/nissan.png" alt="Nissan" className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold leading-tight text-white">Instalar Nissan QA</h4>
            <p className="text-xs text-slate-400 truncate">Acesse rápido como aplicativo no seu aparelho</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="rounded-lg bg-[#C3002F] hover:bg-[#a50027] px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors"
            >
              Instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
