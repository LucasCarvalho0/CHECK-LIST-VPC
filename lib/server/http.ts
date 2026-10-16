import { ZodError, ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** Tratamento centralizado de erros: formato único `{statusCode, message, ...}` e sem vazar detalhes internos. */
export function handle<C = any>(fn: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const r = await fn(req, ctx);
      return r instanceof Response ? r : Response.json(r ?? null);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ statusCode: e.status, message: e.message, ...e.extra }, { status: e.status });
      if (e instanceof ZodError) {
        const errors = e.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        return Response.json({ statusCode: 400, message: errors.map((x) => x.message).join('; '), errors }, { status: 400 });
      }
      console.error('Erro inesperado:', (e as Error)?.message); // sem dados do checklist nos logs
      return Response.json({ statusCode: 500, message: 'Erro interno do servidor.' }, { status: 500 });
    }
  };
}

export async function readBody<T>(req: Request, schema: ZodType<T, any, any>): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new HttpError(400, 'Corpo da requisição inválido (JSON esperado).'); }
  return schema.parse(raw);
}

export function readQuery<T>(req: Request, schema: ZodType<T, any, any>): T {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

export const uuid = (v: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new HttpError(400, 'Identificador inválido.');
  return v;
};
