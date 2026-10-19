'use client';
import { useEffect, useState } from 'react';
import { api, qs } from '@/services/api';
import { brDate, shiftLabel, todayLocal } from '@/lib/format';
import { Alert, Card, Spinner } from '@/components/ui';

import { useAuth } from '@/hooks/useAuth';
import { detectUserShift, resolveEffectiveShift } from '@/lib/shared/shifts';

interface Summary { total: number; inProgress: number; finalized: number; approved: number; reproved: number; pendingRepair: number; nokItems: number }
interface NC { totalNok: number; items: { itemCode: string; label: string; count: number; occurrences: { checklistId: string; chassis: string; date: string; time: string; shift: 'FIRST' | 'SECOND' | null; observation: string | null }[] }[] }

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const [dateFrom, setFrom] = useState(todayLocal());
  const [dateTo, setTo] = useState(todayLocal());
  const [shift, setShift] = useState('');
  const [sum, setSum] = useState<Summary | null>(null);
  const [nc, setNc] = useState<NC | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userShift = detectUserShift(user);
    if (userShift && !shift) setShift(userShift);
  }, [user, shift]);

  useEffect(() => {
    if (loading) return;
    setSum(null); setNc(null); setError(null);
    const effectiveShift = resolveEffectiveShift(user, shift as any);
    Promise.all([
      api.get<Summary>(`/reports/summary${qs({ dateFrom, dateTo, shift: effectiveShift })}`),
      api.get<NC>(`/reports/nonconformities${qs({ dateFrom, dateTo, shift: effectiveShift })}`),
    ])
      .then(([s, n]) => { setSum(s); setNc(n); }).catch((e) => setError(e.message));
  }, [loading, user, dateFrom, dateTo, shift]);

  const cards: [string, number | undefined][] = [
    ['Veículos inspecionados', sum?.total], ['Aprovados', sum?.approved], ['Reprovados', sum?.reproved], ['Checklists incompletos', sum?.inProgress],
    ['Itens NOK', sum?.nokItems], ['Pendências de reparo', sum?.pendingRepair],
  ];
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-bold">Relatórios</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">De<input type="date" value={dateFrom} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">Até<input type="date" value={dateTo} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="text-sm">Turno<select value={shift} onChange={(e) => setShift(e.target.value)}><option value="">Todos</option><option value="FIRST">1º Turno</option><option value="SECOND">2º Turno</option></select></label>
      </div>
      {error && <Alert type="err">{error}</Alert>}
      {!sum && !error ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {cards.map(([l, v]) => <Card key={l}><div className="text-xs text-slate-500">{l}</div><div className="text-3xl font-bold">{v ?? 0}</div></Card>)}
          </div>
          <h2 className="mb-2 font-bold">Itens NOK por tipo ({nc?.totalNok ?? 0})</h2>
          {nc && nc.items.length === 0 && <Alert type="ok">Nenhum item NOK no período.</Alert>}
          <div className="space-y-2">
            {nc?.items.map((i) => (
              <details key={i.itemCode} className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-medium">{i.label} <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">{i.count}</span></summary>
                <table className="mt-2 w-full text-xs">
                  <tbody>{i.occurrences.map((o, k) => (
                    <tr key={k} className="border-t border-slate-100"><td className="py-1 pr-2">{brDate(o.date)} {o.time}</td><td className="pr-2">{shiftLabel(o.shift)}</td><td className="pr-2 font-mono">{o.chassis}</td><td>{o.observation}</td></tr>
                  ))}</tbody>
                </table>
              </details>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Relatórios são somente leitura e não alteram os registros. Aprovados/Reprovados consideram apenas checklists finalizados.</p>
        </>
      )}
    </div>
  );
}
