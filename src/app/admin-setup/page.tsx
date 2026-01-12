'use client';

import { useState } from 'react';
import { resetSystemForProduction } from '@/app/actions/production-cleanup';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('WARNING: This will delete ALL users and appraisals except the Director. Are you sure?')) {
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await resetSystemForProduction(email || undefined, password || undefined);
    setStatus(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-red-500">Production Reset</h1>
        
        <p className="mb-4 text-gray-300">
          This tool will wipe all data (Appraisals, Assignments, Users) from the system to prepare for production.
          It will preserve any user with the role 'DIRECTOR'.
        </p>
        
        <p className="mb-6 text-yellow-400 text-sm">
          If no Director exists, enter credentials below to create one. If a Director exists, you can leave these blank.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Director Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white"
              placeholder="director@school.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Director Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
          >
            {loading ? 'Resetting System...' : 'RESET SYSTEM NOW'}
          </button>
        </form>

        {status && (
          <div className={`mt-4 p-4 rounded ${status.success ? 'bg-green-800/50 text-green-200' : 'bg-red-800/50 text-red-200'}`}>
            {status.success ? status.message : `Error: ${status.error}`}
          </div>
        )}
      </div>
    </div>
  );
}
