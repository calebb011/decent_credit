import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@radix-ui/react-dialog";
import { Wallet, LogOut } from 'lucide-react';
import TokenExchange from './TokenExchange';
import { useWallet } from '../hooks/useWallet';
import AdminManagement from './AdminManagement';

const Layout = ({ children }) => {
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-lg font-bold">DecentCredit 系统管理</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-gray-700 text-sm">管理员</span>

              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="flex items-center px-2 py-1.5 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  <Wallet className="w-4 h-4 mr-1.5" />
                  连接钱包
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <Dialog>
                    <DialogPortal>
                      <DialogOverlay className="fixed inset-0 bg-black/50" />
                      <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-full max-w-2xl">
                        <div className="mb-4">
                          <DialogTitle className="text-lg font-semibold">代币兑换</DialogTitle>
                        </div>
                        <TokenExchange />
                      </DialogContent>
                    </DialogPortal>
                  </Dialog>
                </div>
              )}

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
        <aside className="w-48 bg-white shadow-sm">
          <nav className="mt-3">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setActivePage('overview');
              }}
              className={`group flex justify-center items-center py-2.5 text-sm font-medium ${
                activePage === 'overview' 
                  ? 'bg-gray-100 text-gray-900' 
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
              className={`group flex justify-center items-center py-2.5 text-sm font-medium ${
                activePage === 'institutions' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              机构管理
            </a>
            <a 
              href="#" 
              className="group flex justify-center items-center py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              系统配置
            </a>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 px-4 py-4">
          {activePage === 'institutions' ? <AdminManagement /> : children}
        </main>
      </div>
    </div>
  );
};

export default Layout;