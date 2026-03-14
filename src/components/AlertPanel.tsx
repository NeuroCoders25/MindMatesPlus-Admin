import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
  user: string;
}

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

export default function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          System Alerts & Distress Signals
        </h3>
        <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {alerts.length} New
        </span>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors relative group">
            <div className="flex gap-3">
              <div className={cn(
                "mt-1 p-1.5 rounded-lg shrink-0",
                alert.type === 'critical' ? "bg-rose-100 text-rose-600" :
                alert.type === 'warning' ? "bg-amber-100 text-amber-600" :
                "bg-blue-100 text-blue-600"
              )}>
                {alert.type === 'critical' ? <AlertCircle className="w-4 h-4" /> :
                 alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{alert.user}</p>
                  <span className="text-[10px] text-slate-400">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
              </div>
            </div>
            {onDismiss && (
              <button 
                onClick={() => onDismiss(alert.id)}
                className="absolute top-4 right-4 p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-xs italic">All clear. No active alerts.</p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-100 text-center">
        <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider">
          View All Alerts
        </button>
      </div>
    </div>
  );
}
