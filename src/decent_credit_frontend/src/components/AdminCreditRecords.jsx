import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, FileText } from 'lucide-react';
import { getCreditRecords, createCreditRecord } from '../services/adminCreditService';
import { Card, Input, Button, Form, Modal, Spin, Empty, Space, Tag, Alert, message } from 'antd';

const CreditRecords = () => {
  const [form] = Form.useForm();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [searchForm] = Form.useForm();

  useEffect(() => {
    handleSearch();
  }, []);


  const handleSearch = async (values = {}) => {
    setLoading(true);
    try {
      // // 如果没有传入值或者 values.institutionId 为空，传递空字符串
      // const institutionId = values?.institutionId?.trim() || '';
      // console.log('Searching with institutionId:', institutionId);
      
      const response = await getCreditRecords();
      if (response.success) {
        setRecords(response.data);
      } else {
        message.error(response.message || 'Search failed');
        setRecords([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      message.error(error.message || 'Search failed');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (values) => {
    try {
      setSubmitLoading(true);
      setError('');

      console.log('Submitting values:', values); // Debug log

      const response = await createCreditRecord({
        institutionId: values.institutionId,
        deductionPoints: values.deductionPoints,
        reason: values.reason,
        dataQualityIssue: values.dataQualityIssue
      });

      console.log('Create response:', response); // Debug log

      if (response.success) {
        message.success('Record created successfully');
        await handleSearch();
        setIsCreateDialogOpen(false);
        form.resetFields();
      } else {
        setError(response.message || 'Failed to create record');
        message.error(response.message || 'Failed to create record');
      }
    } catch (error) {
      console.error('Submit error:', error); // Debug log
      setError(error.message || 'Failed to create record');
      message.error(error.message || 'Failed to create record');
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
    form.resetFields();
  };

  // Form validation rules
  const formRules = {
    institutionId: [
      { required: true, message: 'Please enter Institution ID' }
    ],
    dataQualityIssue: [
      { required: true, message: 'Please enter data quality issue description' }
    ],
    deductionPoints: [
      { required: true, message: 'Please enter deduction points' },
      { type: 'number', min: 0, max: 100, transform: (value) => Number(value) }
    ],
    reason: [
      { required: true, message: 'Please enter deduction reason' }
    ]
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Credit Management</h2>
        <p className="text-gray-400">Manage institution credit records and data quality issues</p>
      </div>

      <div className="space-y-4">
        <Card className="bg-black/20 border-gray-700">
          <h3 className="text-base font-medium text-gray-200 mb-4 flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Search Criteria
          </h3>
          <Form 
            form={searchForm}
            layout="inline" 
            onFinish={handleSearch}
          >
            <Space wrap className="w-full justify-between">
              <Form.Item
                name="institutionId"
                label={<span className="text-gray-400">Institution ID</span>}
              >
                <Input
                  placeholder="Enter Institution ID"
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
                  Search Records
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card 
          className="bg-black/20 border-gray-700"
          title={
            <div className="flex justify-between items-center">
              <Space className="text-gray-200">
                <FileText className="w-4 h-4" />
                Search Results
              </Space>
              <Button
                type="primary"
                danger
                icon={<AlertTriangle className="w-4 h-4" />}
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 border-0"
              >
                Create Deduction Record
              </Button>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Spin tip="Loading..." size="large" />
            </div>
          ) : records.length === 0 ? (
            <Empty description={<span className="text-gray-400">No records found</span>} />
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
                        <Tag color="error">Deduction Record</Tag>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">Record ID: {record.recordId}</p>
                      <p className="mt-1 text-sm text-gray-400">Institution ID: {record.institutionId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        Operation Time: {new Date(record.createdAt).toLocaleString('en-US')}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Operator: {record.operatorName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Data Quality Issue</h4>
                    <p className="text-sm text-gray-200">{record.dataQualityIssue}</p>
                  </div>

                  <div className="mt-4 bg-red-500/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-red-400">Penalty Details</h4>
                        <p className="mt-1 text-sm text-red-500">Points Deducted: -{record.deductionPoints}</p>
                      </div>
                      <Button
                        type="link"
                        onClick={() => handleViewDetail(record)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        title={<span className="text-gray-200">Create Deduction Record</span>}
        open={isCreateDialogOpen}
        onCancel={closeCreateDialog}
        footer={null}
        className="dark-modal"
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-4"
            closable
            onClose={() => setError('')}
          />
        )}
        
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          validateMessages={{
            required: '${label} is required',
            types: {
              number: '${label} must be a number'
            },
            number: {
              min: '${label} must be at least ${min}',
              max: '${label} cannot be greater than ${max}'
            }
          }}
        >
          <Form.Item
            name="institutionId"
            label={<span className="text-gray-400">Institution ID</span>}
            rules={formRules.institutionId}
          >
            <Input
              className="bg-gray-800 border-gray-700 text-gray-200"
              disabled={submitLoading}
            />
          </Form.Item>

          <Form.Item
            name="dataQualityIssue"
            label={<span className="text-gray-400">Data Quality Issue Description</span>}
            rules={formRules.dataQualityIssue}
          >
            <Input.TextArea
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
              disabled={submitLoading}
            />
          </Form.Item>

          <Form.Item
            name="deductionPoints"
            label={<span className="text-gray-400">Points to Deduct</span>}
            rules={formRules.deductionPoints}
          >
            <Input
              type="number"
              className="bg-gray-800 border-gray-700 text-gray-200"
              disabled={submitLoading}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span className="text-gray-400">Reason for Deduction</span>}
            rules={formRules.reason}
          >
            <Input.TextArea
              rows={3}
              className="bg-gray-800 border-gray-700 text-gray-200"
              disabled={submitLoading}
            />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button
                onClick={closeCreateDialog}
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                disabled={submitLoading}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading}
                danger
                className="bg-gradient-to-r from-red-500 to-red-600 border-0"
              >
                Confirm Deduction
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-gray-200">Deduction Record Details</span>}
        open={isDetailDialogOpen}
        onCancel={() => setIsDetailDialogOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsDetailDialogOpen(false)}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            Close
          </Button>
        ]}
        className="dark-modal"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <DescriptionItem label="Record ID" value={selectedRecord.recordId} />
            <DescriptionItem label="Institution Name" value={selectedRecord.institutionName} />
            <DescriptionItem label="Institution ID" value={selectedRecord.institutionId} />
            <DescriptionItem label="Data Quality Issue" value={selectedRecord.dataQualityIssue} />
            <DescriptionItem 
              label="Points Deducted" 
              value={`-${selectedRecord.deductionPoints}`}
              valueClass="text-red-500"
            />
            <DescriptionItem label="Reason for Deduction" value={selectedRecord.reason} />
            <DescriptionItem 
              label="Operation Time" 
              value={new Date(selectedRecord.createdAt).toLocaleString('en-US')}
            />
            <DescriptionItem label="Operator" value={selectedRecord.operatorName} />
          </div>
        )}
      </Modal>
    </div>
  );
};

const DescriptionItem = ({ label, value, valueClass = "text-gray-200" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400">{label}</label>
    <p className={`mt-1 text-sm ${valueClass} break-all`}>{value}</p>
  </div>
);

export default CreditRecords;