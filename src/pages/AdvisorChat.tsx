import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  User, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Circle,
  MessageSquare
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  doc,
  setDoc
} from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface Advisor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  specialization: string;
  status: 'online' | 'offline';
  lastSeen?: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

export default function AdvisorChat() {
  const { currentUser } = useAuth();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const q = query(collection(firestoreDb, 'advisors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        const dummyAdvisors: Advisor[] = [
          { id: 'adv-1', name: 'Dr. Sarah Chen', email: 'sarah.chen@example.com', specialization: 'Clinical Psychology', status: 'online' },
          { id: 'adv-2', name: 'Dr. James Wilson', email: 'james.wilson@example.com', specialization: 'CBT Specialist', status: 'offline' },
          { id: 'adv-3', name: 'Emma Watson', email: 'emma.w@example.com', specialization: 'Trauma Specialist', status: 'online' },
          { id: 'adv-4', name: 'Michael Scott', email: 'michael.s@example.com', specialization: 'Grief Counseling', status: 'offline' },
        ];
        setAdvisors(dummyAdvisors);
      } else {
        const advisorList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Advisor[];
        setAdvisors(advisorList);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching advisors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedAdvisor || !currentUser) return;

    const chatId = [currentUser.uid, selectedAdvisor.id].sort().join('_');
    const messagesQuery = query(
      collection(firestoreDb, 'advisor_chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedAdvisor, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedAdvisor || !currentUser) return;

    const chatId = [currentUser.uid, selectedAdvisor.id].sort().join('_');
    const chatRef = doc(firestoreDb, 'advisor_chats', chatId);
    const messageData = {
      text: newMessage.trim(),
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
    };

    try {
      await setDoc(chatRef, {
        participants: [currentUser.uid, selectedAdvisor.id],
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(firestoreDb, 'advisor_chats', chatId, 'messages'), messageData);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const filteredAdvisors = advisors.filter(advisor => 
    advisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    advisor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in zoom-in duration-500">
      {/* Sidebar: Advisors List */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Advisor Network</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search advisors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Loading...</p>
            </div>
          ) : filteredAdvisors.length > 0 ? (
            <div className="space-y-1">
              {filteredAdvisors.map(advisor => (
                <button
                  key={advisor.id}
                  onClick={() => setSelectedAdvisor(advisor)}
                  className={cn(
                    "w-full p-4 flex items-center gap-4 rounded-2xl transition-all duration-300 text-left group",
                    selectedAdvisor?.id === advisor.id 
                      ? "bg-white shadow-md shadow-indigo-100 ring-1 ring-slate-100" 
                      : "hover:bg-white/60"
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-transform duration-300 group-hover:scale-105",
                      selectedAdvisor?.id === advisor.id ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                    )}>
                      {advisor.name.charAt(0)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-slate-50",
                      advisor.status === 'online' ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-bold text-slate-900 truncate">{advisor.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate font-medium">{advisor.specialization}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Results</p>
            </div>
          )}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedAdvisor ? (
          <>
            {/* Chat Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-100">
                   {selectedAdvisor.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedAdvisor.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      selectedAdvisor.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {selectedAdvisor.status === 'online' ? 'Available' : 'Away'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                  <Video className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-slate-100 mx-2" />
                <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
              {messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col group animate-in slide-in-from-bottom-2 duration-300",
                        isMe ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300",
                        isMe 
                          ? "bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-700 shadow-indigo-100" 
                          : "bg-white text-slate-700 border border-slate-100 rounded-tl-none hover:border-slate-200"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl border border-slate-50 rotate-6">
                    <MessageSquare className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-black text-slate-900">Secure Consultation</h4>
                    <p className="text-sm text-slate-500 max-w-[240px]">This conversation is encrypted and private between you and the advisor.</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Share your thoughts..." 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={cn(
                    "p-4 rounded-2xl transition-all duration-300 shadow-lg",
                    newMessage.trim() 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-200" 
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/20">
            <div className="relative mb-8">
               <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl border border-slate-50 relative z-10 animate-pulse-slow">
                <User className="w-12 h-12 text-indigo-200" />
              </div>
              <div className="absolute -inset-4 bg-indigo-50 rounded-[3.5rem] -rotate-6 scale-95 opacity-50" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Connect with Advisors</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">Select a professional from the network to begin a secure consultation session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
