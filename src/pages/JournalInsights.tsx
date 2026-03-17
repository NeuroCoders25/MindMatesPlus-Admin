import React from 'react';
import { TrendingUp, Brain } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';
import { cn } from '../lib/utils';

// Type for chart points used by ChartWidget.
type ChartPoint = {
  name: string;
  value: number;
};

// Type for top theme cards.
type JournalTheme = {
  theme: string;
  count: number;
  growth: string;
};

// Weekly journal submission volume used by the bar chart.
const journalVolumeData: ChartPoint[] = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 150 },
  { name: 'Wed', value: 180 },
  { name: 'Thu', value: 140 },
  { name: 'Fri', value: 210 },
  { name: 'Sat', value: 90 },
  { name: 'Sun', value: 80 },
];

// Most discussed user themes and their week-over-week trend.
const topThemes: ReadonlyArray<JournalTheme> = [
  { theme: 'Workplace Stress', count: 450, growth: '+12%' },
  { theme: 'Relationship Anxiety', count: 320, growth: '+5%' },
  { theme: 'Sleep Issues', count: 280, growth: '+18%' },
  { theme: 'Social Isolation', count: 210, growth: '-2%' },
  { theme: 'Career Uncertainty', count: 190, growth: '+24%' },
];

// Separated text constant keeps JSX cleaner and easier to update.
const semanticAnalysisSummary =
  'Our latest analysis indicates a shift in user sentiment towards "Resilience" and "Coping Strategies" following the introduction of the new guided journaling prompts. Distress signals have decreased by 8% in users who journal at least 3 times per week.';

// Utility used for conditional color mapping on growth percentages.
const isPositiveGrowth = (growth: string) => growth.startsWith('+');

export default function JournalInsights() {
  // Timestamp shown so reviewers can discuss data freshness in demos/viva.
  const lastUpdated = new Date().toLocaleString();

  return (
    // Page wrapper with consistent spacing between sections.
    <div className="space-y-8">
      <div>
        {/* Section heading and context */}
        <h2 className="text-2xl font-bold text-slate-900">Journal Insights</h2>
        <p className="text-slate-500">Aggregate analysis of user journaling patterns and emotional trends.</p>
        <p className="text-xs text-slate-400 mt-1">Last updated: {lastUpdated}</p>
      </div>

      {/* Main analytics row: activity chart + top themes list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Reusable chart component for weekly journal activity */}
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

          {/* Data-driven theme cards (easy to maintain and scale) */}
          <div className="space-y-4">
            {topThemes.map((item) => (
              <div key={item.theme} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.theme}</p>
                  <p className="text-xs text-slate-500">{item.count} entries</p>
                </div>
                <span className={cn(
                  "text-xs font-bold",
                  isPositiveGrowth(item.growth) ? "text-emerald-600" : "text-rose-600"
                )}>
                  {item.growth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI interpretation panel summarizing semantic journal trends */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex items-center gap-8">
        <div className="bg-indigo-600 p-4 rounded-2xl text-white">
          <Brain className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-indigo-900 mb-2">AI Semantic Analysis</h3>
          <p className="text-indigo-700 leading-relaxed">{semanticAnalysisSummary}</p>
        </div>
        <button
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          type="button"
          aria-label="View detailed journal analysis report"
        >
          View Detailed Report
        </button>
      </div>
    </div>
  );
}
