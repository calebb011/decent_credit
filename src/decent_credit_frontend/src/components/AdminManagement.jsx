import React, { useState, useEffect } from 'react';
import { BarChart2, Database, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { getAllInstitutions, registerInstitution, updateInstitutionStatus } from '../services/adminInstitutionService';
import {  rechargeDCC, deductDCC } from '../services/dccService';
import { Card, Input, Button, Form, Modal, Spin, Empty, Space, Tag } from 'antd';

import InstitutionDialog from './RegisterInstitutionDialog';

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

        await registerInstitution(formData);
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

  const handleStatusChange = async (institution) => {
    const newStatus = institution.status !== 'active';
    const actionText = newStatus ? '接入' : '解除接入';
    
    if (window.confirm(`确认${actionText}机构 ${institution.name} 吗？`)) {
      try {
        const principalId = typeof institution.id === 'string' 
          ? institution.id 
          : institution.id.toText();
        
        await updateInstitutionStatus(principalId, newStatus);
        const data =await getAllInstitutions();
        setInstitutions(data);
      } catch (error) {
        console.error(`${actionText}失败:`, error);
        alert(error.message || `${actionText}失败`);
      }
    }
  };
 
  const dealQuery = async() =>{
    const data = await getAllInstitutions();
    setInstitutions(data);
  }
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
    <div className="space-y-4">
      {/* 头部信息 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">机构管理</h2>
          <p className="text-gray-400">管理系统接入的金融机构及其数据使用情况</p>
        </div>
        <Space>
          <Button
            className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-gray-700 text-gray-200 hover:border-gray-600"
            onClick={dealQuery}
          >
            刷新
          </Button>
          <Button
            type="primary"
            className="bg-gradient-to-r from-blue-500 to-blue-600 border-0"
            onClick={() => {
              setEditingInstitution(null);
              setIsDialogOpen(true);
            }}
          >
            + 接入新机构
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin tip="加载中..." size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          {institutions.map((institution) => (
            <Card 
              key={institution.id} 
              className="bg-black/20 border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-base font-medium text-gray-200">
                      {institution.id} - {institution.name}
                    </h3>
                    <Tag color={institution.status === 'active' ? 'success' : 'error'}>
                      {institution.status === 'active' ? '已接入' : '未接入'}
                    </Tag>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{institution.full_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    接入时间: {institution.join_time}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    最近活跃: {institution.last_active}
                  </div>
                </div>
              </div>

              {/* 数据卡片网格 */}
              <div className="mt-4 grid grid-cols-4 gap-4">
                <StatCard
                  icon={<BarChart2 />}
                  title="信用记录查询次数"
                  value={institution.api_calls}
                  subValue={`消耗 ${institution.dcc_consumed.toLocaleString()} DCC`}
                  iconColor="text-blue-500"
                  bgColor="from-blue-500/20 to-blue-600/20"
                />
                
                <StatCard
                  icon={<Database />}
                  title="信用记录上传量"
                  value={institution.data_uploads}
                  iconColor="text-green-500"
                  bgColor="from-green-500/20 to-green-600/20"
                />

                <StatCard
                  icon={<AlertCircle />}
                  title="信用评分"
                  value={institution.credit_score.score}
                  subValue={`更新于: ${new Date(institution.credit_score.last_update).toLocaleString()}`}
                  iconColor="text-yellow-500"
                  bgColor="from-yellow-500/20 to-yellow-600/20"
                />

                <TokenTradingCard
                  bought={institution.token_trading.bought}
                  sold={institution.token_trading.sold}
                />
              </div>

              {/* 操作按钮 */}
              <div className="mt-4 flex justify-end space-x-3">
                <Button
                  type="primary"
                  icon={<ArrowUpCircle className="w-4 h-4" />}
                  className="bg-gradient-to-r from-green-500 to-green-600 border-0"
                  onClick={() => handleOpenDCCModal(institution, 'recharge')}
                >
                  充值DCC
                </Button>
                <Button
                  danger
                  icon={<ArrowDownCircle className="w-4 h-4" />}
                  onClick={() => handleOpenDCCModal(institution, 'deduct')}
                >
                  卖出DCC
                </Button>
                <Button
                  type={institution.status === 'active' ? 'default' : 'primary'}
                  danger={institution.status === 'active'}
                  onClick={() => handleStatusChange(institution)}
                >
                  {institution.status === 'active' ? '解除接入' : '接入'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DCC交易模态框 */}
      <Modal
        title={
          <span className="text-gray-200">
            {transactionType === 'recharge' ? '充值DCC' : '扣除DCC'} - {selectedInstitution?.name}
          </span>
        }
        open={isDCCModalOpen}
        onCancel={() => setIsDCCModalOpen(false)}
        footer={null}
        className="dark-modal"
      >
        <Form onFinish={handleDCCOperation} layout="vertical">
          <Form.Item
            label={<span className="text-gray-400">DCC数量</span>}
            required
          >
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => handleDCCAmountChange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>
          
          <Form.Item
            label={<span className="text-gray-400">USDT金额 (自动计算: 1 DCC = {DCC_TO_USDT_RATE} USDT)</span>}
          >
            <Input
              value={formData.usdtAmount}
              readOnly
              className="bg-gray-900 border-gray-700 text-gray-400"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">交易哈希</span>}
            required
          >
            <Input
              value={formData.txHash}
              onChange={(e) => setFormData({...formData, txHash: e.target.value})}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">备注</span>}
          >
            <Input.TextArea
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item className="flex justify-end mb-0">
            <Space>
              <Button
                onClick={() => setIsDCCModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className={
                  transactionType === 'recharge'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 border-0'
                    : 'bg-gradient-to-r from-red-500 to-red-600 border-0'
                }
              >
                确认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <InstitutionDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingInstitution(null);
        }}
        institution={editingInstitution}
        onSubmit={handleAddOrEdit}
      />
    </div>
  );
};

// 统计卡片组件
const StatCard = ({ icon, title, value, subValue, iconColor, bgColor }) => (
  <div className="border border-gray-700 rounded-lg p-3 bg-black/30">
    <div className={`flex items-center text-sm font-medium text-gray-400`}>
      <div className={`p-2 rounded-lg bg-gradient-to-br ${bgColor} mr-2`}>
        {React.cloneElement(icon, { className: `w-4 h-4 ${iconColor}` })}
      </div>
      {title}
    </div>
    <div className="mt-1">
      <div className="text-xl font-semibold text-gray-200">
        {value.toLocaleString()}
      </div>
      {subValue && <div className="text-sm text-gray-500">{subValue}</div>}
    </div>
  </div>
);

// 代币交易卡片组件
const TokenTradingCard = ({ bought, sold }) => (
  <div className="border border-gray-700 rounded-lg p-3 bg-black/30">
    <div className="text-sm font-medium text-gray-400">代币交易量</div>
    <div className="mt-1 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-green-500">买入:</span>
        <span className="text-base font-semibold text-gray-200">
          {bought.toLocaleString()} DCC
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-red-500">卖出:</span>
        <span className="text-base font-semibold text-gray-200">
          {sold.toLocaleString()} DCC
        </span>
      </div>
    </div>
  </div>
);

export default InstitutionList;