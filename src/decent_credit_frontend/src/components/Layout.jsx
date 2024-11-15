import React, { useState } from 'react';  // 确保导入 useState
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@radix-ui/react-dialog";
import { Wallet } from 'lucide-react';
import TokenExchange from './TokenExchange';
import { useWallet } from '../hooks/useWallet';
import InstitutionManagement from './InstitutionManagement';  // 修改这里的导入
const Layout = ({ children }) => {
  const [activePage, setActivePage] = useState('overview');

  const { account, error, connectWallet, isConnected, dccBalance } = useWallet();

  const handleConnect = async () => {
    const success = await connectWallet();
    if (!success && error) {
      // 可以添加一个 toast 提示
      console.error(error);
    }
  };

  // 格式化钱包地址显示
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
              {/* 管理员角色展示 */}
              <span className="text-gray-700 text-sm">管理员</span>

              {/* MetaMask 钱包连接 */}
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

              {/* 系统设置按钮 */}
              <Dialog>
                <DialogTrigger asChild>
                  <span className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200">
                    系统设置
                  </span>
                </DialogTrigger>
                <DialogPortal>
                  <DialogOverlay className="fixed inset-0 bg-black/50" />
                  <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-full max-w-4xl">
                    <div className="mb-4">
                      <DialogTitle className="text-lg font-semibold">系统设置</DialogTitle>
                    </div>
                    <div>系统设置内容...</div>
                  </DialogContent>
                </DialogPortal>
              </Dialog>

            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
  <aside className="w-64 bg-white shadow-sm">
    <nav className="mt-5 px-2">
      <a 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          setActivePage('overview');
        }}
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          activePage === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
        className="mt-1 group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      >
        机构管理
      </a>
      <a 
        href="#" 
        className="mt-1 group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      >
        系统配置
      </a>
    </nav>
  </aside>

  <main className="flex-1 px-4 sm:px-6 lg:px-8">
    {activePage === 'institutions' ? <InstitutionManagement /> : children}
  </main>
</div>
    </div>
  );
};

export default Layout;