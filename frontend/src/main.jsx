import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { installGlobalErrorLogging } from './services/clientLogger.js';
import { registerPwaServiceWorker } from './services/pwa.js';

installGlobalErrorLogging();
registerPwaServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary name="ApplicationRoot">
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
