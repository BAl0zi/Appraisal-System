'use client';

import { useState } from 'react';
import { UserRole } from '@/constants/roles';
import { assignAppraiser, removeAssignment } from '@/app/actions/assignment-actions';
import { UserX, Loader2 } from 'lucide-react';

type User = {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  full_name: string;
};

type AssignmentManagerProps = {
  users: User[];
  assignments: Record<string, Record<string, string>>; // appraiseeId -> role -> appraiserId
  onUpdate: () => void;
};

const APPRAISAL_HIERARCHY: Partial<Record<UserRole, UserRole[]>> = {
  'SCHOOL MANAGER': ['DIRECTOR'],
  'HEAD TEACHER': ['DIRECTOR'],
  'FINANCE OFFICER': ['DIRECTOR', 'SCHOOL MANAGER'],
  'OPERATIONS OFFICER': ['DIRECTOR', 'SCHOOL MANAGER'],
  'SECTION HEAD UPPER PRIMARY': ['DIRECTOR', 'HEAD TEACHER'],
  'SECTION HEAD JUNIOR SCHOOL': ['DIRECTOR', 'HEAD TEACHER'],
  'SECTION HEAD LOWER PRIMARY': ['DIRECTOR', 'HEAD TEACHER'],
  'CURRICULUM COORDINATOR': ['DIRECTOR', 'HEAD TEACHER'],
  'ICT MANAGER': ['DIRECTOR', 'HEAD TEACHER'],
  'HEADCOOK': ['SCHOOL MANAGER', 'OPERATIONS OFFICER'],
  'DRIVERS SUPERVISOR': ['SCHOOL MANAGER', 'OPERATIONS OFFICER'],
  'CLEANERS SUPERVISOR': ['SCHOOL MANAGER', 'OPERATIONS OFFICER'],
  'SECRETARY': ['SCHOOL MANAGER', 'HEAD TEACHER'],
  'ACCOUNTANT': ['SCHOOL MANAGER', 'FINANCE OFFICER'],
  'HEAD OF PANELS': ['HEAD TEACHER', 'SECTION HEAD UPPER PRIMARY', 'SECTION HEAD JUNIOR SCHOOL', 'SECTION HEAD LOWER PRIMARY', 'CURRICULUM COORDINATOR'],
  'CLASS TEACHERS': ['HEAD TEACHER', 'SECTION HEAD UPPER PRIMARY', 'SECTION HEAD JUNIOR SCHOOL', 'SECTION HEAD LOWER PRIMARY', 'CURRICULUM COORDINATOR'],
  'SPECIAL ROLES': ['HEAD TEACHER', 'SECTION HEAD UPPER PRIMARY', 'SECTION HEAD JUNIOR SCHOOL', 'SECTION HEAD LOWER PRIMARY', 'CURRICULUM COORDINATOR'],
  'CARETAKERS': ['HEAD TEACHER', 'OPERATIONS OFFICER'],
  'COOKS': ['OPERATIONS OFFICER', 'HEADCOOK'],
  'CLEANERS': ['OPERATIONS OFFICER', 'CLEANERS SUPERVISOR'],
  'DRIVERS': ['OPERATIONS OFFICER', 'DRIVERS SUPERVISOR'],
  'TEACHERS': ['SECTION HEAD UPPER PRIMARY', 'SECTION HEAD JUNIOR SCHOOL', 'SECTION HEAD LOWER PRIMARY', 'CURRICULUM COORDINATOR'],
  'ICT TECHNICIANS': ['ICT MANAGER'],
};

