'use client';

import { useState } from 'react';
import { UserRole } from '@/constants/roles';
import { assignAppraiser, removeAssignment } from '@/app/actions/assignment-actions';
import { UserX } from 'lucide-react';

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

// ... (APPRAISAL_HIERARCHY remains the same)

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
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-8">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Appraisal Assignments</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Assign an appraiser to each staff member role.</p>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {assignableItems.map(({ user, role, key }) => {
            // Check for assignment by specific role, fallback to 'PRIMARY' if role matches primary role (legacy support)
            const currentAppraiserId = assignments[user.id]?.[role] || (role === user.role ? assignments[user.id]?.['PRIMARY'] : undefined);
            const isUpdating = loading === key;
            
            const allowedAppraiserRoles = APPRAISAL_HIERARCHY[role as UserRole] || [];
            const eligibleAppraisers = potentialAppraisers.filter(a => 
              allowedAppraiserRoles.includes(a.role) && a.id !== user.id
            );

            return (
              <li key={key} className="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#2D2B55] truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{role}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Appraised by:</span>
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#2D2B55] focus:border-[#2D2B55] rounded-md shadow-sm text-gray-900 bg-white"
                      value={currentAppraiserId || ''}
                      onChange={(e) => handleAssign(user.id, e.target.value, role)}
                      disabled={isUpdating}
                      title={`Assign appraiser for ${user.full_name} (${role})`}
                    >
                      <option value="">Select Appraiser...</option>
                      {eligibleAppraisers.length > 0 ? (
                        eligibleAppraisers.map(appraiser => (
                          <option key={appraiser.id} value={appraiser.id}>
                            {appraiser.full_name} ({appraiser.role})
                          </option>
                        ))
                      ) : (
                        <option disabled>No eligible appraisers found</option>
                      )}
                    </select>
                  </div>
                  {currentAppraiserId && (
                    <button
                      onClick={() => handleRemove(user.id, role)}
                      disabled={isUpdating}
                      className="text-red-600 hover:text-red-900 p-2"
                      title="Remove Assignment"
                    >
                      <UserX className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
