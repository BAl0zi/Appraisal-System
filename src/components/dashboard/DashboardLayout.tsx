'use client';

import { useState } from 'react';
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
  Search,
  ChevronDown
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const defaultNavigation: NavigationItem[] = role === 'DIRECTOR' ? [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: true },
    { name: 'Staff Management', href: '#', icon: Users, current: false },
    { name: 'Reports', href: '#', icon: FileText, current: false },
    { name: 'Settings', href: '#', icon: Settings, current: false },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: true },
    { name: 'My Appraisals', href: '#', icon: FileText, current: false },
  ];

  const navigation = customNavigation || defaultNavigation;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2D2B55] text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-[#1E1C3A]">
          <span className="text-xl font-bold tracking-wider">Urafiki Carovana</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-300 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-4 py-6">
          <div className="flex items-center mb-8 px-2">
            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-lg font-bold">
              {currentUser.full_name?.[0] || currentUser.email?.[0] || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{currentUser.full_name || 'User'}</p>
              <p className="text-xs text-gray-400">{role}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (item.href && item.href !== '#') router.push(item.href);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  item.current 
                    ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${item.current ? 'text-blue-400' : 'text-gray-400'}`} />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 flex justify-between items-center ml-4 lg:ml-0">
              <div className="flex-1 flex max-w-md ml-4 lg:ml-8">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    name="search"
                    id="search"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                    placeholder="Search..."
                    type="search"
                  />
                </div>
              </div>
              
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-6 w-6" />
                </button>
                
                {/* Profile Dropdown (Simplified) */}
                <div className="relative">
                  <div className="flex items-center cursor-pointer">
                     <span className="hidden md:block text-sm font-medium text-gray-700 mr-2">{currentUser.full_name}</span>
                     <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
