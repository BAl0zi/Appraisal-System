
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  const defaultPassword = 'Password123!';
  
  const usersToCreate = [
    { email: 'teaching.staff@school.edu', fullName: 'Teaching Staff Sample', role: 'TEACHERS', jobCategory: 'TEACHING' },
    { email: 'nonteaching.staff@school.edu', fullName: 'Non-Teaching Staff Sample', role: 'SECRETARY', jobCategory: 'NON_TEACHING' },
    { email: 'classteacher@school.edu', fullName: 'Class Teacher Sample', role: 'CLASS TEACHERS', jobCategory: 'TEACHING' },
    { email: 'sectionhead@school.edu', fullName: 'Section Head Sample', role: 'SECTION HEAD JUNIOR SCHOOL', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
    { email: 'panelhead@school.edu', fullName: 'Panel Head Sample', role: 'HEAD OF PANELS', jobCategory: 'FIRSTLINE_LEADERSHIP' },
    { 
      email: 'multirole.user@school.edu', 
      fullName: 'Multi Role User', 
      role: 'TEACHERS', 
      jobCategory: 'TEACHING', 
      additionalRoles: ['CLASS TEACHERS', 'HEAD OF PANELS', 'SECTION HEAD JUNIOR SCHOOL'] 
    },
  ];

  console.log('Finding manager...');
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .or('email.eq.superadmin@school.edu,role.eq.CURRICULUM COORDINATOR')
    .limit(1)
    .single();

  if (adminError || !adminData) {
    console.error('Could not find superadmin@school.edu or a Curriculum Coordinator to assign users to.');
    process.exit(1);
  }

  const managerId = adminData.id;
  console.log(`Assigning users to manager: ${adminData.email} (${managerId})`);

  for (const user of usersToCreate) {
    try {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`Skipped: ${user.email} (Already exists)`);
        continue;
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: user.fullName }
      });

      if (authError) {
        console.error(`Error creating auth for ${user.email}: ${authError.message}`);
        continue;
      }

      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          role: user.role,
          full_name: user.fullName,
          job_category: user.jobCategory,
          additional_roles: user.additionalRoles || [],
          is_password_changed: true
        });

      if (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.error(`Error inserting DB for ${user.email}: ${dbError.message}`);
      } else {
        const { error: assignError } = await supabaseAdmin
          .from('appraiser_assignments')
          .insert({
            appraisee_id: authData.user.id,
            appraiser_id: managerId,
            role: null
          });

        if (assignError) {
          console.log(`User ${user.email} created but assignment failed: ${assignError.message}`);
        } else {
          console.log(`Successfully created and assigned: ${user.email}`);
        }
      }
    } catch (error: any) {
      console.error(`Exception for ${user.email}: ${error.message}`);
    }
  }
}

run().catch(console.error);
