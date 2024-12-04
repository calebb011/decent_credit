import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AdminManagement from './AdminManagement';
import AdminDashboard from './AdminDashboard';
import CreditRecords from './AdminCreditRecords';
import { authClientService } from '../services/authClient';

const DcLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" className="h-10">
  <defs>
    <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{stopColor:'#60A5FA'}}/>
      <stop offset="100%" style={{stopColor:'#A855F7'}}/>
    </linearGradient>
  </defs>
  
  <circle cx="15" cy="20" r="1.5" fill="url(#techGradient)">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="25" cy="14" r="1.5" fill="url(#techGradient)">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin="0.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="35" cy="20" r="1.5" fill="url(#techGradient)">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin="1s" repeatCount="indefinite"/>
  </circle>
  <circle cx="25" cy="26" r="1.5" fill="url(#techGradient)">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin="1.5s" repeatCount="indefinite"/>
  </circle>
  
  <line x1="15" y1="20" x2="25" y2="14" stroke="url(#techGradient)" strokeWidth="0.5" opacity="0.5"/>
  <line x1="25" y1="14" x2="35" y2="20" stroke="url(#techGradient)" strokeWidth="0.5" opacity="0.5"/>
  <line x1="35" y1="20" x2="25" y2="26" stroke="url(#techGradient)" strokeWidth="0.5" opacity="0.5"/>
  <line x1="25" y1="26" x2="15" y2="20" stroke="url(#techGradient)" strokeWidth="0.5" opacity="0.5"/>
  
  <text x="45" y="24" fontFamily="Arial" fontWeight="bold" fontSize="16" fill="url(#techGradient)">DecentCredit AI</text>
</svg>
);

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('overview');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const userPrincipal = localStorage.getItem('userPrincipal');
    if (userPrincipal) {
      setUserId(userPrincipal);
    }
  }, []);

  const handleLogout = () => {
    authClientService.logout();
    navigate('/login');
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

  const menuItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'institutions', label: 'Institutions' },
    { id: 'credits', label: 'Credits' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <nav className="bg-black/30 backdrop-blur-sm border-b border-gray-700">
        <div className="px-4 mx-auto">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center space-x-4">
              <DcLogo />
              
              <div className="flex items-center px-3 py-1 rounded-full bg-gray-800/30 backdrop-blur-sm relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex space-x-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className="relative px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-out group"
                    >
                      <span className={`relative z-10 ${
                        activePage === item.id
                          ? 'text-blue-400'
                          : 'text-gray-300 hover:text-white'
                      }`}>
                        {item.label}
                      </span>
                      {activePage === item.id ? (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 transform transition-all duration-300 ease-out" />
                      ) : (
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400/50 group-hover:w-full transform transition-all duration-300 ease-out" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-300 text-xs bg-gray-800/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                {userId}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all duration-300"
              >
                <LogOut className="w-3 h-3 mr-1.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="px-4 py-4 mx-auto">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 min-h-[calc(100vh-7rem)]">
          {renderContent()}
        </div>
      </main>
    </div>
  );

}

export default AdminLayout;