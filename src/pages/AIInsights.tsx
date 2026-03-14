import React from 'react';
import { BrainCircuit, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';

const modelPerformanceData = [
  { name: 'Sentiment', value: 98 },
  { name: 'Risk Detection', value: 94 },
  { name: 'Topic Extraction', value: 88 },
  { name: 'Response Gen', value: 92 },
];

export default function AIInsights() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI Insights & Performance</h2>
        <p className="text-slate-500">Monitor the health and accuracy of MindMates+ AI models.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <ChartWidget 
            title="Model Accuracy (%)" 
            subtitle="Current performance metrics across core AI tasks"
            type="bar" 
            data={modelPerformanceData} 
          />
        </div>
        <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Recommendations
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-sm font-bold text-purple-900 mb-1">New Support Group Opportunity</p>
              <p className="text-xs text-purple-700">AI detected a cluster of 50+ users discussing "Eco-Anxiety" in general chats. Recommend creating a dedicated peer group.</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-sm font-bold text-indigo-900 mb-1">Prompt Optimization</p>
              <p className="text-xs text-indigo-700">Journaling engagement drops on weekends. AI suggests implementing "Weekend Reflection" specific prompts to maintain habit.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-6 text-slate-300">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            Model Training Status
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Sentiment Model v2.4</span>
                <span className="text-indigo-400">Training 85%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Risk Detection v3.1</span>
                <span className="text-emerald-400">Deployed</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">
              Manage Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
