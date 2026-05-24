import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Shield, Bell, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { settingsService, DEFAULT_SETTINGS, type SystemSettings } from '../services/settingsService';

type ToastType = 'success' | 'error';
interface Toast { message: string; type: ToastType }

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-7' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    let initialized = false;
    const unsub = settingsService.listenToSettings(
      (s) => {
        setSaved(s);
        setLoading(false);
        if (!initialized) {
          setSettings(s);
          initialized = true;
        }
      },
      () => {
        setSaved(DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const patch = (partial: Partial<SystemSettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }));

  const patchNotif = (partial: Partial<SystemSettings['notifications']>) =>
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...partial },
    }));

  const handleSave = async () => {
    if (!settings.platformName.trim()) {
      showToast('Platform name cannot be empty.', 'error');
      return;
    }
    if (!settings.supportEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)) {
      showToast('Please enter a valid support email address.', 'error');
      return;
    }
    setSaving(true);
    try {
      await settingsService.saveSettings(settings);
      setSaved(settings);
      showToast('Configuration saved successfully.', 'success');
    } catch {
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSettings(saved);
    showToast('Changes discarded.', 'success');
  };

  const handleResetPasswords = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      const count = await settingsService.resetAdminPasswords();
      showToast(`Password reset emails sent to ${count} admin account${count !== 1 ? 's' : ''}.`, 'success');
    } catch {
      showToast('Failed to send reset emails. Please try again.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Reset Admin Passwords?</p>
                <p className="text-xs text-slate-500">This will send password reset emails to all admin accounts.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPasswords}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
              >
                Send Resets
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500">Configure global platform parameters and security protocols.</p>
      </div>

      <div className="space-y-6">
        {/* General Configuration */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">General Configuration</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Name</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => patch({ platformName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => patch({ supportEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                <p className="text-xs text-slate-500">Disable user access for system updates.</p>
              </div>
              <Toggle
                checked={settings.maintenanceMode}
                onChange={(v) => patch({ maintenanceMode: v })}
              />
            </div>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Shield className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900">Security & Privacy</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500">Enforce 2FA for all administrative accounts.</p>
              </div>
              <Toggle
                checked={settings.twoFactorAuth}
                onChange={(v) => patch({ twoFactorAuth: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Data Encryption</p>
                <p className="text-xs text-slate-500">AES-256 encryption for all journal entries.</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Enabled</span>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-2 disabled:opacity-50"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Reset All Admin Passwords
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">Notifications</h3>
          </div>
          <div className="p-6 space-y-4">
            {([
              { key: 'emailDistressAlerts', label: 'Email alerts for critical distress signals' },
              { key: 'emailPerformanceSummary', label: 'Weekly system performance summary' },
              { key: 'emailRegistrationNotifications', label: 'New user registration notifications' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={(e) => patchNotif({ [key]: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleDiscard}
            disabled={!isDirty || saving}
            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
