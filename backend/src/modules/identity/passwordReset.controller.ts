import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC24 – owner: Quỳnh.
 * Forgot password: request a reset link by e-mail (deps.mailer), set a new password with the single-use token (15 minutes), end all sessions. Table: password_reset_tokens.
 * Mounted in app.ts at /api/auth/password-reset  (public).
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function passwordResetRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC24'));
  return r;
}
