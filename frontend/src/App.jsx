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
import { NotificationProvider } from './context/NotificationContext';

import Login from './pages/Login';

const App = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const getUser = () => {
    try {
      // Check localStorage first (remember me = on), then sessionStorage (remember me = off)
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
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
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/new-quote" element={<NewQuote />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/history/:id" element={<QuoteDetail />} />
                      <Route path="/fleet" element={<Fleet />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/audit" element={<AuditLogs />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/backups" element={<Backups />} />
                    </Routes>
                  </main>
                </div>
              ) : (
                <Login />
              )
            }
          />
        </Routes>
      </Router>
    </NotificationProvider>
  );
};

export default App;
