
import { supabaseAdmin } from '../src/lib/supabase-admin.ts';

async function createCoachUser() {
  const userDetails = {
    email: 'coach.sample@school.edu',
    fullName: 'Coach Sample User',
    role: 'COACH',
    jobCategory: 'TEACHING'
  };
  const defaultPassword = 'Password123!';

  try {
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'superadmin@school.edu')
      .single();

    if (adminError || !admin) throw new Error('Superadmin not found');

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userDetails.email)
      .single();

    let userId = existingUser?.id;

    if (!userId) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userDetails.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: userDetails.fullName }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: userDetails.email,
          role: userDetails.role,
          full_name: userDetails.fullName,
          job_category: userDetails.jobCategory,
          is_password_changed: true
        });

      if (dbError) throw dbError;
      userId = authData.user.id;
      console.log('Created Coach user successfully.');
    } else {
      console.log('Coach user already exists.');
    }

    await supabaseAdmin
      .from('appraiser_assignments')
      .delete()
      .eq('appraisee_id', userId);

    const { error: assignError } = await supabaseAdmin
      .from('appraiser_assignments')
      .insert({
        appraisee_id: userId,
        appraiser_id: admin.id,
        role: null
      });

    if (assignError) throw assignError;
    console.log('Assigned Coach to Super Admin.');

  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

createCoachUser();
