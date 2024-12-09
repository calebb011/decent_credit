import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import AdminLogin from './components/AdminLogin';
import InstitutionLogin from './components/InstitutionLogin';
import AdminLayout from './components/AdminLayout';
import InstitutionLayout from './components/InstitutionLayout';
import InstitutionRecordSubmission from './components/InstitutionRecordSubmission';
import InstitutionDashboard from './components/InstitutionDashboard';
import CreditRecords from './components/AdminCreditRecords';
import InstitutionLoginWithInternet from './components/InstitutionLoginWithInternet';
import UserReportList from './components/UserReportList';
import RegisterPage from './components/RegisterPage';
import FailedRecordsView from './components/FailedRecordsView';
import AdminLoginWithInternet from './components/AdminLoginWithInternet';

import './styles/dark-theme.css';


// 创建上下文
export const AppContext = React.createContext(null);

// 定义全局主题配置
const globalTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 自定义令牌
    colorPrimary: '#3b82f6', // Tailwind blue-500
    colorPrimaryHover: '#60a5fa', // Tailwind blue-400
    colorBgContainer: '#1f2937', // Tailwind gray-800
    colorBgElevated: '#111827', // Tailwind gray-900
    colorBorder: '#374151', // Tailwind gray-700
    colorText: '#e5e7eb', // Tailwind gray-200
    colorTextSecondary: '#9ca3af', // Tailwind gray-400
    borderRadius: 8,
    // 控制表单元素的背景色
    controlItemBgActive: '#3b82f6',
    controlItemBgHover: '#1f2937',
    // 输入框相关
    colorBgContainerDisabled: '#374151',
    colorTextDisabled: '#6b7280',
    // 按钮相关
    colorPrimaryActive: '#2563eb',
  },
  components: {
    Button: {
      colorPrimary: '#3b82f6',
      algorithm: true,
    },
    Input: {
      colorBgContainer: '#1f2937',
      colorBorder: '#374151',
      algorithm: true,
    },
    Select: {
      colorBgContainer: '#1f2937',
      colorBorder: '#374151',
      algorithm: true,
    },
    Table: {
      colorBgContainer: '#1f2937',
      colorBorderSecondary: '#374151',
      algorithm: true,
    },
    Card: {
      colorBgContainer: 'rgba(0, 0, 0, 0.2)',
      colorBorder: '#374151',
      algorithm: true,
    },
    Modal: {
      colorBgElevated: '#1f2937',
      colorBorder: '#374151',
      algorithm: true,
    },
    Tabs: {
      colorBgContainer: 'transparent',
      algorithm: true,
    }
  }
};

function App() {
  return (
    <ConfigProvider theme={globalTheme}>
      <AppContext.Provider value={null}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
          <Routes>
            <Route path="/" element={<InstitutionLoginWithInternet />} />
            <Route path="/admin" element={<AdminLayout />} />
            <Route path="/admin/login" element={<AdminLoginWithInternet />} />
            <Route path="/admin/credit" element={<CreditRecords />} />
            <Route path="/login" element={<InstitutionLoginWithInternet />} />
            <Route path="/institution/*" element={<InstitutionLayout />} />
            <Route path="/institution/login" element={<InstitutionLogin />} />
            <Route path="/institution/submit" element={<InstitutionRecordSubmission />} />
            <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
            <Route path="/institution/report" element={<UserReportList />} />
            <Route path="/institution/history" element={<FailedRecordsView />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </div>
      </AppContext.Provider>
    </ConfigProvider>
  );
}

export default App;