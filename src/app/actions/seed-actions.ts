'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { LEADERSHIP_SAMPLE_DATA } from '@/lib/sample-data';
import { revalidatePath } from 'next/cache';

export async function seedLeadershipUsers() {
  const results = [];
  const defaultPassword = 'password123';

  for (const user of LEADERSHIP_SAMPLE_DATA) {
    try {
      // Check if user already exists in DB to avoid duplicates
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        results.push({ email: user.email, status: 'skipped', reason: 'Already exists' });
        continue;
      }

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: user.full_name }
      });

      if (authError) {
        results.push({ email: user.email, status: 'error', reason: authError.message });
        continue;
      }

      if (!authData.user) {
        results.push({ email: user.email, status: 'error', reason: 'No user returned' });
        continue;
      }

      // 2. Add to public.users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          job_category: user.jobCategory,
          created_at: new Date().toISOString(),
          is_password_changed: true // Set to true so they don't have to change it immediately for testing
        });

      if (dbError) {
        // Try to clean up auth user if DB insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        results.push({ email: user.email, status: 'error', reason: dbError.message });
      } else {
        results.push({ email: user.email, status: 'success' });
      }

    } catch (error: any) {
      results.push({ email: user.email, status: 'error', reason: error.message });
    }
  }

  revalidatePath('/dashboard');
  return { success: true, results };
}
