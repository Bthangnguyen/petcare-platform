import { z } from 'zod';
import { notFound } from '../../common/errors';
import { Facility, FacilityRepository, Service, ServiceType, StaffMember, Shift } from './facility.repository';

export const searchSchema = z.object({
  area: z.string().trim().optional(),
  type: z.enum(['GROOMING', 'VETERINARY', 'BOARDING']).optional(),
  q: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['name', 'priceAsc', 'priceDesc']).optional().default('name'),
});
export type SearchCriteria = z.infer<typeof searchSchema>;

export interface FacilitySummary {
  id: string;
  name: string;
  area: string;
  address: string;
  serviceTypes: ServiceType[];
  serviceNames: string[];
  startingPrice: number;
  averageRating: number | null;
  ratingCount: number;
}

/** Port used by Booking & Availability (FacilityCatalogReader). */
export interface FacilityCatalogReader {
  getFacility(facilityId: string): Facility | undefined;
  getService(serviceId: string): Service | undefined;
  listActiveServices(facilityId: string): Service[];
  listStaffForService(serviceId: string): StaffMember[];
  listShifts(staffId: string, weekday: number): Shift[];
  isBookable(facilityId: string): boolean;
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** UC06 (search) and the read operations of the catalog; realizes FacilityCatalogReader. */
export class FacilityCatalogService implements FacilityCatalogReader {
  constructor(private readonly repo: FacilityRepository) {}

  getFacility(id: string) {
    return this.repo.findFacilityById(id);
  }
  getService(id: string) {
    return this.repo.findServiceById(id);
  }
  listActiveServices(facilityId: string) {
    return this.repo.findServicesByFacility(facilityId, true);
  }
  listStaffForService(serviceId: string) {
    return this.repo.findStaffForService(serviceId);
  }
  listShifts(staffId: string, weekday: number) {
    return this.repo.findShifts(staffId, weekday);
  }
  isBookable(facilityId: string): boolean {
    const f = this.repo.findFacilityById(facilityId);
    return !!f && f.status === 'APPROVED' && !f.ownerSuspended;
  }

  /** UC06 basic flow steps 2 to 4: approved facilities with at least one active service. */
  searchFacilities(c: SearchCriteria): FacilitySummary[] {
    const area = c.area ? stripAccents(c.area) : '';
    const q = c.q ? stripAccents(c.q) : '';
    const out: FacilitySummary[] = [];
    for (const f of this.repo.findBookableFacilities()) {
      if (area && !stripAccents(`${f.area} ${f.address}`).includes(area)) continue;
      let services = this.repo.findServicesByFacility(f.id, true);
      if (!services.length) continue;
      if (c.type) services = services.filter((s) => s.type === c.type);
      if (c.minPrice !== undefined) services = services.filter((s) => s.price >= c.minPrice!);
      if (c.maxPrice !== undefined) services = services.filter((s) => s.price <= c.maxPrice!);
      if (!services.length) continue;
      if (q && !stripAccents(`${f.name} ${services.map((s) => s.name).join(' ')}`).includes(q)) continue;
      out.push({
        id: f.id,
        name: f.name,
        area: f.area,
        address: f.address,
        serviceTypes: [...new Set(services.map((s) => s.type))],
        serviceNames: services.map((s) => s.name),
        startingPrice: Math.min(...services.map((s) => s.price)),
        averageRating: null, // reviews (UC20) are not implemented yet
        ratingCount: 0,
      });
    }
    if (c.sort === 'priceAsc') out.sort((a, b) => a.startingPrice - b.startingPrice || a.name.localeCompare(b.name));
    else if (c.sort === 'priceDesc') out.sort((a, b) => b.startingPrice - a.startingPrice || a.name.localeCompare(b.name));
    else out.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return out;
  }

  /** UC06 step 6: services, prices, staff, opening hours and address. */
  getFacilityDetail(id: string) {
    const f = this.repo.findFacilityById(id);
    if (!f || !this.isBookable(id)) throw notFound('Không tìm thấy cơ sở.');
    return {
      facility: { id: f.id, name: f.name, area: f.area, address: f.address, phone: f.phone, description: f.description, openingHours: f.openingHours },
      services: this.repo.findServicesByFacility(id, true),
      staff: this.repo.findStaffByFacility(id).map((s) => ({ id: s.id, name: s.name, position: s.position })),
      averageRating: null as number | null,
      reviews: [] as unknown[],
    };
  }

  facilitiesOf(ownerId: string) {
    return this.repo.findFacilitiesByOwner(ownerId);
  }

  listStaffById(staffId: string) {
    return this.repo.findStaffById(staffId);
  }
}
