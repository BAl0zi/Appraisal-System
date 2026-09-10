import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';
import { getRoleCategory, UserRole } from '@/constants/roles';
import { LESSON_OBSERVATION_PARAMETERS, WORK_OBSERVATION_PARAMETERS, COACH_OBSERVATION_PARAMETERS } from '@/constants/observation-criteria';
import { TEACHING_EVALUATION_PARAMETERS, NON_TEACHING_EVALUATION_PARAMETERS, SENIOR_LEADERSHIP_EVALUATION_PARAMETERS, INTERMEDIATE_LEADERSHIP_EVALUATION_PARAMETERS, FIRSTLINE_LEADERSHIP_EVALUATION_PARAMETERS } from '@/constants/evaluation-criteria';
import PrintPageToolbar from '@/components/PrintPageToolbar';
import AppraisalReportDocument from '@/components/AppraisalReportDocument';

// Tells browsers (and their auto-dark-mode-for-web-content features) this page is
// intentionally light-only, so "Save as PDF" doesn't invert it to a dark/black background.
export const metadata: Metadata = {
  colorScheme: 'only light',
};

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

function getObservationParameters(isCoach: boolean, isTeachingStaff: boolean) {
  if (isCoach) return COACH_OBSERVATION_PARAMETERS;
  return isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;
}

function getEvaluationParameters(roleCategory: string) {
  if (roleCategory === 'TEACHING') return TEACHING_EVALUATION_PARAMETERS;
  if (roleCategory === 'SENIOR_LEADERSHIP' || roleCategory === 'DIRECTOR') return SENIOR_LEADERSHIP_EVALUATION_PARAMETERS;
  if (roleCategory === 'INTERMEDIATE_LEADERSHIP') return INTERMEDIATE_LEADERSHIP_EVALUATION_PARAMETERS;
  if (roleCategory === 'FIRSTLINE_LEADERSHIP') return FIRSTLINE_LEADERSHIP_EVALUATION_PARAMETERS;
  return NON_TEACHING_EVALUATION_PARAMETERS;
}

function getRating(pct: number) {
  if (pct >= 93) return 'Leading';
  if (pct >= 80) return 'Strong';
  if (pct >= 65) return 'Solid';
  if (pct >= 50) return 'Building';
  return 'Below Expectations';
}

function sumRatings(ratings: any): number {
  let s = 0;
  Object.values(ratings || {}).forEach((rating: any) => {
    const r = typeof rating === 'string' ? parseInt(rating) : rating;
    if (r >= 1 && r <= 4) s += r;
  });
  return s;
}

export default async function PrintScoresheetPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let appraisal: any = null;
  let fetchError: any = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('appraisals')
      .select(`*, appraisee:users!appraisee_id(id, full_name, role, email), appraiser:users!appraiser_id(id, full_name, role, email)`)
      .eq('id', id)
      .maybeSingle();

    if (error) fetchError = error;
    appraisal = data;
  } catch (err) {
    fetchError = err;
    console.error('Error fetching appraisal for print:', err);
  }

  if (!appraisal) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold">Final Scoresheet</h1>
        <p className="text-sm text-red-600">Appraisal not found.</p>
        <p className="text-xs text-gray-500 mt-4">Requested id: <strong>{id}</strong></p>
        {fetchError && (
          <pre className="mt-4 p-2 bg-gray-100 text-xs text-red-600">{String(fetchError)}</pre>
        )}
      </div>
    );
  }

  // Authorization: only the appraiser, the appraisee, or an admin may view this scoresheet
  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = viewer?.role === 'DIRECTOR' || viewer?.role === 'SUPER ADMIN';
  const isAppraiser = appraisal.appraiser_id === user.id;
  const isAppraisee = appraisal.appraisee_id === user.id;

  if (!isAdmin && !isAppraiser && !isAppraisee) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-red-600">You are not authorized to view this appraisal.</p>
      </div>
    );
  }

  const formData = appraisal.appraisal_data || {};
  const role = appraisal.appraisee?.role || '';
  const roleCategory = getRoleCategory(role as UserRole);
  const isCoach = role === 'COACH';
  const isTeachingStaff = roleCategory === 'TEACHING';
  const showTargets = roleCategory !== 'NON_TEACHING';
  const showObservations = roleCategory === 'TEACHING' || roleCategory === 'NON_TEACHING';
  const observationParams = getObservationParameters(isCoach, isTeachingStaff);
  const evaluationParams = getEvaluationParameters(roleCategory);

  // Target stats
  const targets = formData.targets || [];
  let totalPercentage = 0;
  let count = 0;
  targets.forEach((t: any) => {
    const target = parseFloat(t.target);
    const actual = parseFloat(t.actual);
    if (target > 0 && !isNaN(actual)) {
      totalPercentage += (actual / target) * 100;
      count++;
    }
  });
  const targetAverage = count > 0 ? totalPercentage / count : 0;
  let targetMarks = 5;
  if (targetAverage >= 99) targetMarks = 33;
  else if (targetAverage >= 95) targetMarks = 30;
  else if (targetAverage >= 86) targetMarks = 20;

  // Observation stats
  const obs1Score = sumRatings(formData.observation1?.ratings);
  const obs2Score = sumRatings(formData.observation2?.ratings);
  const hasObs2 = formData.observation2?.ratings && Object.keys(formData.observation2.ratings).length > 0;
  const observationTotal = parseFloat((hasObs2 ? (obs1Score + obs2Score) / 2 : obs1Score).toFixed(1));

  // Evaluation stats
  const evaluationTotal = sumRatings(formData.evaluation?.ratings);

  // Max scores / percentage / rating
  const maxTargets = showTargets ? 33 : 0;
  const maxObservation = showObservations ? observationParams.length * 4 : 0;
  const maxEvaluation = evaluationParams.length * 4;
  const totalMax = maxTargets + maxObservation + maxEvaluation;

  let computedTotal = 0;
  if (showTargets) computedTotal += targetMarks;
  if (showObservations) computedTotal += observationTotal;
  computedTotal += evaluationTotal;

  const totalScore = appraisal.overall_score ?? computedTotal;
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  const rating = getRating(percentage);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 print:p-0" style={{ colorScheme: 'light', backgroundColor: '#ffffff', color: '#111111' }}>
      <PrintPageToolbar />
      <AppraisalReportDocument
        appraiseeName={appraisal.appraisee?.full_name}
        appraiseeRole={appraisal.appraisee?.role}
        appraiserName={appraisal.appraiser?.full_name}
        term={formData.term}
        year={formData.year}
        showTargets={showTargets}
        showObservations={showObservations}
        isTeachingStaff={isTeachingStaff}
        isCoach={isCoach}
        targets={targets}
        observation1={formData.observation1}
        observation2={formData.observation2}
        observationParams={observationParams}
        evaluationParams={evaluationParams}
        evaluationRatings={formData.evaluation?.ratings || {}}
        progressComment={formData.evaluation?.progressComments?.[0]}
        improvementComment={formData.evaluation?.improvementComments?.[0]}
        targetMarks={targetMarks}
        observationScore1={obs1Score}
        observationScore2={obs2Score}
        observationTotal={observationTotal}
        evaluationTotal={evaluationTotal}
        totalScore={totalScore}
        percentage={percentage}
        rating={rating}
        appraiseeSignature={formData.completionSignatures?.appraiseeSignature}
        appraiseeSignatureDate={formData.completionSignatures?.appraiseeDate}
        appraiserSignature={formData.completionSignatures?.appraiserSignature}
        appraiserSignatureDate={formData.completionSignatures?.appraiserDate}
      />
    </div>
  );
}
