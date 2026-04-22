'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { UserRole, ROLES } from '@/constants/roles'

export type ImportResult = {
  email: string
  fullName: string
  password?: string
  status: 'success' | 'error'
  message: string
}

function generatePassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let retVal = ""
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n))
  }
  return retVal
}

export async function bulkImportUsers(users: any[], replaceExisting: boolean = false): Promise<ImportResult[]> {
  const results: ImportResult[] = []

  for (const user of users) {
    const email = user.Email?.trim()
    const fullName = user['Full Name']?.trim()
    let role = user.Role?.trim().toUpperCase()
    const jobCategory = user['Job Category']?.trim()
    
    // Normalize common role mismatches
    if (role === 'TEACHER') role = 'TEACHERS'
    if (role === 'DRIVER') role = 'DRIVERS'
    if (role === 'COOK') role = 'COOKS'
    if (role === 'CLEANER') role = 'CLEANERS'
    if (role === 'CARETAKER') role = 'CARETAKERS'

    // Handle Additional Roles (comma separated in excel)
    const additionalRolesStr = user['Additional Roles'] || ''
    const additionalRoles = String(additionalRolesStr)
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0)

    if (!email || !fullName || !role) {
      results.push({
        email: email || 'Unknown',
        fullName: fullName || 'Unknown',
        status: 'error',
        message: 'Missing required fields (Email, Full Name, or Role)'
      })
      continue
    }

    if (!ROLES.includes(role as UserRole)) {
       results.push({
        email: email,
        fullName: fullName,
        status: 'error',
        message: `Invalid Role: ${role}.`
      })
      continue
    }

    try {
        // Check if user exists and handle replacement
        if (replaceExisting) {
            // Try to find user by email in public.users to get ID
            // We use public.users because listing auth users is harder without ID
            // But if they are only in Auth, we might miss them. 
            // Better approach: Try to create, if error "already registered", then delete and retry (as we have email).
            // Actually, we can't delete by email via Admin API directly without ID.
            
            // So, let's look up in public.users first.
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
            
            if (existingUser) {
                // Delete from Auth (cascades to public.users usually due to FK, but let's be safe)
                // Actually in Supabase Auth, deleting user deletes from auth.users. 
                // If public.users has ON DELETE CASCADE on 'id', it goes too.
                await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            } else {
                 // If not in public.users, they might still be in Auth.
                 // We can search for them in Auth via listUsers filtering by email
                 // But listUsers is expensive if we have many users? No, filtering by email is fine.
                 // However, listUsers doesn't support server-side filtering by email in all versions efficiently.
                 // Let's rely on creation failure if we can't find ID.
            }
        }

        const password = generatePassword(12)

      // 1. Create user in Supabase Auth
      let authUser = null;
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError) {
        // If error is "User already registered" and replaceExisting is true, 
        // it means we failed to find them in public.users (DB mismatch) OR we decided purely on try-catch.
        // But we need the ID to delete.
        // So we MUST find the ID if we want to delete.
        if (authError.message === 'User already registered' && replaceExisting) {
             // We need to hunt them down in Auth to delete them
             // Warning: This operations can be slow if done in bulk one by one
             const { data: { users: foundUsers }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
             const suspect = foundUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());
             
             if (suspect) {
                 await supabaseAdmin.auth.admin.deleteUser(suspect.id);
                 // Retry creation
                 const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: fullName }
                 });
                 if (retryError) throw retryError;
                 authUser = retryData.user;
             } else {
                 throw new Error("User exists but cannot be found to delete.");
             }
        } else {
            throw new Error(authError.message)
        }
      } else {
        authUser = authData.user;
      }
      
      if (!authUser) {
        throw new Error('No user returned from Auth')
      }

      // 2. Add to public.users table (or upsert if we just deleted and recreated)
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authUser.id,
          email,
          role,
          full_name: fullName,
          job_category: jobCategory || 'Staff', // Default to Staff if missing
          additional_roles: additionalRoles,
          is_password_changed: false
        })

      if (dbError) {
        // Cleanup auth user if db insert fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.id)
        throw new Error(dbError.message)
      }

      results.push({
        email,
        fullName,
        password,
        status: 'success',
        message: 'User created'
      })

    } catch (error: any) {
      results.push({
        email,
        fullName,
        status: 'error',
        message: error.message
      })
    }
  }

  return results
}
