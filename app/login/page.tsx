'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';
import { Alert, Btn, Card, Field } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(username, password); router.replace('/'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Erro ao entrar.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/grupo-sese.png" alt="CCE QA" className="h-14 w-auto object-contain" />
        </div>
        <h1 className="mb-1 text-lg font-bold text-center">Checklist Multimídia – CCE QA</h1>
        <p className="mb-4 text-sm text-slate-500 text-center">Acesso restrito · Controle de Qualidade</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Usuário"><input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
          <Field label="Senha"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <Alert type="err">{error}</Alert>}
          <Btn variant="primary" className="w-full" disabled={busy || !username || !password}>{busy ? 'Entrando...' : 'Entrar'}</Btn>
        </form>
      </Card>
    </main>
  );
}
