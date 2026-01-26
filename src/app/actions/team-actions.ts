'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getTeamPerformance(userId: string) {
    try {
        // 1. Get my direct appraisees (These are the intermediate appraisers)
        const { data: myAppraisees, error: assignmentsError } = await supabaseAdmin
            .from('appraiser_assignments')
            .select('appraisee_id')
            .eq('appraiser_id', userId);

        if (assignmentsError) throw new Error(`Assignments error: ${assignmentsError.message}`);

        const myAppraiseeIds = myAppraisees?.map(a => a.appraisee_id) || [];

        if (myAppraiseeIds.length === 0) {
            return { success: true, data: [] };
        }

        // 2. Get appraisals where the appraiser is one of my appraisees
        const { data: appraisals, error: appraisalsError } = await supabaseAdmin
            .from('appraisals')
            .select(`
        *,
        appraiser:users!appraiser_id (
          id,
          full_name,
          email
        ),
        appraisee:users!appraisee_id (
          id,
          full_name,
          email,
          role
        )
      `)
            .in('appraiser_id', myAppraiseeIds)
            .order('updated_at', { ascending: false });

        if (appraisalsError) throw new Error(`Appraisals error: ${appraisalsError.message}`);

        return { success: true, data: appraisals || [] };
    } catch (error: any) {
        console.error('Error fetching team performance:', error);
        return { success: false, error: error.message };
    }
}
