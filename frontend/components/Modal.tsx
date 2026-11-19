'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Btn } from './ui';

export function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {children}
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  icon?: 'confirm' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  icon = 'confirm',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClose={loading ? undefined : onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 transition-all transform animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
              variant === 'danger' || icon === 'warning'
                ? 'bg-red-100 text-red-600'
                : 'bg-red-50 text-nissan border border-red-100'
            }`}
          >
            {icon === 'warning' || variant === 'danger' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Btn
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 font-medium"
          >
            {cancelLabel}
          </Btn>
          <Btn
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 font-medium shadow-sm"
          >
            {loading ? 'Processando...' : confirmLabel}
          </Btn>
        </div>
      </div>
    </ModalBackdrop>
  );
}

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  required?: boolean;
  initialValue?: string;
  loading?: boolean;
  isPassword?: boolean;
  minLength?: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  label,
  placeholder = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  required = true,
  initialValue = '',
  loading = false,
  isPassword = false,
  minLength,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [val, setVal] = useState(initialValue);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVal(initialValue);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const isValid = (!required || val.trim().length > 0) && (!minLength || val.length >= minLength);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValid || loading) return;
    onConfirm(val.trim());
  };

  return (
    <ModalBackdrop onClose={loading ? undefined : onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 transition-all transform animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
              variant === 'danger'
                ? 'bg-red-100 text-red-600'
                : 'bg-red-50 text-nissan border border-red-100'
            }`}
          >
            {variant === 'danger' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{title}</h3>
            {message && <p className="mt-1 text-sm text-slate-600 leading-relaxed">{message}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            {label && (
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
            )}
            <div className="relative">
              {isPassword ? (
                <>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={showPassword ? 'text' : 'password'}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    minLength={minLength}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-nissan focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 transition"
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </>
              ) : (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={3}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={placeholder}
                  required={required}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-nissan focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-100 transition resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSubmit();
                    }
                  }}
                />
              )}
            </div>
            {minLength && val.length > 0 && val.length < minLength && (
              <span className="mt-1 block text-xs text-red-600">
                Mínimo de {minLength} caracteres (atual: {val.length})
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Btn
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 font-medium"
            >
              {cancelLabel}
            </Btn>
            <Btn
              type="submit"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              disabled={!isValid || loading}
              className="px-5 py-2 font-medium shadow-sm"
            >
              {loading ? 'Processando...' : confirmLabel}
            </Btn>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}
