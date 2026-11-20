import { Router } from 'express';
import { config } from '../../config';
import { handler, send, validate } from '../../common/api';
import { SESSION_COOKIE, authenticate } from '../../common/authMiddleware';
import { IdentityAccessService, loginSchema, registrationSchema } from './identity.service';

/** REST endpoints for registration, login and logout (UC01, UC02). */
export function identityRouter(identity: IdentityAccessService): Router {
  const r = Router();

  r.post(
    '/register',
    handler((req, res) => {
      const input = validate(registrationSchema, req.body);
      send(req, res, identity.registerAccount(input), 201);
    }),
  );

  r.post(
    '/login',
    handler((req, res) => {
      const input = validate(loginSchema, req.body);
      const { sessionId, user } = identity.authenticate(input.email, input.password);
      res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', secure: config.secureCookie, path: '/' });
      send(req, res, user);
    }),
  );

  r.post(
    '/logout',
    handler((req, res) => {
      identity.logout(req.cookies?.[SESSION_COOKIE]);
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      send(req, res, { loggedOut: true });
    }),
  );

  r.get(
    '/me',
    authenticate(identity),
    handler((req, res) => {
      const user = identity.validateSession(req.cookies?.[SESSION_COOKIE]);
      send(req, res, user);
    }),
  );

  return r;
}
