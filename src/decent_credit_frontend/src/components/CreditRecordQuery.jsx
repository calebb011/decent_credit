import React, { useState } from 'react';
import { 
  Card, Form, Input, Button, Table, Tag, Empty, Space, message, Modal, 
  Typography, List, Divider, Statistic 
} from 'antd';
import { 
  SearchOutlined, FileTextOutlined, SafetyCertificateOutlined,
  AlertOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { queryRecordsByUserDid, queryRecordDetails, getRiskAssessment } from '../services/queryRecordService';

const { Title, Paragraph } = Typography;

const CreditRecordQuery = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [riskAssessmentVisible, setRiskAssessmentVisible] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [currentUserDid, setCurrentUserDid] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  const handleSearch = async (values) => {
    setLoading(true);
    setSearchPerformed(true);
    
    try {
      const response = await queryRecordsByUserDid(values.userDid);
      if (response.success) {
        setRecords(response.data);
        setCurrentUserDid(values.userDid);
        if (response.data.length === 0) {
          message.info('未找到相关记录');
        }
      } else {
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      console.error('查询失败:', error);
      message.error(error.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (record) => {
    setDetailLoading(true);
    try {
      // 使用登录时缓存的 institution_id
    const loginInstitutionId = localStorage.getItem('institutionId');
    
    if (!loginInstitutionId) {
      throw new Error('请重新登录');
    }
      const details = await queryRecordDetails(loginInstitutionId, currentUserDid);
      if (details) {
        setCurrentDetails(details);
        setDetailVisible(true);
        message.success('查询成功');
      } else {
        throw new Error('未找到相关记录');
      }
    } catch (error) {
      console.error('查询详情失败:', error);
      message.error('查询详情失败: ' + (error.message || '未知错误'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRiskAssessment = async () => {
    setAssessmentLoading(true);
    try {
      const assessment = await getRiskAssessment(currentUserDid);
      setRiskAssessment(assessment);
      setRiskAssessmentVisible(true);
    } catch (error) {
      message.error('风险评估失败: ' + error.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  // 列定义
  const columns = [
    {
      title: '机构名称',
      dataIndex: 'institution_name',
      key: 'institution_name',
      width: 200,
    },
    {
      title: '机构ID',
      dataIndex: 'institution_id',
      key: 'institution_id',
      width: 300,
      ellipsis: true,
    },
    {
      title: '用户DID',
      dataIndex: 'user_did',
      key: 'user_did',
      width: 300,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          loading={detailLoading}
        >
          查看详情
        </Button>
      ),
    }
  ];

  // 详情记录列定义
  const detailColumns = [
    {
      title: '记录类型',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 120,
      render: (type) => (
        <Tag color="blue">{getRecordTypeTitle(type)}</Tag>
      ),
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
        let formattedContent = '';
        switch (record.record_type) {
          case 'loan':
            formattedContent = `贷款金额: ${content.amount}元, 期限: ${content.term_months}月, 年化利率: ${content.interest_rate}%`;
            break;
          case 'repayment':
            formattedContent = `还款金额: ${content.amount}元, 原贷款ID: ${content.loan_id}, 还款日期: ${content.repayment_date}`;
            break;
          case 'notification':
            formattedContent = `涉及金额: ${content.amount}元, 天数: ${content.days}天, 期间金额: ${content.period_amount}元`;
            break;
          default:
            formattedContent = JSON.stringify(content);
        }
        return formattedContent;
      },
    }
  ];

  const getRecordTypeTitle = (type) => {
    const types = {
      'loan': '贷款记录',
      'repayment': '还款记录',
      'notification': '通知记录'
    };
    return types[type] || type;
  };

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

        {records.length > 0 && (
          <Card className="shadow-sm">
            <div className="flex justify-center mb-2">
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                onClick={handleRiskAssessment}
                size="large"
                loading={assessmentLoading}
              >
                进行用户风险评估
              </Button>
            </div>
          </Card>
        )}

        <Card 
          title={<Space><FileTextOutlined /> 查询结果</Space>}
          className="shadow-sm"
        >
          {!searchPerformed ? (
            <Empty description="请输入查询条件" />
          ) : records.length === 0 ? (
            <Empty description="未找到相关记录" />
          ) : (
            <Table
              columns={columns}
              dataSource={records}
              rowKey="institution_id"
              size="middle"
              pagination={false}
            />
          )}
        </Card>
      </div>

      {/* 详情模态框 */}
      <Modal
        title={`信用记录详情 - ${currentDetails?.institution_name || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
      >
        {currentDetails && (
          <Table
            columns={detailColumns}
            dataSource={currentDetails.records}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        )}
      </Modal>

      {/* 风险评估模态框 */}
      <Modal
        title={
          <Space>
            <AlertOutlined />
            用户风险评估报告
          </Space>
        }
        open={riskAssessmentVisible}
        onCancel={() => setRiskAssessmentVisible(false)}
        width={800}
        footer={null}
      >
        {riskAssessment && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Statistic
                title="信用评分"
                value={riskAssessment.creditScore}
                suffix="/100"
                valueStyle={
                  riskAssessment.creditScore >= 80 
                    ? { color: '#3f8600' }
                    : riskAssessment.creditScore >= 60
                      ? { color: '#faad14' }
                      : { color: '#cf1322' }
                }
              />
              <Statistic
                title="风险等级"
                value={riskAssessment.riskLevel}
                valueStyle={
                  riskAssessment.riskLevel === '低风险' 
                    ? { color: '#3f8600' }
                    : riskAssessment.riskLevel === '中风险'
                      ? { color: '#faad14' }
                      : { color: '#cf1322' }
                }
              />
            </div>

            <Divider orientation="left">评估详情</Divider>
            <List
              dataSource={riskAssessment.assessmentDetails}
              renderItem={item => (
                <List.Item>
                  <Typography.Text>{item}</Typography.Text>
                </List.Item>
              )}
            />

            <Divider orientation="left">改进建议</Divider>
            <List
              dataSource={riskAssessment.suggestions}
              renderItem={item => (
                <List.Item>
                  <Typography.Text>{item}</Typography.Text>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CreditRecordQuery;