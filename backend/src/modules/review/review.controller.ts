import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC20 – owner: Quân.
 * Pet owner reviews a completed booking (1 review per booking); rating summary of a facility. Table: reviews.
 * Mounted in app.ts at /api/reviews  (any logged-in user; the services check the role).
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function reviewRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC20'));
  return r;
}
