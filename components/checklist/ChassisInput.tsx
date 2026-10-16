'use client';
import { useState } from 'react';
import { chassisWarning, normalizeChassis } from '@/lib/shared/catalog';

/**
 * Campo de chassi para leitor de código de barras USB/Bluetooth (funciona como teclado).
 * - Normaliza (sem espaços, maiúsculas) a cada caractere recebido.
 * - Enter enviado pelo scanner NÃO envia formulário: apenas confirma a leitura e chama onEnter.
 * - Chassi atípico gera aviso, nunca bloqueio.
 */
export default function ChassisInput({
  value, onChange, onEnter, autoFocus, disabled, invalid,
}: { value: string; onChange: (v: string) => void; onEnter?: () => void; autoFocus?: boolean; disabled?: boolean; invalid?: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const warn = chassisWarning(value);
  return (
    <div>
      <input
        id="f-chassis"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        placeholder="Leia o código de barras do chassi"
        aria-invalid={invalid}
        className={`font-mono tracking-wide ${invalid ? 'border-red-500' : ''}`}
        onChange={(e) => { setConfirmed(false); onChange(normalizeChassis(e.target.value)); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value) { setConfirmed(true); onEnter?.(); }
          }
        }}
        onBlur={() => value && setConfirmed(true)}
      />
      {confirmed && value && !warn && <p className="mt-1 text-xs font-medium text-green-700">✓ Chassi lido: {value}</p>}
      {warn && <p className="mt-1 text-xs text-amber-700">⚠ {warn} Um operador pode revisar e manter o valor.</p>}
    </div>
  );
}
