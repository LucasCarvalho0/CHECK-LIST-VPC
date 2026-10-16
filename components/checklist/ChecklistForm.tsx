'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, downloadBlob } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useAutosave } from '@/hooks/useAutosave';
import { ALL_ITEMS, SECTIONS, ResponseValue, SectionKey } from '@/lib/shared/catalog';
import { ChecklistLike, ResponsesMap, RuleError, validateForFinalize, hasNonConformity } from '@/lib/shared/rules';
import type { Checklist, Status } from '@/types';
import { statusLabel } from '@/lib/format';
import { Alert, Badge, Btn, Card, Field, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import VehicleFields, { VehicleValues } from './VehicleFields';
import ItemRow from './ItemRow';

type Form = VehicleValues & {
  firmwareVersion: string; canbusVersion: string; auditResult: '' | 'APPROVED' | 'REPROVED'; nonConformityDescription: string;
  repairStatus: '' | 'OK' | 'NOK' | 'NOT_APPLICABLE'; repairObservation: string; repairInspectorQA: string; repairLeaderVPC: string;
  repairDate: string; repairTime: string;
};
type ItemState = { response: ResponseValue; observation: string };
type Pending = { fields: Partial<Form>; items: Record<string, Partial<ItemState>> };
type Tab = 'INFO' | SectionKey | 'REPAIR';

const TABS: { key: Tab; label: string }[] = [
  { key: 'INFO', label: '1. Informação do veículo' },
  { key: 'VISUAL', label: '2. Inspeção visual' },
  { key: 'FUNCTIONAL', label: '3. Inspeção funcional' },
  { key: 'SOFTWARE', label: '4. Inspeção de software' },
  { key: 'STICKER', label: '5. Aplicação de adesivo' },
  { key: 'AUDIT', label: '6. Resultado da auditoria' },
  { key: 'REPAIR', label: '7. Validação de reparo' },
];

const empty = (): Pending => ({ fields: {}, items: {} });
const nz = (v: string | null | undefined) => v ?? '';

function fromServer(c: Checklist): { form: Form; items: Record<string, ItemState> } {
  const form: Form = {
    chassis: c.chassis, vehicleVersion: nz(c.vehicleVersion), checklistDate: c.checklistDate, checklistTime: c.checklistTime, shift: c.shift ?? '',
    inspectorQA: nz(c.inspectorQA), leaderVPC: nz(c.leaderVPC), bpc: nz(c.bpc), firmwareVersion: nz(c.firmwareVersion), canbusVersion: nz(c.canbusVersion),
    auditResult: c.auditResult || 'APPROVED', nonConformityDescription: nz(c.nonConformityDescription), repairStatus: c.repairStatus ?? '',
    repairObservation: nz(c.repairObservation), repairInspectorQA: nz(c.repairInspectorQA), repairLeaderVPC: nz(c.repairLeaderVPC),
    repairDate: nz(c.repairDate), repairTime: nz(c.repairTime),
  };
  const items: Record<string, ItemState> = {};
  for (const i of ALL_ITEMS) items[i.code] = { response: 'OK', observation: '' };
  for (const r of c.responses) items[r.itemCode] = { response: r.response === 'UNANSWERED' ? 'OK' : r.response, observation: nz(r.observation) };
  return { form, items };
}

const toLike = (f: Form): ChecklistLike => ({ ...f, shift: f.shift || null, auditResult: f.auditResult || null, repairStatus: f.repairStatus || null });
const toMap = (items: Record<string, ItemState>): ResponsesMap => items;

function tabOf(field: string): Tab {
  if (/^VIS_/.test(field)) return 'VISUAL';
  if (/^FUN_/.test(field)) return 'FUNCTIONAL';
  if (/^SOF_|^firmwareVersion$|^canbusVersion$/.test(field)) return 'SOFTWARE';
  if (/^ADE_/.test(field)) return 'STICKER';
  if (/^AUD_|^auditResult$|^nonConformityDescription$/.test(field)) return 'AUDIT';
  if (/^repair/.test(field)) return 'REPAIR';
  return 'INFO';
}

export default function ChecklistForm({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('IN_PROGRESS');
  const [form, setForm] = useState<Form | null>(null);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [tab, setTab] = useState<Tab>('INFO');
  const [errors, setErrors] = useState<RuleError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const updatedAt = useRef('');
  const pending = useRef<Pending>(empty());

  // ----- carregar do servidor (persistência real: sobrevive a F5) -----
  const load = useCallback(async () => {
    try {
      const c = await api.get<Checklist>(`/checklists/${id}`);
      const s = fromServer(c);
      setForm(s.form); setItems(s.items); setStatus(c.status); updatedAt.current = c.updatedAt; pending.current = empty();
      setLoaded(true);
    } catch (e) { setLoadError(e instanceof ApiError ? e.message : 'Erro ao carregar.'); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const readOnly = !user || user.role === 'VIEWER' || status === 'CANCELED' || (status === 'FINALIZED' && user.role !== 'ADMIN');
  const autosave = !readOnly && status === 'IN_PROGRESS';

  // ----- envio do que mudou (parcial; nunca reenvia o formulário inteiro) -----
  const save = useCallback(async () => {
    const snap = pending.current;
    if (!Object.keys(snap.fields).length && !Object.keys(snap.items).length) return;
    pending.current = empty();
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(snap.fields)) {
      if (v === '' && ['chassis', 'checklistDate', 'checklistTime'].includes(k)) continue; // obrigatórios: não apaga
      fields[k] = v === '' ? null : v;
    }
    try {
      const res = await api.patch<Checklist>(`/checklists/${id}`, {
        ...fields,
        items: Object.entries(snap.items).map(([itemCode, v]) => ({ itemCode, ...v })),
        baseUpdatedAt: updatedAt.current,
      });
      updatedAt.current = res.updatedAt;
    } catch (e) {
      // devolve à fila sem sobrescrever o que o usuário digitou depois
      const cur = pending.current;
      const items2: Pending['items'] = { ...snap.items };
      for (const [k, v] of Object.entries(cur.items)) items2[k] = { ...items2[k], ...v };
      pending.current = { fields: { ...snap.fields, ...cur.fields }, items: items2 };
      throw e;
    }
  }, [id]);
  const { state: saveState, error: saveError, touch, flush } = useAutosave(save, autosave);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current.fields).length || Object.keys(pending.current.items).length) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const setField = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    pending.current.fields[k] = v;
    touch();
  };
  const setItem = (code: string, patch: Partial<ItemState>) => {
    setItems((s) => ({ ...s, [code]: { ...s[code], ...patch } }));
    pending.current.items[code] = { ...pending.current.items[code], ...patch };
    touch();
  };

  const errFields = useMemo(() => (showErrors ? errors.map((e) => e.field) : []), [errors, showErrors]);
  const nokList = useMemo(() => ALL_ITEMS.filter((i) => items[i.code]?.response === 'NOK'), [items]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const markAllOk = () => {
    setItems((prev) => {
      const next = { ...prev };
      for (const item of ALL_ITEMS) {
        next[item.code] = { ...next[item.code], response: 'OK' };
        pending.current.items[item.code] = { ...pending.current.items[item.code], response: 'OK' };
      }
      return next;
    });
    setForm((prev) => (prev ? { ...prev, auditResult: 'APPROVED' } : prev));
    pending.current.fields.auditResult = 'APPROVED';
    touch();
    flash('ok', 'Todas as seções foram marcadas com OK (X) e a auditoria como APROVADO.');
  };

  async function saveNow(label = 'Alterações salvas.') {
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    ok ? flash('ok', label) : flash('err', 'Não foi possível salvar. Os dados continuam na tela e serão reenviados automaticamente.');
    return ok;
  }

  function requestFinalize() {
    if (!form) return;
    const errs = validateForFinalize(toLike(form), toMap(items));
    setErrors(errs); setShowErrors(true);
    if (errs.length) { setTab(tabOf(errs[0].field)); return flash('err', `Não é possível finalizar: ${errs.length} pendência(s). Veja a lista abaixo.`); }
    setConfirmFinalizeOpen(true);
  }

  async function executeFinalize() {
    setBusy(true);
    try {
      if (!(await flush())) throw new ApiError(0, 'Falha ao salvar antes de finalizar.');
      await api.post<Checklist>(`/checklists/${id}/finalize`);
      setConfirmFinalizeOpen(false);
      // Salvo e finalizado — redireciona automaticamente para o painel de novo checklist
      router.push('/checklists/new');
    } catch (e) {
      if (e instanceof ApiError && e.body?.errors) { setErrors(e.body.errors); setShowErrors(true); }
      flash('err', e instanceof ApiError ? e.message : 'Erro ao finalizar.');
    } finally { setBusy(false); }
  }

  function requestCancel() {
    setCancelReason('');
    setCancelError('');
    setCancelDialogOpen(true);
  }

  async function executeCancel() {
    if (!cancelReason.trim()) {
      setCancelError('O motivo do cancelamento é obrigatório.');
      return;
    }
    setBusy(true);
    try {
      const c = await api.post<Checklist>(`/checklists/${id}/cancel`, { reason: cancelReason.trim() });
      setStatus(c.status); updatedAt.current = c.updatedAt;
      setCancelDialogOpen(false);
      flash('ok', 'Checklist cancelado.');
    } catch (e) { flash('err', e instanceof ApiError ? e.message : 'Erro ao cancelar.'); }
    finally { setBusy(false); }
  }

  async function openPreview() {
    setBusy(true);
    try {
      if (!readOnly) await flush();
      const blob = await api.blob(`/checklists/${id}/pdf`);
      setPreview(URL.createObjectURL(blob));
    } catch (e) { flash('err', e instanceof ApiError ? e.message : 'Erro ao gerar a prévia.'); } finally { setBusy(false); }
  }
  async function downloadPdf() {
    setBusy(true);
    try {
      if (!readOnly) await flush();
      downloadBlob(await api.blob(`/checklists/${id}/pdf?download=1`), `checklist-${form?.chassis}-${form?.checklistDate}.pdf`);
    } catch (e) { flash('err', e instanceof ApiError ? e.message : 'Erro ao gerar o PDF.'); } finally { setBusy(false); }
  }
  const closePreview = () => { if (preview) URL.revokeObjectURL(preview); setPreview(null); };

  if (loadError) return <div className="p-6"><Alert type="err">{loadError}</Alert><Link href="/checklists" className="mt-3 inline-block text-sm underline">Voltar</Link></div>;
  if (!loaded || !form) return <Spinner />;

  const itemRows = (key: SectionKey) => {
    const sec = SECTIONS.find((s) => s.key === key)!;
    return (
      <div className="space-y-2">
        {sec.items.map((i) => (
          <ItemRow
            key={i.code} code={i.code} label={i.label} allowNA={sec.allowNA}
            response={items[i.code].response} observation={items[i.code].observation}
            onResponse={(v) => setItem(i.code, { response: v })} onObservation={(v) => setItem(i.code, { observation: v })}
            readOnly={readOnly} invalid={errFields.includes(i.code)}
            extra={i.valueField ? (
              <Field label={`${i.label} identificada`} required error={errFields.includes(i.valueField) ? 'Informe a versão' : undefined}>
                <input value={form[i.valueField]} disabled={readOnly} onChange={(e) => setField(i.valueField!, e.target.value)} />
              </Field>
            ) : undefined}
          />
        ))}
      </div>
    );
  };

  const ind = { idle: ['', 'text-slate-500'], saving: ['Salvando...', 'text-amber-700'], saved: ['Salvo', 'text-green-700'], error: ['Erro ao salvar', 'text-red-700'] }[saveState];
  const ngPresent = hasNonConformity(toLike(form), toMap(items));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-5 lg:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link href="/checklists" className="text-sm text-slate-500 hover:underline">← Checklists</Link>
        <h1 className="text-xl font-bold">Chassi {form.chassis}</h1>
        <Badge tone={status === 'FINALIZED' ? 'green' : status === 'CANCELED' ? 'red' : 'yellow'}>{statusLabel[status]}</Badge>
        {autosave && <span className={`ml-auto text-sm font-medium ${ind[1]}`} aria-live="polite">{ind[0]}</span>}
      </div>

      {msg && <div className="mb-3"><Alert type={msg.type}>{msg.text}</Alert></div>}
      {saveState === 'error' && saveError && (
        <div className="mb-3"><Alert type="err">
          {saveError} {saveError.includes('outra sessão') ? <button className="ml-2 underline" onClick={() => void load()}>Recarregar</button> : 'Seus dados continuam na tela; nova tentativa automática em instantes.'}
        </Alert></div>
      )}
      {status === 'FINALIZED' && user?.role === 'ADMIN' && <div className="mb-3"><Alert type="warn">Checklist finalizado: toda correção fica registrada no histórico (usuário, data e campos alterados). Use “Salvar alterações”.</Alert></div>}
      {status === 'FINALIZED' && user?.role === 'OPERATOR' && <div className="mb-3"><Alert type="warn">Checklist finalizado: somente leitura. Solicite a um administrador para corrigir.</Alert></div>}
      {status === 'CANCELED' && <div className="mb-3"><Alert type="err">Checklist cancelado.</Alert></div>}

      {/* Tabs — horizontally scrollable on tablet/mobile */}
      <div className="mb-3 -mx-4 md:mx-0" role="tablist">
        <div className="flex gap-1 overflow-x-auto px-4 md:px-0 pb-1 md:flex-wrap scrollbar-none">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-nissan text-white' : 'bg-white border border-slate-300 hover:bg-slate-50'
              } ${showErrors && errors.some((e) => tabOf(e.field) === t.key) ? 'ring-2 ring-amber-400' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div>
          {tab === 'INFO' && <Card><h2 className="mb-3 font-bold">Informação do Veículo</h2>
            <VehicleFields values={form} onChange={(k, v) => setField(k, v as never)} readOnly={readOnly} errorFields={errFields} /></Card>}
          {(tab === 'VISUAL' || tab === 'FUNCTIONAL' || tab === 'SOFTWARE' || tab === 'STICKER') && (
            <div><h2 className="mb-2 font-bold">{SECTIONS.find((s) => s.key === tab)!.title}</h2>{itemRows(tab)}</div>
          )}
          {tab === 'AUDIT' && (
            <div className="space-y-4">
              <div><h2 className="mb-2 font-bold">RESULTADO DA AUDITORIA</h2>{itemRows('AUDIT')}</div>
              <Card>
                <div className="text-sm font-medium">Resultado geral <span className="text-red-600">*</span></div>
                <div className={`mt-2 flex gap-3 ${errFields.includes('auditResult') ? 'rounded ring-2 ring-red-400 p-1' : ''}`} role="radiogroup" aria-label="Resultado geral">
                  {(['APPROVED', 'REPROVED'] as const).map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={form.auditResult === r} disabled={readOnly}
                      onClick={() => setField('auditResult', form.auditResult === r ? '' : r)}
                      className={`rounded border px-4 py-2 text-sm font-bold disabled:opacity-60 ${form.auditResult === r ? (r === 'APPROVED' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700') : 'bg-white border-slate-300'}`}>
                      {form.auditResult === r ? '☒' : '☐'} {r === 'APPROVED' ? 'APROVADO' : 'REPROVADO'}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Field label="Descrição da não conformidade:" required={form.auditResult === 'REPROVED'}
                    error={errFields.includes('nonConformityDescription') ? 'Obrigatória quando REPROVADO' : undefined}>
                    <textarea rows={7} value={form.nonConformityDescription} disabled={readOnly} onChange={(e) => setField('nonConformityDescription', e.target.value)} />
                  </Field>
                </div>
              </Card>
            </div>
          )}
          {tab === 'REPAIR' && (
            <Card className="space-y-4">
              <h2 className="font-bold">VALIDAÇÃO DE REPARO</h2>
              {ngPresent
                ? <Alert type="warn">Há item NG (NOK ou auditoria reprovada): informe se foi reparado ou marque que não se aplica.</Alert>
                : <p className="text-sm text-slate-500">Sem item NG até o momento. Preencha apenas se houver reparo a validar.</p>}
              <div>
                <div className="text-sm font-medium">ITEM NG FOI REPARADO?</div>
                <div className={`mt-2 flex flex-wrap gap-3 ${errFields.includes('repairStatus') ? 'rounded ring-2 ring-red-400 p-1' : ''}`} role="radiogroup">
                  {([['OK', 'OK'], ['NOK', 'NOK'], ['NOT_APPLICABLE', 'Não se aplica']] as const).map(([v, l]) => (
                    <button key={v} type="button" role="radio" aria-checked={form.repairStatus === v} disabled={readOnly}
                      onClick={() => setField('repairStatus', form.repairStatus === v ? '' : v)}
                      className={`rounded border px-4 py-2 text-sm font-bold disabled:opacity-60 ${form.repairStatus === v ? 'bg-slate-800 text-white' : 'bg-white border-slate-300'}`}>
                      {form.repairStatus === v ? '☒' : '☐'} {l}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Obs." required={!!form.repairStatus} error={errFields.includes('repairObservation') ? 'Preencha a observação' : undefined}>
                <textarea rows={4} value={form.repairObservation} disabled={readOnly} onChange={(e) => setField('repairObservation', e.target.value)} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Inspetor QA" required={form.repairStatus === 'OK' || form.repairStatus === 'NOK'} error={errFields.includes('repairInspectorQA') ? 'Obrigatório' : undefined}>
                  <div className="space-y-1.5">
                    <input value={form.repairInspectorQA} disabled={readOnly} onChange={(e) => setField('repairInspectorQA', e.target.value)} />
                    {!readOnly && (
                      <div className="flex flex-wrap gap-1 text-xs">
                        {(['José Augusto', 'Júlio Carvalho'] as const).map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setField('repairInspectorQA', name)}
                            className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200 transition"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Líder VPC" required={form.repairStatus === 'OK' || form.repairStatus === 'NOK'} error={errFields.includes('repairLeaderVPC') ? 'Obrigatório' : undefined}>
                  <div className="space-y-1.5">
                    <input value={form.repairLeaderVPC} disabled={readOnly} onChange={(e) => setField('repairLeaderVPC', e.target.value)} />
                    {!readOnly && (
                      <div className="flex flex-wrap gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setField('repairLeaderVPC', 'Janaína Mendes')}
                          className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200 transition"
                        >
                          Janaína Mendes (2º Turno)
                        </button>
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Data" required={form.repairStatus === 'OK' || form.repairStatus === 'NOK'} error={errFields.includes('repairDate') ? 'Obrigatória' : undefined}>
                  <input type="date" value={form.repairDate} disabled={readOnly} onChange={(e) => setField('repairDate', e.target.value)} /></Field>
                <Field label="Hora" required={form.repairStatus === 'OK' || form.repairStatus === 'NOK'} error={errFields.includes('repairTime') ? 'Obrigatória' : undefined}>
                  <input type="time" value={form.repairTime} disabled={readOnly} onChange={(e) => setField('repairTime', e.target.value)} /></Field>
              </div>
            </Card>
          )}

          <div className="mt-4 flex justify-between">
            <Btn onClick={() => setTab(TABS[Math.max(0, TABS.findIndex((t) => t.key === tab) - 1)].key)} disabled={tab === 'INFO'} className="!py-3 !px-5">← Anterior</Btn>
            <Btn onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex((t) => t.key === tab) + 1)].key)} disabled={tab === 'REPAIR'} className="!py-3 !px-5">Próxima →</Btn>
          </div>
        </div>

        <aside className="space-y-3 md:sticky md:top-4 md:self-start">
          <Card>
            <h3 className="mb-2 text-sm font-bold">Itens NOK ({nokList.length})</h3>
            {nokList.length === 0 ? <p className="text-xs text-slate-500">Nenhum item NOK.</p> : (
              <ul className="space-y-1 text-xs">
                {nokList.map((i) => (
                  <li key={i.code}><button className="text-left text-red-700 underline" onClick={() => { setTab(tabOf(i.code)); setTimeout(() => document.getElementById(`item-${i.code}`)?.scrollIntoView({ block: 'center' }), 50); }}>{i.label}</button></li>
                ))}
              </ul>
            )}
          </Card>
          {showErrors && errors.length > 0 && (
            <Card className="border-amber-300">
              <h3 className="mb-2 text-sm font-bold text-amber-800">Pendências ({errors.length})</h3>
              <ul className="max-h-64 space-y-1 overflow-auto text-xs">
                {errors.map((e, i) => <li key={i}><button className="text-left underline" onClick={() => setTab(tabOf(e.field))}>{e.message}</button></li>)}
              </ul>
            </Card>
          )}
          <Card className="space-y-2">
            {!readOnly && status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={markAllOk}
                className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 active:scale-98"
              >
                ✓ Marcar todas seções como OK (X)
              </button>
            )}
            {!readOnly && status === 'IN_PROGRESS' && <Btn className="w-full" disabled={busy} onClick={() => saveNow('Rascunho salvo.')}>Salvar rascunho</Btn>}
            {!readOnly && status === 'FINALIZED' && <Btn className="w-full" variant="primary" disabled={busy} onClick={() => saveNow('Alterações salvas e registradas no histórico.')}>Salvar alterações</Btn>}
            {!readOnly && status === 'IN_PROGRESS' && <Btn className="w-full" variant="primary" disabled={busy} onClick={requestFinalize}>Finalizar checklist</Btn>}
            <Btn className="w-full" disabled={busy} onClick={openPreview}>Visualizar impressão</Btn>
            <Btn className="w-full" disabled={busy} onClick={downloadPdf}>Gerar PDF</Btn>
            {user?.role === 'ADMIN' && status !== 'CANCELED' && <Btn className="w-full" variant="danger" disabled={busy} onClick={requestCancel}>Cancelar checklist</Btn>}
          </Card>
        </aside>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3" role="dialog" aria-label="Pré-visualização de impressão">
          <div className="mb-2 flex gap-2">
            <Btn variant="primary" onClick={() => (document.getElementById('pdf-frame') as HTMLIFrameElement | null)?.contentWindow?.print()}>Imprimir</Btn>
            <Btn onClick={downloadPdf}>Baixar PDF</Btn>
            <Btn className="ml-auto" onClick={closePreview}>Fechar</Btn>
          </div>
          <iframe id="pdf-frame" src={preview} className="w-full flex-1 rounded bg-white" title="Prévia do PDF" />
        </div>
      )}

      {/* Modal de Confirmação de Finalização */}
      <ConfirmDialog
        isOpen={confirmFinalizeOpen}
        title="Finalizar o checklist?"
        variant="primary"
        confirmText="Confirmar"
        cancelText="Cancelar"
        busy={busy}
        onCancel={() => !busy && setConfirmFinalizeOpen(false)}
        onConfirm={executeFinalize}
        message={
          <div className="space-y-3">
            <p className="text-slate-600 text-sm leading-relaxed">
              Depois disso, só um administrador poderá corrigi-lo (com registro de histórico).
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="inline-block h-2 w-2 rounded-full bg-nissan"></span>
                Trava de Auditoria
              </div>
              <p>
                Os dados preenchidos serão salvos e o status passará para <strong className="text-slate-800">Finalizado</strong>.
              </p>
            </div>
          </div>
        }
      />

      {/* Modal de Cancelamento de Checklist */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        title="Cancelar checklist?"
        variant="danger"
        confirmText="Confirmar Cancelamento"
        cancelText="Voltar"
        busy={busy}
        onCancel={() => !busy && setCancelDialogOpen(false)}
        onConfirm={executeCancel}
        message="Esta ação cancelará o checklist. Informe obrigatoriamente o motivo abaixo:"
      >
        <div className="text-left space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-700">
            Motivo do cancelamento <span className="text-red-600">*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError('');
            }}
            placeholder="Ex.: Chassi duplicado / Erro de lançamento..."
            className={`w-full rounded-xl border p-2.5 text-sm outline-none transition focus:ring-2 ${
              cancelError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-red-500 focus:ring-red-100'
            }`}
          />
          {cancelError && <p className="text-xs text-red-600 font-medium">{cancelError}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
}
