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
    setBusy(true);
    setError(null);

    // Tentativa com retry automático transparente (caso o banco de dados esteja acordando de suspensão)
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await login(username, password);
        window.location.replace('/');
        return;
      } catch (err: any) {
        const isAuthError = err instanceof ApiError && (err.status === 401 || err.status === 429);

        // Se a senha estiver errada ou atingiu limite de tentativas, para imediatamente e exibe a mensagem correta
        if (isAuthError) {
          setError(err.message || 'Usuário ou senha inválidos.');
          setBusy(false);
          return;
        }

        // Se for a última tentativa, exibe erro de conexão amigável
        if (attempt === maxAttempts) {
          setError('Erro de conexão. Verifique sua internet e tente novamente.');
          setBusy(false);
          return;
        }

        // Se falhou por timeout / cold start do servidor, aguarda 1.5s enquanto o servidor termina de ligar e tenta novamente de forma automática
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-bold">Checklist de Instalação Multimídia Nissan</h1>
        <p className="mb-4 text-sm text-slate-500">Acesso restrito a usuários internos.</p>
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
