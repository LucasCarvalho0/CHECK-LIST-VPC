// Integração com PostgreSQL REAL de teste (DATABASE_URL_TEST, nome terminando em _test). O banco é LIMPO a cada teste.
// Prepare com:  $env:DATABASE_URL = "<url de teste>"; npx prisma migrate deploy
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { ALL_ITEMS } from '@/lib/shared/catalog';

const URL_TEST = process.env.DATABASE_URL_TEST;
if (URL_TEST && !/_test(\?|$)/.test(URL_TEST)) throw new Error('DATABASE_URL_TEST deve apontar para um banco cujo nome termina em _test (proteção contra apagar dados reais).');
const d = URL_TEST ? describe : describe.skip;

d('API de checklists (integração)', () => {
  let prisma: any;
  const routes: Record<string, any> = {};
  const tokens: Record<string, string> = {};

  async function call(mod: string, method: string, url: string, opts: { role?: string; body?: unknown; params?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.role) headers.Authorization = `Bearer ${tokens[opts.role]}`;
    const req = new Request(`http://localhost${url}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    const res: Response = await routes[mod][method](req, { params: opts.params ?? {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST; // ANTES de carregar o Prisma
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-16-chars';
    prisma = (await import('@/lib/server/prisma')).prisma;
    routes.login = await import('@/app/api/auth/login/route');
    routes.users = await import('@/app/api/users/route');
    routes.list = await import('@/app/api/checklists/route');
    routes.one = await import('@/app/api/checklists/[id]/route');
    routes.finalize = await import('@/app/api/checklists/[id]/finalize/route');
    routes.history = await import('@/app/api/checklists/[id]/history/route');
    routes.search = await import('@/app/api/checklists/search/chassis/[chassis]/route');
    routes.summary = await import('@/app/api/reports/summary/route');
    routes.daily = await import('@/app/api/reports/daily/route');
  });
  afterAll(async () => { await prisma?.$disconnect(); });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany(); await prisma.checklistItemResponse.deleteMany();
    await prisma.checklist.deleteMany(); await prisma.user.deleteMany();
    const hash = await bcrypt.hash('senha-teste-123', 4);
    for (const role of ['ADMIN', 'OPERATOR', 'VIEWER']) {
      await prisma.user.create({ data: { name: role, username: role.toLowerCase(), passwordHash: hash, role } });
      const r = await call('login', 'POST', '/api/auth/login', { body: { username: role.toLowerCase(), password: 'senha-teste-123' } });
      expect(r.status).toBe(200);
      tokens[role] = r.body.accessToken;
    }
  });

  const create = (body: any = {}, role = 'OPERATOR') =>
    call('list', 'POST', '/api/checklists', { role, body: { chassis: ' 9bwzzz377vt004251\r\n', checklistDate: '2026-10-14', checklistTime: '08:00', shift: 'FIRST', ...body } });
  const patch = (id: string, body: any, role = 'OPERATOR') => call('one', 'PATCH', `/api/checklists/${id}`, { role, body, params: { id } });
  const fillAll = (id: string, extra: any = {}) =>
    patch(id, {
      vehicleVersion: 'XE', inspectorQA: 'Ana', leaderVPC: 'Bruno', bpc: '1', firmwareVersion: '1.0', canbusVersion: 'C1', auditResult: 'APPROVED',
      items: ALL_ITEMS.map((i) => ({ itemCode: i.code, response: 'OK' })), ...extra,
    });
  const finalize = (id: string, role = 'OPERATOR') => call('finalize', 'POST', `/api/checklists/${id}/finalize`, { role, params: { id } });

  it('exige autenticação e rejeita credenciais inválidas', async () => {
    expect((await call('list', 'GET', '/api/checklists')).status).toBe(401);
    expect((await call('login', 'POST', '/api/auth/login', { body: { username: 'admin', password: 'errada' } })).status).toBe(401);
  });

  it('cria checklist, normaliza o chassi e salva rascunho incompleto', async () => {
    const r = await create();
    expect(r.status).toBe(201);
    expect(r.body.chassis).toBe('9BWZZZ377VT004251');
    expect(r.body.status).toBe('IN_PROGRESS');
    expect(r.body.responses).toHaveLength(ALL_ITEMS.length);
  });

  it('persiste respostas/observações e não perde dados em atualização parcial', async () => {
    const { body } = await create();
    await patch(body.id, { items: [{ itemCode: 'VIS_01', response: 'OK' }] });
    expect((await patch(body.id, { items: [{ itemCode: 'VIS_02', response: 'NOK', observation: 'Folga' }], bpc: '77' })).status).toBe(200);
    const got = (await call('one', 'GET', `/api/checklists/${body.id}`, { role: 'VIEWER', params: { id: body.id } })).body;
    const m = Object.fromEntries(got.responses.map((r: any) => [r.itemCode, r]));
    expect(m.VIS_01.response).toBe('OK');
    expect(m.VIS_02).toMatchObject({ response: 'NOK', observation: 'Folga' });
    expect(got.bpc).toBe('77');
    expect(got.chassis).toBe('9BWZZZ377VT004251');
  });

  it('rejeita NA fora da seção de adesivos', async () => {
    const { body } = await create();
    expect((await patch(body.id, { items: [{ itemCode: 'VIS_01', response: 'NA' }] })).status).toBe(400);
    expect((await patch(body.id, { items: [{ itemCode: 'ADE_01', response: 'NA' }] })).status).toBe(200);
  });

  it('bloqueia finalização incompleta e lista os campos pendentes', async () => {
    const { body } = await create();
    const r = await finalize(body.id);
    expect(r.status).toBe(422);
    expect(r.body.errors.length).toBeGreaterThan(10);
  });

  it('REPROVADO exige descrição; completo e aprovado finaliza', async () => {
    const { body } = await create();
    await fillAll(body.id, { auditResult: 'REPROVED' });
    const r = await finalize(body.id);
    expect(r.status).toBe(422);
    expect(r.body.errors.map((e: any) => e.field)).toContain('nonConformityDescription');
    await patch(body.id, { auditResult: 'APPROVED' });
    const ok = await finalize(body.id);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('FINALIZED');
  });

  it('permissões: VIEWER não edita; OPERATOR não altera finalizado; ADMIN corrige com auditoria', async () => {
    const { body } = await create();
    expect((await patch(body.id, { bpc: '9' }, 'VIEWER')).status).toBe(403);
    expect((await create({ chassis: 'ABC' }, 'VIEWER')).status).toBe(403);
    await fillAll(body.id);
    expect((await finalize(body.id)).status).toBe(200);
    expect((await patch(body.id, { bpc: '9' }, 'OPERATOR')).status).toBe(403);
    expect((await patch(body.id, { bpc: '9' }, 'ADMIN')).status).toBe(200);
    const hist = await call('history', 'GET', `/api/checklists/${body.id}/history`, { role: 'ADMIN', params: { id: body.id } });
    expect(hist.body.some((h: any) => h.action === 'CORRECTION' && h.changes.bpc)).toBe(true);
    expect((await call('users', 'GET', '/api/users', { role: 'OPERATOR' })).status).toBe(403);
  });

  it('avisa duplicidade (chassi + data) sem sobrescrever; permite confirmar', async () => {
    await create();
    const dup = await create();
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE');
    expect((await create({ confirmDuplicate: true })).status).toBe(201);
    expect(await prisma.checklist.count()).toBe(2);
  });

  it('impede sobrescrever dados mais novos com requisição antiga (409 STALE)', async () => {
    const { body } = await create();
    const first = await patch(body.id, { bpc: '1', baseUpdatedAt: body.updatedAt });
    expect(first.status).toBe(200);
    const stale = await patch(body.id, { bpc: '2', baseUpdatedAt: body.updatedAt });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('STALE');
    expect((await patch(body.id, { bpc: '3', baseUpdatedAt: first.body.updatedAt })).status).toBe(200);
  });

  it('consulta por data, turno e chassi; relatórios refletem o banco', async () => {
    await create({ chassis: 'AAA1' });
    await create({ chassis: 'BBB2', shift: 'SECOND' });
    await create({ chassis: 'CCC3', checklistDate: '2026-10-15' });
    const day = await call('list', 'GET', '/api/checklists?date=2026-10-14&shift=SECOND', { role: 'VIEWER' });
    expect(day.body.data.map((c: any) => c.chassis)).toEqual(['BBB2']);
    const s = await call('search', 'GET', '/api/checklists/search/chassis/ccc3', { role: 'VIEWER', params: { chassis: 'ccc3' } });
    expect(s.body).toHaveLength(1);
    const sum = await call('summary', 'GET', '/api/reports/summary?date=2026-10-14', { role: 'VIEWER' });
    expect(sum.body).toMatchObject({ total: 2, inProgress: 2, approved: 0, reproved: 0 });
    const daily = await call('daily', 'GET', '/api/reports/daily?date=2026-10-14&blankSeparator=true', { role: 'VIEWER' });
    expect(daily.body.pages).toMatchObject({ vehicles: 2, contentPages: 6, blankPages: 1, totalPages: 7 });
  });
});
