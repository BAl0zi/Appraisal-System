'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, Loader2, Play, Eye } from 'lucide-react';
import { getTeamPerformance } from '@/app/actions/team-actions';

interface TeamPerformanceProps {
    currentUser: { id: string; email?: string; full_name?: string };
}

export default function TeamPerformance({ currentUser }: TeamPerformanceProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [indirectAppraisals, setIndirectAppraisals] = useState<any[]>([]);

    useEffect(() => {
        const fetchTeamPerformance = async () => {
            try {
                const result = await getTeamPerformance(currentUser.id);

                if (result.success) {
                    setIndirectAppraisals(result.data || []);
                } else {
                    console.error('Error fetching team performance:', result.error);
                }
            } catch (error) {
                console.error('Error fetching team performance:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamPerformance();
    }, [currentUser.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Performance</h2>
                    <p className="text-gray-500">Monitor appraisals conducted by your direct reports.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-[#FDFBF7]">
                            <tr>
                                <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Conducted By (Your Appraisee)
                                </th>
                                <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Appraising (Indirect Report)
                                </th>
                                <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Score
                                </th>
                                <th scope="col" className="relative px-6 py-5">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {indirectAppraisals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p className="text-lg font-medium">No indirect appraisals found.</p>
                                        <p className="text-sm">Your appraisees haven't started any appraisals yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                indirectAppraisals.map((appraisal) => (
                                    <tr key={appraisal.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900">{appraisal.appraiser?.full_name}</span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-700">{appraisal.appraisee?.full_name}</span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {appraisal.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                        ${appraisal.status === 'COMPLETED' || appraisal.status === 'SIGNED' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                    appraisal.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                                        'bg-gray-50 text-gray-600 border border-gray-100'
                                                }`}>
                                                {appraisal.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            {appraisal.overall_score ? (
                                                <span className="text-lg font-bold text-gray-900">{appraisal.overall_score}</span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                {appraisal.status !== 'DRAFT' ? (
                                                    <>
                                                        <button
                                                            onClick={() => window.open(`/dashboard/appraisal/${appraisal.appraisee_id}?appraisalId=${appraisal.id}&view=SCORESHEET&hideBack=true`, '_blank')}
                                                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex items-center"
                                                            title="View Full Report"
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            <span className="text-xs font-bold">View</span>
                                                        </button>

                                                        <button
                                                            onClick={() => window.open(`/dashboard/appraiser/${appraisal.appraiser_id || appraisal.appraiser?.id}/reports?appraiserId=${appraisal.appraiser_id || appraisal.appraiser?.id}`, '_blank')}
                                                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center"
                                                            title="View All Appraisals by Appraiser"
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            <span className="text-xs font-bold">Appraiser Reports</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button className="text-gray-400 font-bold text-xs bg-gray-50 px-3 py-1.5 rounded-lg" disabled>
                                                        Draft
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
