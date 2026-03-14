import React from 'react';
import { BarChart3, Download, FileText, Calendar } from 'lucide-react';
import ChartWidget from '../components/ChartWidget';

const engagementData = [
  { name: 'Week 1', value: 4500 },
  { name: 'Week 2', value: 5200 },
  { name: 'Week 3', value: 4800 },
  { name: 'Week 4', value: 6100 },
];

export default function Reports() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500">Generate and download system-wide performance reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartWidget 
          title="User Engagement" 
          subtitle="Weekly active users (WAU)"
          type="area" 
          data={engagementData} 
        />
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Available Reports</h3>
          <div className="space-y-4">
            {[
              { name: 'Monthly Safety Audit', date: 'Mar 01, 2026', size: '2.4 MB' },
              { name: 'User Growth Q1 Analysis', date: 'Feb 28, 2026', size: '1.8 MB' },
              { name: 'Peer Group Engagement Metrics', date: 'Feb 25, 2026', size: '4.2 MB' },
              { name: 'AI Model Accuracy Report', date: 'Feb 20, 2026', size: '0.9 MB' },
              { name: 'System Performance Logs', date: 'Feb 15, 2026', size: '12.5 MB' },
            ].map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{report.name}</p>
                    <p className="text-xs text-slate-400">{report.date} • {report.size}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Custom Report Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metric Type</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm">
              <option>User Retention</option>
              <option>Safety Incidents</option>
              <option>Group Activity</option>
              <option>AI Accuracy</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm">
              <option>PDF Document</option>
              <option>CSV Spreadsheet</option>
              <option>JSON Data</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
