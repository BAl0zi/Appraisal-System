'use client';

import { useState } from 'react';
import { LayoutDashboard, FileText, Settings, Users } from 'lucide-react';
import AppraiserContent from './AppraiserContent';
import DashboardLayout from './DashboardLayout';
import TeamPerformance from './TeamPerformance';

interface AppraiserDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
  initialTab?: string;
}

export default function AppraiserDashboard({ currentUser, initialTab }: AppraiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals' | 'team_performance' | 'settings'>((initialTab as any) || 'home');

  const navigation = [
    { name: 'Dashboard', href: '/dashboard?tab=home', icon: LayoutDashboard, current: activeTab === 'home', onClick: () => setActiveTab('home') },
    { name: 'My Appraisals', href: '/dashboard?tab=appraisals', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
    { name: 'Team Performance', href: '/dashboard?tab=team_performance', icon: Users, current: activeTab === 'team_performance', onClick: () => setActiveTab('team_performance') },
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: activeTab === 'settings', onClick: () => setActiveTab('settings') },
  ];

  return (
    <DashboardLayout currentUser={currentUser} role="APPRAISER" customNavigation={navigation}>
      {activeTab === 'team_performance' ? (
        <TeamPerformance currentUser={currentUser} />
      ) : (
        (() => {
          const tabForContent: 'home' | 'appraisals' | 'settings' = activeTab === 'team_performance' ? 'home' : (activeTab as 'home' | 'appraisals' | 'settings');
          return <AppraiserContent currentUser={currentUser} currentTab={tabForContent} />;
        })()
      )}
    </DashboardLayout>
  );
}
