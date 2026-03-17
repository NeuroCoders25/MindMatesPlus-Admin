import React from 'react';
import { ShieldAlert, MessageSquare, Flag, CheckCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

/**
 * Interface defining the structure of a flagged message
 * @property id - Unique identifier for the message (e.g., 'MSG-1')
 * @property user - Name of the user who sent the message
 * @property group - Name of the peer group where the message was sent
 * @property content - The actual message content that was flagged
 * @property reason - The reason why the message was flagged (e.g., 'Self-harm ideation')
 * @property severity - Risk level of the flagged content
 * @property time - Relative timestamp of when the message was sent
 */
interface FlaggedMessage {
  id: string;
  user: string;
  group: string;
  content: string;
  reason: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
}

/**
 * Sample data representing flagged messages that require moderation review
 * Contains messages flagged by AI for various safety concerns
 */
const dummyMessages: FlaggedMessage[] = [
  { id: 'MSG-1', user: 'Alex Johnson', group: 'Depression Support', content: 'I feel like there is no point in going on anymore. Everything is dark.', reason: 'Self-harm ideation', severity: 'High', time: '6m ago' },
  { id: 'MSG-2', user: 'Unknown User', group: 'Anxiety Support', content: 'You are just making this up for attention.', reason: 'Harassment', severity: 'Medium', time: '12m ago' },
  { id: 'MSG-3', user: 'Maria Garcia', group: 'Anxiety Support', content: 'I am taking 5x the recommended dose of my meds.', reason: 'Substance misuse', severity: 'High', time: '25m ago' },
  { id: 'MSG-4', user: 'Sam Wilson', group: 'Work Stress', content: 'I hate my boss so much I want to punch him.', reason: 'Violence', severity: 'Low', time: '1h ago' },
];

/**
 * ChatMonitoring Component
 * 
 * Dashboard view for moderating and reviewing AI-flagged messages from peer support groups.
 * Provides real-time monitoring, moderation statistics, and AI sensitivity controls.
 * 
 * Features:
 * - Display of flagged messages requiring review
 * - Moderation statistics (flagged, auto-resolved, pending)
 * - AI sensitivity sliders for different detection types
 * - Quick action buttons to resolve or flag users
 */
export default function ChatMonitoring() {
  /**
   * Column configuration for the DataTable component
   * Defines how each column should be rendered for flagged messages
   */
  const columns = [
    // User column displaying the message sender's name
    { header: 'User', accessor: 'user' as keyof FlaggedMessage, className: 'font-bold' },
    // Group column showing which peer group the message belongs to
    { header: 'Group', accessor: 'group' as keyof FlaggedMessage },
    // Message content column with truncated, italicized text
    { header: 'Message Content', accessor: (msg: FlaggedMessage) => (
      <p className="max-w-md italic text-slate-500 truncate">"{msg.content}"</p>
    )},
    // Reason column explaining why the message was flagged
    { header: 'Reason', accessor: 'reason' as keyof FlaggedMessage },
    // Severity column with color-coded badge based on risk level
    { header: 'Severity', accessor: (msg: FlaggedMessage) => (
      <span className={cn(
        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        // Red for high severity
        msg.severity === 'High' ? "bg-rose-100 text-rose-600" :
        // Amber for medium severity
        msg.severity === 'Medium' ? "bg-amber-100 text-amber-600" :
        // Blue for low severity
        "bg-blue-100 text-blue-600"
      )}>
        {msg.severity}
      </span>
    )},
    // Time column showing when the message was sent
    { header: 'Time', accessor: 'time' as keyof FlaggedMessage },
    // Actions column with resolve and flag buttons
    { header: 'Actions', accessor: () => (
      <div className="flex items-center gap-3">
        {/* Button to mark the issue as resolved */}
        <button className="text-emerald-600 hover:text-emerald-700 p-1" title="Resolve">
          <CheckCircle className="w-4 h-4" />
        </button>
        {/* Button to flag the user for further action */}
        <button className="text-rose-600 hover:text-rose-700 p-1" title="Flag User">
          <Flag className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-8">
      {/* Page header with shield alert icon and description */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
          Chat Monitoring
        </h2>
        <p className="text-slate-500">Real-time AI moderation and flagged message review.</p>
      </div>

      {/* Dashboard cards section with statistics and AI controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Moderation statistics card - shows current moderation metrics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Moderation Stats</h4>
          <div className="space-y-4">
            {/* Total messages flagged today */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Flagged Today</span>
              <span className="text-sm font-bold text-slate-900">24</span>
            </div>
            {/* Messages automatically resolved by AI */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Auto-Resolved</span>
              <span className="text-sm font-bold text-emerald-600">18</span>
            </div>
            {/* Messages awaiting human review */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Pending Review</span>
              <span className="text-sm font-bold text-rose-600">6</span>
            </div>
          </div>
        </div>
        {/* AI sensitivity settings card - controls detection thresholds */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-3">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">AI Sensitivity Settings</h4>
          <div className="flex items-center gap-8">
            {/* Slider to adjust self-harm detection sensitivity (default: 90%) */}
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Self-Harm Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={90} />
            </div>
            {/* Slider to adjust harassment detection sensitivity (default: 75%) */}
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Harassment Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={75} />
            </div>
            {/* Slider to adjust spam detection sensitivity (default: 40%) */}
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 block mb-2">Spam Detection</label>
              <input type="range" className="w-full accent-indigo-600" defaultValue={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Data table displaying all flagged messages with configured columns */}
      <DataTable columns={columns} data={dummyMessages} />
    </div>
  );
}