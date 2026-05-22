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
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderRole: 'admin' | 'advisor';
  receiverId: string;
  messageText: string;
  messageType: 'text';
  createdAt: Timestamp | any;
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
  lastMessageAt: Timestamp | any;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
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
          [advisorId]: 'advisor'
        },
        chatType: 'admin_advisor',
        lastMessage: '',
        lastMessageSenderId: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(chatRef, chatData);
    }
    return chatId;
  },

  sendMessage: async (chatId: string, senderId: string, senderRole: 'admin' | 'advisor', receiverId: string, text: string) => {
    const messageData: Omit<ChatMessage, 'id'> = {
      senderId,
      senderRole,
      receiverId,
      messageText: text,
      messageType: 'text',
      createdAt: serverTimestamp(),
      isRead: false
    };

    // Add message to subcollection
    await addDoc(collection(db, 'privateChats', chatId, 'messages'), messageData);

    // Update parent chat document
    const chatRef = doc(db, 'privateChats', chatId);
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  listenToMessages: (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      callback(messages);
    });
  },

  listenToAdminChats: (adminId: string, callback: (chats: PrivateChat[]) => void) => {
    const q = query(
      collection(db, 'privateChats'),
      where('participants', 'array-contains', adminId),
      where('chatType', '==', 'admin_advisor'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PrivateChat[];
      callback(chats);
    });
  }
};
