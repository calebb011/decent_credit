import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form } from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import RiskAssessmentReport from './RiskAssessmentReport';
import { queryAssessmentReports } from '../services/institutionQueryRecordService';

const UserReportList = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [viewReport, setViewReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const institutionId = localStorage.getItem('userPrincipal');
      if (!institutionId) {
        throw new Error('Please login again');
      }

      const response = await queryAssessmentReports(institutionId);
      console.log('API Response:', response); // Debug log

      if (response.success && response.data && Array.isArray(response.data)) {
        // 直接使用返回的数据数组
        setReports(response.data);
      } else if (response.success && response.data && response.data[0]) {
        // 如果是单个对象包装在数组中
        setReports([response.data[0]]);
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

  const columns = [
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
      title: 'Generated At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '15%',
      render: (time) => {
        // 将纳秒转换为毫秒 (除以 1,000,000)
        const milliseconds = Number(time) / 1_000_000;
        return dayjs(milliseconds).format('YYYY-MM-DD HH:mm:ss');
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
          onClick={() => {
            setViewReport(record.assessment);
            setModalVisible(true);
          }}
        >
          View
        </Button>
      ),
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Risk Assessment Reports</h2>
        <p className="text-gray-400">View and manage user risk assessment reports</p>
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
            >
              Query Reports
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setReports([]);
                fetchReports();
              }}
              className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={reports}
          rowKey="report_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} reports`,
            pageSize: 10,
            className: "px-4 py-3"
          }}
          className="custom-table"
        />
      </Card>


      <Modal
        title={
          <Space className="text-gray-200">
            <EyeOutlined />
            Risk Assessment Report Details
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={null}
        className="dark-modal"
      >
        {viewReport && <RiskAssessmentReport data={viewReport} showCard={false} />}
      </Modal>

      <style jsx global>{`
        .custom-table .ant-table {
          background: transparent !important;
        }
        
        .custom-table .ant-table-thead > tr > th {
          background: rgba(30, 41, 59, 0.5) !important;
          color: #e5e7eb !important;
          border-bottom: 1px solid #374151 !important;
        }
        
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #374151 !important;
          transition: background 0.3s;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(30, 41, 59, 0.5) !important;
        }
        
        .dark-modal .ant-modal-content {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        
        .dark-modal .ant-modal-header {
          background: #1f2937 !important;
          border-bottom: 1px solid #374151 !important;
        }
      `}</style>
    </div>
  );
};

export default UserReportList;