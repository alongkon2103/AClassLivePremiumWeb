import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { OverlayProvider } from './context/OverlayContext';
import { EventEngineProvider } from './context/EventEngineContext';
import { MinecraftProvider } from './context/MinecraftContext';
import { AdminProvider } from './context/AdminContext';
import { TikTokProvider } from './context/TikTokContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Mapping from './pages/Mapping';
import Preset from './pages/Preset';
import Interactive from './pages/Interactive';
import InteractiveMapping from './pages/InteractiveMapping';
import Announcements from './pages/Announcements';
import Minecraft from './pages/Minecraft';
import StreamOverlay from './pages/StreamOverlay';
import OverlayView from './pages/OverlayView';
import AppLayout from './components/AppLayout';
import React from 'react';
import { Toaster } from 'sonner';

// Auth Guard Component
const ProtectedRoute = () => {
  const token = localStorage.getItem('aclass_token');
  if (!token) {
    // Check if we are already on login to avoid loop
    if (window.location.pathname === '/login') return <Outlet />;
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// Simple Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error Boundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl font-bold text-red mb-4">Something went wrong</h1>
          <pre className="bg-surface p-4 rounded-xl text-xs overflow-auto max-w-full mb-4 text-left">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand rounded-lg font-bold"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  console.log('App.tsx: Rendering root...');
  return (
    <ErrorBoundary>
      <AdminProvider>
        <TikTokProvider>
          <OverlayProvider>
            <MinecraftProvider>
              <EventEngineProvider>
                <Router>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    {/* Protected App Shell Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/announcements" element={<Announcements />} />
                        <Route path="/mapping" element={<Mapping />} />
                        <Route path="/preset" element={<Preset />} />
                        <Route path="/interactive" element={<Interactive />} />
                        <Route path="/interactive-mapping" element={<InteractiveMapping />} />
                        <Route path="/minecraft" element={<Minecraft />} />
                        <Route path="/stream-overlay" element={<StreamOverlay />} />
                      </Route>
                    </Route>

                    {/* Standalone Routes */}
                    <Route path="/overlay-view" element={<OverlayView />} />
                    
                    <Route path="/" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Router>
                <Toaster theme="dark" position="top-right" closeButton richColors />
              </EventEngineProvider>
            </MinecraftProvider>
          </OverlayProvider>
        </TikTokProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}

export default App;
