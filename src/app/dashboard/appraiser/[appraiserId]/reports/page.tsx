import { supabaseAdmin } from '@/lib/supabase-admin';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PrintButton from '@/components/PrintButton';
import FinalScoresheetButton from '@/components/FinalScoresheetButton';
import { LESSON_OBSERVATION_PARAMETERS, WORK_OBSERVATION_PARAMETERS } from '@/constants/observation-criteria';
import { TEACHING_EVALUATION_PARAMETERS, NON_TEACHING_EVALUATION_PARAMETERS, SENIOR_LEADERSHIP_EVALUATION_PARAMETERS, FIRSTLINE_LEADERSHIP_EVALUATION_PARAMETERS } from '@/constants/evaluation-criteria';
import { getRoleCategory, type UserRole } from '@/constants/roles';

interface PageProps {
  params: Promise<{ appraiserId: string }> | { appraiserId: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

function renderObservationTable(params: string[], ratings: any) {
  return (
    <table className="w-full border-collapse border border-gray-200 mb-6">
      <thead>
        <tr className="bg-gray-50">
          <th className="p-3 text-left border">PARAMETER</th>
          <th className="p-3 text-right border">RATING</th>
        </tr>
      </thead>
      <tbody>
        {params.map((p, idx) => (
          <tr key={idx} className="odd:bg-white even:bg-gray-50">
            <td className="p-3 border text-sm">{idx + 1}. {p}</td>
            <td className="p-3 border text-sm text-right">{ratings?.[idx] ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getEvalParamsForRole(role?: string) {
  if (!role) return NON_TEACHING_EVALUATION_PARAMETERS;
  const category = getRoleCategory(role as UserRole);
  if (category === 'FIRSTLINE_LEADERSHIP') return FIRSTLINE_LEADERSHIP_EVALUATION_PARAMETERS;
  if (category === 'TEACHING') return TEACHING_EVALUATION_PARAMETERS;
  if (category === 'SENIOR_LEADERSHIP') return SENIOR_LEADERSHIP_EVALUATION_PARAMETERS;
  return NON_TEACHING_EVALUATION_PARAMETERS;
}

function sumRatings(ratings: Record<string, unknown> = {}) {
  return Object.values(ratings).reduce<number>((total, value) => {
    const rating = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    return rating >= 1 && rating <= 4 ? total + rating : total;
  }, 0);
}

function getTargetScore(targets: any[] = []) {
  const completedTargets = targets
    .map(target => ({ target: Number.parseFloat(target.target), actual: Number.parseFloat(target.actual) }))
    .filter(target => target.target > 0 && Number.isFinite(target.actual));
  if (completedTargets.length === 0) return 5;

  const average = completedTargets.reduce((total, target) => total + target.actual / target.target * 100, 0) / completedTargets.length;
  if (average >= 99) return 33;
  if (average >= 95) return 30;
  if (average >= 86) return 20;
  return 5;
}

export default async function AppraiserReportsPage({ params, searchParams }: PageProps) {
  // Resolve async params/searchParams (Next may pass them as Promises)
  const resolvedParams = await params;
  const resolvedSearchParams = await (searchParams as any);
  // Try route param first, then fallback to query `appraiserId` if present
  const routeId = resolvedParams?.appraiserId;
  const queryId = Array.isArray(resolvedSearchParams?.appraiserId) ? resolvedSearchParams?.appraiserId[0] : (resolvedSearchParams as any)?.appraiserId;
  const appraiserId = routeId || queryId || null;

  if (!appraiserId) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold">Appraiser Reports</h1>
        <p className="text-sm text-red-600">Missing appraiser id in the route.</p>
      </div>
    );
  }

  // fetch appraiser
  let appraiser = null;
  try {
    const { data } = await supabaseAdmin.from('users').select('id, full_name, role, email').eq('id', appraiserId).maybeSingle();
    appraiser = data;
  } catch (err) {
    console.error('Error fetching appraiser:', err);
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold">Appraiser Reports</h1>
        <p className="text-sm text-red-600">Error fetching appraiser data.</p>
      </div>
    );
  }

  if (!appraiser) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold">Appraiser Reports</h1>
        <p className="text-sm text-red-600">Appraiser not found.</p>
      </div>
    );
  }

  // fetch appraisals by this appraiser
  let query = supabaseAdmin
    .from('appraisals')
    .select(`*, appraisee:users!appraisee_id(id, full_name, role, email)`)
    .eq('appraiser_id', appraiserId)
    .order('updated_at', { ascending: false });

  if (resolvedSearchParams?.term && resolvedSearchParams?.year) {
    const term = Array.isArray(resolvedSearchParams.term) ? resolvedSearchParams.term[0] : resolvedSearchParams.term;
    const year = Array.isArray(resolvedSearchParams.year) ? resolvedSearchParams.year[0] : resolvedSearchParams.year;
    query = query.contains('appraisal_data', { term, year });
  }

  const { data: appraisals } = await query;

  return (
    <DashboardLayout currentUser={appraiser} role={(appraiser as any)?.role}>
      <div className="max-w-5xl mx-auto py-8 px-4 print:p-0 print-area">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Appraiser Report - {appraiser?.full_name}</h1>
            <p className="text-sm text-gray-500">All appraisals conducted by this appraiser</p>
          </div>
          <div>
            <PrintButton />
          </div>
        </div>

        {!appraisals || appraisals.length === 0 ? (
          <div className="text-gray-500">No appraisals found for this appraiser.</div>
        ) : (
          appraisals.map((a: any) => {
            const data = a.appraisal_data || {};
            const term = data.term || '';
            const year = data.year || '';
            const role = a.role || data.role || a.appraisee?.role || '';
            const roleCategory = getRoleCategory(role as UserRole);
            const showTargets = roleCategory !== 'NON_TEACHING' && role !== 'SPECIAL NEEDS TEACHER';
            const showObservations = roleCategory === 'TEACHING' || roleCategory === 'NON_TEACHING';
            const observationParams = roleCategory === 'TEACHING' ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;
            const evalParams = getEvalParamsForRole(role);
            const leadershipTotal = getTargetScore(data.targets || []) + sumRatings(data.evaluation?.ratings || {});
            const overallScore = roleCategory === 'FIRSTLINE_LEADERSHIP' ? leadershipTotal : a.overall_score ?? '-';

            return (
              <div key={a.id} id={`scoresheet-${a.id}`} className="mb-12 print:page-break-after-always avoid-break">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">FINAL SCORESHEET</h2>
                    <p className="text-sm">{a.appraisee?.full_name} - {role}</p>
                    <p className="text-xs text-gray-500">{term} {year}</p>
                  </div>
                  <div className="space-x-2">
                    <FinalScoresheetButton targetId={`scoresheet-${a.id}`} />
                  </div>
                </div>

                {showObservations && <h3 className="text-lg font-semibold mb-2">C1. WORK / LESSON OBSERVATION (FIRST)</h3>}
                {showObservations && <>
                <div className="border p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Appraisee:</strong> {a.appraisee?.full_name}</div>
                    <div><strong>Appraiser:</strong> {appraiser?.full_name}</div>
                    <div><strong>Date:</strong> {data.observation1?.date || '-'}</div>
                    <div><strong>Time:</strong> {data.observation1?.time || '-'}</div>
                    {!((role && (role.includes('TEACH') || role === 'TEACHER'))) && (
                      <div><strong>Work Appraised:</strong> {data.observation1?.workAppraised || '-'}</div>
                    )}
                  </div>
                </div>

                {renderObservationTable(observationParams, data.observation1?.ratings)}
                </>}

                {showObservations && data.observation2 && Object.keys(data.observation2?.ratings || {}).length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold mb-2">C2. WORK / LESSON OBSERVATION (SECOND)</h3>
                    <div className="border p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Appraisee:</strong> {a.appraisee?.full_name}</div>
                        <div><strong>Appraiser:</strong> {appraiser?.full_name}</div>
                        <div><strong>Date:</strong> {data.observation2?.date || '-'}</div>
                        <div><strong>Time:</strong> {data.observation2?.time || '-'}</div>
                      </div>
                    </div>
                    {renderObservationTable(observationParams, data.observation2?.ratings)}
                  </>
                )}

                {showTargets && <>
                <h3 className="text-lg font-semibold mb-2">D. TARGETS</h3>
                <table className="w-full border-collapse border border-gray-200 mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 border text-left">#</th>
                      <th className="p-3 border text-left">Area</th>
                      <th className="p-3 border text-left">Target</th>
                      <th className="p-3 border text-left">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.targets || []).map((t: any, i: number) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        <td className="p-3 border text-sm">{i + 1}</td>
                        <td className="p-3 border text-sm">{t.area}</td>
                        <td className="p-3 border text-sm">{t.target}</td>
                        <td className="p-3 border text-sm">{t.actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>}

                <h3 className="text-lg font-semibold mb-2">E. EVALUATION</h3>
                <table className="w-full border-collapse border border-gray-200 mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 border text-left">Parameter</th>
                      <th className="p-3 border text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalParams.map((p: any, idx: number) => (
                      <tr key={idx} className="odd:bg-white even:bg-gray-50">
                        <td className="p-3 border text-sm">{p}</td>
                        <td className="p-3 border text-sm text-right">{data.evaluation?.ratings?.[idx] ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-center">
                  <div>
                    <p><strong>Overall Score:</strong> {overallScore}</p>
                    <p className="text-sm text-gray-500">Status: {a.status}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
