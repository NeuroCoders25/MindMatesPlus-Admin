import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UsersRound, Activity, Plus, X, ImagePlus, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import DataTable from '../components/DataTable';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { uploadImageToImageKit } from '../services/imageUploadService';

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
  docId: string;
  group_id: string;
  group_name: string;
  group_category: string;
  group_description: string;
  group_image_url: string;
  group_moderator: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface ModeratorOption {
  uid: string;
  name: string;
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
  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupModerator, setGroupModerator] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [firestoreGroups, setFirestoreGroups] = useState<FirestorePeerGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<FirestorePeerGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FirestorePeerGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editModerator, setEditModerator] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Moderators list from Firestore advisors
  const [moderators, setModerators] = useState<ModeratorOption[]>([]);

  // Real member counts per group_id from groupMembers collection
  const [groupMemberCounts, setGroupMemberCounts] = useState<Record<string, number>>({});

  // Real message/chat activity counts per group_id from advisorGroupPrivateChats
  const [groupMessageCounts, setGroupMessageCounts] = useState<Record<string, number>>({});
  // Timestamp of most recent message per group_id
  const [groupLastMessageAt, setGroupLastMessageAt] = useState<Record<string, number>>({});

  useEffect(() => {
    const q = query(collection(db, 'peer_groups'), orderBy('created_at', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFirestoreGroups(snapshot.docs.map(d => ({ ...d.data(), docId: d.id } as FirestorePeerGroup)));
        setLoadingGroups(false);
      },
      () => {
        setLoadingGroups(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'advisors'), (snapshot) => {
      const list: ModeratorOption[] = snapshot.docs
        .filter((d) => d.data().isModerator === true)
        .map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name: data.name ?? data.displayName ?? data.email ?? d.id,
          };
        });
      setModerators(list);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to groupMembers to get real member counts per group
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groupMembers'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const gid = data.group_id ?? data.groupId ?? data.peer_group_id;
        if (gid) counts[gid] = (counts[gid] ?? 0) + 1;
      });
      setGroupMemberCounts(counts);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to advisorGroupPrivateChats for real message activity per group
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'advisorGroupPrivateChats'), (snapshot) => {
      const counts: Record<string, number> = {};
      const lastAt: Record<string, number> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        // group_id stored as field, or fall back to the document id itself
        const gid = data.group_id ?? data.groupId ?? data.peer_group_id ?? d.id;
        if (!gid) return;
        counts[gid] = (counts[gid] ?? 0) + 1;
        // Track most recent message timestamp for activity recency
        const msgTs: number =
          data.lastMessageAt?.toMillis?.() ??
          data.createdAt?.toMillis?.() ??
          data.timestamp?.toMillis?.() ??
          0;
        if (msgTs > (lastAt[gid] ?? 0)) lastAt[gid] = msgTs;
      });
      setGroupMessageCounts(counts);
      setGroupLastMessageAt(lastAt);
    });
    return () => unsubscribe();
  }, []);

  const tableGroups = useMemo((): PeerGroup[] => {
    const now = Date.now();
    return firestoreGroups.map((g) => {
      const memberCount = groupMemberCounts[g.group_id] ?? 0;
      const messageCount = groupMessageCounts[g.group_id] ?? 0;
      const lastMsgMs = groupLastMessageAt[g.group_id] ?? 0;
      const daysSinceMsg = lastMsgMs > 0 ? Math.floor((now - lastMsgMs) / 86_400_000) : Infinity;

      let activityLevel: 'High' | 'Medium' | 'Low';
      if (messageCount >= 5 && daysSinceMsg <= 14) activityLevel = 'High';
      else if (messageCount >= 1 && daysSinceMsg <= 30) activityLevel = 'Medium';
      else activityLevel = 'Low';

      const moderatorEntry = moderators.find((m) => m.uid === g.group_moderator);
      const moderatorName = moderatorEntry?.name ?? g.group_moderator ?? 'Auto-Mod';

      return {
        id: g.group_id,
        name: g.group_name,
        category: g.group_category,
        members: memberCount,
        activityLevel,
        moderator: moderatorName || 'Auto-Mod',
        status: 'Active',
      };
    });
  }, [firestoreGroups, groupMemberCounts, groupMessageCounts, groupLastMessageAt, moderators]);

  const summaryStats = useMemo(() => {
    if (firestoreGroups.length === 0) return null;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86_400_000;

    // Enrich every group with real member count + real message activity
    const enriched = firestoreGroups.map((g) => ({
      ...g,
      memberCount: groupMemberCounts[g.group_id] ?? 0,
      messageCount: groupMessageCounts[g.group_id] ?? 0,
      lastMsgMs: groupLastMessageAt[g.group_id] ?? 0,
    }));

    // ── Most Active ───────────────────────────────────────────────────────────
    // Rank by message count first (real engagement), then member count.
    // Groups with 0 members AND 0 messages are excluded from this slot.
    const engagedGroups = enriched.filter((g) => g.memberCount > 0 || g.messageCount > 0);
    const mostActive = engagedGroups.length > 0
      ? [...engagedGroups].sort((a, b) =>
          b.messageCount !== a.messageCount
            ? b.messageCount - a.messageCount
            : b.memberCount - a.memberCount
        )[0]
      : null;

    // ── Fastest Growing ───────────────────────────────────────────────────────
    // Among groups that actually have members, prefer those created recently
    // (last 30 days) with the most members = fastest accumulation.
    // If no group has members at all, fall back to null.
    const groupsWithMembers = enriched.filter((g) => g.memberCount > 0);
    const recentWithMembers = groupsWithMembers.filter(
      (g) => (g.created_at?.toMillis?.() ?? 0) >= thirtyDaysAgo
    );
    const fastestPool = recentWithMembers.length > 0 ? recentWithMembers : groupsWithMembers;
    const fastestGrowing = fastestPool.length > 0
      ? [...fastestPool].sort((a, b) => b.memberCount - a.memberCount)[0]
      : null;
    const fastestCreatedMs = fastestGrowing?.created_at?.toMillis?.() ?? now;
    const fastestDaysAgo = Math.floor((now - fastestCreatedMs) / 86_400_000);

    // ── Needs Attention ───────────────────────────────────────────────────────
    // Lowest composite score: 0-member and 0-message groups rank first.
    // Among ties, oldest last-activity timestamp wins (most neglected).
    const needsAttention = [...enriched].sort((a, b) => {
      const scoreA = a.memberCount * 10 + a.messageCount;
      const scoreB = b.memberCount * 10 + b.messageCount;
      if (scoreA !== scoreB) return scoreA - scoreB;
      const aLastMs = a.lastMsgMs || a.updated_at?.toMillis?.() || a.created_at?.toMillis?.() || 0;
      const bLastMs = b.lastMsgMs || b.updated_at?.toMillis?.() || b.created_at?.toMillis?.() || 0;
      return aLastMs - bLastMs;
    })[0];

    const attentionLastMs =
      needsAttention.lastMsgMs ||
      needsAttention.updated_at?.toMillis?.() ||
      needsAttention.created_at?.toMillis?.() ||
      now;
    const daysInactive = Math.floor((now - attentionLastMs) / 86_400_000);

    return {
      mostActive,
      fastestGrowing,
      fastestDaysAgo,
      needsAttention,
      daysInactive,
    };
  }, [firestoreGroups, groupMemberCounts, groupMessageCounts, groupLastMessageAt]);

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

  const handleDeleteClick = (group: FirestorePeerGroup) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setGroupToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'peer_groups', groupToDelete.docId));
      setShowDeleteModal(false);
      setGroupToDelete(null);
      setSuccessMessage(`Group "${groupToDelete.group_name}" has been deleted.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setShowDeleteModal(false);
      setGroupToDelete(null);
    } finally {
      setDeleting(false);
    }
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
    setGroupModerator('');
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
          setUploading(true);
          imageUrl = await uploadImageToImageKit(groupImage, 'peer_groups');
        } catch {
          setModalError('Image upload failed. Please try again.');
          setSaving(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      await addDoc(collection(db, 'peer_groups'), {
        group_id: newId,
        group_name: groupName.trim(),
        group_category: groupCategory,
        group_description: groupDescription.trim(),
        group_image_url: imageUrl,
        group_moderator: groupModerator,
        created_at: now,
        updated_at: now,
      });

      handleCloseModal();
      setSuccessMessage(`Group "${groupName.trim()}" (${newId}) created successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setModalError('Failed to save the group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (group: FirestorePeerGroup) => {
    setEditingGroup(group);
    setEditName(group.group_name);
    setEditDescription(group.group_description ?? '');
    setEditModerator(group.group_moderator ?? '');
    setEditImage(null);
    setEditImagePreview(group.group_image_url || null);
    setEditError('');
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    if (editSaving || editUploading) return;
    setShowEditModal(false);
    setEditingGroup(null);
    setEditImage(null);
    setEditImagePreview(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImage(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleSaveEdit = async () => {
    if (!editingGroup || !editName.trim()) {
      setEditError('Group name is required.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      let imageUrl = editingGroup.group_image_url;
      if (editImage) {
        try {
          setEditUploading(true);
          imageUrl = await uploadImageToImageKit(editImage, 'peer_groups');
        } catch {
          setEditError('Image upload failed. Please try again.');
          setEditSaving(false);
          setEditUploading(false);
          return;
        } finally {
          setEditUploading(false);
        }
      } else if (!editImagePreview) {
        imageUrl = '';
      }
      await updateDoc(doc(db, 'peer_groups', editingGroup.docId), {
        group_name: editName.trim(),
        group_description: editDescription.trim(),
        group_image_url: imageUrl,
        group_moderator: editModerator,
        updated_at: Timestamp.now(),
      });
      handleCloseEditModal();
      setSuccessMessage(`Group "${editName.trim()}" updated successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditSaving(false);
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
      accessor: (group: PeerGroup) => (
        <button
          onClick={() => {
            const fg = firestoreGroups.find((g) => g.group_id === group.id);
            if (fg) handleEditClick(fg);
          }}
          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider"
        >
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
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loadingGroups ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
              <div className="h-2.5 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
              <div className="h-2.5 bg-slate-100 rounded w-32" />
            </div>
          ))
        ) : summaryStats ? (
          <>
            {/* Most Active */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Most Active</p>
              {summaryStats.mostActive ? (
                <>
                  <h4 className="text-lg font-bold text-slate-900">{summaryStats.mostActive.group_name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {summaryStats.mostActive.messageCount} message{summaryStats.mostActive.messageCount !== 1 ? 's' : ''}
                    {' · '}
                    {summaryStats.mostActive.memberCount} member{summaryStats.mostActive.memberCount !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-slate-400 italic">No activity yet</h4>
                  <p className="text-xs text-slate-400 mt-1">Groups need members to rank here</p>
                </>
              )}
            </div>

            {/* Fastest Growing */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fastest Growing</p>
              {summaryStats.fastestGrowing ? (
                <>
                  <h4 className="text-lg font-bold text-slate-900">{summaryStats.fastestGrowing.group_name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {summaryStats.fastestDaysAgo === 0
                      ? 'Created today'
                      : summaryStats.fastestDaysAgo === 1
                      ? 'Created yesterday'
                      : `Created ${summaryStats.fastestDaysAgo} days ago`}
                    {' · '}
                    {summaryStats.fastestGrowing.memberCount} member{summaryStats.fastestGrowing.memberCount !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-slate-400 italic">No members yet</h4>
                  <p className="text-xs text-slate-400 mt-1">Invite users to groups to track growth</p>
                </>
              )}
            </div>

            {/* Needs Attention */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Needs Attention</p>
              <h4 className="text-lg font-bold text-slate-900">{summaryStats.needsAttention.group_name}</h4>
              <p className="text-xs text-slate-500 mt-1">
                {summaryStats.needsAttention.memberCount} member{summaryStats.needsAttention.memberCount !== 1 ? 's' : ''}
                {' · '}
                {summaryStats.needsAttention.messageCount === 0
                  ? 'No messages yet'
                  : `${summaryStats.needsAttention.messageCount} message${summaryStats.needsAttention.messageCount !== 1 ? 's' : ''}`}
                {summaryStats.daysInactive > 0 && ` · inactive ${summaryStats.daysInactive} day${summaryStats.daysInactive !== 1 ? 's' : ''}`}
              </p>
            </div>
          </>
        ) : (
          <div className="col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center text-sm text-slate-400">
            No groups yet — create one to see analytics.
          </div>
        )}
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
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleEditClick(group)}
              >
                {/* Group image thumbnail */}
                {group.group_image_url ? (
                  <img
                    src={group.group_image_url}
                    alt={group.group_name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-slate-200">
                    <UsersRound className="w-5 h-5 text-indigo-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{group.group_name}</p>
                  <p className="text-xs text-slate-400 font-mono">{group.group_id}</p>
                  {group.group_description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{group.group_description}</p>
                  )}
                  {group.group_moderator && (
                    <p className="text-xs text-indigo-500 mt-0.5">Moderator: {group.group_moderator}</p>
                  )}
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider whitespace-nowrap shrink-0">
                  {group.group_category}
                </span>

                <button
                  onClick={(e) => { e.stopPropagation(); handleEditClick(group); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors shrink-0"
                  title="Edit group"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(group); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                  title="Delete group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All groups data table */}
      {loadingGroups ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-8 text-center text-sm text-slate-400">
          Loading groups...
        </div>
      ) : (
        <DataTable columns={columns} data={tableGroups} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Group</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-slate-800">{groupToDelete.group_name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{groupToDelete.group_id}</p>
              {groupToDelete.group_description && (
                <p className="text-xs text-slate-500 mt-1">{groupToDelete.group_description}</p>
              )}
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete this group? All group data will be removed from the database.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
                  deleting ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {deleting ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Group</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update group info — <span className="font-medium">{editingGroup.group_id}</span>
                </p>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
                {editError}
              </div>
            )}

            {/* Read-only category badge */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group Category</label>
              <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 select-none">
                {editingGroup.group_category}
              </div>
            </div>

            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              />
            </div>

            {/* Group Moderator */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Admin (Moderator)
                <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <select
                value={editModerator}
                onChange={(e) => setEditModerator(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              >
                <option value="">Select a moderator...</option>
                {moderators.map((m) => (
                  <option key={m.uid} value={m.name}>{m.name}</option>
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
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              />
            </div>

            {/* Group Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Image
                <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              {editImagePreview ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveEditImage}
                    className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-white rounded-full shadow text-slate-600 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors bg-slate-50 hover:bg-indigo-50/30"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs font-medium">Click to upload image</span>
                  <span className="text-[10px]">PNG, JPG, WEBP up to 5MB</span>
                </button>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleEditImageChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCloseEditModal}
                disabled={editSaving || editUploading}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || editUploading}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
                  editSaving || editUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {editUploading ? 'Uploading...' : editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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

            {/* Group Moderator */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Admin (Moderator)
                <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <select
                value={groupModerator}
                onChange={(e) => setGroupModerator(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
              >
                <option value="">Select a moderator...</option>
                {moderators.map((m) => (
                  <option key={m.uid} value={m.name}>{m.name}</option>
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
                disabled={saving || uploading}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
                  saving || uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {uploading ? 'Uploading...' : saving ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
