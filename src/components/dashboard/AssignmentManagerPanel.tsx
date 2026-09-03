'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/constants/roles';
import { getAllUsers } from '@/app/actions/user-actions';
import { getAssignments } from '@/app/actions/assignment-actions';
import AssignmentManager from './AssignmentManager';

type User = {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  full_name: string;
};

export default function AssignmentManagerPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: usersData } = await getAllUsers();

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
        if (!map[a.appraisee_id]) map[a.appraisee_id] = {};
        const roleKey = a.role || 'PRIMARY';
        map[a.appraisee_id][roleKey] = a.appraiser_id;
      });
      setAssignments(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };
    load();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <AssignmentManager users={users} assignments={assignments} onUpdate={fetchData} />;
}
