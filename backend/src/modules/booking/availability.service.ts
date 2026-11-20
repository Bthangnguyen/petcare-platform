import { badRequest, notFound } from '../../common/errors';
import { Clock, addDays, fromLocal, fromMinutes, isIsoDate, localDate, toMinutes, weekdayOf } from '../../common/time';
import type { FacilityCatalogReader } from '../facility/facility.service';
import { BookingRepository } from './booking.repository';

export interface FreeSlot {
  /** Local start and end time (UTC+7), HH:mm. */
  start: string;
  end: string;
  startAt: string;
  staff: { id: string; name: string }[];
}
export interface AvailabilityResult {
  date: string;
  serviceId: string;
  durationMinutes: number;
  slots: FreeSlot[];
  /** When there is no free slot: the nearest dates that have free slots (UC07, A2). */
  nearestDates: string[];
}

const STEP_MINUTES = 30;
const SEARCH_DAYS = 14;

/** UC08: computes the free time slots of a service from the shifts of the staff and the existing bookings. */
export class AvailabilityService {
  constructor(
    private readonly catalog: FacilityCatalogReader,
    private readonly bookings: BookingRepository,
    private readonly clock: Clock,
  ) {}

  /** Free slots of one date. A computed slot is a value object and is not stored. */
  getFreeSlots(facilityId: string, serviceId: string, date: string): FreeSlot[] {
    const service = this.catalog.getService(serviceId);
    if (!service || service.facilityId !== facilityId || !service.active || !service.durationMinutes) throw notFound('Không tìm thấy dịch vụ.');
    const duration = service.durationMinutes;
    const staff = this.catalog.listStaffForService(serviceId);
    const dayStart = fromLocal(date, '00:00');
    const dayEnd = fromLocal(addDays(date, 1), '00:00');
    const booked = this.bookings.findActiveByStaffBetween(
      staff.map((s) => s.id),
      dayStart.toISOString(),
      dayEnd.toISOString(),
    );
    const now = this.clock.now().getTime();
    const weekday = weekdayOf(date);
    const bySlot = new Map<number, FreeSlot>();
    for (const member of staff) {
      for (const shift of this.catalog.listShifts(member.id, weekday)) {
        for (let t = toMinutes(shift.startTime); t + duration <= toMinutes(shift.endTime); t += STEP_MINUTES) {
          const start = fromLocal(date, fromMinutes(t));
          const end = new Date(start.getTime() + duration * 60_000);
          if (start.getTime() <= now) continue; // a slot in the past cannot be booked
          const taken = booked.some((b) => b.staffId === member.id && b.startAt < end.toISOString() && b.endAt > start.toISOString());
          if (taken) continue;
          let slot = bySlot.get(t);
          if (!slot) {
            slot = { start: fromMinutes(t), end: fromMinutes(t + duration), startAt: start.toISOString(), staff: [] };
            bySlot.set(t, slot);
          }
          slot.staff.push({ id: member.id, name: member.name });
        }
      }
    }
    return [...bySlot.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
  }

  /** UC08 for a date, with the nearest dates when the date has no free slot. */
  checkAvailability(facilityId: string, serviceId: string, date: string): AvailabilityResult {
    if (!isIsoDate(date)) throw badRequest('Ngày không hợp lệ.', { date: 'Ngày không hợp lệ.' });
    if (!this.catalog.isBookable(facilityId)) throw notFound('Không tìm thấy cơ sở.');
    const service = this.catalog.getService(serviceId);
    if (!service || service.facilityId !== facilityId) throw notFound('Không tìm thấy dịch vụ.');
    if (date < localDate(this.clock.now())) throw badRequest('Không thể chọn ngày trong quá khứ.', { date: 'Không thể chọn ngày trong quá khứ.' });
    const slots = this.getFreeSlots(facilityId, serviceId, date);
    const nearestDates: string[] = [];
    if (!slots.length) {
      for (let i = 1; i <= SEARCH_DAYS && nearestDates.length < 3; i++) {
        const d = addDays(date, i);
        if (this.getFreeSlots(facilityId, serviceId, d).length) nearestDates.push(d);
      }
    }
    return { date, serviceId, durationMinutes: service.durationMinutes ?? 0, slots, nearestDates };
  }

  /** Re-check used by BookingService just before saving (UC07 step 8). */
  isSlotAvailable(staffId: string, startIso: string, endIso: string): boolean {
    return this.bookings.findOverlapping(staffId, startIso, endIso).length === 0;
  }
}
