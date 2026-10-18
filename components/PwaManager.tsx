'use client';

import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __seseInstallPrompt?: BeforeInstallPromptEvent | null;
    __nissanInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const handleUpdateApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } finally {
      window.location.reload();
    }
  };

  useEffect(() => {
    // 1. Checa se o sistema já foi instalado
    const checkInstalled = () => {
      if (typeof window === 'undefined') return false;
      const isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('sese_pwa_installed') === 'true' ||
        localStorage.getItem('nissan_pwa_installed') === 'true';

      if (isInstalled) {
        setIsStandalone(true);
        setShowModal(false);
      }
      return isInstalled;
    };

    const alreadyInstalled = checkInstalled();

    // Checagem avançada de app instalado via navegador (quando suportado)
    if ('getInstalledRelatedApps' in navigator) {
      try {
        (navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> })
          .getInstalledRelatedApps?.()
          .then((apps) => {
            if (apps && apps.length > 0) {
              localStorage.setItem('sese_pwa_installed', 'true');
              setIsStandalone(true);
              setShowModal(false);
            }
          })
          .catch(() => {});
      } catch (_) {}
    }

    // 2. Registrar Service Worker SEMPRE (inclusive em modo Standalone)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Força verificação imediata de atualizações
          reg.update();

          // Se já tem um service worker esperando, avisa que há atualização
          if (reg.waiting) {
            setUpdateAvailable(true);
          }

          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('Nova versão do PWA SESÉ QA pronta.');
                    setUpdateAvailable(true);
                  }
                }
              };
            }
          };
        })
        .catch((err) => console.warn('PWA SW Register:', err));

      // Se o novo Service Worker assumiu o controle, recarrega para aplicar
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 3. Monitorar status de rede
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 4. Checar atualização ao voltar ao aplicativo (foco / visibilidade)
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update();
            if (reg.waiting) setUpdateAvailable(true);
          }
        });
      }
    };
    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    });

    // 5. Se já foi reconhecido como instalado, não abre modal de instalação
    if (alreadyInstalled) {
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        window.removeEventListener('focus', checkForUpdates);
      };
    }

    // 6. Capturar evento nativo de instalação e evento de sucesso
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      window.__seseInstallPrompt = p;
      promptRef.current = p;
      setDeferredPrompt(p);

      // Se não está instalado e nem dispensado temporariamente na sessão
      if (!checkInstalled()) {
        const dismissed = sessionStorage.getItem('sese_pwa_dismissed');
        if (!dismissed) {
          setShowModal(true);
        }
      }
    };

    // Evento disparado pelo navegador assim que a instalação é concluída com sucesso
    const handleAppInstalled = () => {
      localStorage.setItem('sese_pwa_installed', 'true');
      sessionStorage.removeItem('sese_pwa_dismissed');
      setShowModal(false);
      setIsStandalone(true);
      window.__seseInstallPrompt = null;
      promptRef.current = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const existingPrompt = window.__seseInstallPrompt || window.__nissanInstallPrompt;
    if (existingPrompt) {
      promptRef.current = existingPrompt;
      setDeferredPrompt(existingPrompt);
      if (!checkInstalled() && !sessionStorage.getItem('sese_pwa_dismissed')) {
        setShowModal(true);
      }
    } else {
      // Assim que entrar no sistema, se ainda não foi instalado, exibe a opção de baixar
      if (!checkInstalled() && !sessionStorage.getItem('sese_pwa_dismissed')) {
        const timer = setTimeout(() => {
          if (!checkInstalled()) {
            setShowModal(true);
          }
        }, 1000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('online', updateOnlineStatus);
          window.removeEventListener('offline', updateOnlineStatus);
          window.removeEventListener('focus', checkForUpdates);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('focus', checkForUpdates);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    let prompt = deferredPrompt || promptRef.current || window.__seseInstallPrompt || window.__nissanInstallPrompt;

    if (!prompt) {
      prompt = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const p = promptRef.current || window.__seseInstallPrompt || window.__nissanInstallPrompt;
          if (p) {
            clearInterval(interval);
            resolve(p);
          } else if (attempts >= 15) {
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
          // Confirmou e baixou: grava para nunca mais mostrar a mensagem
          localStorage.setItem('sese_pwa_installed', 'true');
          sessionStorage.removeItem('sese_pwa_dismissed');
          setIsStandalone(true);
          setShowModal(false);
          setDeferredPrompt(null);
          window.__seseInstallPrompt = null;
          promptRef.current = null;
        } else {
          // Usuário cancelou o prompt nativo
          setShowModal(false);
          sessionStorage.setItem('sese_pwa_dismissed', 'true');
        }
      } catch (err) {
        console.error('Erro ao acionar prompt de instalação:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setIsInstalling(false);
      // Caso não haja prompt automático (ex.: Safari no iOS ou navegador específico)
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        alert('No Safari do iPhone/iPad: Toque no botão Compartilhar (ícone com quadrado e seta 📤) e depois em "Adicionar à Tela de Início" ➕.');
      } else {
        alert('No topo da barra de endereços do seu navegador, clique no ícone de instalar aplicativo (➕ ou ⬇️) para concluir a instalação.');
      }
      // Marca como aceito/confirmado para não ficar incomodando
      localStorage.setItem('sese_pwa_installed', 'true');
      setIsStandalone(true);
      setShowModal(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('sese_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* Banner de Atualização Disponível (aparece no topo do App PWA) */}
      {updateAvailable && (
        <aside
          role="status"
          aria-label="Atualização disponível"
          className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between gap-3 bg-slate-900 border-b-2 border-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base animate-bounce">🚀</span>
            <span className="truncate">Nova versão do <strong>SESÉ QA</strong> disponível!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUpdateApp}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition cursor-pointer"
            >
              Atualizar Agora
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      {/* Alerta de Modo Offline */}
      {isOffline && (
        <aside
          role="status"
          aria-label="Modo offline"
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md"
        >
          <span>⚠️</span>
          <span>Você está operando offline. As alterações locais serão sincronizadas ao reconectar.</span>
        </aside>
      )}

      {/* Modal Prominente de Instalação do Sistema (PWA) */}
      {!isStandalone && showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Topo com Logo SESÉ em Fundo Branco */}
            <div className="flex flex-col items-center border-b border-slate-100 bg-slate-50/50 p-6 text-center">
              <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/grupo-sese.png" alt="SESÉ QA" className="h-full w-full object-contain" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Instalar Aplicativo SESÉ QA?
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Checklist Multimídia e Controle de Qualidade VPC
              </p>
            </div>

            {/* Conteúdo / Benefícios */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed text-center">
                Deseja instalar este sistema como aplicativo no seu dispositivo?
              </p>

              <div className="grid gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">✓</span>
                  <span><strong>Acesso rápido:</strong> Ícone direto na tela inicial</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">✓</span>
                  <span><strong>Tela cheia:</strong> Mais espaço sem barra de navegação</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">✓</span>
                  <span><strong>Desempenho:</strong> Carregamento instantâneo</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleInstallClick}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isInstalling ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Instalando...
                    </>
                  ) : (
                    'Instalar Aplicativo Agora'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                >
                  Agora não, continuar no navegador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
