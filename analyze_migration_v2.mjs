import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function analyzeMigration() {
  // Load env variables from .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Starting migration analysis...');
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('role', 'CLASS TEACHERS');

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  if (!users) return;
  console.log(`Found ${users.length} Class Teachers.`);

  const report = [];

  for (const user of users) {
    const { data: appraisals, error: appError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', user.id)
      .order('updated_at', { ascending: false });

    if (appError || !appraisals) continue;

    const ctAppraisal = appraisals.find(a => a.role === 'CLASS TEACHERS');
    const tAppraisal = appraisals.find(a => a.role === 'TEACHERS');

    if (ctAppraisal && tAppraisal) {
      const ctData = ctAppraisal.appraisal_data || {};
      const tData = tAppraisal.appraisal_data || {};

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
  if (report.length === 0) {
    console.log('No users found matching the criteria for migration.');
  } else {
    console.log('Users who would have their data moved from Class Teacher -> Teacher appraisal:');
    console.table(report);
  }
  console.log('\n-----------------------');
}

analyzeMigration().catch(console.error);
