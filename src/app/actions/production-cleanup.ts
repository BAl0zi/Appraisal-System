'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function resetSystemForProduction(directorEmail?: string, directorPassword?: string) {
  try {
    let directorId: string | null = null;
    
    // 1. Identify or Create Director
    if (directorEmail) {
        // Check if exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', directorEmail)
            .single();

        if (existingUser) {
            directorId = existingUser.id;
            // Ensure they have DIRECTOR role
            await supabaseAdmin
                .from('users')
                .update({ role: 'DIRECTOR' })
                .eq('id', directorId);
        } else if (directorPassword) {
            // Create new Director
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: directorEmail,
                password: directorPassword,
                email_confirm: true,
                user_metadata: { full_name: 'System Director' }
            });
            
            if (authError) throw new Error(`Failed to create director auth: ${authError.message}`);
            if (!authData.user) throw new Error('No user returned for director creation');

            directorId = authData.user.id;
            
            const { error: dbError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: directorId,
                    email: directorEmail,
                    role: 'DIRECTOR',
                    full_name: 'System Director',
                    created_at: new Date().toISOString(),
                    is_password_changed: true
                });

            if (dbError) throw new Error(`Failed to create director db record: ${dbError.message}`);
        }
    }

    // 2. Find ALL Directors (including the one we just ensured) to preserve
    const { data: directors, error: directorError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('role', 'DIRECTOR');

    if (directorError) {
      throw new Error(`Failed to fetch directors: ${directorError.message}`);
    }

    const directorIds = directors?.map(d => d.id) || [];
    const directorEmails = directors?.map(d => d.email) || [];

    console.log('Preserving Directors:', directorEmails);

    // 3. Delete all appraisals
    const { error: appraisalDeleteError } = await supabaseAdmin
        .from('appraisals')
        .delete()
        .not('id', 'is', null);

    if (appraisalDeleteError) {
        throw new Error(`Failed to delete appraisals: ${appraisalDeleteError.message}`);
    }

    // 4. Delete all assignments
    const { error: assignmentDeleteError } = await supabaseAdmin
        .from('appraiser_assignments')
        .delete()
        .not('id', 'is', null);

    if (assignmentDeleteError) {
        throw new Error(`Failed to delete assignments: ${assignmentDeleteError.message}`);
    }

    // 5. Delete Users from public.users (except Directors)
    let userQuery = supabaseAdmin.from('users').delete();
    
    if (directorIds.length > 0) {
        // .not('id', 'in', ...) expects a list syntax for postgres or filtered array
        // Supabase .not('id', 'in', (list)) syntax:
        userQuery = userQuery.not('id', 'in', `(${directorIds.join(',')})`);
    } else {
        userQuery = userQuery.not('id', 'is', null);
    }

    const { error: userDeleteError } = await userQuery;

    if (userDeleteError) {
        throw new Error(`Failed to delete public users: ${userDeleteError.message}`);
    }

    // 6. Delete Users from Auth (except Directors)
    // Fetch in batches to handle pagination (default limit is 50)
    let hasMoreUsers = true;
    let deletedCount = 0;

    while (hasMoreUsers) {
        // Fetch a large batch
        const { data: { users: authUsers }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });
        
        if (listUsersError) {
             throw new Error(`Failed to list auth users: ${listUsersError.message}`);
        }

        const usersToDelete = authUsers.filter(u => !directorIds.includes(u.id));
        
        if (usersToDelete.length === 0) {
            // No actionable users in this batch.
            // If the batch size was less than requested, we are at the end.
            // If the batch was full but all were directors, we might need to check next page?
            // But since we are deleting non-directors, eventually page 1 will only contain directors.
            // If ALL users in the system are Directors, we stop.
            hasMoreUsers = false;
        } else {
            console.log(`Found ${usersToDelete.length} users to delete in this batch...`);
            
            // Delete sequentially to avoid rate limits
            for (const user of usersToDelete) {
                const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
                if (deleteAuthError) {
                    console.error(`Failed to delete auth user ${user.email}:`, deleteAuthError);
                } else {
                    deletedCount++;
                }
            }
            
            // We deleted users, so the list has changed. Loop again to fetch the next batch (which is now page 1).
        }
    }

    revalidatePath('/');
    return { success: true, message: `System reset complete. Preserved Directors: ${directorEmails.join(', ')}. Deleted ${deletedCount} other users.` };

  } catch (error: any) {
    console.error('Reset failed:', error);
    return { success: false, error: error.message };
  }
}

