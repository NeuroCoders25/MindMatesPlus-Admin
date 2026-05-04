import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Auth pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard pages
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PeerGroups from './pages/PeerGroups';
import ChatMonitoring from './pages/ChatMonitoring';
import AdvisorChat from './pages/AdvisorChat';
import JournalInsights from './pages/JournalInsights';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import Settings from './pages/Settings';

function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<SignIn />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected dashboard routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/groups" element={<PeerGroups />} />
                    <Route path="/chat" element={<ChatMonitoring />} />
                    <Route path="/advisor-chat" element={<AdvisorChat />} />
                    <Route path="/journals" element={<JournalInsights />} />
                    <Route path="/ai-insights" element={<AIInsights />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
