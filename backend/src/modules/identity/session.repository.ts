import type { Db } from '../../db/database';

export interface AuthSession {
  id: string;
  userId: string;
  createdAt: string;
  lastActivityAt: string;
  endedAt: string | null;
}

const map = (r: any): AuthSession => ({
  id: r.id,
  userId: r.user_id,
  createdAt: r.created_at,
  lastActivityAt: r.last_activity_at,
  endedAt: r.ended_at,
});

/** Reads and writes AuthSession. */
export class SessionRepository {
  constructor(private readonly db: Db) {}

  findById(id: string): AuthSession | undefined {
    const r = this.db.prepare('SELECT * FROM auth_sessions WHERE id = ?').get(id);
    return r ? map(r) : undefined;
  }

  insert(s: AuthSession): void {
    this.db
      .prepare('INSERT INTO auth_sessions (id, user_id, created_at, last_activity_at, ended_at) VALUES (?, ?, ?, ?, ?)')
      .run(s.id, s.userId, s.createdAt, s.lastActivityAt, s.endedAt);
  }

  touch(id: string, at: string): void {
    this.db.prepare('UPDATE auth_sessions SET last_activity_at = ? WHERE id = ?').run(at, id);
  }

  end(id: string, at: string): void {
    this.db.prepare('UPDATE auth_sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL').run(at, id);
  }
}
