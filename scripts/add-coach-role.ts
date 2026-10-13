
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function addCoachRole() {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, additional_roles')
      .eq('email', 'multirole.user@school.edu')
      .single();

    if (userError || !user) throw new Error('Multi-role user not found');

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'superadmin@school.edu')
      .single();

    if (adminError || !admin) throw new Error('Superadmin not found');

    const currentAdditionalRoles = user.additional_roles || [];
    if (!currentAdditionalRoles.includes('COACH')) {
      const updatedRoles = [...currentAdditionalRoles, 'COACH'];
      
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ additional_roles: updatedRoles })
        .eq('id', user.id);

      if (updateError) throw updateError;
      console.log('Added COACH to user additional roles.');
    } else {
      console.log('User already has COACH role.');
    }

    const { error: assignError } = await supabaseAdmin
      .from('appraiser_assignments')
      .insert({
        appraisee_id: user.id,
        appraiser_id: admin.id,
        role: 'COACH'
      });

    if (assignError) throw assignError;

    console.log('Successfully assigned COACH role to superadmin for multirole.user');
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

addCoachRole();
