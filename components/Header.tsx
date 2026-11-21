'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 md:px-5 backdrop-blur-md text-white shadow-sm transition-all duration-300">
      {/* Lado Esquerdo: Botão 3 Risquinhos + Logo */}
      <div className="flex items-center gap-3">
        {/* Botão dos 3 risquinhos animado */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 text-white transition-all duration-200 hover:bg-slate-700 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-nissan"
        >
          {/* Animação dos 3 risquinhos morphing para X */}
          <div className="flex h-5 w-5 flex-col items-center justify-center">
            {/* Linha superior */}
            <span
              className={`block h-0.5 w-5 rounded-full bg-white transition-all duration-300 ease-in-out ${
                sidebarOpen ? 'translate-y-2 rotate-45 bg-red-400' : 'group-hover:w-5'
              }`}
            />
            {/* Linha do meio */}
            <span
              className={`my-1.5 block h-0.5 w-5 rounded-full bg-white transition-all duration-200 ease-in-out ${
                sidebarOpen ? 'opacity-0 scale-x-0' : 'opacity-100 group-hover:w-4'
              }`}
            />
            {/* Linha inferior */}
            <span
              className={`block h-0.5 w-5 rounded-full bg-white transition-all duration-300 ease-in-out ${
                sidebarOpen ? '-translate-y-2 -rotate-45 bg-red-400' : 'group-hover:w-5'
              }`}
            />
          </div>
        </button>

        {/* Marca / Título */}
        <Link href="/" className="flex items-center gap-2.5 transition opacity-90 hover:opacity-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nissan text-xs font-black tracking-wider text-white shadow-sm">
            QA
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">SESÉ • VPC</span>
            <span className="text-sm font-bold text-slate-100 leading-tight">Multimídia Nissan</span>
          </div>
        </Link>
      </div>

      {/* Lado Direito: Atalho Novo Checklist + Usuário */}
      <div className="flex items-center gap-2.5">
        {user && user.role !== 'VIEWER' && (
          <Link
            href="/checklists/new"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-nissan px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-nissan-dark transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo</span>
          </Link>
        )}

        {user && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 py-1.5 px-3 border border-slate-700/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-nissan text-xs font-bold text-white uppercase shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">{user.name}</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {user.role === 'ADMIN' ? 'Administrador' : user.role === 'OPERATOR' ? 'Operador' : 'Consulta'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
