import { HashRouter, BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

const Router = import.meta.env.BASE_URL === '/AYU-Colorize-X/' ? HashRouter : BrowserRouter;
import { Component, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import axios from './lib/axios';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PhotoEditor from './pages/PhotoEditor';
import VideoEditor from './pages/VideoEditor';
import EnhancePage from './pages/EnhancePage';
import BGRemovePage from './pages/BGRemovePage';
import InpaintPage from './pages/InpaintPage';
import DamageRestorePage from './pages/DamageRestorePage';

import History from './pages/History';
import Settings from './pages/Settings';
import Plans from './pages/Plans';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminJobs from './pages/Admin/Jobs';
import AdminSettings from './pages/Admin/Settings';
import Presentation from './pages/Presentation';
import PresentationKz from './pages/PresentationKz';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gradient mb-4">Oops!</h1>
            <p className="text-muted mb-6">Something went wrong. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-3"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Announcement Banner Component
function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/admin/system/public-settings');
        if (res.data.announcement) {
          setAnnouncement(res.data.announcement);
        }
      } catch {
        // silently ignore
      }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!announcement || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] text-white px-4 py-2.5 text-center text-sm font-medium z-50">
      <span>{announcement}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// Maintenance Mode Page
function MaintenancePage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-background))] p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-danger))] to-[rgb(248,150,113)] flex items-center justify-center" style={{ boxShadow: '0 8px 32px rgb(var(--color-danger) / 0.3)' }}>
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86l-8.4 14c-.6 1.02.15 2.14 1.29 2.14h16.64c1.14 0 1.89-1.12 1.29-2.14l-8.4-14c-.6-1.03-2.12-1.03-2.72 0z" /></svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-gradient mb-3">{t('common.maintenanceTitle')}</h1>
        <p className="text-[rgb(var(--color-text-muted))] mb-6">
          {t('common.maintenanceDesc')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-3"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    </div>
  );
}

// Layout Component
function Layout() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await axios.get('/admin/system/public-settings');
        setMaintenance(res.data.maintenance_mode);
      } catch {
        // silently ignore
      }
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 15000);
    return () => clearInterval(interval);
  }, []);

  // Show maintenance page for non-admin users
  if (maintenance && user?.role !== 'ADMIN') {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        <AnnouncementBanner />
        <Outlet />
      </main>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

// Public Route Component
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <Navigate to="/" /> : children;
}

// Admin Route Component - requires ADMIN role
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
}

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Routes>


              {/* Public Routes */}
              <Route path="/presentation" element={<Presentation />} />
              <Route path="/presentation-kz" element={<PresentationKz />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected Routes with Layout */}
              <Route element={<Layout />}>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={<Navigate to="/" replace />}
                />
                <Route
                  path="/photo"
                  element={
                    <ProtectedRoute>
                      <PhotoEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/video"
                  element={
                    <ProtectedRoute>
                      <VideoEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/enhance"
                  element={
                    <ProtectedRoute>
                      <EnhancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/restore"
                  element={
                    <ProtectedRoute>
                      <EnhancePage initialMode="restore" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upscale"
                  element={
                    <ProtectedRoute>
                      <EnhancePage initialMode="upscale" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bg-remove"
                  element={
                    <ProtectedRoute>
                      <BGRemovePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inpaint"
                  element={
                    <ProtectedRoute>
                      <InpaintPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/damage-restore"
                  element={
                    <ProtectedRoute>
                      <DamageRestorePage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="jobs" element={<AdminJobs />} />
                  <Route path="settings" element={<AdminSettings />} />
                  {/* Redirect system to dashboard for now as it's part of dashboard */}
                  <Route path="system" element={<Navigate to="/admin" replace />} />
                </Route>

                {/* Legacy route redirect */}
                <Route
                  path="/editor"
                  element={<Navigate to="/photo" replace />}
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <History />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/plans"
                  element={
                    <ProtectedRoute>
                      <Plans />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
