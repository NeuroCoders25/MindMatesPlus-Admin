import React from 'react';
import { Search, Filter, MoreVertical, Eye, ShieldAlert } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  peerGroup: string;
  status: 'Active' | 'Suspended' | 'Inactive';
  lastActive: string;
}

// Dummy user data (used for testing / UI preview)
const dummyUsers: User[] = [
  { id: 'MM-1024', name: 'Alex Johnson', email: 'alex.j@example.com', riskLevel: 'Critical', peerGroup: 'Depression Support', status: 'Active', lastActive: '2 mins ago' },
  { id: 'MM-1025', name: 'Maria Garcia', email: 'm.garcia@example.com', riskLevel: 'High', peerGroup: 'Anxiety Support', status: 'Active', lastActive: '15 mins ago' },
  { id: 'MM-1026', name: 'Sam Wilson', email: 'sam.w@example.com', riskLevel: 'Low', peerGroup: 'Work Stress', status: 'Active', lastActive: '1 hour ago' },
  { id: 'MM-1027', name: 'Emily Chen', email: 'e.chen@example.com', riskLevel: 'Medium', peerGroup: 'Social Anxiety', status: 'Active', lastActive: '3 hours ago' },
  { id: 'MM-1028', name: 'James Taylor', email: 'j.taylor@example.com', riskLevel: 'Low', peerGroup: 'Grief Support', status: 'Suspended', lastActive: '2 days ago' },
  { id: 'MM-1029', name: 'Sarah Miller', email: 's.miller@example.com', riskLevel: 'Low', peerGroup: 'Mindfulness', status: 'Active', lastActive: '5 mins ago' },
  { id: 'MM-1030', name: 'David Brown', email: 'd.brown@example.com', riskLevel: 'Medium', peerGroup: 'Anxiety Support', status: 'Inactive', lastActive: '1 week ago' },
];

export default function UserManagement() {
   // Table with user details
  const columns = [
    { header: 'User ID', accessor: 'id' as keyof User, className: 'font-mono text-xs' },
    { 
      header: 'Name', 
      accessor: (user: User) => (
        <div>
          <p className="font-bold text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      )
    },
    { 
      header: 'Risk Level', 
      accessor: (user: User) => (
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
          user.riskLevel === 'Critical' ? "bg-rose-100 text-rose-600" :
          user.riskLevel === 'High' ? "bg-amber-100 text-amber-600" :
          user.riskLevel === 'Medium' ? "bg-blue-100 text-blue-600" :
          "bg-emerald-100 text-emerald-600"
        )}>
          {user.riskLevel}
        </span>
      )
    },
    { header: 'Peer Group', accessor: 'peerGroup' as keyof User },
    { 
      header: 'Status', 
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            user.status === 'Active' ? "bg-emerald-500" :
            user.status === 'Suspended' ? "bg-rose-500" :
            "bg-slate-300"
          )}></span>
          <span className="text-xs font-medium">{user.status}</span>
        </div>
      )
    },
    { header: 'Last Active', accessor: 'lastActive' as keyof User },
    { 
      header: 'Actions', 
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="View Profile">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" title="Suspend User">
            <ShieldAlert className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

return (
    <div className="space-y-8">

      {/* Page header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500">Monitor and manage MindMates+ users and their safety levels.</p>
        </div>

        {/* Top-right actions */}
        <div className="flex items-center gap-3">

          {/* Filter button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>

          {/* Export button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            Export Data
          </button>
        </div>
      </div>

      {/* Search + Filter section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Risk level dropdown filter */}
        <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option>All Risk Levels</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Data table rendering users */}
      <DataTable columns={columns} data={dummyUsers} />
    </div>
  );
}
