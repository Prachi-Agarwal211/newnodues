'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { Search, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StaffHistory() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/staff/login');

      try {
        const res = await fetch(`/api/staff/history?limit=20&page=${page}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (json.success) {
          setHistory(json.data.history || []);
          setPagination(json.data.pagination || { currentPage: 1, totalPages: 1 });
        }
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [page]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filtered = history.filter(item => 
    item.no_dues_forms.student_name.toLowerCase().includes(search.toLowerCase()) ||
    item.no_dues_forms.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Action History</h1>
                <p className="text-gray-500 dark:text-gray-400">View past approvals and rejections.</p>
            </div>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search history..." 
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111] dark:border-white/10 border border-red-100 dark:border-red-900/30 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        <GlassCard className="min-h-[500px] bg-white dark:bg-[#141414] dark:border-white/8 border border-red-100 dark:border-red-900/30">
            {loading ? (
                <div className="p-8 text-center text-gray-400">Loading history...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-600 dark:text-gray-300">
                        <thead className="bg-red-50/80 dark:bg-red-950/40 text-xs uppercase font-semibold text-red-700 dark:text-red-200">
                            <tr>
                                <th className="p-4">Action</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Action Date</th>
                                <th className="p-4">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No records found.</td></tr>
                            ) : (
                                filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors">
                                        <td className="p-4">
                                            {item.status === 'approved' && (
                                                <span className="flex items-center gap-2 text-green-600 font-medium">
                                                  <CheckCircle className="w-4 h-4" /> Completed
                                                </span>
                                            )}
                                            {item.status === 'rejected' && (
                                                <span className="flex items-center gap-2 text-red-600 font-medium">
                                                  <XCircle className="w-4 h-4" /> Rejected
                                                </span>
                                            )}
                                            {item.status === 'pending' && (
                                                <span className="flex items-center gap-2 text-amber-600 font-medium">
                                                  <Clock className="w-4 h-4" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms.student_name}</td>
                                        <td className="p-4 font-mono text-sm">{item.no_dues_forms.registration_no}</td>
                                        <td className="p-4 text-sm flex items-center gap-2">
                                            <Clock className="w-3 h-3" /> {formatDate(item.action_at)}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{item.rejection_reason || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </GlassCard>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-red-100 dark:border-red-900/30 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-red-100 dark:border-red-900/30 rounded-xl text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
