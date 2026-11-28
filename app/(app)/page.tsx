'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { todayLocal } from '@/lib/format';
import type { Checklist, Paged } from '@/types';
import { Alert, Card, Spinner } from '@/components/ui';
import ChecklistTable from '@/components/ChecklistTable';

interface Summary { total: number; inProgress: number; approved: number; reproved: number; pendingRepair: number; nokItems: number }

export default function Dashboard() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayLocal());
  const [shift, setShift] = useState('');
  const [sum, setSum] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Checklist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setRows(null);
    setSum(null);

    // Carrega checklists recentes do dia/turno imediatamente
    api.get<Paged<Checklist>>(`/checklists${qs({ date, shift, pageSize: 50 })}`)
      .then((l) => setRows(l.data))
      .catch((e) => setError(e.message));

    // Carrega indicadores do sumário em paralelo
    api.get<Summary>(`/reports/summary${qs({ date, shift })}`)
      .then(setSum)
      .catch((e) => console.warn('Erro ao carregar indicadores:', e));
  }, [date, shift]);

  const cards: [string, number | undefined, string][] = [
    ['Registrados no dia', sum?.total, 'text-slate-900'],
    ['Em preenchimento', sum?.inProgress, 'text-amber-700'],
    ['Aprovados', sum?.approved, 'text-green-700'],
    ['Reprovados', sum?.reproved, 'text-red-700'],
    ['Com pendências de reparo', sum?.pendingRepair, 'text-orange-700'],
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-xl font-bold">Checklist de Instalação Multimídia Nissan</h1>
        {user?.role !== 'VIEWER' && (
          <Link href="/checklists/new" className="rounded bg-nissan px-4 py-2 text-sm font-semibold text-white hover:bg-nissan-dark">
            Novo Checklist
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">
          Data de referência
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          Turno
          <select value={shift} onChange={(e) => setShift(e.target.value)}>
            <option value="">Todos</option>
            <option value="FIRST">1º Turno</option>
            <option value="SECOND">2º Turno</option>
          </select>
        </label>
      </div>

      {error && <Alert type="err">{error}</Alert>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(([l, v, c]) => (
          <Card key={l}>
            <div className="text-xs text-slate-500">{l}</div>
            <div className={`text-3xl font-bold ${c}`}>{v !== undefined ? v : '—'}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-base">Checklists recentes {rows ? `(${rows.length})` : ''}</h2>
        {user?.role !== 'VIEWER' && (
          <Link href="/checklists" className="text-xs font-semibold text-nissan hover:underline">
            Ver todos no histórico →
          </Link>
        )}
      </div>

      {!rows && !error ? (
        <div className="py-8"><Spinner /></div>
      ) : rows ? (
        <ChecklistTable rows={rows} />
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        Aprovados/Reprovados contam apenas checklists finalizados, conforme o resultado marcado pelo inspetor.
      </p>
    </div>
  );
}
