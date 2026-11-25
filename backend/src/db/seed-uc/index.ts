import type { Db } from '../database';
import type { SeedContext } from './context';
import { seedUc12 } from './uc12';
import { seedUc13 } from './uc13';
import { seedUc14 } from './uc14';
import { seedUc16 } from './uc16';
import { seedUc17 } from './uc17';
import { seedUc20 } from './uc20';
import { seedUc21 } from './uc21';
import { seedUc24 } from './uc24';

export type { SeedContext } from './context';

/** Runs the demo-data hook of every use case of Sprint 5 (one file per use case). */
export function seedSprint5(db: Db, ctx: SeedContext): void {
  seedUc12(db, ctx);
  seedUc13(db, ctx);
  seedUc14(db, ctx);
  seedUc16(db, ctx);
  seedUc17(db, ctx);
  seedUc20(db, ctx);
  seedUc21(db, ctx);
  seedUc24(db, ctx);
}
