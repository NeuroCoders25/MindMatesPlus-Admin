import { collectionGroup, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FeedbackItem {
  id: string;
  appComment: string;
  peerComment: string;
  rating: number;
  date: Date;
}

export const feedbackService = {
  listenToFeedback: (callback: (feedback: FeedbackItem[]) => void) => {
    // collectionGroup queries users/{userId}/feedback across all users
    const q = query(collectionGroup(db, 'feedback'));

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        const raw = data.date;
        const date = raw instanceof Timestamp
          ? raw.toDate()
          : raw?.seconds
            ? new Date(raw.seconds * 1000)
            : new Date();

        return {
          id: doc.id,
          appComment: data.app_comment ?? '',
          peerComment: data.peer_comment ?? '',
          rating: typeof data.rating === 'number' ? Math.min(Math.max(data.rating, 0), 5) : 0,
          date,
        };
      });
      callback(items.sort((a, b) => b.date.getTime() - a.date.getTime()));
    }, (error) => {
      console.error('Error fetching feedback:', error);
    });
  },
};
