import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Space, Select, 
  message, Tooltip, Form, Descriptions
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, 
  CloseCircleOutlined, EyeOutlined,
  FileTextOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryFailedRecordsList } from '../services/uploadHistoryService';

const { Option } = Select;

const FailedRecordsView = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    status: undefined
  });
  const [currentRecord, setCurrentRecord] = useState(null);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  useEffect(() => {
    fetchRecords();
  }, []); 
  
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const institutionId = localStorage.getItem('userPrincipal');
      const response = await queryFailedRecordsList(institutionId);
      if (response.success) {
        const filteredRecords = filterRecordsByStatus(response.data.records);
        setRecords(filteredRecords);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error(error.message || 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecordsByStatus = (records) => {
    if (!filters.status) {
      return records;
    }
    return records.filter(record => record.status === filters.status);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFilters({
      status: undefined
    });
    fetchRecords();
  };

  const handleViewDetail = async (record) => {
    setDetailLoading(true);
    try {
      setCurrentRecord(record);
      
      const formattedDetails = {
        institution_name: record.institutionName,
        institution_id: record.institutionId,
        records: [{
          id: record.id,
          record_type: record.recordType,
          timestamp: record.timestamp,
          status: record.status,
          content: record.content,
          event_date: record.eventDate,
          user_did: record.userDid
        }]
      };
      
      setCurrentDetails(formattedDetails);
      
    } catch (error) {
      message.error('Failed to get record details: ' + (error.message || 'Unknown error'));
    } finally {
      setDetailLoading(false);
    }
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'pending':
        return <Tag color="processing">Pending</Tag>;
      case 'rejected':
        return (
          <Tooltip title="Failed Record">
            <Tag 
              icon={<CloseCircleOutlined />} 
              className="bg-red-500/20 text-red-400 border-red-500/30"
            >
              Failed
            </Tag>
          </Tooltip>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const renderContent = (content) => {
    if (!content || !content.type) return '-';
    
    switch (content.type) {
      case 'Loan':
        return `Loan - ${content.amount} (Term: ${content.termMonths} months, Rate: ${content.interestRate}%)`;
      case 'Repayment':
        return `Repayment - ${content.amount} (Date: ${content.repaymentDate})`;
      case 'Overdue':
        return `Overdue - ${content.amount} (Days: ${content.overdueDays})`;
      default:
        return '-';
    }
  };

  const columns = [
    {
      title: 'Record ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      className: 'text-gray-300'
    },
    {
      title: 'User DID',
      dataIndex: 'userDid',
      key: 'userDid',
      width: 200,
      ellipsis: true,
      className: 'text-gray-300'
    },
    {
      title: 'Record Type',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 100,
      className: 'text-gray-300'
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      width: 250,
      render: (content) => renderContent(content)
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => renderStatus(record.status)
    },
    {
      title: 'Failure Reason',
      dataIndex: 'failureReason',
      key: 'failureReason',
      width: 200,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-gray-300">{text || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Update Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (text) => {
        if (typeof text === 'string' && text.includes('T')) {
          return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
        
        const timestampStr = text.toString().replace('n', '');
        const milliseconds = Math.floor(Number(timestampStr) / 1000000);
        return dayjs.unix(Math.floor(milliseconds / 1000)).format('YYYY-MM-DD HH:mm:ss');
      }
    }
  ];

  const detailColumns = [
    {
      title: 'Record Type',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 120,
      render: (type) => {
        const config = {
          'LoanRecord': { text: 'Loan Record', color: 'blue' },
          'RepaymentRecord': { text: 'Repayment Record', color: 'green' },
          'OverdueRecord': { text: 'Notification Record', color: 'orange' }
        };
        const typeConfig = config[type] || { text: type, color: 'default' };
        return <Tag color={typeConfig.color}>{typeConfig.text}</Tag>;
      },
    },
    {
      title: 'Submit Time',
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
          'pending': { color: 'processing', text: 'Pending' },
          'rejected': { color: 'error', text: 'Failed' }
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
            {content.days && <div>Days: {content.days} days</div>}
          </Space>
        );
      },
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Records Query</h2>
        <p className="text-gray-400">View detailed data upload records</p>
      </div>

      <Card className="bg-black/20 border-gray-700">
        <Form layout="inline" className="w-full">
          <Space wrap className="w-full justify-between">
            <Space wrap>
              <Form.Item className="w-96" label={<span className="text-gray-300">Status</span>}>
                <Select
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  className="w-full"
                  allowClear
                  placeholder="All"
                >
                  <Option value="confirmed">Success</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="rejected">Failed</Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  onClick={fetchRecords}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
                >
                  Search
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                >
                  Reset
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card className="bg-black/20 border-gray-700">
        <Table 
          dataSource={records}
          columns={columns}
          loading={loading}
          rowKey="id"
          className="custom-table"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 100,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} records`
          }}
        />
      </Card>

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
        
        .custom-table .ant-pagination {
          margin-top: 16px !important;
        }
        
        .custom-table .ant-pagination-item {
          background: transparent !important;
          border-color: #374151 !important;
        }
        
        .custom-table .ant-pagination-item a {
          color: #e5e7eb !important;
        }
        
        .custom-table .ant-pagination-item-active {
          border-color: #3b82f6 !important;
        }
        
        .custom-table .ant-pagination-item-active a {
          color: #3b82f6 !important;
        }
      `}</style>
    </div>
  );
};

export default FailedRecordsView;