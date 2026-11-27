import { randomUUID } from 'node:crypto';
import type { Db } from '../../db/database';
import type { FacilityStatus } from '../facility/facility.repository';

export type ReviewStatus = Exclude<FacilityStatus, 'DRAFT'>;
export type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION';
export interface AdminFacility {
  id: string; ownerId: string; name: string; address: string; area: string; phone: string;
  description: string; openingHours: string; status: ReviewStatus; supportingDocumentRef: string | null;
  submittedAt: string | null; decisionNote: string | null; decidedBy: string | null; decidedAt: string | null;
}
export interface DuplicateFacility {
  id: string; name: string; address: string; status: ReviewStatus;
}
interface ApplicationRow {
  id: string; owner_id: string; name: string; address: string; area: string; phone: string;
  description: string; opening_hours: string; status: ReviewStatus; supporting_document_ref: string | null;
  submitted_at: string | null; decision_note: string | null; decided_by: string | null; decided_at: string | null;
}
const selectApplication = `SELECT f.id, f.owner_id, f.name, f.address, f.area, f.phone, f.description, f.opening_hours, f.status,
  a.supporting_document_ref, a.submitted_at, a.decision_note, a.decided_by, a.decided_at
  FROM facilities f LEFT JOIN facility_applications a ON a.facility_id=f.id`;
const map = (r: ApplicationRow): AdminFacility => ({
  id: r.id, ownerId: r.owner_id, name: r.name, address: r.address, area: r.area, phone: r.phone,
  description: r.description, openingHours: r.opening_hours, status: r.status, supportingDocumentRef: r.supporting_document_ref,
  submittedAt: r.submitted_at, decisionNote: r.decision_note, decidedBy: r.decided_by, decidedAt: r.decided_at,
});

/** Compare Unicode-normalized addresses, ignoring letter case and repeated whitespace; this is a warning, not a rejection. */
const normalizeAddress = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

/** UC21 owns decisions and their audit trail; the facilities/application tables are the shared data specified in Issue #8. */
export class AdminFacilityRepository {
  constructor(private readonly db: Db) {}

  list(status: ReviewStatus | 'ALL'): AdminFacility[] {
    const sql = `${selectApplication} WHERE f.status <> 'DRAFT' ${status === 'ALL' ? '' : 'AND f.status=?'}
      ORDER BY COALESCE(a.submitted_at, '') DESC, f.name COLLATE NOCASE, f.id`;
    const rows = (status === 'ALL' ? this.db.prepare(sql).all() : this.db.prepare(sql).all(status)) as ApplicationRow[];
    return rows.map(map);
  }

  find(id: string): AdminFacility | undefined {
    const row = this.db.prepare(`${selectApplication} WHERE f.id=? AND f.status <> 'DRAFT'`).get(id) as ApplicationRow | undefined;
    return row ? map(row) : undefined;
  }

  duplicatesOf(id: string, address: string): DuplicateFacility[] {
    const normalized = normalizeAddress(address);
    if (!normalized) return [];
    const candidates = this.db.prepare(`SELECT id, name, address, status FROM facilities
      WHERE id<>? AND status<>'DRAFT' ORDER BY name, id`).all(id) as DuplicateFacility[];
    return candidates.filter(item => normalizeAddress(item.address) === normalized);
  }

  decide(id: string, status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFORMATION', actorId: string, note: string, now: string): boolean {
    const changed = this.db.prepare("UPDATE facilities SET status=? WHERE id=? AND status='PENDING_APPROVAL'").run(status, id);
    if (!changed.changes) return false;
    this.db.prepare(`INSERT INTO facility_applications (facility_id, decision_note, decided_by, decided_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(facility_id) DO UPDATE SET decision_note=excluded.decision_note, decided_by=excluded.decided_by, decided_at=excluded.decided_at`)
      .run(id, note || null, actorId, now);
    return true;
  }

  recordDecision(id: string, actorId: string, decision: Decision, note: string, now: string): void {
    this.db.prepare(`INSERT INTO admin_actions (id, actor_id, target_type, target_id, action_type, message, created_at)
      VALUES (?, ?, 'FACILITY', ?, ?, ?, ?)`).run(randomUUID(), actorId, id, decision, note || null, now);
  }
}
