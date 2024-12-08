import React, { useState } from 'react';
import { 
  Card, Form, Input, Button, Table, Tag, Empty, Space, message, Modal, 
  Typography, List, Divider, Statistic 
} from 'antd';
import { 
  SearchOutlined, FileTextOutlined, SafetyCertificateOutlined,
  AlertOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryRecordsByUserDid } from '../services/institutionQueryRecordService';
import { queryRecordById, getRiskAssessment } from '../services/institutionQueryRecordService';

import RiskAssessmentReport from './RiskAssessmentReport';

const CreditRecordQuery = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [riskAssessmentVisible, setRiskAssessmentVisible] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [currentUserDid, setCurrentUserDid] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [userDid, setUserDid] = useState('');

  // Record type configuration
  const getRecordTypeConfig = (type) => {
    const config = {
      'LoanRecord': { text: 'Loan Record', color: 'blue' },
      'RepaymentRecord': { text: 'Repayment Record', color: 'green' },
      'OverdueRecord': { text: 'Notification Record', color: 'orange' }
    };
    return config[type] || { text: type, color: 'default' };
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSearch = async (values) => {
    setLoading(true);
    setSearchPerformed(true);
    try {
      setUserDid(values.userDid);
      const response = await queryRecordsByUserDid(values.userDid);
      console.log(response)
      if (response.success) {
        setRecords(response.data);
        setCurrentUserDid(values.userDid);
        if (response.data.length === 0) {
          message.info('No records found');
        }
      } else {
        message.error(response.message || 'Query failed');
      }
    } catch (error) {
      console.error('Query failed:', error);
      message.error(error.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (record) => {
    setDetailLoading(true);
    try {
      // 获取登录机构 ID
      const loginInstitutionId = localStorage.getItem('userPrincipal');
      if (!loginInstitutionId) {
        throw new Error('Please login again');
      }
  
      if (!record?.id) {
        throw new Error('Record ID is required');
      }
  
      // 查询记录详情
      const response = await queryRecordById(record.id,loginInstitutionId );
      console.log('Details response:', response);
  
      // 检查响应数据
      if (response.success && response.data) {
        // 格式化详情数据
        const formattedDetails = {
          institution_name: response.data.institution_full_name,
          institution_id: loginInstitutionId, // 添加机构ID
          records: [{
            id: response.data.id,
            record_type: response.data.record_type === 'loan' ? 'LoanRecord' :
                        response.data.record_type === 'repayment' ? 'RepaymentRecord' :
                        response.data.record_type === 'overdue' ? 'OverdueRecord' :
                        response.data.record_type,
            timestamp: response.data.timestamp,
            status: response.data.status === 'pending' ? 'Pending' :
                   response.data.status === 'confirmed' ? 'Confirmed' :
                   response.data.status === 'failed' ? 'Failed' :
                   response.data.status,
            content: response.data.content,
            event_date: response.data.event_date,
            user_did: response.data.user_did,
            canister_id: response.data.canister_id,
            reward_amount: response.data.reward_amount
          }]
        };
  
        setCurrentDetails(formattedDetails);
        setDetailVisible(true);
        message.success('Query successful');
      } else {
        throw new Error(response.message || 'No record details found');
      }
    } catch (error) {
      console.error('Failed to query details:', error);
      message.error('Failed to query details: ' + (error.message || 'Unknown error'));
    } finally {
      setDetailLoading(false);
    }
  };
  const handleRiskAssessment = async () => {
    setAssessmentLoading(true);
    try {
      const loginInstitutionId = localStorage.getItem('userPrincipal');
      if (!loginInstitutionId) {
        throw new Error('Please login again');
      }
      console.log(loginInstitutionId)
      const response = await getRiskAssessment(loginInstitutionId,userDid);
      console.log(response)
      if (response.success) {
        setRiskAssessment(response.data);
        setRiskAssessmentVisible(true);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      message.error('Risk assessment failed: ' + (error.message || 'Unknown error'));
    } finally {
      setAssessmentLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '30%',
    },
    {
      title: 'Institution ID',
      dataIndex: 'institution_id',
      key: 'institution_id',
      width: '30%',
      ellipsis: true,
    },
    {
      title: 'Institution Name',
      dataIndex: 'institution_full_name',
      key: 'institution_full_name',
      width: '30%',
    },
    {
      title: 'Upload Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '20%',
      render: (timestamp) => dayjs(Number(timestamp) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Query Price',
      dataIndex: 'query_price',
      key: 'query_price',
      width: '10%',
      render: (price) => {
        if (price === null || price === undefined) return '-';
        return `${Number(price)} DCC`;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          loading={detailLoading}
        >
          View Details
        </Button>
      ),
    }
  ];

  const detailColumns = [
    {
      title: 'Record Type',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 120,
      render: (type) => {
        const config = getRecordTypeConfig(type);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Submission Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => dayjs(Number(timestamp) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusConfig = {
          'Pending': { color: 'processing', text: 'Processing' },
          'Confirmed': { color: 'success', text: 'Confirmed' },
          'Failed': { color: 'error', text: 'Failed' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      render: (content, record) => {
        if (!content) return '-';
  
        return (
          <Space direction="vertical">
            {content.amount && <div>Amount: {formatAmount(content.amount)}</div>}
            {content.term_months && <div>Term: {content.term_months} months</div>}
            {content.interest_rate && <div>Annual Interest Rate: {content.interest_rate}%</div>}
            {content.loan_id && <div>Loan ID: {content.loan_id}</div>}
            {content.repayment_date && <div>Repayment Date: {content.repayment_date}</div>}
            {content.overdueDays && <div>Overdue Days: {content.overdueDays} days</div>}
            {content.period_amount && <div>Period Amount: {formatAmount(content.period_amount)}</div>}
          </Space>
        );
      },
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Credit Record Query</h2>
        <p className="text-gray-400">Query and manage user credit history records</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-black/20 border-gray-700">
          <Form
            form={form}
            layout="inline"
            className="w-full"
            onFinish={handleSearch}
          >
            <Space wrap className="w-full justify-between">
              <Space wrap>
                <Form.Item
                  name="userDid"
                  label={<span className="text-gray-300">User DID</span>}
                  rules={[{ required: true, message: 'Please input User DID' }]}
                >
                  <Input 
                    prefix={<SearchOutlined className="text-gray-400" />} 
                    placeholder="Enter User DID"
                    className="bg-gray-800 border-gray-700 text-gray-200"
                  />
                </Form.Item>
              </Space>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    htmlType="submit"
                    loading={loading}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
                  >
                    Query Records
                  </Button>
                  <Button 
                    onClick={() => form.resetFields()}
                    className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                  >
                    Reset
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card 
          className="bg-black/20 border-gray-700"
          title={
            <div className="flex justify-between items-center text-gray-200">
              <Space><FileTextOutlined /> Query Results</Space>
              {records.length > 0 && (
                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  onClick={handleRiskAssessment}
                  loading={assessmentLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
                >
                  Perform Risk Assessment
                </Button>
              )}
            </div>
          }
        >
          {!searchPerformed ? (
            <Empty description={<span className="text-gray-400">Please enter query criteria</span>} />
          ) : records.length === 0 ? (
            <Empty description={<span className="text-gray-400">No records found</span>} />
          ) : (
            <Table
              columns={columns}
              dataSource={records}
              rowKey={(record) => `${record.institution_id}_${record.timestamp}`}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} records`,
                pageSize: 10,
                className: "px-4 py-3"
              }}
              className="custom-table"
            />
          )}
        </Card>
      </div>

      <Modal
        title={
          <Space className="text-gray-200">
            <FileTextOutlined />
            Credit Record Details - {currentDetails?.institution_name || ''}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={900}
        footer={[
          <Button 
            key="close" 
            onClick={() => setDetailVisible(false)}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            Close
          </Button>
        ]}
        className="dark-modal"
      >
        {currentDetails ? (
          <Table
            columns={detailColumns}
            dataSource={currentDetails.records}
            rowKey={(record) => `${record.id}_${record.timestamp}`}
            pagination={false}
            className="custom-table"
          />
        ) : (
          <Empty description={<span className="text-gray-400">No detailed information available</span>} />
        )}
      </Modal>

      <Modal
        title={
          <Space className="text-gray-200">
            <AlertOutlined />
            User Risk Assessment Report
          </Space>
        }
        open={riskAssessmentVisible}
        onCancel={() => setRiskAssessmentVisible(false)}
        width={800}
        footer={null}
        className="dark-modal"
      >
        {riskAssessment && <RiskAssessmentReport data={riskAssessment} showCard={false} />}
      </Modal>
    </div>
  );
};

export default CreditRecordQuery;