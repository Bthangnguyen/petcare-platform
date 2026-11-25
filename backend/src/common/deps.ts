import type { Db } from '../db/database';
import type { BookingService } from '../modules/booking/booking.service';
import type { FacilityCatalogService } from '../modules/facility/facility.service';
import type { IdentityAccessService } from '../modules/identity/identity.service';
import type { NotificationService } from '../modules/notification/notification.service';
import type { PetProfileService } from '../modules/pet/pet.service';
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
  identity: IdentityAccessService;
  notifications: NotificationService;
  catalog: FacilityCatalogService;
  pets: PetProfileService;
  bookings: BookingService;
  mailer: OutboxMailer;
}
