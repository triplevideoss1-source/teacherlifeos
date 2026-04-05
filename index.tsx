import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerAppServiceWorker } from './services/notifications';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

registerAppServiceWorker().catch((error) => {
  console.error('Service worker registration failed:', error);
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);