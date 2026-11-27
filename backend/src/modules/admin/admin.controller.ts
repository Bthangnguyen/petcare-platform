import { Router } from 'express';
import { handler, send, validate } from '../../common/api';
import type { AppDeps } from '../../common/deps';
import { AdminFacilityService, decisionSchema, facilityFilterSchema } from './admin.service';

/** UC21 — Quân. Mounted with SYSTEM_ADMINISTRATOR auth at /api/admin. */
export function adminRouter(deps: AppDeps): Router {
  const r = Router();
  const service = new AdminFacilityService(deps);
  r.get('/facilities', handler((req, res) => {
    const { status } = validate(facilityFilterSchema, req.query);
    send(req, res, service.list(status));
  }));
  r.get('/facilities/:id', handler((req, res) => send(req, res, service.get(req.params.id ?? ''))));
  r.post('/facilities/:id/decision', handler((req, res) => {
    const input = validate(decisionSchema, req.body);
    send(req, res, service.decide(req.ctx!.actorId, req.params.id ?? '', input));
  }));
  return r;
}
