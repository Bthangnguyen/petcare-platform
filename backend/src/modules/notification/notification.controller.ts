import { Router, type RequestHandler } from 'express';
import { handler, send } from '../../common/api';
import { NotificationService } from './notification.service';

/** REST endpoints of the notification center (UC25). The client polls the unread count every 30 seconds. */
export function notificationRouter(service: NotificationService, auth: RequestHandler, pollAuth: RequestHandler): Router {
  const r = Router();
  // The unread badge polls in the background without extending the idle session.
  r.get('/unread-count', pollAuth, handler((req, res) => send(req, res, { unread: service.countUnread(req.ctx!.actorId) })));
  r.use(auth);
  r.get('/', handler((req, res) => send(req, res, service.getUserNotifications(req.ctx!.actorId))));
  r.post(
    '/read-all',
    handler((req, res) => {
      service.markAllAsRead(req.ctx!.actorId);
      send(req, res, { ok: true });
    }),
  );
  r.post(
    '/:id/read',
    handler((req, res) => {
      service.markAsRead(req.ctx!.actorId, req.params.id ?? '');
      send(req, res, { ok: true });
    }),
  );
  return r;
}
