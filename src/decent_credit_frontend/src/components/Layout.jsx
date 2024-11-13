// src/decent_credit_frontend/src/components/Layout.jsx
import React from 'react';

const Layout = ({ children }) => {
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
            <div className="flex items-center">
              <span className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-blue-500 text-white">
                管理员
              </span>
              <button className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-gray-100">
                操作记录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow-sm">
          <nav className="mt-5 px-2">
            <a href="#" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900">
              系统概览
            </a>
            <a href="#" className="mt-1 group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              机构管理
            </a>
            <a href="#" className="mt-1 group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              系统配置
            </a>
          </nav>
        </aside>

        <main className="flex-1 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;