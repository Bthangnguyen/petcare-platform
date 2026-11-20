import { config } from '../../config';
import type { User } from './user.repository';

/** Temporary lock after repeated failed logins (UC02, A1.2; NFR-08). */
export class LoginAttemptPolicy {
  constructor(
    private readonly maxFailedAttempts = config.maxFailedLogins,
    private readonly lockMinutes = config.lockMinutes,
  ) {}

  isLocked(user: User, now: Date): boolean {
    return !!user.lockedUntil && new Date(user.lockedUntil).getTime() > now.getTime();
  }

  /** Returns the new state after a failed attempt. */
  recordFailure(user: User, now: Date): { failedLoginCount: number; lockedUntil: string | null } {
    // A lock that has expired starts a new series of attempts.
    const previous = user.lockedUntil && !this.isLocked(user, now) ? 0 : user.failedLoginCount;
    const count = previous + 1;
    if (count >= this.maxFailedAttempts) {
      return { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + this.lockMinutes * 60_000).toISOString() };
    }
    return { failedLoginCount: count, lockedUntil: null };
  }
}
