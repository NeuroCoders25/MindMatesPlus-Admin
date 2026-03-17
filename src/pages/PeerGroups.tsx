import React from 'react';
import { UsersRound, Activity, MessageSquare, Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

/**
 * Interface defining the structure of a peer support group
 * @property id - Unique identifier for the group (e.g., 'PG-001')
 * @property name - Display name of the peer group
 * @property category - Category/topic of the group (e.g., 'Anxiety', 'Depression')
 * @property members - Total number of members in the group
 * @property activityLevel - Current engagement level of the group
 * @property moderator - Name of the person moderating the group
 * @property status - Whether the group is currently active or archived
 */
interface PeerGroup {
  id: string;
  name: string;
  category: string;
  members: number;
  activityLevel: 'High' | 'Medium' | 'Low';
  moderator: string;
  status: 'Active' | 'Archived';
}

/**
 * Sample data representing various peer support groups
 * Used for demonstration purposes in the dashboard
 */
const dummyGroups: PeerGroup[] = [
  { id: 'PG-001', name: 'Anxiety Support', category: 'Anxiety', members: 125, activityLevel: 'High', moderator: 'Dr. Sarah Chen', status: 'Active' },
  { id: 'PG-002', name: 'Depression Support', category: 'Depression', members: 90, activityLevel: 'Medium', moderator: 'Dr. James Wilson', status: 'Active' },
  { id: 'PG-003', name: 'Workplace Stress', category: 'Stress', members: 211, activityLevel: 'High', moderator: 'Emma Watson', status: 'Active' },
  { id: 'PG-004', name: 'Grief & Loss', category: 'Grief', members: 45, activityLevel: 'Low', moderator: 'Michael Scott', status: 'Active' },
  { id: 'PG-005', name: 'Post-Grad Life', category: 'Life Transitions', members: 12, activityLevel: 'Medium', moderator: 'Sarah Miller', status: 'Active' },
  { id: 'PG-006', name: 'Mindfulness Practice', category: 'Wellness', members: 340, activityLevel: 'High', moderator: 'Auto-Mod', status: 'Active' },
];

/**
 * PeerGroups Component
 * 
 * Main dashboard view for managing and monitoring peer support groups.
 * Displays group statistics, highlights, and a comprehensive table of all groups.
 * 
 * Features:
 * - Summary cards showing most active, fastest growing, and attention-needed groups
 * - Data table with sortable/filterable group information
 * - Create new group functionality
 */
export default function PeerGroups() {
  /**
   * Column configuration for the DataTable component
   * Defines how each column should be rendered and what data it should display
   */
  const columns = [
    // Group name column with ID subtitle
    { header: 'Group Name', accessor: (group: PeerGroup) => (
      <div>
        <p className="font-bold text-slate-900">{group.name}</p>
        <p className="text-xs text-slate-400">{group.id}</p>
      </div>
    )},
    // Category column (simple text display)
    { header: 'Category', accessor: 'category' as keyof PeerGroup },
    // Members column with user icon
    { header: 'Members', accessor: (group: PeerGroup) => (
      <div className="flex items-center gap-2">
        <UsersRound className="w-4 h-4 text-slate-400" />
        <span className="font-medium">{group.members}</span>
      </div>
    )},
    // Activity level column with color-coded icon
    { header: 'Activity', accessor: (group: PeerGroup) => (
      <div className="flex items-center gap-2">
        <Activity className={cn(
          "w-4 h-4",
          // Green for high activity
          group.activityLevel === 'High' ? "text-emerald-500" :
          // Amber for medium activity
          group.activityLevel === 'Medium' ? "text-amber-500" :
          // Gray for low activity
          "text-slate-400"
        )} />
        <span className="text-xs font-medium">{group.activityLevel}</span>
      </div>
    )},
    // Moderator column (simple text display)
    { header: 'Moderator', accessor: 'moderator' as keyof PeerGroup },
    // Status column with styled badge
    { header: 'Status', accessor: (group: PeerGroup) => (
      <span className={cn(
        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
        // Green background for active groups
        group.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
      )}>
        {group.status}
      </span>
    )},
    // Actions column with management button
    { header: 'Actions', accessor: () => (
      <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider">
        Manage
      </button>
    )},
  ];

  return (
    <div className="space-y-8">
      {/* Page header with title and create button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Peer Groups</h2>
          <p className="text-slate-500">Monitor community engagement and group health.</p>
        </div>
        {/* Button to create a new peer group */}
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create New Group
        </button>
      </div>

      {/* Summary cards section showing key metrics and highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most active group card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Most Active</p>
          <h4 className="text-lg font-bold text-slate-900">Mindfulness Practice</h4>
          <p className="text-xs text-slate-500 mt-1">1,240 messages in the last 24h</p>
        </div>
        {/* Fastest growing group card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fastest Growing</p>
          <h4 className="text-lg font-bold text-slate-900">Post-Grad Life</h4>
          <p className="text-xs text-slate-500 mt-1">+45% members this week</p>
        </div>
        {/* Group needing attention card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Needs Attention</p>
          <h4 className="text-lg font-bold text-slate-900">Grief & Loss</h4>
          <p className="text-xs text-slate-500 mt-1">Low activity detected (3 days)</p>
        </div>
      </div>

      {/* Data table displaying all peer groups with configured columns */}
      <DataTable columns={columns} data={dummyGroups} />
    </div>
  );
}