export default function AssignmentManager({ users, assignments, onUpdate }: AssignmentManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAssign = async (appraiseeId: string, appraiserId: string, role: string) => {
    if (!appraiserId) return;
    const loadingKey = `${appraiseeId}-${role}`;
    setLoading(loadingKey);
    const result = await assignAppraiser(appraiseeId, appraiserId, role);
    if (result.error) {
      alert(`Failed to assign appraiser: ${result.error}`);
    } else {
      onUpdate();
    }
    setLoading(null);
  };

  const handleRemove = async (appraiseeId: string, role: string) => {
    if (!confirm('Remove this assignment?')) return;
    const loadingKey = `${appraiseeId}-${role}`;
    setLoading(loadingKey);
    const result = await removeAssignment(appraiseeId, role);
    if (result.error) {
      alert(`Failed to remove assignment: ${result.error}`);
    } else {
      onUpdate();
    }
    setLoading(null);
  };

  // Filter out Directors from being appraisees
  const appraisees = users.filter(u => u.role !== 'DIRECTOR');
  const potentialAppraisers = users;

  // Flatten users into assignable items (User + Role)
  const assignableItems = appraisees.flatMap(user => {
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    return userRoles.map(role => ({
      user,
      role,
      key: `${user.id}-${role}`
    }));
  });

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Appraisal Assignments</h2>
                <p className="text-gray-500 mt-1">Assign appropriate appraisers to staff members based on their hierarchy.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <span className="text-sm font-bold text-gray-500 mr-2">Total Roles:</span>
                <span className="text-xl font-bold text-gray-900">{assignableItems.length}</span>
            </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 bg-[#FDFBF7]/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Staff Role</div>
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:block">Assigned Appraiser</div>
                </div>
            </div>
            <ul className="divide-y divide-gray-50">
            {assignableItems.map(({ user, role, key }) => {
                // Check for assignment by specific role, fallback to 'PRIMARY' if role matches primary role (legacy support)
                const currentAppraiserId = assignments[user.id]?.[role] || (role === user.role ? assignments[user.id]?.['PRIMARY'] : undefined);
                const isUpdating = loading === key;
                
                const allowedAppraiserRoles = APPRAISAL_HIERARCHY[role as UserRole] || [];
                const eligibleAppraisers = potentialAppraisers.filter(a => 
                allowedAppraiserRoles.includes(a.role) && a.id !== user.id
                );

                return (
                <li key={key} className="px-8 py-5 hover:bg-gray-50/50 transition-all duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        {/* Appraisee Info */}
                        <div className="flex items-center min-w-0">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-tr from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm mr-4">
                                {user.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                                <span className={`mt-1 inline-flex text-xs font-bold px-2 py-0.5 rounded-lg 
                                    ${role === 'TEACHERS' ? 'bg-orange-100 text-orange-800' : 
                                      role.includes('HEAD') ? 'bg-purple-100 text-purple-800' : 
                                      'bg-blue-50 text-blue-700'}`}>
                                    {role}
                                </span>
                            </div>
                        </div>

                        {/* Assignment Controls */}
                        <div className="flex items-center space-x-3">
                            <div className="relative flex-1">
                                <select
                                    className="block w-full pl-4 pr-10 py-2.5 text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-700 bg-gray-50 disabled:opacity-50 transition-all"
                                    value={currentAppraiserId || ''}
                                    onChange={(e) => handleAssign(user.id, e.target.value, role)}
                                    disabled={isUpdating}
                                    title={`Assign appraiser for ${user.full_name} (${role})`}
                                >
                                    <option value="" className="text-gray-400">Select Appraiser...</option>
                                    {eligibleAppraisers.length > 0 ? (
                                        eligibleAppraisers.map(appraiser => (
                                        <option key={appraiser.id} value={appraiser.id}>
                                            {appraiser.full_name} — {appraiser.role}
                                        </option>
                                        ))
                                    ) : (
                                        <option disabled>No eligible appraisers found</option>
                                    )}
                                </select>
                                {isUpdating && (
                                    <div className="absolute right-3 top-2.5">
                                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                    </div>
                                )}
                            </div>
                            
                            {currentAppraiserId && (
                                <button
                                onClick={() => handleRemove(user.id, role)}
                                disabled={isUpdating}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                title="Remove Assignment"
                                >
                                   <UserX className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </li>
                );
            })}
            </ul>
        </div>
    </div>
  );
}
