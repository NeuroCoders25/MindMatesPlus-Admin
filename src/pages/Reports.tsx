import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Calendar, Users, Activity, BookOpen, Brain } from 'lucide-react';
import { collection, collectionGroup, onSnapshot, Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import ChartWidget from '../components/ChartWidget';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STAT_COLORS: Record<string, { bg: string; icon: string }> = {
  indigo:  { bg: 'bg-indigo-100',  icon: 'text-indigo-600'  },
  purple:  { bg: 'bg-purple-100',  icon: 'text-purple-600'  },
  amber:   { bg: 'bg-amber-100',   icon: 'text-amber-600'   },
  emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
};

function toDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === 'object' && (raw as { seconds?: number }).seconds) {
    return new Date((raw as { seconds: number }).seconds * 1000);
  }
  return undefined;
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(rows: Record<string, unknown>[], title: string, filename: string) {
  if (rows.length === 0) return;
  const doc = new jsPDF();
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`MindMates+ Admin · Generated ${generated}`, 14, 26);
  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: rows.map(r => headers.map(h => String(r[h] ?? ''))),
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });
  doc.save(filename);
}

interface UserDoc       { id: string; name?: string; email?: string; createdAt?: Date }
interface JournalDoc    { id: string; userId: string; title: string; moodTag: string; date: Date }
interface MentalDoc     { userId: string; category: string; mainCondition: string; totalScore: number; completedAt?: Date }
interface PeerGroupDoc  { docId: string; group_id: string; group_name: string; group_category: string; group_moderator: string; created_at?: Date }

type DateRangeKey = '7' | '30' | '90' | 'all';
type MetricKey    = 'user_growth' | 'journal_activity' | 'emotional_distribution' | 'mental_health_risk' | 'peer_groups';
type FormatKey    = 'csv' | 'pdf';

const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  '7': 'Last 7 Days', '30': 'Last 30 Days', '90': 'Last 90 Days', 'all': 'All Time',
};

function getCutoff(range: DateRangeKey): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(range));
  return d;
}

