import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { currentUser, signOut } = useAuth();
  const displayName = currentUser?.displayName || currentUser?.email || 'Admin';
  const initials = getInitials(displayName);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-[#405284] border-b border-[#334270] flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder="Search users, groups, or reports..."
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-400 rounded-full border-2 border-[#405284]"></span>
        </button>

        <div className="h-8 w-px bg-white/20 mx-2"></div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white/80">System Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              {initials}
            </div>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
