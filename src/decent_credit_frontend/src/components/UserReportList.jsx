import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Typography, Tag, Row, Col, Divider } from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryAssessmentReports } from '../services/institutionQueryRecordService';

const { Title, Text } = Typography;

// 表格列配置
const getTableColumns = (onView) => [
  {
    title: 'Report ID',
    dataIndex: 'report_id',
    key: 'report_id',
    width: '20%',
  },
  {
    title: 'User DID',
    dataIndex: 'user_did',
    key: 'user_did',
    width: '25%',
    ellipsis: true,
  },
  {
    title: 'Credit Score',
    dataIndex: ['assessment', 'credit_score'],
    key: 'credit_score',
    width: '15%',
  },
  {
    title: 'Risk Level',
    dataIndex: ['assessment', 'risk_level'],
    key: 'risk_level',
    width: '15%',
    render: (level) => (
      <Tag color={getRiskLevelColor(level)}>{level}</Tag>
    ),
  },
  {
    title: 'Generated At',
    dataIndex: 'created_at',
    key: 'created_at',
    width: '15%',
    render: (time) => formatTimestamp(time),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Button type="link" icon={<EyeOutlined />} onClick={() => onView(record)}>
        View
      </Button>
    ),
  }
];

// 工具函数
const getRiskLevelColor = (level) => {
  const levels = {
    'Low Risk': 'success',
    'Medium Risk': 'warning',
    'High Risk': 'error'
  };
  return levels[level] || 'default';
};

const formatTimestamp = (time) => {
  const milliseconds = Number(time) / 1_000_000;
  return dayjs(milliseconds).format('YYYY-MM-DD HH:mm:ss');
};

const UserReportList = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [viewReport, setViewReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const institutionId = localStorage.getItem('userPrincipal');
      if (!institutionId) throw new Error('Please login again');
  
      const response = await queryAssessmentReports(institutionId);
      console.log('API Response:', response);
  
      // 处理返回的数据结构
      if ( response.data) {
        const formattedData = response.data.map(item => ({
          report_id: item.report_id,
          user_did: item.user_did,
          created_at: item.created_at,
          assessment: {
            credit_score: item.assessment.creditScore,
            risk_level: item.assessment.riskLevel,
            assessment_details: item.assessment.assessmentDetails || [],
            suggestions: item.assessment.suggestions || []
          }
        }));
        console.log('Formatted Data:', formattedData);
        setReports(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleView = (record) => {
    setViewReport(record);
    setModalVisible(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Risk Assessment Reports</h2>
        <p className="text-gray-400">View and manage risk assessment reports</p>
      </div>

      <Card 
        className="bg-black/20 border-gray-700"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchReports}
              loading={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
            >Query Reports</Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setReports([]); fetchReports(); }}
              className="border-gray-600 text-gray-300 hover:text-white"
            >Refresh</Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          columns={getTableColumns(handleView)}
          dataSource={reports}
          rowKey="report_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} reports`,
            pageSize: 10,
          }}
          className="custom-table"
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={<Space className="text-gray-200"><InfoCircleOutlined className="text-blue-500" />Report Details</Space>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={null}
        className="dark-modal"
      >
        {viewReport?.assessment && <ReportDetails report={viewReport} />}
      </Modal>

      <style jsx global>{`
        .custom-table .ant-table { background: transparent !important; }
        .custom-table .ant-table-thead > tr > th {
          background: rgba(30, 41, 59, 0.5) !important;
          color: #e5e7eb !important;
          border-bottom: 1px solid #374151 !important;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #374151 !important;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(30, 41, 59, 0.5) !important;
        }
        .dark-modal .ant-modal-content,
        .dark-modal .ant-modal-header {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        .dark-modal .ant-modal-title,
        .dark-modal .ant-modal-close {
          color: #e5e7eb !important;
        }
      `}</style>
    </div>
  );
};

// 报告详情组件
const ReportDetails = ({ report }) => {
  const { assessment } = report;
  
  return (
    <div className="space-y-6">
      <Row gutter={[24, 24]}>
        <Col span={12}>
          <Card className="bg-gray-800/30 border-gray-700">
            <Title level={4} className="text-gray-200 mb-4">Credit Score</Title>
            <div className="text-3xl font-bold text-blue-400">
              {assessment.credit_score}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card className="bg-gray-800/30 border-gray-700">
            <Title level={4} className="text-gray-200 mb-4">Risk Level</Title>
            <Tag color={getRiskLevelColor(assessment.risk_level)} className="text-lg px-4 py-1">
              {assessment.risk_level}
            </Tag>
          </Card>
        </Col>
      </Row>

      {assessment.assessment_details && assessment.assessment_details.length > 0 && (
        <Card className="bg-gray-800/30 border-gray-700">
          <Title level={4} className="text-gray-200 mb-4">Assessment Details</Title>
          {assessment.assessment_details.map((detail, index) => (
            <div key={index} className="flex items-start space-x-2 mb-2">
              <CheckCircleOutlined className="text-green-500 mt-1" />
              <Text className="text-gray-300">{detail}</Text>
            </div>
          ))}
        </Card>
      )}

      {assessment.suggestions && assessment.suggestions.length > 0 && (
        <Card className="bg-gray-800/30 border-gray-700">
          <Title level={4} className="text-gray-200 mb-4">Suggestions</Title>
          {assessment.suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-start space-x-2 mb-2">
              <InfoCircleOutlined className="text-blue-500 mt-1" />
              <Text className="text-gray-300">{suggestion}</Text>
            </div>
          ))}
        </Card>
      )}

      <div className="text-gray-400 space-y-1">
        <div>Report ID: {report.report_id}</div>
        <div>User DID: {report.user_did}</div>
        <div>Generated: {formatTimestamp(report.created_at)}</div>
      </div>
    </div>
  );
};

export default UserReportList;