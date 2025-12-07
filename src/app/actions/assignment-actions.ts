'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function assignAppraiser(appraiseeId: string, appraiserId: string, role?: string) {
  try {
    // Robust approach: Delete any existing assignment for this appraisee/role combination first
    // This handles cases where multiple rows might exist due to bad data or PK constraints
    let deleteQuery = supabaseAdmin
      .from('appraiser_assignments')
      .delete()
      .eq('appraisee_id', appraiseeId);
    
    if (role) {
      deleteQuery = deleteQuery.eq('role', role);
    } else {
      deleteQuery = deleteQuery.is('role', null);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error(`Failed to clear existing assignment: ${deleteError.message}`);

    // Create new assignment
    const { error: insertError } = await supabaseAdmin
      .from('appraiser_assignments')
      .insert({
        appraisee_id: appraiseeId,
        appraiser_id: appraiserId,
        role: role || null
      });

    if (insertError) throw new Error(`Failed to create assignment: ${insertError.message}`);

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function removeAssignment(appraiseeId: string, role?: string) {
  try {
    let query = supabaseAdmin
      .from('appraiser_assignments')
      .delete()
      .eq('appraisee_id', appraiseeId);
    
    if (role) {
      query = query.eq('role', role);
    } else {
      query = query.is('role', null);
    }

    const { error } = await query;
    if (error) throw new Error(error.message)
    
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getAssignments() {
  try {
    const { data, error } = await supabaseAdmin
      .from('appraiser_assignments')
      .select('appraisee_id, appraiser_id, role');
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
