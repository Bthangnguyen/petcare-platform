import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { config } from './config';
import { errorHandler, requestIdMiddleware, send } from './common/api';
import { authenticate, requireRole } from './common/authMiddleware';
import type { AppDeps } from './common/deps';
import { OutboxMailer } from './common/mailer';
import { Clock, systemClock } from './common/time';
import type { Db } from './db/database';
import { availabilityRouter, bookingRouter, facilityBookingRouter } from './modules/booking/booking.controller';
import { AvailabilityService } from './modules/booking/availability.service';
import { BookingRepository } from './modules/booking/booking.repository';
import { BookingService } from './modules/booking/booking.service';
import { adminRouter } from './modules/admin/admin.controller';
import { facilityRouter } from './modules/facility/facility.controller';
import { facilityManagementRouter } from './modules/facility/management.controller';
import { facilityRegistrationRouter } from './modules/facility/registration.controller';
import { FacilityRepository } from './modules/facility/facility.repository';
import { FacilityCatalogService } from './modules/facility/facility.service';
import { identityRouter } from './modules/identity/identity.controller';
import { passwordResetRouter } from './modules/identity/passwordReset.controller';
import { IdentityAccessService } from './modules/identity/identity.service';
import { LoginAttemptPolicy } from './modules/identity/loginAttemptPolicy';
import { PasswordHasher } from './modules/identity/passwordHasher';
import { SessionRepository } from './modules/identity/session.repository';
import { UserRepository } from './modules/identity/user.repository';
import { notificationRouter } from './modules/notification/notification.controller';
import { NotificationRepository, NotificationService } from './modules/notification/notification.service';
import { petRouter } from './modules/pet/pet.controller';
import { staffRouter } from './modules/pet/staffResult.controller';
import { reminderRouter } from './modules/reminder/reminder.controller';
import { reviewRouter } from './modules/review/review.controller';
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

  const deps: AppDeps = { db, clock, identity, notifications, catalog, pets: petService, bookings: bookingService, mailer: new OutboxMailer(db, clock) };

  const app = express();
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const auth = authenticate(identity);
  const api = express.Router();
  api.get('/health', (req, res) => send(req, res, { status: 'ok', time: clock.now().toISOString() }));
  api.use('/auth/password-reset', passwordResetRouter(deps)); // UC24 (public)
  api.use('/auth', identityRouter(identity));
  api.use('/facilities', facilityRouter(catalog), availabilityRouter(availability));
  api.use('/pets', auth, requireRole('PET_OWNER'), petRouter(petService));
  api.use('/bookings', auth, requireRole('PET_OWNER'), bookingRouter(bookingService));
  api.use('/facility-bookings', auth, requireRole('FACILITY_OWNER'), facilityBookingRouter(bookingService));
  // Use cases of Sprint 5: every router lives in its own file (the owner is named in the file header) and answers 501 until it is built.
  api.use('/facility-owner/applications', auth, requireRole('FACILITY_OWNER'), facilityRegistrationRouter(deps)); // UC12
  api.use('/facility-owner', auth, requireRole('FACILITY_OWNER'), facilityManagementRouter(deps)); // UC13, UC14
  api.use('/admin', auth, requireRole('SYSTEM_ADMINISTRATOR'), adminRouter(deps)); // UC21
  api.use('/staff', auth, requireRole('STAFF'), staffRouter(deps)); // UC16
  api.use('/reminders', auth, requireRole('PET_OWNER'), reminderRouter(deps)); // UC17
  api.use('/reviews', auth, reviewRouter(deps)); // UC20
  if (config.exposeDevOutbox) {
    // Development e-mail outbox (closed when NODE_ENV=production): lets the demo show the reset link of UC24 without an e-mail provider.
    api.get('/dev/outbox', (req, res) => send(req, res, deps.mailer.list()));
  }
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
