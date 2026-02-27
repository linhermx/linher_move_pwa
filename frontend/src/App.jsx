import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { NotificationProvider } from './context/NotificationContext';

import Login from './pages/Login';

const App = () => {
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

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              user ? (
                <div className="layout-container">
                  <Sidebar />
                  <main className="main-content">
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
