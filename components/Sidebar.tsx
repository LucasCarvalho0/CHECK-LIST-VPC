'use client';
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
  return (
    <aside className="flex w-full flex-col bg-slate-900 text-slate-100 md:min-h-screen md:w-60">
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="text-xs uppercase tracking-widest text-slate-400">Qualidade</div>
        <div className="text-sm font-bold leading-tight">Checklist de Instalação Multimídia Nissan</div>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 p-2 md:flex-col">
        {links.filter((l) => !l.roles || (user && l.roles.includes(user.role))).map((l) => {
          const active = l.href === '/' ? path === '/' : path === l.href || (l.href !== '/checklists' && path.startsWith(l.href));
          return (
            <Link key={l.href} href={l.href} className={`rounded px-3 py-2 text-sm ${active ? 'bg-nissan text-white' : 'hover:bg-slate-800'}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-700 p-3 text-xs">
        <div className="font-semibold">{user?.name}</div>
        <div className="text-slate-400">{user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'OPERATOR' ? 'Operador' : 'Consulta'}</div>
        <button onClick={logout} className="mt-2 rounded border border-slate-600 px-2 py-1 hover:bg-slate-800">Sair</button>
      </div>
    </aside>
  );
}
