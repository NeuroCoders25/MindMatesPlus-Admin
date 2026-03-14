import React from 'react';
import { ShieldAlert, MessageSquare, Flag, CheckCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

interface FlaggedMessage {
  id: string;
  user: string;
  group: string;
  content: string;
  reason: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
}

const dummyMessages: FlaggedMessage[] = [
  { id: 'MSG-1', user: 'Alex Johnson', group: 'Depression Support', content: 'I feel like there is no point in going on anymore. Everything is dark.', reason: 'Self-harm ideation', severity: 'High', time: '5m ago' },
  { id: 'MSG-2', user: 'Unknown User', group: 'Anxiety Support', content: 'You are just making this up for attention.', reason: 'Harassment', severity: 'Medium', time: '12m ago' },
  { id: 'MSG-3', user: 'Maria Garcia', group: 'Anxiety Support', content: 'I am taking 5x the recommended dose of my meds.', reason: 'Substance misuse', severity: 'High', time: '25m ago' },
  { id: 'MSG-4', user: 'Sam Wilson', group: 'Work Stress', content: 'I hate my boss so much I want to punch him.', reason: 'Violence', severity: 'Low', time: '1h ago' },
];

export default function ChatMonitoring() {
  const columns = [
    { header: 'User', accessor: 'user' as keyof FlaggedMessage, className: 'font-bold' },
    { header: 'Group', accessor: 'group' as keyof FlaggedMessage },
    { header: 'Message Content', accessor: (msg: FlaggedMessage) => (
      <p className="max-w-md italic text-slate-500 truncate">"{msg.content}"</p>
    )},
    { header: 'Reason', accessor: 'reason' as keyof FlaggedMessage },
    { header: 'Severity', accessor: (msg: FlaggedMessage) => (
      <span className={cn(
        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        msg.severity === 'High' ? "bg-rose-100 text-rose-600" :
        msg.severity === 'Medium' ? "bg-amber-100 text-amber-600" :
        "bg-blue-100 text-blue-600"
      )}>
        {msg.severity}
      </span>
    )},
    { header: 'Time', accessor: 'time' as keyof FlaggedMessage },
    { header: 'Actions', accessor: () => (
      <div className="flex items-center gap-3">
        <button className="text-emerald-600 hover:text-emerald-700 p-1" title="Resolve">
          <CheckCircle className="w-4 h-4" />
        </button>
        <button className="text-rose-600 hover:text-rose-700 p-1" title="Flag User">
          <Flag className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
          Chat Monitoring
        </h2>
        <p className="text-slate-500">Real-time AI moderation and flagged message review.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Moderation Stats</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Flagged Today</span>
              <span className="text-sm font-bold text-slate-900">24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Auto-Resolved</span>
              <span className="text-sm font-bold text-emerald-600">18</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Pending Review</span>
              <span className="text-sm font-bold text-rose-600">6</span>
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

      <DataTable columns={columns} data={dummyMessages} />
    </div>
  );
}
