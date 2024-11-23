import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import AdminManagement from './AdminManagement';
import AdminDashboard from './AdminDashboard';
import CreditRecords from './CreditRecords';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('overview');
  const { account, error, connectWallet, isConnected, dccBalance } = useWallet();

  const handleConnect = async () => {
    const success = await connectWallet();
    if (!success && error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'institutions':
        return <AdminManagement />;
      case 'overview':
        return <AdminDashboard />;
      case 'credits':
        return <CreditRecords />;
      default:
        return children;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b">
        <div className="pl-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-lg font-bold">DecentCredit 系统管理</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mr-4">
              <span className="text-gray-700 text-sm">管理员</span>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-2 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主体内容区 */}
      <div className="flex">
        {/* 侧边栏 */}
        <aside className="fixed left-0 top-14 w-40 bg-white h-[calc(100vh-3.5rem)]">
          <nav className="pt-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActivePage('overview');
              }}
              className={`block px-4 py-2.5 text-sm font-medium ${
                activePage === 'overview'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              系统概览
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActivePage('institutions');
              }}
              className={`block px-4 py-2.5 text-sm font-medium ${
                activePage === 'institutions'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              机构管理
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActivePage('credits');
              }}
              className={`block px-4 py-2.5 text-sm font-medium ${
                activePage === 'credits'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              信用扣除
            </a>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-40 py-4 px-4 bg-white min-h-[calc(100vh-3.5rem)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;