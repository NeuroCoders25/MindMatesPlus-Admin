import { collectionGroup, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  moodTag: string;
  date: Date;
  analysis: string | null;
  mlAnalysis: string | null;
}

export const journalService = {
  listenToJournals: (callback: (entries: JournalEntry[]) => void) => {
    const q = query(collectionGroup(db, 'journal_entries'));

    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        const raw = data.date;
        const date = raw instanceof Timestamp
          ? raw.toDate()
          : raw?.seconds
            ? new Date(raw.seconds * 1000)
            : new Date();

        return {
          id: doc.id,
          title: data.title ?? '',
          content: data.content ?? '',
          moodTag: data.mood_tag ?? '',
          date,
          analysis: data.analysis ?? null,
          mlAnalysis: data.ml_analysis ?? null,
        };
      });
      callback(entries.sort((a, b) => b.date.getTime() - a.date.getTime()));
    }, (error) => {
      console.error('Error fetching journals:', error);
    });
  },
};
