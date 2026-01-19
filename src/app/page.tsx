import Link from 'next/link';
import { Shield, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-[#2D2B55] to-indigo-900 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-8">
          <div className="h-24 w-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
            <Shield className="h-14 w-14 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl mb-2 drop-shadow-lg">
          Urafiki Carovana
        </h1>
        <p className="text-2xl font-medium text-blue-200 mb-6 tracking-wide">
          Simple, secure staff appraisals that help teams grow.
        </p>

        <div className="max-w-2xl mx-auto text-blue-100 text-left mb-8">
          <p className="mb-4">
            Urafiki Carovana makes performance reviews easy — no jargon, no paperwork. Run fair, consistent appraisals, collect digital signatures, and generate clear reports in minutes. Built for busy managers who want real results without the admin headache.
          </p>
          <p>
            Try it to streamline feedback, recognise top performers, and keep development on track — all from one secure, user-friendly portal.
          </p>
        </div>
        
        <div className="max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-10">
          <ul className="text-left space-y-3 text-blue-100">
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
              <span>Run reviews quickly — set goals, score fairly, and share feedback.</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
              <span>Sign electronically — secure, legal-ready digital signatures.</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
              <span>Export clear reports to track progress and celebrate wins.</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-[#2D2B55] bg-white hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Access the Portal
          </Link>
        </div>
        
        <p className="mt-12 text-sm text-blue-300/60">
          © {new Date().getFullYear()} Urafiki Carovana. All rights reserved.
        </p>
      </div>
    </div>
  );
}
