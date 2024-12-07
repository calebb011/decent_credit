import React from 'react';
import { 
  Typography, List, Divider, Statistic, Card, Space, Progress, Row, Col, 
  Tag, Badge
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const RiskAssessmentReport = ({ data, showCard = true }) => {
  // Risk level configuration
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
        description: 'Some risk factors present, further assessment recommended'
      },
      'high': {
        color: '#cf1322',
        text: 'High Risk',
        badge: 'error',
        description: 'Significant risk factors identified, requires special attention'
      }
    };
    return configs[level] || configs.medium;
  };

  const getRiskIcon = (score) => {
    if (score >= 80) return <CheckCircleOutlined className="text-green-500" />;
    if (score >= 60) return <ExclamationCircleOutlined className="text-yellow-500" />;
    return <CloseCircleOutlined className="text-red-500" />;
  };

  const ReportContent = () => (
    <div className="p-6 space-y-8">
      {/* Report Header */}
      <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
        <Title level={3} className="!text-gray-800 dark:!text-gray-200 mb-2">
          <SafetyCertificateOutlined className="mr-2 text-blue-500" />
          Credit Risk Assessment Report
        </Title>
        <Text className="text-gray-500 dark:text-gray-400">Generated on: {new Date().toLocaleString()}</Text>
      </div>

      {/* Top Statistics */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg p-6">
        <Row gutter={24} align="middle" justify="space-between">
          <Col span={12}>
            <div className="relative inline-block">
              <Progress
                type="circle"
                percent={data.creditScore}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                strokeWidth={10}
                className="mb-4"
              />
              <Badge
                count={getRiskLevelConfig(data.riskLevel).text}
                style={{ backgroundColor: getRiskLevelConfig(data.riskLevel).color }}
                className="absolute -top-2 -right-2"
              />
            </div>
          </Col>
          <Col span={12}>
            <Space direction="vertical" className="w-full">
              <Statistic
                title={<span className="text-gray-500 dark:text-gray-400">Overall Score</span>}
                value={data.creditScore}
                suffix="/100"
                valueStyle={{ 
                  color: data.creditScore >= 80 ? '#3f8600' : 
                         data.creditScore >= 60 ? '#faad14' : '#cf1322' 
                }}
              />
              <Text className="text-gray-600 dark:text-gray-300">
                {getRiskLevelConfig(data.riskLevel).description}
              </Text>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card className="bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700">
            <Statistic
              title={<span className="text-gray-500 dark:text-gray-400">Total Loan Amount</span>}
              value={data.totalLoanAmount}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700">
            <Statistic
              title={<span className="text-gray-500 dark:text-gray-400">Repayment Rate</span>}
              value={data.repaymentRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700">
            <Statistic
              title={<span className="text-gray-500 dark:text-gray-400">Average Repayment Time</span>}
              value={data.avgRepaymentDays}
              suffix=" days"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Assessment Details */}
      <div className="bg-white dark:bg-gray-800/30 rounded-lg p-6">
        <Title level={4} className="!text-gray-800 dark:!text-gray-200 mb-4">
          <InfoCircleOutlined className="mr-2 text-blue-500" />
          Assessment Details
        </Title>
        <List
          dataSource={data.assessmentDetails}
          renderItem={item => (
            <List.Item className="px-6 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300">
                {getRiskIcon(data.creditScore)} 
                <span className="ml-2">{item}</span>
              </Text>
            </List.Item>
          )}
        />
      </div>

      {/* Risk Factor Analysis */}
      <div className="bg-white dark:bg-gray-800/30 rounded-lg p-6">
        <Title level={4} className="!text-gray-800 dark:!text-gray-200 mb-4">
          <AlertOutlined className="mr-2 text-orange-500" />
          Risk Factor Analysis
        </Title>
        <Space direction="vertical" className="w-full">
          {data.riskFactors?.map((factor, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
              <Space>
                <ThunderboltOutlined className="text-yellow-500" />
                <Text className="text-gray-700 dark:text-gray-300">{factor.description}</Text>
              </Space>
              <Tag color={factor.severity === 'high' ? 'red' : factor.severity === 'medium' ? 'orange' : 'green'}>
                {factor.severity === 'high' ? 'High' : factor.severity === 'medium' ? 'Medium' : 'Low'} Risk
              </Tag>
            </div>
          ))}
        </Space>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800/30 rounded-lg p-6">
        <Title level={4} className="!text-gray-800 dark:!text-gray-200 mb-4">
          <SafetyCertificateOutlined className="mr-2 text-green-500" />
          Recommendations
        </Title>
        <List
          dataSource={data.suggestions}
          renderItem={(item, index) => (
            <List.Item className="px-6 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300">
                <span className="inline-block w-6 h-6 leading-6 text-center bg-blue-500 text-white rounded-full mr-3">
                  {index + 1}
                </span>
                {item}
              </Text>
            </List.Item>
          )}
        />
      </div>
    </div>
  );

  if (showCard) {
    return (
      <Card 
        title={
          <Space>
            <SafetyCertificateOutlined className="text-blue-500" />
            <span className="font-medium text-gray-800 dark:text-gray-200">Risk Assessment Report</span>
          </Space>
        }
        className="shadow-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      >
        <ReportContent />
      </Card>
    );
  }

  return <ReportContent />;
};

export default RiskAssessmentReport;