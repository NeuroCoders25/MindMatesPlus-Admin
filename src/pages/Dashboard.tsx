import React, { useState, useEffect, useMemo } from 'react';
import { Users, UsersRound, MessageSquare, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import DashboardCard from '../components/DashboardCard';
import ChartWidget from '../components/ChartWidget';
import AlertPanel from '../components/AlertPanel';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === 'object' && (raw as { seconds?: number }).seconds) {
    return new Date((raw as { seconds: number }).seconds * 1000);
  }
  return undefined;
}

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  createdAt?: Date;
}

interface JournalDoc {
  id: string;
  userId: string;
  title: string;
  content: string;
  moodTag: string;
  date: Date;
}

interface MentalHealthDoc {
  userId: string;
  category: string;
  mainCondition: string;
  totalScore: number;
  completedAt?: Date;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [adminName, setAdminName] = useState('Admin');
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [peerGroupCount, setPeerGroupCount] = useState(0);
  const [messagesToday, setMessagesToday] = useState(0);
  const [journalEntries, setJournalEntries] = useState<JournalDoc[]>([]);
  const [mentalHealthProfiles, setMentalHealthProfiles] = useState<MentalHealthDoc[]>([]);

  // Admin display name
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'admins', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAdminName(d.name || currentUser.displayName || 'Admin');
      } else {
        setAdminName(currentUser.displayName || 'Admin');
      }
    });
    return unsub;
  }, [currentUser]);

  // All users — drives Total Users count, growth chart, and name lookups
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.nickname || data.displayName || data.name,
              email: data.email,
              createdAt: toDate(data.createdAt ?? data.created_at),
            };
          })
        );
      },
      (err) => console.error('Users listener error:', err)
    );
    return unsub;
  }, []);

  // Peer groups count
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'peer_groups'),
      (snap) => setPeerGroupCount(snap.size),
      (err) => console.error('Peer groups listener error:', err)
    );
    return unsub;
  }, []);

  // Messages sent today across all message subcollections
  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const q = query(
      collectionGroup(db, 'messages'),
      where('createdAt', '>=', Timestamp.fromDate(todayStart))
    );
    const unsub = onSnapshot(
      q,
      (snap) => setMessagesToday(snap.size),
      (err) => console.error('Messages listener error:', err)
    );
    return unsub;
  }, []);

  // Journal entries — drives distress count, emotional distribution, and alert panel
  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, 'journal_entries'),
      (snap) => {
        setJournalEntries(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: d.ref.parent.parent?.id ?? '',
              title: data.title ?? '',
              content: data.content ?? '',
              moodTag: data.mood_tag ?? '',
              date: toDate(data.date) ?? new Date(),
            };
          })
        );
      },
      (err) => console.error('Journal entries listener error:', err)
    );
    return unsub;
  }, []);

  // Mental health profiles — drives distress count and alert panel
  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, 'mentalHealthProfile'),
      (snap) => {
        setMentalHealthProfiles(
          snap.docs
            .map((d) => {
              const userId = d.ref.parent.parent?.id ?? '';
              const data = d.data();
              const score = data.initialQuestionnaireScore as Record<string, unknown> | undefined;
              return {
                userId,
                category:
                  (data.activeRecommendationCategory as string | undefined) ||
                  (score?.category as string | undefined) ||
                  '',
                mainCondition: (score?.mainCondition as string | undefined) || '',
                totalScore: (score?.totalScore as number | undefined) || 0,
                completedAt: toDate(score?.completedAt),
              };
            })
            .filter((p) => p.userId && p.category)
        );
      },
      (err) => console.error('Mental health profiles listener error:', err)
    );
    return unsub;
  }, []);

  // uid → display name map (derived from users)
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.name || u.email || 'Unknown User';
    });
    return map;
  }, [users]);

  // User growth chart: cumulative counts over last 6 months
  const userGrowthData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], count: 0 });
    }
    const bucketKeys = new Set(buckets.map((b) => b.key));

    users.forEach((u) => {
      if (!u.createdAt) return;
      const key = `${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.count++;
    });

    // Seed cumulative base with users registered before the 6-month window
    let cumulative = users.filter((u) => {
      if (!u.createdAt) return true;
      return !bucketKeys.has(`${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`);
    }).length;

    return buckets.map((b) => {
      cumulative += b.count;
      return { name: b.label, value: cumulative };
    });
  }, [users]);

  // Month-over-month user growth trend
  const userTrend = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonth = users.filter((u) => u.createdAt && u.createdAt >= thisMonthStart).length;
    const lastMonth = users.filter(
      (u) => u.createdAt && u.createdAt >= lastMonthStart && u.createdAt < thisMonthStart
    ).length;

    if (lastMonth === 0) return { value: 0, isUp: true };
    const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    return { value: Math.abs(pct), isUp: pct >= 0 };
  }, [users]);

  // Emotional distribution aggregated from all journal mood tags
  const emotionalData = useMemo(() => {
    const total = journalEntries.length;
    if (total === 0) {
      return [
        { name: 'Stable', value: 45, color: '#6366f1' },
        { name: 'Anxious', value: 25, color: '#f59e0b' },
        { name: 'Distressed', value: 15, color: '#f43f5e' },
        { name: 'Positive', value: 15, color: '#10b981' },
      ];
    }

    let distressed = 0, anxious = 0, positive = 0;
    journalEntries.forEach((e) => {
      const mood = e.moodTag.toLowerCase();
      if (['distressed', 'crisis', 'depressed', 'sad'].some((m) => mood.includes(m))) distressed++;
      else if (['anxious', 'worried', 'stressed', 'overwhelmed'].some((m) => mood.includes(m))) anxious++;
      else if (['happy', 'positive', 'great', 'good', 'grateful', 'hopeful', 'calm'].some((m) => mood.includes(m))) positive++;
    });
    const stable = Math.max(0, total - distressed - anxious - positive);

    return [
      { name: 'Stable', value: Math.round((stable / total) * 100), color: '#6366f1' },
      { name: 'Anxious', value: Math.round((anxious / total) * 100), color: '#f59e0b' },
      { name: 'Distressed', value: Math.round((distressed / total) * 100), color: '#f43f5e' },
      { name: 'Positive', value: Math.round((positive / total) * 100), color: '#10b981' },
    ];
  }, [journalEntries]);

  // Distress alert count: unique users with distress journal entries or severe mental health profiles
  const distressAlertCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const alertUserIds = new Set<string>();

    journalEntries.forEach((e) => {
      const mood = e.moodTag.toLowerCase();
      if (
        ['distressed', 'crisis', 'depressed', 'overwhelmed'].some((m) => mood.includes(m)) &&
        e.date >= weekAgo
      ) {
        alertUserIds.add(e.userId);
      }
    });

    mentalHealthProfiles.forEach((p) => {
      const cat = p.category.toLowerCase();
      if (cat === 'extremely severe' || cat.includes('severe') || cat.includes('moderate')) {
        alertUserIds.add(p.userId);
      }
    });

    return alertUserIds.size;
  }, [journalEntries, mentalHealthProfiles]);

  // Recent alerts panel: most recent distress signals from journals + mental health profiles
  const recentAlerts = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    type SortableAlert = { id: string; type: 'critical' | 'warning'; user: string; message: string; time: string; _sort: number };

    const journalAlerts: SortableAlert[] = journalEntries
      .filter((e) => {
        const mood = e.moodTag.toLowerCase();
        return (
          ['distressed', 'crisis', 'depressed', 'overwhelmed', 'anxious'].some((m) => mood.includes(m)) &&
          e.date >= weekAgo
        );
      })
      .map((e) => {
        const mood = e.moodTag.toLowerCase();
        const isCritical = ['distressed', 'crisis', 'depressed'].some((m) => mood.includes(m));
        const preview = (e.title || e.content).slice(0, 60);
        return {
          id: e.id,
          type: isCritical ? ('critical' as const) : ('warning' as const),
          user: userNameMap[e.userId] || 'Unknown User',
          message: `${isCritical ? 'High distress' : 'Concern'} detected in journal entry: "${preview}${preview.length < (e.title || e.content).length ? '...' : ''}"`,
          time: formatTimeAgo(e.date),
          _sort: e.date.getTime(),
        };
      });

    const profileAlerts: SortableAlert[] = mentalHealthProfiles
      .filter((p) => {
        const cat = p.category.toLowerCase();
        return cat === 'extremely severe' || cat.includes('severe') || cat.includes('moderate');
      })
      .map((p) => {
        const cat = p.category.toLowerCase();
        const isCritical = cat === 'extremely severe' || cat.includes('severe');
        const condition = p.mainCondition ? ` — ${p.mainCondition}` : '';
        const scoreText = p.totalScore > 0 ? ` (score: ${p.totalScore})` : '';
        return {
          id: `mhp-${p.userId}`,
          type: isCritical ? ('critical' as const) : ('warning' as const),
          user: userNameMap[p.userId] || 'Unknown User',
          message: `${p.category} mental health assessment${condition}${scoreText}`,
          time: p.completedAt ? formatTimeAgo(p.completedAt) : 'Recently',
          _sort: p.completedAt?.getTime() ?? 0,
        };
      });

    return [...journalAlerts, ...profileAlerts]
      .sort((a, b) => b._sort - a._sort)
      .slice(0, 5)
      .map(({ _sort, ...alert }) => alert);
  }, [journalEntries, mentalHealthProfiles, userNameMap]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Welcome back, {adminName}. Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Users"
          value={users.length.toLocaleString()}
          icon={Users}
          trend={userTrend}
          color="indigo"
        />
        <DashboardCard
          title="Active Peer Groups"
          value={peerGroupCount.toLocaleString()}
          icon={UsersRound}
          color="purple"
        />
        <DashboardCard
          title="Messages Today"
          value={messagesToday.toLocaleString()}
          icon={MessageSquare}
          color="emerald"
        />
        <DashboardCard
          title="Distress Alerts"
          value={distressAlertCount}
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ChartWidget
            title="User Growth"
            subtitle="Cumulative registrations over the last 6 months"
            type="area"
            data={userGrowthData.length > 0 ? userGrowthData : [{ name: '—', value: 0 }]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartWidget
              title="Emotional Distribution"
              subtitle="Aggregate mood tags from journal entries"
              type="pie"
              data={emotionalData}
              height={250}
            />
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Key Insights
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600">
                    {users.length > 0
                      ? `${users.length.toLocaleString()} total users registered on the platform.`
                      : 'Loading user data…'}
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600">
                    {peerGroupCount > 0
                      ? `${peerGroupCount} peer support group${peerGroupCount !== 1 ? 's' : ''} currently active.`
                      : 'Loading group data…'}
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600">
                    {distressAlertCount > 0
                      ? `${distressAlertCount} distress signal${distressAlertCount !== 1 ? 's' : ''} flagged in the last 7 days.`
                      : 'No distress signals flagged in the last 7 days.'}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <AlertPanel alerts={recentAlerts} />

          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold">Next Review Session</h3>
            </div>
            <p className="text-indigo-100 text-sm mb-4">
              You have a group moderation review scheduled for tomorrow at 10:00 AM.
            </p>
            <button className="w-full py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
              View Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
