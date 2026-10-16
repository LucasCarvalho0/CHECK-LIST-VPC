'use client';
import { useEffect, useState } from 'react';
import { api, ApiError, downloadBlob, qs } from '@/services/api';
import { brDate, resultLabel, shiftLabel, statusLabel, todayLocal } from '@/lib/format';
import { Alert, Btn, Card, Spinner } from '@/components/ui';

interface Daily {
  date: string; vehicles: { id: string; chassis: string; time: string; shift: 'FIRST' | 'SECOND' | null; status: import('@/types').Status; auditResult: 'APPROVED' | 'REPROVED' | null }[];
  pages: { vehicles: number; contentPages: number; blankPages: number; totalPages: number; sheetsDuplex: number };
}

export default function PrintDayPage() {
  const [date, setDate] = useState(todayLocal());
  const [shift, setShift] = useState('');
  const [blank, setBlank] = useState(false);
  const [onlyFinal, setOnlyFinal] = useState(false);
  const [data, setData] = useState<Daily | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null); setExcluded(new Set());
    api.get<Daily>(`/reports/daily${qs({ date, shift, blankSeparator: blank, includeInProgress: !onlyFinal })}`).then(setData).catch((e) => setError(e.message));
  }, [date, shift, blank, onlyFinal]);

  const selected = data?.vehicles.filter((v) => !excluded.has(v.id)) ?? [];
  const content = selected.length * 3;
  const blanks = blank ? Math.max(0, selected.length - 1) : 0;
  const body = () => ({ date, shift: shift || undefined, blankSeparator: blank, includeInProgress: !onlyFinal, ids: excluded.size ? selected.map((v) => v.id) : undefined });

  async function generate(mode: 'download' | 'view') {
    setBusy(true); setError(null);
    try {
      const blob = await api.blob(`/reports/daily/pdf${mode === 'download' ? '?download=1' : ''}`, { method: 'POST', body: body() });
      if (mode === 'download') downloadBlob(blob, `checklists-${date}${shift ? (shift === 'FIRST' ? '-1turno' : '-2turno') : ''}${blank ? '-duplex' : ''}.pdf`);
      else setPreview(URL.createObjectURL(blob));
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Erro ao gerar o PDF.'); } finally { setBusy(false); }
  }
  const toggle = (id: string) => setExcluded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="mb-4 text-xl font-bold">Imprimir todos do dia</h1>
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-sm">Turno<select value={shift} onChange={(e) => setShift(e.target.value)}><option value="">Todos</option><option value="FIRST">1º Turno</option><option value="SECOND">2º Turno</option></select></label>
          <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="!w-4" checked={onlyFinal} onChange={(e) => setOnlyFinal(e.target.checked)} />Somente finalizados</label>
          <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="!w-4" checked={blank} onChange={(e) => setBlank(e.target.checked)} />Página em branco entre veículos (frente e verso)</label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Cada veículo ocupa 3 páginas. Com a opção marcada, entra 1 página em branco após cada veículo (exceto o último) para o seguinte começar na frente de uma nova folha.
          O PDF é organizado para duplex, mas a impressão frente e verso depende da configuração da sua impressora.
        </p>
      </Card>
      {error && <div className="mb-3"><Alert type="err">{error}</Alert></div>}
      {!data && !error ? <Spinner /> : data && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              <div><div className="text-xs text-slate-500">Veículos</div><div className="text-2xl font-bold">{selected.length}</div></div>
              <div><div className="text-xs text-slate-500">Páginas de conteúdo</div><div className="text-2xl font-bold">{content}</div></div>
              <div><div className="text-xs text-slate-500">Páginas em branco</div><div className="text-2xl font-bold">{blanks}</div></div>
              <div><div className="text-xs text-slate-500">Total de páginas</div><div className="text-2xl font-bold">{content + blanks}</div></div>
              <div><div className="text-xs text-slate-500">Folhas (frente e verso)</div><div className="text-2xl font-bold">{Math.ceil((content + blanks) / 2)}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn variant="primary" disabled={busy || !selected.length} onClick={() => generate('download')}>{busy ? 'Gerando...' : 'Baixar PDF'}</Btn>
              <Btn disabled={busy || !selected.length} onClick={() => generate('view')}>Abrir para imprimir</Btn>
            </div>
          </Card>
          {data.vehicles.length === 0 ? <Alert type="warn">Nenhum checklist encontrado para {brDate(date)}.</Alert> : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Imprimir</th><th className="px-3 py-2">Ordem</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Turno</th><th className="px-3 py-2">Chassi</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody>
                  {data.vehicles.map((v, i) => (
                    <tr key={v.id} className={`border-t border-slate-100 ${excluded.has(v.id) ? 'opacity-40' : ''}`}>
                      <td className="px-3 py-2"><input type="checkbox" className="!w-4" checked={!excluded.has(v.id)} onChange={() => toggle(v.id)} aria-label={`Incluir ${v.chassis}`} /></td>
                      <td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2">{v.time}</td><td className="px-3 py-2">{shiftLabel(v.shift)}</td>
                      <td className="px-3 py-2 font-mono">{v.chassis}</td><td className="px-3 py-2">{resultLabel(v.auditResult)}</td><td className="px-3 py-2">{statusLabel[v.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3" role="dialog" aria-label="Pré-visualização do lote">
          <div className="mb-2 flex gap-2">
            <Btn variant="primary" onClick={() => (document.getElementById('batch-frame') as HTMLIFrameElement | null)?.contentWindow?.print()}>Imprimir</Btn>
            <Btn className="ml-auto" onClick={() => { URL.revokeObjectURL(preview); setPreview(null); }}>Fechar</Btn>
          </div>
          <iframe id="batch-frame" src={preview} className="w-full flex-1 rounded bg-white" title="Prévia do PDF em lote" />
        </div>
      )}
    </div>
  );
}
