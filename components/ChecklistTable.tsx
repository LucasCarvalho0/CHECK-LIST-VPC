'use client';
import Link from 'next/link';
import { api, downloadBlob } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { brDate, resultLabel, shiftLabel, statusLabel } from '@/lib/format';
import type { Checklist } from '@/types';
import { Badge, Btn } from '@/components/ui';

export default function ChecklistTable({ rows, onError }: { rows: Checklist[]; onError?: (m: string) => void }) {
  const { user } = useAuth();
  const canEdit = (c: Checklist) => user && user.role !== 'VIEWER' && c.status !== 'CANCELED' && (c.status === 'IN_PROGRESS' || user.role === 'ADMIN');
  async function pdf(c: Checklist) {
    try {
      const blob = await api.blob(`/checklists/${c.id}/pdf?download=1`);
      if (blob.type.includes('html')) {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.onload = () => win.print();
        }
      } else {
        downloadBlob(blob, `checklist-${c.chassis}-${c.checklistDate}.pdf`);
      }
    }
    catch (e) { onError?.((e as Error).message); }
  }
  if (!rows.length) return <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum checklist encontrado para os filtros atuais.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
          <tr>{['Data', 'Hora', 'Turno', 'Chassi', 'Versão', 'Inspetor QA', 'Líder VPC', 'Resultado', 'Status', 'Ações'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2">{brDate(c.checklistDate)}</td>
              <td className="px-3 py-2">{c.checklistTime}</td>
              <td className="px-3 py-2">{shiftLabel(c.shift)}</td>
              <td className="px-3 py-2 font-mono">
                {c.chassis}
                {c.isPCD && <span className="ml-1 rounded bg-blue-100 px-1 text-xs font-bold text-blue-800">PCD</span>}
                {c.isL1 && <span className="ml-1 rounded bg-purple-100 px-1 text-xs font-bold text-purple-800">L1</span>}
                {c.isL2 && <span className="ml-1 rounded bg-indigo-100 px-1 text-xs font-bold text-indigo-800">L2</span>}
                {c.isL3 && <span className="ml-1 rounded bg-emerald-100 px-1 text-xs font-bold text-emerald-800">L3</span>}
              </td>
              <td className="px-3 py-2 font-semibold">{c.vehicleVersion || '—'}</td>
              <td className="px-3 py-2">{c.inspectorQA}</td>
              <td className="px-3 py-2">{c.leaderVPC}</td>
              <td className="px-3 py-2">{c.auditResult ? <Badge tone={c.auditResult === 'APPROVED' ? 'green' : 'red'}>{resultLabel(c.auditResult)}</Badge> : '—'}{!!c.nokCount && <span className="ml-1 text-xs text-red-700">({c.nokCount} NOK)</span>}</td>
              <td className="px-3 py-2">
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={c.status === 'FINALIZED' ? 'blue' : c.status === 'CANCELED' ? 'red' : 'yellow'}>{statusLabel[c.status]}</Badge>
                  {c.status === 'CANCELED' && c.cancelReason && (
                    <span className="text-[11px] font-medium text-red-600 truncate max-w-[140px] cursor-help" title={`Motivo do cancelamento: ${c.cancelReason}`}>
                      {c.cancelReason}
                    </span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <Link href={`/checklists/${c.id}`} className="mr-2 underline">Abrir</Link>
                {canEdit(c) && <Link href={`/checklists/${c.id}`} className="mr-2 underline">Editar</Link>}
                <Btn className="!px-2 !py-1 text-xs" onClick={() => pdf(c)}>PDF</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
