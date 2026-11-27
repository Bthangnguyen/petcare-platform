import type { Db } from '../../db/database';

export type UserRole = 'PET_OWNER' | 'STAFF' | 'FACILITY_OWNER' | 'SYSTEM_ADMINISTRATOR';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
}

const map = (r: any): User => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone,
  passwordHash: r.password_hash,
  role: r.role,
  status: r.status,
  failedLoginCount: r.failed_login_count,
  lockedUntil: r.locked_until,
  createdAt: r.created_at,
});

/** Reads and writes User. */
export class UserRepository {
  constructor(private readonly db: Db) {}

  findById(id: string): User | undefined {
    const r = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return r ? map(r) : undefined;
  }

  findByEmail(email: string): User | undefined {
    const r = this.db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
    return r ? map(r) : undefined;
  }

  existsByEmail(email: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(email);
  }

  insert(u: User): void {
    this.db
      .prepare(
        `INSERT INTO users (id, full_name, email, phone, password_hash, role, status, failed_login_count, locked_until, created_at)
         VALUES (@id, @fullName, @email, @phone, @passwordHash, @role, @status, @failedLoginCount, @lockedUntil, @createdAt)`,
      )
      .run(u);
  }

  findActiveIdsByRole(role: UserRole): string[] {
    const rows = this.db.prepare("SELECT id FROM users WHERE role = ? AND status = 'ACTIVE' ORDER BY created_at, id").all(role) as { id: string }[];
    return rows.map((r) => r.id);
  }

  saveLoginState(id: string, failedLoginCount: number, lockedUntil: string | null): void {
    this.db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?').run(failedLoginCount, lockedUntil, id);
  }
}
