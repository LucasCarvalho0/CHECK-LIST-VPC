'use client';

import { useState, useEffect } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);

  // Lembra da preferência do usuário no desktop
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const navLinks = links.filter((l) => !l.roles || (user && l.roles.includes(user.role)));

  const NavContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nissan.png" alt="Nissan" className="h-7 w-auto object-contain brightness-0 invert" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Nissan QA</div>
            <div className="text-xs font-bold leading-tight text-slate-100">Checklist Multimídia</div>
          </div>
        </div>
        {/* Botão de 3 riscos para fechar a aba lateral */}
        <button
          onClick={onClose}
          className="flex flex-col justify-center items-center gap-1 h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar aba lateral"
          aria-label="Fechar aba lateral"
        >
          <span className="block h-0.5 w-4 bg-current rounded-full" />
          <span className="block h-0.5 w-4 bg-current rounded-full" />
          <span className="block h-0.5 w-4 bg-current rounded-full" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navLinks.map((l) => {
          const active = l.href === '/' ? path === '/' : path === l.href || (l.href !== '/checklists' && path.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-nissan text-white shadow-sm' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-700 p-3 text-xs">
        <div className="font-semibold text-slate-100">{user?.name}</div>
        <div className="text-slate-400">
          {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'OPERATOR' ? 'Operador' : 'Consulta'}
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full rounded border border-slate-600 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors text-center cursor-pointer"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Botão flutuante de 3 riscos quando a aba desktop está fechada ── */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex fixed top-3 left-3 z-30 items-center justify-center h-10 w-10 rounded-xl bg-slate-900/95 text-slate-200 hover:text-white shadow-lg border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer backdrop-blur-sm"
          title="Abrir aba lateral"
          aria-label="Abrir aba lateral"
        >
          <div className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-current rounded-full" />
            <span className="block h-0.5 w-5 bg-current rounded-full" />
            <span className="block h-0.5 w-5 bg-current rounded-full" />
          </div>
        </button>
      )}

      {/* ── Desktop sidebar (md+) ── */}
      {!collapsed && (
        <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-slate-900 text-slate-100 min-h-screen transition-all duration-200 border-r border-slate-800">
          <NavContent onClose={toggleCollapsed} />
        </aside>
      )}

      {/* ── Mobile/Tablet top bar com botão de 3 riscos ── */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-slate-100 px-4 py-3 sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="flex flex-col justify-center gap-1.5 p-1 rounded text-slate-100 focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
          >
            <span className="block h-0.5 w-6 bg-current rounded" />
            <span className="block h-0.5 w-6 bg-current rounded" />
            <span className="block h-0.5 w-6 bg-current rounded" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nissan.png" alt="Nissan" className="h-7 w-auto object-contain brightness-0 invert" />
          <span className="text-sm font-bold truncate">Checklist Multimídia</span>
        </div>
      </div>

      {/* ── Mobile Drawer overlay ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-label="Menu de navegação">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-slate-100 min-h-screen shadow-2xl">
            <NavContent onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
