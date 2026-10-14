import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function analyzeRoles() {
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

  console.log('Analyzing users with multiple roles...');
  
  // Fetch all users with their roles
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, role');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const dualRoleUsers = [];

  for (const user of users) {
    const role = user.role || '';
    const roleUpper = role.toUpperCase();
    
    // Check if the role contains both "TEACHER" and "CLASS TEACHER"
    // Since the user mentioned "system role or additional roles", 
    // we check if the role string contains both keywords.
    const isTeacher = roleUpper.includes('TEACHER') && !roleUpper.includes('CLASS');
    const isClassTeacher = roleUpper.includes('CLASS TEACHER');
    
    // If the role is exactly "CLASS TEACHERS", it's a class teacher.
    // If it's "TEACHERS", it's a teacher.
    // If it's "CLASS TEACHER, TEACHER", it's both.
    
    if (isClassTeacher && (roleUpper.includes('TEACHER') || roleUpper.includes('TEACHING'))) {
        // If they are a class teacher, they are inherently a teacher, 
        // but we are looking for those who might have both roles explicitly assigned 
        // or a combined role string.
        dualRoleUsers.push({
            name: user.full_name,
            role: user.role
        });
    }
  }

  console.log('\n--- DUAL ROLE REPORT ---');
  if (dualRoleUsers.length === 0) {
    console.log('No users found with both roles in their role string.');
  } else {
    console.log('Users identified as both Class Teachers and Teachers:');
    console.table(dualRoleUsers);
  }
  console.log('\n-----------------------');
}

analyzeRoles().catch(console.error);
