'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { nowLocalTime, todayLocal, statusLabel, shiftLabel } from '@/lib/format';
import { Alert, Btn, Card } from '@/components/ui';
import VehicleFields, { VehicleValues } from '@/components/checklist/VehicleFields';

interface Existing { id: string; status: import('@/types').Status; checklistTime: string; shift: 'FIRST' | 'SECOND' | null }

export default function NewChecklist() {
  const router = useRouter();
  const { user } = useAuth();
  const [v, setV] = useState<VehicleValues>({
    chassis: '', vehicleVersion: '', checklistDate: todayLocal(), checklistTime: nowLocalTime(), shift: '', inspectorQA: '', leaderVPC: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [dups, setDups] = useState<Existing[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uname = user.username.toLowerCase();
    const name = user.name.toLowerCase();
    const isSecondShift =
      uname === 'augusto' ||
      uname === 'julio' ||
      uname === '116221' ||
      name.includes('augusto') ||
      name.includes('júlio') ||
      name.includes('julio') ||
      name.includes('lucas');

    const defaultInspector =
      uname === 'augusto' || name.includes('augusto')
        ? 'José Augusto'
        : uname === 'julio' || name.includes('julio') || name.includes('júlio')
        ? 'Júlio Carvalho'
        : '';

    setV((prev) => ({
      ...prev,
      shift: prev.shift || (isSecondShift ? 'SECOND' : prev.shift),
      leaderVPC: prev.leaderVPC || (isSecondShift ? 'Janaína Mendes' : prev.leaderVPC),
      inspectorQA: prev.inspectorQA || defaultInspector,
    }));
  }, [user]);

  if (user?.role === 'VIEWER') return <div className="p-6"><Alert type="err">Seu perfil é somente consulta.</Alert></div>;

  async function start(confirmDuplicate = false) {
    if (!v.chassis) { setError('Leia ou digite o chassi para iniciar.'); document.getElementById('f-chassis')?.focus(); return; }
    setBusy(true); setError(null);
    try {
      const c = await api.post<{ id: string }>('/checklists', { ...v, shift: v.shift || undefined, confirmDuplicate });
      router.push(`/checklists/${c.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.code === 'DUPLICATE') setDups(e.body.existing);
      else setError(e instanceof ApiError ? e.message : 'Erro ao criar o checklist.');
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <h1 className="mb-1 text-xl font-bold">Novo Checklist</h1>
      <p className="mb-4 text-sm text-slate-500">Leia o código de barras do chassi com o scanner (o cursor já está no campo). O restante do checklist é salvo automaticamente.</p>
      <Card>
        <VehicleFields values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} autoFocusChassis
          onChassisEnter={() => document.getElementById('f-vehicleVersion')?.focus()} />
        {error && <div className="mt-4"><Alert type="err">{error}</Alert></div>}
        {dups && (
          <div className="mt-4 space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-amber-900">Já existe checklist para este chassi nesta data:</p>
            <ul className="list-disc pl-5">
              {dups.map((d) => <li key={d.id}><Link className="underline" href={`/checklists/${d.id}`}>{d.checklistTime} · {shiftLabel(d.shift)} · {statusLabel[d.status]}</Link></li>)}
            </ul>
            <p>Nada foi sobrescrito. Abra o registro existente ou confirme se é uma nova inspeção legítima.</p>
            <Btn variant="danger" disabled={busy} onClick={() => start(true)}>Registrar nova inspeção mesmo assim</Btn>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Link href="/checklists" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">Cancelar</Link>
          <Btn variant="primary" disabled={busy} onClick={() => start(false)}>{busy ? 'Criando...' : 'Iniciar checklist'}</Btn>
        </div>
      </Card>
    </div>
  );
}
