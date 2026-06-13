import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdvisorData {
  id: string;
  name: string;
  email: string;
  title: string;
  yearsOfExperience: number | string;
  qualifications: string;
  about: string;
  profileImageUrl: string;
  isModerator: boolean;
  specialization?: string;
}

export default function AdvisorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [advisor, setAdvisor] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No advisor ID provided.');
      setLoading(false);
      return;
    }
    fetchAdvisor(id);
  }, [id]);

  async function fetchAdvisor(advisorId: string) {
    try {
      const snap = await getDoc(doc(db, 'advisors', advisorId));
      if (!snap.exists()) {
        setError('Advisor not found.');
        setLoading(false);
        return;
      }
      const data = snap.data();
      setAdvisor({
        id: snap.id,
        name: data.name || '',
        email: data.email || '',
        title: data.title || data.specialization || '',
        yearsOfExperience: data.yearsOfExperience ?? '',
        qualifications: data.qualifications || '',
        about: data.about || '',
        profileImageUrl: data.profileImageUrl || '',
        isModerator: data.isModerator ?? false,
        specialization: data.specialization,
      });
    } catch (err) {
      console.error('Error fetching advisor:', err);
      setError('Failed to load advisor profile.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !advisor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">{error ?? 'Advisor not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-indigo-600 text-sm underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <User className="w-7 h-7 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Advisor Profile</h2>
          <p className="text-sm text-slate-500">
            Professional credentials, qualifications, and peer group moderation status.
          </p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h3 className="text-base font-bold text-slate-900">Profile Information</h3>

        {/* Photo */}
        <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
          {advisor.profileImageUrl ? (
            <img src={advisor.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-indigo-50">
              <User className="w-8 h-8 text-indigo-300" />
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Full Name" value={advisor.name} />
          <Field label="Title" value={advisor.title} />
        </div>

        <Field label="Email Address" value={advisor.email} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Years of Experience" value={String(advisor.yearsOfExperience)} />
          <Field label="Qualifications" value={advisor.qualifications} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">About</label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 min-h-[96px]">
            {advisor.about || <span className="text-slate-400">No description provided.</span>}
          </div>
        </div>

        {/* Moderator toggle (read-only) */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Act as Peer Group Moderator</p>
              <p className="text-xs text-slate-500">
                By enabling this, you consent to being assigned as a moderator in peer support groups. You can opt out at any time.
              </p>
            </div>
          </div>
          <div
            className={`relative inline-flex w-12 h-6 rounded-full cursor-default ${
              advisor.isModerator ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                advisor.isModerator ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}
