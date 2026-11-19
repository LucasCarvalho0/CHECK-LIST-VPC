'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/services/api';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Salvamento com debounce e fila serial (nunca duas requisições simultâneas => sem "requisição antiga vence").
 * `save` deve enviar somente o que mudou e lançar erro em caso de falha (o chamador recoloca o pendente na fila).
 * Em falha de rede/servidor tenta de novo a cada 5 s; o estado só vira "Salvo" após confirmação do servidor.
 */
export function useAutosave(save: () => Promise<void>, enabled: boolean, delay = 800) {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const retry = useRef<ReturnType<typeof setTimeout>>();
  const running = useRef(false);
  const again = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const run = useCallback(async (): Promise<boolean> => {
    if (running.current) { again.current = true; return true; }
    running.current = true;
    clearTimeout(timer.current);
    clearTimeout(retry.current);
    setState('saving');
    let ok = true;
    try {
      await saveRef.current();
      setError(null);
      setState('saved');
    } catch (e) {
      ok = false;
      setState('error');
      setError(e instanceof ApiError ? e.message : 'Erro ao salvar.');
      const fatal = e instanceof ApiError && e.status >= 400 && e.status < 500; // 4xx: não adianta repetir
      if (!fatal) retry.current = setTimeout(() => { void run(); }, 5000);
    } finally {
      running.current = false;
    }
    if (again.current) { again.current = false; return run(); }
    return ok;
  }, []);

  const touch = useCallback(() => {
    if (!enabled) return;
    setState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void run(); }, delay);
  }, [enabled, delay, run]);

  useEffect(() => {
    const online = () => { void run(); };
    window.addEventListener('online', online);
    return () => { window.removeEventListener('online', online); clearTimeout(timer.current); clearTimeout(retry.current); };
  }, [run]);

  return { state, error, touch, flush: run };
}
