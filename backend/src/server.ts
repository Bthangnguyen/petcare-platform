import { createApp } from './app';
import { config } from './config';
import { openDatabase } from './db/database';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDemoData } from './db/seed';

const db = openDatabase(config.dbFile);
const empty = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c === 0;
if (empty) seedDemoData(db);

const app = createApp(db);
app.listen(config.port, () => {
  console.log(`Pet Care Platform is running at http://localhost:${config.port}`);
  console.log(`Database file: ${config.dbFile}${empty ? ' (demo data created)' : ''}`);
  console.log(`Demo accounts (password ${DEMO_PASSWORD}):`);
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.email.padEnd(26)} ${a.role.padEnd(15)} ${a.note}`);
});
