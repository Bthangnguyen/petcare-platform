import crypto from 'node:crypto';
import { z } from 'zod';
import { config } from '../../config';
import { badRequest, conflict, forbidden, notFound } from '../../common/errors';
import { Clock, addDays, fromLocal, isIsoDate, isTime, localDate, localTime, toMinutes, weekdayOf } from '../../common/time';
import type { FacilityCatalogService } from '../facility/facility.service';
import type { NotificationService } from '../notification/notification.service';
import type { PetProfileService } from '../pet/pet.service';
import { AvailabilityService } from './availability.service';
import { Booking, BookingRepository, BookingStatus } from './booking.repository';

export const bookingSchema = z.object({
  petId: z.string().min(1, 'Vui lòng chọn thú cưng.'),
  serviceId: z.string().min(1, 'Vui lòng chọn dịch vụ.'),
  date: z.string().refine(isIsoDate, 'Ngày không hợp lệ.'),
  time: z.string().refine(isTime, 'Giờ không hợp lệ.'),
  staffId: z.string().min(1).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const statusSchema = z.object({
  status: z.enum(['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']),
  reason: z.string().trim().max(300).optional(),
});

export interface BookingView {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  facility: { id: string; name: string; address: string; phone: string };
  service: { id: string; name: string; type: string };
  pet: { id: string; name: string; allergies: string[] };
  staff: { id: string; name: string };
  canCancel: boolean;
  cancellationReason: string | null;
}

const TRANSITIONS: Record<string, BookingStatus[]> = {
  CONFIRMED: ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
};

/** UC07 (book), UC09 (my bookings) and UC11 (facility bookings): the lifecycle of appointment bookings. */
export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly catalog: FacilityCatalogService,
    private readonly availability: AvailabilityService,
    private readonly pets: PetProfileService,
    private readonly notifications: NotificationService,
    private readonly clock: Clock,
  ) {}

  private isCancellable(b: Booking, now: Date): boolean {
    return b.status === 'CONFIRMED' && new Date(b.startAt).getTime() - now.getTime() >= config.cancelLimitHours * 3600_000;
  }

  private toView(b: Booking, now: Date): BookingView {
    const facility = this.catalog.getFacility(b.facilityId)!;
    const service = this.catalog.getService(b.serviceId)!;
    const staff = this.catalog.listStaffById(b.staffId);
    const pet = this.pets.getSummary(b.petId);
    const start = new Date(b.startAt);
    return {
      id: b.id,
      status: b.status,
      startAt: b.startAt,
      endAt: b.endAt,
      date: localDate(start),
      startTime: localTime(start),
      endTime: localTime(new Date(b.endAt)),
      price: b.price,
      facility: { id: facility.id, name: facility.name, address: facility.address, phone: facility.phone },
      service: { id: service.id, name: service.name, type: service.type },
      pet,
      staff: { id: staff?.id ?? b.staffId, name: staff?.name ?? '' },
      canCancel: this.isCancellable(b, now),
      cancellationReason: b.cancellationReason,
    };
  }

  /** UC07 basic flow steps 6 to 9: re-checks the availability, creates the booking and notifies the owner and the facility. */
  createBooking(ownerId: string, input: BookingInput): BookingView {
    const now = this.clock.now();
    const pet = this.pets.getActivePetOf(ownerId, input.petId);
    const service = this.catalog.getService(input.serviceId);
    if (!service || !service.active || service.type === 'BOARDING' || !service.durationMinutes) throw notFound('Không tìm thấy dịch vụ.');
    const facility = this.catalog.getFacility(service.facilityId);
    if (!facility || !this.catalog.isBookable(facility.id)) throw notFound('Không tìm thấy cơ sở.');
    const start = fromLocal(input.date, input.time);
    if (start.getTime() <= now.getTime()) throw badRequest('Khung giờ đã qua. Vui lòng chọn khung giờ khác.', { time: 'Khung giờ đã qua.' });
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    const candidates = this.catalog.listStaffForService(service.id);
    if (input.staffId && !candidates.some((s) => s.id === input.staffId)) throw badRequest('Nhân viên không thực hiện dịch vụ này.', { staffId: 'Nhân viên không hợp lệ.' });

    const created = this.bookings.inTransaction(() => {
      // The check and the insert happen in one transaction, so two owners can never book the same slot (NFR-11).
      const startMin = toMinutes(localTime(start));
      const endMin = startMin + service.durationMinutes!;
      const eligible = (input.staffId ? candidates.filter((s) => s.id === input.staffId) : candidates).filter((s) =>
        this.catalog
          .listShifts(s.id, weekdayOf(input.date))
          .some((sh) => toMinutes(sh.startTime) <= startMin && toMinutes(sh.endTime) >= endMin),
      );
      const free = eligible.find((s) => this.availability.isSlotAvailable(s.id, start.toISOString(), end.toISOString()));
      if (!free) {
        throw conflict('SLOT_TAKEN', 'Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác.', {
          slots: this.availability.getFreeSlots(facility.id, service.id, input.date),
        });
      }
      const booking: Booking = {
        id: crypto.randomUUID(),
        ownerId,
        petId: pet.id,
        facilityId: facility.id,
        serviceId: service.id,
        staffId: free.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: 'CONFIRMED',
        price: service.price,
        createdAt: now.toISOString(),
        cancellationReason: null,
      };
      this.bookings.insert(booking);
      return booking;
    });

    const when = `${localTime(start)} ngày ${input.date.split('-').reverse().join('/')}`;
    this.notifications.notifyBookingEvent({
      recipientId: ownerId,
      bookingId: created.id,
      title: 'Đặt lịch thành công',
      message: `${pet.name} – ${service.name} tại ${facility.name}, lúc ${when}.`,
    });
    this.notifications.notifyBookingEvent({
      recipientId: facility.ownerId,
      bookingId: created.id,
      title: 'Có lịch hẹn mới',
      message: `${pet.name} – ${service.name}, lúc ${when}.`,
    });
    return this.toView(created, now);
  }

  /** UC09 steps 1 to 3: the upcoming and the past bookings of the owner. */
  listMyBookings(ownerId: string): { upcoming: BookingView[]; past: BookingView[] } {
    const now = this.clock.now();
    const all = this.bookings.findByOwner(ownerId).map((b) => this.toView(b, now));
    const upcoming = all
      .filter((b) => ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(b.status) && b.endAt > now.toISOString())
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    const upIds = new Set(upcoming.map((b) => b.id));
    return { upcoming, past: all.filter((b) => !upIds.has(b.id)) };
  }

  /** UC09 steps 4 to 7 and A1: the owner cancels a booking that starts in at least 2 hours. */
  cancelBooking(ownerId: string, bookingId: string): BookingView {
    const now = this.clock.now();
    const b = this.bookings.findById(bookingId);
    if (!b || b.ownerId !== ownerId) throw notFound('Không tìm thấy lịch hẹn.');
    if (!this.isCancellable(b, now)) {
      const facility = this.catalog.getFacility(b.facilityId)!;
      throw conflict(
        'CANCEL_NOT_ALLOWED',
        `Lịch hẹn này không thể hủy trực tuyến (chỉ hủy được trước giờ hẹn ít nhất ${config.cancelLimitHours} giờ). Vui lòng liên hệ cơ sở: ${facility.phone}.`,
        { facilityPhone: facility.phone },
      );
    }
    this.bookings.updateStatus(b.id, 'CANCELLED', 'Chủ thú cưng hủy lịch');
    const facility = this.catalog.getFacility(b.facilityId)!;
    const pet = this.pets.getSummary(b.petId);
    this.notifications.notifyBookingEvent({
      recipientId: facility.ownerId,
      bookingId: b.id,
      title: 'Lịch hẹn đã bị hủy',
      message: `${pet.name} – lúc ${localTime(new Date(b.startAt))} ngày ${localDate(new Date(b.startAt)).split('-').reverse().join('/')}.`,
    });
    return this.toView(this.bookings.findById(b.id)!, now);
  }

  /** UC11 steps 1 and 2: the bookings of the facilities of the facility owner. */
  listFacilityBookings(actorId: string, filter: { date?: string; status?: string }): BookingView[] {
    const now = this.clock.now();
    const facilityIds = this.catalog.facilitiesOf(actorId).map((f) => f.id);
    let range: { fromIso?: string; toIso?: string } = {};
    if (filter.date) {
      if (!isIsoDate(filter.date)) throw badRequest('Ngày không hợp lệ.', { date: 'Ngày không hợp lệ.' });
      range = { fromIso: fromLocal(filter.date, '00:00').toISOString(), toIso: fromLocal(addDays(filter.date, 1), '00:00').toISOString() };
    }
    return this.bookings.findByFacilities(facilityIds, { status: filter.status, ...range }).map((b) => this.toView(b, now));
  }

  /** UC11 steps 4 and 5, A2: the facility owner changes the status; the owner of the pet is notified. */
  updateBookingStatus(actorId: string, bookingId: string, status: BookingStatus, reason?: string): BookingView {
    const now = this.clock.now();
    const b = this.bookings.findById(bookingId);
    const facility = b ? this.catalog.getFacility(b.facilityId) : undefined;
    if (!b || !facility) throw notFound('Không tìm thấy lịch hẹn.');
    if (facility.ownerId !== actorId) throw forbidden();
    if (!TRANSITIONS[b.status]?.includes(status)) {
      throw conflict('INVALID_STATUS_CHANGE', 'Không thể chuyển lịch hẹn sang trạng thái này.');
    }
    if (status === 'CANCELLED' && !reason) throw badRequest('Vui lòng nhập lý do hủy.', { reason: 'Vui lòng nhập lý do hủy.' });
    this.bookings.updateStatus(b.id, status, status === 'CANCELLED' ? reason! : null);
    const labels: Record<string, string> = {
      CHECKED_IN: 'đã check-in',
      IN_PROGRESS: 'đang được thực hiện',
      COMPLETED: 'đã hoàn thành',
      NO_SHOW: 'được ghi nhận là vắng mặt',
      CANCELLED: `đã bị cơ sở hủy (${reason ?? ''})`,
    };
    this.notifications.notifyBookingEvent({
      recipientId: b.ownerId,
      bookingId: b.id,
      title: 'Cập nhật lịch hẹn',
      message: `Lịch hẹn tại ${facility.name} ${labels[status]}.`,
    });
    return this.toView(this.bookings.findById(b.id)!, now);
  }
}
