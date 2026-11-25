import { Router } from 'express';
import { notImplemented } from '../../common/api';
import type { AppDeps } from '../../common/deps';

/**
 * UC13, UC14 – owner: Trường.
 * Manage services (UC13) and staff members, shifts and staff accounts (UC14). Tables: services, staff_members, staff_services, shifts. Account of a staff member: deps.identity.createStaffAccount.
 * Mounted in app.ts at /api/facility-owner  (role FACILITY_OWNER), for example /services, /staff, /shifts.
 *
 * To implement: replace the placeholder below by your routes (see facility.controller.ts for the style: handler, validate with zod, send),
 * put the business rules in a service class and the SQL in a repository class of your own files in this folder, and add API tests.
 */
export function facilityManagementRouter(_deps: AppDeps): Router {
  const r = Router();
  r.use(notImplemented('UC13, UC14'));
  return r;
}
