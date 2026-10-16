'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/checklists', label: 'Checklists' },
  { href: '/checklists/new', label: 'Novo Checklist', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/print', label: 'Imprimir todos do dia' },
  { href: '/reports', label: 'Relatórios' },
  { href: '/users', label: 'Usuários', roles: ['ADMIN'] },
];

export default function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = links.filter((l) => !l.roles || (user && l.roles.includes(user.role)));

  const NavContent = () => (
    <>
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nissan.png" alt="Nissan" className="h-8 w-auto object-contain brightness-0 invert" />
          <div className="text-xs uppercase tracking-widest text-slate-400">Qualidade</div>
        </div>
        <div className="text-sm font-bold leading-tight">Checklist de Instalação Multimídia Nissan</div>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navLinks.map((l) => {
          const active = l.href === '/' ? path === '/' : path === l.href || (l.href !== '/checklists' && path.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded px-3 py-3 text-sm font-medium transition-colors ${active ? 'bg-nissan text-white' : 'hover:bg-slate-800 text-slate-200'}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-700 p-3 text-xs">
        <div className="font-semibold text-slate-100">{user?.name}</div>
        <div className="text-slate-400">{user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'OPERATOR' ? 'Operador' : 'Consulta'}</div>
        <button onClick={logout} className="mt-2 rounded border border-slate-600 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors">Sair</button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-slate-900 text-slate-100 min-h-screen">
        <NavContent />
      </aside>

      {/* ── Mobile/Tablet top bar ── */}
      <div className="md:hidden flex items-center gap-3 bg-slate-900 text-slate-100 px-4 py-3 sticky top-0 z-40">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex flex-col gap-1.5 p-1 rounded focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span className="block h-0.5 w-6 bg-slate-100 rounded" />
          <span className="block h-0.5 w-6 bg-slate-100 rounded" />
          <span className="block h-0.5 w-6 bg-slate-100 rounded" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nissan.png" alt="Nissan" className="h-7 w-auto object-contain brightness-0 invert" />
        <span className="text-sm font-bold truncate">Checklist Multimídia</span>
      </div>

      {/* ── Drawer overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-label="Menu de navegação"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-slate-100 min-h-screen shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 rounded p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
