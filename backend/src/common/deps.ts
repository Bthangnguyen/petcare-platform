import type { Db } from '../db/database';
import type { BookingService } from '../modules/booking/booking.service';
import type { FacilityCatalogService } from '../modules/facility/facility.service';
import type { IdentityAccessService } from '../modules/identity/identity.service';
import type { NotificationService } from '../modules/notification/notification.service';
import type { PetProfileService } from '../modules/pet/pet.service';
import type { RequestHandler } from 'express';
import type { ReminderPort } from '../modules/reminder/reminder.port';
import type { RatingReader } from '../modules/review/review.port';
import type { Clock } from './time';
import type { OutboxMailer } from './mailer';

/**
 * Everything a module of Sprint 5 may use. app.ts creates it once and gives it to the router of every use case.
 * Rules: use the services of other modules (their methods are the ports), never their repositories or tables;
 * the repository and the service of your own use case are created inside your router file.
 */
export interface AppDeps {
  db: Db;
  clock: Clock;
  /** createStaffAccount (UC14), listActiveAdminIds (UC12), getPublicUserById (UC21). */
  identity: IdentityAccessService;
  notifications: NotificationService;
  catalog: FacilityCatalogService;
  pets: PetProfileService;
  bookings: BookingService;
  mailer: OutboxMailer;
  /** AuthMiddleware: use it on the routes of your router that need a login (a router mounted without auth, for example /reviews). */
  auth: RequestHandler;
  /** UC17 (Thắng): NoopReminders until the real service is wired in app.ts. */
  reminders: ReminderPort;
  /** UC20 (Quân): NoRatings until the real service is wired in app.ts. */
  ratings: RatingReader;
}
