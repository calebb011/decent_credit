import React, { useState, useEffect } from 'react';
import { BarChart2, Database, AlertCircle, ArrowUpCircle, ArrowDownCircle, FileText, Search } from 'lucide-react';
import { getAllInstitutions, registerInstitution, updateInstitutionStatus } from '../services/adminInstitutionService';
import { rechargeDCC, deductDCC } from '../services/dccService';
import { Card, Input, Button, Form, Modal, Spin, Empty, Space, Tag, Tooltip } from 'antd';
import InstitutionDialog from './RegisterInstitutionDialog';

// Constants
const DCC_TO_USDT_RATE = 0.1;

// Mock license data - In production, this would come from your backend
const MOCK_LICENSE = {
  licenseNumber: "FIN2024001",
  issuedBy: "Financial Regulatory Authority",
  issuedDate: "2024-01-01",
  expiryDate: "2025-01-01",
  status: "Active",
  certifications: [
    "Digital Currency Trading License",
    "Financial Data Service Provider",
    "Credit Information Exchange"
  ]
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const InstitutionList = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDCCModalOpen, setIsDCCModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
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
        console.log('Modifying institution:', formData);
      } else {
        await registerInstitution(formData);
      }
      const data = await getAllInstitutions();
      setInstitutions(data);
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const data = await getAllInstitutions();
      setInstitutions(data);
    } catch (error) {
      console.error('Failed to fetch institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (institution) => {
    const newStatus = institution.status !== 'active';
    const actionText = newStatus ? 'activate' : 'deactivate';
    
    if (window.confirm(`Are you sure you want to ${actionText} institution ${institution.name}?`)) {
      try {
        const principalId = typeof institution.id === 'string' 
          ? institution.id 
          : institution.id.toText();
        
        await updateInstitutionStatus(principalId, newStatus);
        await fetchInstitutions();
      } catch (error) {
        console.error(`Failed to ${actionText}:`, error);
        alert(error.message || `Failed to ${actionText}`);
      }
    }
  };

  const handleDCCOperation = async (e) => {
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
      await fetchInstitutions();
    } catch (error) {
      console.error('Operation failed:', error);
      alert(error.message || 'Operation failed');
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

  const handleOpenLicenseModal = (institution) => {
    setSelectedInstitution(institution);
    setIsLicenseModalOpen(true);
  };

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
    <div className="max-w-8xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center py-6 bg-black/20 px-6 rounded-lg">
        <div>
          <h2 className="text-2xl font-semibold text-gray-200">Institution Management</h2>
          <p className="text-gray-400 text-sm">Manage financial institutions and monitor their data usage</p>
        </div>
        <Space size="large">
          <Button
            icon={<Search className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-gray-700 text-gray-200 hover:border-gray-600"
            onClick={fetchInstitutions}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<FileText className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-500 to-blue-600 border-0"
            onClick={() => {
              setEditingInstitution(null);
              setIsDialogOpen(true);
            }}
          >
            + New Institution
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" tip="Loading..." />
        </div>
      ) : (
        <div className="grid gap-6">
          {institutions.map((institution) => (
            <Card 
              key={institution.id} 
              className="bg-black/20 border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Institution Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-200 truncate">
                      {institution.name}
                    </h3>
                    <Tag color={institution.status === 'active' ? 'success' : 'error'}>
                      {institution.status === 'active' ? 'Active' : 'Inactive'}
                    </Tag>
                    <Button
                      type="link"
                      className="text-blue-400 hover:text-blue-300 p-0"
                      onClick={() => handleOpenLicenseModal(institution)}
                    >
                      View License
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">ID: {institution.id}</p>
                  <p className="text-sm text-gray-400">{institution.full_name}</p>
                </div>
                <div className="text-right text-sm space-y-2">
                  <div className="text-gray-400">
                    Joined: {formatTime(institution.join_time)}
                  </div>
                  <div className="text-gray-400">
                    Last Active: {formatTime(institution.last_active)}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<BarChart2 />}
                  title="API Calls"
                  value={institution.api_calls}
                  subValue={`${institution.dcc_consumed.toLocaleString()} DCC consumed`}
                  iconColor="text-blue-500"
                  bgColor="from-blue-500/20 to-blue-600/20"
                />
                
                <StatCard
                  icon={<Database />}
                  title="Data Uploads"
                  value={institution.data_uploads}
                  iconColor="text-green-500"
                  bgColor="from-green-500/20 to-green-600/20"
                />

                <StatCard
                  icon={<AlertCircle />}
                  title="Credit Score"
                  value={institution.credit_score.score}
                  subValue={`Updated: ${formatTime(institution.credit_score.last_update)}`}
                  iconColor="text-yellow-500"
                  bgColor="from-yellow-500/20 to-yellow-600/20"
                />

                <TokenTradingCard
                  balance={institution.balance}
                  bought={institution.token_trading.bought}
                  sold={institution.token_trading.sold}
                  rewards={institution.rewards}
                  consumption={institution.consumption}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Tooltip title="Add DCC tokens">
                  <Button
                    type="primary"
                    icon={<ArrowUpCircle className="w-4 h-4" />}
                    className="bg-gradient-to-r from-green-500 to-green-600 border-0"
                    onClick={() => handleOpenDCCModal(institution, 'recharge')}
                  >
                    Recharge DCC
                  </Button>
                </Tooltip>
                <Tooltip title="Sell DCC tokens">
                  <Button
                    danger
                    icon={<ArrowDownCircle className="w-4 h-4" />}
                    onClick={() => handleOpenDCCModal(institution, 'deduct')}
                  >
                    Sell DCC
                  </Button>
                </Tooltip>
                <Button
                  type={institution.status === 'active' ? 'default' : 'primary'}
                  danger={institution.status === 'active'}
                  onClick={() => handleStatusChange(institution)}
                >
                  {institution.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DCC Transaction Modal */}
      <Modal
        title={
          <span className="text-gray-200">
            {transactionType === 'recharge' ? 'Recharge DCC' : 'Sell DCC'} - {selectedInstitution?.name}
          </span>
        }
        open={isDCCModalOpen}
        onCancel={() => setIsDCCModalOpen(false)}
        footer={null}
        className="dark-modal"
      >
        <Form onFinish={handleDCCOperation} layout="vertical">
          <Form.Item
            label={<span className="text-gray-400">DCC Amount</span>}
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
            label={<span className="text-gray-400">USDT Amount (1 DCC = {DCC_TO_USDT_RATE} USDT)</span>}
          >
            <Input
              value={formData.usdtAmount}
              readOnly
              className="bg-gray-900 border-gray-700 text-gray-400"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">Transaction Hash</span>}
            required
          >
            <Input
              value={formData.txHash}
              onChange={(e) => setFormData({...formData, txHash: e.target.value})}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">Remarks</span>}
          >
            <Input.TextArea
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button
                onClick={() => setIsDCCModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className={`${
                  transactionType === 'recharge'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                } border-0`}
              >
                Confirm
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* License Modal */}
      <Modal
        title={
          <span className="text-gray-200">
            Institution License - {selectedInstitution?.name}
          </span>
        }
        open={isLicenseModalOpen}
        onCancel={() => setIsLicenseModalOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsLicenseModalOpen(false)}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            Close
          </Button>
        ]}
        className="dark-modal"
        width={600}
        >
  {/* Modal Content */}

        {/* License Modal Content */}
        <div className="space-y-6">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">License Number</label>
                <p className="text-gray-200 font-medium">{MOCK_LICENSE.licenseNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Status</label>
                <p>
                  <Tag color="success">{MOCK_LICENSE.status}</Tag>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Issued Date</label>
                <p className="text-gray-200">{MOCK_LICENSE.issuedDate}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Expiry Date</label>
                <p className="text-gray-200">{MOCK_LICENSE.expiryDate}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-gray-200 font-medium mb-3">Issued By</h4>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-200">{MOCK_LICENSE.issuedBy}</p>
            </div>
          </div>

          <div>
            <h4 className="text-gray-200 font-medium mb-3">Certifications</h4>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="space-y-2">
                {MOCK_LICENSE.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-200">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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

// Stat Card Component
const StatCard = ({ icon, title, value, subValue, iconColor, bgColor }) => (
  <div className="border border-gray-700 rounded-lg p-4 bg-black/30 hover:bg-black/40 transition-colors">
    <div className="flex items-center text-sm font-medium text-gray-400 mb-3">
      <div className={`p-2 rounded-lg bg-gradient-to-br ${bgColor} mr-2`}>
        {React.cloneElement(icon, { className: `w-4 h-4 ${iconColor}` })}
      </div>
      {title}
    </div>
    <div>
      <div className="text-xl font-semibold text-gray-200">
        {value.toLocaleString()}
      </div>
      {subValue && (
        <div className="text-sm text-gray-500 mt-1 truncate">
          {subValue}
        </div>
      )}
    </div>
  </div>
);

// Token Trading Card Component
const TokenTradingCard = ({ bought, sold, balance, rewards, consumption }) => (
  <div className="border border-gray-700 rounded-lg p-4 bg-black/30 hover:bg-black/40 transition-colors">
    <div className="text-sm font-medium text-gray-400 mb-3">Token Information</div>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-green-500">Recharged</span>
        <span className="font-medium text-gray-200">{bought?.toLocaleString() || 0} DCC</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-red-500">Sold</span>
        <span className="font-medium text-gray-200">{sold?.toLocaleString() || 0} DCC</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-blue-500">Balance</span>
        <span className="font-medium text-gray-200">{balance?.toLocaleString() || 0} DCC</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-yellow-500">Rewards</span>
        <span className="font-medium text-gray-200">{rewards?.toLocaleString() || 0} DCC</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-purple-500">Consumed</span>
        <span className="font-medium text-gray-200">{consumption?.toLocaleString() || 0} DCC</span>
      </div>
    </div>
  </div>
);

export default InstitutionList;