import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert, CheckCircle, MessageSquare, Star, Save,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import {
  collectionGroup, collection, doc, query, orderBy, limit,
  onSnapshot, setDoc, Timestamp, serverTimestamp, DocumentReference,
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface ModerationResult {
  blocked: boolean;
  flagReason: 'crisis_keyword' | 'word_filter' | 'groq_moderation' | null;
  flagCategory: 'self_harm' | 'harassment' | 'spam' | null;
  resolvedBy: string | null;
  resolvedAt: unknown;
  status: 'auto_blocked' | 'pending_review' | 'resolved' | 'clean';
}

interface RawMessage {
  id: string;
  ref: DocumentReference;
  groupId: string;
  uid: string;
  timestamp: unknown;
  moderationResult: ModerationResult | null;
}

interface HydratedMessage extends RawMessage {
  nickname: string;
  groupName: string;
}

interface PeerGroup {
  id: string;
  name: string;
  memberCount: number;
  category: string;
  isActive: boolean;
}

interface FeedbackDoc {
  id: string;
  peerComment: string;
  peerRating: number;
  createdAt: Date;
}

interface ModerationSettings {
  selfHarmThreshold: number;
  harassmentThreshold: number;
  spamThreshold: number;
  lastUpdatedBy: string | null;
  lastUpdatedAt: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === 'object' && (raw as { seconds?: number }).seconds) {
    return new Date((raw as { seconds: number }).seconds * 1000);
  }
  return null;
}

