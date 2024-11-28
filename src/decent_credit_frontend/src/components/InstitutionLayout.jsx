import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, FileText } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import InstitutionDashboard from './InstitutionDashboard';
import CreditRecordQuery from './CreditRecordQuery';
import InstitutionRecordSubmission from './InstitutionRecordSubmission';
import UploadHistory from './UploadHistory';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('overview');
  const { account, error, connectWallet, isConnected, dccBalance } = useWallet();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/institution/login');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return <InstitutionDashboard />;
      case 'submit':
        return <InstitutionRecordSubmission />;
      case 'credits':
        return < CreditRecordQuery/>;
        case 'history':
          return < UploadHistory/>;
      default:
        return children;
    }
  };

  // 菜单配置
  const menuItems = [
    {
      id: 'overview',
      label: '系统概览',
      icon: LayoutDashboard,
    },
    {
      id: 'submit',
      label: '数据提交',
      icon: Building2,
    },
    {
      id: 'credits',
      label: '数据查询',
      icon: FileText,
    }
    ,
    {
      id: 'history',
      label: '数据历史',
      icon: FileText,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center pl-0">
                <h1 className="text-xl font-bold">DecentCredit 系统管理</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 pr-8">
              <span className="text-gray-700 text-sm">机构</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow-sm">
          <nav className="mt-5 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <a 
                  key={item.id}
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setActivePage(item.id);
                  }}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    activePage === item.id
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;