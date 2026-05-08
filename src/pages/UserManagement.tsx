import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Eye, ShieldAlert } from 'lucide-react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  peerGroup: string;
  status: 'Active' | 'Suspended' | 'Inactive';
  lastActive: string;
}

function toDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === 'object' && (raw as { seconds?: number }).seconds) {
    return new Date((raw as { seconds: number }).seconds * 1000);
  }
  return undefined;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
}

function normalizeRiskLevel(raw: unknown): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (typeof raw !== 'string') return 'Low';
  const lower = raw.toLowerCase();
  if (lower === 'critical') return 'Critical';
  if (lower === 'high') return 'High';
  if (lower === 'medium') return 'Medium';
  return 'Low';
}

function normalizeStatus(raw: unknown): 'Active' | 'Suspended' | 'Inactive' {
  if (typeof raw !== 'string') return 'Active';
  const lower = raw.toLowerCase();
  if (lower === 'suspended') return 'Suspended';
  if (lower === 'inactive') return 'Inactive';
  return 'Active';
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const mapped: User[] = snap.docs.map((doc) => {
          const data = doc.data();
          const lastActiveRaw =
            data.lastActive ?? data.last_active ?? data.updatedAt ?? data.updated_at ?? data.createdAt ?? data.created_at;
          const lastActiveDate = toDate(lastActiveRaw);
          return {
            id: doc.id.slice(0, 8).toUpperCase(),
            name: data.displayName ?? data.name ?? 'Unknown',
            email: data.email ?? '',
            riskLevel: normalizeRiskLevel(data.riskLevel ?? data.risk_level),
            peerGroup: data.peerGroup ?? data.peer_group ?? '—',
            status: normalizeStatus(data.status),
            lastActive: lastActiveDate ? formatTimeAgo(lastActiveDate) : 'Never',
          };
        });
        setUsers(mapped);
        setLoading(false);
      },
      (err) => {
        console.error('Users listener error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchesRisk = riskFilter === 'All Risk Levels' || u.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const columns = [
    { header: 'User ID', accessor: 'id' as keyof User, className: 'font-mono text-xs' },
    {
      header: 'Name',
      accessor: (user: User) => (
        <div>
          <p className="font-bold text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      ),
    },
    {
      header: 'Risk Level',
      accessor: (user: User) => (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
          user.riskLevel === 'Critical' ? 'bg-rose-100 text-rose-600' :
          user.riskLevel === 'High'     ? 'bg-amber-100 text-amber-600' :
          user.riskLevel === 'Medium'   ? 'bg-blue-100 text-blue-600' :
                                          'bg-emerald-100 text-emerald-600'
        )}>
          {user.riskLevel}
        </span>
      ),
    },
    { header: 'Peer Group', accessor: 'peerGroup' as keyof User },
    {
      header: 'Status',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            user.status === 'Active'    ? 'bg-emerald-500' :
            user.status === 'Suspended' ? 'bg-rose-500' :
                                          'bg-slate-300'
          )} />
          <span className="text-xs font-medium">{user.status}</span>
        </div>
      ),
    },
    { header: 'Last Active', accessor: 'lastActive' as keyof User },
    {
      header: 'Actions',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            title="View Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
            title="Suspend User"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500">Monitor and manage MindMates+ users and their safety levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Export Data
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option>All Risk Levels</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Loading users…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          {users.length === 0 ? 'No users found in the database.' : 'No users match your search.'}
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}
