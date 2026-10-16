'use client';
import type { ResponseValue } from '@/lib/shared/catalog';

const styles: Record<string, { on: string; label: string }> = {
  OK: { on: 'bg-green-600 text-white border-green-700', label: 'OK' },
  NOK: { on: 'bg-red-600 text-white border-red-700', label: 'NOK' },
  NA: { on: 'bg-slate-600 text-white border-slate-700', label: 'NA' },
};

export default function ItemRow({
  code, label, allowNA, response, observation, onResponse, onObservation, readOnly, invalid, extra,
}: {
  code: string; label: string; allowNA: boolean; response: ResponseValue; observation: string;
  onResponse: (v: ResponseValue) => void; onObservation: (v: string) => void; readOnly?: boolean; invalid?: boolean; extra?: React.ReactNode;
}) {
  const options = allowNA ? ['OK', 'NOK', 'NA'] : ['OK', 'NOK'];
  const bg = response === 'NOK' ? 'bg-red-50 border-red-300' : invalid ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200';
  return (
    <div id={`item-${code}`} className={`rounded-lg border p-3 ${bg}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1 text-sm">
          <div className="font-medium text-slate-800">{label} <span className="text-red-600" title="Obrigatório para finalizar">*</span></div>
          {invalid && <div className="mt-1 text-xs font-semibold text-amber-800">Resposta obrigatória pendente</div>}
          {extra && <div className="mt-2 max-w-xs">{extra}</div>}
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label={label}>
          {options.map((o) => {
            const sel = response === o;
            return (
              <button
                key={o} type="button" role="radio" aria-checked={sel} disabled={readOnly}
                onClick={() => onResponse(sel ? 'UNANSWERED' : (o as ResponseValue))}
              className={`min-w-[3.5rem] rounded border px-3 py-2.5 text-sm font-bold disabled:opacity-60 ${sel ? styles[o].on : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {sel ? '☒' : '☐'} {styles[o].label}
              </button>
            );
          })}
        </div>
        <input
          aria-label={`Observação: ${label}`} placeholder="Observação" value={observation} disabled={readOnly}
          onChange={(e) => onObservation(e.target.value)} className="md:w-72"
        />
      </div>
    </div>
  );
}
