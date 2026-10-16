import { PAGES_PER_CHECKLIST } from '@/lib/shared/catalog';

/**
 * Plano de páginas do PDF.
 * Cada veículo ocupa PAGES_PER_CHECKLIST (3) páginas de conteúdo. Como 3 é ímpar, na impressão frente e verso o
 * veículo seguinte começaria no verso da folha. Com blankSeparator, entra 1 página em branco após o conteúdo de cada
 * veículo, exceto o último (não há veículo seguinte), fazendo cada veículo ocupar 2 folhas (4 faces).
 */
export function planPages(vehicles: number, blankSeparator: boolean) {
  const contentPages = vehicles * PAGES_PER_CHECKLIST;
  const blankPages = blankSeparator ? Math.max(0, vehicles - 1) : 0;
  return { vehicles, contentPages, blankPages, totalPages: contentPages + blankPages, sheetsDuplex: Math.ceil((contentPages + blankPages) / 2) };
}
