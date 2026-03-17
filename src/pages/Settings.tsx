import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, Database, Globe, Lock } from 'lucide-react';
// Main Settings component for configuring system-wide options
export default function Settings() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500">Configure global platform parameters and security protocols..</p>
      </div>

      <div className="space-y-6">
        {/* ---------------- General Settings Section ---------------- */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           {/* Section header with icon */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">General Configuration</h3>
          </div>
          {/* Section content */}
          <div className="p-6 space-y-6">
            {/* Input fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platform name input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Name</label>
                <input type="text" defaultValue="MindMates+" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" />
              </div>
              {/* Support email input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Support Email</label>
                <input type="email" defaultValue="support@mindmates.plus" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" />
              </div>
            </div>
            {/* Maintenance mode toggle (UI only, no state handling yet) */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                <p className="text-xs text-slate-500">Disable user access for system updates.</p>
              </div>
              {/* Toggle switch (static, not functional yet) */}
              <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Security Settings Section ---------------- */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Shield className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900">Security & Privacy</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* 2FA toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500">Enforce 2FA for all administrative accounts.</p>
              </div>
              {/* Active toggle UI */}
              <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            {/* Encryption status display */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Data Encryption</p>
                <p className="text-xs text-slate-500">AES-256 encryption for all journal entries.</p>
              </div>
              {/* Static badge showing enabled state */}
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Enabled</span>
            </div>
            {/* Critical action: reset admin passwords */}
            <div className="pt-4 border-t border-slate-100">
              <button className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Reset All Admin Passwords
              </button>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">Notifications</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Notification option 1 */}
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-700">Email alerts for critical distress signals</span>
            </div>
            {/* Notification option 2 */}
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-700">Weekly system performance summary</span>
            </div>
            {/* Notification option 3 */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-700">New user registration notifications</span>
            </div>
          </div>
        </section>

        {/* ---------------- Action Buttons ---------------- */}
        <div className="flex justify-end gap-4">
          {/* Discard button */}
          <button className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Discard Changes
          </button>
          {/* Save button */}
          <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
