// FONTE ÚNICA DO CATÁLOGO DO CHECKLIST (textos originais do formulário Nissan).
// Usado pelo servidor (rotas /api) e pela interface, no mesmo projeto Next.js.
export type ResponseValue = 'OK' | 'NOK' | 'NA' | 'UNANSWERED';
export type SectionKey = 'VISUAL' | 'FUNCTIONAL' | 'SOFTWARE' | 'STICKER' | 'AUDIT';

export interface ItemDef {
  code: string;
  label: string;
  /** Campo do checklist que guarda o valor digitado (versão), quando existir */
  valueField?: 'firmwareVersion' | 'canbusVersion';
}

export interface SectionDef {
  key: SectionKey;
  title: string;
  page: 1 | 2 | 3;
  /** A opção NA só existe na seção de adesivos, conforme o formulário de referência */
  allowNA: boolean;
  items: ItemDef[];
}

export const SECTIONS: SectionDef[] = [
  {
    key: 'VISUAL',
    title: 'INSPEÇÃO VISUAL',
    page: 1,
    allowNA: false,
    items: [
      { code: 'VIS_01', label: 'Frame (moldura) correto para o modelo.' },
      { code: 'VIS_02', label: 'Frame corretamente encaixado.' },
      { code: 'VIS_03', label: 'Frame (moldura) sem riscos ou danos.' },
      { code: 'VIS_04', label: 'Display sem riscos.' },
      { code: 'VIS_05', label: 'Display sem sujeira.' },
      { code: 'VIS_06', label: 'Painel sem avarias.' },
      { code: 'VIS_07', label: 'Saídas de ar corretamente montadas.' },
      { code: 'VIS_08', label: 'Comandos do A/C sem danos.' },
      { code: 'VIS_09', label: 'Porta-luvas sem danos.' },
      { code: 'VIS_10', label: 'Porta-copos sem danos.' },
      { code: 'VIS_11', label: 'Lateral do painel (airbag) sem danos.' },
      { code: 'VIS_12', label: 'Duas chaves no veículo.' },
    ],
  },
  {
    key: 'FUNCTIONAL',
    title: 'INSPEÇÃO FUNCIONAL',
    page: 2,
    allowNA: false,
    items: [
      { code: 'FUN_01', label: 'Equipamento liga corretamente.' },
      { code: 'FUN_02', label: 'Função USB testada.' },
      { code: 'FUN_03', label: 'Sintonia Rádio AM/FM testada.' },
      { code: 'FUN_04', label: 'Ausência de folgas entre painel e frame.' },
      { code: 'FUN_05', label: 'Painel sem avarias.' },
      { code: 'FUN_06', label: 'Touch screen funcionando.' },
      { code: 'FUN_07', label: 'Botões físicos funcionando.' },
      { code: 'FUN_08', label: 'Botões de controle da mídia no volante.' },
      { code: 'FUN_09', label: 'Câmera de ré funcionando.' },
    ],
  },
  {
    key: 'SOFTWARE',
    title: 'INSPEÇÃO DE SOFTWARE',
    page: 2,
    allowNA: false,
    items: [
      { code: 'SOF_01', label: 'Firmware Atualizado' },
      { code: 'SOF_02', label: 'Versão Firmware', valueField: 'firmwareVersion' },
      { code: 'SOF_03', label: 'Versão Canbus', valueField: 'canbusVersion' },
    ],
  },
  {
    key: 'STICKER',
    title: 'CHECKLIST - APLICAÇÃO DE ADESIVO',
    page: 2,
    allowNA: true,
    items: [
      { code: 'ADE_01', label: 'Presença de adesivo na coluna C lado direito.' },
      { code: 'ADE_02', label: 'Presença de adesivo na coluna C lado esquerdo.' },
      { code: 'ADE_03', label: 'SEM apresentação de bolhas ou arranhados nos adesivos aplicados.' },
      {
        code: 'ADE_04',
        label:
          'Adesivos Não apresentam avarias: arranhado, dobrado, falha na cor, rasgado ou rasurado antes da aplicação.',
      },
    ],
  },
  {
    key: 'AUDIT',
    title: 'RESULTADO DA AUDITORIA',
    page: 3,
    allowNA: false,
    items: [
      {
        code: 'AUD_01',
        label:
          'Veículo liberado sem apresentar “não conformidades” referentes à integridade e aspecto visual dos acessórios instalados.',
      },
      {
        code: 'AUD_02',
        label:
          'Veículo liberado sem apresentar “não conformidades” referentes a avarias na lataria e pintura do veículo.',
      },
    ],
  },
];

export const ALL_ITEMS: (ItemDef & { section: SectionKey; allowNA: boolean })[] = SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.key, allowNA: s.allowNA })),
);

export const ITEM_INDEX: Record<string, (typeof ALL_ITEMS)[number]> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.code, i]),
);

export const DOC_TITLE = 'CHECK LIST – INSTALAÇÃO MULTIMÍDIA';
export const PAGES_PER_CHECKLIST = 3;

// ---------- Chassi ----------

/** Remove espaços/quebras de linha enviados pelo scanner e padroniza em maiúsculas. */
export function normalizeChassis(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\s\u0000-\u001f\u007f]+/g, '').toUpperCase();
}

/** Retorna um aviso (não um erro) para chassis atípicos. Nunca rejeita automaticamente. */
export function chassisWarning(value: string): string | null {
  if (!value) return null;
  if (value.length !== 17) return `Comprimento atípico (${value.length} caracteres; o padrão VIN tem 17). Confira a leitura.`;
  if (/[IOQ]/.test(value)) return 'O chassi contém I, O ou Q, que não são usados no padrão VIN. Confira a leitura.';
  return null;
}
