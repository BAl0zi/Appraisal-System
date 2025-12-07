'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function saveAppraisal(formData: FormData) {
  // Verify authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const appraiserId = formData.get('appraiserId') as string;
  
  // Ensure the user is submitting for themselves
  if (appraiserId !== user.id) {
    return { success: false, error: 'Unauthorized operation' };
  }

  const appraiseeId = formData.get('appraiseeId') as string;
  const appraisalId = formData.get('appraisalId') as string;
  const status = formData.get('status') as string;
  const role = formData.get('role') as string;
  const appraisalDataStr = formData.get('appraisalData') as string;
  const overallScore = formData.get('overallScore') as string;
  
  const appraisalData = JSON.parse(appraisalDataStr);
  const { term, year } = appraisalData;

  let existing = null;

  if (appraisalId) {
     const { data } = await supabaseAdmin
      .from('appraisals')
      .select('id')
      .eq('id', appraisalId)
      .single();
     existing = data;
  } else {
     // Try to find by term/year if not provided
     let query = supabaseAdmin
      .from('appraisals')
      .select('id')
      .eq('appraiser_id', appraiserId)
      .eq('appraisee_id', appraiseeId)
      .contains('appraisal_data', { term, year });
     
     if (role) {
       query = query.eq('role', role);
     }

     const { data } = await query.maybeSingle();
     existing = data;
  }

  let result;
  
  if (existing) {
    // Update
    result = await supabaseAdmin
      .from('appraisals')
      .update({
        status,
        appraisal_data: appraisalData,
        overall_score: parseFloat(overallScore),
        updated_at: new Date().toISOString(),
        role: role || null // Ensure role is consistent
      })
      .eq('id', existing.id);
  } else {
    // Insert
    result = await supabaseAdmin
      .from('appraisals')
      .insert({
        appraiser_id: appraiserId,
        appraisee_id: appraiseeId,
        status,
        appraisal_data: appraisalData,
        overall_score: parseFloat(overallScore),
        role: role || null
      });
  }

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function requestDeletion(appraisalId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabaseAdmin
    .from('appraisals')
    .update({
      deletion_requested: true,
      deletion_reason: reason
    })
    .eq('id', appraisalId)
    .eq('appraiser_id', user.id);

  if (error) {
    console.error('Error requesting deletion:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function approveDeletion(appraisalId: string) {
  const { error } = await supabaseAdmin
    .from('appraisals')
    .delete()
    .eq('id', appraisalId);

  if (error) {
    console.error('Error approving deletion:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectDeletion(appraisalId: string) {
  const { error } = await supabaseAdmin
    .from('appraisals')
    .update({
      deletion_requested: false,
      deletion_reason: null
    })
    .eq('id', appraisalId);

  if (error) {
    console.error('Error rejecting deletion:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function resetAppraisalStatus(appraisalId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify Director role
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'DIRECTOR') {
    return { success: false, error: 'Only Directors can reset appraisal status' };
  }

  const { error } = await supabaseAdmin
    .from('appraisals')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', appraisalId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
