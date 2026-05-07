import { useEffect, useState } from 'react';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import { feedbackService, FeedbackItem } from '../services/feedbackService';
import { cn } from '../lib/utils';

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

export default function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = feedbackService.listenToFeedback((items) => {
      setFeedback(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const avgRating = feedback.length
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : 0;

  // Positive = rating >= 4, Negative = rating <= 2
  const positiveCount = feedback.filter(f => f.rating >= 4).length;
  const negativeCount = feedback.filter(f => f.rating <= 2).length;
  const positivePercent = feedback.length ? Math.round((positiveCount / feedback.length) * 100) : 0;
  const negativePercent = feedback.length ? Math.round((negativeCount / feedback.length) * 100) : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = feedback.filter(f => f.date >= todayStart).length;

  const columns = [
    {
      header: 'App Feedback',
      accessor: (fb: FeedbackItem) => (
        <p className="max-w-xs text-slate-600 truncate">"{fb.appComment}"</p>
      ),
    },
    {
      header: 'Peer Feedback',
      accessor: (fb: FeedbackItem) => (
        <p className="max-w-xs text-slate-600 truncate">"{fb.peerComment}"</p>
      ),
    },
    {
      header: 'Rating',
      accessor: (fb: FeedbackItem) => (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={cn("w-3 h-3", i < fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
          ))}
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: (fb: FeedbackItem) => formatRelativeTime(fb.date),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Feedback</h2>
        <p className="text-slate-500">Listen to what MindMates+ users are saying about the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Overall Satisfaction</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-slate-900">
              {loading ? '—' : avgRating.toFixed(1)}
            </span>
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {loading ? 'Loading...' : `Based on ${feedback.length} review${feedback.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-around">
          <div className="text-center">
            <ThumbsUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-slate-900">{loading ? '—' : `${positivePercent}%`}</p>
            <p className="text-xs text-slate-500">Positive</p>
          </div>
          <div className="h-12 w-px bg-slate-100" />
          <div className="text-center">
            <ThumbsDown className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-slate-900">{loading ? '—' : `${negativePercent}%`}</p>
            <p className="text-xs text-slate-500">Negative</p>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center flex flex-col justify-center">
          <p className="text-sm font-medium mb-2">New Feedback Today</p>
          <p className="text-3xl font-bold">{loading ? '—' : todayCount}</p>
          <button className="mt-4 text-xs font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 py-2 rounded-lg transition-all">
            Review Now
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
          Loading feedback...
        </div>
      ) : (
        <DataTable columns={columns} data={feedback} />
      )}
    </div>
  );
}
