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
      const blob = await api.blob(`/checklists/${c.id}/pdf`);
      const url = URL.createObjectURL(blob);
      if (blob.type.includes('html')) {
        window.open(url, '_blank');
      } else {
        downloadBlob(blob, `checklist-${c.chassis}-${c.checklistDate}.pdf`);
      }
    }
    catch (e) { onError?.((e as Error).message); }
  }
  if (!rows.length) return <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum checklist encontrado para os filtros atuais.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white -mx-4 md:mx-0">
      <table className="min-w-[780px] w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">Data</th>
            <th className="px-3 py-2 whitespace-nowrap">Hora</th>
            <th className="px-3 py-2 whitespace-nowrap">Turno</th>
            <th className="px-3 py-2 whitespace-nowrap">Chassi</th>
            <th className="px-3 py-2 whitespace-nowrap">Versão</th>
            <th className="px-3 py-2 whitespace-nowrap">Inspetor QA</th>
            <th className="px-3 py-2 whitespace-nowrap">Líder VPC</th>
            <th className="px-3 py-2 whitespace-nowrap">Resultado</th>
            <th className="px-3 py-2 whitespace-nowrap">Status</th>
            <th className="px-3 py-2 whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2.5 whitespace-nowrap">{brDate(c.checklistDate)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.checklistTime}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{shiftLabel(c.shift)}</td>
              <td className="px-3 py-2.5 font-mono whitespace-nowrap">{c.chassis}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.vehicleVersion}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.inspectorQA}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.leaderVPC}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.auditResult ? <Badge tone={c.auditResult === 'APPROVED' ? 'green' : 'red'}>{resultLabel(c.auditResult)}</Badge> : '—'}{!!c.nokCount && <span className="ml-1 text-xs text-red-700">({c.nokCount} NOK)</span>}</td>
              <td className="px-3 py-2.5 whitespace-nowrap"><Badge tone={c.status === 'FINALIZED' ? 'blue' : c.status === 'CANCELED' ? 'red' : 'yellow'}>{statusLabel[c.status]}</Badge></td>
              <td className="whitespace-nowrap px-3 py-2.5">
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
