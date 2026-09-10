import { PROFESSIONAL_DOCUMENTS } from '@/constants/observation-criteria';

// Brand palette, sourced from the school logo (public/logo.svg)
export const BRAND = {
  gold: '#f5a821',
  goldDark: '#c8860f',
  goldTint: '#fdf3e0',
  ink: '#1a1a1a',
  gray: '#6b7280',
};

export interface ReportTarget {
  id: number;
  area: string;
  description?: string;
  target: string;
  actual: string;
  actualDescription?: string;
}

export interface ReportObservation {
  ratings?: Record<number, number>;
  documents?: Record<number, string>;
  comments?: string;
  date?: string;
  time?: string;
  classGrade?: string;
  subject?: string;
  topic?: string;
  learnersPresent?: string;
  workAppraised?: string;
}

export interface AppraisalReportDocumentProps {
  appraiseeName: string;
  appraiseeRole: string;
  appraiserName: string;
  term: string;
  year: string;
  showTargets: boolean;
  showObservations: boolean;
  isTeachingStaff: boolean;
  isCoach: boolean;
  targets: ReportTarget[];
  observation1?: ReportObservation;
  observation2?: ReportObservation;
  observationParams: string[];
  evaluationParams: string[];
  evaluationRatings: Record<number, number>;
  progressComment?: string;
  improvementComment?: string;
  targetMarks: number;
  observationScore1: number;
  observationScore2: number;
  observationTotal: number;
  evaluationTotal: number;
  totalScore: number;
  percentage: number;
  rating: string;
  appraiseeSignature?: string;
  appraiseeSignatureDate?: string;
  appraiserSignature?: string;
  appraiserSignatureDate?: string;
  pageBreakAfter?: boolean;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: BRAND.ink }} className="px-4 py-2 rounded-t">
      <h3 style={{ color: BRAND.gold }} className="text-sm font-bold uppercase tracking-wide">{children}</h3>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span style={{ color: BRAND.ink }} className="font-bold">{label}:</span>{' '}
      <span className="text-gray-700">{value || '_________________'}</span>
    </div>
  );
}

