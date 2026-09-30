'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { searchUsers } from '@/app/actions/user-actions';

interface StaffSearchResultsProps {
  term: string;
}

type Result = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_category?: string;
};

export default function StaffSearchResults({ term }: StaffSearchResultsProps) {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await searchUsers(term);
      if (active) {
        setResults((data as Result[]) || []);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [term]);

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-700 bg-[#F6F9F8] dark:bg-gray-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">Staff Search Results for &ldquo;{term}&rdquo;</h2>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
          title="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">No staff found matching &ldquo;{term}&rdquo;.</div>
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-gray-700">
          {results.map(user => (
            <li key={user.id} className="px-8 py-4 flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-tr from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/40 flex items-center justify-center text-brand-700 dark:text-emerald-400 font-bold text-sm mr-4">
                  {user.full_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 shrink-0 ml-4">{user.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
