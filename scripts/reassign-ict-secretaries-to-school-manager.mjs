import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rolesToReassign = ['ICT MANAGER', 'SECRETARY'];

async function main() {
  const { data: schoolManagers, error: managerError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('role', 'SCHOOL MANAGER');

  if (managerError) throw managerError;
  if (!schoolManagers?.length) throw new Error('No user with role SCHOOL MANAGER was found.');
  if (schoolManagers.length > 1) {
    throw new Error(`Found multiple SCHOOL MANAGER users. Please reassign manually: ${schoolManagers.map(u => u.full_name).join(', ')}`);
  }

  const schoolManager = schoolManagers[0];

  const { data: appraisees, error: appraiseeError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', rolesToReassign);

  if (appraiseeError) throw appraiseeError;

  for (const appraisee of appraisees || []) {
    const { error: deleteError } = await supabase
      .from('appraiser_assignments')
      .delete()
      .eq('appraisee_id', appraisee.id)
      .eq('role', appraisee.role);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('appraiser_assignments')
      .insert({
        appraisee_id: appraisee.id,
        appraiser_id: schoolManager.id,
        role: appraisee.role,
      });

    if (insertError) throw insertError;

    console.log(`Assigned ${appraisee.full_name} (${appraisee.role}) to ${schoolManager.full_name}.`);
  }

  console.log(`Done. Reassigned ${appraisees?.length || 0} user(s). Existing appraisals were not changed.`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
