import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

  // 1. Find a Super Admin to act as appraiser
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'SUPER ADMIN')
    .maybeSingle();

  if (!admin) {
    console.error('No Super Admin found to act as appraiser.');
    return;
  }

  // 2. Create a new user. Since we can't use auth.signUp from a script easily,
  // we insert directly into the users table. 
  // Note: In a real app, this user wouldn't have a password/auth entry, 
  // but for testing the dashboard logic, this is sufficient.
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      full_name: 'Sample Class Teacher',
      email: `sample_teacher_${Date.now()}@example.com`,
      role: 'CLASS TEACHERS', // Primary role
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

  // 3. Create appraisal records for this user.
  // The user wants them to be a "Teacher" and "Head of Panel".
  // In this system, this means creating two appraisal entries for the same person.
  
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
  console.log(`User ID: ${newUser.id}`);
  console.log(`Appraiser ID: ${admin.id}`);
}

createSampleUser().catch(console.error);
