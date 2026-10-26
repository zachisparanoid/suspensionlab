import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { readJson } from './store/storage';
import { KEYS } from './store/storage';

// Apply persisted theme before first paint to avoid a flash.
const theme = readJson<string>(KEYS.theme, 'dark');
document.documentElement.classList.toggle('light', theme === 'light');
document.documentElement.classList.toggle('dark', theme !== 'light');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
