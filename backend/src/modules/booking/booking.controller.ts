import { Router } from 'express';
import { handler, send, validate } from '../../common/api';
import { AvailabilityService } from './availability.service';
import { BookingService, bookingSchema, statusSchema } from './booking.service';

/** Public endpoint of UC08: free slots of a service on a date (used by the booking form of UC07). */
export function availabilityRouter(availability: AvailabilityService): Router {
  const r = Router();
  r.get(
    '/:id/availability',
    handler((req, res) => {
      const serviceId = String(req.query.serviceId ?? '');
      const date = String(req.query.date ?? '');
      send(req, res, availability.checkAvailability(req.params.id ?? '', serviceId, date));
    }),
  );
  return r;
}

/** REST endpoints of the pet owner for bookings (UC07, UC09). */
export function bookingRouter(service: BookingService): Router {
  const r = Router();
  r.post(
    '/',
    handler((req, res) => {
      const input = validate(bookingSchema, req.body);
      send(req, res, service.createBooking(req.ctx!.actorId, input), 201);
    }),
  );
  r.get('/mine', handler((req, res) => send(req, res, service.listMyBookings(req.ctx!.actorId))));
  r.post('/:id/cancel', handler((req, res) => send(req, res, service.cancelBooking(req.ctx!.actorId, req.params.id ?? ''))));
  return r;
}

/** REST endpoints of the facility owner for the bookings of the facility (UC11). */
export function facilityBookingRouter(service: BookingService): Router {
  const r = Router();
  r.get(
    '/',
    handler((req, res) => {
      const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined;
      const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
      send(req, res, service.listFacilityBookings(req.ctx!.actorId, { date, status }));
    }),
  );
  r.post(
    '/:id/status',
    handler((req, res) => {
      const input = validate(statusSchema, req.body);
      send(req, res, service.updateBookingStatus(req.ctx!.actorId, req.params.id ?? '', input.status, input.reason));
    }),
  );
  return r;
}
