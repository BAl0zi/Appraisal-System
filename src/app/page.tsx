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
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
            <Shield className="h-14 w-14 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl mb-2 drop-shadow-lg">
          Urafiki Carovana School
        </h1>
        <p className="text-xl font-medium text-blue-200 mb-8 tracking-wide italic">
          "Only Wonder Knows"
        </p>

        <div className="max-w-3xl mx-auto text-blue-100/90 text-center mb-10 leading-relaxed">
          <p className="mb-4 text-lg">
            Prompted by the teachings of the Catholic Church, our mission is to provide an all-rounded education to each individual, developing self-aware persons who live their faith in action.
          </p>
          <p className="text-sm opacity-80 max-w-2xl mx-auto">
            Located in Nairobi, we offer the Competency-Based Curriculum (CBC) in a nurturing environment that fosters academic excellence, spiritual growth, and character formation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 flex flex-col items-center hover:bg-white/20 transition-all">
            <div className="bg-blue-500/20 p-3 rounded-full mb-3">
              <CheckCircle className="h-6 w-6 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Faith</h3>
            <p className="text-sm text-blue-100 text-center">Believing in God ensuring every child feels loved and wanted.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 flex flex-col items-center hover:bg-white/20 transition-all">
            <div className="bg-green-500/20 p-3 rounded-full mb-3">
              <CheckCircle className="h-6 w-6 text-green-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hope</h3>
            <p className="text-sm text-blue-100 text-center">Striving for greatness and realizing potential through hard work.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 flex flex-col items-center hover:bg-white/20 transition-all">
            <div className="bg-pink-500/20 p-3 rounded-full mb-3">
              <CheckCircle className="h-6 w-6 text-pink-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Charity</h3>
            <p className="text-sm text-blue-100 text-center">Welcoming all, fostering inclusivity, love, and respect.</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-[#2D2B55] bg-white hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Access Appraisal Portal
          </Link>
        </div>

        <p className="mt-12 text-sm text-blue-300/60">
          © {new Date().getFullYear()} Urafiki Carovana. All rights reserved.
        </p>
      </div>
    </div>
  );
}
