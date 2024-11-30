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

  // 根据记录类型获取显示文本和颜色
  const getRecordTypeConfig = (type) => {
    const config = {
      'LoanRecord': { text: '贷款记录', color: 'blue' },
      'RepaymentRecord': { text: '还款记录', color: 'green' },
      'NotificationRecord': { text: '通知记录', color: 'orange' }
    };
    return config[type] || { text: type, color: 'default' };
  };

  // 格式化金额
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const handleSearch = async (values) => {
    setLoading(true);
    setSearchPerformed(true);
    try {
      const response = await queryRecordsByUserDid(values.userDid);
      console.log(response)
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
      const loginInstitutionId = localStorage.getItem('institutionId');
      if (!loginInstitutionId) {
        throw new Error('请重新登录');
      }
      
      const response = await queryRecordDetails(loginInstitutionId, currentUserDid);
      console.log('Details response:', response);
  
      // 检查响应数据
      if (response && response.records && response.records.length > 0) {
        const formattedDetails = {
          institution_name: record.institution_full_name,
          records: response.records.map(item => ({
            id: item.id,
            // 不需要额外添加 'Record' 后缀，因为 getRecordTypeConfig 已经处理了基础类型
            record_type: item.record_type === 'loan' ? 'LoanRecord' :
                        item.record_type === 'repayment' ? 'RepaymentRecord' :
                        item.record_type === 'notification' ? 'NotificationRecord' : 
                        item.record_type,
            timestamp: item.timestamp,
            status: item.status === 'pending' ? 'Pending' :
                   item.status === 'confirmed' ? 'Confirmed' :
                   item.status === 'failed' ? 'Failed' : 
                   item.status,
            content: item.content  // 直接使用 content
          }))
        };
        
        setCurrentDetails(formattedDetails);
        setDetailVisible(true);
        message.success('查询成功');
      } else {
        throw new Error('未获取到记录详情');
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
      const loginInstitutionId = localStorage.getItem('institutionId');
      if (!loginInstitutionId) {
        throw new Error('请重新登录');
      }
      console.log(loginInstitutionId)
      const response = await getRiskAssessment(loginInstitutionId);
      console.log(response)
      if (response.success) {
        setRiskAssessment(response.data);
        setRiskAssessmentVisible(true);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      message.error('风险评估失败: ' + (error.message || '未知错误'));
    } finally {
      setAssessmentLoading(false);
    }
  };

  // 列定义
  const columns = [
    {
      title: '机构名称',
      dataIndex: 'institution_full_name',
      key: 'institution_full_name',
      width: '30%',
    },
    {
      title: '上传时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '25%',
      render: (timestamp) => dayjs(Number(timestamp) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '机构ID',
      dataIndex: 'institution_id',
      key: 'institution_id',
      width: '35%',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: '10%',
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
      render: (type) => {
        const config = getRecordTypeConfig(type);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => dayjs(Number(timestamp) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusConfig = {
          'Pending': { color: 'processing', text: '处理中' },
          'Confirmed': { color: 'success', text: '已确认' },
          'Failed': { color: 'error', text: '失败' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (content, record) => {
        if (!content) return '-';
  
        // 直接使用 content 中的字段
        return (
          <Space direction="vertical">
            {content.amount && <div>金额: {formatAmount(content.amount)}</div>}
            {content.term_months && <div>期限: {content.term_months} 个月</div>}
            {content.interest_rate && <div>年化利率: {content.interest_rate}%</div>}
            {content.loan_id && <div>贷款ID: {content.loan_id}</div>}
            {content.repayment_date && <div>还款日期: {content.repayment_date}</div>}
            {content.days && <div>逾期天数: {content.days} 天</div>}
            {content.period_amount && <div>期间金额: {formatAmount(content.period_amount)}</div>}
          </Space>
        );
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
          title={
            <div className="flex justify-between items-center">
              <Space><FileTextOutlined /> 查询结果</Space>
              {records.length > 0 && (
                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  onClick={handleRiskAssessment}
                  loading={assessmentLoading}
                >
                  进行用户风险评估
                </Button>
              )}
            </div>
          }
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
              rowKey={(record) => `${record.institution_id}_${record.timestamp}`}
              size="middle"
              pagination={false}
            />
          )}
        </Card>
      </div>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            信用记录详情 - {currentDetails?.institution_name || ''}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {currentDetails ? (
          <Table
            columns={detailColumns}
            dataSource={currentDetails.records}
            rowKey={(record) => `${record.id}_${record.timestamp}`}
            pagination={false}
            size="middle"
          />
        ) : (
          <Empty description="暂无详细信息" />
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