import { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

const variants = {
  primary: 'bg-nissan text-white hover:bg-nissan-dark',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
  dark: 'bg-slate-800 text-white hover:bg-slate-900',
};
export function Btn({ variant = 'secondary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-1 rounded px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  );
}

export function Field({ label, required, children, hint, error }: { label: string; required?: boolean; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {label} {required && <span className="text-red-600" title="Obrigatório para finalizar">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'red' | 'yellow' | 'blue' }) {
  const t = { gray: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', yellow: 'bg-amber-100 text-amber-800', blue: 'bg-sky-100 text-sky-800' }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export function Alert({ type, children }: { type: 'ok' | 'err' | 'warn'; children: ReactNode }) {
  const c = { ok: 'border-green-300 bg-green-50 text-green-900', err: 'border-red-300 bg-red-50 text-red-900', warn: 'border-amber-300 bg-amber-50 text-amber-900' }[type];
  return <div role={type === 'err' ? 'alert' : 'status'} className={`rounded border px-3 py-2 text-sm ${c}`}>{children}</div>;
}

export function Spinner({ text = 'Carregando...' }: { text?: string }) {
  return <div className="p-6 text-sm text-slate-500">{text}</div>;
}
