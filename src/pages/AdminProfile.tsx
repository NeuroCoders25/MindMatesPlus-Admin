import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Pencil, Save, Upload, Shuffle, CheckCircle2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadImageToImageKit } from '../services/imageUploadService';

const DICEBEAR_STYLES = [
  'avataaars', 'lorelei', 'micah', 'notionists',
  'open-peeps', 'personas', 'big-ears', 'thumbs',
  'pixel-art', 'bottts', 'fun-emoji', 'croodles',
];

function randomDiceBearUrl(): string {
  const style = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
  const seed = Math.random().toString(36).substring(2, 10);
  return `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=200`;
}

function defaultDiceBearUrl(uid: string): string {
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${uid}&size=200`;
}

interface AdminData {
  name: string;
  email: string;
  role: string;
  photoURL: string;
}

export default function AdminProfile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminData | null>(null);
  const [form, setForm] = useState<AdminData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [currentUser]);

  async function loadAdminData() {
    if (!currentUser) return;
    try {
      let name = currentUser.displayName || '';
      let role = 'Administrator';

      const snap = await getDoc(doc(db, 'admins', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        name = d.name || name;
        role = d.role || role;
      }

      const adminData: AdminData = {
        name,
        email: currentUser.email || '',
        role,
        photoURL: currentUser.photoURL || defaultDiceBearUrl(currentUser.uid),
      };
      setData(adminData);
      setForm({ ...adminData });
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  function clearPending() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPendingFile(null);
  }

  function handleEdit() {
    if (data) setForm({ ...data });
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  }

  function handleDiscard() {
    if (data) setForm({ ...data });
    clearPending();
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!currentUser || !form) return;
    setSaving(true);
    setError(null);
    try {
      let photoURL = form.photoURL;
      if (pendingFile) {
        photoURL = await uploadImageToImageKit(pendingFile, 'admin-profiles');
      }
      await updateProfile(auth.currentUser!, { displayName: form.name, photoURL });
      const adminRef = doc(db, 'admins', currentUser.uid);
      const snap = await getDoc(adminRef);
      if (snap.exists()) {
        await updateDoc(adminRef, { name: form.name });
      }
      setData({ ...form, photoURL });
      clearPending();
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const display = isEditing ? form : data;
  const photo = previewUrl || display?.photoURL;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Profile</h2>
            <p className="text-sm text-slate-500">
              {isEditing
                ? 'Edit your account details and profile photo.'
                : <>Your account details and <span className="text-indigo-500">admin settings</span>.</>}
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success toast — fixed pill aligned with top-right navbar signout */}
      {success && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2.5 bg-green-500 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Profile saved successfully
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h3 className="text-base font-bold text-slate-900">Profile Information</h3>

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <img src={photo || ''} alt="Profile" className="w-full h-full object-cover" />
          </div>
          {isEditing && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { clearPending(); setForm(prev => prev ? { ...prev, photoURL: randomDiceBearUrl() } : prev); }}
                disabled={saving}
                className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                Randomize Avatar
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name — editable */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={form?.name ?? ''}
                onChange={e => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900">
                {data?.name || <span className="text-slate-400">—</span>}
              </div>
            )}
          </div>

          {/* Role — always read-only */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
              {display?.role || 'Administrator'}
            </div>
          </div>
        </div>

        {/* Email — always read-only */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900">
            {display?.email || <span className="text-slate-400">—</span>}
          </div>
        </div>
      </div>

      {/* Edit action buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleDiscard}
            disabled={saving}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Profile
          </button>
        </div>
      )}
    </div>
  );
}
