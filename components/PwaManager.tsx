'use client';

import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __nissanInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Checa se já está rodando como App instalado (Standalone)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();
    if (standalone) return;

    // 2. Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
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

    // 3. Monitorar status de rede
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 4. Capturar evento nativo de instalação
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      window.__nissanInstallPrompt = p;
      promptRef.current = p;
      setDeferredPrompt(p);

      // Abre o modal de instalação no momento exato em que o navegador estiver 100% pronto
      const dismissed = sessionStorage.getItem('nissan_pwa_dismissed');
      if (!dismissed) {
        setShowModal(true);
      }
    };

    // 5. Quando o app for instalado com sucesso pelo navegador
    const handleAppInstalled = () => {
      setShowModal(false);
      setIsStandalone(true);
      window.__nissanInstallPrompt = null;
      promptRef.current = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Caso o navegador já tenha disparado o evento anteriormente
    if (window.__nissanInstallPrompt) {
      promptRef.current = window.__nissanInstallPrompt;
      setDeferredPrompt(window.__nissanInstallPrompt);
      const dismissed = sessionStorage.getItem('nissan_pwa_dismissed');
      if (!dismissed) {
        setShowModal(true);
      }
    } else {
      // Fallback: se em 1.5s o evento não tiver disparado, abre o modal para que o usuário saiba que pode instalar
      const dismissed = sessionStorage.getItem('nissan_pwa_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 1500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('online', updateOnlineStatus);
          window.removeEventListener('offline', updateOnlineStatus);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    let prompt = deferredPrompt || promptRef.current || window.__nissanInstallPrompt;

    // Se o evento estiver a caminho, aguarda até 2.5s pelo evento
    if (!prompt) {
      prompt = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const p = promptRef.current || window.__nissanInstallPrompt;
          if (p) {
            clearInterval(interval);
            resolve(p);
          } else if (attempts >= 25) { // 2.5 segundos
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
    }

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowModal(false);
          setDeferredPrompt(null);
          window.__nissanInstallPrompt = null;
          promptRef.current = null;
        }
      } catch (err) {
        console.error('Erro ao acionar prompt de instalação:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setIsInstalling(false);
      // Para navegadores desktop que suportam atalho nativo ou Safari iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        alert('No Safari do iPhone/iPad: Toque no botão Compartilhar (ícone com quadrado e seta 📤) e depois em "Adicionar à Tela de Início" ➕.');
      } else {
        alert('No topo da barra de endereços do seu navegador, clique no ícone de instalar aplicativo (➕ ou ⬇️) para concluir.');
      }
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('nissan_pwa_dismissed', 'true');
  };

  // Se já estiver instalado no modo App, não precisa exibir nada
  if (isStandalone) {
    return isOffline ? (
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md"
      >
        <span>⚠️</span>
        <span>Você está operando offline. As alterações locais serão sincronizadas ao reconectar.</span>
      </div>
    ) : null;
  }

  return (
    <>
      {/* Alerta de Modo Offline */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md animate-fade-in"
        >
          <span>⚠️</span>
          <span>Você está operando offline. As alterações locais serão sincronizadas ao reconectar.</span>
        </div>
      )}

      {/* Modal Prominente de Instalação do Sistema (PWA) */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Topo com Logo CCE em Fundo Branco */}
            <div className="flex flex-col items-center border-b border-slate-100 bg-slate-50/50 p-6 text-center">
              <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <img src="/grupo-sese.png" alt="CCE QA" className="h-full w-full object-contain" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Instalar Aplicativo CCE QA?
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sistema de Checklist de Multimídia e Controle VPC
              </p>
            </div>

            {/* Conteúdo / Benefícios */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed text-center">
                Deseja instalar este sistema como aplicativo no seu dispositivo?
              </p>

              <div className="grid gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#C3002F] font-bold">✓</span>
                  <span><strong>Acesso rápido:</strong> Ícone direto na tela inicial</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#C3002F] font-bold">✓</span>
                  <span><strong>Tela cheia:</strong> Sem barras do navegador para mais espaço</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[#C3002F] font-bold">✓</span>
                  <span><strong>Modo Offline:</strong> Funciona mesmo se a conexão cair</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#C3002F] hover:bg-[#a50027] active:scale-[0.98] disabled:opacity-75 py-3 px-4 text-sm font-semibold text-white shadow-md transition-all cursor-pointer"
                >
                  {isInstalling ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Instalando...</span>
                    </>
                  ) : (
                    <>
                      <span>📲</span>
                      <span>Instalar Aplicativo</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleDismiss}
                  className="rounded-xl border border-slate-300 hover:bg-slate-100 active:scale-[0.98] py-3 px-5 text-sm font-medium text-slate-700 transition-all text-center cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
