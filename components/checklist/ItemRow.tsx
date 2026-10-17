'use client';
import type { ResponseValue } from '@/lib/shared/catalog';

const styles: Record<string, { on: string; label: string }> = {
  OK: { on: 'bg-green-600 text-white border-green-700 shadow-green-600/20', label: 'OK' },
  NOK: { on: 'bg-red-600 text-white border-red-700 shadow-red-600/20', label: 'NOK' },
  NA: { on: 'bg-slate-700 text-white border-slate-800 shadow-slate-700/20', label: 'NA' },
};

export default function ItemRow({
  code, label, allowNA, response, observation, onResponse, onObservation, readOnly, invalid, extra,
}: {
  code: string; label: string; allowNA: boolean; response: ResponseValue; observation: string;
  onResponse: (v: ResponseValue) => void; onObservation: (v: string) => void; readOnly?: boolean; invalid?: boolean; extra?: React.ReactNode;
}) {
  const options = allowNA ? ['OK', 'NOK', 'NA'] : ['OK', 'NOK'];
  const bg = response === 'NOK' ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200' : invalid ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div id={`item-${code}`} className={`rounded-xl border p-3 sm:p-3.5 transition-all ${bg}`}>
      <div className="flex flex-col gap-2.5 min-w-0">
        {/* Label & Validation Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-900 text-sm sm:text-base leading-snug break-words">
              {label} <span className="text-red-600 font-bold" title="Obrigatório para finalizar">*</span>
            </span>
          </div>
          {invalid && (
            <span className="inline-flex items-center text-xs font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md flex-shrink-0">
              Resposta pendente
            </span>
          )}
        </div>

        {/* Extra inputs (e.g. Firmware / Canbus versions) */}
        {extra && <div className="w-full max-w-md pt-0.5">{extra}</div>}

        {/* Action buttons + Observation row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5 min-w-0">
          {/* Options Radiogroup */}
          <div className="flex gap-2 flex-shrink-0" role="radiogroup" aria-label={label}>
            {options.map((o) => {
              const sel = response === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  disabled={readOnly}
                  onClick={() => onResponse(sel ? 'UNANSWERED' : (o as ResponseValue))}
                  className={`flex-1 sm:flex-initial sm:min-w-[4.25rem] rounded-lg border px-3 py-2 text-sm font-bold tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5 ${
                    sel ? `${styles[o].on} shadow-md` : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base leading-none">{sel ? '☒' : '☐'}</span>
                  <span>{styles[o].label}</span>
                </button>
              );
            })}
          </div>

          {/* Observation Input */}
          <div className="min-w-0 flex-1">
            <input
              aria-label={`Observação: ${label}`}
              placeholder="Observação (opcional)"
              value={observation}
              disabled={readOnly}
              onChange={(e) => onObservation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-nissan focus:ring-1 focus:ring-nissan transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
