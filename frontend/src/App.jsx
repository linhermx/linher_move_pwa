import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import './index.css';
import Sidebar from './components/Sidebar';
import Fleet from './pages/Fleet';
import Services from './pages/Services';
import Settings from './pages/Settings';
import NewQuote from './pages/NewQuote';
import History from './pages/History';
import QuoteDetail from './pages/QuoteDetail';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Backups from './pages/Backups';
import Reports from './pages/Reports';
import { NotificationProvider } from './context/NotificationContext';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { ConnectivityOfflineView } from './components/ConnectivityFallback';
import useConnectivityStatus from './hooks/useConnectivityStatus';
import ProtectedRoute from './components/ProtectedRoute';
import { clearSession, getSessionToken, getSessionUser } from './utils/session';

import Login from './pages/Login';

const App = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const {
    isOffline,
    isCheckingConnection,
    showRecoveryNotice,
    retryConnection
  } = useConnectivityStatus();
  const shouldShowConnectivityScreen = isOffline || showRecoveryNotice;
  const connectivityPhase = isOffline ? 'offline' : 'reconnecting';

  const getUser = () => {
    try {
      const user = getSessionUser();
      const token = getSessionToken();
      if (!user || !token) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      clearSession();
      return null;
    }
  };


  const user = getUser();

  useEffect(() => {
    document.body.classList.toggle('sidebar-drawer-open', isMobileSidebarOpen);

    return () => {
      document.body.classList.remove('sidebar-drawer-open');
    };
  }, [isMobileSidebarOpen]);

  return (
    <NotificationProvider>
      <Router>
        <a href="#app-main" className="skip-link">Saltar al contenido principal</a>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              user ? (
                <div className="layout-container">
                  <Sidebar
                    isMobileOpen={isMobileSidebarOpen}
                    onRequestCloseMobile={() => setIsMobileSidebarOpen(false)}
                  />
                  {!isMobileSidebarOpen ? (
                    <button
                      type="button"
                      className="app-shell__mobile-trigger"
                      aria-label="Abrir menu de navegacion"
                      aria-controls="app-sidebar"
                      aria-expanded={false}
                      onClick={() => setIsMobileSidebarOpen(true)}
                    >
                      <Menu size={20} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`sidebar-scrim ${isMobileSidebarOpen ? 'sidebar-scrim--visible' : ''}`.trim()}
                    aria-label="Cerrar navegacion"
                    tabIndex={isMobileSidebarOpen ? 0 : -1}
                    onClick={() => setIsMobileSidebarOpen(false)}
                  />
                  <main id="app-main" className="main-content" tabIndex="-1">
                    {shouldShowConnectivityScreen ? (
                      <ConnectivityOfflineView
                        phase={connectivityPhase}
                        onRetry={retryConnection}
                        isCheckingConnection={isCheckingConnection}
                      />
                    ) : (
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route
                          path="/new-quote"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="create_quotation">
                              <NewQuote />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/history"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="view_history">
                              <History />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/history/:id"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="view_history">
                              <QuoteDetail />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/fleet"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="manage_fleet">
                              <Fleet />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/services"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="manage_services">
                              <Services />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/users"
                          element={(
                            <ProtectedRoute user={user} requiredRole="admin">
                              <Users />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/audit"
                          element={(
                            <ProtectedRoute user={user} requiredRole="admin">
                              <AuditLogs />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/settings"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="edit_settings">
                              <Settings />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/backups"
                          element={(
                            <ProtectedRoute user={user} requiredRole="admin">
                              <Backups />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/reports"
                          element={(
                            <ProtectedRoute user={user} requiredPermission="view_reports">
                              <Reports />
                            </ProtectedRoute>
                          )}
                        />
                      </Routes>
                    )}
                  </main>
                </div>
              ) : (
                <Login />
              )
            }
          />
        </Routes>
        {!shouldShowConnectivityScreen && user ? <PwaInstallPrompt /> : null}
      </Router>
    </NotificationProvider>
  );
};

export default App;
