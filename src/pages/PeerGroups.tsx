import React, { useState, useEffect, useRef } from 'react';
import { UsersRound, Activity, Plus, X, ImagePlus } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';
import { db, storage } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PeerGroup {
  id: string;
  name: string;
  category: string;
  members: number;
  activityLevel: 'High' | 'Medium' | 'Low';
  moderator: string;
  status: 'Active' | 'Archived';
}

interface FirestorePeerGroup {
  group_id: string;
  group_name: string;
  group_category: string;
  group_description: string;
  group_image_url: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

const GROUP_CATEGORIES = [
  'Moderate Support',
  'Mild Support',
  'Wellness - Thriving',
  'Wellness - Stress Aware',
  'Wellness - Emotionally Aware',
  'Recovery & Improvement',
];

const dummyGroups: PeerGroup[] = [
  { id: 'PG-001', name: 'Anxiety Support', category: 'Moderate Support', members: 125, activityLevel: 'High', moderator: 'Dr. Sarah Chen', status: 'Active' },
  { id: 'PG-002', name: 'Depression Support', category: 'Moderate Support', members: 90, activityLevel: 'Medium', moderator: 'Dr. James Wilson', status: 'Active' },
  { id: 'PG-003', name: 'Workplace Stress', category: 'Mild Support', members: 211, activityLevel: 'High', moderator: 'Emma Watson', status: 'Active' },
  { id: 'PG-004', name: 'Grief & Loss', category: 'Recovery & Improvement', members: 45, activityLevel: 'Low', moderator: 'Michael Scott', status: 'Active' },
  { id: 'PG-005', name: 'Post-Grad Life', category: 'Wellness - Stress Aware', members: 12, activityLevel: 'Medium', moderator: 'Sarah Miller', status: 'Active' },
  { id: 'PG-006', name: 'Mindfulness Practice', category: 'Wellness - Thriving', members: 340, activityLevel: 'High', moderator: 'Auto-Mod', status: 'Active' },
];

export default function PeerGroups() {
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [firestoreGroups, setFirestoreGroups] = useState<FirestorePeerGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGroups = async () => {
    try {
      const q = query(collection(db, 'peer_groups'), orderBy('created_at', 'asc'));
      const snapshot = await getDocs(q);
      setFirestoreGroups(snapshot.docs.map(doc => doc.data() as FirestorePeerGroup));
    } catch {
      // Silently fail — Firestore groups are supplementary to the table
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setGroupImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setModalError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setGroupName('');
    setGroupCategory('');
    setGroupDescription('');
    setGroupImage(null);
    setImagePreview(null);
    setModalError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !groupCategory) {
      setModalError('Group name and category are required.');
      return;
    }

    setSaving(true);
    setModalError('');

    try {
      const snapshot = await getDocs(collection(db, 'peer_groups'));
      const newId = `PG-${String(snapshot.size + 1).padStart(3, '0')}`;
      const now = Timestamp.now();

      let imageUrl = '';
      if (groupImage) {
        try {
          const storageRef = ref(storage, `group_images/${newId}`);
          await uploadBytes(storageRef, groupImage);
          imageUrl = await getDownloadURL(storageRef);
        } catch {
          setModalError('Image upload failed. Please try again.');
          setSaving(false);
          return;
        }
      }

      await addDoc(collection(db, 'peer_groups'), {
        group_id: newId,
        group_name: groupName.trim(),
        group_category: groupCategory,
        group_description: groupDescription.trim(),
        group_image_url: imageUrl,
        created_at: now,
        updated_at: now,
      });

      handleCloseModal();
      await fetchGroups();
      setSuccessMessage(`Group "${groupName.trim()}" (${newId}) created successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setModalError('Failed to save the group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: 'Group Name',
      accessor: (group: PeerGroup) => (
        <div>
          <p className="font-bold text-slate-900">{group.name}</p>
          <p className="text-xs text-slate-400">{group.id}</p>
        </div>
      ),
    },
    { header: 'Category', accessor: 'category' as keyof PeerGroup },
    {
      header: 'Members',
      accessor: (group: PeerGroup) => (
        <div className="flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{group.members}</span>
        </div>
      ),
    },
    {
      header: 'Activity',
      accessor: (group: PeerGroup) => (
        <div className="flex items-center gap-2">
          <Activity className={cn(
            'w-4 h-4',
            group.activityLevel === 'High' ? 'text-emerald-500' :
            group.activityLevel === 'Medium' ? 'text-amber-500' :
            'text-slate-400'
          )} />
          <span className="text-xs font-medium">{group.activityLevel}</span>
        </div>
      ),
    },
    { header: 'Moderator', accessor: 'moderator' as keyof PeerGroup },
    {
      header: 'Status',
      accessor: (group: PeerGroup) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
          group.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
        )}>
          {group.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: () => (
        <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider">
          Manage
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Peer Groups</h2>
          <p className="text-slate-500">Monitor community engagement and group health.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Group
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Most Active</p>
          <h4 className="text-lg font-bold text-slate-900">Mindfulness Practice</h4>
          <p className="text-xs text-slate-500 mt-1">1,240 messages in the last 24h</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fastest Growing</p>
          <h4 className="text-lg font-bold text-slate-900">Post-Grad Life</h4>
          <p className="text-xs text-slate-500 mt-1">+45% members this week</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Needs Attention</p>
          <h4 className="text-lg font-bold text-slate-900">Grief & Loss</h4>
          <p className="text-xs text-slate-500 mt-1">Low activity detected (3 days)</p>
        </div>
      </div>

      {/* Firestore-created groups list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Created Groups</h3>
            <p className="text-xs text-slate-400 mt-0.5">Groups added through the admin panel</p>
          </div>
          {!loadingGroups && (
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
              {firestoreGroups.length} {firestoreGroups.length === 1 ? 'group' : 'groups'}
            </span>
          )}
        </div>

        {loadingGroups ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">Loading groups...</div>
        ) : firestoreGroups.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-500">No groups created yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create New Group" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {firestoreGroups.map((group) => (
              <div
                key={group.group_id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* Group image thumbnail */}
                {group.group_image_url ? (
                  <img
                    src={group.group_image_url}
                    alt={group.group_name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-slate-200">
                    <UsersRound className="w-5 h-5 text-indigo-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{group.group_name}</p>
                  <p className="text-xs text-slate-400 font-mono">{group.group_id}</p>
                  {group.group_description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{group.group_description}</p>
                  )}
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                  {group.group_category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All groups data table */}
      <DataTable columns={columns} data={dummyGroups} />

      {/* Create Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Group</h3>
                <p className="text-xs text-slate-500 mt-0.5">Add a new peer support group to the system.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inline error */}
            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
                {modalError}
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Recovery Resilience Circle"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              />
            </div>

            {/* Group Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={groupCategory}
                onChange={(e) => setGroupCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              >
                <option value="">Select a category...</option>
                {GROUP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Group Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Description
                <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Briefly describe the purpose and focus of this group..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              />
            </div>

            {/* Group Image Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Image
                <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
              </label>

              {imagePreview ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-white rounded-full shadow text-slate-600 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors bg-slate-50 hover:bg-indigo-50/30"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs font-medium">Click to upload image</span>
                  <span className="text-[10px]">PNG, JPG, WEBP up to 5MB</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={saving}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
                  saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
