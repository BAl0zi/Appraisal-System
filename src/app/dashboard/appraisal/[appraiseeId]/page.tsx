import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';
import AppraisalForm from '@/components/dashboard/AppraisalForm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ appraiseeId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AppraisalPage({ params, searchParams }: PageProps) {
  const { appraiseeId } = await params;
  const { term, year, appraisalId, role } = await searchParams;
  
  // Get current user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch current user details for layout
  const { data: currentUserData } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch appraisee details
  const { data: appraisee } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role, email, job_category')
    .eq('id', appraiseeId)
    .single();

  if (!appraisee) {
    return <div>Appraisee not found</div>;
  }

  // Fetch existing appraisal
  let existingAppraisal = null;

  if (appraisalId) {
    const { data } = await supabaseAdmin
      .from('appraisals')
      .select('*')
      .eq('id', appraisalId)
      .single();
    existingAppraisal = data;
  } else if (term && year) {
    // Try to find by term and year
    let query = supabaseAdmin
      .from('appraisals')
      .select('*')
      .eq('appraiser_id', user.id)
      .eq('appraisee_id', appraiseeId)
      .contains('appraisal_data', { term, year });
    
    if (role) {
      query = query.eq('role', role);
    }

    const { data } = await query.maybeSingle();
    existingAppraisal = data;
  } else {
    // Fallback: Get the most recently updated one
    let query = supabaseAdmin
      .from('appraisals')
      .select('*')
      .eq('appraiser_id', user.id)
      .eq('appraisee_id', appraiseeId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (role) {
      query = query.eq('role', role);
    }

    const { data } = await query.maybeSingle();
    existingAppraisal = data;
  }

  return (
    <DashboardLayout currentUser={currentUserData} role={currentUserData?.role}>
      <AppraisalForm 
        appraiserId={user.id}
        appraisee={appraisee}
        existingAppraisal={existingAppraisal}
        initialTerm={term as string}
        initialYear={year as string}
        appraisalRole={role as string}
      />
    </DashboardLayout>
  );
}
