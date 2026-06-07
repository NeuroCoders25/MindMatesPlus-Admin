import React, { useState, useEffect, useRef } from 'react';
import {
  HeadphonesIcon, Circle, Clock, CheckCircle2, BadgeCheck,
  RefreshCw, Inbox, AlertTriangle, AlertCircle, HelpCircle,
  Settings2, FileQuestion, LifeBuoy, Filter, Tag, CalendarDays,
  User, Send, MessageSquare, ChevronRight, ChevronDown, X,
  Zap, ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';
import { safeText } from '../services/cryptoService';
import { cn } from '../lib/utils';
import type {
  SupportRequest, SupportCategory, SupportPriority,
  SupportStatus, AvailabilityStatus,
} from '../types';

// ─── Static metadata ─────────────────────────────────────────────────────────

const CATEGORIES: { value: SupportCategory; icon: React.ElementType; desc: string }[] = [
  { value: 'Technical Issue',  icon: Settings2,     desc: 'Portal bugs or feature problems' },
  { value: 'Urgent Case',      icon: AlertTriangle, desc: 'Critical user situation' },
  { value: 'System Error',     icon: AlertCircle,   desc: 'Crashes or connectivity errors' },
  { value: 'Consultation',     icon: HelpCircle,    desc: 'Policy / best-practice guidance' },
  { value: 'Policy Question',  icon: FileQuestion,  desc: 'Platform rules or compliance' },
  { value: 'Other',            icon: LifeBuoy,      desc: 'Anything else needing attention' },
];

const PRIORITY_META: Record<SupportPriority, { color: string; bg: string; dot: string }> = {
  Low:      { color: 'text-slate-600',  bg: 'bg-slate-50  border-slate-200',  dot: 'bg-slate-400'  },
  Medium:   { color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  dot: 'bg-amber-400'  },
  High:     { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  Critical: { color: 'text-rose-700',   bg: 'bg-rose-50   border-rose-200',   dot: 'bg-rose-500'   },
};

const STATUS_META: Record<SupportStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',   icon: Clock        },
  in_progress: { label: 'In Progress', color: 'text-blue-700',    bg: 'bg-blue-50',    icon: RefreshCw    },
  resolved:    { label: 'Resolved',    color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
  closed:      { label: 'Closed',      color: 'text-slate-500',   bg: 'bg-slate-50',   icon: BadgeCheck   },
};

const AVAILABILITY_OPTIONS: {
  value: AvailabilityStatus; label: string; desc: string;
  dot: string; ring: string; text: string;
}[] = [
  { value: 'online',  label: 'Online',  desc: 'Available for immediate assistance', dot: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  { value: 'busy',    label: 'Busy',    desc: 'Occupied — may respond with delay',   dot: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700'   },
  { value: 'away',    label: 'Away',    desc: 'Temporarily away from portal',        dot: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600'   },
  { value: 'offline', label: 'Offline', desc: 'Not currently logged in',             dot: 'bg-slate-300',   ring: 'ring-slate-200',   text: 'text-slate-400'   },
];

const STATUS_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  pending:     ['in_progress'],
  in_progress: ['resolved', 'pending'],
  resolved:    ['closed', 'in_progress'],
  closed:      ['resolved'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function catMeta(cat: SupportCategory) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[5];
}

function formatTs(ts: unknown): string {
  if (!ts) return '—';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts as string);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(ts: unknown): string {
  if (!ts) return '';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts as string);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SystemSupport() {
  const { currentUser } = useAuth();

  // ── My availability ──────────────────────────────────────────────────────
  const [myAvailability, setMyAvailability] = useState<AvailabilityStatus>('online');
  const [availLoading, setAvailLoading] = useState(false);

  // ── Support requests ─────────────────────────────────────────────────────
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<SupportStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<SupportPriority | 'all'>('all');

  // ── Selected request detail + chat ───────────────────────────────────────
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Inline chat ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<{ id: string; senderId: string; messageText: string; createdAt: unknown }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Init: load & maintain admin Firestore record ─────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const adminRef = doc(db, 'admins', currentUser.uid);
    const unsubscribe = onSnapshot(
      adminRef,
      (snap) => {
        if (snap.exists()) {
          setMyAvailability(snap.data().availability ?? 'online');
        } else {
          setDoc(
            adminRef,
            {
              name: currentUser.displayName || currentUser.email || 'Admin',
              email: currentUser.email || '',
              role: 'System Admin',
              availability: 'online',
              lastSeen: serverTimestamp(),
            },
            { merge: true }
          ).catch((err) => console.error('Failed to create admin record:', err));
        }
      },
      (err) => {
        console.error('Admin snapshot error:', err);
      }
    );
    return unsubscribe;
  }, [currentUser]);

  // ── Listen to all support requests ───────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const list: SupportRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SupportRequest));
      setRequests(list);
      // Keep selected in sync
      setSelected(prev => prev ? (list.find(r => r.id === prev.id) ?? prev) : null);
    });
  }, []);

  // ── Listen to chat messages when a request with chatId is selected ────────
  useEffect(() => {
    if (!selected?.chatId) {
      setMessages([]);
      return;
    }
    const unsub = chatService.listenToMessages(selected.chatId, msgs => {
      setMessages(msgs as typeof messages);
    });
    return () => unsub();
  }, [selected?.chatId]);

  // ── Scroll to bottom when messages change ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = {
    total:       requests.length,
    pending:     requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    resolved:    requests.filter(r => r.status === 'resolved' || r.status === 'closed').length,
  };

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    return true;
  });

  // ── Update own availability ───────────────────────────────────────────────
  const handleAvailability = async (val: AvailabilityStatus) => {
    if (!currentUser || availLoading) return;
    const prevAvailability = myAvailability;
    setAvailLoading(true);
    setMyAvailability(val);

    try {
      const adminRef = doc(db, 'admins', currentUser.uid);
      const snap = await getDoc(adminRef);
      const payload = {
        availability: val,
        lastSeen: serverTimestamp(),
      } as Record<string, unknown>;

      if (snap.exists()) {
        await updateDoc(adminRef, payload);
      } else {
        await setDoc(
          adminRef,
          {
            name: currentUser.displayName || currentUser.email || 'Admin',
            email: currentUser.email || '',
            role: 'System Admin',
            ...payload,
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error('Failed to update availability:', err);
      setMyAvailability(prevAvailability);
    } finally {
      setAvailLoading(false);
    }
  };

  // ── Accept + assign request to self ──────────────────────────────────────
  const handleAccept = async (req: SupportRequest) => {
    if (!currentUser || actionLoading) return;
    setActionLoading(true);
    try {
      // Create / retrieve privateChats document
      const chatId = await chatService.getOrCreateChat(currentUser.uid, req.advisorId);
      const adminName = currentUser.displayName || currentUser.email || 'Admin';
      await updateDoc(doc(db, 'supportRequests', req.id), {
        status: 'in_progress',
        adminId: currentUser.uid,
        adminName,
        chatId,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Change ticket status ──────────────────────────────────────────────────
  const handleStatusChange = async (req: SupportRequest, next: SupportStatus) => {
    if (!currentUser || actionLoading) return;
    setStatusDropOpen(false);
    setActionLoading(true);
    try {
      const patch: Record<string, unknown> = { status: next, updatedAt: serverTimestamp() };
      if (next === 'resolved' || next === 'closed') patch.resolvedAt = serverTimestamp();
      await updateDoc(doc(db, 'supportRequests', req.id), patch);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Send chat message ─────────────────────────────────────────────────────
  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selected?.chatId || !chatInput.trim() || sendingMsg) return;
    const text = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);
    try {
      await chatService.sendMessage(
        selected.chatId,
        currentUser.uid,
        'admin',
        selected.advisorId,
        text
      );
    } finally {
      setSendingMsg(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const myAvailMeta = AVAILABILITY_OPTIONS.find(a => a.value === myAvailability)!;

  return (
    <div className="space-y-6 max-w-full">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeadphonesIcon className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Support</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage advisor support requests and update your availability status.
            </p>
          </div>
        </div>
        {/* Live status pill */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
          <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', myAvailMeta.dot)} />
          <span className={cn('text-xs font-bold', myAvailMeta.text)}>{myAvailMeta.label}</span>
        </div>
      </header>

      {/* ── Main 3-column grid ───────────────────────────────────────────── */}
      <div className={cn(
        'grid gap-6 transition-all duration-300',
        selected ? 'grid-cols-[240px_1fr_420px]' : 'grid-cols-[240px_1fr]'
      )}>

        {/* ════════════════════ LEFT PANEL ════════════════════ */}
        <aside className="space-y-4">

          {/* My Availability */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-black text-slate-800 tracking-tight">My Availability</h2>
            </div>
            <div className="space-y-2">
              {AVAILABILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={availLoading}
                  onClick={() => handleAvailability(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                    myAvailability === opt.value
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', opt.dot)} />
                  <div className="min-w-0">
                    <p className={cn('text-xs font-bold', myAvailability === opt.value ? 'text-indigo-700' : 'text-slate-700')}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-snug truncate">{opt.desc}</p>
                  </div>
                  {myAvailability === opt.value && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Request Stats</h2>
            {[
              { label: 'Total',       value: stats.total,       icon: Inbox,        color: 'text-slate-500', bg: 'bg-slate-50'    },
              { label: 'Pending',     value: stats.pending,     icon: Clock,        color: 'text-amber-500', bg: 'bg-amber-50'    },
              { label: 'In Progress', value: stats.in_progress, icon: RefreshCw,    color: 'text-blue-500',  bg: 'bg-blue-50'     },
              { label: 'Resolved',    value: stats.resolved,    icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                  <s.icon className={cn('w-4 h-4', s.color)} />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                  <span className="text-sm font-black text-slate-800">{s.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Priority legend */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Priority Guide</h2>
            {(Object.keys(PRIORITY_META) as SupportPriority[]).map(p => (
              <div key={p} className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_META[p].dot)} />
                <span className="text-xs font-semibold text-slate-600 w-16">{p}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ════════════════════ CENTER PANEL — Queue ════════════════════ */}
        <div className="space-y-4 min-w-0">

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">Status</span>
              {(['all', 'pending', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11px] font-bold transition-all',
                    filterStatus === s
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s !== 'all' && (
                    <span className="ml-1 opacity-60">
                      {requests.filter(r => r.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-slate-100" />
            {/* Priority filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">Priority</span>
              {(['all', 'Critical', 'High', 'Medium', 'Low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p as SupportPriority | 'all')}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11px] font-bold transition-all',
                    filterPriority === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Request list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 text-center">
              <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">No requests match the current filters</p>
              <p className="text-xs text-slate-300 mt-1">Try changing status or priority filters above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => {
                const sm = STATUS_META[req.status];
                const pm = PRIORITY_META[req.priority];
                const CatIcon = catMeta(req.category).icon;
                const isSelected = selected?.id === req.id;

                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelected(isSelected ? null : req)}
                    className={cn(
                      'bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all space-y-3',
                      isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-indigo-50'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    )}
                  >
                    {/* Row 1: icon + subject + status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-sm font-black text-slate-900 truncate">{req.subject}</p>
                      </div>
                      <span className={cn(
                        'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide',
                        sm.bg, sm.color
                      )}>
                        <sm.icon className="w-3 h-3" />
                        {sm.label}
                      </span>
                    </div>

                    {/* Row 2: description preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{req.description}</p>

                    {/* Row 3: chips + date */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border', pm.bg, pm.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', pm.dot)} />
                        {req.priority}
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100">
                        <Tag className="w-2.5 h-2.5" />
                        {req.category}
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                        <User className="w-2.5 h-2.5" />
                        {req.advisorName}
                      </span>
                      {req.adminName && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {req.adminName}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <CalendarDays className="w-3 h-3" />
                        {formatTs(req.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════════════════════ RIGHT PANEL — Detail + Chat ════════════════ */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="flex flex-col gap-4 min-w-0"
            >
              {/* Detail card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {React.createElement(catMeta(selected.category).icon, {
                      className: 'w-4 h-4 text-indigo-500 shrink-0',
                    })}
                    <h2 className="text-sm font-black text-slate-900 leading-tight">{selected.subject}</h2>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed border-l-4 border-indigo-100 pl-3">
                  {selected.description}
                </p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Status',   value: STATUS_META[selected.status].label,  icon: STATUS_META[selected.status].icon, color: STATUS_META[selected.status].color },
                    { label: 'Priority', value: selected.priority,                    icon: Zap,                                color: PRIORITY_META[selected.priority].color },
                    { label: 'Category', value: selected.category,                    icon: Tag,                                color: 'text-slate-600' },
                    { label: 'Advisor',  value: selected.advisorName,                 icon: User,                               color: 'text-indigo-600' },
                    { label: 'Opened',   value: formatTs(selected.createdAt),         icon: CalendarDays,                       color: 'text-slate-500' },
                    { label: 'Assigned', value: selected.adminName || 'Unassigned',   icon: ShieldCheck,                        color: selected.adminName ? 'text-emerald-600' : 'text-slate-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-50 rounded-xl p-2.5 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{m.label}</p>
                      <div className={cn('flex items-center gap-1.5 text-xs font-bold', m.color)}>
                        <m.icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* Accept — only if unassigned */}
                  {!selected.adminId && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAccept(selected)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 shadow-sm"
                    >
                      {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Accept & Assign to Me
                    </button>
                  )}

                  {/* Status change dropdown */}
                  <div className="relative">
                    <button
                      disabled={actionLoading}
                      onClick={() => setStatusDropOpen(o => !o)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2.5 border text-xs font-bold rounded-xl transition-all',
                        selected.adminId
                          ? 'flex-1 w-full justify-center border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {React.createElement(STATUS_META[selected.status].icon, { className: 'w-3.5 h-3.5' })}
                      {STATUS_META[selected.status].label}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <AnimatePresence>
                      {statusDropOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 p-1.5"
                        >
                          {STATUS_TRANSITIONS[selected.status].map(next => (
                            <button
                              key={next}
                              onClick={() => handleStatusChange(selected, next)}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left',
                                STATUS_META[next].color,
                                'hover:' + STATUS_META[next].bg
                              )}
                            >
                              {React.createElement(STATUS_META[next].icon, { className: 'w-3.5 h-3.5' })}
                              Mark {STATUS_META[next].label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Chat panel */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[320px] max-h-[480px]">
                {/* Chat header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-slate-700">
                    Chat with {selected.advisorName}
                  </span>
                  {selected.chatId && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  )}
                </div>

                {/* Messages or placeholder */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:18px_18px]">
                  {!selected.chatId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
                        <MessageSquare className="w-6 h-6 text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">No chat thread yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Accept the ticket to open a direct chat with the advisor.
                        </p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-slate-400 font-medium">No messages yet — say hello!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === currentUser?.uid;
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex flex-col group', isMe ? 'items-end' : 'items-start')}
                        >
                          <div className={cn(
                            'max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm',
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                          )}>
                            {safeText(msg.messageText)}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat input */}
                {selected.chatId && (
                  <form
                    onSubmit={handleSendMsg}
                    className="p-3 border-t border-slate-100 bg-white flex gap-2"
                  >
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Reply to advisor…"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || sendingMsg}
                      className={cn(
                        'p-2.5 rounded-xl transition-all',
                        chatInput.trim()
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
