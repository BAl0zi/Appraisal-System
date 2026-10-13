'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function seedRequestedUsers() {
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

  const results = [];

  // 1. Find the Super Admin or Curriculum Coordinator
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .or('email.eq.superadmin@school.edu,role.eq.CURRICULUM COORDINATOR')
    .limit(1)
    .single();

  if (adminError || !adminData) {
    return { success: false, error: 'Could not find superadmin@school.edu or a Curriculum Coordinator to assign users to.' };
  }

  const managerId = adminData.id;
  console.log(`Assigning users to manager: ${adminData.email} (${adminData.id})`);

  for (const user of usersToCreate) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        results.push({ email: user.email, status: 'skipped', reason: 'Already exists' });
        continue;
      }

      // Create in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: user.fullName }
      });

      if (authError) {
        results.push({ email: user.email, status: 'error', reason: authError.message });
        continue;
      }

      // Create in public.users
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
        results.push({ email: user.email, status: 'error', reason: dbError.message });
      } else {
        // Assign to manager
        const { error: assignError } = await supabaseAdmin
          .from('appraiser_assignments')
          .insert({
            appraisee_id: authData.user.id,
            appraiser_id: managerId,
            role: null // General appraisal
          });

        if (assignError) {
          results.push({ email: user.email, status: 'partial', reason: `User created but assignment failed: ${assignError.message}` });
        } else {
          results.push({ email: user.email, status: 'success' });
        }
      }
    } catch (error: any) {
      results.push({ email: user.email, status: 'error', reason: error.message });
    }
  }

  revalidatePath('/dashboard');
  return { success: true, results };
}
