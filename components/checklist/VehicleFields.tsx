'use client';
import { Field } from '@/components/ui';
import ChassisInput from './ChassisInput';
import type { Shift } from '@/types';

export interface VehicleValues {
  chassis: string; vehicleVersion: string; checklistDate: string; checklistTime: string; shift: Shift | '';
  inspectorQA: string; leaderVPC: string; bpc: string;
}

export default function VehicleFields({
  values, onChange, readOnly, errorFields = [], autoFocusChassis, onChassisEnter,
}: {
  values: VehicleValues; onChange: <K extends keyof VehicleValues>(k: K, v: VehicleValues[K]) => void; readOnly?: boolean;
  errorFields?: string[]; autoFocusChassis?: boolean; onChassisEnter?: () => void;
}) {
  const err = (f: string) => (errorFields.includes(f) ? 'Campo obrigatório' : undefined);
  const text = (k: keyof VehicleValues, label: string) => (
    <Field label={label} required error={err(k)}>
      <input id={`f-${k}`} value={values[k]} disabled={readOnly} onChange={(e) => onChange(k, e.target.value as never)} className={`w-full ${err(k) ? 'border-red-500' : ''}`} />
    </Field>
  );
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 min-w-0">
      <Field label="Versão" required error={err('vehicleVersion')}>
        <select
          id="f-vehicleVersion"
          value={values.vehicleVersion}
          disabled={readOnly}
          onChange={(e) => onChange('vehicleVersion', e.target.value)}
          className={`w-full rounded-lg border p-2 text-sm bg-white ${err('vehicleVersion') ? 'border-red-500' : 'border-slate-300'}`}
        >
          <option value="">Selecione a versão...</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
          <option value="PCD">PCD</option>
        </select>
      </Field>
      <Field label="Chassi" required error={err('chassis')}>
        <ChassisInput value={values.chassis} onChange={(v) => onChange('chassis', v)} disabled={readOnly} autoFocus={autoFocusChassis} invalid={!!err('chassis')}
          onEnter={onChassisEnter} />
      </Field>
      <Field label="Data" required error={err('checklistDate')}>
        <input type="date" value={values.checklistDate} disabled={readOnly} onChange={(e) => onChange('checklistDate', e.target.value)} className="w-full" />
      </Field>
      <Field label="Hora" required error={err('checklistTime')}>
        <input type="time" value={values.checklistTime} disabled={readOnly} onChange={(e) => onChange('checklistTime', e.target.value)} className="w-full" />
      </Field>
      <div className="text-sm sm:col-span-2 min-w-0">
        <span className="mb-1 block font-medium text-slate-700">Turno <span className="text-red-600">*</span></span>
        <div className={`flex flex-wrap gap-4 rounded-lg border p-2.5 ${err('shift') ? 'border-red-500' : 'border-slate-300'}`} role="radiogroup" aria-label="Turno">
          {(['FIRST', 'SECOND'] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="shift"
                className="!w-4 !h-4"
                checked={values.shift === s}
                disabled={readOnly}
                onChange={() => {
                  onChange('shift', s);
                  if (s === 'SECOND' && (!values.leaderVPC || values.leaderVPC === '')) {
                    onChange('leaderVPC', 'Janaína Mendes');
                  }
                }}
              />
              <span className="text-sm font-medium">{s === 'FIRST' ? '1º Turno' : '2º Turno'}</span>
            </label>
          ))}
        </div>
        {err('shift') && <span className="mt-1 block text-xs text-red-600">Selecione o turno</span>}
      </div>
      <Field label="Inspetor QA" required error={err('inspectorQA')}>
        <select
          id="f-inspectorQA"
          value={values.inspectorQA}
          disabled={readOnly}
          onChange={(e) => onChange('inspectorQA', e.target.value)}
          className={`w-full rounded-lg border p-2 text-sm bg-white ${err('inspectorQA') ? 'border-red-500' : 'border-slate-300'}`}
        >
          <option value="">Selecione o inspetor...</option>
          <option value="José Augusto">José Augusto (2º Turno)</option>
          <option value="Júlio Carvalho">Júlio Carvalho (2º Turno)</option>
          {values.inspectorQA && !['José Augusto', 'Júlio Carvalho'].includes(values.inspectorQA) && (
            <option value={values.inspectorQA}>{values.inspectorQA}</option>
          )}
        </select>
      </Field>
      <div className="min-w-0">
        {text('leaderVPC', 'Líder VPC')}
        {!readOnly && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span>Preenchimento rápido:</span>
            <button
              type="button"
              onClick={() => onChange('leaderVPC', 'Janaína Mendes')}
              className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Janaína Mendes (2º Turno)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
