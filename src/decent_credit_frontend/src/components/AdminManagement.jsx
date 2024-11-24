import React, { useState, useEffect } from 'react';
import { BarChart2, Database, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { getAllInstitutions, registerInstitution, updateInstitutionStatus, rechargeDCC, deductDCC } from '../services/icpService';
import InstitutionDialog from './InstitutionDialog';

// DCC to USDT conversion rate (e.g., 1 DCC = 0.1 USDT)
const DCC_TO_USDT_RATE = 0.1;

const InstitutionList = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDCCModalOpen, setIsDCCModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    usdtAmount: '',
    txHash: '',
    remarks: ''
  });

  const handleAddOrEdit = async (formData) => {
    try {
      if (editingInstitution) {
        console.log('修改机构:', formData);
      } else {
        await registerInstitution(formData.name, formData.full_name, formData.password);
      }
      const data = await getAllInstitutions();
      setInstitutions(data);
    } catch (error) {
      console.error('操作失败:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchInstitutions = async () => {
      setLoading(true);
      try {
        const data = await getAllInstitutions();
        setInstitutions(data);
      } catch (error) {
        console.error('获取机构列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  const handleUnbind = async (institution) => {
    if (window.confirm(`确认解除与 ${institution.name} 的绑定吗？`)) {
      try {
        await updateInstitutionStatus(institution.id, false);
        const data = await getAllInstitutions();
        setInstitutions(data);
      } catch (error) {
        console.error('解除绑定失败:', error);
      }
    }
  };

  const handleDCCOperation = async (e) => {
    e.preventDefault();
    
    try {
      const operationData = {
        dccAmount: parseFloat(formData.amount),
        usdtAmount: parseFloat(formData.usdtAmount),
        txHash: formData.txHash,
        remarks: formData.remarks
      };

      if (transactionType === 'recharge') {
        await rechargeDCC(selectedInstitution.id, operationData);
      } else {
        await deductDCC(selectedInstitution.id, operationData);
      }
      
      setIsDCCModalOpen(false);
      const data = await getAllInstitutions();
      setInstitutions(data);
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.message || '操作失败');
    }
  };

  const handleOpenDCCModal = (institution, type) => {
    setSelectedInstitution(institution);
    setTransactionType(type);
    setIsDCCModalOpen(true);
    setFormData({
      amount: '',
      usdtAmount: '',
      txHash: '',
      remarks: ''
    });
  };

  // Function to handle DCC amount change and automatically calculate USDT
  const handleDCCAmountChange = (value) => {
    const dccAmount = parseFloat(value) || 0;
    const usdtAmount = (dccAmount * DCC_TO_USDT_RATE).toFixed(2);
    setFormData({
      ...formData,
      amount: value,
      usdtAmount: usdtAmount
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">机构管理</h1>
            <p className="mt-1 text-sm text-gray-600">管理系统接入的金融机构及其数据使用情况</p>
          </div>
          <button 
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            onClick={() => {
              setEditingInstitution(null);
              setIsDialogOpen(true);
            }}
          >
            + 接入新机构
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {institutions.map((institution) => (
              <div key={institution.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-medium text-gray-900">
                          {institution.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          institution.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {institution.status === 'active' ? '已接入' : '未接入'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{institution.full_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        接入时间: {institution.join_time}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        最近活跃: {institution.last_active}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        <BarChart2 className="w-4 h-4 mr-2" />
                        API调用量
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-semibold text-gray-900">
                          {institution.api_calls.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          消耗 {institution.dcc_consumed.toLocaleString()} DCC
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        <Database className="w-4 h-4 mr-2" />
                        数据上传量
                      </div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">
                        {institution.data_uploads.toLocaleString()}
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        信用评分
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-semibold text-gray-900">
                          {institution.credit_score.score}
                        </div>
                        <div className="text-sm text-gray-500">
                          更新于: {new Date(institution.credit_score.last_update).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        代币交易量
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-600">买入:</span>
                          <span className="text-base font-semibold text-gray-900">
                            {institution.token_trading.bought.toLocaleString()} DCC
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-600">卖出:</span>
                          <span className="text-base font-semibold text-gray-900">
                            {institution.token_trading.sold.toLocaleString()} DCC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                      onClick={() => handleOpenDCCModal(institution, 'recharge')}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      充值DCC
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                      onClick={() => handleOpenDCCModal(institution, 'deduct')}
                    >
                      <ArrowDownCircle className="w-4 h-4 mr-2" />
                      卖出DCC
                    </button>
                    <button 
                      className="px-3 py-1.5 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                      onClick={() => console.log('查看详情:', institution.id)}
                    >
                      查看详情
                    </button>
                    <button 
                      className="px-3 py-1.5 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                      onClick={() => handleUnbind(institution)}
                    >
                      解除绑定
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 机构信息对话框 */}
        <InstitutionDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingInstitution(null);
          }}
          institution={editingInstitution}
          onSubmit={handleAddOrEdit}
        />

        {/* DCC充值/扣除模态框 */}
        {isDCCModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {transactionType === 'recharge' ? '充值DCC' : '扣除DCC'} - {selectedInstitution?.name}
              </h3>
              <form onSubmit={handleDCCOperation}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DCC数量</label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.amount}
                      onChange={(e) => handleDCCAmountChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      USDT金额 (自动计算: 1 DCC = {DCC_TO_USDT_RATE} USDT)
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                      value={formData.usdtAmount}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">交易哈希</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.txHash}
                      onChange={(e) => setFormData({...formData, txHash: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">备注</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      rows="3"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    onClick={() => setIsDCCModalOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      transactionType === 'recharge' 
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    确认
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionList;