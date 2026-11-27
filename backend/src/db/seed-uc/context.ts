import type { Db } from '../database';

/** What a seed hook of a use case can use: the accounts by e-mail and the ids of the demo entities (see seed.ts). */
export interface SeedContext {
  now: Date;
  createdAt: string;
  /** user id by e-mail, for example users['an.owner@example.com'] */
  users: Record<string, string>;
  /** ids of the demo pets, facilities, services, staff members and bookings, for example ids.spa, ids.hang, ids.bSpaCompleted */
  ids: Record<string, string>;
}

export type SeedHook = (db: Db, ctx: SeedContext) => void;
