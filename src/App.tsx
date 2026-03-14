import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PeerGroups from './pages/PeerGroups';
import ChatMonitoring from './pages/ChatMonitoring';
import JournalInsights from './pages/JournalInsights';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import Settings from './pages/Settings';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/groups" element={<PeerGroups />} />
          <Route path="/chat" element={<ChatMonitoring />} />
          <Route path="/journals" element={<JournalInsights />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
