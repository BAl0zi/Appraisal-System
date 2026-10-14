import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './src/lib/supabase-admin.ts';

async function analyzeMigration() {
  console.log('Starting migration analysis...');
  
  // 1. Find users who have both CLASS TEACHERS and TEACHERS roles
  // This is tricky because role is stored in the 'users' table, 
  // but the 'appraisals' table also has a 'role' column.
  
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .eq('role', 'CLASS TEACHERS'); // Start with Class Teachers

  if (!users) return;
  console.log(`Found ${users.length} Class Teachers.`);

  const report = [];

  for (const user of users) {
    // Find appraisals for this user where they are the appraisee
    const { data: appraisals } = await supabaseAdmin
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', user.id)
      .order('updated_at', { ascending: false });

    if (!appraisals || appraisals.length === 0) continue;

    // Separate Class Teacher and Teacher appraisals
    const ctAppraisal = appraisals.find(a => a.role === 'CLASS TEACHERS');
    const tAppraisal = appraisals.find(a => a.role === 'TEACHERS');

    if (ctAppraisal && tAppraisal) {
      const ctData = ctAppraisal.appraisal_data || {};
      const tData = tAppraisal.appraisal_data || {};

      // Check if Class Teacher appraisal has observation data
      const hasObservation = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
      const hasTargets = ctData.targets && ctData.targets.length > 0;

      if (hasObservation || hasTargets) {
        report.push({
          user: user.full_name,
          userId: user.id,
          ctAppraisalId: ctAppraisal.id,
          tAppraisalId: tAppraisal.id,
          hasObservation: hasObservation,
          hasTargets: hasTargets,
          term: ctData.term,
          year: ctData.year
        });
      }
    }
  }

  console.log('\n--- MIGRATION REPORT ---');
  console.log('Users affected by this move:');
  console.log(JSON.stringify(report, null, 2));
  console.log('\n-----------------------');
}

analyzeMigration();
