import React, { useState } from 'react';
import { Card, Form, Input, Button, Table, Tag, Empty, DatePicker, Space, message } from 'antd';
import { SearchOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const CreditRecordQuery = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  const handleSearch = async (values) => {
    setLoading(true);
    try {
      // TODO: 调用后端API查询记录
      const response = await queryRecordsByUserDid(values.userDid);
      setRecords(response.data);
      setSearchPerformed(true);
    } catch (error) {
      message.error('查询失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 根据记录类型返回标题
  const getRecordTypeTitle = (type) => {
    const types = {
      'loan': '贷款记录',
      'repayment': '还款记录',
      'overdue': '逾期记录'
    };
    return types[type] || type;
  };

  // 根据状态返回对应的Tag
  const getStatusTag = (status) => {
    const statusConfig = {
      'Pending': { color: 'gold', text: '待确认', icon: <ClockCircleOutlined /> },
      'Confirmed': { color: 'success', text: '已确认', icon: <CheckCircleOutlined /> }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 120,
      render: (type) => (
        <Tag color="blue">{getRecordTypeTitle(type)}</Tag>
      ),
    },
    {
      title: '提交机构',
      dataIndex: 'institution_id',
      key: 'institution_id',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => dayjs(Number(timestamp) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (content, record) => {
        let formattedContent = '...';
        switch (record.record_type) {
          case 'loan':
            formattedContent = `贷款金额: ${content.amount}元, 期限: ${content.term}月, 年化利率: ${content.interestRate}%`;
            break;
          case 'repayment':
            formattedContent = `还款金额: ${content.amount}元, 原贷款ID: ${content.originalLoanId}`;
            break;
          case 'overdue':
            formattedContent = `逾期金额: ${content.amount}元, 逾期天数: ${content.overdueDays}天`;
            break;
        }
        return formattedContent;
      },
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">信用记录查询</h2>
        <p className="text-gray-600">查询用户的历史信用记录信息</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title="查询条件" className="shadow-sm">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSearch}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                name="userDid"
                label="用户DID"
                rules={[{ required: true, message: '请输入用户DID' }]}
              >
                <Input 
                  prefix={<SearchOutlined className="text-gray-400" />} 
                  placeholder="请输入用户DID"
                />
              </Form.Item>

              <Form.Item className="md:self-end">
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  查询记录
                </Button>
              </Form.Item>
            </div>
          </Form>
        </Card>

        <Card 
          title={<Space><FileTextOutlined /> 查询结果</Space>}
          className="shadow-sm"
          extra={
            records.length > 0 && (
              <Button type="link" onClick={() => console.log('导出记录')}>
                导出记录
              </Button>
            )
          }
        >
          {!searchPerformed ? (
            <Empty description="请输入查询条件" />
          ) : records.length === 0 ? (
            <Empty description="未找到相关记录" />
          ) : (
            <Table
              columns={columns}
              dataSource={records}
              rowKey="id"
              size="middle"
              scroll={{ x: 1200 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreditRecordQuery;

// 模拟API调用函数
async function queryRecordsByUserDid(userDid) {
  // 模拟数据
  return {
    success: true,
    data: [
      {
        id: 'REC20240322001',
        institution_id: 'INST001',
        record_type: 'loan',
        content: {
          amount: 100000,
          term: 12,
          interestRate: 4.35
        },
        status: 'Confirmed',
        timestamp: BigInt(Date.now() * 1000000),
        user_did: userDid
      },
      {
        id: 'REC20240322002',
        institution_id: 'INST001',
        record_type: 'repayment',
        content: {
          amount: 8500,
          originalLoanId: 'REC20240322001'
        },
        status: 'Pending',
        timestamp: BigInt(Date.now() * 1000000),
        user_did: userDid
      },
      {
        id: 'REC20240322003',
        institution_id: 'INST002',
        record_type: 'overdue',
        content: {
          amount: 5000,
          overdueDays: 30
        },
        status: 'Confirmed',
        timestamp: BigInt(Date.now() * 1000000),
        user_did: userDid
      }
    ]
  };
}