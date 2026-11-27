import { Router } from 'express';
import { handler, send, validate } from '../../common/api';
import type { AppDeps } from '../../common/deps';
import { FacilityRegistrationService, registrationSchema } from './registration.service';

/** UC12 — Quân. Mounted with FACILITY_OWNER auth at /api/facility-owner/applications. */
export function facilityRegistrationRouter(deps: AppDeps): Router {
  const r = Router();
  const service = new FacilityRegistrationService(deps);
  r.get('/', handler((req, res) => send(req, res, service.list(req.ctx!.actorId))));
  r.get('/:id', handler((req, res) => send(req, res, service.get(req.ctx!.actorId, req.params.id ?? ''))));
  r.post('/', handler((req, res) => {
    const input = validate(registrationSchema, req.body);
    send(req, res, service.create(req.ctx!.actorId, input), 201);
  }));
  r.put('/:id', handler((req, res) => {
    const input = validate(registrationSchema, req.body);
    send(req, res, service.update(req.ctx!.actorId, req.params.id ?? '', input));
  }));
  return r;
}
