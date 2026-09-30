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
import { ThemeToggle } from '@/components/ThemeToggle';

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
  role: 'APPRAISER' | 'DIRECTOR' | 'SUPER ADMIN' | string;
  customNavigation?: NavigationItem[];
}

export default function DashboardLayout({ children, currentUser, role, customNavigation }: DashboardLayoutProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Load notifications (for Director or Super Admin only)
  useEffect(() => {
    if (role !== 'DIRECTOR' && role !== 'SUPER ADMIN') return;

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

  // Session Timeout Logic (1 hour of inactivity)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set to 1 hour (60 * 60 * 1000 = 3600000 ms)
      timeoutId = setTimeout(() => {
        handleSignOut();
      }, 3600000); 
    };

    // Initialize timer
    resetTimer();

    // Event listeners to reset timer on user activity
    const events = ['mousemove', 'keydown', 'wheel', 'scroll', 'mousedown', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router]);

  const defaultNavigation: NavigationItem[] = role === 'DIRECTOR' || role === 'SUPER ADMIN' ? [
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
    <div className="min-h-screen bg-[#F6F9F8] dark:bg-[#0a0a0a] flex font-sans text-gray-900 dark:text-gray-100 transition-colors print:bg-white print:text-black">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#111827] text-gray-500 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 print:hidden flex flex-col border-r border-gray-100 dark:border-gray-800`}>
        <div className="flex items-center justify-between h-20 px-6">
          <span className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#06402b] dark:text-emerald-400">
            <img src="/logo.svg" alt="Urafiki Carovana School" className="h-9 w-auto" />
            Urafiki
          </span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-4 flex-1 overflow-y-auto">
           <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-3">General</p>
            <nav className="space-y-1">
                {navigation.map((item) => {
                  return (
                    <button
                        key={item.name}
                        onClick={() => {
                        if (item.onClick) item.onClick();
                        if (item.href && item.href !== '#') router.push(item.href);
                        setIsSidebarOpen(false);
                        }}
                        className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors duration-150 group ${
                        item.current
                            ? 'bg-[#06402b]/10 text-[#06402b] dark:bg-emerald-400/10 dark:text-emerald-400'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <item.icon className={`mr-3 h-5 w-5 ${item.current ? 'text-[#06402b] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                        <span>{item.name}</span>
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <button
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            >
                <LogOut className="mr-3 h-5 w-5 text-gray-400" />
                Sign Out
            </button>
            <div className="mt-4 flex items-center px-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-400 to-[#06402b] flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {currentUser.full_name?.[0] || currentUser.email?.[0] || 'U'}
                </div>
                <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{currentUser.full_name || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{role}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-[#F6F9F8] dark:bg-[#0a0a0a] print:bg-white print:h-auto print:overflow-visible">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-6 print:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-500">
                <Menu className="h-8 w-8" />
            </button>

            <div className="flex-1 max-w-2xl flex items-center bg-white dark:bg-gray-800 rounded-full px-4 py-2.5 shadow-sm border border-gray-100 dark:border-gray-700 ml-4 lg:ml-0 transition-colors focus-within:ring-2 focus-within:ring-[#06402b]/20 focus-within:border-[#06402b]/30">
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
                    className="flex-1 bg-transparent outline-none border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 indent-0"
                />
            </div>

            <div className="flex items-center space-x-3 ml-4">
                <ThemeToggle />
                <div className="relative">
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 rounded-full bg-white text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100 relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white">
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-800" />
                      )}
                  </button>

                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3 z-50 transition-colors">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Notifications</h4>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No new notifications</p>
                      ) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <button onClick={() => {
                                setIsNotifOpen(false);
                                router.push(`/dashboard/appraisal/${n.appraisee_id}?appraisalId=${n.id}`);
                              }} className="text-left w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{n.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(n.updated_at).toLocaleString()}</p>
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
