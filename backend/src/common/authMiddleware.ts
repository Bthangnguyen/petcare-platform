import type { NextFunction, Request, Response } from 'express';
import { IdentityAccessService } from '../modules/identity/identity.service';
import { forbidden } from './errors';

export const SESSION_COOKIE = 'sid';

/** AuthMiddleware: loads the server-side session and creates the RequestContext (never from client data). */
export function authenticate(identity: IdentityAccessService) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = identity.validateSession(req.cookies?.[SESSION_COOKIE]);
      req.ctx = { actorId: user.id, roles: [user.role], requestId: req.requestId ?? '' };
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Role check of a route; object-level checks are done in the services. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.ctx || !req.ctx.roles.some((r) => roles.includes(r))) return next(forbidden());
    next();
  };
}
