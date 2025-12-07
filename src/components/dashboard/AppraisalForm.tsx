'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { saveAppraisal } from '@/app/actions/appraisal-actions';
import { Save, ArrowLeft, Target, Eye, ClipboardCheck, FileText, Plus, Trash2, Printer, Download } from 'lucide-react';
import SignatureInput from '../SignatureInput';
import { getRoleCategory, UserRole } from '@/constants/roles';
import { LESSON_OBSERVATION_PARAMETERS, WORK_OBSERVATION_PARAMETERS, PROFESSIONAL_DOCUMENTS } from '@/constants/observation-criteria';
import { TEACHING_EVALUATION_PARAMETERS, NON_TEACHING_EVALUATION_PARAMETERS, SENIOR_LEADERSHIP_EVALUATION_PARAMETERS } from '@/constants/evaluation-criteria';

interface Target {
  id: number;
  area: string;
  target: string;
  actual: string;
}

interface AppraisalFormProps {
  appraiserId: string;
  appraisee: {
    id: string;
    full_name: string;
    role: string;
    email: string;
    job_category?: string;
  };
  existingAppraisal?: {
    appraisal_data: any;
    status: string;
    [key: string]: any;
  };
  initialTerm?: string;
  initialYear?: string;
  appraisalRole?: string;
}

type AppraisalView = 'MENU' | 'TARGETS' | 'OBSERVATION' | 'EVALUATION' | 'SCORESHEET';