function formatTimeAgo(raw: unknown): string {
  const date = toDate(raw);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function flagReasonLabel(
  flagReason: string | null,
  flagCategory: string | null,
): string {
  if (flagCategory === 'self_harm') return 'Self-harm keyword detected';
  if (flagCategory === 'harassment') return 'Harassment detected';
  if (flagCategory === 'spam') return 'Spam pattern detected';
  if (flagReason === 'word_filter') return 'Blocked word detected';
  if (flagReason === 'crisis_keyword') return 'Self-harm keyword detected';
  if (flagReason === 'groq_moderation') return 'AI moderation flag';
  return '—';
}

function actionTaken(status: string | undefined): string {
  if (status === 'auto_blocked') return 'Blocked pre-send';
  if (status === 'pending_review') return 'Escalated to advisor';
  if (status === 'resolved') return 'Cleared by advisor';
  return '—';
}

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatMonitoring() {
  const { currentUser } = useAuth();

  const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([]);
  const [userNicknames, setUserNicknames] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackDoc[]>([]);
  const [moderationSettings, setModerationSettings] = useState<ModerationSettings>({
    selfHarmThreshold: 0.9,
    harassmentThreshold: 0.75,
    spamThreshold: 0.4,
    lastUpdatedBy: null,
    lastUpdatedAt: null,
  });
  const [sliders, setSliders] = useState({
    selfHarmThreshold: 0.9,
    harassmentThreshold: 0.75,
    spamThreshold: 0.4,
  });

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [eventLogPage, setEventLogPage] = useState(1);

  // ── Firestore listeners ────────────────────────────────────────────────

  // Peer groups — supports both peerGroups and peer_groups collection names
  useEffect(() => {
    const merge = (snap: any, collectionId: string) => {
      setPeerGroups((prev) => {
        const map: Record<string, PeerGroup> = {};
        prev.forEach((g) => { map[g.id] = g; });
        snap.docs.forEach((d: any) => {
          const data = d.data();
          map[d.id] = {
            id: d.id,
            name: data.name ?? data.group_name ?? d.id,
            memberCount: data.memberCount ?? 0,
            category: data.category ?? data.group_category ?? '',
            isActive: data.isActive ?? data.is_active ?? true,
          };
        });
        return Object.values(map);
      });
    };

    const unsub1 = onSnapshot(
      collection(db, 'peerGroups'),
      (snap) => merge(snap, 'peerGroups'),
      (err) => console.error('peerGroups listener:', err),
    );
    const unsub2 = onSnapshot(
      collection(db, 'peer_groups'),
      (snap) => merge(snap, 'peer_groups'),
      (err) => console.error('peer_groups listener:', err),
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  // User nicknames — only nickname field, no uid exposed in UI
  useEffect(() => {
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = data.nickname ?? data.displayName ?? data.name ?? 'Unknown';
        });
        setUserNicknames(map);
      },
      (err) => console.error('users listener:', err),
    );
  }, []);

  // Messages — reads moderation metadata only, never displays message text
  useEffect(() => {
    const q = query(
      collectionGroup(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(500),
    );
    return onSnapshot(
      q,
      (snap) => {
        const msgs: RawMessage[] = snap.docs
          .filter((d) => {
            const parentCollId = d.ref.parent.parent?.parent?.id;
            return parentCollId === 'groupMessages' || parentCollId === 'peer_groups';
          })
          .map((d) => {
            const data = d.data();
            const mr = data.moderationResult ?? null;
            return {
              id: d.id,
              ref: d.ref,
              groupId: d.ref.parent.parent?.id ?? '',
              uid: data.uid ?? data.senderId ?? data.userId ?? '',
              timestamp: data.timestamp ?? data.createdAt ?? null,
              moderationResult: mr
                ? {
                    blocked: mr.blocked ?? false,
                    flagReason: mr.flagReason ?? null,
                    flagCategory: mr.flagCategory ?? null,
                    resolvedBy: mr.resolvedBy ?? null,
                    resolvedAt: mr.resolvedAt ?? null,
                    status: mr.status ?? 'clean',
                  }
                : null,
            };
          });
        setRawMessages(msgs);
        setLoadingMessages(false);
      },
      (err) => {
        console.error('messages listener:', err);
        setLoadingMessages(false);
      },
    );
  }, []);

  // Peer feedback (peer_comment only, no uid shown)
  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(db, 'feedback')),
      (snap) => {
        const items: FeedbackDoc[] = snap.docs
          .map((d) => {
            const data = d.data();
            const createdAt =
              toDate(data.createdAt ?? data.date) ?? new Date(0);
            return {
              id: d.id,
              peerComment: data.peer_comment ?? '',
              peerRating:
                typeof data.peer_rating === 'number'
                  ? data.peer_rating
                  : typeof data.rating === 'number'
                  ? data.rating
                  : 0,
              createdAt,
            };
          })
          .filter((f) => f.peerComment.trim() !== '')
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 20);
        setFeedback(items);
      },
      (err) => console.error('feedback listener:', err),
    );
  }, []);

  // Moderation settings (systemConfig/moderationSettings)
  useEffect(() => {
    return onSnapshot(
      doc(db, 'systemConfig', 'moderationSettings'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const settings: ModerationSettings = {
          selfHarmThreshold: data.selfHarmThreshold ?? 0.9,
          harassmentThreshold: data.harassmentThreshold ?? 0.75,
          spamThreshold: data.spamThreshold ?? 0.4,
          lastUpdatedBy: data.lastUpdatedBy ?? null,
          lastUpdatedAt: data.lastUpdatedAt ?? null,
        };
        setModerationSettings(settings);
        setSliders({
          selfHarmThreshold: settings.selfHarmThreshold,
          harassmentThreshold: settings.harassmentThreshold,
          spamThreshold: settings.spamThreshold,
        });
      },
      (err) => console.error('moderationSettings listener:', err),
    );
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────

  const groupMap = useMemo(() => {
    const map: Record<string, PeerGroup> = {};
    peerGroups.forEach((g) => { map[g.id] = g; });
    return map;
  }, [peerGroups]);

  const messages: HydratedMessage[] = useMemo(
    () =>
      rawMessages.map((m) => ({
        ...m,
        nickname: userNicknames[m.uid] ?? 'Unknown',
        groupName: groupMap[m.groupId]?.name ?? m.groupId,
      })),
    [rawMessages, userNicknames, groupMap],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const weekAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d;
  }, [today]);

  function countByDate(
    msgs: HydratedMessage[],
    from: Date,
    to?: Date,
    predicate?: (m: HydratedMessage) => boolean,
  ): number {
    return msgs.filter((m) => {
      if (predicate && !predicate(m)) return false;
      const d = toDate(m.timestamp);
      if (!d) return false;
      if (d < from) return false;
      if (to && d >= to) return false;
      return true;
    }).length;
  }

  const messagesToday = useMemo(
    () => countByDate(messages, today),
    [messages, today],
  );
  const messagesYesterday = useMemo(
    () => countByDate(messages, yesterday, today),
    [messages, today, yesterday],
  );

  const autoBlockedToday = useMemo(
    () => countByDate(messages, today, undefined, (m) => !!m.moderationResult?.blocked),
    [messages, today],
  );
  const autoBlockedYesterday = useMemo(
    () => countByDate(messages, yesterday, today, (m) => !!m.moderationResult?.blocked),
    [messages, today, yesterday],
  );

  const crisisToday = useMemo(
    () => countByDate(messages, today, undefined, (m) => m.moderationResult?.flagReason === 'crisis_keyword'),
    [messages, today],
  );
  const crisisYesterday = useMemo(
    () => countByDate(messages, yesterday, today, (m) => m.moderationResult?.flagReason === 'crisis_keyword'),
    [messages, today, yesterday],
  );

  const pendingReview = useMemo(
    () => messages.filter((m) => m.moderationResult?.status === 'pending_review').length,
    [messages],
  );
  const pendingReviewYesterday = useMemo(
    () => countByDate(messages, yesterday, today, (m) => m.moderationResult?.status === 'pending_review'),
    [messages, today, yesterday],
  );

  const resolvedToday = useMemo(
    () =>
      messages.filter((m) => {
        if (m.moderationResult?.status !== 'resolved') return false;
        const d = toDate(m.moderationResult.resolvedAt);
        return d !== null && d >= today;
      }).length,
    [messages, today],
  );
  const resolvedYesterday = useMemo(
    () =>
      messages.filter((m) => {
        if (m.moderationResult?.status !== 'resolved') return false;
        const d = toDate(m.moderationResult.resolvedAt);
        return d !== null && d >= yesterday && d < today;
      }).length,
    [messages, today, yesterday],
  );

  const resolutionRate = useMemo(() => {
    const total = resolvedToday + pendingReview;
    return total === 0 ? 0 : Math.round((resolvedToday / total) * 100);
  }, [resolvedToday, pendingReview]);

  const resolutionRateYesterday = useMemo(() => {
    const total = resolvedYesterday + pendingReviewYesterday;
    return total === 0 ? 0 : Math.round((resolvedYesterday / total) * 100);
  }, [resolvedYesterday, pendingReviewYesterday]);

  // Per-group health (sorted by flag rate desc)
  const groupHealth = useMemo(() => {
    return peerGroups
      .filter((g) => g.isActive)
      .map((g) => {
        const groupMsgs = messages.filter((m) => m.groupId === g.id);
        const weekMsgs = groupMsgs.filter((m) => {
          const d = toDate(m.timestamp);
          return d !== null && d >= weekAgo;
        });
        const flagged = weekMsgs.filter(
          (m) => m.moderationResult?.flagReason !== null && m.moderationResult?.status !== 'clean',
        ).length;
        const flagRate = weekMsgs.length > 0 ? (flagged / weekMsgs.length) * 100 : 0;
        const crisisCount = weekMsgs.filter(
          (m) => m.moderationResult?.flagReason === 'crisis_keyword',
        ).length;
        const lastMsg = groupMsgs
          .filter((m) => m.timestamp)
          .sort((a, b) => {
            const aTime = toDate(a.timestamp)?.getTime() ?? 0;
            const bTime = toDate(b.timestamp)?.getTime() ?? 0;
            return bTime - aTime;
          })[0];
        return {
          id: g.id,
          name: g.name,
          category: g.category,
          memberCount: g.memberCount,
          weekMsgCount: weekMsgs.length,
          flagRate,
          crisisCount,
          lastActivity: lastMsg?.timestamp ?? null,
        };
      })
      .sort((a, b) => b.flagRate - a.flagRate);
  }, [peerGroups, messages, weekAgo]);

  // Event log — only flagged messages, never 'clean'
  const flaggedMessages = useMemo(
    () =>
      messages.filter(
        (m) => m.moderationResult !== null && m.moderationResult.flagReason !== null,
      ),
    [messages],
  );

  const filteredEvents = useMemo(() => {
    return flaggedMessages.filter((m) => {
      if (filterGroup && m.groupId !== filterGroup) return false;
      if (filterStatus && m.moderationResult?.status !== filterStatus) return false;
      if (filterDateFrom) {
        const d = toDate(m.timestamp);
        if (!d || d < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const d = toDate(m.timestamp);
        const ceiling = new Date(filterDateTo);
        ceiling.setHours(23, 59, 59, 999);
        if (!d || d > ceiling) return false;
      }
      return true;
    });
  }, [flaggedMessages, filterGroup, filterStatus, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const pagedEvents = filteredEvents.slice(
    (eventLogPage - 1) * PAGE_SIZE,
    eventLogPage * PAGE_SIZE,
  );

  // Feedback — star rating distribution
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    feedback.forEach((f) => {
      const r = Math.round(f.peerRating);
      if (r >= 1 && r <= 5) counts[r - 1]++;
    });
    return [1, 2, 3, 4, 5].map((star) => ({
      star: `${star}★`,
      count: counts[star - 1],
    }));
  }, [feedback]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSaveSettings = useCallback(async () => {
    if (!currentUser) return;
    setSavingSettings(true);
    try {
      await setDoc(
        doc(db, 'systemConfig', 'moderationSettings'),
        {
          selfHarmThreshold: sliders.selfHarmThreshold,
          harassmentThreshold: sliders.harassmentThreshold,
          spamThreshold: sliders.spamThreshold,
          lastUpdatedBy: currentUser.uid,
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save moderation settings:', err);
    } finally {
      setSavingSettings(false);
    }
  }, [currentUser, sliders]);

  // ── UI helpers ─────────────────────────────────────────────────────────

  function TrendBadge({ current, prev }: { current: number; prev: number }) {
    if (current === prev) return null;
    const up = current > prev;
    return up
      ? <TrendingUp className="w-3 h-3 text-rose-400 inline ml-1.5 shrink-0" />
      : <TrendingDown className="w-3 h-3 text-emerald-500 inline ml-1.5 shrink-0" />;
  }

  function StatusChip({ status }: { status: string | undefined }) {
    if (status === 'auto_blocked')
      return (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600">
          Auto-Blocked
        </span>
      );
    if (status === 'pending_review')
      return (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600">
          Pending Review
        </span>
      );
    if (status === 'resolved')
      return (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600">
          Resolved
        </span>
      );
    return null;
  }

  const lastSavedDate = toDate(moderationSettings.lastUpdatedAt);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
          Chat Monitoring
        </h2>
        <p className="text-slate-500 mt-1">
          Aggregate moderation analytics for peer groups — no message content is displayed.
        </p>
      </div>

      {/* Success toast */}
      {settingsSaved && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" />
          Moderation settings updated
        </div>
      )}

      {/* ─── Section 1: Stat Cards ─────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Moderation Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Messages Today */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Messages Today
            </p>
            <p className="text-3xl font-bold text-slate-900 flex items-center">
              {messagesToday}
              <TrendBadge current={messagesToday} prev={messagesYesterday} />
            </p>
            <p className="text-xs text-slate-400 mt-1.5">{messagesYesterday} yesterday</p>
          </div>

          {/* Auto-Blocked Today */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Auto-Blocked Today
            </p>
            <p className="text-3xl font-bold text-rose-600 flex items-center">
              {autoBlockedToday}
              <TrendBadge current={autoBlockedToday} prev={autoBlockedYesterday} />
            </p>
            <p className="text-xs text-slate-400 mt-1.5">{autoBlockedYesterday} yesterday</p>
          </div>

          {/* Crisis Triggers Today — red background if > 0 */}
          <div
            className={cn(
              'rounded-2xl border shadow-sm p-5',
              crisisToday > 0
                ? 'bg-rose-600 border-rose-600'
                : 'bg-white border-slate-200',
            )}
          >
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider mb-2',
                crisisToday > 0 ? 'text-rose-100' : 'text-slate-400',
              )}
            >
              Crisis Triggers Today
            </p>
            <p
              className={cn(
                'text-3xl font-bold',
                crisisToday > 0 ? 'text-white' : 'text-slate-900',
              )}
            >
              {crisisToday}
            </p>
            <p
              className={cn(
                'text-xs mt-1.5',
                crisisToday > 0 ? 'text-rose-200' : 'text-slate-400',
              )}
            >
              {crisisYesterday} yesterday
            </p>
          </div>

          {/* Pending Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pending Review
            </p>
            <p className="text-3xl font-bold text-amber-600 flex items-center">
              {pendingReview}
              <TrendBadge current={pendingReview} prev={pendingReviewYesterday} />
            </p>
            <p className="text-xs text-slate-400 mt-1.5">across all groups</p>
          </div>

          {/* Resolved Today */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Resolved Today
            </p>
            <p className="text-3xl font-bold text-emerald-600 flex items-center">
              {resolvedToday}
              <TrendBadge current={resolvedToday} prev={resolvedYesterday} />
            </p>
            <p className="text-xs text-slate-400 mt-1.5">{resolvedYesterday} yesterday</p>
          </div>

          {/* Resolution Rate */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Resolution Rate
            </p>
            <p className="text-3xl font-bold text-indigo-600 flex items-center">
              {resolutionRate}%
              <TrendBadge current={resolutionRate} prev={resolutionRateYesterday} />
            </p>
            <p className="text-xs text-slate-400 mt-1.5">{resolutionRateYesterday}% yesterday</p>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Per-Group Chat Health ─────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Per-Group Chat Health
        </h3>
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Group',
                  'Members',
                  'Messages This Week',
                  'Flag Rate',
                  'Crisis Triggers',
                  'Last Activity',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupHealth.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    No active peer groups found.
                  </td>
                </tr>
              ) : (
                groupHealth.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 text-sm">{g.name}</span>
                      {g.category && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-600">
                          {g.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{g.memberCount}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{g.weekMsgCount}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      <span
                        className={cn(
                          g.flagRate > 10
                            ? 'text-rose-600'
                            : g.flagRate > 5
                            ? 'text-amber-600'
                            : 'text-emerald-600',
                        )}
                      >
                        {g.flagRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      <span className={g.crisisCount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {g.crisisCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatTimeAgo(g.lastActivity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Section 3: Moderation Event Log ──────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Moderation Event Log
        </h3>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Filter:</span>
          </div>
          <select
            value={filterGroup}
            onChange={(e) => {
              setFilterGroup(e.target.value);
              setEventLogPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Groups</option>
            {peerGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setEventLogPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="auto_blocked">Auto-Blocked</option>
            <option value="pending_review">Pending Review</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setEventLogPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setEventLogPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loadingMessages ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['User', 'Group', 'Flag Reason', 'Status', 'Time', 'Action Taken'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 text-sm"
                      >
                        No moderation events match the current filters.
                      </td>
                    </tr>
                  ) : (
                    pagedEvents.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                          {m.nickname}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{m.groupName}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {flagReasonLabel(
                            m.moderationResult?.flagReason ?? null,
                            m.moderationResult?.flagCategory ?? null,
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusChip status={m.moderationResult?.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatTimeAgo(m.timestamp)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {actionTaken(m.moderationResult?.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Showing{' '}
                  {(eventLogPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(eventLogPage * PAGE_SIZE, filteredEvents.length)} of{' '}
                  {filteredEvents.length} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEventLogPage((p) => Math.max(1, p - 1))}
                    disabled={eventLogPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-600 font-medium">
                    Page {eventLogPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setEventLogPage((p) => Math.min(totalPages, p + 1))}
                    disabled={eventLogPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Section 4: User Feedback on Chat Experience ───────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          User Feedback on Chat Experience
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating distribution bar chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Peer Rating Distribution
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={ratingDistribution}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="star" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ratingDistribution.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={idx < 2 ? '#f87171' : idx === 2 ? '#fbbf24' : '#34d399'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent peer comments — text is user-submitted feedback, not chat content */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Recent Peer Comments
            </h4>
            <div className="overflow-y-auto flex-1 space-y-3 max-h-64 pr-1">
              {feedback.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  No peer comments submitted yet.
                </p>
              ) : (
                feedback.map((f) => (
                  <div
                    key={f.id}
                    className="border border-slate-100 rounded-xl p-4 bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < Math.round(f.peerRating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200 fill-slate-200',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {f.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.peerComment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 5: AI Sensitivity Settings ───────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          AI Sensitivity Settings
        </h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Self-Harm */}
            <div>
              <label className="text-xs font-bold text-slate-500 flex items-center justify-between mb-2">
                <span>Self-Harm Detection</span>
                <span className="text-indigo-600 text-sm">
                  {Math.round(sliders.selfHarmThreshold * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sliders.selfHarmThreshold}
                onChange={(e) =>
                  setSliders((s) => ({
                    ...s,
                    selfHarmThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Permissive</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Harassment */}
            <div>
              <label className="text-xs font-bold text-slate-500 flex items-center justify-between mb-2">
                <span>Harassment Detection</span>
                <span className="text-indigo-600 text-sm">
                  {Math.round(sliders.harassmentThreshold * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sliders.harassmentThreshold}
                onChange={(e) =>
                  setSliders((s) => ({
                    ...s,
                    harassmentThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Permissive</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Spam */}
            <div>
              <label className="text-xs font-bold text-slate-500 flex items-center justify-between mb-2">
                <span>Spam Detection</span>
                <span className="text-indigo-600 text-sm">
                  {Math.round(sliders.spamThreshold * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sliders.spamThreshold}
                onChange={(e) =>
                  setSliders((s) => ({
                    ...s,
                    spamThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Permissive</span>
                <span>Strict</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {lastSavedDate
                ? `Last saved ${lastSavedDate.toLocaleString()}`
                : 'Settings have not been saved yet'}
            </p>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || !currentUser}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              {savingSettings ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
