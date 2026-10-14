import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function checkAndrew() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: appraisals } = await supabase
    .from('appraisals')
    .select('*')
    .eq('appraisee_id', 'f460d793-c198-4c39-bfb0-2882c7ddb530');

  console.log('Checking data for Andrew...');
  appraisals.forEach(a => {
    console.log(`Role: ${a.role}, Status: ${a.status}, Obs1: ${Object.keys(a.appraisal_data?.observation1?.ratings || {}).length}, Obs2: ${Object.keys(a.appraisal_data?.observation2?.ratings || {}).length}, Targets: ${a.appraisal_data?.targets?.length || 0}`);
  });
}

checkAndrew().catch(console.error);
