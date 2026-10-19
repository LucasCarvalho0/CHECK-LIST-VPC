import type { Shift } from '@/types';

export interface ShiftConfig {
  shift: Shift;
  label: string;
  leaderVPC: string;
  inspectors: string[];
}

export const SHIFT_CONFIGS: Record<Shift, ShiftConfig> = {
  FIRST: {
    shift: 'FIRST',
    label: '1º Turno',
    leaderVPC: 'Washington Wallace',
    inspectors: ['Márcio Luis', 'Tássio de Almeida'],
  },
  SECOND: {
    shift: 'SECOND',
    label: '2º Turno',
    leaderVPC: 'Janaína Mendes',
    inspectors: ['José Augusto', 'Júlio Carvalho'],
  },
};

export const ALL_LEADERS = [
  { name: 'Washington Wallace', shift: 'FIRST' as Shift, label: 'Washington Wallace (1º Turno)' },
  { name: 'Janaína Mendes', shift: 'SECOND' as Shift, label: 'Janaína Mendes (2º Turno)' },
] as const;

export const ALL_INSPECTORS = [
  { name: 'Márcio Luis', shift: 'FIRST' as Shift, label: 'Márcio Luis (1º Turno)' },
  { name: 'Tássio de Almeida', shift: 'FIRST' as Shift, label: 'Tássio de Almeida (1º Turno)' },
  { name: 'José Augusto', shift: 'SECOND' as Shift, label: 'José Augusto (2º Turno)' },
  { name: 'Júlio Carvalho', shift: 'SECOND' as Shift, label: 'Júlio Carvalho (2º Turno)' },
] as const;

/**
 * Heurística para detectar o turno padrão do usuário logado:
 * 1. Campo explícito user.shift ('FIRST' | 'SECOND')
 * 2. Análise por username (matrícula/login) ou nome completo
 */
export function detectUserShift(user?: { username?: string; name?: string; shift?: Shift | null } | null): Shift | null {
  if (!user) return null;
  if (user.shift === 'FIRST' || user.shift === 'SECOND') return user.shift;

  const uname = (user.username || '').toLowerCase();
  const name = (user.name || '').toLowerCase();

  // 1º Turno: Washington Wallace (líder/admin), Márcio Luis (503175), Tássio de Almeida (504033)
  if (
    uname === 'washington' ||
    name.includes('washington') ||
    uname === '503175' ||
    uname === 'marcio' ||
    uname === 'márcio' ||
    name.includes('marcio') ||
    name.includes('márcio') ||
    uname === '504033' ||
    uname === 'tassio' ||
    uname === 'tássio' ||
    name.includes('tassio') ||
    name.includes('tássio')
  ) {
    return 'FIRST';
  }

  // 2º Turno: Lucas Carvalho (116221), José Augusto (499277 / augusto), Júlio Carvalho (501425 / julio), Janaína Mendes
  if (
    uname === '116221' ||
    uname === '499277' ||
    uname === '501425' ||
    uname === 'augusto' ||
    uname === 'julio' ||
    name.includes('augusto') ||
    name.includes('júlio') ||
    name.includes('julio') ||
    name.includes('lucas') ||
    name.includes('janaína') ||
    name.includes('janaina')
  ) {
    return 'SECOND';
  }

  return null;
}

/**
 * Heurística para detectar o inspetor padrão caso o próprio conferente/operador esteja logado
 */
export function detectDefaultInspector(user?: { username?: string; name?: string } | null): string {
  if (!user) return '';
  const uname = (user.username || '').toLowerCase();
  const name = (user.name || '').toLowerCase();

  if (uname === '503175' || uname === 'marcio' || uname === 'márcio' || name.includes('marcio') || name.includes('márcio')) {
    return 'Márcio Luis';
  }
  if (uname === '504033' || uname === 'tassio' || uname === 'tássio' || name.includes('tassio') || name.includes('tássio')) {
    return 'Tássio de Almeida';
  }
  if (uname === '499277' || uname === 'augusto' || name.includes('augusto')) {
    return 'José Augusto';
  }
  if (uname === '501425' || uname === 'julio' || name.includes('julio') || name.includes('júlio')) {
    return 'Júlio Carvalho';
  }

  return '';
}

/**
 * Determina o turno efetivo para consultas, relatórios e dashboards.
 * Se o usuário for OPERADOR (ou pertencer a um turno específico), restringe exclusivamente ao turno dele
 * para evitar misturar informações entre turnos.
 */
export function resolveEffectiveShift(
  user?: { role?: string; username?: string; name?: string; shift?: Shift | null } | null,
  requestedShift?: Shift | ''
): Shift | undefined {
  if (!user) return requestedShift || undefined;
  const userShift = detectUserShift(user);

  // Operadores e usuários com turno fixo têm seus dados restritos ao próprio turno
  if (user.role === 'OPERATOR' && userShift) {
    return userShift;
  }

  // Se o usuário solicitou explicitamente um turno
  if (requestedShift) {
    return requestedShift;
  }

  // Se for admin/líder com turno associado e não escolheu outro, usa o do seu turno por padrão
  return userShift || undefined;
}
