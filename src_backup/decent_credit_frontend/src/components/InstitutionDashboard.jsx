import React from 'react';
import { Card, Row, Col, Statistic, Table, Progress } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DatabaseOutlined, LineChartOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons';

const InstitutionDashboard = () => {
  // 模拟数据
  const stats = {
    totalSubmissions: 156,
    monthlySubmissions: 23,
    totalRewards: 289.5,
    creditScore: 85,
  };

  const submissionHistory = [
    { month: '1月', submissions: 18 },
    { month: '2月', submissions: 23 },
    { month: '3月', submissions: 29 },
    { month: '4月', submissions: 34 },
    { month: '5月', submissions: 45 },
    { month: '6月', submissions: 23 },
  ];

  const recentRecords = [
    {
      key: '1',
      date: '2024-03-20',
      type: '贷款记录',
      status: '已确认',
      reward: 1.0,
    },
    // ... 更多记录
  ];

  const columns = [
    {
      title: '提交时间',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '记录类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className={status === '已确认' ? 'text-green-600' : 'text-yellow-600'}>
          {status}
        </span>
      ),
    },
    {
      title: '获得奖励',
      dataIndex: 'reward',
      key: 'reward',
      render: (reward) => `${reward} DCC`,
    },
  ];

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="累计提交"
              value={stats.totalSubmissions}
              prefix={<DatabaseOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="本月提交"
              value={stats.monthlySubmissions}
              prefix={<LineChartOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="累计奖励"
              value={stats.totalRewards}
              prefix={<DollarOutlined />}
              suffix="DCC"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="信用分"
              value={stats.creditScore}
              prefix={<StarOutlined />}
              suffix="/100"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Card title="提交记录趋势" bordered={false} className="shadow-sm">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={submissionHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="submissions" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近记录 */}
      <Card title="最近提交记录" bordered={false} className="shadow-sm">
        <Table 
          columns={columns} 
          dataSource={recentRecords} 
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default InstitutionDashboard;