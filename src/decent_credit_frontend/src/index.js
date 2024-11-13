import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';  // 确保这行存在
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);