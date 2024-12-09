import React, { useState, useEffect } from 'react';
import { 
  Typography, List, Card, Space, Progress, Row, Col, 
  Tag, Badge, Button, Modal, Spin, Empty
} from 'antd';
import { 
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { queryRecordList } from '../services/institutionQueryRecordService';

const { Title, Text } = Typography;

const CreditRecords = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const institutionId = localStorage.getItem('adminUserPrincipal');
      const response = await queryRecordList(institutionId);
      if (response?.records) {
        setRecords(response.records);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };



  const getRecordTypeConfig = (type) => {
    const configs = {
      'loan': {
        color: '#1890ff',
        text: 'Loan Record',
        icon: <AlertOutlined className="text-blue-500" />
      },
      'repayment': {
        color: '#52c41a',
        text: 'Repayment Record',
        icon: <CheckCircleOutlined className="text-green-500" />
      },
      'overdue': {
        color: '#f5222d',
        text: 'Overdue Record',
        icon: <CloseCircleOutlined className="text-red-500" />
      }
    };
    return configs[type] || { color: '#d9d9d9', text: 'Unknown Record', icon: <InfoCircleOutlined /> };
  };

  const renderContent = (content) => {
    if (!content) return null;

    const getContentCard = () => {
      switch (content.type) {
        case 'loan':
          return (
            <div className="space-y-4">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card className="bg-gray-800/30 border-gray-700">
                    <Space direction="vertical">
                      <Text className="text-gray-400">Amount</Text>
                      <Text className="text-lg text-blue-400">${content.amount}</Text>
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="bg-gray-800/30 border-gray-700">
                    <Space direction="vertical">
                      <Text className="text-gray-400">Term</Text>
                      <Text className="text-lg text-blue-400">{content.term_months} months</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
              <Card className="bg-gray-800/30 border-gray-700">
                <Space direction="vertical" className="w-full">
                  <Text className="text-gray-400">Interest Rate</Text>
                  <Progress 
                    percent={content.interest_rate} 
                    size="small" 
                    strokeColor="#1890ff"
                    format={percent => `${percent}%`}
                  />
                </Space>
              </Card>
            </div>
          );
        case 'repayment':
          return (
            <Card className="bg-gray-800/30 border-gray-700">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Space direction="vertical">
                    <Text className="text-gray-400">Amount</Text>
                    <Text className="text-lg text-green-400">${content.amount}</Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical">
                    <Text className="text-gray-400">Date</Text>
                    <Text className="text-gray-300">{content.repayment_date}</Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          );
        case 'overdue':
          return (
            <div className="space-y-4">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card className="bg-red-900/20 border-red-800/30">
                    <Space direction="vertical">
                      <Text className="text-gray-400">Overdue Amount</Text>
                      <Text className="text-lg text-red-400">${content.amount}</Text>
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="bg-red-900/20 border-red-800/30">
                    <Space direction="vertical">
                      <Text className="text-gray-400">Days Overdue</Text>
                      <Text className="text-lg text-red-400">{content.overdueDays} days</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="space-y-4">
        <Text className="text-gray-300">Loan ID: {content.loan_id}</Text>
        {getContentCard()}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center pb-6 border-b border-gray-700">
        <Title level={3} className="!text-gray-200">
          <SafetyCertificateOutlined className="mr-2 text-blue-500" />
          Credit Records Management
        </Title>
        <Text className="text-gray-400">View and manage institution credit records</Text>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spin size="large" />
        </div>
      ) : records.length === 0 ? (
        <Empty description={<Text className="text-gray-400">No records found</Text>} />
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const typeConfig = getRecordTypeConfig(record.record_type);
            return (
              <Card
                key={record.id}
                className="bg-gray-800/30 border-gray-700"
                title={
                  <Space>
                    {typeConfig.icon}
                    <Text className="text-gray-200">{typeConfig.text}</Text>
                    <Badge
                      count={record.status.toUpperCase()}
                      style={{ backgroundColor: 
                        record.status === 'confirmed' ? '#52c41a' :
                        record.status === 'pending' ? '#faad14' : '#f5222d'
                      }}
                    />
                  </Space>
                }
              >
                <div className="space-y-6">
                  <Row gutter={24} className="mb-4">
                    <Col span={12}>
                      <Space direction="vertical">
                        <Text className="text-gray-400">Record ID</Text>
                        <Text className="text-gray-200">{record.id}</Text>
                      </Space>
                    </Col>
                    <Col span={12} className="text-right">
                      <Space direction="vertical">
                        <Text className="text-gray-400">Event Date</Text>
                        <Text className="text-gray-200">{record.event_date}</Text>
                      </Space>
                    </Col>
                  </Row>

                  <div className="bg-black/20 rounded-lg p-4">
                    {renderContent(record.content)}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <Space>
                      <ClockCircleOutlined className="text-gray-400" />
                      <Text className="text-gray-400">
                        {new Date(Number(record.timestamp)).toLocaleString()}
                      </Text>
                    </Space>
                    <Button
                      type="primary"
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsDetailModalOpen(true);
                      }}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        title={
          <Space>
            <InfoCircleOutlined className="text-blue-500" />
            <Text className="text-gray-200">Record Details</Text>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsDetailModalOpen(false)}
            className="bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
          >
            Close
          </Button>
        ]}
        className="dark-modal"
      >
        {selectedRecord && (
          <div className="space-y-6 py-4">
            {renderContent(selectedRecord.content)}
            <div className="border-t border-gray-700 pt-4">
              <Space direction="vertical" className="w-full">
                <Text className="text-gray-400">Additional Information</Text>
                {selectedRecord.query_price && (
                  <Text className="text-gray-300">Query Price: {selectedRecord.query_price}</Text>
                )}
                <Text className="text-gray-300">
                  Created: {new Date(Number(selectedRecord.timestamp)).toLocaleString()}
                </Text>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CreditRecords;