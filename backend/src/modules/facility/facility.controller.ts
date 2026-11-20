import { Router } from 'express';
import { handler, send, validate } from '../../common/api';
import { FacilityCatalogService, searchSchema } from './facility.service';

/** Public REST endpoints for searching facilities and viewing details (UC06); no login is needed to search. */
export function facilityRouter(service: FacilityCatalogService): Router {
  const r = Router();
  r.get(
    '/',
    handler((req, res) => {
      const criteria = validate(searchSchema, req.query);
      send(req, res, service.searchFacilities(criteria));
    }),
  );
  r.get('/:id', handler((req, res) => send(req, res, service.getFacilityDetail(req.params.id ?? ''))));
  return r;
}
