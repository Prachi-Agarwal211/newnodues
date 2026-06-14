'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard,
  History,
  MessageSquare,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);
  
  const isStaff = pathname.startsWith('/staff');
  const isAdmin = pathname.startsWith('/admin');

  // Fetch unread count for admin users
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/support/unread-count');
        const json = await res.json();
        if (json.success) {
          setUnreadCount(json.unreadCount);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime changes on support_tickets table
    const channel = supabase
      .channel('support-tickets-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          // Refetch count when any change happens
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const menuItems = isStaff ? [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/staff/dashboard' },
    { name: 'History', icon: History, href: '/staff/history' },
    { name: 'Support Tickets', icon: MessageSquare, href: '/staff/support' },
  ] : isAdmin ? [
    { name: 'Overview', icon: LayoutDashboard, href: '/admin' },
    { name: 'Support Tickets', icon: MessageSquare, href: '/admin/support', badge: unreadCount },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ] : [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/staff/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out
        ${isDark
          ? 'bg-[#111111] border-r border-white/8'
          : 'bg-gradient-to-b from-white to-gray-50 border-r border-gray-200'
        }
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col shadow-xl
      `}>
        
        {/* Header */}
        <div className={`
          h-16 flex items-center justify-between px-6
          ${isDark ? 'border-b border-white/5' : 'border-b border-gray-100'}
        `}>
          <span className={`
            font-bold text-xl
            bg-gradient-to-r from-jecrc-red via-jecrc-red-dark to-transparent dark:from-jecrc-red-bright dark:via-jecrc-red dark:to-white
            bg-clip-text text-transparent
          `}>
            NoDues
          </span>
          <button 
            onClick={() => setIsOpen(false)} 
            className={`
              md:hidden transition-colors duration-200
              ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium
                  ${isActive
                    ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/25 dark:shadow-neon-red'
                    : isDark
                      ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  {item.name}
                </div>
                {item.badge > 0 && (
                  <span className={`
                    flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-bold
                    ${isActive
                      ? 'bg-white text-jecrc-red'
                      : 'bg-red-500 text-white'
                    }
                  `}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className={`
          p-4 border-t
          ${isDark ? 'border-white/5' : 'border-gray-100'}
        `}>
          <button 
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 font-medium
              ${isDark 
                ? 'text-red-400 hover:bg-red-500/10' 
                : 'text-red-600 hover:bg-red-50'
              }
            `}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
