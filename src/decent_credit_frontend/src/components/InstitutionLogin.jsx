import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Building2, ShieldCheck, AlertCircle, User, KeyRound, Shield, Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

const InstitutionLogin = () => {
  const navigate = useNavigate();
  const { connectWallet, error: walletError, isConnected, account, isReceivingTokens } = useWallet();
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    captcha: ''
  });
  
  const [captchaCode, setCaptchaCode] = useState('');

  useEffect(() => {
    generateCaptcha();
  }, []);

  // 监听钱包连接状态
  useEffect(() => {
    if (showWalletModal && isConnected) {
      // 钱包连接成功且获得代币后跳转
      navigate('/institution/dashboard');
    }
  }, [isConnected, showWalletModal]);

  const generateCaptcha = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCaptchaCode(code);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // 处理钱包连接
  const handleWalletConnect = async () => {
    try {
      const success = await connectWallet();
      if (!success) {
        setError('钱包连接失败');
      }
    } catch (err) {
      setError('钱包连接过程中发生错误');
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.captcha) {
      setError('请填写所有必填项');
      return;
    }

    if (formData.captcha.toUpperCase() !== captchaCode) {
      setError('验证码错误');
      generateCaptcha();
      return;
    }

    try {
      setIsAuthenticating(true);
      
      // 模拟API调用
      const loginSuccess = formData.username === 'admin' && formData.password === 'password';
      
      if (loginSuccess) {
        console.log('账号密码验证成功');
  // 存储登录状态
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('username', formData.username);
        // 显示钱包连接模态框
        setShowWalletModal(true);
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      console.error('登录错误:', err);
      setError('登录过程中发生错误');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">DecentCredit</span>
            </div>
            {isConnected && account && (
              <div className="flex items-center text-sm text-gray-600">
                <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
                <span className="mr-2">连接地址:</span>
                <span className="font-medium">{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            )}
          </div>
        </div>
      </nav>
  
      {/* 主要内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          {/* 左侧信息区 */}
          <div className="mb-12 lg:mb-0">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              企业信用数据服务
            </h1>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">安全可靠</h3>
                  <p className="mt-2 text-gray-500">
                    基于区块链技术的去中心化架构，保障数据安全
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">隐私保护</h3>
                  <p className="mt-2 text-gray-500">
                    采用加密技术，确保企业数据隐私安全
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* 右侧登录区 */}
          <div className="bg-white rounded-2xl shadow-xl py-12 px-8 sm:px-12">
            <div className="max-w-md mx-auto">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900">企业登录</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {showWalletModal ? '请连接您的钱包以继续' : '请输入登录信息'}
                </p>
              </div>
  
              {(error || walletError) && (
                <div className="mt-4 bg-red-50 p-4 rounded-md flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                  <p className="text-sm text-red-700">{error || walletError}</p>
                </div>
              )}
  
              {/* 钱包连接界面 */}
              {showWalletModal ? (
                <div className="mt-8 space-y-6">
                  {isReceivingTokens && (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-blue-700">正在发放测试代币...</span>
                      </div>
                    </div>
                  )}
  
                  <button
                    onClick={handleWalletConnect}
                    disabled={isConnected || isReceivingTokens}
                    className={`w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                      isConnected || isReceivingTokens
                        ? 'bg-green-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    } shadow-sm`}
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    {isConnected ? '钱包已连接' : '连接钱包'}
                  </button>
  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">连接说明</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 请确保已安装 MetaMask 钱包</li>
                      <li>• 首次连接将获得测试代币</li>
                      <li>• 请切换到正确的测试网络</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* 登录表单 */
                <form onSubmit={handleLogin} className="mt-8 space-y-6">
                  {/* 用户名输入 */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      用户名
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleInputChange}
                        className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="请输入用户名"
                      />
                    </div>
                  </div>
  
                  {/* 密码输入 */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      密码
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="请输入密码"
                      />
                    </div>
                  </div>
  
                  {/* 验证码输入 */}
                  <div>
                    <label htmlFor="captcha" className="block text-sm font-medium text-gray-700">
                      验证码
                    </label>
                    <div className="mt-1 flex space-x-4">
                      <div className="flex-grow relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <Shield className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="captcha"
                          name="captcha"
                          type="text"
                          required
                          value={formData.captcha}
                          onChange={handleInputChange}
                          className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="请输入验证码"
                        />
                      </div>
                      <div 
                        onClick={generateCaptcha}
                        className="flex items-center justify-center px-4 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 select-none font-mono text-sm"
                        style={{ minWidth: '100px' }}
                      >
                        {captchaCode}
                      </div>
                    </div>
                  </div>
  
                  {/* 登录按钮 */}
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className={`w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                      isAuthenticating 
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    } shadow-sm`}
                  >
                    {isAuthenticating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        验证中...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        登录
                      </>
                    )}
                  </button>
  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">温馨提示</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 请使用企业管理员账号登录</li>
                      <li>• 请妥善保管您的登录信息</li>
                      <li>• 如忘记密码请联系管理员</li>
                    </ul>
                  </div>
  
                  <p className="text-center text-sm text-gray-500">
                    遇到问题？
                    <a href="#" className="text-blue-600 hover:text-blue-500 ml-1">
                      查看帮助文档
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLogin;