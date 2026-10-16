import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ALL_ITEMS, chassisWarning, normalizeChassis } from '@/lib/shared/catalog';
import { ResponsesMap, validateForFinalize, ChecklistLike, isRepairPending } from '@/lib/shared/rules';

const baseChecklist = (): ChecklistLike => ({
  vehicleVersion: 'XE', chassis: '9BWZZZ377VT004251', checklistDate: '2026-10-14', checklistTime: '08:30', shift: 'FIRST',
  inspectorQA: 'Ana', leaderVPC: 'Bruno', bpc: '123', firmwareVersion: '1.2.3', canbusVersion: 'C9',
  auditResult: 'APPROVED',
});
const allOk = (): ResponsesMap => Object.fromEntries(ALL_ITEMS.map((i) => [i.code, { response: 'OK' as const }]));

describe('catálogo', () => {
  it('contém exatamente os itens do formulário (12 + 9 + 3 + 4 + 2)', () => {
    const count = (s: string) => ALL_ITEMS.filter((i) => i.section === s).length;
    expect([count('VISUAL'), count('FUNCTIONAL'), count('SOFTWARE'), count('STICKER'), count('AUDIT')]).toEqual([12, 9, 3, 4, 2]);
  });
  it('NA só existe na seção de adesivos', () => {
    expect([...new Set(ALL_ITEMS.filter((i) => i.allowNA).map((i) => i.section))]).toEqual(['STICKER']);
  });
});

describe('chassi', () => {
  it('normaliza espaços, quebras de linha do scanner e caixa', () => {
    expect(normalizeChassis('  9bwzzz377vt004251\r\n')).toBe('9BWZZZ377VT004251');
    expect(normalizeChassis(' 9BW ZZZ\t377 ')).toBe('9BWZZZ377');
  });
  it('avisa (sem rejeitar) comprimento atípico', () => {
    expect(chassisWarning('ABC123')).toMatch(/atípico/);
    expect(chassisWarning('9BWZZZ377VT004251')).toBeNull();
  });
});

describe('validação de finalização', () => {
  it('aceita checklist completo e aprovado', () => {
    expect(validateForFinalize(baseChecklist(), allOk())).toEqual([]);
  });
  it('bloqueia quando faltam itens (rascunho vazio)', () => {
    const errors = validateForFinalize({ chassis: 'X' }, {});
    expect(errors.some((e) => e.field === 'VIS_01')).toBe(true);
    expect(errors.some((e) => e.field === 'shift')).toBe(true);
    expect(errors.some((e) => e.field === 'auditResult')).toBe(true);
  });
  it('exige versões de firmware e Canbus', () => {
    const errors = validateForFinalize({ ...baseChecklist(), firmwareVersion: ' ', canbusVersion: null }, allOk());
    expect(errors.map((e) => e.field)).toEqual(expect.arrayContaining(['firmwareVersion', 'canbusVersion']));
  });
  it('REPROVADO exige descrição da não conformidade', () => {
    const c = { ...baseChecklist(), auditResult: 'REPROVED' as const };
    expect(validateForFinalize(c, allOk()).map((e) => e.field)).toContain('nonConformityDescription');
    expect(validateForFinalize({ ...c, nonConformityDescription: 'Risco no display', repairStatus: 'NOT_APPLICABLE', repairObservation: 'Aguardando peça' }, allOk())).toEqual([]);
  });
  it('NA não é aceito fora da seção de adesivos', () => {
    const r = allOk();
    r['VIS_01'] = { response: 'NA' };
    expect(validateForFinalize(baseChecklist(), r).map((e) => e.field)).toContain('VIS_01');
    const r2 = allOk();
    r2['ADE_01'] = { response: 'NA' };
    expect(validateForFinalize(baseChecklist(), r2)).toEqual([]);
  });
  it('item NOK exige decisão explícita sobre o reparo e, se informado, os dados completos', () => {
    const r = allOk();
    r['FUN_02'] = { response: 'NOK', observation: 'USB falhou' };
    expect(validateForFinalize(baseChecklist(), r).map((e) => e.field)).toContain('repairStatus');
    const withRepair = { ...baseChecklist(), repairStatus: 'OK' as const };
    expect(validateForFinalize(withRepair, r).map((e) => e.field)).toEqual(
      expect.arrayContaining(['repairObservation', 'repairInspectorQA', 'repairLeaderVPC', 'repairDate', 'repairTime']),
    );
    expect(isRepairPending(baseChecklist(), r)).toBe(true);
    expect(isRepairPending({ ...baseChecklist(), repairStatus: 'OK' }, r)).toBe(false);
  });
});
