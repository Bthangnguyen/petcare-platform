import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC16 – owner: Quỳnh.
 * Staff member: see own assigned bookings and record the result of a service (draft, submit, correct). The owner sees the result in the health history (UC04). Table: health_records.
 * Mounted in app.ts at /api/staff  (role STAFF), for example /bookings, /results.
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function staffRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC16'));
  return r;
}
