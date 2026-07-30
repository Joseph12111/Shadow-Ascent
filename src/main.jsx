import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import './styles/index.css';

const rootElement = document?.getElementById?.('root');

if (import.meta.env?.PROD && 'serviceWorker' in (globalThis?.navigator || {})) {
  globalThis?.addEventListener?.('load', () => {
    try {
      globalThis?.navigator?.serviceWorker
        ?.register?.('/service-worker.js', { scope: '/' })
        ?.catch?.(() => undefined);
    } catch {
      return;
    }
  });
}

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