export default function AppraisalReportDocument({
  appraiseeName,
  appraiseeRole,
  appraiserName,
  term,
  year,
  showTargets,
  showObservations,
  isTeachingStaff,
  isCoach,
  targets,
  observation1,
  observation2,
  observationParams,
  evaluationParams,
  evaluationRatings,
  progressComment,
  improvementComment,
  targetMarks,
  observationScore1,
  observationScore2,
  observationTotal,
  evaluationTotal,
  totalScore,
  percentage,
  rating,
  appraiseeSignature,
  appraiseeSignatureDate,
  appraiserSignature,
  appraiserSignatureDate,
  pageBreakAfter,
}: AppraisalReportDocumentProps) {
  const hasObs2 = observation2 && (observation2.date || Object.keys(observation2.ratings || {}).length > 0);

  return (
    <div
      style={{ pageBreakAfter: pageBreakAfter ? 'always' : 'auto', backgroundColor: '#ffffff', color: BRAND.ink }}
      className="space-y-6 mb-12"
    >
      {/* Branded Header */}
      <div style={{ borderBottom: `4px solid ${BRAND.gold}` }} className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Urafiki Carovana School" style={{ height: 64, width: 'auto' }} />
          <div>
            <div style={{ color: BRAND.ink }} className="text-lg font-extrabold uppercase tracking-wide leading-tight">
              Urafiki Carovana School
            </div>
            <div style={{ color: BRAND.goldDark }} className="text-xs font-semibold italic">
              Only Wonder Knows
            </div>
          </div>
        </div>
        <div className="text-right">
          <div style={{ color: BRAND.ink }} className="text-base font-bold uppercase">Staff Appraisal Report</div>
          <div className="text-xs text-gray-500">{term} {year}</div>
        </div>
      </div>

      {/* Appraisee Info */}
      <div
        style={{ backgroundColor: BRAND.goldTint, borderLeft: `4px solid ${BRAND.gold}` }}
        className="rounded px-4 py-3 grid grid-cols-2 gap-2 text-sm"
      >
        <InfoRow label="Appraisee" value={appraiseeName} />
        <InfoRow label="Role" value={appraiseeRole} />
        <InfoRow label="Appraiser" value={appraiserName} />
        <InfoRow label="Period" value={`${term} ${year}`} />
      </div>

      {/* Targets */}
      {showTargets && (
        <div className="break-inside-avoid">
          <SectionHeader>A. Targets</SectionHeader>
          <table className="min-w-full border border-gray-300 border-t-0">
            <thead style={{ backgroundColor: BRAND.goldTint }}>
              <tr>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase border-r border-gray-300 w-1/4">Area &amp; Description</th>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase border-r border-gray-300 w-1/6">Target</th>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase border-r border-gray-300 w-1/6">Actual</th>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase border-r border-gray-300 w-1/4">Remarks</th>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase w-1/12">%</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {targets.map((target) => {
                const pct = (parseFloat(target.target) > 0 && !isNaN(parseFloat(target.actual)))
                  ? ((parseFloat(target.actual) / parseFloat(target.target)) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={target.id}>
                    <td className="px-4 py-2 text-sm border-r border-gray-200">
                      <div className="font-bold">{target.area}</div>
                      <div className="text-xs text-gray-500 mt-1">{target.description}</div>
                    </td>
                    <td className="px-4 py-2 text-sm border-r border-gray-200">{target.target}</td>
                    <td className="px-4 py-2 text-sm border-r border-gray-200">{target.actual}</td>
                    <td className="px-4 py-2 text-xs border-r border-gray-200">{target.actualDescription}</td>
                    <td className="px-4 py-2 text-sm">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Observations */}
      {showObservations && [
        { key: 'observation1', index: 0, data: observation1 },
        { key: 'observation2', index: 1, data: observation2 },
      ].map(({ key, index, data }) => {
        if (index === 1 && !hasObs2) return null;
        const label = isCoach
          ? 'B. Coach Observation'
          : isTeachingStaff
            ? `B${index + 1}. Lesson Observation (${index === 0 ? 'First' : 'Second'})`
            : `C${index + 1}. Work Observation (${index === 0 ? 'First' : 'Second'})`;

        return (
          <div key={key}>
            <SectionHeader>{label}</SectionHeader>
            <div className="border border-gray-300 border-t-0 px-4 py-3 grid grid-cols-2 gap-3 text-sm" style={{ backgroundColor: BRAND.goldTint }}>
              <InfoRow label="Date" value={data?.date} />
              <InfoRow label="Time" value={data?.time} />
              {isTeachingStaff ? (
                <>
                  <InfoRow label="Class/Grade" value={data?.classGrade} />
                  <InfoRow label="Subject" value={data?.subject} />
                  <InfoRow label="Topic" value={data?.topic} />
                  <InfoRow label="Learners Present" value={data?.learnersPresent} />
                </>
              ) : (
                <div className="col-span-2"><InfoRow label="Work Appraised" value={data?.workAppraised} /></div>
              )}
            </div>
            <table className="min-w-full border border-gray-300 border-t-0">
              <thead style={{ backgroundColor: BRAND.gold }}>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase w-2/3">Parameter</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {observationParams.map((param, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : ''} style={i % 2 !== 0 ? { backgroundColor: BRAND.goldTint } : undefined}>
                    <td className="px-4 py-2 text-sm border-r border-gray-200">{i + 1}. {param}</td>
                    <td className="px-4 py-2 text-center text-sm font-medium">{data?.ratings?.[i] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Professional Documents */}
      {isTeachingStaff && (
        <div className="break-inside-avoid">
          <SectionHeader>Professional Documents</SectionHeader>
          <table className="min-w-full border border-gray-300 border-t-0">
            <thead style={{ backgroundColor: BRAND.goldTint }}>
              <tr>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-left text-xs font-bold uppercase w-2/3">Document</th>
                <th style={{ color: BRAND.ink }} className="px-4 py-2 text-center text-xs font-bold uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {PROFESSIONAL_DOCUMENTS.map((doc, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm border-r border-gray-200">{i + 1}. {doc}</td>
                  <td className="px-4 py-2 text-center text-sm font-medium capitalize">
                    {(observation1?.documents?.[i] || 'not_available').replace('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Evaluation */}
      <div>
        <SectionHeader>D. Employee Evaluation</SectionHeader>
        <table className="min-w-full border border-gray-300 border-t-0">
          <thead style={{ backgroundColor: BRAND.gold }}>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase w-2/3">Parameter</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase">Rating</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {evaluationParams.map((param, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : ''} style={i % 2 !== 0 ? { backgroundColor: BRAND.goldTint } : undefined}>
                <td className="px-4 py-2 text-sm border-r border-gray-200">{i + 1}. {param}</td>
                <td className="px-4 py-2 text-center text-sm font-medium">{evaluationRatings?.[i] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <div className="break-inside-avoid">
        <SectionHeader>Comments &amp; Remarks</SectionHeader>
        <div className="border border-gray-300 border-t-0 p-4 space-y-4">
          <div>
            <h4 style={{ color: BRAND.ink }} className="text-xs font-bold uppercase mb-1">{isCoach ? 'Observation' : 'First Observation'} Comments</h4>
            <div className="p-3 rounded-md text-sm min-h-[50px]" style={{ backgroundColor: BRAND.goldTint }}>
              {observation1?.comments || 'No comments provided.'}
            </div>
          </div>
          {hasObs2 && (
            <div>
              <h4 style={{ color: BRAND.ink }} className="text-xs font-bold uppercase mb-1">Second Observation Comments</h4>
              <div className="p-3 rounded-md text-sm min-h-[50px]" style={{ backgroundColor: BRAND.goldTint }}>
                {observation2?.comments || 'No comments provided.'}
              </div>
            </div>
          )}
          <div>
            <h4 style={{ color: BRAND.ink }} className="text-xs font-bold uppercase mb-1">Progress Remarks</h4>
            <div className="p-3 rounded-md text-sm min-h-[60px]" style={{ backgroundColor: BRAND.goldTint }}>
              {progressComment || 'No remarks provided.'}
            </div>
          </div>
          <div>
            <h4 style={{ color: BRAND.ink }} className="text-xs font-bold uppercase mb-1">Areas for Improvement</h4>
            <div className="p-3 rounded-md text-sm min-h-[60px]" style={{ backgroundColor: BRAND.goldTint }}>
              {improvementComment || 'No remarks provided.'}
            </div>
          </div>
        </div>
      </div>

      {/* Scoresheet Summary */}
      <div className="break-inside-avoid">
        <SectionHeader>Scoresheet Summary</SectionHeader>
        <table className="min-w-full border border-gray-300 border-t-0 mb-6">
          <thead style={{ backgroundColor: BRAND.goldTint }}>
            <tr>
              <th style={{ color: BRAND.ink }} className="px-6 py-3 text-left text-xs font-bold uppercase border-r border-gray-300">Component</th>
              <th style={{ color: BRAND.ink }} className="px-6 py-3 text-center text-xs font-bold uppercase">Score</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {showTargets && (
              <tr>
                <td className="px-6 py-3 text-sm font-medium border-r border-gray-200">Targets Score</td>
                <td className="px-6 py-3 text-center text-sm">{targetMarks}</td>
              </tr>
            )}
            {showObservations && (
              <>
                <tr>
                  <td className="px-6 py-3 text-sm font-medium border-r border-gray-200">
                    {isCoach ? 'Coach Observation' : isTeachingStaff ? 'Lesson Observation (1st)' : 'Work Observation (1st)'}
                  </td>
                  <td className="px-6 py-3 text-center text-sm">{observationScore1}</td>
                </tr>
                {observationScore2 > 0 && (
                  <tr>
                    <td className="px-6 py-3 text-sm font-medium border-r border-gray-200">
                      {isTeachingStaff ? 'Lesson Observation (2nd)' : 'Work Observation (2nd)'}
                    </td>
                    <td className="px-6 py-3 text-center text-sm">{observationScore2}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: BRAND.goldTint }}>
                  <td className="px-6 py-3 text-sm font-bold border-r border-gray-200">Observation Final Score</td>
                  <td className="px-6 py-3 text-center text-sm font-bold">{observationTotal}</td>
                </tr>
              </>
            )}
            <tr>
              <td className="px-6 py-3 text-sm font-medium border-r border-gray-200">Employee Evaluation</td>
              <td className="px-6 py-3 text-center text-sm">{evaluationTotal}</td>
            </tr>
            <tr style={{ backgroundColor: BRAND.gold }}>
              <td className="px-6 py-3 text-sm font-bold text-white border-r border-gray-200">Total Score</td>
              <td className="px-6 py-3 text-center text-sm font-bold text-white">{totalScore}</td>
            </tr>
            <tr style={{ backgroundColor: BRAND.gold }}>
              <td className="px-6 py-3 text-sm font-bold text-white border-r border-gray-200">Percentage</td>
              <td className="px-6 py-3 text-center text-sm font-bold text-white">{percentage.toFixed(1)}%</td>
            </tr>
            <tr style={{ backgroundColor: BRAND.ink }}>
              <td className="px-6 py-3 text-sm font-bold border-r border-gray-600" style={{ color: BRAND.gold }}>Rating</td>
              <td className="px-6 py-3 text-center text-sm font-bold uppercase" style={{ color: BRAND.gold }}>{rating}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8">
          <div className="border border-gray-300 p-4 h-40 flex flex-col justify-between rounded">
            <span className="text-xs text-gray-500 uppercase">Appraisee Signature ({term})</span>
            {appraiseeSignature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appraiseeSignature} alt="Appraisee Signature" className="h-20 w-auto object-contain mx-auto" />
            ) : <div className="text-center text-gray-400 italic">Not signed</div>}
            <span className="text-xs text-gray-500 text-right">{appraiseeSignatureDate}</span>
          </div>
          <div className="border border-gray-300 p-4 h-40 flex flex-col justify-between rounded">
            <span className="text-xs text-gray-500 uppercase">Appraiser Signature ({term})</span>
            {appraiserSignature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appraiserSignature} alt="Appraiser Signature" className="h-20 w-auto object-contain mx-auto" />
            ) : <div className="text-center text-gray-400 italic">Not signed</div>}
            <span className="text-xs text-gray-500 text-right">{appraiserSignatureDate}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center break-inside-avoid">
          <span style={{ color: BRAND.ink }} className="font-bold uppercase mb-2 text-sm">Official School Stamp</span>
          <div style={{ borderColor: BRAND.ink }} className="border-2 h-32 w-48 bg-white"></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `3px solid ${BRAND.gold}` }} className="pt-3 text-center text-[10px] text-gray-400 uppercase tracking-widest">
        Urafiki Carovana School — Only Wonder Knows
      </div>
    </div>
  );
}
