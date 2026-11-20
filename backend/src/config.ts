import path from 'node:path';

/** Configuration values of the application server (environment variables with defaults). */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  /** SQLite database file used by the Sprint 4 build. The target database is PostgreSQL (see SAD, section 5). */
  dbFile: process.env.DB_FILE ?? path.resolve(__dirname, '../data/petcare.db'),
  /** Idle time after which a session ends (UC02, A4; NFR-08): 30 minutes. */
  sessionIdleSeconds: Number(process.env.SESSION_IDLE_SECONDS ?? 30 * 60),
  /** Login lock after repeated failures (UC02, A1; NFR-08): 5 failures, 15 minutes. */
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS ?? 5),
  lockMinutes: Number(process.env.LOCK_MINUTES ?? 15),
  /** A booking can be cancelled online until this number of hours before it starts (UC09, A1). */
  cancelLimitHours: Number(process.env.CANCEL_LIMIT_HOURS ?? 2),
  /** Time zone offset of the users: UTC+7 (NFR-03). */
  utcOffsetHours: 7,
  /** Folder of the built React user interface that the server delivers. */
  frontendDist: process.env.FRONTEND_DIST ?? path.resolve(__dirname, '../../frontend/dist'),
  secureCookie: process.env.NODE_ENV === 'production',
};

export type Config = typeof config;
