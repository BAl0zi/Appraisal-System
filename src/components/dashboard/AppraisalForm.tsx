'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { saveAppraisal } from '@/app/actions/appraisal-actions';
import { Save, ArrowLeft, Target, Eye, ClipboardCheck, FileText, Plus, Trash2, Printer, Download, CheckCircle, ClipboardList, Loader2 } from 'lucide-react';
import SignatureInput from '../SignatureInput';
import { getRoleCategory, UserRole } from '@/constants/roles';
import { LESSON_OBSERVATION_PARAMETERS, WORK_OBSERVATION_PARAMETERS, PROFESSIONAL_DOCUMENTS } from '@/constants/observation-criteria';
import { TEACHING_EVALUATION_PARAMETERS, NON_TEACHING_EVALUATION_PARAMETERS, SENIOR_LEADERSHIP_EVALUATION_PARAMETERS } from '@/constants/evaluation-criteria';

interface Target {
  id: number;
  area: string;
  description?: string;
  target: string;
  actual: string;
  actualDescription?: string;
}

interface AppraisalFormProps {
  appraiserId: string;
  appraiser?: {
    full_name: string;
    [key: string]: any;
  };
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
  initialView?: string;
  hideBack?: boolean;
}

type AppraisalView = 'MENU' | 'TARGETS' | 'OBSERVATION' | 'EVALUATION' | 'SCORESHEET';

