import React from 'react';
import { Typography, List, Divider, Statistic, Card, Space } from 'antd';
import { 
  SafetyCertificateOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const RiskAssessmentReport = ({ data, showCard = true }) => {
  const getRiskIcon = (score) => {
    if (score >= 80) return <CheckCircleOutlined style={{ color: '#3f8600' }} />;
    if (score >= 60) return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    return <CloseCircleOutlined style={{ color: '#cf1322' }} />;
  };

  const ReportContent = () => (
    <div className="p-6">
      {/* 顶部统计区域 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Statistic
              title={
                <Space className="mb-2">
                  <SafetyCertificateOutlined />
                  <span className="text-lg font-medium">信用评分</span>
                </Space>
              }
              value={data.creditScore}
              suffix="/100"
              valueStyle={{
                fontSize: '2.5rem',
                color: data.creditScore >= 80
                  ? '#3f8600'
                  : data.creditScore >= 60
                    ? '#faad14'
                    : '#cf1322'
              }}
            />
            <div className="mt-4">
              <Text type="secondary">
                {data.creditScore >= 80 
                  ? '信用状况良好，可享受优质服务'
                  : data.creditScore >= 60
                    ? '信用状况一般，建议持续改善'
                    : '信用状况需要重点关注和改善'}
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Statistic
              title={
                <Space className="mb-2">
                  <WarningOutlined />
                  <span className="text-lg font-medium">风险等级</span>
                </Space>
              }
              value={data.riskLevel}
              valueStyle={{
                fontSize: '2.5rem',
                color: data.riskLevel === '低风险'
                  ? '#3f8600'
                  : data.riskLevel === '中等风险'
                    ? '#faad14'
                    : '#cf1322'
              }}
            />
            <div className="mt-4">
              <Text type="secondary">
                {data.riskLevel === '低风险'
                  ? '风险程度低，建议维持良好记录'
                  : data.riskLevel === '中等风险'
                    ? '存在一定风险，需要关注'
                    : '风险程度高，需要积极改善'}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* 评估详情区域 */}
      <div className="mb-8">
        <Title level={4} className="flex items-center mb-4">
          <InfoCircleOutlined className="mr-2 text-blue-500" />
          评估详情
        </Title>
        <div className="bg-white rounded-lg shadow-sm">
          <List
            dataSource={data.assessmentDetails}
            renderItem={item => (
              <List.Item className="px-6">
                <Text>{getRiskIcon(data.creditScore)} <span className="ml-2">{item}</span></Text>
              </List.Item>
            )}
          />
        </div>
      </div>

      {/* 改进建议区域 */}
      <div>
        <Title level={4} className="flex items-center mb-4">
          <SafetyCertificateOutlined className="mr-2 text-green-500" />
          改进建议
        </Title>
        <div className="bg-white rounded-lg shadow-sm">
          <List
            dataSource={data.suggestions}
            renderItem={(item, index) => (
              <List.Item className="px-6">
                <Text>
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
    </div>
  );

  if (showCard) {
    return (
      <Card 
        title={
          <Space>
            <SafetyCertificateOutlined className="text-blue-500" />
            <span className="font-medium">风险评估报告</span>
          </Space>
        }
        className="shadow-lg"
      >
        <ReportContent />
      </Card>
    );
  }

  return <ReportContent />;
};

export default RiskAssessmentReport;