import { Router } from 'express';
import { handler, send, validate } from '../../common/api';
import { notFound } from '../../common/errors';
import { PetProfileService, petSchema, vaccinationSchema, weightSchema } from './pet.service';

/** REST endpoints for pet profiles, weights, vaccinations and the QR code (UC03). All routes need a logged-in owner. */
export function petRouter(service: PetProfileService): Router {
  const r = Router();
  const owner = (req: Express.Request & { ctx?: { actorId: string } }) => req.ctx!.actorId;
  const id = (req: { params: Record<string, string> }) => req.params.id ?? '';

  r.get('/', handler((req, res) => send(req, res, service.listPets(owner(req), req.query.includeArchived === 'true'))));

  r.post(
    '/',
    handler((req, res) => {
      const input = validate(petSchema, req.body);
      send(req, res, service.createPet(owner(req), input), 201);
    }),
  );

  r.get('/:id', handler((req, res) => send(req, res, service.getPet(owner(req), id(req)))));

  r.put(
    '/:id',
    handler((req, res) => {
      const input = validate(petSchema, req.body);
      send(req, res, service.updatePet(owner(req), id(req), input));
    }),
  );

  r.post('/:id/archive', handler((req, res) => send(req, res, service.archivePet(owner(req), id(req)))));

  r.post(
    '/:id/weights',
    handler((req, res) => {
      const input = validate(weightSchema, req.body);
      send(req, res, service.addWeightRecord(owner(req), id(req), input.weightKg, input.recordedAt), 201);
    }),
  );

  r.post(
    '/:id/vaccinations',
    handler((req, res) => {
      const input = validate(vaccinationSchema, req.body);
      send(req, res, service.addVaccinationRecord(owner(req), id(req), input), 201);
    }),
  );

  r.get(
    '/:id/qr',
    handler(async (req, res) => {
      const dataUrl = await service.getQrCode(owner(req), id(req));
      if (!dataUrl) throw notFound();
      send(req, res, { dataUrl });
    }),
  );

  return r;
}
