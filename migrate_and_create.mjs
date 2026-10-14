import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function migrateWithAutoCreate() {
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

  console.log('Starting data migration with auto-creation of Teacher appraisals...');
  
  const { data: ctAppraisals, error: ctError } = await supabase
    .from('appraisals')
    .select('*')
    .eq('role', 'CLASS TEACHERS');

  if (ctError) {
    console.error('Error fetching Class Teacher appraisals:', ctError);
    return;
  }

  let createdAndMigratedCount = 0;
  let alreadyExistedAndMigratedCount = 0;
  let errorCount = 0;

  for (const ctAppraisal of ctAppraisals) {
    const ctData = ctAppraisal.appraisal_data || {};
    const hasObservation = ctData.observation1 && Object.keys(ctData.observation1.ratings || {}).length > 0;
    const hasTargets = ctData.targets && ctData.targets.length > 0;

    if (!hasObservation && !hasTargets) continue;

    const term = ctData.term;
    const year = ctData.year;

    // 1. Find or Create the 'TEACHERS' appraisal
    let { data: tAppraisal, error: tError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('appraisee_id', ctAppraisal.appraisee_id)
      .eq('role', 'TEACHERS')
      .eq('appraisal_data->>term', term)
      .eq('appraisal_data->>year', year)
      .maybeSingle();

    let isNew = false;
    if (tError || !tAppraisal) {
      console.log(`Creating missing Teacher appraisal for user ${ctAppraisal.appraisee_id} (${term} ${year})...`);
      
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

      if (createError || !newAppraisal) {
        console.error(`Failed to create Teacher appraisal for ${ctAppraisal.appraisee_id}:`, createError);
        errorCount++;
        continue;
      }
      tAppraisal = newAppraisal;
      isNew = true;
    }

    // 2. Merge data
    const tData = tAppraisal.appraisal_data || {};
    const updatedTData = { ...tData };

    let changed = false;
    if (hasObservation) {
      updatedTData.observation1 = ctData.observation1;
      changed = true;
    }
    if (ctData.observation2 && Object.keys(ctData.observation2.ratings || {}).length > 0) {
      updatedTData.observation2 = ctData.observation2;
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

      // 3. Clean up Class Teacher record
      const cleanedCTData = { ...ctData };
      if (hasObservation) {
        cleanedCTData.observation1 = {
          ratings: {}, documents: {}, comments: '', observationType: 'FIRST', status: 'PENDING'
        };
      }
      if (ctData.observation2 && Object.keys(ctData.observation2.ratings || {}).length > 0) {
        cleanedCTData.observation2 = {
          ratings: {}, documents: {}, comments: '', observationType: 'SECOND', status: 'PENDING'
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

      if (isNew) createdAndMigratedCount++;
      else alreadyExistedAndMigratedCount++;
      
      console.log(`Migrated data for user ${ctAppraisal.appraisee_id} (${term} ${year}) ${isNew ? '[Created New Record]' : '[Updated Existing]'}`);
    }
  }

  console.log('\n--- FINAL MIGRATION SUMMARY ---');
  console.log(`New Teacher records created and populated: ${createdAndMigratedCount}`);
  console.log(`Existing Teacher records updated: ${alreadyExistedAndMigratedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
  console.log('-------------------------------');
}

migrateWithAutoCreate().catch(console.error);
