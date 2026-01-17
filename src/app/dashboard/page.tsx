'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DirectorDashboard from '@/components/dashboard/DirectorDashboard';
import AppraiserDashboard from '@/components/dashboard/AppraiserDashboard';
import ChangePasswordForm from '@/components/ChangePasswordForm';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Fetch user details from public.users table
      const { data: userDetails, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user details:', error);
      }

      setCurrentUser(session.user);
      setUserData(userDetails);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-red-600">Error loading user data. Please try logging in again.</div>
        </div>
      );
  }

  // Check for password change requirement
  if (userData.is_password_changed === false) {
      return <ChangePasswordForm userId={userData.id} />;
  }

  if (userData.role === 'DIRECTOR') {
    return <DirectorDashboard currentUser={currentUser} initialTab={initialTab || undefined} />;
  }

  return <AppraiserDashboard currentUser={currentUser} initialTab={initialTab || undefined} />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

