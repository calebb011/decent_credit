import React, { useState, useEffect } from 'react';
import { Button, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { authClientService } from '../services/authClient';
import { Principal } from '@dfinity/principal';
import { getActor } from '../services/IDL';

const { Title, Text } = Typography;

const LoginPage = () => {
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

  const clearLocalStorage = () => {
    localStorage.removeItem('userPrincipal');
    localStorage.removeItem('userRole');
    localStorage.removeItem('institutionId');
    localStorage.removeItem('institutionName');
  };

 
const checkUserStatusAndRedirect = async (principal) => {
  try {
    console.log('Checking status for principal:', principal);
    
    const actorResult = await getActor();
    if (!actorResult) {
      throw new Error('Failed to initialize actor');
    }

    let principalObj;
    try {
      principalObj = Principal.fromText(principal);
    } catch (error) {
      throw new Error('Invalid principal format');
    }
    
    const institutionInfo = await actorResult.get_institution(principalObj);
    console.log('Institution info:', institutionInfo);
    
    // 处理空值情况
    if (!institutionInfo) {
      console.log('No institution record found, redirecting to registration');
      localStorage.setItem('userRole', 'pending');
      message.info('Please complete your institution registration');
      navigate('/register');
      return;
    }

    // 更健壮的状态检查
    if (institutionInfo[0] && typeof institutionInfo[0] === 'object') {
      const institutionData = institutionInfo[0];
      
      if (!institutionData.status) {
        throw new Error('Institution status is undefined');
      }

      // 状态字段存在于数组的第一个元素中
      if ('Active' in institutionData.status) {
        localStorage.setItem('userRole', 'institution');
        localStorage.setItem('institutionId', principal);
        localStorage.setItem('institutionName', institutionData.name || 'Unknown Institution');
        message.success('Welcome back!');
        navigate('/institution');
        return;
      }
      
      if ('Inactive' in institutionData.status) {
        message.info('Your registration is pending approval. Please wait for administrator review.');
        await handleLogout();
        return;
      }

      console.warn('Unexpected institution status:', institutionData.status);
      message.error('Invalid institution status. Please contact support.');
      await handleLogout();
      return;
    }
    
    // 如果没有有效的机构信息，视为未注册
    console.log('Invalid institution info structure, redirecting to registration');
    localStorage.setItem('userRole', 'pending');
    message.info('Please complete your institution registration');
    navigate('/register');
    
  } catch (error) {
    console.error('Status check failed:', {
      error: error.message,
      stack: error.stack,
      principal
    });
    message.error(`Verification failed: ${error.message}`);
    await handleLogout();
  }
};

  const checkAuth = async () => {
    try {
      const isAuth = await authClientService.isAuthenticated();
      
      if (isAuth && location.pathname === '/login') {
        const identity = await authClientService.getIdentity();
        
        if (!identity) {
          throw new Error('Failed to get identity');
        }

        const principal = identity.getPrincipal().toString();
        
        if (!principal) {
          throw new Error('Invalid principal');
        }

        localStorage.setItem('userPrincipal', principal);
        await checkUserStatusAndRedirect(principal);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      message.error(`Authentication check failed: ${error.message}`);
      await handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      clearLocalStorage();
      await authClientService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      message.error('Logout failed. Please try again.');
      // 即使登出失败也清理本地存储
      clearLocalStorage();
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const loginResult = await authClientService.login();
      
      if (!loginResult || !loginResult.principal) {
        throw new Error('Invalid login response');
      }

      const { principal } = loginResult;
      console.log('Login successful, Principal:', principal);
      
      localStorage.setItem('userPrincipal', principal);
      await checkUserStatusAndRedirect(principal);
    } catch (error) {
      console.error('Login failed:', {
        error: error.message,
        stack: error.stack
      });
      message.error(`Login failed: ${error.message}`);
      await handleLogout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-12 flex flex-col justify-center">
        <div className="max-w-xl">
          <Title level={1} className="!text-white !text-5xl !font-bold !mb-6">
            Decentralized Identity
          </Title>
          <Text className="!text-white !opacity-90 !text-lg">
            Connect securely to the Internet Computer using Internet Identity.
            Create a new identity or use an existing one with just one click.
          </Text>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-[480px] bg-white p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Title level={2} className="!mb-4 !text-gray-800">
              Internet Identity Login
            </Title>
            <Text className="!text-gray-600 !text-base">
              Click below to login. If you don't have an Internet Identity,
              you'll be guided through creating one.
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleLogin}
            loading={loading}
            className="h-12 text-lg bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⌛</span> 
                Connecting...
              </span>
            ) : (
              'Connect with Internet Identity'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;