export default function AppraisalForm({ appraiserId, appraisee, existingAppraisal, initialTerm, initialYear, appraisalRole }: AppraisalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPrintingFullReport, setIsPrintingFullReport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppraisalView>('MENU');
  
  // Initial state from existing appraisal or defaults
  const [formData, setFormData] = useState(existingAppraisal?.appraisal_data || {
    term: initialTerm || '',
    year: initialYear || new Date().getFullYear().toString(),
    targets: [
      { id: 1, area: '', target: '', actual: '' }
    ],
    observation: {
      ratings: {}, // { [index]: 1-4 }
      documents: {}, // { [index]: 'not_available' | 'available' | 'well_kept' }
      comments: ''
    },
    evaluation: {
      ratings: {}, // { [index]: 1-4 }
      progressComments: ['', ''],
      improvementComments: ['', '']
    },
    targetSignatures: {
      appraiseeSignature: '',
      appraiseeDate: '',
      appraiserSignature: '',
      appraiserDate: ''
    },
    completionSignatures: {
      appraiseeSignature: '',
      appraiseeDate: '',
      appraiserSignature: '',
      appraiserDate: ''
    }
  });

  const status = existingAppraisal?.status;
  const isCompleted = status === 'COMPLETED' || status === 'SIGNED';
  const isEvaluationSubmitted = status === 'EVALUATION_SUBMITTED' || isCompleted;
  const isObservationSubmitted = status === 'OBSERVATION_SUBMITTED' || isEvaluationSubmitted;
  const isTargetsSubmitted = status === 'TARGETS_SUBMITTED' || isObservationSubmitted;
  
  const effectiveRole = appraisalRole || appraisee.role;
  const roleCategory = getRoleCategory(effectiveRole as UserRole);
  const showTargets = roleCategory !== 'NON_TEACHING';
  const isTeachingStaff = roleCategory === 'TEACHING';
  const isSeniorLeadership = roleCategory === 'SENIOR_LEADERSHIP' || roleCategory === 'DIRECTOR';

  // Helper to get correct evaluation parameters
  const getEvaluationParameters = () => {
    if (isTeachingStaff) return TEACHING_EVALUATION_PARAMETERS;
    if (isSeniorLeadership) return SENIOR_LEADERSHIP_EVALUATION_PARAMETERS;
    return NON_TEACHING_EVALUATION_PARAMETERS;
  };

  // Target Calculations
  const calculateTargetStats = () => {
    const targets = formData.targets || [];
    if (targets.length === 0) return { average: 0, marks: 0, rating: 'Unsatisfactory' };
    
    let totalPercentage = 0;
    let count = 0;
    
    targets.forEach((t: Target) => {
      const target = parseFloat(t.target);
      const actual = parseFloat(t.actual);
      if (target > 0 && !isNaN(actual)) {
        totalPercentage += (actual / target) * 100;
        count++;
      }
    });
    
    const average = count > 0 ? totalPercentage / count : 0;
    
    let rating = 'Unsatisfactory';
    let marks = 5;
    
    if (average >= 99) { rating = 'Excellent'; marks = 33; }
    else if (average >= 95) { rating = 'Above Average'; marks = 30; }
    else if (average >= 86) { rating = 'Satisfactory'; marks = 20; }
    
    return { average: average.toFixed(1), marks, rating };
  };

  const targetStats = calculateTargetStats();

  // Observation Calculations
  const calculateObservationStats = () => {
    const ratings = formData.observation?.ratings || {};
    
    let totalScore = 0;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    Object.values(ratings).forEach((rating) => {
      const r = typeof rating === 'string' ? parseInt(rating) : rating as number;
      if (r >= 1 && r <= 4) {
        totalScore += r;
        counts[r as 1|2|3|4]++;
      }
    });

    return { totalScore, counts };
  };

  const observationStats = calculateObservationStats();

  // Evaluation Calculations
  const calculateEvaluationStats = () => {
    const ratings = formData.evaluation?.ratings || {};
    
    let totalScore = 0;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    Object.values(ratings).forEach((rating) => {
      const r = typeof rating === 'string' ? parseInt(rating) : rating as number;
      if (r >= 1 && r <= 4) {
        totalScore += r;
        counts[r as 1|2|3|4]++;
      }
    });

    return { totalScore, counts };
  };

  const evaluationStats = calculateEvaluationStats();

  // Target Handlers
  const addTarget = () => {
    const targets = formData.targets || [];
    const newId = targets.length > 0 ? Math.max(...targets.map((t: Target) => t.id)) + 1 : 1;
    setFormData({
      ...formData,
      targets: [...targets, { id: newId, area: '', target: '', actual: '' }]
    });
  };

  const removeTarget = (id: number) => {
    setFormData({
      ...formData,
      targets: formData.targets.filter((t: Target) => t.id !== id)
    });
  };

  const handleObservationRating = (index: number, rating: number) => {
    if (isCompleted || isObservationSubmitted) return;
    setFormData({
      ...formData,
      observation: {
        ...formData.observation,
        ratings: {
          ...formData.observation?.ratings,
          [index]: rating
        }
      }
    });
  };

  const handleDocumentRating = (index: number, status: string) => {
    if (isCompleted || isObservationSubmitted) return;
    setFormData({
      ...formData,
      observation: {
        ...formData.observation,
        documents: {
          ...formData.observation?.documents,
          [index]: status
        }
      }
    });
  };

  const handleEvaluationRating = (index: number, rating: number) => {
    if (isCompleted || isEvaluationSubmitted) return;
    setFormData({
      ...formData,
      evaluation: {
        ...formData.evaluation,
        ratings: {
          ...formData.evaluation?.ratings,
          [index]: rating
        }
      }
    });
  };

  // Calculate Max Scores for Percentage
  const calculateMaxScores = () => {
    let maxTargets = 0;
    let maxObservation = 0;
    let maxEvaluation = 0;

    if (showTargets) {
      maxTargets = 33;
    }

    if (isTeachingStaff) {
      maxObservation = LESSON_OBSERVATION_PARAMETERS.length * 4;
      maxEvaluation = TEACHING_EVALUATION_PARAMETERS.length * 4;
    } else if (roleCategory === 'NON_TEACHING') {
      maxObservation = WORK_OBSERVATION_PARAMETERS.length * 4;
      maxEvaluation = NON_TEACHING_EVALUATION_PARAMETERS.length * 4;
    } else {
      // Senior Leadership
      // Assuming they use Work Observation or similar? The image for Senior Leadership only shows Targets + Evaluation.
      // If no observation, maxObservation = 0.
      // Let's check the image again. "K. SCORESHEET ... Targets Score ... Employee Evaluation". No Observation row.
      maxObservation = 0; 
      maxEvaluation = SENIOR_LEADERSHIP_EVALUATION_PARAMETERS.length * 4;
    }

    return { maxTargets, maxObservation, maxEvaluation, totalMax: maxTargets + maxObservation + maxEvaluation };
  };

  const maxScores = calculateMaxScores();

  const calculateTotalScore = () => {
    let total = 0;
    if (showTargets) {
      total += targetStats.marks;
    }
    // Only add observation score if applicable (Senior Leadership might not have it based on image)
    if (roleCategory !== 'SENIOR_LEADERSHIP') {
      total += observationStats.totalScore;
    }
    total += evaluationStats.totalScore;
    return total;
  };

  const totalScore = calculateTotalScore();
  const percentage = maxScores.totalMax > 0 ? (totalScore / maxScores.totalMax) * 100 : 0;

  const getRating = (pct: number) => {
    if (pct >= 93) return 'Leading';
    if (pct >= 80) return 'Strong';
    if (pct >= 65) return 'Solid';
    if (pct >= 50) return 'Building';
    return 'Below Expectations';
  };

  const currentRating = getRating(percentage);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingFullReport(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleDownloadFullReport = () => {
    setIsPrintingFullReport(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSubmit = async (status: string) => {
    setLoading(true);
    setMessage(null);

    // Validation: Check signatures before submitting targets
    if (status === 'TARGETS_SUBMITTED') {
      if (!formData.targetSignatures?.appraiseeSignature || !formData.targetSignatures?.appraiserSignature) {
        setMessage({ type: 'error', text: 'Both Appraiser and Appraisee must sign before submitting targets.' });
        setLoading(false);
        return;
      }
    }

    // Validation: Check signatures before completing appraisal
    if (status === 'COMPLETED') {
      if (!formData.completionSignatures?.appraiseeSignature || !formData.completionSignatures?.appraiserSignature) {
        setMessage({ type: 'error', text: 'Both Appraiser and Appraisee must sign before completing the appraisal.' });
        setLoading(false);
        return;
      }
    }

    // Validation: Check Observation Parameters (Required for Saving in Observation View or Completing)
    if (status === 'OBSERVATION_SUBMITTED' || status === 'COMPLETED') {
      const params = isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;
      const ratings = formData.observation?.ratings || {};
      
      // Check if all parameters have a rating
      const missingIndex = params.findIndex((_, index) => !ratings[index]);
      
      if (missingIndex !== -1) {
        setMessage({ 
          type: 'error', 
          text: `Please rate all observation parameters before saving. (Missing item ${missingIndex + 1})` 
        });
        setLoading(false);
        return;
      }
    }

    // Validation: Check Evaluation Parameters
    if (status === 'EVALUATION_SUBMITTED' || status === 'COMPLETED') {
      const params = getEvaluationParameters();
      const ratings = formData.evaluation?.ratings || {};
      
      const missingIndex = params.findIndex((_, index) => !ratings[index]);
      
      if (missingIndex !== -1) {
        setMessage({ 
          type: 'error', 
          text: `Please rate all evaluation parameters before saving. (Missing item ${missingIndex + 1})` 
        });
        setLoading(false);
        return;
      }
    }

    const overallScore = calculateTotalScore();
    
    const payload = new FormData();
    payload.append('appraiserId', appraiserId);
    payload.append('appraiseeId', appraisee.id);
    if (existingAppraisal?.id) {
      payload.append('appraisalId', existingAppraisal.id);
    }
    payload.append('status', status);
    payload.append('role', effectiveRole);
    payload.append('appraisalData', JSON.stringify(formData));
    payload.append('overallScore', overallScore.toString());

    const result = await saveAppraisal(payload);

    if (result.success) {
      const successText = status === 'TARGETS_SUBMITTED' 
        ? 'Targets submitted successfully' 
        : status === 'OBSERVATION_SUBMITTED'
          ? 'Observations submitted successfully'
          : status === 'EVALUATION_SUBMITTED'
            ? 'Evaluation submitted successfully'
            : status === 'COMPLETED' 
              ? 'Appraisal completed successfully'
              : 'Progress saved successfully';
      
      setMessage({ type: 'success', text: successText });
      
      if (status === 'COMPLETED' || status === 'TARGETS_SUBMITTED' || status === 'OBSERVATION_SUBMITTED' || status === 'EVALUATION_SUBMITTED') {
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save appraisal' });
    }
    setLoading(false);
  };

  // Render Menu View
  if (currentView === 'MENU' && !isPrintingFullReport) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4 text-gray-500 hover:text-gray-700" aria-label="Go back">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appraisal Dashboard</h1>
              <p className="text-sm text-gray-500">Appraising: <span className="font-medium text-gray-900">{appraisee.full_name}</span> ({effectiveRole})</p>
              <p className="text-xs text-gray-400">{formData.term} {formData.year}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Setting Targets */}
          {showTargets && (
            <button
              onClick={() => setCurrentView('TARGETS')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group text-center"
            >
              <div className="p-4 bg-blue-50 rounded-full mb-4 group-hover:bg-blue-100">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Setting Targets</h3>
              <p className="text-sm text-gray-500 mt-2">Set and review performance targets for the term.</p>
            </button>
          )}

          {/* 2. Lesson/Work Observation */}
          <button
            onClick={() => setCurrentView('OBSERVATION')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all group text-center"
          >
            <div className="p-4 bg-purple-50 rounded-full mb-4 group-hover:bg-purple-100">
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{isTeachingStaff ? 'Lesson Observation' : 'Work Observation'}</h3>
            <p className="text-sm text-gray-500 mt-2">Record observations and feedback.</p>
          </button>

          {/* 3. Employee Evaluation */}
          <button
            onClick={() => setCurrentView('EVALUATION')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all group text-center"
          >
            <div className="p-4 bg-orange-50 rounded-full mb-4 group-hover:bg-orange-100">
              <ClipboardCheck className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Employee Evaluation</h3>
            <p className="text-sm text-gray-500 mt-2">Evaluate competencies and general performance.</p>
          </button>

          {/* 4. Final Scoresheet */}
          <button
            onClick={() => setCurrentView('SCORESHEET')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all group text-center"
          >
            <div className="p-4 bg-green-50 rounded-full mb-4 group-hover:bg-green-100">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Final Scoresheet</h3>
            <p className="text-sm text-gray-500 mt-2">Review scores, sign, and submit the final appraisal.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
      {/* Header for Sub-views */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <div className="flex items-center">
          <button onClick={() => setCurrentView('MENU')} className="mr-4 text-gray-500 hover:text-gray-700" aria-label="Back to Menu">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentView === 'TARGETS' && 'Setting Targets'}
              {currentView === 'OBSERVATION' && (isTeachingStaff ? 'Lesson Observation' : 'Work Observation')}
              {currentView === 'EVALUATION' && 'Employee Evaluation'}
              {currentView === 'SCORESHEET' && 'Final Scoresheet'}
            </h1>
            <p className="text-sm text-gray-500">Appraising: <span className="font-medium text-gray-900">{appraisee.full_name}</span></p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {currentView === 'SCORESHEET' && (isCompleted || status === 'COMPLETED' || status === 'SIGNED') && (
            <>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Scoresheet
              </button>
              <button
                onClick={handleDownloadFullReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Full Report
              </button>
            </>
          )}
          {!isCompleted && (
            <button
              onClick={() => handleSubmit(existingAppraisal?.status || 'DRAFT')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md print:hidden ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* FULL REPORT VIEW */}
      {isPrintingFullReport && (
        <div className="space-y-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 uppercase">Staff Appraisal Report</h1>
            <p className="text-lg text-gray-600 mt-2">{appraisee.full_name} - {appraisee.role}</p>
            <p className="text-sm text-gray-500">{formData.term} {formData.year}</p>
          </div>

          {/* Targets Section */}
          {showTargets && (
            <div className="break-inside-avoid">
              <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">A. TARGETS</h3>
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">Area</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">Target</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">Actual</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(formData.targets || []).map((target: Target) => {
                     const pct = (parseFloat(target.target) > 0 && !isNaN(parseFloat(target.actual))) 
                        ? ((parseFloat(target.actual) / parseFloat(target.target)) * 100).toFixed(1) 
                        : '0.0';
                     return (
                      <tr key={target.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{target.area}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{target.target}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{target.actual}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{pct}%</td>
                      </tr>
                     );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Observation Section */}
          {!isSeniorLeadership && (
             <div className="break-inside-avoid">
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
                  {isTeachingStaff ? 'B. LESSON OBSERVATION' : 'C. WORK OBSERVATION'}
                </h3>
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/3">Parameter</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS).map((param, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{index + 1}. {param}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 font-medium">
                          {formData.observation?.ratings?.[index] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {/* Evaluation Section */}
          <div className="break-inside-avoid">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
               {isSeniorLeadership ? 'D. EMPLOYEE EVALUATION' : 'D. EMPLOYEE EVALUATION'}
            </h3>
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/3">Parameter</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getEvaluationParameters().map((param, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-900 border-r">{index + 1}. {param}</td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 font-medium">
                      {formData.evaluation?.ratings?.[index] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scoresheet Section */}
          <div className="break-inside-avoid">
             <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">SCORESHEET SUMMARY</h3>
             <table className="min-w-full divide-y divide-gray-200 border border-gray-300 mb-8">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">Component</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-300">Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {showTargets && (
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">TARGETS SCORE</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{targetStats.marks}</td>
                      </tr>
                    )}
                    {!isSeniorLeadership && (
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                          {isTeachingStaff ? 'LESSON OBSERVATION' : 'WORK OBSERVATION'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{observationStats.totalScore}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">EMPLOYEE EVALUATION</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{evaluationStats.totalScore}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">TOTAL SCORE</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{totalScore}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">PERCENTAGE</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{percentage.toFixed(1)}%</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">RATING</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 uppercase">{currentRating}</td>
                    </tr>
                  </tbody>
             </table>

             {/* Signatures */}
             <div className="grid grid-cols-2 gap-8 mt-8">
                <div className="border border-gray-300 p-4 h-40 flex flex-col justify-between">
                   <span className="text-xs text-gray-500 uppercase">Appraisee Signature ({formData.term})</span>
                   {formData.completionSignatures?.appraiseeSignature ? (
                      <Image 
                        src={formData.completionSignatures.appraiseeSignature} 
                        alt="Appraisee Signature" 
                        width={200} 
                        height={80} 
                        className="h-20 w-auto object-contain mx-auto" 
                      />
                   ) : <div className="text-center text-gray-400 italic">Not signed</div>}
                   <span className="text-xs text-gray-500 text-right">{formData.completionSignatures?.appraiseeDate}</span>
                </div>
                <div className="border border-gray-300 p-4 h-40 flex flex-col justify-between">
                   <span className="text-xs text-gray-500 uppercase">Appraiser Signature ({formData.term})</span>
                   {formData.completionSignatures?.appraiserSignature ? (
                      <Image 
                        src={formData.completionSignatures.appraiserSignature} 
                        alt="Appraiser Signature" 
                        width={200} 
                        height={80} 
                        className="h-20 w-auto object-contain mx-auto" 
                      />
                   ) : <div className="text-center text-gray-400 italic">Not signed</div>}
                   <span className="text-xs text-gray-500 text-right">{formData.completionSignatures?.appraiserDate}</span>
                </div>
             </div>
             
             <div className="mt-8 flex flex-col items-center">
                <span className="text-gray-900 font-bold uppercase mb-2">Official School Stamp</span>
                <div className="border-2 border-gray-800 h-32 w-48 bg-white"></div>
             </div>
          </div>
        </div>
      )}

      {/* TARGETS VIEW */}
      {!isPrintingFullReport && currentView === 'TARGETS' && (
        <div className="space-y-8">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Targets Scoresheet</h3>
              {!isCompleted && (
                <button onClick={addTarget} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
                  <Plus className="h-4 w-4 mr-1" /> Add Target
                </button>
              )}
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Area</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Achieved</th>
                      {!isCompleted && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(formData.targets || []).map((target: Target) => {
                      const pct = (parseFloat(target.target) > 0 && !isNaN(parseFloat(target.actual))) 
                        ? ((parseFloat(target.actual) / parseFloat(target.target)) * 100).toFixed(1) 
                        : '0.0';
                      
                      return (
                        <tr key={target.id}>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={target.area}
                              onChange={(e) => {
                                const newTargets = formData.targets.map((t: Target) => 
                                  t.id === target.id ? { ...t, area: e.target.value } : t
                                );
                                setFormData({ ...formData, targets: newTargets });
                              }}
                              disabled={isCompleted}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white"
                              placeholder="Area of focus"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={target.target}
                              onChange={(e) => {
                                const newTargets = formData.targets.map((t: Target) => 
                                  t.id === target.id ? { ...t, target: e.target.value } : t
                                );
                                setFormData({ ...formData, targets: newTargets });
                              }}
                              disabled={isCompleted}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white"
                              placeholder="Target"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={target.actual}
                              onChange={(e) => {
                                const newTargets = formData.targets.map((t: Target) => 
                                  t.id === target.id ? { ...t, actual: e.target.value } : t
                                );
                                setFormData({ ...formData, targets: newTargets });
                              }}
                              disabled={isCompleted}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white"
                              placeholder="Actual"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pct}%
                          </td>
                          {!isCompleted && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={() => removeTarget(target.id)} className="text-red-600 hover:text-red-900" aria-label="Remove Target">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OBSERVATION VIEW */}
      {!isPrintingFullReport && currentView === 'OBSERVATION' && (
        <div className="space-y-8">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isTeachingStaff ? 'B. LESSON OBSERVATION FORM' : 'C. WORK OBSERVATION FORM'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isTeachingStaff ? 'Tick one box only for each Parameter.' : 'Tick one box only for each Parameter.'}
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Parameters</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unsatisfactory (1)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfactory (2)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Above Average (3)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Excellent (4)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS).map((param, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}. {param}
                        </td>
                        {[1, 2, 3, 4].map((rating) => (
                          <td key={rating} className="px-2 py-4 text-center">
                            <input
                              type="radio"
                              name={`observation-rating-${index}`}
                              checked={formData.observation?.ratings?.[index] === rating}
                              onChange={() => handleObservationRating(index, rating)}
                              disabled={isCompleted || isObservationSubmitted}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 disabled:opacity-50"
                              aria-label={`Rating ${rating} for parameter ${index + 1}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-medium">
                    <tr>
                      <td className="px-6 py-4 text-right">COUNT (x1, x2, x3, x4)</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[1]}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[2]}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[3]}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[4]}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-right">Parameters Marks</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[1] * 1}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[2] * 2}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[3] * 3}</td>
                      <td className="px-2 py-4 text-center">{observationStats.counts[4] * 4}</td>
                    </tr>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 text-right font-bold text-blue-900">FINAL OBSERVATION SCORE</td>
                      <td colSpan={4} className="px-6 py-4 text-center font-bold text-xl text-blue-600">
                        {observationStats.totalScore}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Professional Documents (Only for Teaching Staff) */}
          {isTeachingStaff && (
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Professional Documents</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Document</th>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Not Available</th>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Well Kept</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {PROFESSIONAL_DOCUMENTS.map((doc, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {index + 1}. {doc}
                          </td>
                          {['not_available', 'available', 'well_kept'].map((status) => (
                            <td key={status} className="px-2 py-4 text-center">
                              <input
                                type="radio"
                                name={`document-status-${index}`}
                                checked={formData.observation?.documents?.[index] === status}
                                onChange={() => handleDocumentRating(index, status)}
                                disabled={isCompleted || isObservationSubmitted}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 disabled:opacity-50"
                                aria-label={`${status.replace('_', ' ')} for document ${index + 1}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">General Comments</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <textarea
                rows={4}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 bg-white"
                placeholder="Enter any additional observations here..."
                value={formData.observation?.comments || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  observation: { ...formData.observation, comments: e.target.value }
                })}
                disabled={isCompleted}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {!isObservationSubmitted && (
              <button
                onClick={() => handleSubmit('OBSERVATION_SUBMITTED')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {loading ? 'Submitting...' : 'Submit Observations'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* EVALUATION VIEW */}
      {!isPrintingFullReport && currentView === 'EVALUATION' && (
        <div className="space-y-8">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isSeniorLeadership 
                  ? 'D. EMPLOYEE EVALUATION - SENIOR LEADERSHIP' 
                  : isTeachingStaff 
                    ? 'D. EMPLOYEE EVALUATION - TEACHING STAFF' 
                    : 'D. EMPLOYEE EVALUATION - NON-TEACHING STAFF'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Tick one box only for each Parameter.
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Parameters</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unsatisfactory (1)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfactory (2)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Above Average (3)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Excellent (4)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getEvaluationParameters().map((param, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}. {param}
                        </td>
                        {[1, 2, 3, 4].map((rating) => (
                          <td key={rating} className="px-2 py-4 text-center">
                            <input
                              type="radio"
                              name={`evaluation-rating-${index}`}
                              checked={formData.evaluation?.ratings?.[index] === rating}
                              onChange={() => handleEvaluationRating(index, rating)}
                              disabled={isCompleted || isEvaluationSubmitted}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 disabled:opacity-50"
                              aria-label={`Rating ${rating} for parameter ${index + 1}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-medium">
                    <tr>
                      <td className="px-6 py-4 text-right">COUNT (x1, x2, x3, x4)</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[1]}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[2]}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[3]}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[4]}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-right">Parameters Marks</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[1] * 1}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[2] * 2}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[3] * 3}</td>
                      <td className="px-2 py-4 text-center">{evaluationStats.counts[4] * 4}</td>
                    </tr>
                    <tr className="bg-orange-50 border-t-2 border-orange-200">
                      <td className="px-6 py-4 text-right font-bold text-orange-900">EMPLOYEE EVALUATION SCORE</td>
                      <td colSpan={4} className="px-6 py-4 text-center font-bold text-xl text-orange-600">
                        {evaluationStats.totalScore}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Comments</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">PROGRESS MADE</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 bg-white"
                    placeholder="1."
                    value={formData.evaluation?.progressComments?.[0] || ''}
                    onChange={(e) => {
                      const newComments = [...(formData.evaluation?.progressComments || ['', ''])];
                      newComments[0] = e.target.value;
                      setFormData({
                        ...formData,
                        evaluation: { ...formData.evaluation, progressComments: newComments }
                      });
                    }}
                    disabled={isCompleted}
                  />
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 bg-white"
                    placeholder="2."
                    value={formData.evaluation?.progressComments?.[1] || ''}
                    onChange={(e) => {
                      const newComments = [...(formData.evaluation?.progressComments || ['', ''])];
                      newComments[1] = e.target.value;
                      setFormData({
                        ...formData,
                        evaluation: { ...formData.evaluation, progressComments: newComments }
                      });
                    }}
                    disabled={isCompleted}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">TO IMPROVE ON</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 bg-white"
                    placeholder="1."
                    value={formData.evaluation?.improvementComments?.[0] || ''}
                    onChange={(e) => {
                      const newComments = [...(formData.evaluation?.improvementComments || ['', ''])];
                      newComments[0] = e.target.value;
                      setFormData({
                        ...formData,
                        evaluation: { ...formData.evaluation, improvementComments: newComments }
                      });
                    }}
                    disabled={isCompleted}
                  />
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 bg-white"
                    placeholder="2."
                    value={formData.evaluation?.improvementComments?.[1] || ''}
                    onChange={(e) => {
                      const newComments = [...(formData.evaluation?.improvementComments || ['', ''])];
                      newComments[1] = e.target.value;
                      setFormData({
                        ...formData,
                        evaluation: { ...formData.evaluation, improvementComments: newComments }
                      });
                    }}
                    disabled={isCompleted}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {!isEvaluationSubmitted && (
              <button
                onClick={() => handleSubmit('EVALUATION_SUBMITTED')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {loading ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCORESHEET VIEW */}
      {!isPrintingFullReport && currentView === 'SCORESHEET' && (
        <div className="space-y-8">
          {/* Summary */}
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isSeniorLeadership 
                  ? 'K. SCORESHEET - SENIOR LEADERSHIP' 
                  : isTeachingStaff 
                    ? 'I. SCORESHEET - TEACHING STAFF' 
                    : 'J. SCORESHEET - NON-TEACHING STAFF'}
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Component</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Term 1</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Term 2</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Term 3</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const termNum = formData.term.includes('2') ? 2 : formData.term.includes('3') ? 3 : 1;
                      
                      return (
                        <>
                          {showTargets && (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300">TARGETS SCORE</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 1 ? targetStats.marks : '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 2 ? targetStats.marks : '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{termNum === 3 ? targetStats.marks : '-'}</td>
                            </tr>
                          )}
                          {!isSeniorLeadership && (
                            <>
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300">
                                  {isTeachingStaff ? 'LESSON OBSERVATION' : 'WORK OBSERVATION'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 1 ? observationStats.totalScore : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 2 ? observationStats.totalScore : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{termNum === 3 ? observationStats.totalScore : '-'}</td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300">EMPLOYEE EVALUATION</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 1 ? evaluationStats.totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300">{termNum === 2 ? evaluationStats.totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{termNum === 3 ? evaluationStats.totalScore : '-'}</td>
                          </tr>
                          <tr className="bg-gray-50 font-bold">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">TERMLY TOTALS</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 border-r border-gray-300">{termNum === 1 ? totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 border-r border-gray-300">{termNum === 2 ? totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{termNum === 3 ? totalScore : '-'}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Rating Scale</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Leading (93%-100%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Leading' ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {currentRating === 'Leading' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Strong (80%-92%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Strong' ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {currentRating === 'Strong' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Solid (65%-79%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Solid' ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {currentRating === 'Solid' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Building (50%-64%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Building' ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {currentRating === 'Building' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Below Expectations (&lt;49%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Below Expectations' ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {currentRating === 'Below Expectations' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase">Current Term Score</h4>
                  <div className="text-4xl font-bold text-blue-600 mb-2">{percentage.toFixed(1)}%</div>
                  <p className="text-sm text-gray-500">Based on Termly Total: {totalScore} / {maxScores.totalMax}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Signatures</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {/* Target Signatures (if applicable) */}
              {showTargets && (
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Targets Agreement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SignatureInput
                      label="Appraisee Signature"
                      value={formData.targetSignatures?.appraiseeSignature || ''}
                      onChange={(val) => {
                        const date = val ? new Date().toISOString().split('T')[0] : '';
                        setFormData({
                          ...formData,
                          targetSignatures: { 
                            ...formData.targetSignatures, 
                            appraiseeSignature: val,
                            appraiseeDate: date
                          }
                        });
                      }}
                      disabled={isTargetsSubmitted}
                      date={formData.targetSignatures?.appraiseeDate || ''}
                      onDateChange={(date) => setFormData({
                        ...formData,
                        targetSignatures: { ...formData.targetSignatures, appraiseeDate: date }
                      })}
                    />
                    <SignatureInput
                      label="Appraiser Signature"
                      value={formData.targetSignatures?.appraiserSignature || ''}
                      onChange={(val) => {
                        const date = val ? new Date().toISOString().split('T')[0] : '';
                        setFormData({
                          ...formData,
                          targetSignatures: { 
                            ...formData.targetSignatures, 
                            appraiserSignature: val,
                            appraiserDate: date
                          }
                        });
                      }}
                      disabled={isTargetsSubmitted}
                      date={formData.targetSignatures?.appraiserDate || ''}
                      onDateChange={(date) => setFormData({
                        ...formData,
                        targetSignatures: { ...formData.targetSignatures, appraiserDate: date }
                      })}
                    />
                  </div>
                  {!isTargetsSubmitted && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleSubmit('TARGETS_SUBMITTED')}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {loading ? 'Submitting...' : 'Submit Targets'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Final Signatures */}
              <div className="border-t border-gray-200 pt-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Final Appraisal Agreement</h4>
                
                {/* Term Signatures */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-700 mb-2 uppercase">{formData.term || 'Term'}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SignatureInput
                      label="Appraisee Signature"
                      value={formData.completionSignatures?.appraiseeSignature || ''}
                      onChange={(val) => {
                        const date = val ? new Date().toISOString().split('T')[0] : '';
                        setFormData({
                          ...formData,
                          completionSignatures: { 
                            ...formData.completionSignatures, 
                            appraiseeSignature: val,
                            appraiseeDate: date
                          }
                        });
                      }}
                      disabled={isCompleted}
                      date={formData.completionSignatures?.appraiseeDate || ''}
                      onDateChange={(date) => setFormData({
                        ...formData,
                        completionSignatures: { ...formData.completionSignatures, appraiseeDate: date }
                      })}
                    />
                    <SignatureInput
                      label="Appraiser Signature"
                      value={formData.completionSignatures?.appraiserSignature || ''}
                      onChange={(val) => {
                        const date = val ? new Date().toISOString().split('T')[0] : '';
                        setFormData({
                          ...formData,
                          completionSignatures: { 
                            ...formData.completionSignatures, 
                            appraiserSignature: val,
                            appraiserDate: date
                          }
                        });
                      }}
                      disabled={isCompleted}
                      date={formData.completionSignatures?.appraiserDate || ''}
                      onDateChange={(date) => setFormData({
                        ...formData,
                        completionSignatures: { ...formData.completionSignatures, appraiserDate: date }
                      })}
                    />
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6 flex flex-col items-center">
                   <span className="text-gray-900 font-bold uppercase mb-2">Official School Stamp</span>
                   <div className="border-2 border-gray-800 h-32 w-48 bg-white"></div>
                </div>

              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              {!isCompleted && (
                <button
                  onClick={() => handleSubmit('COMPLETED')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {loading ? 'Submitting...' : 'Submit Final Appraisal'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}