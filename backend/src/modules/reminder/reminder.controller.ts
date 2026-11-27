import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC17 – owner: Thắng.
 * Care reminders: list, create from a vaccination or a service result, daily scan, complete, dismiss, postpone. Table: reminders.
 * Mounted in app.ts at /api/reminders  (role PET_OWNER).
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function reminderRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC17'));
  return r;
}
