'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [instruction, setInstruction] = useState<string | null>(null);

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

    // 2. Detecta iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // 3. Registrar Service Worker
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

    // 4. Monitorar status de rede
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 5. Capturar evento nativo de instalação
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 6. Se NÃO estiver instalado e NÃO foi dispensado nesta sessão, exibe o modal
    if (!standalone) {
      const dismissed = sessionStorage.getItem('nissan_pwa_dismissed');
      if (!dismissed) {
        // Pequeno delay de 600ms para a página carregar suavemente antes de abrir o modal
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 600);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('online', updateOnlineStatus);
          window.removeEventListener('offline', updateOnlineStatus);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowModal(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Erro ao acionar prompt de instalação:', err);
      }
    } else if (isIos) {
      setInstruction('No Safari do iPhone/iPad: toque no botão Compartilhar 📤 e selecione "Adicionar à Tela de Início" ➕.');
    } else {
      setInstruction('Para instalar neste navegador: clique no ícone de computador/instalar (➕ ou ⬇️) na barra de endereços do topo, ou no menu do navegador (três pontinhos) e escolha "Instalar aplicativo".');
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
            {/* Topo com Logo Nissan em Fundo Branco */}
            <div className="flex flex-col items-center border-b border-slate-100 bg-slate-50/50 p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <img src="/nissan.png" alt="Nissan" className="h-full w-full object-contain" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Instalar Aplicativo Nissan QA?
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

              {/* Instrução adicional caso o navegador exija ação manual */}
              {instruction && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed animate-fade-in">
                  💡 {instruction}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#C3002F] hover:bg-[#a50027] active:scale-[0.98] py-3 px-4 text-sm font-semibold text-white shadow-md transition-all"
                >
                  <span>📲</span>
                  <span>Instalar Aplicativo</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-slate-300 hover:bg-slate-100 active:scale-[0.98] py-3 px-5 text-sm font-medium text-slate-700 transition-all text-center"
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
