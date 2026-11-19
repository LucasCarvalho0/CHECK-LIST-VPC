'use client';
import { Field } from '@/components/ui';
import ChassisInput from './ChassisInput';
import type { Shift } from '@/types';

export interface VehicleValues {
  chassis: string; vehicleVersion: string; checklistDate: string; checklistTime: string; shift: Shift | '';
  inspectorQA: string; leaderVPC: string; bpc: string; isPCD: boolean; isL1: boolean; isL2: boolean; isL3: boolean;
}

export default function VehicleFields({
  values, onChange, readOnly, errorFields = [], autoFocusChassis, onChassisEnter,
}: {
  values: VehicleValues; onChange: <K extends keyof VehicleValues>(k: K, v: VehicleValues[K]) => void; readOnly?: boolean;
  errorFields?: string[]; autoFocusChassis?: boolean; onChassisEnter?: () => void;
}) {
  const err = (f: string) => (errorFields.includes(f) ? 'Campo obrigatório' : undefined);
  type TextKey = 'vehicleVersion' | 'inspectorQA' | 'leaderVPC' | 'bpc';
  const text = (k: TextKey, label: string) => (
    <Field label={label} required error={err(k)}>
      <input id={`f-${k}`} value={values[k]} disabled={readOnly} onChange={(e) => onChange(k, e.target.value as never)} className={err(k) ? 'border-red-500' : ''} />
    </Field>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Chassi" required error={err('chassis')}>
        <ChassisInput value={values.chassis} onChange={(v) => onChange('chassis', v)} disabled={readOnly} autoFocus={autoFocusChassis} invalid={!!err('chassis')}
          onEnter={onChassisEnter} />
      </Field>
      {text('vehicleVersion', 'Versão')}
      <Field label="Data" required error={err('checklistDate')}>
        <input type="date" value={values.checklistDate} disabled={readOnly} onChange={(e) => onChange('checklistDate', e.target.value)} />
      </Field>
      <Field label="Hora" required error={err('checklistTime')}>
        <input type="time" value={values.checklistTime} disabled={readOnly} onChange={(e) => onChange('checklistTime', e.target.value)} />
      </Field>
      <div className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Turno <span className="text-red-600">*</span></span>
        <div className={`flex gap-3 rounded border p-2 ${err('shift') ? 'border-red-500' : 'border-slate-300'}`} role="radiogroup" aria-label="Turno">
          {(['FIRST', 'SECOND'] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="shift" className="!w-4" checked={values.shift === s} disabled={readOnly} onChange={() => onChange('shift', s)} />
              {s === 'FIRST' ? '1º Turno' : '2º Turno'}
            </label>
          ))}
        </div>
        {err('shift') && <span className="mt-1 block text-xs text-red-600">Selecione o turno</span>}
      </div>
      {text('inspectorQA', 'Inspetor QA')}
      {text('leaderVPC', 'Líder VPC')}
      {text('bpc', 'BPC')}
      <div className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">Tipo de Veículo</span>
        <div className="flex flex-wrap gap-4 md:gap-6 rounded border border-slate-300 p-2.5 bg-slate-50/50">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="!w-4 h-4 text-blue-600 rounded" checked={values.isPCD} disabled={readOnly}
              onChange={(e) => onChange('isPCD', e.target.checked as never)} />
            <span className="font-semibold text-slate-800">PCD</span>
            <span className="text-xs text-slate-500">(Pessoa com Deficiência)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="!w-4 h-4 text-purple-600 rounded" checked={values.isL1} disabled={readOnly}
              onChange={(e) => onChange('isL1', e.target.checked as never)} />
            <span className="font-semibold text-slate-800">L1</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="!w-4 h-4 text-indigo-600 rounded" checked={values.isL2} disabled={readOnly}
              onChange={(e) => onChange('isL2', e.target.checked as never)} />
            <span className="font-semibold text-slate-800">L2</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="!w-4 h-4 text-emerald-600 rounded" checked={values.isL3} disabled={readOnly}
              onChange={(e) => onChange('isL3', e.target.checked as never)} />
            <span className="font-semibold text-slate-800">L3</span>
          </label>
        </div>
      </div>
    </div>
  );
}
