import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function verifyMigration() {
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

  console.log('Verifying data for dual-role users...');
  
  // 1. Get all Class Teachers
  const { data: ctUsers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'CLASS TEACHERS');

  if (!ctUsers) return;

  const verificationResults = [];

  for (const user of ctUsers) {
    // Find both appraisals for the current term/year (assume Term 3 2026 based on previous logs)
    const { data: appraisals } = await supabase
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', user.id)
      .contains('appraisal_data', { term: 'Term 3', year: '2026' });

    if (!appraisals || appraisals.length === 0) continue;

    const ctAppraisal = appraisals.find(a => a.role === 'CLASS TEACHERS');
    const tAppraisal = appraisals.find(a => a.role === 'TEACHERS');

    const ctData = ctAppraisal?.appraisal_data || {};
    const tData = tAppraisal?.appraisal_data || {};

    // Check if Class Teacher still has observation/targets (should be empty now)
    const ctHasObs1 = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
    const ctHasObs2 = ctData.observation2 && Object.keys(ctData.observation2.ratings || {}).length > 0;
    const ctHasTargets = ctData.targets && ctData.targets.length > 0;

    // Check if Teacher has the data
    const tHasObs1 = tData.observation1 && Object.keys(tData.observation1.ratings || {}).length > 0;
    const tHasObs2 = tData.observation2 && Object.keys(tData.observation2.ratings || {}).length > 0;
    const tHasTargets = tData.targets && tData.targets.length > 0;

    verificationResults.push({
      name: user.full_name,
      // We want these to be FALSE
      ct_Obs1: ctHasObs1,
      ct_Obs2: ctHasObs2,
      ct_Targets: ctHasTargets,
      // We want these to be TRUE if they were migrated
      t_Obs1: tHasObs1,
      t_Obs2: tHasObs2,
      t_Targets: tHasTargets,
      hasTAppraisal: !!tAppraisal
    });
  }

  console.log('\n--- VERIFICATION REPORT (Term 3 2026) ---');
  console.table(verificationResults);
  console.log('\n-----------------------------------------');
}

verifyMigration().catch(console.error);