export default function AppraisalForm({ appraiserId, appraiser, appraisee, existingAppraisal, initialTerm, initialYear, appraisalRole, initialView, hideBack }: AppraisalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPrintingFullReport, setIsPrintingFullReport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppraisalView>((initialView as AppraisalView) || 'MENU');
  
  // Initial state from existing appraisal or defaults
  const [formData, setFormData] = useState(() => {
    const data = existingAppraisal?.appraisal_data || {};
    
    // Default observation structure
    const defaultObs = {
      ratings: {}, 
      documents: {}, 
      comments: '',
      observationType: 'FIRST',
      classGrade: '',
      time: '',
      learnersPresent: '',
      date: '',
      subject: '',
      topic: '',
      workAppraised: '',
      status: 'PENDING' // 'PENDING' | 'COMPLETED'
    };

    return {
      term: initialTerm || '',
      year: initialYear || new Date().getFullYear().toString(),
      targets: [
        { id: 1, area: '', description: '', target: '', actual: '', actualDescription: '' }
      ],
      // Migrate old single observation to observation1 if needed
      observation1: data.observation1 || data.observation || defaultObs,
      observation2: data.observation2 || { ...defaultObs, observationType: 'SECOND' },
      evaluation: {
        ratings: {}, 
        progressComments: ['', ''],
        improvementComments: ['', '']
      },
      targetSignatures: {
        appraiseeSignature: '',
        appraiseeDate: '',
        appraiserSignature: '',
        appraiserDate: ''
      },
      targetReviewSignatures: {
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
      },
      ...data // Overwrite with existing data, but ensure obs1/obs2 exist
    };
  });

  const [activeObservation, setActiveObservation] = useState<'FIRST' | 'SECOND'>('FIRST');
  const [observationViewMode, setObservationViewMode] = useState<'SELECTION' | 'FORM'>('SELECTION');

  const status = existingAppraisal?.status;
  const isCompleted = status === 'COMPLETED' || status === 'SIGNED';
  
  // Linear Progression:
  // 1. TARGETS_SET (Phase 1)
  // 2. OBSERVATION_SUBMITTED
  // 3. EVALUATION_SUBMITTED
  // 4. TARGETS_SUBMITTED (Phase 2 - Review)
  // 5. COMPLETED

  const isTargetsSubmitted = status === 'TARGETS_SUBMITTED' || isCompleted;
  const isEvaluationSubmitted = status === 'EVALUATION_SUBMITTED' || isTargetsSubmitted;
  const isObservationSubmitted = status === 'OBSERVATION_SUBMITTED' || isEvaluationSubmitted;
  const isTargetsSet = status === 'TARGETS_SET' || isObservationSubmitted;
  
  const effectiveRole = appraisalRole || appraisee.role;
  const roleCategory = getRoleCategory(effectiveRole as UserRole);
  const showTargets = roleCategory !== 'NON_TEACHING';
  const isTeachingStaff = roleCategory === 'TEACHING';
  const isSeniorLeadership = roleCategory === 'SENIOR_LEADERSHIP' || roleCategory === 'DIRECTOR';
  const showObservations = roleCategory === 'TEACHING' || roleCategory === 'NON_TEACHING';

  // Helper to get correct evaluation parameters
  const getEvaluationParameters = () => {
    if (isTeachingStaff) return TEACHING_EVALUATION_PARAMETERS;
    if (isSeniorLeadership) return SENIOR_LEADERSHIP_EVALUATION_PARAMETERS;
    return NON_TEACHING_EVALUATION_PARAMETERS;
  };

  const evaluationParams = getEvaluationParameters();
  const observationParams = isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;

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
    const calcScoreAndCounts = (ratings: any) => {
      let s = 0;
      const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
      Object.values(ratings || {}).forEach((rating) => {
        const r = typeof rating === 'string' ? parseInt(rating) : rating as number;
        if (r >= 1 && r <= 4) {
            s += r;
            c[r as 1|2|3|4]++;
        }
      });
      return { score: s, counts: c };
    };

    const obs1 = calcScoreAndCounts(formData.observation1?.ratings);
    const obs2 = calcScoreAndCounts(formData.observation2?.ratings);
    
    const hasObs2 = formData.observation2?.ratings && Object.keys(formData.observation2.ratings).length > 0;
    const totalScore = hasObs2 ? (obs1.score + obs2.score) / 2 : obs1.score;

    return { 
        score1: obs1.score, 
        counts1: obs1.counts,
        score2: obs2.score, 
        counts2: obs2.counts,
        totalScore: parseFloat(totalScore.toFixed(1)) 
    };
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
      targets: [...targets, { id: newId, area: '', description: '', target: '', actual: '', actualDescription: '' }]
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
    const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        ratings: {
          ...formData[key]?.ratings,
          [index]: rating
        }
      }
    });
  };

  const handleDocumentRating = (index: number, status: string) => {
    if (isCompleted || isObservationSubmitted) return;
    const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        documents: {
          ...formData[key]?.documents,
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

    // Only Teaching and Non-Teaching staff have observations
    if (showObservations) {
      maxObservation = observationParams.length * 4;
    }

    maxEvaluation = evaluationParams.length * 4;

    return { maxTargets, maxObservation, maxEvaluation, totalMax: maxTargets + maxObservation + maxEvaluation };
  };

  const maxScores = calculateMaxScores();

  const calculateTotalScore = () => {
    let total = 0;
    if (showTargets) {
      total += targetStats.marks;
    }
    // Only add observation score if applicable
    if (showObservations) {
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

  const handleMarkObservationComplete = async (obsNum: 1 | 2) => {
    setLoading(true);
    setMessage(null);

    const params = isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;
    const obsKey = obsNum === 1 ? 'observation1' : 'observation2';
    const currentObs = formData[obsKey];
    
    // Validate
    const ratings = currentObs?.ratings || {};
    const missingIndex = params.findIndex((_, index) => !ratings[index]);
    
    if (missingIndex !== -1) {
      setMessage({ 
        type: 'error', 
        text: `Please rate all parameters for ${obsNum === 1 ? 'First' : 'Second'} Observation before marking as complete. (Missing item ${missingIndex + 1})` 
      });
      setLoading(false);
      return;
    }

    if (!currentObs?.date) {
        setMessage({ 
            type: 'error', 
            text: `Please select a date for the ${obsNum === 1 ? 'First' : 'Second'} Observation.` 
        });
        setLoading(false);
        return;
    }

    if (!currentObs?.time) {
        setMessage({ 
            type: 'error', 
            text: `Please enter the time for the ${obsNum === 1 ? 'First' : 'Second'} Observation.` 
        });
        setLoading(false);
        return;
    }

    if (!isTeachingStaff && !currentObs?.workAppraised) {
         setMessage({ 
            type: 'error', 
            text: `Please enter 'Work Appraised' for the ${obsNum === 1 ? 'First' : 'Second'} Observation.` 
        });
        setLoading(false);
        return;
    }

    // Update status in local state
    const updatedFormData = {
        ...formData,
        [obsKey]: {
            ...currentObs,
            status: 'COMPLETED'
        }
    };
    setFormData(updatedFormData);

    // Save to backend
    const overallScore = calculateTotalScore(); // Note: Uses current state, might be slightly stale but acceptable for intermediate save
    
    const payload = new FormData();
    payload.append('appraiserId', appraiserId);
    payload.append('appraiseeId', appraisee.id);
    if (existingAppraisal?.id) {
      payload.append('appraisalId', existingAppraisal.id);
    }
    // Keep existing status
    payload.append('status', existingAppraisal?.status || 'DRAFT'); 
    payload.append('role', effectiveRole);
    payload.append('appraisalData', JSON.stringify(updatedFormData));
    payload.append('overallScore', overallScore.toString());

    const result = await saveAppraisal(payload);

    if (result.success) {
        setMessage({ type: 'success', text: `${obsNum === 1 ? 'First' : 'Second'} Observation marked as completed.` });
        setObservationViewMode('SELECTION');
    } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save observation status.' });
    }
    setLoading(false);
  };

  const handleSubmit = async (status: string) => {
    setLoading(true);
    setMessage(null);

    // Validation: Check signatures before setting targets (Phase 1)
    if (status === 'TARGETS_SET') {
      if (!formData.targetSignatures?.appraiseeSignature || !formData.targetSignatures?.appraiserSignature) {
        setMessage({ type: 'error', text: 'Both Appraiser and Appraisee must sign before setting targets.' });
        setLoading(false);
        return;
      }
    }

    // Validation: Check signatures before submitting targets review (Phase 2)
    if (status === 'TARGETS_SUBMITTED') {
      // 1. Check Signatures
      if (!formData.targetReviewSignatures?.appraiseeSignature || !formData.targetReviewSignatures?.appraiserSignature) {
        setMessage({ type: 'error', text: 'Both Appraiser and Appraisee must sign the review before completing targets.' });
        setLoading(false);
        return;
      }

      // 2. Check Actuals
      const missingActual = formData.targets.find((t: Target) => !t.actual || t.actual.trim() === '');
      if (missingActual) {
        setMessage({ type: 'error', text: 'All targets must have an "Actual" performance value entered before submitting the review.' });
        setLoading(false);
        return;
      }
    }

    // Validation: Check signatures before completing appraisal
    if (status === 'COMPLETED') {
      // 1. Check Final Signatures
      if (!formData.completionSignatures?.appraiseeSignature || !formData.completionSignatures?.appraiserSignature) {
        setMessage({ type: 'error', text: 'Both Appraiser and Appraisee must sign before completing the appraisal.' });
        setLoading(false);
        return;
      }

      // 2. Check Targets (Phase 2) - Actuals and Signatures
      if (showTargets) {
        // Check if Phase 2 signatures are present
        if (!formData.targetReviewSignatures?.appraiseeSignature || !formData.targetReviewSignatures?.appraiserSignature) {
          setMessage({ type: 'error', text: 'Targets Review (Phase 2) must be signed by both parties before completing the appraisal.' });
          setLoading(false);
          return;
        }

        // Check if actuals are entered
        const missingActual = formData.targets.find((t: Target) => !t.actual || t.actual.trim() === '');
        if (missingActual) {
          setMessage({ type: 'error', text: 'All targets must have an "Actual" performance value entered before completing the appraisal.' });
          setLoading(false);
          return;
        }
      }
    }

    // Validation: Check Observation Parameters (Required for Saving in Observation View or Completing)
    if ((status === 'OBSERVATION_SUBMITTED' || status === 'COMPLETED') && showObservations) {
      const params = isTeachingStaff ? LESSON_OBSERVATION_PARAMETERS : WORK_OBSERVATION_PARAMETERS;
      
      // Validate Observation 1 (Mandatory)
      const ratings1 = formData.observation1?.ratings || {};
      const missingIndex1 = params.findIndex((_, index) => !ratings1[index]);
      
      if (missingIndex1 !== -1) {
        setMessage({ 
          type: 'error', 
          text: `Please rate all parameters for First Observation. (Missing item ${missingIndex1 + 1})` 
        });
        setLoading(false);
        return;
      }

      if (!formData.observation1?.date || !formData.observation1?.time) {
         setMessage({ 
            type: 'error', 
            text: `Please ensure Date and Time are filled First Observation.` 
          });
          setLoading(false);
          return;
      }

      if (!isTeachingStaff && !formData.observation1?.workAppraised) {
        setMessage({ 
            type: 'error', 
            text: `Please enter 'Work Appraised' for First Observation.` 
          });
          setLoading(false);
          return;
      }

      // Validate Observation 2 (Optional, but if started, must be complete)
      const ratings2 = formData.observation2?.ratings || {};
      const hasObs2 = Object.keys(ratings2).length > 0 || formData.observation2?.date;
      
      if (hasObs2) {
          const missingIndex2 = params.findIndex((_, index) => !ratings2[index]);
          if (missingIndex2 !== -1) {
            setMessage({ 
                type: 'error', 
                text: `Please rate all parameters for Second Observation. (Missing item ${missingIndex2 + 1})` 
            });
            setLoading(false);
            return;
          }

          if (!formData.observation2?.date || !formData.observation2?.time) {
            setMessage({ 
               type: 'error', 
               text: `Please ensure Date and Time are filled Second Observation.` 
             });
             setLoading(false);
             return;
         }
   
         if (!isTeachingStaff && !formData.observation2?.workAppraised) {
           setMessage({ 
               type: 'error', 
               text: `Please enter 'Work Appraised' for Second Observation.` 
             });
             setLoading(false);
             return;
         }
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
      const successText = status === 'TARGETS_SET'
        ? 'Targets set successfully'
        : status === 'TARGETS_SUBMITTED' 
          ? 'Targets review submitted successfully' 
          : status === 'OBSERVATION_SUBMITTED'
            ? 'Observations submitted successfully'
            : status === 'EVALUATION_SUBMITTED'
              ? 'Evaluation submitted successfully'
              : status === 'COMPLETED' 
                ? 'Appraisal completed successfully'
                : 'Progress saved successfully';
      
      setMessage({ type: 'success', text: successText });
      
      // Only redirect if we are advancing the status or completing the appraisal
      // If we are just saving progress (status hasn't changed), don't redirect
      const isAdvancing = status !== existingAppraisal?.status;
      
      if (isAdvancing || status === 'COMPLETED') {
        router.refresh();
        setTimeout(() => setCurrentView('MENU'), 1500);
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
            {!hideBack && (
              <button onClick={() => router.back()} className="mr-4 text-gray-500 hover:text-gray-700" aria-label="Go back">
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
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
              className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group text-center relative"
            >
              {isTargetsSubmitted ? (
                <div className="absolute top-4 right-4 text-green-500 flex items-center text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 mr-1" /> Completed
                </div>
              ) : isTargetsSet ? (
                <div className="absolute top-4 right-4 text-yellow-600 flex items-center text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 mr-1" /> Phase 1 Done
                </div>
              ) : null}
              <div className="p-4 bg-blue-50 rounded-full mb-4 group-hover:bg-blue-100">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Setting Targets</h3>
              <p className="text-sm text-gray-500 mt-2">Set and review performance targets for the term.</p>
            </button>
          )}

          {/* 2. First Lesson/Work Observation */}
          {showObservations && (
          <button
            onClick={() => {
              setActiveObservation('FIRST');
              setObservationViewMode('FORM');
              setCurrentView('OBSERVATION');
            }}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all group text-center relative"
          >
            {formData.observation1?.status === 'COMPLETED' && (
              <div className="absolute top-4 right-4 text-green-500 flex items-center text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="h-4 w-4 mr-1" /> Completed
              </div>
            )}
            <div className="p-4 bg-purple-50 rounded-full mb-4 group-hover:bg-purple-100">
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{isTeachingStaff ? 'First Lesson Observation' : 'First Work Observation'}</h3>
            <p className="text-sm text-gray-500 mt-2">Record first observation and feedback.</p>
          </button>
          )}

          {/* 3. Second Lesson/Work Observation */}
          {showObservations && (
          <button
            onClick={() => {
              setActiveObservation('SECOND');
              setObservationViewMode('FORM');
              setCurrentView('OBSERVATION');
            }}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all group text-center relative"
          >
            {formData.observation2?.status === 'COMPLETED' && (
              <div className="absolute top-4 right-4 text-green-500 flex items-center text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="h-4 w-4 mr-1" /> Completed
              </div>
            )}
            <div className="p-4 bg-purple-50 rounded-full mb-4 group-hover:bg-purple-100">
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{isTeachingStaff ? 'Second Lesson Observation' : 'Second Work Observation'}</h3>
            <p className="text-sm text-gray-500 mt-2">Record second observation and feedback.</p>
          </button>
          )}

          {/* 4. Employee Evaluation */}
          <button
            onClick={() => setCurrentView('EVALUATION')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all group text-center relative"
          >
            {isEvaluationSubmitted && (
              <div className="absolute top-4 right-4 text-green-500 flex items-center text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="h-4 w-4 mr-1" /> Completed
              </div>
            )}
            <div className="p-4 bg-orange-50 rounded-full mb-4 group-hover:bg-orange-100">
              <ClipboardCheck className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Employee Evaluation</h3>
            <p className="text-sm text-gray-500 mt-2">Evaluate competencies and general performance.</p>
          </button>

          {/* 5. Final Scoresheet */}
          <button
            onClick={() => setCurrentView('SCORESHEET')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all group text-center relative"
          >
            {isCompleted && (
              <div className="absolute top-4 right-4 text-green-500 flex items-center text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="h-4 w-4 mr-1" /> Completed
              </div>
            )}
            <div className="p-4 bg-green-50 rounded-full mb-4 group-hover:bg-green-100">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Final Scoresheet</h3>
            <p className="text-sm text-gray-500 mt-2">Review scores, sign, and submit the final appraisal.</p>
          </button>
        </div>

        {/* Submit Observations Action */}
        {showObservations && !isObservationSubmitted && (formData.observation1?.status === 'COMPLETED') && (
            <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleSubmit('OBSERVATION_SUBMITTED')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit All Observations & Proceed to Evaluation'}
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
      {/* Header for Sub-views */}
      <div className="hidden print:block mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 uppercase">Final Scoresheet</h1>
        <p className="text-sm text-gray-600">{appraisee.full_name} - {appraisee.role}</p>
        <p className="text-xs text-gray-500">{formData.term} {formData.year}</p>
      </div>

      <div className="mb-8 flex items-center justify-between print:hidden">
        <div className="flex items-center">
          {!hideBack && (
            <button onClick={() => setCurrentView('MENU')} className="mr-4 text-gray-500 hover:text-gray-700" aria-label="Back to Menu">
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
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
                title="Print or Save as PDF"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </button>
              <button
                onClick={handleDownloadFullReport}
                title="Generate Full Report for Printing or PDF"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Full Report (PDF)
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r w-1/4">Area & Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r w-1/6">Target</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r w-1/6">Actual</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r w-1/4">Remarks</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-1/12">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(formData.targets || []).map((target: Target) => {
                     const pct = (parseFloat(target.target) > 0 && !isNaN(parseFloat(target.actual))) 
                        ? ((parseFloat(target.actual) / parseFloat(target.target)) * 100).toFixed(1) 
                        : '0.0';
                     return (
                      <tr key={target.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">
                          <div className="font-bold">{target.area}</div>
                          <div className="text-xs text-gray-500 mt-1">{target.description}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{target.target}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{target.actual}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r text-xs">{target.actualDescription}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{pct}%</td>
                      </tr>
                     );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Observation Section */}
          {showObservations && ['observation1', 'observation2'].map((obsKey, obsIndex) => {
             const obsData = formData[obsKey];
             // Only show second observation if it has data (check date or ratings)
             const hasData = obsData && (obsData.date || Object.keys(obsData.ratings || {}).length > 0);
             if (obsKey === 'observation2' && !hasData) return null;
             
             return (
             <div key={obsKey} className="break-inside-avoid mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
                  {isTeachingStaff ? `B${obsIndex+1}. LESSON OBSERVATION (${obsIndex === 0 ? 'FIRST' : 'SECOND'})` : `C${obsIndex+1}. WORK OBSERVATION (${obsIndex === 0 ? 'FIRST' : 'SECOND'})`}
                </h3>

                {/* Observation Details Header */}
                <div className="mb-4 grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                  <div className="col-span-2 flex space-x-6 border-b pb-2 mb-2">
                     <span className="font-bold">Observation Type:</span>
                     <span className="font-bold uppercase">{obsIndex === 0 ? 'FIRST' : 'SECOND'} OBSERVATION</span>
                  </div>
                  
                  <div><span className="font-bold">Appraisee:</span> {appraisee.full_name}</div>
                  <div><span className="font-bold">Appraiser:</span> {existingAppraisal?.appraiser_name || appraiser?.full_name || '_________________'}</div>
                  
                  <div><span className="font-bold">Date:</span> {obsData?.date || '_________________'}</div>
                  <div><span className="font-bold">Time:</span> {obsData?.time || '_________________'}</div>
                  
                  {isTeachingStaff ? (
                    <>
                      <div><span className="font-bold">Class/Grade:</span> {obsData?.classGrade || '_________________'}</div>
                      <div><span className="font-bold">Subject:</span> {obsData?.subject || '_________________'}</div>
                      <div><span className="font-bold">Topic:</span> {obsData?.topic || '_________________'}</div>
                      <div><span className="font-bold">Learners Present:</span> {obsData?.learnersPresent || '_________________'}</div>
                    </>
                  ) : (
                    <div className="col-span-2"><span className="font-bold">Work Appraised:</span> {obsData?.workAppraised || '_________________'}</div>
                  )}
                </div>

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
                          {obsData?.ratings?.[index] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             );
          })}

          {/* Professional Documents (Teaching Staff Only) */}
          {isTeachingStaff && (
             <div className="break-inside-avoid">
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">PROFESSIONAL DOCUMENTS</h3>
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/3">Document</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {PROFESSIONAL_DOCUMENTS.map((doc, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-900 border-r">{index + 1}. {doc}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 font-medium capitalize">
                          {(formData.observation1?.documents?.[index] || 'not_available').replace('_', ' ')}
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
               D. EMPLOYEE EVALUATION
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

          {/* Comments Section */}
          <div className="break-inside-avoid">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">COMMENTS & REMARKS</h3>
            
            <div className="mb-6">
              <h4 className="text-md font-bold text-gray-800 mb-2">Observation Comments</h4>
              <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">First Observation</p>
                    {formData.observation1?.comments || 'No comments provided.'}
                  </div>
                  {(formData.observation2?.comments || (formData.observation2?.ratings && Object.keys(formData.observation2.ratings).length > 0)) && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Second Observation</p>
                        {formData.observation2?.comments || 'No comments provided.'}
                      </div>
                  )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-md font-bold text-gray-800 mb-2">Progress Remarks</h4>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[80px]">
                {formData.evaluation?.progressComments?.[0] || 'No remarks provided.'}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-md font-bold text-gray-800 mb-2">Areas for Improvement</h4>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[80px]">
                {formData.evaluation?.improvementComments?.[0] || 'No remarks provided.'}
              </div>
            </div>
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
                    {showObservations && (
                      <>
                        <tr>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                            {isTeachingStaff ? 'LESSON OBSERVATION (1st)' : 'WORK OBSERVATION (1st)'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">{observationStats.score1}</td>
                        </tr>
                        {observationStats.score2 > 0 && (
                            <tr>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                                {isTeachingStaff ? 'LESSON OBSERVATION (2nd)' : 'WORK OBSERVATION (2nd)'}
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-gray-900">{observationStats.score2}</td>
                            </tr>
                        )}
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300 font-bold">
                            OBSERVATION FINAL SCORE
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900 font-bold">{observationStats.totalScore}</td>
                        </tr>
                      </>
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
             
             <div className="mt-8 flex flex-col items-center break-inside-avoid">
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
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Targets Scoresheet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {!isTargetsSet 
                    ? 'Phase 1: Set targets and sign to lock them.' 
                    : 'Phase 2: Enter actual results and sign to complete.'}
                </p>
              </div>
              {!isTargetsSet && !isCompleted && (
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Area & Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Target (%)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actual (%)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Remarks</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">% Achieved</th>
                      {!isTargetsSet && !isCompleted && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
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
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={target.area}
                                onChange={(e) => {
                                  const newTargets = formData.targets.map((t: Target) => 
                                    t.id === target.id ? { ...t, area: e.target.value } : t
                                  );
                                  setFormData({ ...formData, targets: newTargets });
                                }}
                                disabled={isTargetsSet || isCompleted}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white font-bold"
                                placeholder="Area of focus"
                              />
                              <textarea
                                value={target.description || ''}
                                onChange={(e) => {
                                  const newTargets = formData.targets.map((t: Target) => 
                                    t.id === target.id ? { ...t, description: e.target.value } : t
                                  );
                                  setFormData({ ...formData, targets: newTargets });
                                }}
                                disabled={isTargetsSet || isCompleted}
                                rows={2}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-xs border-gray-300 rounded-md disabled:bg-gray-100 text-gray-600 bg-white"
                                placeholder="Description of the target..."
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              value={target.target}
                              onChange={(e) => {
                                const newTargets = formData.targets.map((t: Target) => 
                                  t.id === target.id ? { ...t, target: e.target.value } : t
                                );
                                setFormData({ ...formData, targets: newTargets });
                              }}
                              disabled={isTargetsSet || isCompleted}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white"
                              placeholder="Target (%)"
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              value={target.actual}
                              onChange={(e) => {
                                const newTargets = formData.targets.map((t: Target) => 
                                  t.id === target.id ? { ...t, actual: e.target.value } : t
                                );
                                setFormData({ ...formData, targets: newTargets });
                              }}
                              disabled={!isTargetsSet || isTargetsSubmitted || isCompleted}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 text-gray-900 bg-white"
                              placeholder={!isTargetsSet ? "Set targets first" : "Actual (%)"}
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                             <textarea
                                value={target.actualDescription || ''}
                                onChange={(e) => {
                                  const newTargets = formData.targets.map((t: Target) => 
                                    t.id === target.id ? { ...t, actualDescription: e.target.value } : t
                                  );
                                  setFormData({ ...formData, targets: newTargets });
                                }}
                                disabled={!isTargetsSet || isTargetsSubmitted || isCompleted}
                                rows={3}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-xs border-gray-300 rounded-md disabled:bg-gray-100 text-gray-600 bg-white"
                                placeholder={!isTargetsSet ? "Set targets first" : "Explain why target was reached or not..."}
                              />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                            {pct}%
                          </td>
                          {!isTargetsSet && !isCompleted && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
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

          {/* Phase 1 Signatures */}
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Phase 1: Target Setting Agreement</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
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
                  disabled={isTargetsSet || isCompleted}
                  date={formData.targetSignatures?.appraiseeDate || ''}
                  onDateChange={(date) => {
                    setFormData({
                      ...formData,
                      targetSignatures: { 
                        ...formData.targetSignatures, 
                        appraiseeDate: date
                      }
                    });
                  }}
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
                  disabled={isTargetsSet || isCompleted}
                  date={formData.targetSignatures?.appraiserDate || ''}
                  onDateChange={(date) => {
                    setFormData({
                      ...formData,
                      targetSignatures: { 
                        ...formData.targetSignatures, 
                        appraiserDate: date
                      }
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Phase 2 Signatures (Only visible if Phase 1 is done) */}
          {isTargetsSet && (
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Phase 2: Target Review Agreement</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SignatureInput
                    label="Appraisee Signature"
                    value={formData.targetReviewSignatures?.appraiseeSignature || ''}
                    onChange={(val) => {
                      const date = val ? new Date().toISOString().split('T')[0] : '';
                      setFormData({
                        ...formData,
                        targetReviewSignatures: { 
                          ...formData.targetReviewSignatures, 
                          appraiseeSignature: val,
                          appraiseeDate: date
                        }
                      });
                    }}
                    disabled={isTargetsSubmitted || isCompleted}
                    date={formData.targetReviewSignatures?.appraiseeDate || ''}
                    onDateChange={(date) => {
                      setFormData({
                        ...formData,
                        targetReviewSignatures: { 
                          ...formData.targetReviewSignatures, 
                          appraiseeDate: date
                        }
                      });
                    }}
                  />
                  <SignatureInput
                    label="Appraiser Signature"
                    value={formData.targetReviewSignatures?.appraiserSignature || ''}
                    onChange={(val) => {
                      const date = val ? new Date().toISOString().split('T')[0] : '';
                      setFormData({
                        ...formData,
                        targetReviewSignatures: { 
                          ...formData.targetReviewSignatures, 
                          appraiserSignature: val,
                          appraiserDate: date
                        }
                      });
                    }}
                    disabled={isTargetsSubmitted || isCompleted}
                    date={formData.targetReviewSignatures?.appraiserDate || ''}
                    onDateChange={(date) => {
                      setFormData({
                        ...formData,
                        targetReviewSignatures: { 
                          ...formData.targetReviewSignatures, 
                          appraiserDate: date
                        }
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => handleSubmit(existingAppraisal?.status || 'DRAFT')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            
            {!isTargetsSet && (
              <button
                type="button"
                onClick={() => handleSubmit('TARGETS_SET')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || isCompleted}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Saving...' : 'Set Targets (Phase 1)'}
              </button>
            )}

            {isTargetsSet && !isTargetsSubmitted && (
              <button
                type="button"
                onClick={() => handleSubmit('TARGETS_SUBMITTED')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || isCompleted}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Submitting...' : 'Complete Targets (Phase 2)'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* OBSERVATION VIEW */}
      {!isPrintingFullReport && currentView === 'OBSERVATION' && (
        <div className="space-y-8">
          {/* Form View (Selection Mode removed as it's now on Dashboard) */}
          <>
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isTeachingStaff ? 'B. LESSON OBSERVATION FORM' : 'C. WORK OBSERVATION FORM'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isTeachingStaff ? 'Tick one box only for each Parameter.' : 'Tick one box only for each Parameter.'}
              </p>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="text-sm font-medium text-gray-900">
                    {activeObservation === 'FIRST' ? 'First Observation' : 'Second Observation'}
                </div>
                <button
                  onClick={() => setCurrentView('MENU')}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Menu
                </button>
            </div>
            
            {/* Lesson Observation Details Form */}
            {isTeachingStaff && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Class/Grade */}
                  <div>
                    <label htmlFor="class-grade" className="block text-sm font-medium text-gray-700">Class/Grade</label>
                    <input
                      type="text"
                      id="class-grade"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.classGrade || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], classGrade: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      type="time"
                      id="time"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.time || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], time: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Learners Present */}
                  <div>
                    <label htmlFor="learners-present" className="block text-sm font-medium text-gray-700">Learners Present</label>
                    <input
                      type="text"
                      id="learners-present"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.learnersPresent || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], learnersPresent: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label htmlFor="observation-date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      id="observation-date"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.date || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], date: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Subject/Learning Area */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject/Learning Area</label>
                    <input
                      type="text"
                      id="subject"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.subject || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], subject: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Topic/Strand */}
                  <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic/Strand</label>
                    <input
                      type="text"
                      id="topic"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.topic || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], topic: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Work Observation Details Form */}
            {!isTeachingStaff && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Time */}
                  <div>
                    <label htmlFor="time-work" className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      type="time"
                      id="time-work"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.time || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], time: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label htmlFor="observation-date-work" className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      id="observation-date-work"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.date || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], date: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>

                  {/* Work Appraised */}
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="work-appraised" className="block text-sm font-medium text-gray-700">Work Appraised</label>
                    <input
                      type="text"
                      id="work-appraised"
                      value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.workAppraised || ''}
                      onChange={(e) => {
                        const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                        setFormData({
                          ...formData,
                          [key]: { ...formData[key], workAppraised: e.target.value }
                        });
                      }}
                      disabled={isCompleted || isObservationSubmitted}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 relative">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2 bg-gray-50">Parameters</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Unsatisfactory (1)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Satisfactory (2)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Above Average (3)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Excellent (4)</th>
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
                              checked={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.ratings?.[index] === rating}
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
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[1]}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[2]}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[3]}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[4]}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-right">Parameters Marks</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[1] * 1}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[2] * 2}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[3] * 3}</td>
                      <td className="px-2 py-4 text-center">{(activeObservation === 'FIRST' ? observationStats.counts1 : observationStats.counts2)[4] * 4}</td>
                    </tr>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 text-right font-bold text-blue-900">TOTAL SCORE ({activeObservation} OBSERVATION)</td>
                      <td colSpan={4} className="px-6 py-4 text-center font-bold text-xl text-blue-600">
                        {activeObservation === 'FIRST' ? observationStats.score1 : observationStats.score2}
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
                                checked={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.documents?.[index] === status}
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
                value={formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.comments || ''}
                onChange={(e) => {
                  const key = activeObservation === 'FIRST' ? 'observation1' : 'observation2';
                  setFormData({
                    ...formData,
                    [key]: { ...formData[key], comments: e.target.value }
                  });
                }}
                disabled={isCompleted}
              />
            </div>
          </div>

              {/* Action Buttons for Observation Form */}
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200 mt-4">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => handleSubmit(existingAppraisal?.status || 'DRAFT')}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                  
                  {formData[activeObservation === 'FIRST' ? 'observation1' : 'observation2']?.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleMarkObservationComplete(activeObservation === 'FIRST' ? 1 : 2)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>
          </>
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
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 relative">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2 bg-gray-50">Parameters</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Unsatisfactory (1)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Satisfactory (2)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Above Average (3)</th>
                      <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Excellent (4)</th>
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCORESHEET VIEW */}
      {!isPrintingFullReport && currentView === 'SCORESHEET' && (
        <div className="space-y-8 print:space-y-2">
          {/* Summary */}
          <div className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 print:py-2 print:px-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 print:text-base">
                {isSeniorLeadership 
                  ? 'K. SCORESHEET - SENIOR LEADERSHIP' 
                  : isTeachingStaff 
                    ? 'I. SCORESHEET - TEACHING STAFF' 
                    : 'J. SCORESHEET - NON-TEACHING STAFF'}
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6 print:p-2">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300 print:text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 print:px-2 print:py-1">Component</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 print:px-2 print:py-1">Term 1</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 print:px-2 print:py-1">Term 2</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">Term 3</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const termNum = formData.term.includes('2') ? 2 : formData.term.includes('3') ? 3 : 1;
                      
                      return (
                        <>
                          {showTargets && (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 print:px-2 print:py-1">TARGETS SCORE</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 1 ? targetStats.marks : '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 2 ? targetStats.marks : '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 print:px-2 print:py-1">{termNum === 3 ? targetStats.marks : '-'}</td>
                            </tr>
                          )}
                          {showObservations && (
                            <>
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 print:px-2 print:py-1">
                                  {isTeachingStaff ? 'LESSON OBSERVATION' : 'WORK OBSERVATION'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 1 ? observationStats.totalScore : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 2 ? observationStats.totalScore : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 print:px-2 print:py-1">{termNum === 3 ? observationStats.totalScore : '-'}</td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 print:px-2 print:py-1">EMPLOYEE EVALUATION</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 1 ? evaluationStats.totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-300 print:px-2 print:py-1">{termNum === 2 ? evaluationStats.totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 print:px-2 print:py-1">{termNum === 3 ? evaluationStats.totalScore : '-'}</td>
                          </tr>
                          <tr className="bg-gray-50 font-bold">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300 print:px-2 print:py-1">TERMLY TOTALS</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 border-r border-gray-300 print:px-2 print:py-1">{termNum === 1 ? totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 border-r border-gray-300 print:px-2 print:py-1">{termNum === 2 ? totalScore : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 print:px-2 print:py-1">{termNum === 3 ? totalScore : '-'}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:mt-4 print:gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 print:p-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase print:mb-2">Rating Scale</h4>
                  <div className="space-y-2 print:space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 print:text-xs">Leading (93%-100%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Leading' ? 'bg-blue-600 border-blue-600' : ''} print:w-4 print:h-4`}>
                        {currentRating === 'Leading' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 print:text-xs">Strong (80%-92%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Strong' ? 'bg-blue-600 border-blue-600' : ''} print:w-4 print:h-4`}>
                        {currentRating === 'Strong' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 print:text-xs">Solid (65%-79%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Solid' ? 'bg-blue-600 border-blue-600' : ''} print:w-4 print:h-4`}>
                        {currentRating === 'Solid' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 print:text-xs">Building (50%-64%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Building' ? 'bg-blue-600 border-blue-600' : ''} print:w-4 print:h-4`}>
                        {currentRating === 'Building' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 print:text-xs">Below Expectations (&lt;49%)</span>
                      <div className={`w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center ${currentRating === 'Below Expectations' ? 'bg-blue-600 border-blue-600' : ''} print:w-4 print:h-4`}>
                        {currentRating === 'Below Expectations' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center print:p-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase">Current Term Score</h4>
                  <div className="text-4xl font-bold text-blue-600 mb-2 print:text-2xl">{percentage.toFixed(1)}%</div>
                  <p className="text-sm text-gray-500 print:text-xs">Based on Termly Total: {totalScore} / {maxScores.totalMax}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 1 Signatures */}
          <div className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 print:py-2 print:px-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 print:text-base">Phase 1: Target Setting Agreement</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 print:p-2">
              {/* Target Signatures (if applicable) */}
              {showTargets && (
                <div className="mb-8 print:mb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4 print:mb-2 print:text-sm">Targets Agreement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
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
                      disabled={true}
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
                      disabled={true}
                      date={formData.targetSignatures?.appraiserDate || ''}
                      onDateChange={(date) => setFormData({
                        ...formData,
                        targetSignatures: { ...formData.targetSignatures, appraiserDate: date }
                      })}
                    />
                  </div>
                </div>
              )}

              {/* Final Signatures */}
              <div className="border-t border-gray-200 pt-8 print:pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 print:mb-2 print:text-sm">Final Appraisal Agreement</h4>
                
                {/* Term Signatures */}
                <div className="mb-6 print:mb-2">
                  <h5 className="text-sm font-bold text-gray-700 mb-2 uppercase">{formData.term || 'Term'}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
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

                <div className="mt-8 border-t border-gray-200 pt-6 flex flex-col items-center break-inside-avoid print:mt-4 print:pt-4">
                   <span className="text-gray-900 font-bold uppercase mb-2 print:text-sm">Official School Stamp</span>
                   <div className="border-2 border-gray-800 h-32 w-48 bg-white print:h-24 print:w-36"></div>
                </div>

              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 print:hidden">
              {!isCompleted && (
                <button
                  onClick={() => handleSubmit('COMPLETED')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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