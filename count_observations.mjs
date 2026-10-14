import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function countObservations() {
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

  console.log('Counting lesson observations for Class Teachers...');
  
  const { data: appraisals, error } = await supabase
    .from('appraisals')
    .select('id, appraisee_id, appraisal_data')
    .eq('role', 'CLASS TEACHERS');

  if (error) {
    console.error('Error fetching appraisals:', error);
    return;
  }

  let count = 0;
  const completedList = [];

  if (appraisals) {
    appraisals.forEach(a => {
      const data = a.appraisal_data || {};
      // Check if observation1 has any ratings
      if (data.observation1 && Object.keys(data.observation1.ratings || {}).length > 0) {
        count++;
        completedList.push(a.id);
      }
    });
  }

  console.log('\n--- OBSERVATION COUNT ---');
  console.log(`Total Class Teacher appraisals found: ${appraisals?.length || 0}`);
  console.log(`Number of those with Lesson Observations filled: ${count}`);
  console.log('\n-------------------------');
}

countObservations().catch(console.error);
