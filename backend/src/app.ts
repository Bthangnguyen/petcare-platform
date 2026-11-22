import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { config } from './config';
import { errorHandler, requestIdMiddleware, send } from './common/api';
import { authenticate, requireRole } from './common/authMiddleware';
import { Clock, systemClock } from './common/time';
import type { Db } from './db/database';
import { availabilityRouter, bookingRouter, facilityBookingRouter } from './modules/booking/booking.controller';
import { AvailabilityService } from './modules/booking/availability.service';
import { BookingRepository } from './modules/booking/booking.repository';
import { BookingService } from './modules/booking/booking.service';
import { facilityRouter } from './modules/facility/facility.controller';
import { FacilityRepository } from './modules/facility/facility.repository';
import { FacilityCatalogService } from './modules/facility/facility.service';
import { identityRouter } from './modules/identity/identity.controller';
import { IdentityAccessService } from './modules/identity/identity.service';
import { LoginAttemptPolicy } from './modules/identity/loginAttemptPolicy';
import { PasswordHasher } from './modules/identity/passwordHasher';
import { SessionRepository } from './modules/identity/session.repository';
import { UserRepository } from './modules/identity/user.repository';
import { notificationRouter } from './modules/notification/notification.controller';
import { NotificationRepository, NotificationService } from './modules/notification/notification.service';
import { petRouter } from './modules/pet/pet.controller';
import { PetRepository } from './modules/pet/pet.repository';
import { PetProfileService } from './modules/pet/pet.service';
import { QrCodeGenerator } from './modules/pet/qrCodeGenerator';

/**
 * Composition root: creates the repositories and services of the modules and connects them through their ports.
 * Layers inside a module: Controller -> Service -> Repository -> Entity (see SAD, section 4).
 */
export function createApp(db: Db, clock: Clock = systemClock) {
  const identity = new IdentityAccessService(new UserRepository(db), new SessionRepository(db), new PasswordHasher(), new LoginAttemptPolicy(), clock);
  const petService = new PetProfileService(new PetRepository(db), new QrCodeGenerator(), clock);
  const catalog = new FacilityCatalogService(new FacilityRepository(db));
  const notifications = new NotificationService(new NotificationRepository(db), clock);
  const bookingRepo = new BookingRepository(db);
  const availability = new AvailabilityService(catalog, bookingRepo, clock);
  const bookingService = new BookingService(bookingRepo, catalog, availability, petService, notifications, clock);

  const app = express();
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const auth = authenticate(identity);
  const api = express.Router();
  api.get('/health', (req, res) => send(req, res, { status: 'ok', time: clock.now().toISOString() }));
  api.use('/auth', identityRouter(identity));
  api.use('/facilities', facilityRouter(catalog), availabilityRouter(availability));
  api.use('/pets', auth, requireRole('PET_OWNER'), petRouter(petService));
  api.use('/bookings', auth, requireRole('PET_OWNER'), bookingRouter(bookingService));
  api.use('/facility-bookings', auth, requireRole('FACILITY_OWNER'), facilityBookingRouter(bookingService));
  api.use('/notifications', notificationRouter(notifications, auth, authenticate(identity, { recordActivity: false })));
  api.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn yêu cầu.' } });
  });
  app.use('/api', api);

  // The built React user interface (single-page application) is delivered by the same server.
  const dist = config.frontendDist;
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
