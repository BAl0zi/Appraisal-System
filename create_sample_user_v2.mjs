import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function createSampleUser() {
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

  console.log('Creating sample user...');

  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'SUPER ADMIN')
    .maybeSingle();

  if (!admin) {
    console.error('No Super Admin found to act as appraiser.');
    return;
  }

  // Use uuid for the ID since the DB requires a not-null UUID
  const userId = uuidv4();

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      full_name: 'Sample Class Teacher',
      email: `sample_teacher_${Date.now()}@example.com`,
      role: 'CLASS TEACHERS',
      job_category: 'FIRSTLINE_LEADERSHIP',
      is_password_changed: true
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError);
    return;
  }

  console.log(`Created user: ${newUser.full_name} (ID: ${newUser.id})`);

  const appraisalsToCreate = [
    { role: 'TEACHERS', label: 'Teacher' },
    { role: 'HEAD OF PANELS', label: 'Head of Panel' }
  ];

  for (const app of appraisalsToCreate) {
    const { error: appError } = await supabase
      .from('appraisals')
      .insert({
        appraisee_id: newUser.id,
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

    if (appError) {
      console.error(`Error creating ${app.label} appraisal:`, appError);
    } else {
      console.log(`Created ${app.label} appraisal record.`);
    }
  }

  console.log('\nSample setup complete.');
}

createSampleUser().catch(console.error);
