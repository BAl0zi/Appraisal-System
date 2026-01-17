'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, FileText, CheckCircle, Clock, Play, LogOut, Trash2, History, Loader2, Key, AlertTriangle, Check } from 'lucide-react';
import { requestDeletion } from '@/app/actions/appraisal-actions';

interface AppraiserContentProps {
  currentUser: { id: string; email?: string; full_name?: string };
  initialTab?: 'home' | 'appraisals' | 'settings';
  currentTab?: 'home' | 'appraisals' | 'settings';
}

export default function AppraiserContent({ currentUser, initialTab = 'home', currentTab }: AppraiserContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals' | 'settings'>(initialTab);

  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab]);
  const [appraisees, setAppraisees] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords don't match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: "Password must be at least 6 characters" });
      return;
    }

    setUpdatingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setMessage({ type: 'error', text: updateError.message });
    } else {
      setMessage({ type: 'success', text: "Password updated successfully" });
      setNewPassword('');
      setConfirmPassword('');
    }
    setUpdatingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Controls Header */}
        {activeTab !== 'settings' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 inline-flex">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('home')}
                className={`${
                  activeTab === 'home'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } px-5 py-2.5 rounded-xl font-bold text-sm flex items-center transition-all`}
              >
                <Users className="mr-2 h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('appraisals')}
                className={`${
                  activeTab === 'appraisals'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } px-5 py-2.5 rounded-xl font-bold text-sm flex items-center transition-all`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Appraisals List
              </button>
            </nav>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2 pl-2">
              <label htmlFor="view-term" className="text-sm font-bold text-gray-600 whitespace-nowrap">Term:</label>
              <select
                id="view-term"
                value={viewTerm}
                onChange={(e) => setViewTerm(e.target.value)}
                className="block w-full pl-3 pr-8 py-1.5 text-sm border-gray-200 text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg transition-colors cursor-pointer font-medium"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
              <label htmlFor="view-year" className="text-sm font-bold text-gray-600 whitespace-nowrap">Year:</label>
              <select
                id="view-year"
                value={viewYear}
                onChange={(e) => setViewYear(e.target.value)}
                className="block w-full pl-3 pr-8 py-1.5 text-sm border-gray-200 text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg transition-colors cursor-pointer font-medium"
              >
                {[0, 1, 2].map(offset => {
                  const y = (parseInt(new Date().getFullYear().toString()) - 1 + offset).toString();
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Appraisees */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total Assigned</p>
                      <h3 className="text-3xl font-bold text-gray-900">{totalAppraisees}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-indigo-50 rounded-full opacity-50 blur-xl group-hover:opacity-70 transition-opacity"></div>
              </div>

              {/* Completed */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Completed</p>
                      <h3 className="text-3xl font-bold text-gray-900">{completedAppraisals}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                      <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-green-50 rounded-full opacity-50 blur-xl group-hover:opacity-70 transition-opacity"></div>
              </div>

              {/* Pending */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Pending</p>
                      <h3 className="text-3xl font-bold text-gray-900">{pendingAppraisals}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                      <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-orange-50 rounded-full opacity-50 blur-xl group-hover:opacity-70 transition-opacity"></div>
              </div>

              {/* Average Score */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Score</p>
                      <h3 className="text-3xl font-bold text-gray-900">{averageScore.toFixed(1)}<span className="text-lg text-gray-400 font-medium ml-1">%</span></h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg group-hover:scale-110 transition-transform">
                      %
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-blue-50 rounded-full opacity-50 blur-xl group-hover:opacity-70 transition-opacity"></div>
              </div>
            </div>

            {/* Appraisee Score Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-3"></span>
                Appraisee Performance Cards
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {appraisees.map((appraisee) => {
                  const appraisal = getAppraisalForUser(appraisee.id, appraisee.assignedRole);
                  const score = appraisal?.overall_score || 0;
                  const status = appraisal?.status || 'NOT STARTED';
                  const roleParam = appraisee.assignedRole ? `&role=${encodeURIComponent(appraisee.assignedRole)}` : '';
                  
                  return (
                    <div key={`${appraisee.id}-${appraisee.assignedRole}`} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {appraisee.full_name[0]}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900 truncate max-w-[150px]">{appraisee.full_name}</h4>
                            <p className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-md inline-block mt-1">{appraisee.assignedRole}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                           status === 'COMPLETED' || status === 'SIGNED' ? 'bg-green-100 text-green-700' :
                           status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                           'bg-gray-100 text-gray-600'
                        }`}>
                           {status === 'NOT STARTED' ? 'Pending' : status}
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score</span>
                          <span className="text-2xl font-bold text-gray-900">{score > 0 ? score : '-'}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                              score >= 80 ? 'bg-green-500' :
                              score >= 60 ? 'bg-blue-500' :
                              score >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} 
                            style={{ width: `${Math.min(score, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (status === 'NOT STARTED') {
                            handleStartAppraisalClick(appraisee.id, appraisee.assignedRole);
                          } else {
                            router.push(`/dashboard/appraisal/${appraisee.id}?term=${appraisal?.term || 'Term 1'}&year=${appraisal?.year || new Date().getFullYear()}${roleParam}`);
                          }
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center
                          ${status === 'NOT STARTED' 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' 
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'}`}
                      >
                        {status === 'NOT STARTED' ? (
                            <>
                                <Play className="h-4 w-4 mr-2 fill-current" />
                                Start Appraisal
                            </>
                        ) : (
                            <>View Details</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'appraisals' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             
            <div className="px-8 py-6 border-b border-gray-100 bg-[#FDFBF7]/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assigned Appraisals</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage and track your assigned staff appraisals.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-[#FDFBF7]">
                    <tr>
                      <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Appraisee
                      </th>
                      <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="relative px-6 py-5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {appraisees.map((appraisee) => {
                      const appraisal = getAppraisalForUser(appraisee.id, appraisee.assignedRole);
                      const status = appraisal?.status || 'NOT STARTED';
                      const isDeletionRequested = appraisal?.deletion_requested;
                      const roleParam = appraisee.assignedRole ? `&role=${encodeURIComponent(appraisee.assignedRole)}` : '';
                      
                      return (
                        <tr key={`${appraisee.id}-${appraisee.assignedRole}`} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm mr-4">
                                    {appraisee.full_name[0]}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{appraisee.full_name}</div>
                                    <div className="text-xs text-gray-400 font-medium">{appraisee.email}</div>
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {appraisee.assignedRole}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                             <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                              ${isDeletionRequested ? 'bg-red-50 text-red-700 border border-red-100' :
                                status === 'COMPLETED' || status === 'SIGNED' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 
                                'bg-gray-50 text-gray-600 border border-gray-100'
                              }`}>
                              {isDeletionRequested ? 'DELETION REQ.' : status}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {appraisal?.overall_score ? (
                                <span className="text-lg font-bold text-gray-900">{appraisal.overall_score}</span>
                            ) : (
                                <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-3 items-center">
                              {status === 'NOT STARTED' ? (
                                <button 
                                  onClick={() => handleStartAppraisalClick(appraisee.id, appraisee.assignedRole)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
                                >
                                  <Play className="h-3 w-3 mr-1.5 fill-current" /> Start
                                </button>
                              ) : (
                                <button 
                                  onClick={() => router.push(`/dashboard/appraisal/${appraisee.id}?term=${appraisal?.term || 'Term 1'}&year=${appraisal?.year || new Date().getFullYear()}${roleParam}`)}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                >
                                  {status === 'COMPLETED' || status === 'SIGNED' ? 'View Report' : 'Continue'}
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleViewHistory(appraisee.id, appraisee.full_name)}
                                className="p-2 text-gray-400 hover:text-gray-600 bg-transparent hover:bg-gray-100 rounded-lg transition-all"
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
                                  className="p-2 text-gray-400 hover:text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-all"
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
              {appraisees.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No appraisees assigned yet.</p>
                  </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            <div className="px-8 py-6 border-b border-gray-100 bg-[#FDFBF7]/50">
              <h3 className="text-lg font-bold text-gray-900">Account Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your account preferences and security.</p>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
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