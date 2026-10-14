import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function backupAndDeepMigrate() {
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

  console.log('Starting Deep Migration and Backup...');

  const { data: allAppraisals, error: fetchError } = await supabase.from('appraisals').select('*');
  if (fetchError) return console.error(fetchError);
  fs.writeFileSync(`appraisals_backup_${Date.now()}.json`, JSON.stringify(allAppraisals, null, 2));

  const ctAppraisals = allAppraisals.filter(a => a.role === 'CLASS TEACHERS');

  let migratedCount = 0;

  for (const ctAppraisal of ctAppraisals) {
    const ctData = ctAppraisal.appraisal_data || {};
    const term = ctData.term;
    const year = ctData.year;
    if (!term || !year) continue;

    const hasObs1 = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
    const hasObs2 = ctData.observation2 && Object.keys(ctData.observation2.ratings || {}).length > 0;
    const hasTargets = ctData.targets && ctData.targets.length > 0;

    if (!hasObs1 && !hasObs2 && !hasTargets) continue;

    // Find Teacher appraisal using JS filter instead of JSONB query
    const tAppraisal = allAppraisals.find(a => 
      a.appraisee_id === ctAppraisal.appraisee_id && 
      a.role === 'TEACHERS' && 
      a.appraisal_data?.term === term && 
      a.appraisal_data?.year === year
    );

    let targetAppraisalId;
    if (tAppraisal) {
      targetAppraisalId = tAppraisal.id;
    } else {
      const { data: newApp, error: createError } = await supabase.from('appraisals').insert({
        appraisee_id: ctAppraisal.appraisee_id,
        appraiser_id: ctAppraisal.appraiser_id,
        role: 'TEACHERS',
        status: 'DRAFT',
        appraisal_data: {
          term: term,
          year: year,
          targets: [],
          observation1: { ratings: {}, documents: {}, comments: '', observationType: 'FIRST', status: 'PENDING' },
          observation2: { ratings: {}, documents: {}, comments: '', observationType: 'SECOND', status: 'PENDING' },
          evaluation: { ratings: {}, progressComments: ['', ''], improvementComments: ['', ''] }
        }
      }).select().single();

      if (createError) {
        console.error(`Error creating record for ${ctAppraisal.appraisee_id}:`, createError);
        continue;
      }
      targetAppraisalId = newApp.id;
    }

    const tAppraisalCurrent = allAppraisals.find(a => a.id === targetAppraisalId) || { appraisal_data: {} };
    const updatedTData = { ...tAppraisalCurrent.appraisal_data, ...{
      observation1: hasObs1 ? ctData.observation1 : tAppraisalCurrent.appraisal_data?.observation1,
      observation2: hasObs2 ? ctData.observation2 : tAppraisalCurrent.appraisal_data?.observation2,
      targets: hasTargets ? ctData.targets : tAppraisalCurrent.appraisal_data?.targets
    }};

    await supabase.from('appraisals').update({ appraisal_data: updatedTData }).eq('id', targetAppraisalId);
    
    const cleanedCTData = { ...ctData };
    if (hasObs1) cleanedCTData.observation1 = { ratings: {}, documents: {}, comments: '', observationType: 'FIRST', status: 'PENDING' };
    if (hasObs2) cleanedCTData.observation2 = { ratings: {}, documents: {}, comments: '', observationType: 'SECOND', status: 'PENDING' };
    if (hasTargets) cleanedCTData.targets = [];
    
    await supabase.from('appraisals').update({ appraisal_data: cleanedCTData }).eq('id', ctAppraisal.id);
    migratedCount++;
  }

  console.log(`\n--- FINAL DEEP MIGRATION SUMMARY ---`);
  console.log(`Records processed and cleaned: ${migratedCount}`);
}

backupAndDeepMigrate().catch(console.error);
