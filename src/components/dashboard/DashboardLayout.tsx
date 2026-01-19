'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  ChevronDown,
  ClipboardList,
  AlertTriangle,
  Check
} from 'lucide-react';
import Link from 'next/link';

export interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  current?: boolean;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentUser: { id: string; email?: string; full_name?: string; role?: string };
  role: 'APPRAISER' | 'DIRECTOR';
  customNavigation?: NavigationItem[];
}

export default function DashboardLayout({ children, currentUser, role, customNavigation }: DashboardLayoutProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Load notifications (for Director only)
  useEffect(() => {
    if (role !== 'DIRECTOR') return;

    let mounted = true;

    const loadNotifications = async () => {
      try {
        // Appraisals that have started (not DRAFT) and completed
        const { data } = await supabase
          .from('appraisals')
          .select(`id, appraisee_id, status, updated_at, appraiser:users!appraiser_id(full_name), appraisee:users!appraisee_id(full_name)`)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (!mounted || !data) return;

        const notifs = data.map((a: any) => ({
          id: a.id,
          appraisee_id: a.appraisee_id,
          status: a.status,
          updated_at: a.updated_at,
          message: a.status === 'COMPLETED' || a.status === 'SIGNED'
            ? `${a.appraisee?.full_name || 'Someone'} appraisal completed`
            : `${a.appraisee?.full_name || 'Someone'} appraisal started`
        }));

        setNotifications(notifs);
      } catch (err) {
        console.error('Failed loading notifications', err);
      }
    };

    loadNotifications();

    return () => { mounted = false; };
  }, [role]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const defaultNavigation: NavigationItem[] = role === 'DIRECTOR' ? [
    { name: 'Dashboard', href: '/dashboard?tab=overview', icon: LayoutDashboard, current: false },
    { name: 'User Management', href: '/dashboard?tab=users', icon: Users, current: false },
    { name: 'Assignments', href: '/dashboard?tab=assignments', icon: ClipboardList, current: false },
    { name: 'Deletion Requests', href: '/dashboard?tab=requests', icon: AlertTriangle, current: false },
    { name: 'Appraisal Management', href: '/dashboard?tab=appraisals', icon: FileText, current: false },
    { name: 'Reports', href: '/dashboard?tab=reports', icon: FileText, current: false },
    { name: 'My Appraisals', href: '/dashboard?tab=my_appraisals', icon: Check, current: false },
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: false },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: true },
    { name: 'My Appraisals', href: '/dashboard?tab=appraisals', icon: FileText, current: false },
    { name: 'Settings', href: '/dashboard?tab=settings', icon: Settings, current: false },
  ];

  const navigation = customNavigation || defaultNavigation;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans text-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1A1A1A] text-gray-400 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 print:hidden flex flex-col rounded-r-3xl m-0 lg:my-4 lg:ml-4 h-[calc(100vh-2rem)] shadow-2xl`}>
        <div className="flex items-center justify-between h-24 px-8">
          <span className="text-2xl font-bold tracking-tight text-white">Urafiki</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-300 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-6 flex-1 overflow-y-auto">
           <div className="mb-10 pl-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">General</p>
            <nav className="space-y-4">
                {navigation.map((item) => {
                  // Determine if active based upon current URL or explicit property
                  const isLinkActive = item.current || (typeof window !== 'undefined' && window.location.href.includes(item.href || 'XYZ'));
                  
                  return (
                    <button
                        key={item.name}
                        onClick={() => {
                        if (item.onClick) item.onClick();
                        if (item.href && item.href !== '#') router.push(item.href);
                        setIsSidebarOpen(false);
                        }}
                        className={`flex items-center w-full px-6 py-4 text-sm font-medium rounded-3xl transition-all duration-300 group relative overflow-hidden ${
                        item.current 
                            ? 'bg-[#E0C09E] text-gray-900 shadow-xl' 
                            : 'text-gray-400 hover:bg-[#2D2D2D] hover:text-gray-200'
                        }`}
                    >
                        {item.current && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50"></div>
                        )}
                        <item.icon className={`mr-4 h-6 w-6 transition-transform group-hover:scale-110 ${item.current ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <span className="relative z-10">{item.name}</span>
                        
                        {/* Subtle glow for active item */}
                        {item.current && (
                             <div className="absolute right-0 top-0 h-20 w-20 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        )}
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800">
            <button 
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 rounded-2xl hover:bg-[#2D2D2D] hover:text-white transition-colors"
            >
                <LogOut className="mr-4 h-5 w-5 text-gray-500" />
                Sign Out
            </button>
            <div className="mt-6 flex items-center px-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {currentUser.full_name?.[0] || currentUser.email?.[0] || 'U'}
                </div>
                <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{currentUser.full_name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{role}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-6 print:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-500">
                <Menu className="h-8 w-8" />
            </button>
            
            <div className="flex-1 max-w-2xl flex items-center bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100 ml-4 lg:ml-0">
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // navigate to dashboard with search term
                        router.push(`/dashboard?term=${encodeURIComponent(searchTerm)}`);
                      }
                    }}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-700 placeholder-gray-400 indent-0"
                />
            </div>

            <div className="flex items-center space-x-4 ml-4">
                <div className="relative">
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 rounded-full bg-white text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100 relative">
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                      )}
                  </button>

                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-50">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Notifications</h4>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-500">No new notifications</p>
                      ) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <button onClick={() => {
                                setIsNotifOpen(false);
                                router.push(`/dashboard/appraisal/${n.appraisee_id}?appraisalId=${n.id}`);
                              }} className="text-left w-full text-sm hover:bg-gray-50 p-2 rounded">
                                <p className="font-medium text-gray-800">{n.message}</p>
                                <p className="text-xs text-gray-500">{new Date(n.updated_at).toLocaleString()}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                 {/* avatar removed as requested */}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 pb-8 print:p-0 print:overflow-visible">
            {children}
        </main>
      </div>
    </div>
  );
}
