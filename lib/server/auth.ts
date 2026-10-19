import { SignJWT, jwtVerify } from 'jose';
import * as bcrypt from 'bcryptjs';
import { HttpError } from './http';
import { prisma } from './prisma';

import type { Shift } from '@prisma/client';

export type RoleName = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export interface AuthUser { id: string; name: string; username: string; role: RoleName; shift?: Shift | null }

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('Defina JWT_SECRET (mínimo 16 caracteres) no arquivo .env');
  return new TextEncoder().encode(s);
};

export const signToken = (userId: string) =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '12h').sign(secret());

/**
 * Autentica a requisição (Bearer) e confere perfil. Sempre consulta o banco:
 * usuário desativado perde o acesso imediatamente. Use em TODA rota protegida (permissão vale no backend,
 * mesmo que a interface esconda botões).
 */
export async function authenticate(req: Request, roles?: RoleName[]): Promise<AuthUser> {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new HttpError(401, 'Autenticação necessária.');
  let sub: string | undefined;
  try { sub = (await jwtVerify(token, secret())).payload.sub; } catch { throw new HttpError(401, 'Sessão inválida ou expirada.'); }
  const u = sub ? await prisma.user.findUnique({ where: { id: sub } }) : null;
  if (!u || !u.active) throw new HttpError(401, 'Usuário inativo ou inexistente.');
  const user: AuthUser = { id: u.id, name: u.name, username: u.username, role: u.role, shift: u.shift };
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'Você não tem permissão para esta ação.');
  return user;
}

// Limite simples de tentativas de login (em memória, por processo): 10 por minuto por IP+usuário.
const attempts = new Map<string, { n: number; reset: number }>();
function throttle(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) { attempts.set(key, { n: 1, reset: now + 60_000 }); return; }
  if (++a.n > 10) throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto.');
}

export async function login(req: Request, username: string, password: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const uname = username.trim().toLowerCase();
  throttle(`${ip}:${uname}`);
  const user = await prisma.user.findUnique({ where: { username: uname } });
  // Mesma resposta para usuário inexistente, senha errada ou inativo (evita enumeração).
  const ok = !!user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) throw new HttpError(401, 'Usuário ou senha inválidos.');
  return {
    accessToken: await signToken(user.id),
    user: { id: user.id, name: user.name, username: user.username, role: user.role, shift: user.shift },
  };
}
