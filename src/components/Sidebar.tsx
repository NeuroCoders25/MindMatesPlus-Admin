import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UsersRound, 
  MessageSquareWarning, 
  BookOpenText, 
  BrainCircuit, 
  BarChart3, 
  MessageSquareQuote, 
  Settings,
  HeartPulse
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'User Management', path: '/users', icon: Users },
  { name: 'Peer Groups', path: '/groups', icon: UsersRound },
  { name: 'Chat Monitoring', path: '/chat', icon: MessageSquareWarning },
  { name: 'Journal Insights', path: '/journals', icon: BookOpenText },
  { name: 'AI Insights', path: '/ai-insights', icon: BrainCircuit },
  { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
  { name: 'Feedback', path: '/feedback', icon: MessageSquareQuote },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <HeartPulse className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">MindMates+</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive 
                ? "bg-indigo-600/10 text-indigo-400 font-medium" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              "group-hover:text-indigo-400"
            )} />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Admin Mode</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">admin@mindmates.plus</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
