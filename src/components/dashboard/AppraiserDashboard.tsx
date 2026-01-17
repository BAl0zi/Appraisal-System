'use client';

import { useState } from 'react';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';
import AppraiserContent from './AppraiserContent';
import DashboardLayout from './DashboardLayout';

interface AppraiserDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
  initialTab?: string;
}

export default function AppraiserDashboard({ currentUser, initialTab }: AppraiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals' | 'settings'>((initialTab as 'home' | 'appraisals' | 'settings') || 'home');

  const navigation = [
    { name: 'Dashboard', href: '/dashboard?tab=home', icon: LayoutDashboard, current: activeTab === 'home', onClick: () => setActiveTab('home') },
    { name: 'My Appraisals', href: '/dashboard?tab=appraisals', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: activeTab === 'settings', onClick: () => setActiveTab('settings') },
  ];

  return (
    <DashboardLayout currentUser={currentUser} role="APPRAISER" customNavigation={navigation}>
      <AppraiserContent currentUser={currentUser} currentTab={activeTab} />
    </DashboardLayout>
  );
}
