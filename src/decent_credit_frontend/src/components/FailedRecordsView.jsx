import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Space, DatePicker, Select, 
  message, Tooltip, Form, Modal, Descriptions 
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, 
  CloseCircleOutlined, EyeOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryFailedRecordsList } from '../services/uploadHistoryService';

const { RangePicker } = DatePicker;
const { Option } = Select;

const FailedRecordsView = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: undefined
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  
  const institutionId = localStorage.getItem('userPrincipal');
  
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await queryFailedRecordsList(institutionId);
      if (response.success) {
        const filteredRecords = filterRecordsByDate(response.data.records);
        setRecords(filteredRecords);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error(error.message || '获取失败记录失败');
    } finally {
      setLoading(false);
    }
  };

  const filterRecordsByDate = (records) => {
    if (!filters.dateRange || !filters.dateRange[0] || !filters.dateRange[1]) {
      return records;
    }

    const startDate = filters.dateRange[0].startOf('day');
    const endDate = filters.dateRange[1].endOf('day');

    return records.filter(record => {
      const recordDate = dayjs(record.timestamp);
      return recordDate.isBetween(startDate, endDate, null, '[]');
    });
  };

  useEffect(() => {
    if (institutionId) {
      fetchRecords();
    }
  }, [institutionId]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFilters({
      dateRange: undefined
    });
    fetchRecords();
  };

  const handleViewDetail = (record) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const renderStatus = (status) => {
    return (
      <Tooltip title="失败记录">
        <Tag 
          icon={<CloseCircleOutlined />} 
          className="bg-red-500/20 text-red-400 border-red-500/30"
        >
          失败
        </Tag>
      </Tooltip>
    );
  };

  const renderContent = (content) => {
    if (!content || !content.type) return '-';
    
    switch (content.type) {
      case 'Loan':
        return `贷款 - ${content.amount} (期限: ${content.termMonths}月, 利率: ${content.interestRate}%)`;
      case 'Repayment':
        return `还款 - ${content.amount} (日期: ${content.repaymentDate})`;
      case 'Notification':
        return `通知 - ${content.amount} (天数: ${content.days})`;
      default:
        return '-';
    }
  };

  const columns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      className: 'text-gray-300'
    },
    {
      title: '用户DID',
      dataIndex: 'userDid',
      key: 'userDid',
      width: 320,
      ellipsis: true,
      className: 'text-gray-300'
    },
    {
      title: '记录类型',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 120,
      className: 'text-gray-300'
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => renderStatus(record.status)
    },
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      className: 'text-gray-300',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="link"
          icon={<EyeOutlined />}
          className="text-blue-400 hover:text-blue-300"
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">失败记录查询</h2>
        <p className="text-gray-400">查看数据上传失败的详细记录</p>
      </div>

      <Card className="bg-black/20 border-gray-700">
        <Form layout="inline" className="w-full">
          <Space wrap className="w-full justify-between">
            <Space wrap>
              <Form.Item label={<span className="text-gray-300">时间范围</span>}>
                <RangePicker
                  value={filters.dateRange}
                  onChange={(dates) => handleFilterChange('dateRange', dates)}
                  className="bg-gray-800"
                />
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

      <Card className="bg-black/20 border-gray-700" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
            className: "px-4 py-3"
          }}
          className="custom-table"
        />
      </Card>

      <Modal
        title={<span className="text-gray-200">记录详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
        className="dark-modal"
      >
        {currentRecord && (
          <Descriptions 
            bordered 
            column={2} 
            size="small" 
            className="bg-gray-800/50 rounded"
          >
            <Descriptions.Item 
              label={<span className="text-gray-300">记录ID</span>} 
              span={2}
              className="text-gray-200"
            >
              {currentRecord.id}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">用户DID</span>} 
              span={2}
              className="text-gray-200"
            >
              {currentRecord.userDid}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">机构ID</span>}
              span={2}
              className="text-gray-200"
            >
              {currentRecord.institutionId}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">机构名称</span>}
              className="text-gray-200"
            >
              {currentRecord.institutionName}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">状态</span>}
              className="text-gray-200"
            >
              {renderStatus(currentRecord.status)}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">记录类型</span>}
              span={2}
              className="text-gray-200"
            >
              {currentRecord.recordType}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">事件日期</span>}
              className="text-gray-200"
            >
              {currentRecord.eventDate}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">时间戳</span>}
              className="text-gray-200"
            >
              {dayjs(currentRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="text-gray-300">内容详情</span>} 
              span={2}
              className="text-gray-200"
            >
              <pre className="whitespace-pre-wrap bg-gray-900/50 p-2 rounded">
                {JSON.stringify(currentRecord.content, null, 2)}
              </pre>
            </Descriptions.Item>
            {currentRecord.rewardAmount && (
              <Descriptions.Item 
                label={<span className="text-gray-300">奖励金额</span>} 
                span={2}
                className="text-gray-200"
              >
                {currentRecord.rewardAmount}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
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
        
        .dark-modal .ant-descriptions-bordered .ant-descriptions-item-label {
          background: rgba(30, 41, 59, 0.5) !important;
        }
        
        .dark-modal .ant-descriptions-bordered .ant-descriptions-item-content {
          border: 1px solid #374151 !important;
        }
      `}</style>
    </div>
  );
};

export default FailedRecordsView;