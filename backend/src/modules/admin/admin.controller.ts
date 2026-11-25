import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC21 – owner: Quân.
 * Review facility applications: list, details, approve, reject, ask for more information; notify the owner (deps.notifications.notify). Tables: facilities, facility_applications, admin_actions.
 * Mounted in app.ts at /api/admin  (role SYSTEM_ADMINISTRATOR), for example /facilities.
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function adminRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC21'));
  return r;
}
