import { useState, useEffect } from 'react';

// 模拟发放测试代币的函数
const giveTestTokens = async (address) => {
  try {
    // 检查本地存储，避免重复发放
    const hasReceived = localStorage.getItem(`test_tokens_${address}`);
    if (hasReceived) {
      return {
        success: true,
        message: '已经领取过测试代币'
      };
    }

    // TODO: 这里应该调用你的合约或API来发放代币
    // 模拟发放成功
    localStorage.setItem(`test_tokens_${address}`, 'true');
    
    return {
      success: true,
      message: '测试代币发放成功'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isReceivingTokens, setIsReceivingTokens] = useState(false);

  // 处理钱包连接和代币发放
  const handleWalletConnection = async (address) => {
    setAccount(address);
    setIsReceivingTokens(true);

    try {
      const result = await giveTestTokens(address);
      if (!result.success) {
        console.warn('发放测试代币失败:', result.message);
      }
    } catch (err) {
      console.error('发放测试代币错误:', err);
    } finally {
      setIsReceivingTokens(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('请安装 MetaMask 钱包');
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length > 0) {
        await handleWalletConnection(accounts[0]);
        return true;
      }
    } catch (err) {
      setError('连接钱包失败: ' + err.message);
      return false;
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    // 可选：清除本地存储的测试代币记录
    // if (account) {
    //   localStorage.removeItem(`test_tokens_${account}`);
    // }
  };

  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          await handleWalletConnection(accounts[0]);
        } else {
          setAccount(null);
        }
      });

      // 检查是否已经连接
      window.ethereum.request({ method: 'eth_accounts' })
        .then(async accounts => {
          if (accounts.length > 0) {
            await handleWalletConnection(accounts[0]);
          }
        });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  return {
    account,
    error,
    connectWallet,
    disconnectWallet,
    isConnected: !!account,
    isReceivingTokens,
    dccBalance: "5000000000"  // 这个值应该从合约或状态管理中获取

  };
};