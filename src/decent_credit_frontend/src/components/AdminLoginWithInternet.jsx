import React, { useState, useEffect } from 'react';
import { Button, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { authClientService } from '../services/authClient';
import { Principal } from '@dfinity/principal';
import { getActor } from '../services/IDL';
import { Shield, Lock } from 'lucide-react'; // 添加管理相关图标

const { Title, Text } = Typography;

const AdminLoginWithInternet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      checkAuth();
      setInitialized(true);
    }
  }, []);

  // 检查用户角色和状态，决定路由跳转
  const checkUserStatusAndRedirect = async (principal) => {
    try {
      const actorResult = await getActor();
      const principalObj = Principal.fromText(principal);
      
    
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('adminUserPrincipal', principal);
      message.success('You are the first user - initialized as system administrator');
      navigate('/admin');

    } catch (error) {
      console.error('Failed to check user status:', error);
      message.error('Failed to verify user status');
      throw error;
    }
  };

  const checkAuth = async () => {
    try {
      const isAuth = await authClientService.isAuthenticated();
      if (isAuth && location.pathname === '/login') {
        const identity = await authClientService.getIdentity();
        const principal = identity.getPrincipal().toString();
        localStorage.setItem('userPrincipal', principal);
        
        await checkUserStatusAndRedirect(principal);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      await handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('userPrincipal');
      localStorage.removeItem('userRole');
      await authClientService.logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      message.error('Failed to logout. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { principal } = await authClientService.login();
      console.log('Login successful, Principal:', principal);
      localStorage.setItem('userPrincipal', principal);
      
      await checkUserStatusAndRedirect(principal);
      message.success('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      message.error('Login failed. Please try again.');
      await handleLogout();
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 flex flex-col justify-center">
        <div className="max-w-xl">
          <div className="flex items-center gap-4 mb-8">
            <Shield className="w-12 h-12 text-blue-500" />
            <Title level={1} className="!text-white !text-5xl !font-bold !m-0">
              DecentCredit AI
            </Title>
          </div>
          <Title level={2} className="!text-white/90 !text-3xl !font-semibold !mb-6">
            Admin Control Center
          </Title>
          <Text className="text-gray-400 text-lg leading-relaxed">
            Securely access the admin control center using Internet Identity.
            Gain full system management capabilities, including institution management,
            data monitoring, and more.
          </Text>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-gray-400">
              <Lock className="w-5 h-5" />
              <Text className="text-gray-400">Secure Authentication Mechanism</Text>
            </div>
            <div className="flex items-center gap-3 text-gray-400">
              <Shield className="w-5 h-5" />
              <Text className="text-gray-400">Complete Administrative Control</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-[480px] bg-gray-900 p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Title level={2} className="!text-white !mb-4">
              Administrator Login
            </Title>
            <Text className="text-gray-400">
              Please sign in with your Internet Identity.
              If this is your first time, your admin identity will be automatically initialized.
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleLogin}
            loading={loading}
            className="h-12 text-lg bg-blue-600 hover:bg-blue-700 border-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⌛</span> 
                Connecting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" /> Sign in with Internet Identity
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginWithInternet;