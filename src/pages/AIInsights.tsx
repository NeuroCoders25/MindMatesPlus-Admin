import React from 'react';
import { BrainCircuit, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';

// Bar chart data for core model capabilities.
// Each object becomes one bar in the chart (name = label, value = percentage).
const modelPerformanceData = [
  { name: 'Sentiment', value: 98 },
  { name: 'Risk Detection', value: 94 },
  { name: 'Topic Extraction', value: 88 },
  { name: 'Response Gen', value: 92 },
];

// Insight cards are configured as data so adding/removing recommendations is easy.
// This avoids hardcoding repeated JSX for each recommendation card.
const aiRecommendations = [
  {
    title: 'New Support Group Opportunity',
    detail:
      'AI detected a cluster of 50+ users discussing "Eco-Anxiety" in general chats. Recommend creating a dedicated peer group.',
    cardClass: 'bg-purple-50 border border-purple-100',
    titleClass: 'text-purple-900',
    detailClass: 'text-purple-700',
  },
  {
    title: 'Prompt Optimization',
    detail:
      'Journaling engagement drops on weekends. AI suggests implementing "Weekend Reflection" specific prompts to maintain habit.',
    cardClass: 'bg-indigo-50 border border-indigo-100',
    titleClass: 'text-indigo-900',
    detailClass: 'text-indigo-700',
  },
];

// Training status allows mixed states: in-progress percentage or deployed.
// progress controls the width of the horizontal progress bar.
const trainingStatus = [
  {
    model: 'Sentiment Model v2.4',
    statusText: 'Training 85%',
    statusClass: 'text-indigo-400',
    progressClass: 'bg-indigo-500',
    progress: 85,
  },
  {
    model: 'Risk Detection v3.1',
    statusText: 'Deployed',
    statusClass: 'text-emerald-400',
    progressClass: 'bg-emerald-500',
    progress: 100,
  },
];

export default function AIInsights() {
  // Timestamp shown in the header so admins know how fresh the dashboard view is.
  // could come from API response metadata.
  const lastUpdated = new Date().toLocaleString();

  return (
    // Main page wrapper with vertical spacing between major sections.
    <div className="space-y-8">
      <div>
        {/* Page title and summary */}
        <h2 className="text-2xl font-bold text-slate-900">AI Insights & Performance</h2>
        <p className="text-slate-500">Monitor the health and accuracy of MindMates+ AI models.</p>
        <p className="text-xs text-slate-400 mt-1">Last updated: {lastUpdated}</p>
      </div>

      {/* Top dashboard row: chart on the left, KPI cards on the right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Reusable chart component that renders model accuracy bars */}
          <ChartWidget 
            title="Model Accuracy (%)" 
            subtitle="Current performance metrics across core AI tasks"
            type="bar" 
            data={modelPerformanceData} 
          />
        </div>
        <div className="space-y-6">
          {/* Latency KPI card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">System Latency</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">142ms</span>
              <span className="text-xs text-emerald-600 font-bold mb-1">-12% from avg</span>
            </div>
          </div>

          {/* Safety filter uptime KPI card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900">Safety Filters</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">100%</span>
              <span className="text-xs text-slate-400 font-bold mb-1">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: recommendations panel and training status panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Recommendations
          </h3>

          {/* Loop through recommendation data and render a styled card for each item */}
          <div className="space-y-4">
            {aiRecommendations.map((item) => (
              <div key={item.title} className={`p-4 rounded-xl ${item.cardClass}`}>
                <p className={`text-sm font-bold mb-1 ${item.titleClass}`}>{item.title}</p>
                <p className={`text-xs ${item.detailClass}`}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-6 text-slate-300">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            Model Training Status
          </h3>

          {/* Render each model's state and visual progress meter */}
          <div className="space-y-6">
            {trainingStatus.map((model) => (
              <div key={model.model}>
                <div className="flex justify-between text-xs mb-2">
                  <span>{model.model}</span>
                  <span className={model.statusClass}>{model.statusText}</span>
                </div>
                {/*
                  Accessible progressbar:
                  - aria-valuenow is the current progress
                  - inner div width uses the same progress value for visuals
                */}
                <div className="w-full bg-slate-800 rounded-full h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={model.progress} aria-label={`${model.model} progress`}>
                  <div className={`${model.progressClass} h-1.5 rounded-full`} style={{ width: `${model.progress}%` }}></div>
                </div>
              </div>
            ))}

            {/* Placeholder action button for future model-management workflow */}
            <button
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
              type="button"
              aria-label="Manage AI models"
            >
              Manage Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
