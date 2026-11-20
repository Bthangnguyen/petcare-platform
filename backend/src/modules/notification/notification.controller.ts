import { Router } from 'express';
import { handler, send } from '../../common/api';
import { NotificationService } from './notification.service';

/** REST endpoints of the notification center (UC25). The client polls the unread count every 30 seconds. */
export function notificationRouter(service: NotificationService): Router {
  const r = Router();
  r.get('/', handler((req, res) => send(req, res, service.getUserNotifications(req.ctx!.actorId))));
  r.get('/unread-count', handler((req, res) => send(req, res, { unread: service.countUnread(req.ctx!.actorId) })));
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
