import React from 'react';
import { MessageSquareQuote, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import DataTable from '../components/DataTable';

interface Feedback {
  id: string;
  user: string;
  type: 'Feature Request' | 'Bug Report' | 'Praise' | 'Complaint';
  content: string;
  rating: number;
  date: string;
}

const dummyFeedback: Feedback[] = [
  { id: 'FB-001', user: 'Alex Johnson', type: 'Feature Request', content: 'Would love to have a dark mode for journaling at night.', rating: 5, date: '2h ago' },
  { id: 'FB-002', user: 'Maria Garcia', type: 'Praise', content: 'The AI insights really helped me understand my anxiety patterns.', rating: 5, date: '5h ago' },
  { id: 'FB-003', user: 'Sam Wilson', type: 'Bug Report', content: 'App crashes when I try to upload a profile picture.', rating: 2, date: '1d ago' },
  { id: 'FB-004', user: 'Emily Chen', type: 'Complaint', content: 'Some users in the Work Stress group are being a bit too loud.', rating: 3, date: '2d ago' },
];

export default function Feedback() {
  const columns = [
    { header: 'User', accessor: 'user' as keyof Feedback, className: 'font-bold' },
    { header: 'Type', accessor: (fb: Feedback) => (
      <span className={cn(
        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        fb.type === 'Praise' ? "bg-emerald-100 text-emerald-600" :
        fb.type === 'Bug Report' ? "bg-rose-100 text-rose-600" :
        fb.type === 'Feature Request' ? "bg-blue-100 text-blue-600" :
        "bg-amber-100 text-amber-600"
      )}>
        {fb.type}
      </span>
    )},
    { header: 'Feedback', accessor: (fb: Feedback) => (
      <p className="max-w-md text-slate-600 truncate">"{fb.content}"</p>
    )},
    { header: 'Rating', accessor: (fb: Feedback) => (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={cn("w-3 h-3", i < fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
        ))}
      </div>
    )},
    { header: 'Date', accessor: 'date' as keyof Feedback },
    { header: 'Action', accessor: () => (
      <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider">
        Reply
      </button>
    )},
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
            <span className="text-4xl font-bold text-slate-900">4.8</span>
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Based on 1,240 reviews</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-around">
          <div className="text-center">
            <ThumbsUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-slate-900">92%</p>
            <p className="text-xs text-slate-500">Positive</p>
          </div>
          <div className="h-12 w-px bg-slate-100"></div>
          <div className="text-center">
            <ThumbsDown className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-slate-900">8%</p>
            <p className="text-xs text-slate-500">Negative</p>
          </div>
        </div>
        <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center flex flex-col justify-center">
          <p className="text-sm font-medium mb-2">New Feedback Today</p>
          <p className="text-3xl font-bold">12</p>
          <button className="mt-4 text-xs font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 py-2 rounded-lg transition-all">
            Review Now
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={dummyFeedback} />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
