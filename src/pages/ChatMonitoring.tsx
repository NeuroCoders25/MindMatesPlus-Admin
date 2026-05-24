import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Flag, CheckCircle } from 'lucide-react';
import {
  collectionGroup, collection, query, orderBy, limit,
  onSnapshot, updateDoc, Timestamp, DocumentReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

interface GroupMessage {
  id: string;
  ref: DocumentReference;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Timestamp | null;
  isFlagged: boolean;
  isResolved: boolean;
}

function formatTimeAgo(ts: Timestamp | null): string {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date((ts as any).seconds * 1000);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ChatMonitoring() {
  const [rawMessages, setRawMessages] = useState<Omit<GroupMessage, 'groupName' | 'senderName'>[]>([]);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'peer_groups'), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = data.group_name ?? data.name ?? d.id;
      });
      setGroupNames(map);
    }, (err) => console.error('Groups listener error:', err));
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = data.nickname ?? data.displayName ?? data.name ?? 'Unknown';
      });
      setUserNames(map);
    }, (err) => console.error('Users listener error:', err));
  }, []);

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .filter((d) => d.ref.parent.parent?.parent?.id === 'peer_groups')
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ref: d.ref,
            groupId: d.ref.parent.parent?.id ?? '',
            senderId: data.senderId ?? data.userId ?? data.user_id ?? '',
            content: data.messageText ?? data.text ?? data.content ?? data.message ?? '',
            createdAt: data.createdAt ?? data.created_at ?? null,
            isFlagged: data.isFlagged ?? data.flagged ?? false,
            isResolved: data.isResolved ?? data.resolved ?? false,
          };
        });
      setRawMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.error('Messages listener error:', err);
      setLoading(false);
    });
  }, []);

  const messages: GroupMessage[] = useMemo(
    () =>
      rawMessages.map((m) => ({
        ...m,
        groupName: groupNames[m.groupId] ?? m.groupId,
        senderName: userNames[m.senderId] ?? 'Unknown',
      })),
    [rawMessages, groupNames, userNames]
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const flaggedToday = messages.filter((m) => {
    if (!m.isFlagged || !m.createdAt) return false;
    const date = m.createdAt.toDate ? m.createdAt.toDate() : new Date((m.createdAt as any).seconds * 1000);
    return date >= today;
  }).length;

  const resolved = messages.filter((m) => m.isResolved).length;
  const pendingReview = messages.filter((m) => m.isFlagged && !m.isResolved).length;

  const handleResolve = async (msg: GroupMessage) => {
    setActionLoading(msg.id);
    try {
      await updateDoc(msg.ref, { isResolved: true, isFlagged: false });
    } catch (err) {
      console.error('Failed to resolve message:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (msg: GroupMessage) => {
    setActionLoading(msg.id);
    try {
      await updateDoc(msg.ref, { isFlagged: true, isResolved: false });
    } catch (err) {
      console.error('Failed to flag message:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      header: 'User',
      accessor: (msg: GroupMessage) => <span className="font-bold">{msg.senderName}</span>,
    },
    {
      header: 'Group',
      accessor: (msg: GroupMessage) => msg.groupName || '—',
    },
    {
      header: 'Message Content',
      accessor: (msg: GroupMessage) => (
        <p className="max-w-md italic text-slate-500 truncate">"{msg.content || '—'}"</p>
      ),
    },
    {
      header: 'Status',
      accessor: (msg: GroupMessage) =>
        msg.isResolved ? (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600">
            Resolved
          </span>
        ) : msg.isFlagged ? (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600">
            Flagged
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
            Normal
          </span>
        ),
    },
    {
      header: 'Time',
      accessor: (msg: GroupMessage) => formatTimeAgo(msg.createdAt),
    },
    {
      header: 'Actions',
      accessor: (msg: GroupMessage) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleResolve(msg)}
            disabled={actionLoading === msg.id || msg.isResolved}
            className="text-emerald-600 hover:text-emerald-700 p-1 disabled:opacity-40"
            title="Resolve"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFlag(msg)}
            disabled={actionLoading === msg.id || (msg.isFlagged && !msg.isResolved)}
            className="text-rose-600 hover:text-rose-700 p-1 disabled:opacity-40"
            title="Flag Message"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
          Chat Monitoring
        </h2>
        <p className="text-slate-500">Real-time message monitoring and moderation for peer groups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Moderation Stats</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Flagged Today</span>
              <span className="text-sm font-bold text-slate-900">{flaggedToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Resolved</span>
              <span className="text-sm font-bold text-emerald-600">{resolved}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Pending Review</span>
              <span className="text-sm font-bold text-rose-600">{pendingReview}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-3">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">AI Sensitivity Settings</h4>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Self-Harm Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={90} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Harassment Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={75} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Spam Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={40} />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={messages} />
      )}
    </div>
  );
}
