'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, FileText, CheckCircle, Clock, Play, LogOut, Trash2, History } from 'lucide-react';
import { requestDeletion } from '@/app/actions/appraisal-actions';

interface AppraiserContentProps {
  currentUser: { id: string; email?: string; full_name?: string };
  initialTab?: 'home' | 'appraisals';
  currentTab?: 'home' | 'appraisals';
}

export default function AppraiserContent({ currentUser, initialTab = 'home', currentTab }: AppraiserContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals'>(initialTab);

  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab]);
  const [appraisees, setAppraisees] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Deletion Request State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // View State (Dashboard Filter)
  const [viewTerm, setViewTerm] = useState(() => {
    const month = new Date().getMonth();
    if (month === 11) return 'Term 1';
    if (month <= 3) return 'Term 1';
    if (month <= 7) return 'Term 2';
    return 'Term 3';
  });

  const [viewYear, setViewYear] = useState(() => {
    const date = new Date();
    return (date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear()).toString();
  });

  // Term Selection State (Modal)
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [selectedAppraiseeIdForTerm, setSelectedAppraiseeIdForTerm] = useState<string | null>(null);
  const [selectedAppraiseeRoleForTerm, setSelectedAppraiseeRoleForTerm] = useState<string | null>(null);
  
  const [selectedTerm, setSelectedTerm] = useState(() => {
    const month = new Date().getMonth();
    if (month === 11) return 'Term 1';
    if (month <= 3) return 'Term 1';
    if (month <= 7) return 'Term 2';
    return 'Term 3';
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    const date = new Date();
    return (date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear()).toString();
  });

  // History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyAppraisals, setHistoryAppraisals] = useState<any[]>([]);
  const [selectedAppraiseeName, setSelectedAppraiseeName] = useState('');

  const handleStartAppraisalClick = (appraiseeId: string, role: string) => {
    setSelectedAppraiseeIdForTerm(appraiseeId);
    setSelectedAppraiseeRoleForTerm(role);
    setSelectedTerm(viewTerm);
    // Always set to current academic year for new appraisals
    const date = new Date();
    const currentYear = (date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear()).toString();
    setSelectedYear(currentYear);
    setIsTermModalOpen(true);
  };

  const handleProceedToAppraisal = () => {
    if (selectedAppraiseeIdForTerm && selectedTerm && selectedYear) {
      const roleParam = selectedAppraiseeRoleForTerm ? `&role=${encodeURIComponent(selectedAppraiseeRoleForTerm)}` : '';
      router.push(`/dashboard/appraisal/${selectedAppraiseeIdForTerm}?term=${selectedTerm}&year=${selectedYear}${roleParam}`);
      setIsTermModalOpen(false);
    }
  };

  const handleViewHistory = (appraiseeId: string, appraiseeName: string) => {
    const userAppraisals = appraisals.filter(a => a.appraisee_id === appraiseeId);
    setHistoryAppraisals(userAppraisals);
    setSelectedAppraiseeName(appraiseeName);
    setIsHistoryModalOpen(true);
  };

  const handleRequestDeletion = async () => {
    if (!selectedAppraisalId || !deleteReason) return;
    
    const result = await requestDeletion(selectedAppraisalId, deleteReason);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Deletion request submitted successfully.' });
      setIsDeleteModalOpen(false);
      setDeleteReason('');
      setSelectedAppraisalId(null);
      // Refresh data
      window.location.reload(); 
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to submit request.' });
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      // Fetch assigned appraisees
      const { data: assignments, error } = await supabase
        .from('appraiser_assignments')
        .select(`
          role,
          appraisee:users!appraisee_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('appraiser_id', currentUser.id);

      if (error) {
        console.error('Error fetching assignments:', error);
      }

      const appraiseeList = assignments?.map((a: any) => ({
        ...a.appraisee,
        assignedRole: a.role || a.appraisee.role // Use assigned role or fallback to user's primary role
      })) || [];
      setAppraisees(appraiseeList);

      // Fetch existing appraisals
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('appraisals')
        .select('*')
        .eq('appraiser_id', currentUser.id);
      
      if (appraisalError) {
        console.error('Error fetching appraisals:', appraisalError);
      }
      
      setAppraisals(appraisalData || []);
      setLoading(false);
    };

    fetchData();
  }, [currentUser.id]);

  // Calculate stats
  const currentViewAppraisals = appraisals.filter(a => 
    a.appraisal_data?.term === viewTerm &&
    a.appraisal_data?.year === viewYear
  );

  const totalAppraisees = appraisees.length;
  const completedAppraisals = currentViewAppraisals.filter(a => a.status === 'COMPLETED' || a.status === 'SIGNED').length;
  const pendingAppraisals = totalAppraisees - completedAppraisals;
  const averageScore = currentViewAppraisals.length > 0 
    ? currentViewAppraisals.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / currentViewAppraisals.length 
    : 0;

  const getAppraisalForUser = (userId: string, role: string) => {
    return appraisals.find(a => 
      a.appraisee_id === userId && 
      a.role === role && 
      a.appraisal_data?.term === viewTerm &&
      a.appraisal_data?.year === viewYear
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 inline-flex">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('home')}
                className={`${
                  activeTab === 'home'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } px-4 py-2 rounded-lg font-medium text-sm flex items-center transition-all`}
              >
                <Users className="mr-2 h-4 w-4" />
                Home
              </button>
              <button
                onClick={() => setActiveTab('appraisals')}
                className={`${
                  activeTab === 'appraisals'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } px-4 py-2 rounded-lg font-medium text-sm flex items-center transition-all`}
              >
                <FileText className="mr-2 h-4 w-4" />
                My Appraisals
              </button>
            </nav>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2">
              <label htmlFor="view-term" className="text-sm font-medium text-gray-700 whitespace-nowrap">Term:</label>
              <select
                id="view-term"
                value={viewTerm}
                onChange={(e) => setViewTerm(e.target.value)}
                className="block w-full pl-3 pr-8 py-1 text-sm border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="view-year" className="text-sm font-medium text-gray-700 whitespace-nowrap">Year:</label>
              <select
                id="view-year"
                value={viewYear}
                onChange={(e) => setViewYear(e.target.value)}
                className="block w-full pl-3 pr-8 py-1 text-sm border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                {[0, 1, 2].map(offset => {
                  const y = (parseInt(new Date().getFullYear().toString()) - 1 + offset).toString();
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'home' ? (
          <div className="px-4 py-5 sm:px-0">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Appraisees */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Appraisees</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalAppraisees}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="text-lg font-medium text-gray-900">{completedAppraisals}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                        <dd className="text-lg font-medium text-gray-900">{pendingAppraisals}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Score */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <div className="h-6 w-6 text-blue-400 font-bold text-center">%</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                        <dd className="text-lg font-medium text-gray-900">{averageScore.toFixed(1)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appraisee Score Cards */}
            <div className="mt-8">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Appraisee Performance Summary</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {appraisees.map((appraisee) => {
                  const appraisal = getAppraisalForUser(appraisee.id, appraisee.assignedRole);
                  const score = appraisal?.overall_score || 0;
                  const status = appraisal?.status || 'NOT STARTED';
                  const roleParam = appraisee.assignedRole ? `&role=${encodeURIComponent(appraisee.assignedRole)}` : '';
                  
                  return (
                    <div key={`${appraisee.id}-${appraisee.assignedRole}`} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                              {appraisee.full_name[0]}
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{appraisee.full_name}</h4>
                              <p className="text-xs text-gray-500">{appraisee.assignedRole}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            status === 'COMPLETED' || status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                            status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {status === 'NOT STARTED' ? 'Pending' : status}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-500">Overall Score</span>
                            <span className="text-2xl font-bold text-gray-900">{score > 0 ? score : '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                score >= 80 ? 'bg-green-500' :
                                score >= 60 ? 'bg-blue-500' :
                                score >= 40 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} 
                              style={{ width: `${Math.min(score, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                        <button
                          onClick={() => {
                            if (status === 'NOT STARTED') {
                              handleStartAppraisalClick(appraisee.id, appraisee.assignedRole);
                            } else {
                              router.push(`/dashboard/appraisal/${appraisee.id}?term=${appraisal?.term || 'Term 1'}&year=${appraisal?.year || new Date().getFullYear()}${roleParam}`);
                            }
                          }}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-900 w-full text-center"
                        >
                          {status === 'NOT STARTED' ? 'Start Appraisal' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:px-0">
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Appraisee
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appraisees.map((appraisee) => {
                          const appraisal = getAppraisalForUser(appraisee.id, appraisee.assignedRole);
                          const status = appraisal?.status || 'NOT STARTED';
                          const isDeletionRequested = appraisal?.deletion_requested;
                          const roleParam = appraisee.assignedRole ? `&role=${encodeURIComponent(appraisee.assignedRole)}` : '';
                          
                          return (
                            <tr key={`${appraisee.id}-${appraisee.assignedRole}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{appraisee.full_name}</div>
                                <div className="text-sm text-gray-500">{appraisee.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {appraisee.assignedRole}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  isDeletionRequested ? 'bg-red-100 text-red-800' :
                                  status === 'COMPLETED' || status === 'SIGNED' ? 'bg-green-100 text-green-800' : 
                                  status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isDeletionRequested ? 'DELETION REQUESTED' : status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {appraisal?.overall_score ? appraisal.overall_score : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-3 items-center">
                                  {status === 'NOT STARTED' ? (
                                    <button 
                                      onClick={() => handleStartAppraisalClick(appraisee.id, appraisee.assignedRole)}
                                      className="text-blue-600 hover:text-blue-900 flex items-center"
                                    >
                                      <Play className="h-4 w-4 mr-1" /> Start Appraisal
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => router.push(`/dashboard/appraisal/${appraisee.id}?term=${appraisal?.term || 'Term 1'}&year=${appraisal?.year || new Date().getFullYear()}${roleParam}`)}
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      {status === 'COMPLETED' || status === 'SIGNED' ? 'View Report' : 'Continue'}
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleViewHistory(appraisee.id, appraisee.full_name)}
                                    className="text-gray-600 hover:text-gray-900 ml-4"
                                    title="View History"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>

                                  {!isDeletionRequested && (status === 'TARGETS_SUBMITTED' || status === 'COMPLETED' || status === 'SIGNED') && (
                                    <button
                                      onClick={() => {
                                        setSelectedAppraisalId(appraisal.id);
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="text-red-600 hover:text-red-900 ml-4"
                                      title="Request Deletion"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[80vh] flex flex-col">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Appraisal History: {selectedAppraiseeName}
                  </h3>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto">
                {historyAppraisals.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No appraisal history found.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyAppraisals.map((appraisal) => (
                        <tr key={appraisal.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/dashboard/appraisal/${appraisal.appraisee_id}?appraisalId=${appraisal.id}`)}
                              className="text-blue-600 hover:text-blue-900 hover:underline"
                            >
                              {appraisal.appraisal_data?.term} {appraisal.appraisal_data?.year}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appraisal.status === 'COMPLETED' || appraisal.status === 'SIGNED' ? 'bg-green-100 text-green-800' : 
                              appraisal.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appraisal.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {appraisal.overall_score || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(appraisal.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg border-t">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsHistoryModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Term Selection Modal */}
        {isTermModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Select Appraisal Period</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="term" className="block text-sm font-medium text-gray-700">Term</label>
                        <select
                          id="term"
                          value={selectedTerm}
                          onChange={(e) => setSelectedTerm(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border text-gray-900 bg-white"
                        >
                          <option value="Term 1">Term 1 (Jan - Apr)</option>
                          <option value="Term 2">Term 2 (May - Aug)</option>
                          <option value="Term 3">Term 3 (Sep - Dec)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Year</label>
                        <div className="mt-1 block w-full py-2 px-3 text-gray-500 bg-gray-100 border border-gray-300 rounded-md sm:text-sm cursor-not-allowed">
                          {selectedYear}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleProceedToAppraisal}
                >
                  Proceed
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsTermModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Request Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Request Deletion</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Please provide a reason for requesting deletion of this appraisal. This request will be sent to the Director for approval.
                      </p>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
                      <textarea
                        id="reason"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 bg-white"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleRequestDeletion}
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}