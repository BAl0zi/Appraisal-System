import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function finalMigration() {
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

  console.log('Running final comprehensive migration and cleanup...');
  
  const { data: ctAppraisals, error: ctError } = await supabase
    .from('appraisals')
    .select('*')
    .eq('role', 'CLASS TEACHERS');

  if (ctError) {
    console.error('Error fetching Class Teacher appraisals:', ctError);
    return;
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const ctAppraisal of ctAppraisals) {
    const ctData = ctAppraisal.appraisal_data || {};
    const term = ctData.term;
    const year = ctData.year;
    
    if (!term || !year) continue;

    // Check if any data exists to move
    const hasObs1 = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
    const hasObs2 = ctData.observation2 && Object.keys(ctData.observation2.ratings || {}).length > 0;
    const hasTargets = ctData.targets && ctData.targets.length > 0;

    if (!hasObs1 && !hasObs2 && !hasTargets) continue;

    // Find or Create the 'TEACHERS' appraisal
    let { data: tAppraisal, error: tError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', ctAppraisal.appraisee_id)
      .eq('role', 'TEACHERS')
      .eq('appraisal_data->>term', term)
      .eq('appraisal_data->>year', year)
      .maybeSingle();

    if (!tAppraisal) {
      const { data: newAppraisal, error: createError } = await supabase
        .from('appraisals')
        .insert({
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
        })
        .select()
        .single();

      if (createError) {
        console.error(`Failed to create Teacher appraisal for ${ctAppraisal.appraisee_id}:`, createError);
        errorCount++;
        continue;
      }
      tAppraisal = newAppraisal;
    }

    const tData = tAppraisal.appraisal_data || {};
    const updatedTData = { ...tData };
    let changed = false;

    if (hasObs1) {
      updatedTData.observation1 = ctData.observation1;
      changed = true;
    }
    if (hasObs2) {
      updatedTData.observation2 = ctData.observation2;
      changed = true;
    }
    if (hasTargets) {
      updatedTData.targets = ctData.targets;
      changed = true;
    }

    if (changed) {
      await supabase.from('appraisals').update({ appraisal_data: updatedTData }).eq('id', tAppraisal.id);
      
      const cleanedCTData = { ...ctData };
      if (hasObs1) cleanedCTData.observation1 = { ratings: {}, documents: {}, comments: '', observationType: 'FIRST', status: 'PENDING' };
      if (hasObs2) cleanedCTData.observation2 = { ratings: {}, documents: {}, comments: '', observationType: 'SECOND', status: 'PENDING' };
      if (hasTargets) cleanedCTData.targets = [];
      
      await supabase.from('appraisals').update({ appraisal_data: cleanedCTData }).eq('id', ctAppraisal.id);
      processedCount++;
    }
  }

  console.log(`\n--- FINAL MIGRATION SUMMARY ---`);
  console.log(`Records processed and cleaned: ${processedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
}

finalMigration().catch(console.error);
