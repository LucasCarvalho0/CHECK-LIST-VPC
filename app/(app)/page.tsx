'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { todayLocal } from '@/lib/format';
import type { Checklist, Paged } from '@/types';
import { Alert, Card, Spinner } from '@/components/ui';
import ChecklistTable from '@/components/ChecklistTable';

interface Summary {
  total: number;
  inProgress: number;
  approved: number;
  reproved: number;
  pendingRepair: number;
  nokItems: number;
}

import { detectUserShift, resolveEffectiveShift } from '@/lib/shared/shifts';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [filterMode, setFilterMode] = useState<'single' | 'range'>('single');
  const [date, setDate] = useState(todayLocal());
  const [dateFrom, setDateFrom] = useState(todayLocal());
  const [dateTo, setDateTo] = useState(todayLocal());
  const [shift, setShift] = useState<'FIRST' | 'SECOND' | ''>('');
  const [shiftOvernight, setShiftOvernight] = useState(true);

  // Inicializa o filtro de turno com o turno do usuário logado
  useEffect(() => {
    if (!user) return;
    const userShift = detectUserShift(user);
    if (userShift && !shift) {
      setShift(userShift);
    }
  }, [user, shift]);

  const [sum, setSum] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Checklist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    setDate(yStr);
    setDateFrom(yStr);
    setDateTo(yStr);
  };

  const setToday = () => {
    const t = todayLocal();
    setDate(t);
    setDateFrom(t);
    setDateTo(t);
  };

  useEffect(() => {
    if (loading) return;
    setError(null);
    const effectiveShift = resolveEffectiveShift(user, shift);
    const params: Record<string, any> = {
      shift: effectiveShift,
      shiftOvernight,
      pageSize: 20,
    };

    if (filterMode === 'single') {
      params.date = date;
    } else {
      params.dateFrom = dateFrom;
      params.dateTo = dateTo;
    }

    Promise.all([
      api.get<Summary>(`/reports/summary${qs(params)}`),
      api.get<Paged<Checklist>>(`/checklists${qs(params)}`),
    ])
      .then(([s, l]) => {
        setSum(s);
        setRows(l.data);
      })
      .catch((e) => setError(e.message));
  }, [loading, user, filterMode, date, dateFrom, dateTo, shift, shiftOvernight]);

  const cards: [string, number | undefined, string][] = [
    [shift === 'SECOND' ? 'Total 2º Turno (com madrugada)' : 'Total na Jornada', sum?.total, 'text-slate-900'],
    ['Em preenchimento', sum?.inProgress, 'text-amber-700'],
    ['Aprovados', sum?.approved, 'text-green-700'],
    ['Reprovados', sum?.reproved, 'text-red-700'],
    ['Com pendências de reparo', sum?.pendingRepair, 'text-orange-700'],
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard de Inspeções – SESÉ QA</h1>
          <p className="text-xs text-slate-500">Monitoramento em tempo real de checklists e turnos de produção VPC</p>
        </div>
        {user?.role !== 'VIEWER' && (
          <Link href="/checklists/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm">
            + Novo Checklist
          </Link>
        )}
      </div>

      {/* Painel de Filtros Flexíveis */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Filtro de Exibição:</span>
            <button
              type="button"
              onClick={() => setFilterMode('single')}
              className={`rounded-lg px-3 py-1 transition ${filterMode === 'single' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Jornada de Produção (Data Única)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`rounded-lg px-3 py-1 transition ${filterMode === 'range' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Intervalo de Datas (De / Até)
            </button>
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-1">Atalhos:</span>
            <button type="button" onClick={setToday} className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 text-slate-700 font-medium">Hoje</button>
            <button type="button" onClick={setYesterday} className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 text-slate-700 font-medium">Ontem</button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-sm">
          {filterMode === 'single' ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Data de Início da Jornada
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm bg-white"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Data Inicial (De)
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm bg-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Data Final (Até)
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm bg-white"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700 min-w-[200px]">
            <span>
              Turno de Produção
              {user?.role === 'OPERATOR' && (
                <span className="ml-1 text-[11px] font-normal text-blue-600">(Exclusivo do seu turno)</span>
              )}
            </span>
            <select
              value={shift}
              disabled={user?.role === 'OPERATOR'}
              onChange={(e) => setShift(e.target.value as any)}
              className={`rounded-lg border border-slate-300 p-2 text-sm bg-white ${
                user?.role === 'OPERATOR' ? 'bg-slate-100 cursor-not-allowed text-slate-700 font-semibold' : ''
              }`}
            >
              {user?.role !== 'OPERATOR' && <option value="">Todos os Turnos</option>}
              <option value="FIRST">1º Turno (06h às 16h)</option>
              <option value="SECOND">2º Turno (16h às 02h da madrugada)</option>
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer pb-2 text-xs font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={shiftOvernight}
              onChange={(e) => setShiftOvernight(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>🌙 Incluir virada da madrugada (00:00 às 05:00)</span>
          </label>
        </div>

        {/* Notificação Informativa de Virada de Turno */}
        {shift === 'SECOND' && shiftOvernight && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              <strong>2º Turno Contínuo Ativo:</strong> Exibindo os checklists das 16:00 até as 23:59 e também os registrados na madrugada seguinte (até 02:00/05:00), somando a produção completa do turno.
            </span>
          </div>
        )}
      </div>

      {error && <Alert type="err">{error}</Alert>}

      {!sum && !error ? (
        <Spinner />
      ) : (
        <>
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map(([l, v, c]) => (
              <Card key={l}>
                <div className="text-xs text-slate-500 font-medium">{l}</div>
                <div className={`text-3xl font-bold mt-1 ${c}`}>{v ?? 0}</div>
              </Card>
            ))}
          </div>

          {/* Tabela de Checklists do Período */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Checklists desta jornada/período</h2>
              {rows && (
                <span className="text-xs font-semibold text-slate-500">
                  {rows.length} checklist(s) listado(s)
                </span>
              )}
            </div>
            {rows && <ChecklistTable rows={rows} />}
            <p className="text-xs text-slate-500">
              * Aprovados e Reprovados contabilizam apenas inspeções concluídas com o parecer formal do Inspetor QA.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

