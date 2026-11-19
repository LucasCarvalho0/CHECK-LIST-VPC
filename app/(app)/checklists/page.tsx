'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Checklist, Paged } from '@/types';
import { Alert, Btn, Spinner } from '@/components/ui';
import ChecklistTable from '@/components/ChecklistTable';

const init = { search: '', dateFrom: '', dateTo: '', shift: '', status: '', auditResult: '', inspectorQA: '', leaderVPC: '', bpc: '', order: 'desc' };

export default function ChecklistsPage() {
  const { user } = useAuth();
  const [f, setF] = useState(init);
  const [applied, setApplied] = useState(init);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Checklist> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.get<Paged<Checklist>>(`/checklists${qs({ ...applied, page, pageSize: 20 })}`).then(setData).catch((e) => setError(e.message));
  }, [applied, page]);

  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const search = () => { setPage(1); setApplied(f); };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Checklists</h1>
        {user?.role !== 'VIEWER' && <Link href="/checklists/new" className="rounded bg-nissan px-4 py-2 text-sm font-semibold text-white">Novo Checklist</Link>}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4 lg:grid-cols-6" onKeyDown={(e) => e.key === 'Enter' && search()}>
        <label className="text-xs">Chassi<input value={f.search} onChange={set('search')} placeholder="Buscar chassi" /></label>
        <label className="text-xs">De<input type="date" value={f.dateFrom} onChange={set('dateFrom')} /></label>
        <label className="text-xs">Até<input type="date" value={f.dateTo} onChange={set('dateTo')} /></label>
        <label className="text-xs">Turno<select value={f.shift} onChange={set('shift')}><option value="">Todos</option><option value="FIRST">1º Turno</option><option value="SECOND">2º Turno</option></select></label>
        <label className="text-xs">Situação<select value={f.status} onChange={set('status')}><option value="">Todas</option><option value="IN_PROGRESS">Em preenchimento</option><option value="FINALIZED">Finalizado</option><option value="CANCELED">Cancelado</option></select></label>
        <label className="text-xs">Resultado<select value={f.auditResult} onChange={set('auditResult')}><option value="">Todos</option><option value="APPROVED">Aprovado</option><option value="REPROVED">Reprovado</option></select></label>
        <label className="text-xs">Inspetor QA<input value={f.inspectorQA} onChange={set('inspectorQA')} /></label>
        <label className="text-xs">Líder VPC<input value={f.leaderVPC} onChange={set('leaderVPC')} /></label>
        <label className="text-xs">BPC<input value={f.bpc} onChange={set('bpc')} /></label>
        <label className="text-xs">Ordenar<select value={f.order} onChange={set('order')}><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></select></label>
        <div className="flex items-end gap-2"><Btn variant="dark" onClick={search}>Filtrar</Btn><Btn onClick={() => { setF(init); setApplied(init); setPage(1); }}>Limpar</Btn></div>
      </div>
      {error && <Alert type="err">{error}</Alert>}
      {!data && !error ? <Spinner /> : data && (
        <>
          <ChecklistTable rows={data.data} onError={setError} />
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>{data.meta.total} registro(s)</span>
            <div className="flex items-center gap-2">
              <Btn disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Btn>
              <span>Página {data.meta.page} de {data.meta.totalPages}</span>
              <Btn disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Próxima</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