export default function Reports() {
  const [headerRange, setHeaderRange] = useState<DateRangeKey>('30');
  const [metricType, setMetricType]   = useState<MetricKey>('user_growth');
  const [genRange, setGenRange]       = useState<DateRangeKey>('30');
  const [genFormat, setGenFormat]     = useState<FormatKey>('csv');
  const [generating, setGenerating]   = useState(false);

  const [users,              setUsers]              = useState<UserDoc[]>([]);
  const [journalEntries,     setJournalEntries]     = useState<JournalDoc[]>([]);
  const [mentalHealthProfiles, setMentalHealthProfiles] = useState<MentalDoc[]>([]);
  const [peerGroups,         setPeerGroups]         = useState<PeerGroupDoc[]>([]);
  const [groupMemberCounts,  setGroupMemberCounts]  = useState<Record<string, number>>({});

  useEffect(() => onSnapshot(
    collection(db, 'users'),
    snap => setUsers(snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, name: data.nickname || data.displayName || data.name, email: data.email, createdAt: toDate(data.createdAt ?? data.created_at) };
    })),
    err => console.error('Users listener:', err)
  ), []);

  useEffect(() => onSnapshot(
    collectionGroup(db, 'journal_entries'),
    snap => setJournalEntries(snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, userId: d.ref.parent.parent?.id ?? '', title: data.title ?? '', moodTag: data.mood_tag ?? '', date: toDate(data.date) ?? new Date() };
    })),
    err => console.error('Journal listener:', err)
  ), []);

  useEffect(() => onSnapshot(
    collectionGroup(db, 'mentalHealthProfile'),
    snap => setMentalHealthProfiles(snap.docs.map(d => {
      const data = d.data();
      const score = data.initialQuestionnaireScore as Record<string, unknown> | undefined;
      return {
        userId: d.ref.parent.parent?.id ?? '',
        category: (data.activeRecommendationCategory as string) || (score?.category as string) || 'Unknown',
        mainCondition: (score?.mainCondition as string) || '',
        totalScore: (score?.totalScore as number) || 0,
        completedAt: toDate(score?.completedAt),
      };
    }).filter(p => p.userId)),
    err => console.error('Mental health listener:', err)
  ), []);

  useEffect(() => onSnapshot(
    collection(db, 'peer_groups'),
    snap => setPeerGroups(snap.docs.map(d => {
      const data = d.data();
      return { docId: d.id, group_id: data.group_id ?? d.id, group_name: data.group_name ?? 'Unnamed', group_category: data.group_category ?? '', group_moderator: data.group_moderator ?? '', created_at: toDate(data.created_at) };
    })),
    err => console.error('Peer groups listener:', err)
  ), []);

  useEffect(() => onSnapshot(
    collection(db, 'groupMembers'),
    snap => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const gid = d.data().group_id ?? d.data().groupId ?? d.data().peer_group_id;
        if (gid) counts[gid] = (counts[gid] ?? 0) + 1;
      });
      setGroupMemberCounts(counts);
    },
    err => console.error('Group members listener:', err)
  ), []);

  // --- Chart data derivations ---

  const userGrowthData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], count: 0 };
    });
    const bucketKeySet = new Set(buckets.map(b => b.key));
    users.forEach(u => {
      if (!u.createdAt) return;
      const key = `${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`;
      const b = buckets.find(b => b.key === key);
      if (b) b.count++;
    });
    let cumulative = users.filter(u => !u.createdAt || !bucketKeySet.has(`${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`)).length;
    return buckets.map(b => { cumulative += b.count; return { name: b.label, value: cumulative }; });
  }, [users]);

  const journalActivityData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: MONTHS[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), count: 0 };
    });
    journalEntries.forEach(e => {
      const b = buckets.find(b => b.month === e.date.getMonth() && b.year === e.date.getFullYear());
      if (b) b.count++;
    });
    return buckets.map(b => ({ name: b.label, value: b.count }));
  }, [journalEntries]);

  const emotionalData = useMemo(() => {
    const cutoff = getCutoff(headerRange);
    const filtered = cutoff ? journalEntries.filter(e => e.date >= cutoff) : journalEntries;
    const total = filtered.length;
    if (total === 0) return [
      { name: 'Stable', value: 1, color: '#6366f1' },
      { name: 'Anxious', value: 1, color: '#f59e0b' },
      { name: 'Distressed', value: 1, color: '#f43f5e' },
      { name: 'Positive', value: 1, color: '#10b981' },
    ];
    let distressed = 0, anxious = 0, positive = 0;
    filtered.forEach(e => {
      const m = e.moodTag.toLowerCase();
      if (['distressed','crisis','depressed','sad'].some(k => m.includes(k))) distressed++;
      else if (['anxious','worried','stressed','overwhelmed'].some(k => m.includes(k))) anxious++;
      else if (['happy','positive','great','good','grateful','hopeful','calm'].some(k => m.includes(k))) positive++;
    });
    const stable = Math.max(0, total - distressed - anxious - positive);
    return [
      { name: 'Stable',     value: Math.round((stable     / total) * 100), color: '#6366f1' },
      { name: 'Anxious',    value: Math.round((anxious    / total) * 100), color: '#f59e0b' },
      { name: 'Distressed', value: Math.round((distressed / total) * 100), color: '#f43f5e' },
      { name: 'Positive',   value: Math.round((positive   / total) * 100), color: '#10b981' },
    ];
  }, [journalEntries, headerRange]);

  const riskData = useMemo(() => {
    const counts: Record<string, number> = {};
    mentalHealthProfiles.forEach(p => {
      const cat = p.category || 'Unknown';
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + '…' : name, value }));
  }, [mentalHealthProfiles]);

  // --- CSV export helpers ---

  function exportUserReport(range: DateRangeKey = 'all') {
    const cutoff = getCutoff(range);
    const rows = (cutoff ? users.filter(u => u.createdAt && u.createdAt >= cutoff) : users).map(u => ({
      'User ID':      u.id,
      'Display Name': u.name  || 'N/A',
      'Email':        u.email || 'N/A',
      'Joined Date':  u.createdAt ? u.createdAt.toLocaleDateString() : 'N/A',
      'Joined Month': u.createdAt ? MONTHS[u.createdAt.getMonth()] : 'N/A',
      'Joined Year':  u.createdAt ? u.createdAt.getFullYear() : 'N/A',
    }));
    downloadCSV(rows, `user-growth-report-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function exportJournalReport(range: DateRangeKey = 'all') {
    const cutoff = getCutoff(range);
    const filtered = cutoff ? journalEntries.filter(e => e.date >= cutoff) : journalEntries;
    const monthCounts: Record<string, number> = {};
    filtered.forEach(e => {
      const key = `${MONTHS[e.date.getMonth()]} ${e.date.getFullYear()}`;
      monthCounts[key] = (monthCounts[key] ?? 0) + 1;
    });
    downloadCSV(
      Object.entries(monthCounts).map(([month, count]) => ({ 'Month': month, 'Journal Entries': count })),
      `journal-activity-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  function exportEmotionalReport(range: DateRangeKey = 'all') {
    const cutoff = getCutoff(range);
    const filtered = cutoff ? journalEntries.filter(e => e.date >= cutoff) : journalEntries;
    const moodCounts: Record<string, number> = {};
    filtered.forEach(e => { const m = e.moodTag || 'Unknown'; moodCounts[m] = (moodCounts[m] ?? 0) + 1; });
    const total = filtered.length || 1;
    downloadCSV(
      Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => ({
        'Mood Tag': mood, 'Count': count, 'Percentage': `${Math.round((count / total) * 100)}%`,
      })),
      `emotional-distribution-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  function exportMentalHealthReport(range: DateRangeKey = 'all') {
    const cutoff = getCutoff(range);
    const filtered = cutoff
      ? mentalHealthProfiles.filter(p => p.completedAt && p.completedAt >= cutoff)
      : mentalHealthProfiles;
    downloadCSV(
      filtered.map((p, i) => ({
        'Record #':      i + 1,
        'Risk Category': p.category,
        'Main Condition': p.mainCondition || 'N/A',
        'Total Score':   p.totalScore || 'N/A',
        'Completed Date': p.completedAt ? p.completedAt.toLocaleDateString() : 'N/A',
      })),
      `mental-health-risk-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  function exportGroupsReport() {
    downloadCSV(
      peerGroups.map(g => ({
        'Group ID':     g.group_id,
        'Group Name':   g.group_name,
        'Category':     g.group_category,
        'Moderator':    g.group_moderator || 'N/A',
        'Member Count': groupMemberCounts[g.group_id] ?? 0,
        'Created Date': g.created_at ? g.created_at.toLocaleDateString() : 'N/A',
      })),
      `peer-groups-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  function exportAll() {
    exportUserReport('all');
    setTimeout(() => exportJournalReport('all'),      350);
    setTimeout(() => exportEmotionalReport('all'),    700);
    setTimeout(() => exportMentalHealthReport('all'), 1050);
    setTimeout(() => exportGroupsReport(),            1400);
  }

  function generateCustomReport() {
    setGenerating(true);
    const cutoff = getCutoff(genRange);
    const stamp  = new Date().toISOString().slice(0, 10);

    type ReportData = { rows: Record<string, unknown>[]; title: string; filename: string };

    const getData = (): ReportData => {
      switch (metricType) {
        case 'user_growth': {
          const filtered = cutoff ? users.filter(u => u.createdAt && u.createdAt >= cutoff) : users;
          return {
            title: 'User Growth Report',
            filename: `user-growth-report-${stamp}`,
            rows: filtered.map(u => ({
              'User ID':      u.id,
              'Display Name': u.name  || 'N/A',
              'Email':        u.email || 'N/A',
              'Joined Date':  u.createdAt ? u.createdAt.toLocaleDateString() : 'N/A',
              'Joined Month': u.createdAt ? MONTHS[u.createdAt.getMonth()] : 'N/A',
              'Joined Year':  u.createdAt ? u.createdAt.getFullYear() : 'N/A',
            })),
          };
        }
        case 'journal_activity': {
          const filtered = cutoff ? journalEntries.filter(e => e.date >= cutoff) : journalEntries;
          const monthCounts: Record<string, number> = {};
          filtered.forEach(e => {
            const key = `${MONTHS[e.date.getMonth()]} ${e.date.getFullYear()}`;
            monthCounts[key] = (monthCounts[key] ?? 0) + 1;
          });
          return {
            title: 'Journal Activity Report',
            filename: `journal-activity-report-${stamp}`,
            rows: Object.entries(monthCounts).map(([month, count]) => ({ 'Month': month, 'Journal Entries': count })),
          };
        }
        case 'emotional_distribution': {
          const filtered = cutoff ? journalEntries.filter(e => e.date >= cutoff) : journalEntries;
          const moodCounts: Record<string, number> = {};
          filtered.forEach(e => { const m = e.moodTag || 'Unknown'; moodCounts[m] = (moodCounts[m] ?? 0) + 1; });
          const total = filtered.length || 1;
          return {
            title: 'Emotional Distribution Report',
            filename: `emotional-distribution-report-${stamp}`,
            rows: Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => ({
              'Mood Tag': mood, 'Count': count, 'Percentage': `${Math.round((count / total) * 100)}%`,
            })),
          };
        }
        case 'mental_health_risk': {
          const filtered = cutoff
            ? mentalHealthProfiles.filter(p => p.completedAt && p.completedAt >= cutoff)
            : mentalHealthProfiles;
          return {
            title: 'Mental Health Risk Report',
            filename: `mental-health-risk-report-${stamp}`,
            rows: filtered.map((p, i) => ({
              'Record #':       i + 1,
              'Risk Category':  p.category,
              'Main Condition': p.mainCondition || 'N/A',
              'Total Score':    p.totalScore    || 'N/A',
              'Completed Date': p.completedAt   ? p.completedAt.toLocaleDateString() : 'N/A',
            })),
          };
        }
        default: {
          return {
            title: 'Peer Groups Report',
            filename: `peer-groups-report-${stamp}`,
            rows: peerGroups.map(g => ({
              'Group ID':     g.group_id,
              'Group Name':   g.group_name,
              'Category':     g.group_category,
              'Moderator':    g.group_moderator || 'N/A',
              'Member Count': groupMemberCounts[g.group_id] ?? 0,
              'Created Date': g.created_at ? g.created_at.toLocaleDateString() : 'N/A',
            })),
          };
        }
      }
    };

    const { rows, title, filename } = getData();
    if (genFormat === 'pdf') {
      downloadPDF(rows, title, `${filename}.pdf`);
    } else {
      downloadCSV(rows, `${filename}.csv`);
    }
    setTimeout(() => setGenerating(false), 500);
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const summaryStats = [
    { label: 'Total Users',    value: users.length,               Icon: Users,    color: 'indigo'  },
    { label: 'Journal Entries', value: journalEntries.length,     Icon: BookOpen, color: 'purple'  },
    { label: 'Risk Profiles',   value: mentalHealthProfiles.length, Icon: Brain,  color: 'amber'   },
    { label: 'Peer Groups',     value: peerGroups.length,         Icon: Activity, color: 'emerald' },
  ];

  const availableReports = [
    { name: 'User Growth Report',           date: today, desc: 'All registered users with join dates',               onDownload: () => exportUserReport('all')        },
    { name: 'Emotional Distribution Report', date: today, desc: 'Mood tag breakdown from journal entries',           onDownload: () => exportEmotionalReport('all')   },
    { name: 'Mental Health Risk Report',    date: today, desc: 'Risk category distribution (anonymized)',             onDownload: () => exportMentalHealthReport('all') },
    { name: 'Journal Activity Report',      date: today, desc: 'Monthly journal submission counts',                  onDownload: () => exportJournalReport('all')     },
    { name: 'Peer Groups Report',           date: today, desc: 'Group listing with member counts',                   onDownload: () => exportGroupsReport()           },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500">Real-time data snapshots and downloadable CSV reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={headerRange}
              onChange={e => setHeaderRange(e.target.value as DateRangeKey)}
              className="bg-transparent text-sm text-slate-600 focus:outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button
            onClick={exportAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map(({ label, value, Icon, color }) => {
          const { bg, icon } = STAT_COLORS[color];
          return (
            <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg} ${icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartWidget
          title="User Growth"
          subtitle="Cumulative registrations over the last 6 months"
          type="area"
          data={userGrowthData}
        />
        <ChartWidget
          title="Emotional Distribution"
          subtitle={`Mood categories from journal entries · ${DATE_RANGE_LABELS[headerRange]}`}
          type="pie"
          data={emotionalData}
          height={300}
        />
        <ChartWidget
          title="Journal Activity"
          subtitle="Monthly journal entries submitted (last 6 months)"
          type="bar"
          data={journalActivityData}
        />
        <ChartWidget
          title="Mental Health Risk Levels"
          subtitle="Users by assessed risk category"
          type="bar"
          data={riskData.length > 0 ? riskData : [{ name: '—', value: 0 }]}
        />
      </div>

      {/* Available Reports */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Available Reports</h3>
        <div className="space-y-3">
          {availableReports.map((report, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{report.name}</p>
                  <p className="text-xs text-slate-400">{report.date} · {report.desc}</p>
                </div>
              </div>
              <button
                onClick={report.onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Report Generator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Custom Report Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metric Type</label>
            <select
              value={metricType}
              onChange={e => setMetricType(e.target.value as MetricKey)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="user_growth">User Growth</option>
              <option value="journal_activity">Journal Activity</option>
              <option value="emotional_distribution">Emotional Distribution</option>
              <option value="mental_health_risk">Mental Health Risk</option>
              <option value="peer_groups">Peer Groups</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
            <select
              value={genRange}
              onChange={e => setGenRange(e.target.value as DateRangeKey)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</label>
            <select
              value={genFormat}
              onChange={e => setGenFormat(e.target.value as FormatKey)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="csv">CSV Spreadsheet</option>
              <option value="pdf">PDF Document</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateCustomReport}
              disabled={generating}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {generating ? 'Generating…' : `Download ${genFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Reports are generated from live Firestore data and downloaded as CSV or PDF files.
        </p>
      </div>
    </div>
  );
}
