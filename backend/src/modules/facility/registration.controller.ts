import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC12 – owner: Quân.
 * Register a facility: draft, submit for approval, resubmit after "needs information". Tables: facilities, facility_applications.
 * Mounted in app.ts at /api/facility-owner/applications  (role FACILITY_OWNER).
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function facilityRegistrationRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC12'));
  return r;
}
