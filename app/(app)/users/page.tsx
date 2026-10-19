'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Role, Shift, User } from '@/types';
import { Alert, Badge, Btn, Card, Field, Spinner } from '@/components/ui';

const roleLabel: Record<Role, string> = { ADMIN: 'Administrador', OPERATOR: 'Operador', VIEWER: 'Consulta' };
const shiftLabel: Record<string, string> = { '': 'Geral / Ambos', FIRST: '1º Turno', SECOND: '2º Turno' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'OPERATOR' as Role, shift: '' as '' | Shift });

  const load = useCallback(() => api.get<User[]>('/users').then(setUsers).catch((e) => setMsg({ t: 'err', m: e.message })), []);
  useEffect(() => { void load(); }, [load]);

  if (me && me.role !== 'ADMIN') return <div className="p-6"><Alert type="err">Acesso restrito a administradores.</Alert></div>;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ t: 'ok', m: ok }); await load(); } catch (e) { setMsg({ t: 'err', m: e instanceof ApiError ? e.message : 'Erro.' }); }
  };
  async function create(e: FormEvent) {
    e.preventDefault();
    await run(() => api.post('/users', { ...form, shift: form.shift || null }), 'Usuário criado.');
    setForm({ name: '', username: '', password: '', role: 'OPERATOR', shift: '' });
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="mb-4 text-xl font-bold">Usuários</h1>
      {msg && <div className="mb-3"><Alert type={msg.t}>{msg.m}</Alert></div>}
      <Card className="mb-4">
        <h2 className="mb-3 font-bold">Novo usuário</h2>
        <form onSubmit={create} className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Nome"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Login"><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Senha (mín. 8)"><input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Perfil"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></Field>
          <Field label="Turno">
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as '' | Shift })}>
              <option value="">Geral / Ambos</option>
              <option value="FIRST">1º Turno (Washington)</option>
              <option value="SECOND">2º Turno (Janaína)</option>
            </select>
          </Field>
          <div className="flex items-end"><Btn variant="primary" className="w-full">Criar</Btn></div>
        </form>
      </Card>
      {!users ? <Spinner /> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Login</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Turno</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Ações</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                <td className="px-3 py-2"><select className="!w-auto" value={u.role} disabled={u.id === me?.id}
                  onChange={(e) => run(() => api.patch(`/users/${u.id}`, { role: e.target.value }), 'Perfil atualizado.')}>
                  {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></td>
                <td className="px-3 py-2">
                  <select
                    className="!w-auto text-xs"
                    value={u.shift || ''}
                    onChange={(e) => run(() => api.patch(`/users/${u.id}`, { shift: e.target.value || null }), 'Turno atualizado.')}
                  >
                    <option value="">Geral / Ambos</option>
                    <option value="FIRST">1º Turno</option>
                    <option value="SECOND">2º Turno</option>
                  </select>
                </td>
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
