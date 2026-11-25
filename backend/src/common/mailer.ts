import crypto from 'node:crypto';
import type { Db } from '../db/database';
import type { Clock } from './time';

/** Port for sending e-mail. The course build does not use a real e-mail provider: mails are kept in the table mail_outbox. */
export interface Mailer {
  send(to: string, subject: string, body: string): void;
}

export interface OutboxMail {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}

/** Development mailer: writes the mail into mail_outbox (read it at GET /api/dev/outbox, which is closed in production). */
export class OutboxMailer implements Mailer {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  send(to: string, subject: string, body: string): void {
    this.db
      .prepare('INSERT INTO mail_outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), to, subject, body, this.clock.now().toISOString());
  }

  list(limit = 50): OutboxMail[] {
    const rows = this.db
      .prepare('SELECT id, to_email, subject, body, created_at FROM mail_outbox ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(limit) as { id: string; to_email: string; subject: string; body: string; created_at: string }[];
    return rows.map((r) => ({ id: r.id, to: r.to_email, subject: r.subject, body: r.body, createdAt: r.created_at }));
  }
}
