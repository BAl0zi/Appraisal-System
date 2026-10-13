
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function assignRoles() {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'multirole.user@school.edu')
      .single();

    if (userError || !user) throw new Error('Multi-role user not found');

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'superadmin@school.edu')
      .single();

    if (adminError || !admin) throw new Error('Superadmin not found');

    const rolesToAssign = ['TEACHERS', 'CLASS TEACHERS', 'HEAD OF PANELS', 'SECTION HEAD JUNIOR SCHOOL'];
    const assignments = rolesToAssign.map(role => ({
      appraisee_id: user.id,
      appraiser_id: admin.id,
      role: role
    }));

    // First, clear existing general assignments for this user to avoid conflicts
    await supabaseAdmin
      .from('appraiser_assignments')
      .delete()
      .eq('appraisee_id', user.id)
      .is('role', null);

    const { error: insertError } = await supabaseAdmin
      .from('appraiser_assignments')
      .insert(assignments);

    if (insertError) throw insertError;

    console.log('Successfully assigned all roles for multirole.user to superadmin');
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

assignRoles();
