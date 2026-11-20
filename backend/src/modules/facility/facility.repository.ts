import type { Db } from '../../db/database';

export type ServiceType = 'GROOMING' | 'VETERINARY' | 'BOARDING';
export type FacilityStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'NEEDS_INFORMATION' | 'APPROVED' | 'REJECTED';

export interface Facility {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  area: string;
  phone: string;
  description: string;
  openingHours: string;
  status: FacilityStatus;
  ownerSuspended: boolean;
}
export interface Service {
  id: string;
  facilityId: string;
  name: string;
  type: ServiceType;
  durationMinutes: number | null;
  price: number;
  capacity: number | null;
  description: string;
  active: boolean;
}
export interface StaffMember {
  id: string;
  facilityId: string;
  userId: string | null;
  name: string;
  position: 'GROOMER' | 'VETERINARIAN';
}
export interface Shift {
  id: string;
  staffId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const mapFacility = (r: any): Facility => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  address: r.address,
  area: r.area,
  phone: r.phone,
  description: r.description,
  openingHours: r.opening_hours,
  status: r.status,
  ownerSuspended: !!r.owner_suspended,
});
const mapService = (r: any): Service => ({
  id: r.id,
  facilityId: r.facility_id,
  name: r.name,
  type: r.type,
  durationMinutes: r.duration_minutes,
  price: r.price,
  capacity: r.capacity,
  description: r.description,
  active: !!r.active,
});
const mapStaff = (r: any): StaffMember => ({ id: r.id, facilityId: r.facility_id, userId: r.user_id, name: r.name, position: r.position });
const mapShift = (r: any): Shift => ({ id: r.id, staffId: r.staff_id, weekday: r.weekday, startTime: r.start_time, endTime: r.end_time });

/** Persists Facility, Service, StaffMember and Shift (read side in this build; management screens follow in Sprint 5). */
export class FacilityRepository {
  constructor(private readonly db: Db) {}

  findFacilityById(id: string): Facility | undefined {
    const r = this.db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
    return r ? mapFacility(r) : undefined;
  }

  findFacilitiesByOwner(ownerId: string): Facility[] {
    return this.db.prepare('SELECT * FROM facilities WHERE owner_id = ? ORDER BY name').all(ownerId).map(mapFacility);
  }

  findBookableFacilities(): Facility[] {
    return this.db
      .prepare("SELECT * FROM facilities WHERE status = 'APPROVED' AND owner_suspended = 0 ORDER BY name")
      .all()
      .map(mapFacility);
  }

  findServicesByFacility(facilityId: string, activeOnly: boolean): Service[] {
    const sql = `SELECT * FROM services WHERE facility_id = ? ${activeOnly ? 'AND active = 1' : ''} ORDER BY price, name`;
    return this.db.prepare(sql).all(facilityId).map(mapService);
  }

  findServiceById(id: string): Service | undefined {
    const r = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return r ? mapService(r) : undefined;
  }

  findStaffByFacility(facilityId: string): StaffMember[] {
    return this.db.prepare('SELECT * FROM staff_members WHERE facility_id = ? ORDER BY name').all(facilityId).map(mapStaff);
  }

  findStaffById(id: string): StaffMember | undefined {
    const r = this.db.prepare('SELECT * FROM staff_members WHERE id = ?').get(id);
    return r ? mapStaff(r) : undefined;
  }

  findStaffForService(serviceId: string): StaffMember[] {
    return this.db
      .prepare('SELECT s.* FROM staff_members s JOIN staff_services ss ON ss.staff_id = s.id WHERE ss.service_id = ? ORDER BY s.name')
      .all(serviceId)
      .map(mapStaff);
  }

  findShifts(staffId: string, weekday: number): Shift[] {
    return this.db
      .prepare('SELECT * FROM shifts WHERE staff_id = ? AND weekday = ? ORDER BY start_time')
      .all(staffId, weekday)
      .map(mapShift);
  }
}
