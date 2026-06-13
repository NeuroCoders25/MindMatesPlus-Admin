import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Eye, ShieldAlert, ShieldCheck, Trash2,
  X, AlertTriangle, Mail, Clock, Users, Phone, Calendar, User as UserIcon,
} from 'lucide-react';
import {
  collection, collectionGroup, onSnapshot, Timestamp,
  deleteDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

interface User {
  _docId: string;
  id: string;
  name: string;
  email: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  peerGroup: string;
  status: 'Active' | 'Suspended' | 'Inactive';
  lastActive: string;
  phone: string;
  avatarUrl: string;
  joinedAt: string;
}

interface RawUser extends Omit<User, 'riskLevel'> {
  _rawRiskLevel: unknown;
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeRiskLevel(raw: unknown, mentalHealthCategory?: string): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (mentalHealthCategory) {
    const cat = mentalHealthCategory.toLowerCase();
    if (cat === 'extremely severe') return 'Critical';
    if (cat.includes('severe')) return 'High';
    if (cat.includes('moderate')) return 'Medium';
  }
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

const RISK_COLORS: Record<User['riskLevel'], string> = {
  Critical: 'bg-rose-100 text-rose-600',
  High:     'bg-amber-100 text-amber-600',
  Medium:   'bg-blue-100 text-blue-600',
  Low:      'bg-emerald-100 text-emerald-600',
};

const RISK_AVATAR_BG: Record<User['riskLevel'], string> = {
  Critical: 'bg-rose-500',
  High:     'bg-amber-500',
  Medium:   'bg-blue-500',
  Low:      'bg-emerald-500',
};

export default function UserManagement() {
  const [rawUsers, setRawUsers] = useState<RawUser[]>([]);
  const [mentalHealthMap, setMentalHealthMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // View profile modal
  const [viewUser, setViewUser] = useState<User | null>(null);

  // Delete modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Suspend loading tracker (stores _docId of user being updated)
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const mapped: RawUser[] = snap.docs.map((d) => {
          const data = d.data();
          const lastActiveRaw =
            data.lastActive ?? data.last_active ?? data.updatedAt ?? data.updated_at ?? data.createdAt ?? data.created_at;
          const lastActiveDate = toDate(lastActiveRaw);
          const joinedRaw = data.createdAt ?? data.created_at;
          const joinedDate = toDate(joinedRaw);
          return {
            _docId: d.id,
            id: d.id.slice(0, 8).toUpperCase(),
            name: data.nickname ?? data.displayName ?? data.name ?? 'Unknown',
            email: data.email ?? '',
            _rawRiskLevel: data.riskLevel ?? data.risk_level,
            peerGroup: data.peerGroup ?? data.peer_group ?? '—',
            status: normalizeStatus(data.status),
            lastActive: lastActiveDate ? formatTimeAgo(lastActiveDate) : 'Never',
            phone: data.phone ?? data.phoneNumber ?? '',
            avatarUrl: data.photoURL ?? data.avatarUrl ?? data.profileImage ?? '',
            joinedAt: joinedDate ? formatDate(joinedDate) : '—',
          };
        });
        setRawUsers(mapped);
        setLoading(false);
      },
      (err) => {
        console.error('Users listener error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, 'mentalHealthProfile'),
      (snap) => {
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const userId = d.ref.parent.parent?.id;
          if (!userId) return;
          const data = d.data();
          const category =
            (data.activeRecommendationCategory as string | undefined) ||
            ((data.initialQuestionnaireScore as Record<string, unknown> | undefined)?.category as string | undefined);
          if (category) map[userId] = category;
        });
        setMentalHealthMap(map);
      },
      (err) => console.error('Mental health profiles listener error:', err)
    );
    return unsub;
  }, []);

  const users = useMemo(
    () =>
      rawUsers.map((u) => ({
        ...u,
        riskLevel: normalizeRiskLevel(u._rawRiskLevel, mentalHealthMap[u._docId]),
      })),
    [rawUsers, mentalHealthMap]
  );

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchesRisk = riskFilter === 'All Risk Levels' || u.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'All Statuses' || u.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const handleSuspendToggle = async (user: User) => {
    const newStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    setSuspendLoading(user._docId);
    try {
      await updateDoc(doc(db, 'users', user._docId), { status: newStatus });
    } catch (err) {
      console.error('Failed to update user status:', err);
    } finally {
      setSuspendLoading(null);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete._docId));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

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
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', RISK_COLORS[user.riskLevel])}>
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewUser(user)}
            className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            title="View Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSuspendToggle(user)}
            disabled={suspendLoading === user._docId}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              user.status === 'Suspended'
                ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
            )}
            title={user.status === 'Suspended' ? 'Unsuspend User' : 'Suspend User'}
          >
            {user.status === 'Suspended'
              ? <ShieldCheck className="w-4 h-4" />
              : <ShieldAlert className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleDeleteClick(user)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
            title="Remove User"
          >
            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Search & filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID…"
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option>All Statuses</option>
          <option>Active</option>
          <option>Suspended</option>
          <option>Inactive</option>
        </select>
        {(searchQuery || riskFilter !== 'All Risk Levels' || statusFilter !== 'All Statuses') && (
          <button
            onClick={() => { setSearchQuery(''); setRiskFilter('All Risk Levels'); setStatusFilter('All Statuses'); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-slate-400 -mt-4 px-1">
          Showing {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          {users.length === 0 ? 'No users found in the database.' : 'No users match your filters.'}
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {/* ── View Profile Modal ───────────────────────────────────────────── */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewUser(null)} />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Close */}
            <button
              onClick={() => setViewUser(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Hero banner */}
            <div className="h-24 bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* Avatar */}
            <div className="px-6 pb-6">
              <div className="flex items-end gap-4 -mt-10 mb-4">
                {viewUser.avatarUrl ? (
                  <img
                    src={viewUser.avatarUrl}
                    alt={viewUser.name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div className={cn(
                    'w-20 h-20 rounded-2xl flex items-center justify-center border-4 border-white shadow-md text-white text-2xl font-bold',
                    RISK_AVATAR_BG[viewUser.riskLevel]
                  )}>
                    {viewUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="pb-1 flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">{viewUser.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', RISK_COLORS[viewUser.riskLevel])}>
                      {viewUser.riskLevel} Risk
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      viewUser.status === 'Active'    ? 'bg-emerald-100 text-emerald-600' :
                      viewUser.status === 'Suspended' ? 'bg-rose-100 text-rose-600' :
                                                        'bg-slate-100 text-slate-500'
                    )}>
                      {viewUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailRow icon={<UserIcon className="w-3.5 h-3.5" />} label="User ID" value={viewUser.id} mono />
                <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={viewUser.email || '—'} />
                {viewUser.phone && (
                  <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={viewUser.phone} />
                )}
                <DetailRow icon={<Users className="w-3.5 h-3.5" />} label="Peer Group" value={viewUser.peerGroup} />
                <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Last Active" value={viewUser.lastActive} />
                <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joined" value={viewUser.joinedAt} />
                {mentalHealthMap[viewUser._docId] && (
                  <div className="col-span-2">
                    <DetailRow
                      icon={<AlertTriangle className="w-3.5 h-3.5" />}
                      label="Mental Health Category"
                      value={mentalHealthMap[viewUser._docId]}
                    />
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
                <button
                  onClick={() => { handleSuspendToggle(viewUser); setViewUser(null); }}
                  disabled={suspendLoading === viewUser._docId}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
                    viewUser.status === 'Suspended'
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                  )}
                >
                  {viewUser.status === 'Suspended'
                    ? <><ShieldCheck className="w-4 h-4" /> Unsuspend</>
                    : <><ShieldAlert className="w-4 h-4" /> Suspend</>}
                </button>
                <button
                  onClick={() => { setViewUser(null); handleDeleteClick(viewUser); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-sm font-bold transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Remove User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !deleteLoading && setIsDeleteModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-rose-50 px-6 py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Remove User?</h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Are you sure you want to remove{' '}
                <span className="font-bold text-slate-900">{userToDelete.name}</span>?{' '}
                This action will permanently delete their account and all associated data.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-y border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                  {userToDelete.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{userToDelete.name}</p>
                  <p className="text-xs text-slate-500">{userToDelete.email}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase">
                    {userToDelete.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 flex items-center gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Keep User
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-rose-600 rounded-xl text-sm font-bold text-white hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all disabled:opacity-70"
              >
                {deleteLoading ? 'Removing…' : 'Remove Permanently'}
              </button>
            </div>

            <button
              onClick={() => !deleteLoading && setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm text-slate-800 truncate', mono && 'font-mono')}>{value || '—'}</p>
      </div>
    </div>
  );
}
