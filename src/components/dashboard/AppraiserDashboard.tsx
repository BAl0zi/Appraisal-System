'use client';

import { useState } from 'react';
import { LayoutDashboard, FileText } from 'lucide-react';
import AppraiserContent from './AppraiserContent';
import DashboardLayout from './DashboardLayout';

interface AppraiserDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
}

export default function AppraiserDashboard({ currentUser }: AppraiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals'>('home');

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, current: activeTab === 'home', onClick: () => setActiveTab('home') },
    { name: 'My Appraisals', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
  ];

  return (
    <DashboardLayout currentUser={currentUser} role="APPRAISER" customNavigation={navigation}>
      <AppraiserContent currentUser={currentUser} currentTab={activeTab} />
    </DashboardLayout>
  );
}
