'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ROLES, UserRole } from '@/constants/roles';
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from '@/constants/job-categories';
import { createUser, deleteUser, resetUserPassword, updateUser } from '@/app/actions/user-actions';
import { getAssignments } from '@/app/actions/assignment-actions';
import { seedLeadershipUsers } from '@/app/actions/seed-actions';
import { approveDeletion, rejectDeletion, resetAppraisalStatus } from '@/app/actions/appraisal-actions';
import { Trash2, UserPlus, Users, ClipboardList, AlertTriangle, Check, X, RefreshCw, FileText, Database, Eye, Loader2, Key, Edit, LayoutDashboard, Settings } from 'lucide-react';
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
  initialTab?: string;
}

export default function DirectorDashboard({ currentUser, initialTab }: DirectorDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [allAppraisals, setAllAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'assignments' | 'requests' | 'appraisals' | 'reports' | 'my_appraisals' | 'settings'>((initialTab as any) || 'overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);


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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const openUserModal = () => {
    setGeneratedPassword(generatePassword());
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setMessage(null);
    setActionLoading('CREATE_USER');
    
    const result = await createUser(null, formData);
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result.success) {
      setMessage({ type: 'success', text: 'User created successfully' });
      setIsModalOpen(false);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setActionLoading(`DELETE_USER_${userId}`);
    const result = await deleteUser(userId);
    if (result.success) {
      setUsers(users.filter(u => u.id !== userId));
      setMessage({ type: 'success', text: 'User deleted successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
    }
    setActionLoading(null);
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(e.currentTarget);
    setActionLoading('UPDATE_USER');
    setMessage(null);

    const result = await updateUser(editingUser.id, formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'User updated successfully' });
      setEditingUser(null);
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update user' });
    }
    setActionLoading(null);
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Are you sure you want to reset the password for ${user.full_name}?`)) return;
    
    setActionLoading(`RESET_PASSWORD_${user.id}`);
    const newPassword = generatePassword();
    const result = await resetUserPassword(user.id, newPassword);
    
    if (result.success) {
      setResetPasswordResult({ name: user.full_name, password: newPassword });
      setMessage({ type: 'success', text: 'Password reset successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reset password' });
    }
    setActionLoading(null);
  };

  const handleApproveDeletion = async (appraisalId: string) => {
    if (!confirm('Are you sure you want to approve this deletion? This action cannot be undone.')) return;
    
    setActionLoading(`APPROVE_DELETE_${appraisalId}`);
    const result = await approveDeletion(appraisalId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Appraisal deleted successfully' });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete appraisal' });
    }
    setActionLoading(null);
  };

  const handleRejectDeletion = async (appraisalId: string) => {
    if (!confirm('Are you sure you want to reject this deletion request?')) return;
    
    setActionLoading(`REJECT_DELETE_${appraisalId}`);
    const result = await rejectDeletion(appraisalId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Deletion request rejected' });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reject request' });
    }
    setActionLoading(null);
  };

  const handleResetStatus = async (appraisalId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    
    setActionLoading(`RESET_STATUS_${appraisalId}`);
    const result = await resetAppraisalStatus(appraisalId, newStatus);
    if (result.success) {
      setMessage({ type: 'success', text: `Appraisal status updated to ${newStatus}` });
      await fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update status' });
    }
    setActionLoading(null);
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard?tab=overview', icon: LayoutDashboard, current: activeTab === 'overview', onClick: () => setActiveTab('overview') },
    { name: 'User Management', href: '/dashboard?tab=users', icon: Users, current: activeTab === 'users', onClick: () => setActiveTab('users') },
    { name: 'Appraisal Assignments', href: '/dashboard?tab=assignments', icon: ClipboardList, current: activeTab === 'assignments', onClick: () => setActiveTab('assignments') },
    { name: 'Deletion Requests', href: '/dashboard?tab=requests', icon: AlertTriangle, current: activeTab === 'requests', onClick: () => setActiveTab('requests') },
    { name: 'Appraisal Management', href: '/dashboard?tab=appraisals', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
    { name: 'Reports', href: '/dashboard?tab=reports', icon: FileText, current: activeTab === 'reports', onClick: () => setActiveTab('reports') },
    { name: 'My Appraisals', href: '/dashboard?tab=my_appraisals', icon: Check, current: activeTab === 'my_appraisals', onClick: () => setActiveTab('my_appraisals') },
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: activeTab === 'settings', onClick: () => setActiveTab('settings') },
  ];

  return (
    <DashboardLayout currentUser={currentUser as any} role="DIRECTOR" customNavigation={navigation}>
      <div className="space-y-6">
        {/* Content */}
        {activeTab === 'overview' && (
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Good morning, Director</h2>
            <p className="text-gray-500 mb-8">Here is an overview of the appraisal system status today.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Staff */}
                <div className="bg-[#FAE29F] rounded-3xl p-6 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Total Staff</h3>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-4xl font-bold text-gray-900">{users.length}</span>
                            <span className="text-sm font-medium text-gray-800">registered</span>
                        </div>
                        <div className="mt-8 flex space-x-2">
                             <div className="h-8 w-2 bg-black rounded-full"></div>
                             <div className="h-4 w-2 bg-black/30 rounded-full mt-4"></div>
                             <div className="h-6 w-2 bg-black/50 rounded-full mt-2"></div>
                        </div>
                    </div>
                    {/* Decorative Blob */}
                    <div className="absolute -right-4 -top-4 h-32 w-32 bg-yellow-300 rounded-full opacity-50 blur-2xl"></div>
                </div>

                {/* Card 2: Appraisals Summary */}
                <div className="bg-[#F8BCD5] rounded-3xl p-6 shadow-sm relative overflow-hidden col-span-1 md:col-span-2">
                     <div className="relative z-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Appraisal Summary</h3>
                        <div className="grid grid-cols-3 gap-8">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{allAppraisals.length}</p>
                                <p className="text-xs uppercase tracking-wide font-bold text-gray-700 mt-1">Total</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {allAppraisals.filter(a => a.status === 'COMPLETED' || a.status === 'SIGNED').length}
                                </p>
                                <p className="text-xs uppercase tracking-wide font-bold text-gray-700 mt-1">Completed</p>
                            </div>
                             <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {allAppraisals.filter(a => a.status !== 'COMPLETED' && a.status !== 'SIGNED').length}
                                </p>
                                <p className="text-xs uppercase tracking-wide font-bold text-gray-700 mt-1">In Progress</p>
                            </div>
                        </div>
                        {/* Decorative Wave/Line Graph Approximation */}
                        <div className="mt-6 h-12 w-full">
                           <svg viewBox="0 0 100 20" className="w-full h-full stroke-gray-800 fill-none stroke-2">
                               <path d="M0,15 Q25,5 50,10 T100,2" />
                           </svg>
                        </div>
                    </div>
                     <div className="absolute right-0 top-0 h-48 w-48 bg-pink-300 rounded-full opacity-50 blur-3xl"></div>
                </div>

                {/* Card 3: Deletion Requests */}
                <div className="bg-[#A4C8F4] rounded-3xl p-6 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Requests</h3>
                         <div className="flex items-baseline space-x-2">
                            <span className="text-4xl font-bold text-gray-900">{deletionRequests.length}</span>
                            <span className="text-sm font-medium text-gray-800">pending</span>
                        </div>
                         <div className="mt-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/40 text-gray-900">
                                {deletionRequests.length > 0 ? 'Action Required' : 'All Clear'}
                            </span>
                        </div>
                    </div>
                     <div className="absolute -left-4 -bottom-4 h-32 w-32 bg-blue-300 rounded-full opacity-50 blur-2xl"></div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Secondary Section - Latest Activity or similar */}
                 <div className="bg-[#98B486] rounded-3xl p-6 shadow-sm col-span-1">
                     <h3 className="text-lg font-bold text-gray-900 mb-4">System Status</h3>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/30 p-3 rounded-xl">
                            <span className="text-sm font-medium text-gray-900">Database</span>
                            <span className="text-xs font-bold text-green-900">ONLINE</span>
                        </div>
                         <div className="flex justify-between items-center bg-white/30 p-3 rounded-xl">
                            <span className="text-sm font-medium text-gray-900">Role</span>
                            <span className="text-xs font-bold text-green-900">DIRECTOR</span>
                        </div>
                     </div>
                 </div>

                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 col-span-2">
                     <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveTab('users')} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-colors">
                            <Users className="h-6 w-6 text-gray-700 mb-2" />
                            <span className="font-bold text-gray-900 block">Manage Staff</span>
                            <span className="text-xs text-gray-500">Edit roles, reset passwords</span>
                        </button>
                        <button onClick={() => setActiveTab('reports')} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-colors">
                            <FileText className="h-6 w-6 text-gray-700 mb-2" />
                            <span className="font-bold text-gray-900 block">View Reports</span>
                            <span className="text-xs text-gray-500">Generate summaries</span>
                        </button>
                     </div>
                 </div>
            </div>
            
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'users' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Manage Staff</h2>
                    <p className="text-gray-500 mt-1">View and manage all registered users in the system.</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={openUserModal}
                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-sm text-gray-900 bg-[#FAE29F] hover:bg-[#FBE8B5] focus:outline-none transition-all"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add User
                  </button>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                  {message.type === 'success' ? <Check className="h-5 w-5 mr-3" /> : <AlertTriangle className="h-5 w-5 mr-3" />}
                  <span className="font-medium">{message.text}</span>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#FDFBF7]">
                          <tr>
                            <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="relative px-6 py-5">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                                        {user.full_name.charAt(0)}
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-bold text-gray-900">{user.full_name}</div>
                                        <div className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-wrap gap-2 max-w-xs">
                                  {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: string, idx: number) => (
                                    <span key={idx} className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg 
                                        ${r === 'DIRECTOR' ? 'bg-[#FAE29F]/30 text-yellow-800' : 
                                          r === 'APPRAISER' ? 'bg-[#A4C8F4]/30 text-blue-800' : 
                                          'bg-gray-100 text-gray-700'}`}>
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{user.email}</div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                  Active
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                {user.role !== 'DIRECTOR' && (
                                  <div className="flex justify-end space-x-2">
                                     <button
                                      onClick={() => setEditingUser(user)}
                                      disabled={!!actionLoading}
                                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                      title="Edit User"
                                    >
                                     <Edit className="h-4 w-4" />
                                    </button>
                                     <button
                                      onClick={() => handleResetPassword(user)}
                                      disabled={!!actionLoading}
                                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm"
                                      title="Reset Password"
                                    >
                                      {actionLoading === `RESET_PASSWORD_${user.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Key className="h-4 w-4" />
                                      )}
                                    </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={actionLoading === `DELETE_USER_${user.id}`}
                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                                    title="Delete User"
                                  >
                                    {actionLoading === `DELETE_USER_${user.id}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
              </div>
            </div>
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
                                  disabled={!!actionLoading}
                                  className="text-green-600 hover:text-green-900 mr-4 inline-flex items-center"
                                  title="Approve Deletion"
                                >
                                  {actionLoading === `APPROVE_DELETE_${request.id}` ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                </button>
                                <button
                                  onClick={() => handleRejectDeletion(request.id)}
                                  disabled={!!actionLoading}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center"
                                  title="Reject Request"
                                >
                                  {actionLoading === `REJECT_DELETE_${request.id}` ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
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
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Appraisal Management</h2>
                    <p className="text-gray-500 mt-1">Track precision, progress, and performance across all departments.</p>
                </div>
              </div>

              {/* Top Performers Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { key: 'SENIOR_LEADERSHIP', label: 'Senior Leadership', color: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-900' },
                    { key: 'INTERMEDIATE_LEADERSHIP', label: 'Intermediate Leadership', color: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900' },
                    { key: 'FIRSTLINE_LEADERSHIP', label: 'Firstline Leadership', color: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900' }
                ].map((category) => {
                  const topPerformers = allAppraisals
                    .filter(appraisal => {
                      const appraisee = users.find(u => u.id === appraisal.appraisee_id);
                      return appraisee?.job_category === category.key && (appraisal.overall_score || 0) > 0;
                    })
                    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                    .slice(0, 3);

                  return (
                    <div key={category.key} className={`${category.color} rounded-3xl shadow-sm border ${category.border} p-6 relative overflow-hidden`}>
                      <div className="relative z-10">
                          <h3 className={`text-xs font-bold ${category.text} uppercase tracking-widest mb-6 opacity-70`}>
                            Top {category.label}
                          </h3>
                          <div className="space-y-4">
                            {topPerformers.length > 0 ? (
                              topPerformers.map((appraisal, index) => (
                                <div key={appraisal.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl backdrop-blur-sm">
                                  <div className="flex items-center">
                                    <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 
                                      ${index === 0 ? 'bg-yellow-400 text-white shadow-sm' : 
                                        index === 1 ? 'bg-gray-300 text-white' : 
                                        'bg-orange-300 text-white'}`}>
                                      {index + 1}
                                    </span>
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{appraisal.appraisee?.full_name}</p>
                                      <p className="text-xs text-gray-500 font-medium">{appraisal.role || 'Primary Role'}</p>
                                    </div>
                                  </div>
                                  <span className="text-lg font-bold text-gray-900">{appraisal.overall_score}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-400 text-sm italic font-medium">
                                No completed appraisals yet
                              </div>
                            )}
                          </div>
                      </div>
                      {/* Decorative elements */}
                      <div className="absolute -right-10 -top-10 h-32 w-32 bg-white/30 rounded-full blur-2xl"></div>
                    </div>
                  );
                })}
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                   {message.type === 'success' ? <Check className="h-5 w-5 mr-3" /> : <AlertTriangle className="h-5 w-5 mr-3" />}
                   <span className="font-medium">{message.text}</span>
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-[#FDFBF7]">
                        <tr>
                          <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Appraiser</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Appraisee</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Updated</th>
                          <th scope="col" className="relative px-6 py-5"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {allAppraisals.map((appraisal) => (
                          <tr key={appraisal.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs mr-3">
                                        {appraisal.appraiser?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{appraisal.appraiser?.full_name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                        {appraisal.appraisee?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{appraisal.appraisee?.full_name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                                ${appraisal.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                  appraisal.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 
                                  'bg-blue-100 text-blue-700'}`}>
                                {appraisal.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                              {new Date(appraisal.updated_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                {appraisal.status !== 'DRAFT' && (
                                  <button
                                    onClick={() => window.open(`/dashboard/appraisal/${appraisal.appraisee_id}?appraisalId=${appraisal.id}&view=SCORESHEET&hideBack=true`, '_blank')}
                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex items-center"
                                    title="View Final Scoresheet"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                {appraisal.status !== 'DRAFT' && (
                                  <button
                                    onClick={() => handleResetStatus(appraisal.id, 'DRAFT')}
                                    disabled={actionLoading === `RESET_STATUS_${appraisal.id}`}
                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm flex items-center"
                                    title="Reset to Draft"
                                  >
                                    {actionLoading === `RESET_STATUS_${appraisal.id}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Appraisal Reports</h2>
                  <p className="text-gray-500 mt-1">Generate and print comprehensive performance summaries.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all shadow-indigo-200"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Print Official Summary
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
                <div className="px-8 py-6 border-b border-gray-100 print:border-none bg-[#FDFBF7]/50">
                  <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Staff Appraisal Summary</h3>
                        <p className="mt-1 text-sm text-gray-500 font-medium">
                            Generated on {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div className="hidden print:block">
                        <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Confidential Report</span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-[#FDFBF7]">
                        <tr>
                          <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Appraiser</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                          <th scope="col" className="relative px-6 py-5 print:hidden"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
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
                              <tr key={`${user.id}-${role}`} className="hover:bg-gray-50/50 transition-colors cursor-default">
                                <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                            {user.full_name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{user.full_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                     {role}
                                   </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                                    <div className="flex items-center">
                                        {appraiser ? (
                                            <>
                                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] mr-2">
                                                    {appraiser.full_name.charAt(0)}
                                                </div>
                                                {appraiser.full_name}
                                            </>
                                        ) : (
                                            <span className="text-gray-400 italic">Unassigned</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                   <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                                      ${userAppraisal?.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                        userAppraisal?.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 
                                        userAppraisal?.status ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-400'}`}>
                                      {userAppraisal?.status || 'Not Started'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    {userAppraisal?.overall_score ? (
                                        <span className="text-lg font-bold text-gray-900">{userAppraisal.overall_score}</span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium print:hidden">
                                  {userAppraisal && userAppraisal.status !== 'DRAFT' && (
                                    <button
                                      onClick={() => window.open(`/dashboard/appraisal/${user.id}?appraisalId=${userAppraisal.id}&view=SCORESHEET&hideBack=true`, '_blank')}
                                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex items-center ml-auto"
                                      title="View Final Scoresheet"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'my_appraisals' ? (
            <AppraiserContent currentUser={currentUser} initialTab="appraisals" />
          ) : activeTab === 'settings' ? (
             <div className="space-y-8">
                <div className="flex justify-between items-center">
                   <div>
                      <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                      <p className="text-gray-500 mt-1">Manage your account preferences and security.</p>
                   </div>
                </div>

                <div className="max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 bg-[#FDFBF7]/50">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                                <p className="text-sm text-gray-500 font-medium">Update your password to keep your account secure.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        {message && (
                           <div className={`mb-6 p-4 rounded-xl flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                              {message.type === 'success' ? <Check className="h-5 w-5 mr-3" /> : <AlertTriangle className="h-5 w-5 mr-3" />}
                              <span className="font-medium">{message.text}</span>
                           </div>
                        )}

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                                <input
                                  id="new-password"
                                  type="password"
                                  required
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Enter new password"
                                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                                <input
                                  id="confirm-password"
                                  type="password"
                                  required
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Confirm new password"
                                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all"
                                />
                            </div>
                            
                            <div className="pt-4">
                                <button
                                  type="submit"
                                  disabled={updatingPassword}
                                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-indigo-200"
                                >
                                  {updatingPassword ? (
                                     <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                        Updating Password...
                                     </>
                                  ) : (
                                     'Update Password'
                                  )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          ) : null}
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <form onSubmit={handleCreateUser}>
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
                          <div className="mt-1 flex rounded-md shadow-sm relative">
                            <input 
                              type="text" 
                              name="password" 
                              id="password" 
                              required 
                              readOnly
                              value={generatedPassword}
                              className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 bg-gray-50 text-gray-900 px-3 py-2 pr-10" 
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedPassword);
                                alert('Password copied to clipboard');
                              }}
                              className="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 hover:bg-gray-200 rounded-r-md border border-l-0 border-gray-300"
                              title="Copy password"
                            >
                              <ClipboardList className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-red-600 font-medium">
                             * Please copy this password. The user will need it for their first login.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">System Role</label>
                          <select name="role" id="role" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white">
                            {ROLES.filter(role => role !== 'DIRECTOR').map(role => (
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <form onSubmit={handleUpdateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Edit User: {editingUser.full_name}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">System Role</label>
                          <select name="role" id="edit-role" defaultValue={editingUser.role} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white">
                            {ROLES.filter(role => role !== 'DIRECTOR').map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="edit-jobCategory" className="block text-sm font-medium text-gray-700">Job Category</label>
                          <select name="jobCategory" id="edit-jobCategory" defaultValue={editingUser.job_category} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white">
                            <option value="">Select Category</option>
                            {JOB_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{JOB_CATEGORY_LABELS[cat]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Update User
                  </button>
                  <button type="button" onClick={() => setEditingUser(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
              <div className="sm:flex sm:items-start text-center sm:text-left">
                 <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Key className="h-6 w-6 text-orange-600" />
                 </div>
                 <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                       Password Reset Successful
                    </h3>
                    <div className="mt-2 text-sm text-gray-500">
                       <p>A new password has been generated for <strong>{resetPasswordResult.name}</strong>.</p>
                       <p className="mt-2 font-semibold">New Password:</p>
                       
                       <div className="mt-1 flex rounded-md shadow-sm relative">
                            <input 
                              type="text" 
                              readOnly
                              value={resetPasswordResult.password}
                              className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 bg-gray-50 text-gray-900 px-3 py-2 pr-10" 
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(resetPasswordResult.password);
                                alert('Password copied to clipboard');
                              }}
                              className="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 hover:bg-gray-200 rounded-r-md border border-l-0 border-gray-300"
                              title="Copy password"
                            >
                              <ClipboardList className="h-4 w-4 text-gray-600" />
                            </button>
                        </div>
                       <p className="mt-2 text-xs text-red-500">
                          Please copy this password and share it with the user securely. They will be required to change it upon login.
                       </p>
                    </div>
                 </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
              <button 
                type="button" 
                onClick={() => setResetPasswordResult(null)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
