
import { supabaseAdmin } from '../src/lib/supabase-admin.ts';

async function cleanupUsers() {
  const emailsToDelete = [
    'teaching.staff@school.edu',
    'nonteaching.staff@school.edu',
    'classteacher@school.edu',
    'sectionhead@school.edu',
    'panelhead@school.edu',
    'multirole.user@school.edu'
  ];

  try {
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('email', emailsToDelete);

    if (userError) throw userError;

    if (!users || users.length === 0) {
      console.log('No sample users found to delete.');
      return;
    }

    for (const user of users) {
      console.log(`Removing ${user.email}...`);
      
      // 1. Delete assignments (both as appraiser and appraisee)
      await supabaseAdmin
        .from('appraiser_assignments')
        .delete()
        .or(`appraiser_id.eq.${user.id},appraisee_id.eq.${user.id}`);
      
      // 2. Delete appraisals
      await supabaseAdmin
        .from('appraisals')
        .delete()
        .eq('appraisee_id', user.id);
      
      // 3. Delete from public.users
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id);
      
      // 4. Delete from Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      console.log(`Successfully removed ${user.email}`);
    }
    console.log('Cleanup completed successfully.');
  } catch (e: any) {
    console.error('Error during cleanup:', e.message);
    process.exit(1);
  }
}

cleanupUsers();
