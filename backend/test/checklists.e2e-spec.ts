// Testes de integração com PostgreSQL REAL de teste. Requer DATABASE_URL_TEST (banco separado; é LIMPO a cada teste).
// Prepare com:  DATABASE_URL=<url de teste> npx prisma migrate deploy
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { ALL_ITEMS } from '../src/shared/catalog';

const URL = process.env.DATABASE_URL_TEST;
const d = URL ? describe : describe.skip;

d('Checklists (integração)', () => {
  let app: INestApplication;
  let prisma: any;
  const tokens: Record<string, string> = {};
  const auth = (r: string) => ({ Authorization: `Bearer ${tokens[r]}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.DATABASE_URL = URL;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-16-chars';
    const { AppModule } = require('../src/app.module');
    const { PrismaService } = require('../src/prisma/prisma.service');
    const { AllExceptionsFilter } = require('../src/common/all-exceptions.filter');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => { await app?.close(); });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany(); await prisma.checklistItemResponse.deleteMany();
    await prisma.checklist.deleteMany(); await prisma.user.deleteMany();
    const hash = await bcrypt.hash('senha-teste-123', 4);
    for (const role of ['ADMIN', 'OPERATOR', 'VIEWER'])
      await prisma.user.create({ data: { name: role, username: role.toLowerCase(), passwordHash: hash, role } });
    for (const role of ['ADMIN', 'OPERATOR', 'VIEWER']) {
      const r = await http().post('/auth/login').send({ username: role.toLowerCase(), password: 'senha-teste-123' }).expect(200);
      tokens[role] = r.body.accessToken;
    }
  });

  const create = (body: any = {}, role = 'OPERATOR') =>
    http().post('/checklists').set(auth(role)).send({ chassis: ' 9bwzzz377vt004251\r\n', checklistDate: '2026-10-14', checklistTime: '08:00', shift: 'FIRST', ...body });
  const fillAll = (id: string, extra: any = {}) =>
    http().patch(`/checklists/${id}`).set(auth('OPERATOR')).send({
      vehicleVersion: 'XE', inspectorQA: 'Ana', leaderVPC: 'Bruno', bpc: '1', firmwareVersion: '1.0', canbusVersion: 'C1', auditResult: 'APPROVED',
      items: ALL_ITEMS.map((i) => ({ itemCode: i.code, response: 'OK' })), ...extra,
    });

  it('cria checklist, normaliza o chassi e salva rascunho incompleto', async () => {
    const r = await create().expect(201);
    expect(r.body.chassis).toBe('9BWZZZ377VT004251');
    expect(r.body.status).toBe('IN_PROGRESS');
    expect(r.body.responses).toHaveLength(ALL_ITEMS.length);
  });

  it('persiste respostas e observações e não perde dados em atualização parcial', async () => {
    const { body } = await create().expect(201);
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ items: [{ itemCode: 'VIS_01', response: 'OK' }] }).expect(200);
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ items: [{ itemCode: 'VIS_02', response: 'NOK', observation: 'Folga' }], bpc: '77' }).expect(200);
    const got = (await http().get(`/checklists/${body.id}`).set(auth('VIEWER')).expect(200)).body;
    const m = Object.fromEntries(got.responses.map((r: any) => [r.itemCode, r]));
    expect(m.VIS_01.response).toBe('OK');
    expect(m.VIS_02).toMatchObject({ response: 'NOK', observation: 'Folga' });
    expect(got.bpc).toBe('77');
    expect(got.chassis).toBe('9BWZZZ377VT004251');
  });

  it('rejeita NA fora da seção de adesivos', async () => {
    const { body } = await create().expect(201);
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ items: [{ itemCode: 'VIS_01', response: 'NA' }] }).expect(400);
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ items: [{ itemCode: 'ADE_01', response: 'NA' }] }).expect(200);
  });

  it('bloqueia finalização incompleta e lista os campos pendentes', async () => {
    const { body } = await create().expect(201);
    const r = await http().post(`/checklists/${body.id}/finalize`).set(auth('OPERATOR')).expect(422);
    expect(r.body.errors.length).toBeGreaterThan(10);
  });

  it('REPROVADO exige descrição; aprovado completo finaliza', async () => {
    const { body } = await create().expect(201);
    await fillAll(body.id, { auditResult: 'REPROVED' }).expect(200);
    const r = await http().post(`/checklists/${body.id}/finalize`).set(auth('OPERATOR')).expect(422);
    expect(r.body.errors.map((e: any) => e.field)).toContain('nonConformityDescription');
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ auditResult: 'APPROVED' }).expect(200);
    const ok = await http().post(`/checklists/${body.id}/finalize`).set(auth('OPERATOR')).expect(200);
    expect(ok.body.status).toBe('FINALIZED');
  });

  it('permissões: VIEWER não edita; OPERATOR não altera finalizado; ADMIN corrige com auditoria', async () => {
    const { body } = await create().expect(201);
    await http().patch(`/checklists/${body.id}`).set(auth('VIEWER')).send({ bpc: '9' }).expect(403);
    await http().post('/checklists').set(auth('VIEWER')).send({ chassis: 'ABC' }).expect(403);
    await fillAll(body.id).expect(200);
    await http().post(`/checklists/${body.id}/finalize`).set(auth('OPERATOR')).expect(200);
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ bpc: '9' }).expect(403);
    await http().patch(`/checklists/${body.id}`).set(auth('ADMIN')).send({ bpc: '9' }).expect(200);
    const hist = await http().get(`/checklists/${body.id}/history`).set(auth('ADMIN')).expect(200);
    expect(hist.body.some((h: any) => h.action === 'CORRECTION' && h.changes.bpc)).toBe(true);
    await http().get('/users').set(auth('OPERATOR')).expect(403);
  });

  it('avisa duplicidade (chassi + data) sem sobrescrever; permite confirmar', async () => {
    await create().expect(201);
    const dup = await create().expect(409);
    expect(dup.body.code).toBe('DUPLICATE');
    await create({ confirmDuplicate: true }).expect(201);
    expect(await prisma.checklist.count()).toBe(2);
  });

  it('impede sobrescrever dados mais novos com requisição antiga (409 STALE)', async () => {
    const { body } = await create().expect(201);
    const first = await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ bpc: '1', baseUpdatedAt: body.updatedAt }).expect(200);
    const stale = await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ bpc: '2', baseUpdatedAt: body.updatedAt }).expect(409);
    expect(stale.body.code).toBe('STALE');
    await http().patch(`/checklists/${body.id}`).set(auth('OPERATOR')).send({ bpc: '3', baseUpdatedAt: first.body.updatedAt }).expect(200);
  });

  it('consulta por data, turno e chassi; relatórios refletem o banco', async () => {
    await create({ chassis: 'AAA1' }).expect(201);
    await create({ chassis: 'BBB2', shift: 'SECOND' }).expect(201);
    await create({ chassis: 'CCC3', checklistDate: '2026-10-15' }).expect(201);
    const day = await http().get('/checklists?date=2026-10-14&shift=SECOND').set(auth('VIEWER')).expect(200);
    expect(day.body.data.map((c: any) => c.chassis)).toEqual(['BBB2']);
    const s = await http().get('/checklists/search/chassis/ccc3').set(auth('VIEWER')).expect(200);
    expect(s.body).toHaveLength(1);
    const sum = await http().get('/reports/summary?date=2026-10-14').set(auth('VIEWER')).expect(200);
    expect(sum.body).toMatchObject({ total: 2, inProgress: 2, approved: 0, reproved: 0 });
    const daily = await http().get('/reports/daily?date=2026-10-14&blankSeparator=true').set(auth('VIEWER')).expect(200);
    expect(daily.body.pages).toMatchObject({ vehicles: 2, contentPages: 6, blankPages: 1, totalPages: 7 });
  });
});
