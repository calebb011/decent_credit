// InstitutionLayout.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@radix-ui/react-dialog";
import { Wallet, LayoutDashboard, Upload } from 'lucide-react';  // 添加新图标
import TokenExchange from './TokenExchange';
import { useWallet } from '../hooks/useWallet';
import InstitutionDashboard from './InstitutionDashboard';
import InstitutionDataSubmission from './InstitutionDataSubmission';  // 导入数据提交组件

const InstitutionLayout = ({ children }) => {
  const [activePage, setActivePage] = useState('overview');
  const { account, error, connectWallet, isConnected, dccBalance } = useWallet();

  const handleConnect = async () => {
    const success = await connectWallet();
    if (!success && error) {
      console.error(error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 根据当前活动页面渲染内容
  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return <InstitutionDashboard />;
      case 'submission':
        return <InstitutionDataSubmission />;
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
      id: 'submission',
      label: '数据提交',
      icon: Upload,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">DecentCredit 系统管理</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm">机构</span>

              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  连接钱包
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {formatAddress(account)}
                  </span>
                  <span className="text-sm text-gray-600">
                    DCC: {Number(dccBalance).toLocaleString()}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700">
                        代币兑换
                      </button>
                    </DialogTrigger>
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

export default InstitutionLayout;