<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from "@dfinity/agent";

// 常量配置
const DFX_HOST = "http://127.0.0.1:4943";
const CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

const agent = new HttpAgent({
  host: DFX_HOST,
  retryTimes: 3, // 重试次数
  fetchOptions: {
    // 增加超时时间
    timeout: 30000,
  }
});

// 初始化actor
async function createActor() {
  try {
    // 本地开发需要获取root key
    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    return Actor.createActor(({ IDL }) => {
      const Institution = IDL.Record({
        'id': IDL.Principal,
        'name': IDL.Text,
        'registration_time': IDL.Nat64,
        'is_active': IDL.Bool,
        'credit_score': IDL.Nat64,
      });
      return IDL.Service({
        'register_institution': IDL.Func([IDL.Text], [], ['update']),
        'get_institution': IDL.Func([IDL.Principal], [IDL.Opt(Institution)], ['query']),
      });
    }, {
      agent,
      canisterId: CANISTER_ID
    });
  } catch (error) {
    console.error("Error creating actor:", error);
    throw error;
  }
}

function App() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [actor, setActor] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
 // 添加新的状态
 const [activeTab, setActiveTab] = useState('overview');
 const [systemStats, setSystemStats] = useState({
   activeInstitutions: '28/35',
   cpuUsage: '45%',
   tokenSupply: '1,000,000',
   circulation: '325,480'
 });

  // 初始化连接
  useEffect(() => {
    async function init() {
      try {
        setConnectionStatus('Connecting...');
        const newActor = await createActor();
        setActor(newActor);
        setConnectionStatus('Connected');
      } catch (error) {
        console.error('Initialization error:', error);
        setConnectionStatus('Connection Failed');
        setMessage('Error: Failed to connect to Internet Computer');
      }
    }
    init();
  }, []);

  // 检查连接状态
  const checkConnection = async () => {
    try {
      setMessage('Checking connection...');
      const response = await fetch(`${DFX_HOST}/_/health`);
      const text = await response.text();
      setMessage(`IC Status: ${text}`);
    } catch (error) {
      console.error('Health check error:', error);
      setMessage(`Connection error: ${error.message}`);
    }
  };

  // 注册机构
  const handleRegister = async () => {
    if (!actor) {
      setMessage('Error: System not initialized');
      return;
    }

    if (!name.trim()) {
      setMessage('Please enter an institution name');
      return;
    }

    setLoading(true);
    try {
      console.log('Registering institution:', name);
      await actor.register_institution(name);
      setMessage('Registration successful!');
      setName('');
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const renderOverview = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">机构状态</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-2xl font-semibold text-indigo-600">{systemStats.activeInstitutions}</span>
          <span className="ml-2 text-sm text-gray-500">活跃机构</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">系统状态</h3>
        <div className="mt-2">
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold text-green-600">正常</span>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            CPU使用率: {systemStats.cpuUsage}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">代币状态</h3>
        <div className="mt-2">
          <div className="text-2xl font-semibold text-gray-900">
            {systemStats.tokenSupply}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            流通量: {systemStats.circulation}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstitutionManagement = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-4">机构管理</h2>
      <div className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Institution Name"
            className="flex-1 p-2 border border-gray-300 rounded-md"
            disabled={!actor || loading}
          />
          <button
            onClick={handleRegister}
            disabled={!actor || loading}
            className={`px-4 py-2 rounded-md text-white ${
              actor ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
            }`}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.includes('Error')
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">DecentCredit 系统管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-md">
                管理员
              </span>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                操作记录
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 状态栏 */}
        <div className="mb-6 flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-md text-sm font-medium ${
            connectionStatus === 'Connected'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {connectionStatus}
          </div>
          <button
            onClick={checkConnection}
            className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
          >
            Check Connection
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              系统概览
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`pb-4 px-1 ${
                activeTab === 'management'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              机构管理
            </button>
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {activeTab === 'overview' ? renderOverview() : renderInstitutionManagement()}
        </div>

        {/* 环境信息 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
          <div>Host: {DFX_HOST}</div>
          <div>Canister ID: {CANISTER_ID}</div>
          <div>Environment: {process.env.NODE_ENV}</div>
        </div>
      </div>
    </div>
=======
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
>>>>>>> dec-test
  );
}

export default App;