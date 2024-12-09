<<<<<<< HEAD
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';  // 确保这行存在
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
=======
// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import "@dfinity/auth-client/lib/cjs/index.js";


const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
>>>>>>> dec-test
  </React.StrictMode>
);