'use client';

import { useEffect, useState } from 'react';
import { Award, Eye, Loader2 } from 'lucide-react';
import { getMyAppraisalsAsAppraisee } from '@/app/actions/appraisal-actions';

interface MyAppraisalRecordProps {
  currentUser: { id: string; email?: string; full_name?: string };
}

export default function MyAppraisalRecord({ currentUser }: MyAppraisalRecordProps) {
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getMyAppraisalsAsAppraisee();
      if (result.success) {
        setAppraisals(result.data || []);
      }
      setLoading(false);
    };
    load();
  }, [currentUser.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Appraisal Record</h2>
        <p className="text-gray-500">Completed appraisals where you were the appraisee.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {appraisals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No completed appraisals yet.</p>
            <p className="text-sm">Once an appraiser completes your appraisal, it will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {appraisals.map((appraisal) => (
              <li key={appraisal.id} className="px-8 py-5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {appraisal.appraisal_data?.term} {appraisal.appraisal_data?.year}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Appraised by {appraisal.appraiser?.full_name} ({appraisal.appraiser?.role})
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg font-bold text-gray-900">
                    {appraisal.overall_score ?? '-'}
                  </span>
                  <a
                    href={`/print/scoresheet/${appraisal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    View Report
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
