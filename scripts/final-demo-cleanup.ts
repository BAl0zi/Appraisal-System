
import { supabaseAdmin } from '../src/lib/supabase-admin.ts';

async function finalCleanup() {
  try {
    // Using ILIKE for flexible matching of 'demo' and 'teacher'/'coordinator'
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .or('email.ilike.%demo%teacher%,email.ilike.%demo%coordinator%,email.eq.classteacher@school.edu');

    if (userError) throw userError;

    if (!users || users.length === 0) {
      console.log('No further demo/sample users found.');
      return;
    }

    for (const user of users) {
      console.log(`Removing ${user.email}...`);
      
      await supabaseAdmin
        .from('appraiser_assignments')
        .delete()
        .or(`appraiser_id.eq.${user.id},appraisee_id.eq.${user.id}`);
      
      await supabaseAdmin
        .from('appraisals')
        .delete()
        .eq('appraisee_id', user.id);
      
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id);
      
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      console.log(`Successfully removed ${user.email}`);
    }
    console.log('Final cleanup completed.');
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

finalCleanup();
