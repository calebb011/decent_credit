import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { buyDCC, sellDCC, getBalance } from '../services/adminInstitutionService';

const TokenExchange = () => {
  // 状态管理
  const [usdcAmount, setUsdcAmount] = useState('');
  const [dccAmount, setDccAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  const [balances, setBalances] = useState({
    usdc: 0,
    dcc: 0,
  });

  // 获取余额
  const fetchBalances = async () => {
    try {
      const result = await getBalance();
      if (result.success) {
        setBalances({
          usdc: result.data.usdc || 0,
          dcc: result.data.dcc || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  // 组件加载时获取余额
  useEffect(() => {
    fetchBalances();
  }, []);

  const account = {
    address: '#1234...5678',
    exchangeRate: 1, // 1 USDC = 1 DCC
  };

  const quickAmounts = [100, 500, 1000];

  // 处理输入金额变化
  const handleAmountChange = (value) => {
    setError('');
    if (value === '') {
      setUsdcAmount('');
      setDccAmount('');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setUsdcAmount(numValue);
    setDccAmount(numValue * account.exchangeRate);

    // 验证余额
    if (activeTab === 'buy' && numValue > balances.usdc) {
      setError('USDC余额不足');
    } else if (activeTab === 'sell' && numValue > balances.dcc) {
      setError('DCC余额不足');
    }
  };

  // 快速选择金额
  const handleQuickAmount = (amount) => {
    handleAmountChange(amount.toString());
  };

  // 处理购买/卖出
  const handleTransaction = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
        throw new Error('请输入有效金额');
      }

      let response;
      if (activeTab === 'buy') {
        if (parseFloat(usdcAmount) > balances.usdc) {
          throw new Error('USDC余额不足');
        }
        // 调用购买接口
        response = await buyDCC({
          amount: parseFloat(usdcAmount)
        });
      } else {
        if (parseFloat(dccAmount) > balances.dcc) {
          throw new Error('DCC余额不足');
        }
        // 调用卖出接口
        response = await sellDCC({
          amount: parseFloat(dccAmount)
        });
      }

      if (!response.success) {
        throw new Error(response.message || '交易失败，请重试');
      }

      // 交易成功后刷新余额
      await fetchBalances();
      
      // 清空输入
      setUsdcAmount('');
      setDccAmount('');
      
      alert('交易成功！');

    } catch (err) {
      setError(err.message || '交易失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换买卖模式时清空输入和错误
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setUsdcAmount('');
    setDccAmount('');
    setError('');
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">DCC代币兑换</h2>
        <button className="text-blue-600 p-2 rounded-full hover:bg-gray-100">
          <Info className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">链自助站</span>
          <span className="text-gray-800">{account.address}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">USDC余额</span>
          <span className="text-gray-800">{balances.usdc} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">DCC余额</span>
          <span className="text-gray-800">{balances.dcc} DCC</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => handleTabChange('buy')}
          className={`flex-1 py-2 px-4 border border-gray-200 rounded-lg ${
            activeTab === 'buy' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          购买DCC
        </button>
        <button 
          onClick={() => handleTabChange('sell')}
          className={`flex-1 py-2 px-4 border border-gray-200 rounded-lg ${
            activeTab === 'sell' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          卖出DCC
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">
              {activeTab === 'buy' ? '转入金额' : '卖出金额'}
            </span>
            <span className="text-gray-600">
              最大可{activeTab === 'buy' ? '买' : '卖'}: {
                activeTab === 'buy' ? balances.usdc : balances.dcc
              }
            </span>
          </div>
          <input
            type="number"
            placeholder={`0 ${activeTab === 'buy' ? 'USDC' : 'DCC'}`}
            value={usdcAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickAmount(amount)}
              className="flex-1 py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {amount} {activeTab === 'buy' ? 'USDC' : 'DCC'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info className="w-4 h-4" />
          兑换比例: 1 USDC = 1 DCC
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>预{activeTab === 'buy' ? '收到' : '获得'}</span>
            <span>{dccAmount || '0'} {activeTab === 'buy' ? 'DCC' : 'USDC'}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800">
            ⚠️ {error}
          </div>
        )}

        <button 
          onClick={handleTransaction}
          disabled={!usdcAmount || isLoading || error}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '处理中...' : `${activeTab === 'buy' ? '购买' : '卖出'} DCC`}
        </button>
      </div>
    </div>
  );
};

export default TokenExchange;