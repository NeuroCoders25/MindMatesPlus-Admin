import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  MessageSquareWarning,
  BookOpenText,
  BrainCircuit,
  BarChart3,
  MessageSquareQuote,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Sidebar navigation is data-driven so links can be managed in one place.
const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'User Management', path: '/users', icon: Users },
  { name: 'Peer Groups', path: '/groups', icon: UsersRound },
  { name: 'Chat Monitoring', path: '/chat', icon: MessageSquareWarning },
  { name: 'Journal Insights', path: '/journals', icon: BookOpenText },
  { name: 'AI Insights', path: '/ai-insights', icon: BrainCircuit },
  { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
  { name: 'Feedback', path: '/feedback', icon: MessageSquareQuote },
  { name: 'Advisor Chat', path: '/advisor-chat', icon: MessageSquare },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const displayName = currentUser?.displayName || currentUser?.email || 'Admin';
  const email = currentUser?.email || '';
  const initials = getInitials(displayName);
  const uid = currentUser?.uid || '';
  const photoURL = currentUser?.photoURL ||
    `https://api.dicebear.com/9.x/avataaars/png?seed=${uid}&size=200`;

  return (
    // Fixed-height sidebar that stays visible while main content scrolls.
    <aside className="w-64 bg-[#405284] text-white flex flex-col h-screen sticky top-0 border-r border-[#334270]">
      {/* Brand/logo area at the top of the sidebar */}
      <div className="p-5 flex items-center justify-center">
        <img src={logo} alt="MindMates+" className="h-12 w-auto object-contain" />
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            // NavLink gives isActive for route-aware styling.
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive
                ? "bg-white/20 text-white font-medium"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            {/* Dynamic icon component from each nav item */}
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              "group-hover:text-white"
            )} />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Admin identity footer section — clicking opens admin profile */}
      <div className="p-4 border-t border-[#334270]">
        <button
          onClick={() => navigate('/admin-profile')}
          className="w-full bg-white/10 hover:bg-white/20 rounded-xl p-4 transition-colors text-left"
        >
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 text-center">Admin Mode</p>
          <div className="flex items-center gap-3">
            <img
              src={photoURL}
              alt="Admin"
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20"
              onError={e => {
                (e.currentTarget as HTMLImageElement).src =
                  `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(initials)}&size=200`;
              }}
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Administrator</p>
              <p className="text-xs text-white/50 truncate">{email}</p>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
