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
    Promise.all([
      api.get<Summary>(`/reports/summary${qs({ date, shift })}`),
      api.get<Paged<Checklist>>(`/checklists${qs({ date, shift, pageSize: 10 })}`),
    ]).then(([s, l]) => { setSum(s); setRows(l.data); }).catch((e) => setError(e.message));
  }, [date, shift]);

  const cards: [string, number | undefined, string][] = [
    ['Registrados no dia', sum?.total, 'text-slate-900'], ['Em preenchimento', sum?.inProgress, 'text-amber-700'],
    ['Aprovados', sum?.approved, 'text-green-700'], ['Reprovados', sum?.reproved, 'text-red-700'], ['Com pendências de reparo', sum?.pendingRepair, 'text-orange-700'],
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-xl font-bold">Checklist Multimídia – SESÉ QA</h1>
        {user?.role !== 'VIEWER' && <Link href="/checklists/new" className="rounded bg-nissan px-4 py-2 text-sm font-semibold text-white hover:bg-nissan-dark">Novo Checklist</Link>}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">Data de referência<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="text-sm">Turno
          <select value={shift} onChange={(e) => setShift(e.target.value)}><option value="">Todos</option><option value="FIRST">1º Turno</option><option value="SECOND">2º Turno</option></select>
        </label>
      </div>
      {error && <Alert type="err">{error}</Alert>}
      {!sum && !error ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map(([l, v, c]) => <Card key={l}><div className="text-xs text-slate-500">{l}</div><div className={`text-3xl font-bold ${c}`}>{v ?? 0}</div></Card>)}
          </div>
          <h2 className="mb-2 font-bold">Checklists recentes</h2>
          {rows && <ChecklistTable rows={rows} />}
          <p className="mt-2 text-xs text-slate-500">Aprovados/Reprovados contam apenas checklists finalizados, conforme o resultado marcado pelo inspetor.</p>
        </>
      )}
    </div>
  );
}
