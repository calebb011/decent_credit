// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// 确保这个 ID 与你的 HTML 文件中的根元素 ID 匹配
const container = document.getElementById('root');
if (!container) {
    throw new Error('Could not find root element');
}

const root = createRoot(container);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);