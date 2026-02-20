import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Fleet from './pages/Fleet';
import Settings from './pages/Settings';
import NewQuote from './pages/NewQuote';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import { NotificationProvider } from './context/NotificationContext';

// Placeholder Pages

function App() {
  return (
    <NotificationProvider>
      <Router>
        <div className="layout-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-quote" element={<NewQuote />} />
              <Route path="/history" element={<History />} />
              <Route path="/fleet" element={<Fleet />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;
