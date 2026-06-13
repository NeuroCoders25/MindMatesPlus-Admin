import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  twoFactorAuth: boolean;
  notifications: {
    emailDistressAlerts: boolean;
    emailPerformanceSummary: boolean;
    emailRegistrationNotifications: boolean;
  };
}

export const DEFAULT_SETTINGS: SystemSettings = {
  platformName: 'MindMates+',
  supportEmail: 'support@mindmates.plus',
  maintenanceMode: false,
  twoFactorAuth: true,
  notifications: {
    emailDistressAlerts: true,
    emailPerformanceSummary: true,
    emailRegistrationNotifications: false,
  },
};

const SETTINGS_DOC = doc(db, 'systemSettings', 'global');

export const settingsService = {
  listenToSettings: (
    callback: (settings: SystemSettings) => void,
    onError?: () => void,
  ) => {
    return onSnapshot(
      SETTINGS_DOC,
      (snap) => {
        callback(snap.exists() ? (snap.data() as SystemSettings) : DEFAULT_SETTINGS);
      },
      () => onError?.(),
    );
  },

  saveSettings: async (settings: SystemSettings): Promise<void> => {
    await setDoc(SETTINGS_DOC, settings, { merge: true });
  },

  resetAdminPasswords: async (): Promise<number> => {
    const q = query(collection(db, 'admins'), where('role', '==', 'admin'));
    const snap = await getDocs(q);
    const emails: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.email) emails.push(data.email as string);
    });

    // Fall back to current user if no admins collection found
    if (emails.length === 0 && auth.currentUser?.email) {
      emails.push(auth.currentUser.email);
    }

    await Promise.all(emails.map((email) => sendPasswordResetEmail(auth, email)));
    return emails.length;
  },
};
