import type { AuditResult, Shift, Status } from '@/types';

export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const nowLocalTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const brDate = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
export const shiftLabel = (s?: Shift | null) => (s === 'FIRST' ? '1º Turno' : s === 'SECOND' ? '2º Turno' : '—');
export const statusLabel: Record<Status, string> = { IN_PROGRESS: 'Em preenchimento', FINALIZED: 'Finalizado', CANCELED: 'Cancelado' };
export const resultLabel = (r?: AuditResult | null) => (r === 'APPROVED' ? 'APROVADO' : r === 'REPROVED' ? 'REPROVADO' : '—');
