import type { Db } from '../../db/database';
import type { FacilityStatus } from './facility.repository';

export interface FacilityApplication {
  id: string;
  name: string;
  address: string;
  area: string;
  phone: string;
  description: string;
  openingHours: string;
  status: FacilityStatus;
  supportingDocumentRef: string | null;
  submittedAt: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
}

export type ApplicationFields = Pick<FacilityApplication, 'name' | 'address' | 'area' | 'phone' | 'description' | 'openingHours'> & {
  supportingDocumentRef: string;
};

interface ApplicationRow {
  id: string; name: string; address: string; area: string; phone: string; description: string;
  opening_hours: string; status: FacilityStatus; supporting_document_ref: string | null;
  submitted_at: string | null; decision_note: string | null; decided_at: string | null;
}

const selectApplication = `SELECT f.id, f.name, f.address, f.area, f.phone, f.description, f.opening_hours, f.status,
  a.supporting_document_ref, a.submitted_at, a.decision_note, a.decided_at
  FROM facilities f LEFT JOIN facility_applications a ON a.facility_id = f.id`;

const map = (r: ApplicationRow): FacilityApplication => ({
  id: r.id, name: r.name, address: r.address, area: r.area, phone: r.phone, description: r.description,
  openingHours: r.opening_hours, status: r.status, supportingDocumentRef: r.supporting_document_ref,
  submittedAt: r.submitted_at, decisionNote: r.decision_note, decidedAt: r.decided_at,
});

/** UC12 persistence; existing PA04 facilities may not have an application row yet. */
export class FacilityRegistrationRepository {
  constructor(private readonly db: Db) {}

  listOf(ownerId: string): FacilityApplication[] {
    const rows = this.db.prepare(`${selectApplication} WHERE f.owner_id = ?
      ORDER BY COALESCE(a.submitted_at, '') DESC, f.name COLLATE NOCASE, f.id`).all(ownerId) as ApplicationRow[];
    return rows.map(map);
  }

  findOf(ownerId: string, id: string): FacilityApplication | undefined {
    const row = this.db.prepare(`${selectApplication} WHERE f.owner_id = ? AND f.id = ?`).get(ownerId, id) as ApplicationRow | undefined;
    return row ? map(row) : undefined;
  }

  insert(id: string, ownerId: string, input: ApplicationFields, status: 'DRAFT' | 'PENDING_APPROVAL', submittedAt: string | null): void {
    this.db.prepare(`INSERT INTO facilities
      (id, owner_id, name, address, area, phone, description, opening_hours, status, owner_suspended)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .run(id, ownerId, input.name, input.address, input.area, input.phone, input.description, input.openingHours, status);
    this.db.prepare(`INSERT INTO facility_applications (facility_id, supporting_document_ref, submitted_at) VALUES (?, ?, ?)`)
      .run(id, input.supportingDocumentRef || null, submittedAt);
  }

  update(id: string, ownerId: string, input: ApplicationFields, status: 'DRAFT' | 'PENDING_APPROVAL', submittedAt: string | null): boolean {
    const result = this.db.prepare(`UPDATE facilities SET name=?, address=?, area=?, phone=?, description=?, opening_hours=?, status=?
      WHERE id=? AND owner_id=? AND status IN ('DRAFT', 'NEEDS_INFORMATION', 'REJECTED')`)
      .run(input.name, input.address, input.area, input.phone, input.description, input.openingHours, status, id, ownerId);
    if (!result.changes) return false;
    this.db.prepare(`INSERT INTO facility_applications (facility_id, supporting_document_ref, submitted_at) VALUES (?, ?, ?)
      ON CONFLICT(facility_id) DO UPDATE SET supporting_document_ref=excluded.supporting_document_ref,
      submitted_at=COALESCE(excluded.submitted_at, facility_applications.submitted_at),
      decision_note=CASE WHEN excluded.submitted_at IS NOT NULL THEN NULL ELSE facility_applications.decision_note END,
      decided_by=CASE WHEN excluded.submitted_at IS NOT NULL THEN NULL ELSE facility_applications.decided_by END,
      decided_at=CASE WHEN excluded.submitted_at IS NOT NULL THEN NULL ELSE facility_applications.decided_at END`)
      .run(id, input.supportingDocumentRef || null, submittedAt);
    return true;
  }
}
