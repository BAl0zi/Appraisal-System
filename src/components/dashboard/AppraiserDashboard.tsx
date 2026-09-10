'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, Users, ClipboardList, Award } from 'lucide-react';
import AppraiserContent from './AppraiserContent';
import DashboardLayout from './DashboardLayout';
import TeamPerformance from './TeamPerformance';
import AssignmentManagerPanel from './AssignmentManagerPanel';
import StaffSearchResults from './StaffSearchResults';
import MyAppraisalRecord from './MyAppraisalRecord';

interface AppraiserDashboardProps {
  currentUser: { id: string; email?: string; full_name?: string };
  initialTab?: string;
  role?: string;
}

export default function AppraiserDashboard({ currentUser, initialTab, role }: AppraiserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'appraisals' | 'team_performance' | 'assignments' | 'my_record' | 'settings'>((initialTab as any) || 'home');
  const searchParams = useSearchParams();
  const term = searchParams?.get('term');

  const canManageAssignments = role === 'HEAD TEACHER' || role === 'SCHOOL MANAGER';
  const effectiveTab = activeTab === 'assignments' && !canManageAssignments ? 'home' : activeTab;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard?tab=home', icon: LayoutDashboard, current: activeTab === 'home', onClick: () => setActiveTab('home') },
    { name: 'My Appraisals', href: '/dashboard?tab=appraisals', icon: FileText, current: activeTab === 'appraisals', onClick: () => setActiveTab('appraisals') },
    { name: 'My Appraisal Record', href: '/dashboard?tab=my_record', icon: Award, current: activeTab === 'my_record', onClick: () => setActiveTab('my_record') },
    { name: 'Team Performance', href: '/dashboard?tab=team_performance', icon: Users, current: activeTab === 'team_performance', onClick: () => setActiveTab('team_performance') },
    ...(canManageAssignments ? [{ name: 'Appraisal Assignments', href: '/dashboard?tab=assignments', icon: ClipboardList, current: activeTab === 'assignments', onClick: () => setActiveTab('assignments') }] : []),
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: activeTab === 'settings', onClick: () => setActiveTab('settings') },
  ];

  return (
    <DashboardLayout currentUser={currentUser} role={role || 'APPRAISER'} customNavigation={navigation}>
      {term ? (
        <StaffSearchResults term={term} />
      ) : effectiveTab === 'team_performance' ? (
        <TeamPerformance currentUser={currentUser} />
      ) : effectiveTab === 'my_record' ? (
        <MyAppraisalRecord currentUser={currentUser} />
      ) : effectiveTab === 'assignments' ? (
        <AssignmentManagerPanel />
      ) : (
        (() => {
          const tabForContent: 'home' | 'appraisals' | 'settings' = (effectiveTab as 'home' | 'appraisals' | 'settings');
          return <AppraiserContent currentUser={currentUser} currentTab={tabForContent} />;
        })()
      )}
    </DashboardLayout>
  );
}
