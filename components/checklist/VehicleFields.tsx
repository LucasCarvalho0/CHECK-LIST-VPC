'use client';
import { Field } from '@/components/ui';
import ChassisInput from './ChassisInput';
import type { Shift } from '@/types';
import { SHIFT_CONFIGS, detectUserShift, detectDefaultInspector } from '@/lib/shared/shifts';

export interface VehicleValues {
  chassis: string; vehicleVersion: string; checklistDate: string; checklistTime: string; shift: Shift | '';
  inspectorQA: string; leaderVPC: string; bpc: string; isPCD: boolean; isL1: boolean; isL2: boolean; isL3: boolean;
}

const VEHICLE_VERSIONS = [
  { key: 'PCD', label: 'PCD', sub: 'Pessoa com Deficiência', flag: 'isPCD' as const },
  { key: 'L1', label: 'L1', sub: '', flag: 'isL1' as const },
  { key: 'L2', label: 'L2', sub: '', flag: 'isL2' as const },
  { key: 'L3', label: 'L3', sub: '', flag: 'isL3' as const },
];

export default function VehicleFields({
  values, onChange, readOnly, errorFields = [], autoFocusChassis, onChassisEnter,
}: {
  values: VehicleValues; onChange: <K extends keyof VehicleValues>(k: K, v: VehicleValues[K]) => void; readOnly?: boolean;
  errorFields?: string[]; autoFocusChassis?: boolean; onChassisEnter?: () => void;
}) {
  const err = (f: string) => (errorFields.includes(f) ? 'Campo obrigatório' : undefined);

  const selectVersion = (selectedKey: 'PCD' | 'L1' | 'L2' | 'L3') => {
    if (readOnly) return;
    onChange('vehicleVersion', selectedKey);
    onChange('isPCD', selectedKey === 'PCD');
    onChange('isL1', selectedKey === 'L1');
    onChange('isL2', selectedKey === 'L2');
    onChange('isL3', selectedKey === 'L3');
  };

  const currentShift = values.shift as Shift;
  const shiftInspectors = currentShift && SHIFT_CONFIGS[currentShift]
    ? SHIFT_CONFIGS[currentShift].inspectors
    : ['Márcio Luis', 'Tássio de Almeida', 'José Augusto', 'Júlio Carvalho'];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Chassi" required error={err('chassis')}>
        <ChassisInput
          value={values.chassis}
          onChange={(v) => onChange('chassis', v)}
          disabled={readOnly}
          autoFocus={autoFocusChassis}
          invalid={!!err('chassis')}
          onEnter={() => {
            const vBtn = document.getElementById('btn-version-PCD');
            if (vBtn) vBtn.focus();
            onChassisEnter?.();
          }}
        />
      </Field>

      {/* Versão do Veículo: seleção exclusiva de apenas um (PCD, L1, L2, L3) */}
      <div className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Versão do Veículo <span className="text-red-600">*</span>
        </span>
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2 rounded border p-2 bg-slate-50/50 ${
            err('vehicleVersion') ? 'border-red-500' : 'border-slate-300'
          }`}
          role="radiogroup"
          aria-label="Versão do Veículo"
        >
          {VEHICLE_VERSIONS.map((ver) => {
            const isSelected =
              values.vehicleVersion === ver.key ||
              (values[ver.flag] &&
                !VEHICLE_VERSIONS.some((o) => o.key !== ver.key && values[o.flag]));
            return (
              <button
                key={ver.key}
                id={`btn-version-${ver.key}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={readOnly}
                onClick={() => selectVersion(ver.key as any)}
                className={`flex flex-col items-center justify-center p-2 rounded border text-sm font-bold transition ${
                  isSelected
                    ? 'bg-nissan text-white border-nissan shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{ver.label}</span>
                {ver.sub && <span className="text-[10px] opacity-80 font-normal">{ver.sub}</span>}
              </button>
            );
          })}
        </div>
        {err('vehicleVersion') && (
          <span className="mt-1 block text-xs text-red-600">Selecione a versão (PCD, L1, L2 ou L3)</span>
        )}
      </div>

      <Field label="Data" required error={err('checklistDate')}>
        <input type="date" value={values.checklistDate} disabled={readOnly} onChange={(e) => onChange('checklistDate', e.target.value)} />
      </Field>

      <Field label="Hora" required error={err('checklistTime')}>
        <input type="time" value={values.checklistTime} disabled={readOnly} onChange={(e) => onChange('checklistTime', e.target.value)} />
      </Field>

      {/* Turno */}
      <div className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Turno <span className="text-red-600">*</span></span>
        <div className={`flex gap-3 rounded border p-2 ${err('shift') ? 'border-red-500' : 'border-slate-300'}`} role="radiogroup" aria-label="Turno">
          {(['FIRST', 'SECOND'] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="shift"
                className="!w-4"
                checked={values.shift === s}
                disabled={readOnly}
                onChange={() => {
                  onChange('shift', s);
                  onChange('leaderVPC', SHIFT_CONFIGS[s].leaderVPC);
                }}
              />
              {s === 'FIRST' ? '1º Turno' : '2º Turno'}
            </label>
          ))}
        </div>
        {err('shift') && <span className="mt-1 block text-xs text-red-600">Selecione o turno</span>}
      </div>

      {/* Inspetor QA */}
      <Field label="Inspetor QA" required error={err('inspectorQA')}>
        <div className="flex gap-2">
          <select
            id="f-inspectorQA"
            value={values.inspectorQA}
            disabled={readOnly}
            onChange={(e) => onChange('inspectorQA', e.target.value)}
            className={`flex-1 rounded border p-2 ${err('inspectorQA') ? 'border-red-500' : 'border-slate-300'}`}
          >
            <option value="">Selecione o Inspetor</option>
            {shiftInspectors.map((ins) => (
              <option key={ins} value={ins}>{ins}</option>
            ))}
            {values.inspectorQA && !shiftInspectors.includes(values.inspectorQA) && (
              <option value={values.inspectorQA}>{values.inspectorQA}</option>
            )}
          </select>
        </div>
      </Field>

      {/* Líder VPC */}
      <Field label="Líder VPC" required error={err('leaderVPC')}>
        <input
          id="f-leaderVPC"
          value={values.leaderVPC}
          disabled={readOnly}
          onChange={(e) => onChange('leaderVPC', e.target.value)}
          className={err('leaderVPC') ? 'border-red-500' : ''}
        />
      </Field>
    </div>
  );
}
