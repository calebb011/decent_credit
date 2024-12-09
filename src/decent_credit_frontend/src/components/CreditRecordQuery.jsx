import React, { useState } from 'react';
import { 
  Card, Form, Input, Button, Table, Tag, Empty, Space, message, Modal, 
  Typography, Progress, Row, Col ,Spin 
} from 'antd';
import { 
  SearchOutlined, FileTextOutlined, SafetyCertificateOutlined,
  AlertOutlined, EyeOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryRecordsByUserDid, queryRecordById, getRiskAssessment } from '../services/institutionQueryRecordService';

const { Title, Text } = Typography;

const CreditRecordQuery = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [riskAssessmentVisible, setRiskAssessmentVisible] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [userDid, setUserDid] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  const getRiskLevelConfig = (level) => {
    const configs = {
      'low': {
        color: '#3f8600',
        text: 'Low Risk',
        badge: 'success',
        description: 'Good credit history with low risk level'
      },
      'medium': {
        color: '#faad14',
        text: 'Medium Risk',
        badge: 'warning',
        description: 'Some risk factors present, requires attention'
      },
      'high': {
        color: '#cf1322',
        text: 'High Risk',
        badge: 'error',
        description: 'Significant risk factors identified'
      }
    };
    return configs[level] || configs.medium;
  };

  const translateRiskLevel = (level) => {
    const translations = {
      '低风险': 'low',
      '中等风险': 'medium',
      '高风险': 'high'
    };
    return translations[level] || 'medium';
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
      if (response.success) {
        setRecords(response.data);
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
      const loginInstitutionId = localStorage.getItem('userPrincipal');
      if (!loginInstitutionId) {
        throw new Error('Please login again');
      }

      const response = await queryRecordById(record.id, loginInstitutionId);
      if (response.success && response.data) {
        const formattedDetails = {
          institution_name: response.data.institution_full_name,
          institution_id: loginInstitutionId,
          records: [{
            id: response.data.id,
            record_type: response.data.record_type,
            timestamp: response.data.timestamp,
            status: response.data.status,
            content: response.data.content,
            event_date: response.data.event_date
          }]
        };
        
        setCurrentDetails(formattedDetails);
        setDetailVisible(true);
      } else {
        throw new Error(response.message || 'No record details found');
      }
    } catch (error) {
      message.error('Failed to fetch details: ' + error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRiskAssessment = async () => {
    setAssessmentLoading(true);
    try {
      const institutionId = localStorage.getItem('userPrincipal');
      const response = await getRiskAssessment(institutionId, userDid);
      if (response.success) {
        // Transform Chinese risk level to English
        const transformedData = {
          ...response.data,
          riskLevel: translateRiskLevel(response.data.riskLevel)
        };
        setRiskAssessment(transformedData);
        setRiskAssessmentVisible(true);
      } else {
        message.error(response.message || 'Risk assessment failed');
      }
    } catch (error) {
      message.error('Risk assessment failed: ' + error.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '20%',
    },
    {
      title: 'Institution ID',
      dataIndex: 'institution_id',
      key: 'institution_id',
      width: '25%',
      ellipsis: true,
    },
    {
      title: 'Institution Name',
      dataIndex: 'institution_full_name',
      key: 'institution_full_name',
      width: '20%',
    },
    {
      title: '日期',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '15%',
      render: (timestamp) => {
        const milliseconds = Number(timestamp) / 1000000;
        return dayjs(milliseconds).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: 'Query Price',
      dataIndex: 'query_price',
      key: 'query_price',
      width: '10%',
      render: (price) => price ? `${price} DCC` : '-',
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
          Details
        </Button>
      ),
    }
  ];

  const detailColumns = [
    {
      title: 'Record Type',
      dataIndex: 'record_type',
      key: 'record_type',
      width: '15%',
      render: (type) => {
        const typeConfig = {
          'loan': { color: 'blue', text: 'Loan' },
          'repayment': { color: 'green', text: 'Repayment' },
          'overdue': { color: 'red', text: 'Overdue' }
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Event Date',
      dataIndex: 'event_date',
      key: 'event_date',
      width: '15%',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status) => {
        const statusConfig = {
          'pending': { color: 'processing', text: 'Processing' },
          'confirmed': { color: 'success', text: 'Confirmed' },
          'rejected': { color: 'error', text: 'Rejected' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      render: (content) => {
        if (!content) return '-';
        
        return (
          <Space direction="vertical">
            {content.amount && <div>Amount: {formatAmount(content.amount)}</div>}
            {content.term_months && <div>Term: {content.term_months} months</div>}
            {content.interest_rate && <div>Interest Rate: {content.interest_rate}%</div>}
            {content.loan_id && <div>Loan ID: {content.loan_id}</div>}
            {content.repayment_date && <div>Repayment Date: {content.repayment_date}</div>}
            {content.overdueDays && <div>Overdue Days: {content.overdueDays}</div>}
          </Space>
        );
      },
    }
  ];

  const RiskAssessmentContent = ({ data }) => (
    <div className="space-y-6 p-4">
      {/* Credit Score Section */}
      <div className="bg-gray-800/30 p-6 rounded-lg">
        <Row gutter={24} align="middle">
          <Col span={12} className="text-center">
            <div className="relative inline-block">
              <Progress
                type="circle"
                percent={data.creditScore}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                strokeWidth={8}
                className="mb-4"
              />
              <Tag
                color={getRiskLevelConfig(data.riskLevel).color}
                className="absolute -top-2 -right-2"
              >
                {getRiskLevelConfig(data.riskLevel).text}
              </Tag>
            </div>
          </Col>
          <Col span={12}>
            <div className="space-y-4">
              <div>
                <Text className="text-gray-400">Credit Score</Text>
                <div className="text-2xl font-bold text-gray-200">
                  {data.creditScore}
                </div>
              </div>
              <div>
                <Text className="text-gray-400">Risk Assessment</Text>
                <div className="text-lg text-gray-200">
                  {getRiskLevelConfig(data.riskLevel).description}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Assessment Details */}
      <Card className="bg-gray-800/30 border-gray-700">
        <Title level={5} className="!text-gray-200">
          <InfoCircleOutlined className="mr-2" />
          Assessment Details
        </Title>
        <div className="space-y-2 mt-4">
          {data.assessmentDetails.map((detail, index) => (
            <div 
              key={index} 
              className="flex items-center p-3 bg-gray-900/30 rounded-lg"
            >
              <CheckCircleOutlined className="text-blue-500 mr-2" />
              <Text className="text-gray-200">{detail}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gray-800/30 border-gray-700">
        <Title level={5} className="!text-gray-200">
          <SafetyCertificateOutlined className="mr-2" />
          Recommendations
        </Title>
        <div className="space-y-2 mt-4">
          {data.suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="flex items-center p-3 bg-gray-900/30 rounded-lg"
            >
              <Tag color="blue" className="mr-2">{index + 1}</Tag>
              <Text className="text-gray-200">{suggestion}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Credit Record Query</h2>
        <p className="text-gray-400">Query and manage user credit history records</p>
      </div>

      <Card className="bg-black/20 border-gray-700">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
        >
          <Space wrap className="w-full justify-between">
            <Form.Item
              name="userDid"
              label={<span className="text-gray-300">User DID</span>}
              rules={[{ required: true, message: 'Please enter User DID' }]}
            >
              <Input 
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder="Enter User DID"
                className="bg-gray-800 border-gray-700 text-gray-200"
              />
            </Form.Item>
            
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 border-0"
              >
                Search Records
              </Button>
              {records.length > 0 && (
                <Button
                  onClick={handleRiskAssessment}
                  icon={<SafetyCertificateOutlined />}
                  loading={assessmentLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 border-0 text-white"
                >
                  Risk Assessment
                </Button>
              )}
            </Space>
          </Space>
        </Form>
      </Card>

      <Card 
        className="bg-black/20 border-gray-700"
        title={
          <div className="text-gray-200">
            <FileTextOutlined className="mr-2" />
            Query Results
          </div>
        }
      >
        {!searchPerformed ? (
          <Empty description={<span className="text-gray-400">Please enter search criteria</span>} />
        ) : loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
          </div>
        ) : records.length === 0 ? (
          <Empty description={<span className="text-gray-400">No records found</span>} />
        ) : (
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            className="custom-table"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} items`,
              pageSize: 10,
              className: "custom-pagination"
            }}
          />
        )}
      </Card>

      {/* Record Details Modal */}
      <Modal
        title={
          <Space className="text-gray-200">
            <FileTextOutlined />
            Record Details
            {currentDetails?.institution_name && 
              <Tag color="blue">{currentDetails.institution_name}</Tag>
            }
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
          <div className="space-y-4">
            <Table
              columns={detailColumns}
              dataSource={currentDetails.records}
              rowKey="id"
              pagination={false}
              className="custom-table"
            />
            <div className="bg-gray-800/30 p-4 rounded-lg mt-4">
              <Space direction="vertical" className="w-full">
                <Text className="text-gray-400">Additional Information</Text>
                <Space className="text-gray-200">
                  <InfoCircleOutlined />
                  Institution ID: {currentDetails.institution_id}
                </Space>
              </Space>
            </div>
          </div>
        ) : (
          <Empty description={<span className="text-gray-400">No details available</span>} />
        )}
      </Modal>

      {/* Risk Assessment Modal */}
      <Modal
        title={
          <Space className="text-gray-200">
            <SafetyCertificateOutlined className="text-blue-500" />
            Risk Assessment Report
          </Space>
        }
        open={riskAssessmentVisible}
        onCancel={() => setRiskAssessmentVisible(false)}
        width={800}
        footer={[
          <Button
            key="close"
            onClick={() => setRiskAssessmentVisible(false)}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            Close
          </Button>
        ]}
        className="dark-modal"
      >
        {riskAssessment ? (
          <RiskAssessmentContent data={riskAssessment} />
        ) : (
          <Empty description={<span className="text-gray-400">No assessment data available</span>} />
        )}
      </Modal>

      {/* CSS Styles */}
      <style jsx global>{`
        .custom-table .ant-table {
          background: transparent;
          color: #e5e7eb;
        }
        
        .custom-table .ant-table-thead > tr > th {
          background: rgba(0, 0, 0, 0.2);
          color: #e5e7eb;
          border-bottom: 1px solid #374151;
        }
        
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #374151;
          color: #e5e7eb;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(0, 0, 0, 0.3) !important;
        }
        
        .custom-table .ant-empty-description {
          color: #9ca3af;
        }
        
        .custom-table .ant-pagination {
          color: #e5e7eb;
        }
        
        .custom-table .ant-pagination-item a {
          color: #e5e7eb;
        }
        
        .custom-table .ant-pagination-item-active {
          background: #3b82f6;
          border-color: #3b82f6;
        }
        
        .custom-table .ant-pagination-item-active a {
          color: white;
        }
        
        .dark-modal .ant-modal-content {
          background: #1f2937;
          border: 1px solid #374151;
        }
        
        .dark-modal .ant-modal-header {
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }
        
        .dark-modal .ant-modal-title {
          color: #e5e7eb;
        }
        
        .dark-modal .ant-modal-close {
          color: #9ca3af;
        }
        
        .dark-modal .ant-modal-close:hover {
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default CreditRecordQuery;