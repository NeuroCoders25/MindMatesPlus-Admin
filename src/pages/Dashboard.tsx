import React from 'react';
import { Users, UsersRound, MessageSquare, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import ChartWidget from '../components/ChartWidget';
import AlertPanel from '../components/AlertPanel';

const userGrowthData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 600 },
  { name: 'Mar', value: 800 },
  { name: 'Apr', value: 1200 },
  { name: 'May', value: 1500 },
  { name: 'Jun', value: 2100 },
];

const emotionalStateData = [
  { name: 'Stable', value: 45, color: '#6366f1' },
  { name: 'Anxious', value: 25, color: '#f59e0b' },
  { name: 'Distressed', value: 15, color: '#f43f5e' },
  { name: 'Positive', value: 15, color: '#10b981' },
];

const recentAlerts = [
  { id: '1', type: 'critical' as const, user: 'Alex Johnson', message: 'High distress detected in journal entry: "I feel completely overwhelmed and alone today."', time: '12m ago' },
  { id: '2', type: 'warning' as const, user: 'Maria Garcia', message: 'Flagged message in "Anxiety Support" group: Mention of self-harm ideation.', time: '45m ago' },
  { id: '3', type: 'info' as const, user: 'System', message: 'New peer group "Post-Grad Stress" has reached 10 members.', time: '2h ago' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Welcome back, Dr. Chen. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Users" 
          value="2,451" 
          icon={Users} 
          trend={{ value: 12, isUp: true }}
          color="indigo"
        />
        <DashboardCard 
          title="Active Peer Groups" 
          value="42" 
          icon={UsersRound} 
          trend={{ value: 5, isUp: true }}
          color="purple"
        />
        <DashboardCard 
          title="Messages Today" 
          value="12,840" 
          icon={MessageSquare} 
          trend={{ value: 8, isUp: true }}
          color="emerald"
        />
        <DashboardCard 
          title="Distress Alerts" 
          value="7" 
          icon={AlertCircle} 
          trend={{ value: 2, isUp: false }}
          color="rose"
        />
      </div>

      {/* Charts & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ChartWidget 
            title="User Growth" 
            subtitle="New registrations over the last 6 months"
            type="area" 
            data={userGrowthData} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartWidget 
              title="Emotional Distribution" 
              subtitle="Current aggregate user states"
              type="pie" 
              data={emotionalStateData} 
              height={250}
            />
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Key Insights
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2"></div>
                  <p className="text-sm text-slate-600">User engagement is up 15% in the "Workplace Stress" category.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2"></div>
                  <p className="text-sm text-slate-600">AI sentiment analysis shows a 10% improvement in overall group positivity this week.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                  <p className="text-sm text-slate-600">Average journal entry length has increased by 200 words since the new prompt system.</p>
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
            <p className="text-indigo-100 text-sm mb-4">You have a group moderation review scheduled for tomorrow at 10:00 AM.</p>
            <button className="w-full py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
              View Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
