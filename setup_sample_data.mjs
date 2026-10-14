import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function setupSampleAppraisals() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Use a real existing user from the list to avoid FK constraints
  // Let's use 'Desmond Onyango Ochino' as our sample
  const targetUserId = '2211ad54-dc11-4be8-ae63-19561ce3aad8'; 
  
  console.log(`Setting up sample appraisals for user ${targetUserId}...`);

  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'SUPER ADMIN')
    .maybeSingle();

  if (!admin) {
    console.error('No Super Admin found.');
    return;
  }

  // 1. Update user role to CLASS TEACHERS so they qualify for the leadership dashboard
  await supabase
    .from('users')
    .update({ role: 'CLASS TEACHERS' })
    .eq('id', targetUserId);

  // 2. Create the appraisals
  const appraisalsToCreate = [
    { role: 'TEACHERS', label: 'Teacher' },
    { role: 'HEAD OF PANELS', label: 'Head of Panel' }
  ];

  for (const app of appraisalsToCreate) {
    // First, remove any existing appraisals for this user/role/term to avoid duplicates
    await supabase
      .from('appraisals')
      .delete()
      .eq('appraisee_id', targetUserId)
      .eq('role', app.role)
      .eq('appraisal_data->>term', 'Term 3')
      .eq('appraisal_data->>year', '2026');

    const { error: appError } = await supabase
      .from('appraisals')
      .insert({
        appraisee_id: targetUserId,
        appraiser_id: admin.id,
        role: app.role,
        status: 'DRAFT',
        appraisal_data: {
          term: 'Term 3',
          year: '2026',
          targets: [],
          observation1: { ratings: {}, documents: {}, comments: '', observationType: 'FIRST', status: 'PENDING' },
          observation2: { ratings: {}, documents: {}, comments: '', observationType: 'SECOND', status: 'PENDING' },
          evaluation: { ratings: {}, progressComments: ['', ''], improvementComments: ['', ''] }
        }
      });

    if (appError) console.error(`Error creating ${app.label} appraisal:`, appError);
    else console.log(`Created ${app.label} appraisal.`);
  }

  console.log('\nSample setup complete for Desmond.');
}

setupSampleAppraisals().catch(console.error);
