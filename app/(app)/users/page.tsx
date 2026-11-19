'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Role, User } from '@/types';
import { Alert, Badge, Btn, Card, Field, Spinner } from '@/components/ui';

const roleLabel: Record<Role, string> = { ADMIN: 'Administrador', OPERATOR: 'Operador', VIEWER: 'Consulta' };

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordInput({ value, onChange, minLength, autoComplete, required }: {
  value: string; onChange: (v: string) => void;
  minLength?: number; autoComplete?: string; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        autoComplete={autoComplete}
        required={required}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-700"
        tabIndex={-1}
        title={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'OPERATOR' as Role });

  const load = useCallback(() => api.get<User[]>('/users').then(setUsers).catch((e) => setMsg({ t: 'err', m: e.message })), []);
  useEffect(() => { void load(); }, [load]);

  if (me && me.role !== 'ADMIN') return <div className="p-6"><Alert type="err">Acesso restrito a administradores.</Alert></div>;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ t: 'ok', m: ok }); await load(); } catch (e) { setMsg({ t: 'err', m: e instanceof ApiError ? e.message : 'Erro.' }); }
  };
  async function create(e: FormEvent) {
    e.preventDefault();
    await run(() => api.post('/users', form), 'Usuário criado.');
    setForm({ name: '', username: '', password: '', role: 'OPERATOR' });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="mb-4 text-xl font-bold">Usuários</h1>
      {msg && <div className="mb-3"><Alert type={msg.t}>{msg.m}</Alert></div>}
      <Card className="mb-4">
        <h2 className="mb-3 font-bold">Novo usuário</h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-5">
          <Field label="Nome"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Login"><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Senha (mín. 8)">
            <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          </Field>
          <Field label="Perfil"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></Field>
          <div className="flex items-end"><Btn variant="primary" className="w-full">Criar</Btn></div>
        </form>
      </Card>
      {!users ? <Spinner /> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Login</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Ações</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{u.name}</td><td className="px-3 py-2 font-mono">{u.username}</td>
                <td className="px-3 py-2"><select className="!w-auto" value={u.role} disabled={u.id === me?.id}
                  onChange={(e) => run(() => api.patch(`/users/${u.id}`, { role: e.target.value }), 'Perfil atualizado.')}>
                  {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></td>
                <td className="px-3 py-2"><Badge tone={u.active ? 'green' : 'red'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2">
                  <Btn className="!px-2 !py-1 text-xs" disabled={u.id === me?.id} onClick={() => run(() => api.patch(`/users/${u.id}/active`, { active: !u.active }), u.active ? 'Usuário desativado.' : 'Usuário ativado.')}>{u.active ? 'Desativar' : 'Ativar'}</Btn>
                  <Btn className="!px-2 !py-1 text-xs" onClick={() => { const p = window.prompt('Nova senha (mín. 8 caracteres):'); if (p) void run(() => api.patch(`/users/${u.id}`, { password: p }), 'Senha alterada.'); }}>Redefinir senha</Btn>
                </td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
