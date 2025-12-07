'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ROLES, UserRole } from '@/constants/roles';
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from '@/constants/job-categories';
import { createUser, deleteUser } from '@/app/actions/user-actions';
import { getAssignments } from '@/app/actions/assignment-actions';
import { seedLeadershipUsers } from '@/app/actions/seed-actions';
import { approveDeletion, rejectDeletion, resetAppraisalStatus } from '@/app/actions/appraisal-actions';
import { Trash2, UserPlus, Users, ClipboardList, AlertTriangle, Check, X, RefreshCw, FileText, Database } from 'lucide-react';
import AssignmentManager from '@/components/dashboard/AssignmentManager';
import AppraiserContent from '@/components/dashboard/AppraiserContent';
import DashboardLayout from './DashboardLayout';

type User = {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  full_name: string;
  created_at: string;
  job_category?: string;
};

interface DirectorDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
}

export default function DirectorDashboard({ currentUser }: DirectorDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [allAppraisals, setAllAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'assignments' | 'requests' | 'appraisals' | 'reports' | 'my_appraisals'>('users');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersData) {
        const mappedUsers = usersData.map((u: any) => ({
          ...u,
          roles: u.additional_roles && u.additional_roles.length > 0 
            ? Array.from(new Set([u.role, ...u.additional_roles]))
            : undefined
        }));
        setUsers(mappedUsers as User[]);
      }

      // Fetch assignments
      const { data: assignmentsData } = await getAssignments();

      if (assignmentsData) {
        const map: Record<string, Record<string, string>> = {};
        assignmentsData.forEach((a: any) => {
          if (!map[a.appraisee_id]) {
            map[a.appraisee_id] = {};
          }
          const roleKey = a.role || 'PRIMARY';
          map[a.appraisee_id][roleKey] = a.appraiser_id;
        });
        setAssignments(map);
      }

      // Fetch deletion requests
      const { data: requests } = await supabase
        .from('appraisals')
        .select(`
          *,
          appraiser:users!appraiser_id(full_name),
          appraisee:users!appraisee_id(full_name)
        `)
        .eq('deletion_requested', true);
      
      if (requests) {
        setDeletionRequests(requests);
      }

      // Fetch all appraisals for management
      const { data: appraisalsData } = await supabase
        .from('appraisals')
        .select(`
          *,
          appraiser:users!appraiser_id(full_name),
          appraisee:users!appraisee_id(full_name)
        `)
        .order('updated_at', { ascending: false });
      
      if (appraisalsData) {
        setAllAppraisals(appraisalsData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchData = async () => {
    // Re-fetch for updates
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersData) {
      const mappedUsers = usersData.map((u: any) => ({
        ...u,
        roles: u.additional_roles && u.additional_roles.length > 0 
          ? Array.from(new Set([u.role, ...u.additional_roles]))
          : undefined
      }));
      setUsers(mappedUsers as User[]);
    }

    const { data: assignmentsData } = await getAssignments();

    if (assignmentsData) {
      const map: Record<string, Record<string, string>> = {};
      assignmentsData.forEach((a: any) => {
        if (!map[a.appraisee_id]) {
          map[a.appraisee_id] = {};
        }
        const roleKey = a.role || 'PRIMARY';
        map[a.appraisee_id][roleKey] = a.appraiser_id;
      });
      setAssignments(map);
    }

    // Fetch deletion requests
    const { data: requests } = await supabase
      .from('appraisals')
      .select(`
        *,
        appraiser:users!appraiser_id(full_name),
        appraisee:users!appraisee_id(full_name)
      `)
      .eq('deletion_requested', true);
    
    if (requests) {
      setDeletionRequests(requests);
    }

    // Fetch all appraisals for management
    const { data: appraisalsData } = await supabase
      .from('appraisals')
      .select(`
        *,
        appraiser:users!appraiser_id(full_name),
        appraisee:users!appraisee_id(full_name)
      `)
      .order('updated_at', { ascending: false });
    
    if (appraisalsData) {
      setAllAppraisals(appraisalsData);
    }
  };

  const handleCreateUser = async (formData: FormData) => {
    setMessage(null);
    const result = await createUser(null, formData);
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result.success) {
      setMessage({ type: 'success', text: 'User created successfully' });
      setIsModalOpen(false);
      await fetchData();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    const result = await deleteUser(userId);
    if (result.success) {
      setUsers(users.filter(u => u.id !== userId));
      setMessage({ type: 'success', text: 'User deleted successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
    }
  };

  const handleApproveDeletion = async (appraisalId: string) => {
    if (!confirm('Are you sure you want to approve this deletion? This action cannot be undone.')) return;
    
    const result = await approveDeletion(appraisalId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Appraisal deleted successfully' });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete appraisal' });
    }
  };

  const handleRejectDeletion = async (appraisalId: string) => {
    if (!confirm('Are you sure you want to reject this deletion request?')) return;
    
    const result = await rejectDeletion(appraisalId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Deletion request rejected' });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reject request' });
    }
  };

  const handleResetStatus = async (appraisalId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    
    const result = await resetAppraisalStatus(appraisalId, newStatus);
    if (result.success) {
      setMessage({ type: 'success', text: `Appraisal status updated to ${newStatus}` });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update status' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'User Management', icon: Users, current: activeTab === 'users', onClick: () => setActiveTab('users') },
    { name: 'Appraisal Assignments', icon: ClipboardList, current: activeTab === 'assignments', onClick: () => setActiveTab('assignments') },
    { name: 'Deletion Requests', icon: AlertTriangle, current: activeTab === 'requests', onClick: () => setActiveTab('requests') },
    { name: 'Appraisal Management', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
    { name: 'Reports', icon: FileText, current: activeTab === 'reports', onClick: () => setActiveTab('reports') },
    { name: 'My Appraisals', icon: Check, current: activeTab === 'my_appraisals', onClick: () => setActiveTab('my_appraisals') },
  ];

  return (
    <DashboardLayout currentUser={currentUser as any} role="DIRECTOR" customNavigation={navigation}>
      <div className="space-y-6">
        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'users' ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      if (!confirm('This will create sample leadership users. Continue?')) return;
                      setMessage({ type: 'success', text: 'Seeding data... please wait.' });
                      const result = await seedLeadershipUsers();
                      if (result.success) {
                        setMessage({ type: 'success', text: 'Sample data seeded successfully!' });
                        fetchData();
                      } else {
                        setMessage({ type: 'error', text: 'Failed to seed data.' });
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Database className="h-5 w-5 mr-2 text-gray-500" />
                    Seed Sample Data
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add New User
                  </button>
                </div>
              </div>

              {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              {/* Users Table */}
              <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: string, idx: number) => (
                                    <span key={idx} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {user.role !== 'DIRECTOR' && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'assignments' ? (
            <AssignmentManager 
              users={users} 
              assignments={assignments} 
              onUpdate={fetchData} 
            />
          ) : activeTab === 'requests' ? (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Deletion Requests</h2>
              </div>

              {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    {deletionRequests.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No pending deletion requests.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Appraiser
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Appraisee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reason
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date Requested
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {deletionRequests.map((request) => (
                            <tr key={request.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{request.appraiser?.full_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{request.appraisee?.full_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500 max-w-xs truncate" title={request.deletion_reason}>
                                  {request.deletion_reason}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {new Date(request.updated_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleApproveDeletion(request.id)}
                                  className="text-green-600 hover:text-green-900 mr-4"
                                  title="Approve Deletion"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleRejectDeletion(request.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject Request"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'appraisals' ? (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Appraisal Management</h2>
              </div>

              {/* Top Performers Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {['SENIOR_LEADERSHIP', 'INTERMEDIATE_LEADERSHIP', 'FIRSTLINE_LEADERSHIP'].map((category) => {
                  const topPerformers = allAppraisals
                    .filter(appraisal => {
                      const appraisee = users.find(u => u.id === appraisal.appraisee_id);
                      return appraisee?.job_category === category && (appraisal.overall_score || 0) > 0;
                    })
                    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                    .slice(0, 3);

                  return (
                    <div key={category} className="bg-linear-to-br from-indigo-50 to-white rounded-xl shadow-sm border border-indigo-100 p-5">
                      <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 border-b border-indigo-200 pb-2">
                        Top {JOB_CATEGORY_LABELS[category as keyof typeof JOB_CATEGORY_LABELS]}
                      </h3>
                      <div className="space-y-3">
                        {topPerformers.length > 0 ? (
                          topPerformers.map((appraisal, index) => (
                            <div key={appraisal.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 
                                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    index === 1 ? 'bg-gray-100 text-gray-700' : 
                                    'bg-orange-100 text-orange-700'}`}>
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{appraisal.appraisee?.full_name}</p>
                                  <p className="text-xs text-gray-500">{appraisal.role || 'Primary Role'}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-indigo-600">{appraisal.overall_score}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-400 text-sm italic">
                            No completed appraisals yet
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appraiser</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appraisee</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                          <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allAppraisals.map((appraisal) => (
                          <tr key={appraisal.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appraisal.appraiser?.full_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appraisal.appraisee?.full_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${appraisal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                  appraisal.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 
                                  'bg-blue-100 text-blue-800'}`}>
                                {appraisal.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(appraisal.updated_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {appraisal.status !== 'DRAFT' && (
                                <button
                                  onClick={() => handleResetStatus(appraisal.id, 'DRAFT')}
                                  className="text-orange-600 hover:text-orange-900 flex items-center ml-auto"
                                  title="Reset to Draft"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" /> Reset
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-2xl font-bold text-gray-900">Appraisal Reports</h2>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Print Summary
                </button>
              </div>

              <div className="bg-white shadow overflow-hidden sm:rounded-lg print:shadow-none">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 print:border-none">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Staff Appraisal Summary</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appraiser</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.filter(u => u.role !== 'DIRECTOR').flatMap((user) => {
                      const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
                      
                      return userRoles.map(role => {
                        // Find appraisal for this specific role
                        // Handle legacy appraisals where role might be null (assume primary role)
                        const userAppraisal = allAppraisals.find(a => 
                          a.appraisee_id === user.id && 
                          (a.role === role || (!a.role && role === user.role))
                        );
                        
                        // Find assigned appraiser
                        const appraiserId = assignments[user.id]?.[role];
                        const appraiser = users.find(u => u.id === appraiserId);
                        const appraiserName = appraiser?.full_name || 'Unassigned';
                        
                        return (
                          <tr key={`${user.id}-${role}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appraiserName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                               <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${userAppraisal?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                    userAppraisal?.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 
                                    userAppraisal?.status ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                                  {userAppraisal?.status || 'Not Started'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {userAppraisal?.overall_score || '-'}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'my_appraisals' ? (
            <AppraiserContent currentUser={currentUser} />
          ) : null}
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <form action={handleCreateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Add New User
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input type="text" name="fullName" id="fullName" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white" />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                          <input type="email" name="email" id="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white" />
                        </div>
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                          <input type="password" name="password" id="password" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white" />
                        </div>
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">System Role</label>
                          <select name="role" id="role" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white">
                            {ROLES.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="jobCategory" className="block text-sm font-medium text-gray-700">Job Category</label>
                          <select name="jobCategory" id="jobCategory" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white">
                            <option value="">Select Category</option>
                            {JOB_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{JOB_CATEGORY_LABELS[cat]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="additionalRoles" className="block text-sm font-medium text-gray-700">Additional Roles (comma separated)</label>
                          <input type="text" name="additionalRoles" id="additionalRoles" placeholder="e.g. Class Teacher, HOP" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Create User
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
