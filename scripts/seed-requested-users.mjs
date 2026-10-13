
import { seedRequestedUsers } from '../src/app/actions/seed-requested-users.js';

async function run() {
  console.log('Starting seeding of requested users...');
  const result = await seedRequestedUsers();
  if (result.success) {
    console.log('Seeding completed successfully:');
    console.table(result.results);
  } else {
    console.error('Seeding failed:', result.error);
  }
}

run().catch(console.error);
