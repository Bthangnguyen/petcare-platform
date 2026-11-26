import crypto from 'node:crypto';
import { z } from 'zod';
import { config } from '../../config';
import { AppError, conflict, unauthenticated } from '../../common/errors';
import type { Clock } from '../../common/time';
import type { Db } from '../../db/database';
import { LoginAttemptPolicy } from './loginAttemptPolicy';
import { PasswordHasher } from './passwordHasher';
import { SessionRepository } from './session.repository';
import { User, UserRepository, UserRole } from './user.repository';

export const registrationSchema = z
  .object({
    accountType: z.enum(['PET_OWNER', 'FACILITY_OWNER'], { errorMap: () => ({ message: 'Hãy chọn loại tài khoản.' }) }),
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100),
    email: z.string().trim().min(1, 'Vui lòng nhập e-mail.').email('E-mail không đúng định dạng.').max(120),
    phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại.').regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ.'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu.').min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(100),
    passwordConfirmation: z.string().min(1, 'Vui lòng nhập lại mật khẩu.'),
  })
  .refine((v) => v.password === v.passwordConfirmation, { path: ['passwordConfirmation'], message: 'Mật khẩu nhập lại không khớp.' });

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập e-mail.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}
export const toPublicUser = (u: User): PublicUser => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

/** Business rules of registration, authentication and sessions (UC01, UC02). */
export class IdentityAccessService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly policy: LoginAttemptPolicy,
    private readonly clock: Clock,
  ) {}

  registerAccount(input: RegistrationInput): PublicUser {
    if (this.users.existsByEmail(input.email)) {
      throw conflict('EMAIL_TAKEN', 'E-mail này đã được đăng ký. Hãy đăng nhập.');
    }
    const user: User = {
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: this.hasher.hash(input.password),
      role: input.accountType as UserRole,
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: this.clock.now().toISOString(),
    };
    this.users.insert(user);
    return toPublicUser(user);
  }

  /** StaffAccountPort.createStaffAccount (UC14): the facility owner creates the account of a staff member (role STAFF). */
  createStaffAccount(input: { fullName: string; email: string; phone: string; password: string }): PublicUser {
    if (this.users.existsByEmail(input.email)) {
      throw conflict('EMAIL_TAKEN', 'E-mail này đã được đăng ký.');
    }
    const user: User = {
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: this.hasher.hash(input.password),
      role: 'STAFF',
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: this.clock.now().toISOString(),
    };
    this.users.insert(user);
    return toPublicUser(user);
  }

  authenticate(email: string, password: string): { sessionId: string; user: PublicUser } {
    const now = this.clock.now();
    const user = this.users.findByEmail(email.trim());
    const generic = new AppError(401, 'INVALID_CREDENTIALS', 'E-mail hoặc mật khẩu không đúng.');
    if (!user) {
      // Same work as for an existing account, so that the answer does not reveal which part is wrong.
      this.hasher.verify(password, this.hasher.hash('dummy-password'));
      throw generic;
    }
    if (this.policy.isLocked(user, now)) {
      throw new AppError(423, 'ACCOUNT_LOCKED', `Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${config.lockMinutes} phút.`);
    }
    if (!this.hasher.verify(password, user.passwordHash)) {
      const state = this.policy.recordFailure(user, now);
      this.users.saveLoginState(user.id, state.failedLoginCount, state.lockedUntil);
      if (state.lockedUntil) {
        throw new AppError(423, 'ACCOUNT_LOCKED', `Bạn đã nhập sai ${config.maxFailedLogins} lần. Tài khoản bị khóa ${config.lockMinutes} phút.`);
      }
      throw generic;
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
    }
    this.users.saveLoginState(user.id, 0, null);
    const sessionId = crypto.randomBytes(32).toString('hex');
    this.sessions.insert({ id: sessionId, userId: user.id, createdAt: now.toISOString(), lastActivityAt: now.toISOString(), endedAt: null });
    return { sessionId, user: toPublicUser(user) };
  }

  /** Validates the session and records activity by default. Background requests can opt out (UC02, A4). */
  validateSession(sessionId: string | undefined, { recordActivity = true } = {}): PublicUser {
    if (!sessionId) throw unauthenticated();
    const now = this.clock.now();
    const session = this.sessions.findById(sessionId);
    if (!session || session.endedAt) throw unauthenticated();
    const idleMs = now.getTime() - new Date(session.lastActivityAt).getTime();
    if (idleMs > config.sessionIdleSeconds * 1000) {
      this.sessions.end(session.id, now.toISOString());
      throw new AppError(401, 'SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const user = this.users.findById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      this.sessions.end(session.id, now.toISOString());
      throw unauthenticated();
    }
    if (recordActivity) this.sessions.touch(session.id, now.toISOString());
    return toPublicUser(user);
  }

  passwordResetAccount(email: string, now: Date): { id: string; email: string } | undefined {
    const user = this.users.findByEmail(email);
    if (user?.status === 'ACTIVE' && !this.policy.isLocked(user, now)) {
      return { id: user.id, email: user.email };
    }
  }

  canResetPassword(userId: string, now: Date): boolean {
    const user = this.users.findById(userId);
    return !!user && user.status === 'ACTIVE' && !this.policy.isLocked(user, now);
  }

  /** Uses the reset transaction's connection so credentials, sessions and token use commit together. */
  applyPasswordReset(db: Db, userId: string, password: string, now: Date): void {
    db.prepare('UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?')
      .run(this.hasher.hash(password), userId);
    db.prepare('UPDATE auth_sessions SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL')
      .run(now.toISOString(), userId);
  }

  logout(sessionId: string | undefined): void {
    if (sessionId) this.sessions.end(sessionId, this.clock.now().toISOString());
  }
}
