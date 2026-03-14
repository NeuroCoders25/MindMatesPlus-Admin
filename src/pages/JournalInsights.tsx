import React from 'react';
import { BookOpen, TrendingUp, Brain, Search } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';

const journalVolumeData = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 150 },
  { name: 'Wed', value: 180 },
  { name: 'Thu', value: 140 },
  { name: 'Fri', value: 210 },
  { name: 'Sat', value: 90 },
  { name: 'Sun', value: 80 },
];

export default function JournalInsights() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Journal Insights</h2>
        <p className="text-slate-500">Aggregate analysis of user journaling patterns and emotional trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ChartWidget 
            title="Journaling Activity" 
            subtitle="Total entries per day this week"
            type="bar" 
            data={journalVolumeData} 
          />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Top Themes
          </h3>
          <div className="space-y-4">
            {[
              { theme: 'Workplace Stress', count: 450, growth: '+12%' },
              { theme: 'Relationship Anxiety', count: 320, growth: '+5%' },
              { theme: 'Sleep Issues', count: 280, growth: '+18%' },
              { theme: 'Social Isolation', count: 210, growth: '-2%' },
              { theme: 'Career Uncertainty', count: 190, growth: '+24%' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.theme}</p>
                  <p className="text-xs text-slate-500">{item.count} entries</p>
                </div>
                <span className={cn(
                  "text-xs font-bold",
                  item.growth.startsWith('+') ? "text-emerald-600" : "text-rose-600"
                )}>
                  {item.growth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex items-center gap-8">
        <div className="bg-indigo-600 p-4 rounded-2xl text-white">
          <Brain className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-indigo-900 mb-2">AI Semantic Analysis</h3>
          <p className="text-indigo-700 leading-relaxed">
            Our latest analysis indicates a shift in user sentiment towards "Resilience" and "Coping Strategies" 
            following the introduction of the new guided journaling prompts. Distress signals have decreased by 8% 
            in users who journal at least 3 times per week.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
          View Detailed Report
        </button>
      </div>
    </div>
  );
}

// Helper for the page
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
