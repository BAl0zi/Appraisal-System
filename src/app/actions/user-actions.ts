'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { UserRole } from '@/constants/roles'
import { revalidatePath } from 'next/cache'

export async function createUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as UserRole
  const fullName = formData.get('fullName') as string
  const jobCategory = formData.get('jobCategory') as string
  const additionalRolesStr = formData.get('additionalRoles') as string
  
  const additionalRoles = additionalRolesStr 
    ? additionalRolesStr.split(',').map(r => r.trim()).filter(r => r.length > 0)
    : [];

  if (!email || !password || !role || !fullName || !jobCategory) {
    return { error: 'All fields are required' }
  }

  try {
    console.log('Attempting to create user:', { email, role, fullName, jobCategory });

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      console.error('Supabase Auth Error:', authError);
      throw new Error(`Auth Error: ${authError.message}`)
    }
    
    if (!authData.user) {
      console.error('No user returned from Supabase Auth');
      throw new Error('Failed to create user')
    }

    console.log('User created in Auth, adding to DB:', authData.user.id);

    // 2. Add to public.users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role,
        full_name: fullName,
        job_category: jobCategory,
        additional_roles: additionalRoles,
        is_password_changed: false
      })

    if (dbError) {
      console.error('Database Insert Error:', dbError);
      // Cleanup auth user if db insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Database Error: ${dbError.message}`)
    }

    console.log('User successfully created and added to DB');
    revalidatePath('/dashboard')
    return { success: true, message: 'User created successfully' }
  } catch (error: any) {
    console.error('Create User Action Failed:', error);
    return { error: error.message }
  }
}

export async function deleteUser(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message)
    
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    // 1. Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`)
    }

    // 2. Reset the is_password_changed flag so they are forced to change it again
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ is_password_changed: false })
      .eq('id', userId)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateUser(userId: string, formData: FormData) {
    const role = formData.get('role') as UserRole
    const jobCategory = formData.get('jobCategory') as string
  
    if (!role || !jobCategory) {
      return { error: 'Role and Job Category are required' }
    }
  
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          role,
          job_category: jobCategory
        })
        .eq('id', userId)
  
      if (error) throw new Error(error.message)
  
      revalidatePath('/dashboard')
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  }
