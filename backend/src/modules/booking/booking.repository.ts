import type { Db } from '../../db/database';

export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export const ACTIVE_STATUSES: BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];

export interface Booking {
  id: string;
  ownerId: string;
  petId: string;
  facilityId: string;
  serviceId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  price: number;
  createdAt: string;
  cancellationReason: string | null;
}

const map = (r: any): Booking => ({
  id: r.id,
  ownerId: r.owner_id,
  petId: r.pet_id,
  facilityId: r.facility_id,
  serviceId: r.service_id,
  staffId: r.staff_id,
  startAt: r.start_at,
  endAt: r.end_at,
  status: r.status,
  price: r.price,
  createdAt: r.created_at,
  cancellationReason: r.cancellation_reason,
});

/** Persists Booking. */
export class BookingRepository {
  constructor(private readonly db: Db) {}

  /** Runs the work in one database transaction; the database is locked for writers until it ends (NFR-11). */
  inTransaction<T>(work: () => T): T {
    return this.db.transaction(work).immediate();
  }

  findById(id: string): Booking | undefined {
    const r = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return r ? map(r) : undefined;
  }

  findByOwner(ownerId: string): Booking[] {
    return this.db.prepare('SELECT * FROM bookings WHERE owner_id = ? ORDER BY start_at DESC').all(ownerId).map(map);
  }

  findByFacilities(facilityIds: string[], filter: { date?: string; status?: string; fromIso?: string; toIso?: string }): Booking[] {
    if (!facilityIds.length) return [];
    const marks = facilityIds.map(() => '?').join(',');
    let sql = `SELECT * FROM bookings WHERE facility_id IN (${marks})`;
    const args: unknown[] = [...facilityIds];
    if (filter.status) {
      sql += ' AND status = ?';
      args.push(filter.status);
    }
    if (filter.fromIso && filter.toIso) {
      sql += ' AND start_at >= ? AND start_at < ?';
      args.push(filter.fromIso, filter.toIso);
    }
    sql += ' ORDER BY start_at';
    return this.db.prepare(sql).all(...args).map(map);
  }

  /** Active bookings of a staff member that overlap the interval [startIso, endIso). */
  findOverlapping(staffId: string, startIso: string, endIso: string): Booking[] {
    return this.db
      .prepare(
        `SELECT * FROM bookings WHERE staff_id = ? AND status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')
         AND start_at < ? AND end_at > ?`,
      )
      .all(staffId, endIso, startIso)
      .map(map);
  }

  /** Active bookings of the staff members of a service between two instants (used to compute free slots). */
  findActiveByStaffBetween(staffIds: string[], fromIso: string, toIso: string): Booking[] {
    if (!staffIds.length) return [];
    const marks = staffIds.map(() => '?').join(',');
    return this.db
      .prepare(
        `SELECT * FROM bookings WHERE staff_id IN (${marks}) AND status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')
         AND start_at < ? AND end_at > ?`,
      )
      .all(...staffIds, toIso, fromIso)
      .map(map);
  }

  insert(b: Booking): void {
    this.db
      .prepare(
        `INSERT INTO bookings (id, owner_id, pet_id, facility_id, service_id, staff_id, start_at, end_at, status, price, created_at, cancellation_reason)
         VALUES (@id, @ownerId, @petId, @facilityId, @serviceId, @staffId, @startAt, @endAt, @status, @price, @createdAt, @cancellationReason)`,
      )
      .run(b);
  }

  updateStatus(id: string, status: BookingStatus, reason: string | null): void {
    this.db.prepare('UPDATE bookings SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason) WHERE id = ?').run(status, reason, id);
  }
}
