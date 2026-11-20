import crypto from 'node:crypto';
import type { Db } from '../../db/database';
import { notFound } from '../../common/errors';
import type { Clock } from '../../common/time';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}
const map = (r: any): Notification => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  title: r.title,
  message: r.message,
  referenceType: r.reference_type,
  referenceId: r.reference_id,
  isRead: !!r.is_read,
  createdAt: r.created_at,
});

/** Persists Notification. */
export class NotificationRepository {
  constructor(private readonly db: Db) {}
  insert(n: Notification): void {
    this.db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(n.id, n.userId, n.type, n.title, n.message, n.referenceType, n.referenceId, n.isRead ? 1 : 0, n.createdAt);
  }
  findByUser(userId: string): Notification[] {
    return this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 100').all(userId).map(map);
  }
  countUnread(userId: string): number {
    return (this.db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as { c: number }).c;
  }
  markRead(userId: string, id: string): number {
    return this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId).changes;
  }
  markAllRead(userId: string): void {
    this.db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  }
}

export interface BookingNotice {
  recipientId: string;
  title: string;
  message: string;
  bookingId: string;
}

/** In-app notifications (UC25 in its first form). Realizes NotificationPort.notifyBookingEvent for the booking use cases. */
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly clock: Clock,
  ) {}

  notifyBookingEvent(n: BookingNotice): void {
    this.repo.insert({
      id: crypto.randomUUID(),
      userId: n.recipientId,
      type: 'BOOKING_UPDATE',
      title: n.title,
      message: n.message,
      referenceType: 'BOOKING',
      referenceId: n.bookingId,
      isRead: false,
      createdAt: this.clock.now().toISOString(),
    });
  }

  getUserNotifications(userId: string) {
    return { items: this.repo.findByUser(userId), unread: this.repo.countUnread(userId) };
  }
  countUnread(userId: string) {
    return this.repo.countUnread(userId);
  }
  markAsRead(userId: string, id: string): void {
    if (!this.repo.markRead(userId, id)) throw notFound('Không tìm thấy thông báo.');
  }
  markAllAsRead(userId: string): void {
    this.repo.markAllRead(userId);
  }
}
