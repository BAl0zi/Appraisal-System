import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function migrateData() {
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

  console.log('Starting data migration from Class Teacher to Teacher appraisals...');
  
  // 1. Find all appraisals for 'CLASS TEACHERS'
  const { data: ctAppraisals, error: ctError } = await supabase
    .from('appraisals')
    .select('*')
    .eq('role', 'CLASS TEACHERS');

  if (ctError) {
    console.error('Error fetching Class Teacher appraisals:', ctError);
    return;
  }

  let movedCount = 0;
  let errorCount = 0;

  for (const ctAppraisal of ctAppraisals) {
    const ctData = ctAppraisal.appraisal_data || {};
    const hasObservation = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
    const hasTargets = ctData.targets && ctData.targets.length > 0;

    if (!hasObservation && !hasTargets) continue;

    // 2. Find the corresponding 'TEACHERS' appraisal for the same user, term, and year
    const { data: tAppraisal, error: tError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', ctAppraisal.appraisee_id)
      .eq('role', 'TEACHERS')
      .eq('appraisal_data->>term', ctData.term)
      .eq('appraisal_data->>year', ctData.year)
      .maybeSingle();

    if (tError || !tAppraisal) {
      console.log(`Could not find matching Teacher appraisal for user ${ctAppraisal.appraisee_id} (${ctData.term} ${ctData.year})`);
      errorCount++;
      continue;
    }

    // 3. Merge data into the Teacher appraisal
    const tData = tAppraisal.appraisal_data || {};
    const updatedTData = { ...tData };

    let changed = false;

    if (hasObservation) {
      // Only move if the Teacher record doesn't have observation data yet, or we want to overwrite it
      updatedTData.observation1 = ctData.observation1;
      changed = true;
    }

    if (hasTargets) {
      updatedTData.targets = ctData.targets;
      changed = true;
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from('appraisals')
        .update({ appraisal_data: updatedTData })
        .eq('id', tAppraisal.id);

      if (updateError) {
        console.error(`Error updating Teacher appraisal ${tAppraisal.id}:`, updateError);
        errorCount++;
        continue;
      }

      // 4. Remove the data from the Class Teacher record to clean up scoresheets
      const cleanedCTData = { ...ctData };
      if (hasObservation) {
        // We reset observation1 to a default structure to avoid breaking the UI
        cleanedCTData.observation1 = {
          ratings: {}, 
          documents: {}, 
          comments: '',
          observationType: 'FIRST',
          status: 'PENDING'
        };
      }
      if (hasTargets) {
        cleanedCTData.targets = [];
      }

      const { error: cleanError } = await supabase
        .from('appraisals')
        .update({ appraisal_data: cleanedCTData })
        .eq('id', ctAppraisal.id);

      if (cleanError) {
        console.error(`Error cleaning up Class Teacher appraisal ${ctAppraisal.id}:`, cleanError);
        errorCount++;
        continue;
      }

      movedCount++;
      console.log(`Successfully migrated data for user ${ctAppraisal.appraisee_id} (${ctData.term} ${ctData.year})`);
    }
  }

  console.log('\n--- MIGRATION COMPLETED ---');
  console.log(`Records successfully migrated: ${movedCount}`);
  console.log(`Records that failed or were skipped: ${errorCount}`);
  console.log('---------------------------');
}

migrateData().catch(console.error);
