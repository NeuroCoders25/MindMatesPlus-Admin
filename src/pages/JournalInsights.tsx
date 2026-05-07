import { useEffect, useState } from 'react';
import { TrendingUp, Brain, BookOpen, Smile, CalendarDays } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';
import DataTable from '../components/DataTable';
import { journalService, JournalEntry } from '../services/journalService';
import { cn } from '../lib/utils';

type ChartPoint = { name: string; value: number };

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOOD_COLORS: Record<string, string> = {
  happy: 'text-emerald-600 bg-emerald-50',
  sad: 'text-blue-600 bg-blue-50',
  angry: 'text-rose-600 bg-rose-50',
  anxious: 'text-amber-600 bg-amber-50',
  neutral: 'text-slate-600 bg-slate-100',
  excited: 'text-violet-600 bg-violet-50',
};

function getMoodStyle(mood: string) {
  return MOOD_COLORS[mood?.toLowerCase()] ?? 'text-slate-600 bg-slate-100';
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function JournalInsights() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = journalService.listenToJournals((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Weekly activity: last 7 days bucketed by calendar day
  const volumeData: ChartPoint[] = (() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      counts[DAY_LABELS[d.getDay()]] = 0;
    }
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    entries.forEach(e => {
      if (e.date >= cutoff) {
        const label = DAY_LABELS[e.date.getDay()];
        if (label in counts) counts[label]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Top moods from mood_tag
  const moodCounts: Record<string, number> = {};
  entries.forEach(e => {
    if (e.moodTag) moodCounts[e.moodTag] = (moodCounts[e.moodTag] ?? 0) + 1;
  });
  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = entries.filter(e => e.date >= todayStart).length;
  const totalEntries = entries.length;
  const uniqueMoods = Object.keys(moodCounts).length;

  const columns = [
    {
      header: 'Title',
      accessor: (e: JournalEntry) => (
        <p className="font-medium text-slate-800 max-w-[160px] truncate">{e.title || '—'}</p>
      ),
    },
    {
      header: 'Content',
      accessor: (e: JournalEntry) => (
        <p className="text-slate-500 max-w-xs truncate text-sm">"{e.content}"</p>
      ),
    },
    {
      header: 'Mood',
      accessor: (e: JournalEntry) => e.moodTag ? (
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full capitalize', getMoodStyle(e.moodTag))}>
          {e.moodTag}
        </span>
      ) : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      header: 'Date',
      accessor: (e: JournalEntry) => (
        <span className="text-slate-400 text-sm">{formatRelativeTime(e.date)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Journal Insights</h2>
        <p className="text-slate-500">Aggregate analysis of user journaling patterns and emotional trends.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <BookOpen className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-900">{loading ? '—' : totalEntries}</p>
          <p className="text-sm text-slate-500 mt-1">Total Entries</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <CalendarDays className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-900">{loading ? '—' : todayCount}</p>
          <p className="text-sm text-slate-500 mt-1">Entries Today</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Smile className="w-7 h-7 text-violet-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-900">{loading ? '—' : uniqueMoods}</p>
          <p className="text-sm text-slate-500 mt-1">Unique Moods</p>
        </div>
      </div>

      {/* Chart + top moods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ChartWidget
            title="Journaling Activity"
            subtitle="Entries per day — last 7 days"
            type="bar"
            data={volumeData}
          />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Top Moods
          </h3>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : topMoods.length === 0 ? (
            <p className="text-slate-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-4">
              {topMoods.map(([mood, count]) => (
                <div key={mood} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-slate-900 capitalize">{mood}</p>
                    <p className="text-xs text-slate-500">{count} {count === 1 ? 'entry' : 'entries'}</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full capitalize', getMoodStyle(mood))}>
                    {mood}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI panel */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex items-center gap-8">
        <div className="bg-indigo-600 p-4 rounded-2xl text-white shrink-0">
          <Brain className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-indigo-900 mb-2">AI Semantic Analysis</h3>
          {loading ? (
            <p className="text-indigo-500">Loading insights...</p>
          ) : totalEntries > 0 ? (
            <p className="text-indigo-700 leading-relaxed">
              {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} recorded across {uniqueMoods} distinct{' '}
              {uniqueMoods === 1 ? 'mood' : 'moods'}.{' '}
              {topMoods[0] && `The most common mood is "${topMoods[0][0]}" (${topMoods[0][1]} ${topMoods[0][1] === 1 ? 'entry' : 'entries'}).`}{' '}
              ML analysis results will appear here once the pipeline processes these entries.
            </p>
          ) : (
            <p className="text-indigo-700 leading-relaxed">
              No journal entries yet. Insights will appear as users start journaling.
            </p>
          )}
        </div>
      </div>

      {/* Recent entries table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
          Loading journal entries...
        </div>
      ) : (
        <DataTable columns={columns} data={entries} />
      )}
    </div>
  );
}
