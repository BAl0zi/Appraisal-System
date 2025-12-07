'use client';

import AppraiserContent from './AppraiserContent';
import DashboardLayout from './DashboardLayout';

interface AppraiserDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
}

export default function AppraiserDashboard({ currentUser }: AppraiserDashboardProps) {
  return (
    <DashboardLayout currentUser={currentUser} role="APPRAISER">
      <AppraiserContent currentUser={currentUser} />
    </DashboardLayout>
  );
}
