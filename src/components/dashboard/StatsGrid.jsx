'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function StatsGrid({ stats, loading = false, onFilterChange }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Normalize keys to handle both Admin and Staff API formats
  const safeStats = {
    pending: stats?.pending || stats?.pendingApplications || 0,
    approved: stats?.approved || stats?.approvedApplications || 0,
    rejected: stats?.rejected || stats?.rejectedApplications || 0,
    total: stats?.total || stats?.totalApplications || 0,
  };

  const cards = [
    {
      title: "Pending Review",
      value: safeStats.pending,
      icon: <Clock className="w-5 h-5" />,
      color: "text-amber-500",
      accentBg: "bg-amber-500/10",
      filter: "pending"
    },
    {
      title: "Approved",
      value: safeStats.approved,
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-emerald-500",
      accentBg: "bg-emerald-500/10",
      filter: "approved"
    },
    {
      title: "Rejected",
      value: safeStats.rejected,
      icon: <XCircle className="w-5 h-5" />,
      color: "text-red-500",
      accentBg: "bg-red-500/10",
      filter: "rejected"
    },
    {
      title: "Total Requests",
      value: safeStats.total,
      icon: <Users className="w-5 h-5" />,
      color: isDark ? "text-gray-300" : "text-gray-700",
      accentBg: isDark ? "bg-white/5" : "bg-gray-100",
      filter: "all"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <button
          key={idx}
          onClick={() => onFilterChange && onFilterChange(card.filter)}
          className="w-full text-left active:scale-[0.98] transition-all bg-transparent p-0 border-none outline-none shadow-none"
        >
          <GlassCard
            variant="elegant"
            hoverable={false}
            className="p-5 h-full relative overflow-hidden transition-all border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {card.title}
                </p>
                {loading ? (
                  <div className="h-9 w-16 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse mt-1" />
                ) : (
                  <p className={`text-3xl font-bold ${card.color} transition-colors`}>
                    {card.value}
                  </p>
                )}
              </div>
              <div className={`
                p-3 rounded-xl transition-all group-hover:scale-110 ${card.accentBg} ${card.color}
              `}>
                {card.icon}
              </div>
            </div>

            {/* Bottom accent line */}
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-current ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          </GlassCard>
        </button>
      ))}
    </div>
  );
}
