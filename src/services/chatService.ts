import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { encryptText, decryptBatch, safeText, type EncryptedMessage } from './cryptoService';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderRole: 'admin' | 'advisor';
  receiverId: string;
  messageText: string;
  messageType: 'text';
  createdAt: Timestamp | unknown;
  isRead: boolean;
}

export interface PrivateChat {
  id?: string;
  participants: string[];
  participantRoles: {
    [key: string]: 'admin' | 'advisor';
  };
  chatType: 'admin_advisor';
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp | unknown;
  createdAt: Timestamp | unknown;
  updatedAt: Timestamp | unknown;
}

export const chatService = {
  getChatId: (adminId: string, advisorId: string) => {
    return `${adminId}_${advisorId}`;
  },

  getOrCreateChat: async (adminId: string, advisorId: string) => {
    const chatId = chatService.getChatId(adminId, advisorId);
    const chatRef = doc(db, 'privateChats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      const chatData: Omit<PrivateChat, 'id'> = {
        participants: [adminId, advisorId],
        participantRoles: {
          [adminId]: 'admin',
          [advisorId]: 'advisor',
        },
        chatType: 'admin_advisor',
        lastMessage: '',
        lastMessageSenderId: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(chatRef, chatData);
    }
    return chatId;
  },

  sendMessage: async (
    chatId: string,
    senderId: string,
    senderRole: 'admin' | 'advisor',
    receiverId: string,
    text: string,
  ) => {
    const encryptedText = await encryptText(text);

    await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      senderId,
      senderRole,
      receiverId,
      messageText: encryptedText,
      messageType: 'text',
      createdAt: serverTimestamp(),
      isRead: false,
    });

    await updateDoc(doc(db, 'privateChats', chatId), {
      lastMessage: encryptedText,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  listenToMessages: (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    let isDecrypting = false;
    return onSnapshot(q, async (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<
        Omit<ChatMessage, 'messageText'> & { messageText: EncryptedMessage | string }
      >;

      // Interim: guarantee React never receives a raw object
      callback(docs.map(d => ({ ...d, messageText: safeText(d.messageText) })));

      if (isDecrypting) return;
      isDecrypting = true;
      try {
        const decrypted = await decryptBatch(docs.map(d => d.messageText));
        callback(docs.map((d, i) => ({ ...d, messageText: decrypted[i] ?? '' })));
      } catch (err) {
        console.warn('Decrypt failed in listenToMessages:', err);
      } finally {
        isDecrypting = false;
      }
    });
  },

  listenToAdminChats: (adminId: string, callback: (chats: PrivateChat[]) => void) => {
    const q = query(
      collection(db, 'privateChats'),
      where('participants', 'array-contains', adminId),
      where('chatType', '==', 'admin_advisor'),
      orderBy('updatedAt', 'desc'),
    );

    let isDecrypting = false;
    return onSnapshot(q, async (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<
        Omit<PrivateChat, 'lastMessage'> & { lastMessage: EncryptedMessage | string }
      >;

      // Interim: guarantee React never receives a raw object
      callback(docs.map(d => ({ ...d, lastMessage: safeText(d.lastMessage) })));

      if (isDecrypting) return;
      isDecrypting = true;
      try {
        const decrypted = await decryptBatch(docs.map(d => d.lastMessage));
        callback(docs.map((d, i) => ({ ...d, lastMessage: decrypted[i] ?? '' })));
      } catch (err) {
        console.warn('Decrypt failed in listenToAdminChats:', err);
      } finally {
        isDecrypting = false;
      }
    });
  },
};
