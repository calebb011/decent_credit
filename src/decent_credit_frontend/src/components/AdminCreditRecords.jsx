// CreditRecords.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, FileText } from 'lucide-react';
import { getCreditRecords, createCreditRecord } from '../services/adminCreditService';
import { Loader } from 'lucide-react';
import { Card, Input, Button, Form, Modal, Spin, Empty, Space, Tag } from 'antd';

const CreditRecords = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);


  const [searchForm, setSearchForm] = useState({
    
    institutionId: '',
  });

  const [newRecord, setNewRecord] = useState({
    institutionId: '',
    deductionPoints: '',
    reason: '',
    dataQualityIssue: ''
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await getCreditRecords(searchForm.institutionId);
      if (response.success) {
        setRecords(response.data);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
  
    try {
      const response = await createCreditRecord(newRecord);
      if (response.success) {
        await fetchRecords();
        setNewRecord({
          institutionId: '',
          deductionPoints: '',
          reason: '',
          dataQualityIssue: ''
        });
        setIsCreateDialogOpen(false);
      } else {
        setError(response.message || '创建记录失败');
      }
    } catch (error) {
      setError(error.message || '创建记录失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };
  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setError('');
    setNewRecord({
      institutionId: '',
      deductionPoints: '',
      reason: '',
      dataQualityIssue: ''
    });
  };
  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">信用管理</h2>
        <p className="text-gray-400">管理机构的信用记录及数据质量问题</p>
      </div>

      <div className="space-y-4">
        {/* 查询条件卡片 */}
        <Card className="bg-black/20 border-gray-700">
          <h3 className="text-base font-medium text-gray-200 mb-4 flex items-center">
            <Search className="w-4 h-4 mr-2" />
            查询条件
          </h3>
          <Form layout="inline" onFinish={handleSearch}>
            <Space wrap className="w-full justify-between">
              <Form.Item
                label={<span className="text-gray-400">机构ID</span>}
              >
                <Input
                  value={searchForm.institutionId}
                  onChange={(e) => setSearchForm({...searchForm, institutionId: e.target.value})}
                  placeholder="请输入机构ID"
                  className="bg-gray-800 border-gray-700 text-gray-200"
                  prefix={<Search className="text-gray-400" />}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Search className="w-4 h-4" />}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 border-0"
                >
                  查询记录
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        {/* 查询结果卡片 */}
        <Card 
          className="bg-black/20 border-gray-700"
          title={
            <div className="flex justify-between items-center">
              <Space className="text-gray-200">
                <FileText className="w-4 h-4" />
                查询结果
              </Space>
              <Button
                type="primary"
                danger
                icon={<AlertTriangle className="w-4 h-4" />}
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 border-0"
              >
                创建扣分记录
              </Button>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Spin tip="加载中..." size="large" />
            </div>
          ) : records.length === 0 ? (
            <Empty description={<span className="text-gray-400">暂无记录</span>} />
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <Card 
                  key={record.id}
                  className="bg-black/30 border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-medium text-gray-200">
                          {record.institutionName}
                        </h3>
                        <Tag color="error">扣分记录</Tag>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">记录ID: {record.recordId}</p>
                      <p className="mt-1 text-sm text-gray-400">机构ID: {record.institutionId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        操作时间: {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        操作人: {record.operatorName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">数据质量问题</h4>
                    <p className="text-sm text-gray-200">{record.dataQualityIssue}</p>
                  </div>

                  <div className="mt-4 bg-red-500/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-red-400">处罚详情</h4>
                        <p className="mt-1 text-sm text-red-500">扣除分数: -{record.deductionPoints}</p>
                      </div>
                      <Button
                        type="link"
                        onClick={() => handleViewDetail(record)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        查看详情
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 创建记录弹窗 */}
      <Modal
        title={<span className="text-gray-200">创建扣分记录</span>}
        open={isCreateDialogOpen}
        onCancel={closeCreateDialog}
        footer={null}
        className="dark-modal"
      >
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label={<span className="text-gray-400">机构ID</span>}
            required
          >
            <Input
              value={newRecord.institutionId}
              onChange={(e) => setNewRecord({...newRecord, institutionId: e.target.value})}
              className="bg-gray-800 border-gray-700 text-gray-200"
              disabled={submitLoading}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">数据质量问题描述</span>}
            required
          >
            <Input.TextArea
              value={newRecord.dataQualityIssue}
              onChange={(e) => setNewRecord({...newRecord, dataQualityIssue: e.target.value})}
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">扣除分数</span>}
            required
          >
            <Input
              type="number"
              value={newRecord.deductionPoints}
              onChange={(e) => setNewRecord({...newRecord, deductionPoints: e.target.value})}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-gray-400">扣分原因</span>}
            required
          >
            <Input.TextArea
              value={newRecord.reason}
              onChange={(e) => setNewRecord({...newRecord, reason: e.target.value})}
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button
                onClick={closeCreateDialog}
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading}
                danger
                className="bg-gradient-to-r from-red-500 to-red-600 border-0"
              >
                确认扣分
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={<span className="text-gray-200">扣分记录详情</span>}
        open={isDetailDialogOpen}
        onCancel={() => setIsDetailDialogOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsDetailDialogOpen(false)}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            关闭
          </Button>
        ]}
        className="dark-modal"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <DescriptionItem label="记录ID" value={selectedRecord.recordId} />
            <DescriptionItem label="机构名称" value={selectedRecord.institutionName} />
            <DescriptionItem label="机构ID" value={selectedRecord.institutionId} />
            <DescriptionItem label="数据质量问题" value={selectedRecord.dataQualityIssue} />
            <DescriptionItem 
              label="扣除分数" 
              value={`-${selectedRecord.deductionPoints}`}
              valueClass="text-red-500"
            />
            <DescriptionItem label="扣分原因" value={selectedRecord.reason} />
            <DescriptionItem 
              label="操作时间" 
              value={new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}
            />
            <DescriptionItem label="操作人" value={selectedRecord.operatorName} />
          </div>
        )}
      </Modal>
    </div>
  );
};

// 描述列表项组件
const DescriptionItem = ({ label, value, valueClass = "text-gray-200" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400">{label}</label>
    <p className={`mt-1 text-sm ${valueClass} break-all`}>{value}</p>
  </div>
);

export default CreditRecords;