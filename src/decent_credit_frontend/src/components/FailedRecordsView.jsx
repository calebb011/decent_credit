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
      
      // Format the details data structure similar to CreditQuery
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
        return <Tag color="processing">处理中</Tag>;
      case 'rejected':
        return (
          <Tooltip title="Failed Record">
            <Tag 
              icon={<CloseCircleOutlined />} 
              className="bg-red-500/20 text-red-400 border-red-500/30"
            >
              失败
            </Tag>
          </Tooltip>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // 格式化金额
  const formatAmount = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const renderContent = (content) => {
    if (!content || !content.type) return '-';
    
    switch (content.type) {
      case 'Loan':
        return `Loan - ${content.amount} (Term: ${content.termMonths} months, Rate: ${content.interestRate}%)`;
      case 'Repayment':
        return `Repayment - ${content.amount} (Date: ${content.repaymentDate})`;
      case 'Notification':
        return `Notification - ${content.amount} (Days: ${content.days})`;
      default:
        return '-';
    }
  };

  const columns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      className: 'text-gray-300'
    },
    {
      title: '用户DID',
      dataIndex: 'userDid',
      key: 'userDid',
      width: 200,
      ellipsis: true,
      className: 'text-gray-300'
    },
    {
      title: '记录类型',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 100,
      className: 'text-gray-300'
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      width: 250,
      render: (content) => renderContent(content)
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => renderStatus(record.status)
    },
    {
      title: '失败原因',
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
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      className: 'text-gray-300',
      render: (text) => dayjs(Number(text)).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  // 详情表格的列定义
  const detailColumns = [
    {
      title: '记录类型',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 120,
      render: (type) => {
        const config = {
          'LoanRecord': { text: '贷款记录', color: 'blue' },
          'RepaymentRecord': { text: '还款记录', color: 'green' },
          'NotificationRecord': { text: '通知记录', color: 'orange' }
        };
        const typeConfig = config[type] || { text: type, color: 'default' };
        return <Tag color={typeConfig.color}>{typeConfig.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => dayjs(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusConfig = {
          'pending': { color: 'processing', text: '处理中' },
          'rejected': { color: 'error', text: '失败' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (content) => {
        if (!content) return '-';
        
        return (
          <Space direction="vertical">
            {content.amount && <div>金额: {formatAmount(content.amount)}</div>}
            {content.term_months && <div>期限: {content.term_months} 个月</div>}
            {content.interest_rate && <div>年化利率: {content.interest_rate}%</div>}
            {content.loan_id && <div>贷款ID: {content.loan_id}</div>}
            {content.repayment_date && <div>还款日期: {content.repayment_date}</div>}
            {content.days && <div>天数: {content.days} 天</div>}
          </Space>
        );
      },
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">失败记录查询</h2>
        <p className="text-gray-400">查看详细的失败数据上传记录</p>
      </div>

      <Card className="bg-black/20 border-gray-700">
        <Form layout="inline" className="w-full">
          <Space wrap className="w-full justify-between">
            <Space wrap>
              <Form.Item label={<span className="text-gray-300">状态</span>}>
                <Select
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  className="w-32"
                  allowClear
                >
                  <Option value="pending">处理中</Option>
                  <Option value="rejected">失败</Option>
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
                  查询
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                >
                  重置
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
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
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