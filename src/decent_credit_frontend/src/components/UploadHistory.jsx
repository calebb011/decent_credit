import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Space, DatePicker, Select, 
  message, Tooltip, Form, Modal, Descriptions 
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, EyeOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import uploadHistoryService from '../services/uploadHistoryService';

const { RangePicker } = DatePicker;
const { Option } = Select;

const UploadHistory = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    status: undefined,
    dateRange: undefined
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  
  // 从localStorage获取机构ID
  const institutionId = localStorage.getItem('institutionId');
  
  // 获取历史记录
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {
        status: filters.status,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD')
      };
      
      const response = await uploadHistoryService.getUploadHistory(institutionId, params);
      setRecords(response.data);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (institutionId) {
      fetchHistory();
    }
  }, [institutionId]);

  // 处理筛选变化
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      status: undefined,
      dateRange: undefined
    });
    fetchHistory();
  };

  // 查看记录详情
  const handleViewDetail = (record) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  // 状态标签渲染
  const renderStatus = (status, review_result) => {
    switch (status) {
      case 'Success':
        return <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>;
      case 'Failed':
        return (
          <Tooltip title={review_result?.reason}>
            <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>
          </Tooltip>
        );
      default:
        return <Tag>未知状态</Tag>;
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '数据ID',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      className: 'px-6'
    },
    {
      title: '用户DID',
      dataIndex: 'user_did',
      key: 'user_did',
      width: 320,
      ellipsis: true,
      className: 'px-6'
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      align: 'center',
      className: 'px-6',
      render: (_, record) => renderStatus(record.status, record.review_result)
    },
    {
      title: '失败原因',
      dataIndex: ['review_result', 'reason'],
      key: 'reason',
      width: 240,
      className: 'px-6',
      render: (reason) => reason || '-'
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 180,
      className: 'px-6',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      className: 'px-6',
      render: (_, record) => (
        <Button 
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">数据上传记录</h2>
        <p className="text-gray-600">查看和管理数据上传情况</p>
      </div>

      <Card className="mb-6">
        <Form layout="inline" className="w-full">
          <Form.Item label="状态" className="mb-4">
            <Select
              style={{ width: 120 }}
              placeholder="选择状态"
              allowClear
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="Success">成功</Option>
              <Option value="Failed">失败</Option>
            </Select>
          </Form.Item>

          <Form.Item label="提交时间" className="mb-4">
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
            />
          </Form.Item>

          <Form.Item className="mb-4">
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={fetchHistory}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          className="custom-table"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="记录详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentRecord && (
          <Descriptions bordered column={2} size="small" className="bg-gray-50 p-4 rounded">
            <Descriptions.Item label="数据ID" span={2}>
              {currentRecord.id}
            </Descriptions.Item>
            <Descriptions.Item label="用户DID" span={2}>
              {currentRecord.user_did}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {renderStatus(currentRecord.status, currentRecord.review_result)}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {dayjs(currentRecord.submitted_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="失败原因" span={2}>
              {currentRecord.review_result?.reason || '-'}
            </Descriptions.Item>
            {currentRecord.content && (
              <Descriptions.Item label="数据内容" span={2}>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(currentRecord.content, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 自定义样式 */}
      <style jsx>{`
        .custom-table .ant-table-cell {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        
        .custom-table .ant-table-thead > tr > th {
          font-weight: 600;
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default UploadHistory;