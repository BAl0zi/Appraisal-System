import { supabaseAdmin } from '@/lib/supabase-admin';
import { LESSON_OBSERVATION_PARAMETERS, WORK_OBSERVATION_PARAMETERS } from '@/constants/observation-criteria';
import PrintPageToolbar from '@/components/PrintPageToolbar';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PrintScoresheetPage({ params }: PageProps) {
  const { id } = await params;

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

  const data = appraisal.appraisal_data || {};
  const term = data.term || '';
  const year = data.year || '';

  const observationParams = (appraisal.appraisee?.role && (appraisal.appraisee?.role.includes('TEACH') || appraisal.appraisee?.role === 'TEACHER')) ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 print:p-0">
      <PrintPageToolbar />
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">FINAL SCORESHEET</h2>
        <p className="text-sm">{appraisal.appraisee?.full_name} - {appraisal.appraisee?.role}</p>
        <p className="text-xs text-gray-500">{term} {year}</p>
      </div>

      <h3 className="text-lg font-semibold mb-2">C1. WORK / LESSON OBSERVATION (FIRST)</h3>
      <div className="border p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Appraisee:</strong> {appraisal.appraisee?.full_name}</div>
          <div><strong>Appraiser:</strong> {appraisal.appraiser?.full_name}</div>
          <div><strong>Date:</strong> {data.observation1?.date || '-'}</div>
          <div><strong>Time:</strong> {data.observation1?.time || '-'}</div>
          {!((appraisal.appraisee?.role && (appraisal.appraisee?.role.includes('TEACH') || appraisal.appraisee?.role === 'TEACHER'))) && (
            <div><strong>Work Appraised:</strong> {data.observation1?.workAppraised || '-'}</div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200 mb-6">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-3 text-left border">PARAMETER</th>
            <th className="p-3 text-right border">RATING</th>
          </tr>
        </thead>
        <tbody>
          {observationParams.map((p, idx) => {
            const ratings = data.observation1?.ratings;
            const ratingsArray = Array.isArray(ratings) ? ratings : (ratings && typeof ratings === 'object' ? Object.values(ratings) : []);
            return (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 border text-sm">{idx + 1}. {p}</td>
                <td className="p-3 border text-sm text-right">{ratingsArray?.[idx] ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-between items-center">
        <div>
          <p><strong>Overall Score:</strong> {appraisal.overall_score ?? '-'}</p>
          <p className="text-sm text-gray-500">Status: {appraisal.status}</p>
        </div>
      </div>
    </div>
  );
}
