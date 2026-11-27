import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { handler, send, validate } from '../../common/api';
import type { AppDeps } from '../../common/deps';
import { AppError } from '../../common/errors';
import { config } from '../../config';
import type { Db } from '../../db/database';

const tokenLifetimeMs = 15 * 60 * 1000;
const requestMessage = 'Nếu e-mail khớp với một tài khoản, liên kết đặt lại mật khẩu đã được gửi.';
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const invalidLink = () => new AppError(400, 'RESET_TOKEN_INVALID', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.');
const isToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

const requestSchema = z.object({ email: z.string().trim().email('E-mail không đúng định dạng.').max(120, 'E-mail quá dài.') });
const confirmSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(100, 'Mật khẩu không được dài quá 100 ký tự.'),
  passwordConfirmation: z.string().max(100, 'Mật khẩu không được dài quá 100 ký tự.'),
}).refine((input) => input.password === input.passwordConfirmation, {
  path: ['passwordConfirmation'], message: 'Mật khẩu nhập lại không khớp.',
});

class PasswordResetRepository {
  constructor(private readonly db: Db) {}

  insert(userId: string, hash: string, now: Date): void {
    this.db.prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), userId, hash, new Date(now.getTime() + tokenLifetimeMs).toISOString(), now.toISOString());
  }

  findValid(hash: string, now: Date): { user_id: string } | undefined {
    return this.db.prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
      .get(hash, now.toISOString()) as { user_id: string } | undefined;
  }

  consumeForUser(userId: string, now: Date): void {
    this.db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL')
      .run(now.toISOString(), userId);
  }
}

function resetOrigin(): string {
  // The URL comes from local configuration, never from an incoming Host header.
  const origin = new URL(process.env.PASSWORD_RESET_ORIGIN ?? `http://localhost:${config.port}`);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password
      || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('PASSWORD_RESET_ORIGIN must be an HTTP(S) origin.');
  }
  return origin.origin;
}

class PasswordResetService {
  private readonly tokens: PasswordResetRepository;

  constructor(private readonly deps: AppDeps, private readonly origin: string) {
    this.tokens = new PasswordResetRepository(deps.db);
  }

  request(email: string): void {
    // The course build has a development mailer only.
    if (!config.exposeDevOutbox) return;
    this.deps.db.transaction(() => {
      const now = this.deps.clock.now();
      const user = this.deps.identity.passwordResetAccount(email, now);
      if (!user) return;

      const token = randomBytes(32).toString('hex');
      const link = new URL('/reset-password', this.origin);
      link.searchParams.set('token', token);
      this.tokens.insert(user.id, tokenHash(token), now);
      this.deps.mailer.send(user.email, 'Đặt lại mật khẩu Pet Care Platform',
        `Mở liên kết này để đặt lại mật khẩu trong 15 phút: ${link.href}`);
    }).immediate();
  }

  private eligibleUser(token: unknown, now: Date): string {
    if (!isToken(token)) throw invalidLink();
    const row = this.tokens.findValid(tokenHash(token), now);
    if (!row || !this.deps.identity.canResetPassword(row.user_id, now)) throw invalidLink();
    return row.user_id;
  }

  validate(token: unknown): void {
    this.eligibleUser(token, this.deps.clock.now());
  }

  confirm(token: string, password: string): void {
    this.deps.db.transaction(() => {
      const now = this.deps.clock.now();
      const userId = this.eligibleUser(token, now);
      this.deps.identity.applyPasswordReset(this.deps.db, userId, password, now);
      this.tokens.consumeForUser(userId, now);
    }).immediate();
  }
}

/** UC24 — owner: Quỳnh. Public routes mounted at /api/auth/password-reset. */
export function passwordResetRouter(deps: AppDeps): Router {
  const r = Router();
  const service = new PasswordResetService(deps, resetOrigin());
  r.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  r.post('/request', handler((req, res) => {
    const { email } = validate(requestSchema, req.body);
    service.request(email);
    send(req, res, { message: requestMessage });
  }));
  r.get('/validate', handler((req, res) => {
    service.validate(req.query.token);
    send(req, res, { valid: true });
  }));
  r.post('/confirm', handler((req, res) => {
    if (!isToken(req.body?.token)) throw invalidLink();
    const { token, password } = validate(confirmSchema, req.body);
    service.confirm(token, password);
    send(req, res, { message: 'Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.' });
  }));
  return r;
}
