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
import { queryRecordsByUserDid } from '../services/institutionQueryRecordService';
import { queryRecordById, getRiskAssessment } from '../services/institutionQueryRecordService';

import RiskAssessmentReport from './RiskAssessmentReport';

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
  const [userDid, setUserDid] = useState('');

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
       // 保存 userDid 到状态中
       setUserDid(values.userDid);
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
      // 获取登录机构 ID
      const loginInstitutionId = localStorage.getItem('userPrincipal');
      if (!loginInstitutionId) {
        throw new Error('Please login again');
      }
  
      if (!record?.id) {
        throw new Error('Record ID is required');
      }
  
      // 查询记录详情
      const response = await queryRecordById(record.id,loginInstitutionId );
      console.log('Details response:', response);
  
      // 检查响应数据
      if (response.success && response.data) {
        // 格式化详情数据
        const formattedDetails = {
          institution_name: response.data.institution_full_name,
          institution_id: loginInstitutionId, // 添加机构ID
          records: [{
            id: response.data.id,
            record_type: response.data.record_type === 'loan' ? 'LoanRecord' :
                        response.data.record_type === 'repayment' ? 'RepaymentRecord' :
                        response.data.record_type === 'notification' ? 'NotificationRecord' :
                        response.data.record_type,
            timestamp: response.data.timestamp,
            status: response.data.status === 'pending' ? 'Pending' :
                   response.data.status === 'confirmed' ? 'Confirmed' :
                   response.data.status === 'failed' ? 'Failed' :
                   response.data.status,
            content: response.data.content,
            event_date: response.data.event_date,
            user_did: response.data.user_did,
            canister_id: response.data.canister_id,
            reward_amount: response.data.reward_amount
          }]
        };
  
        setCurrentDetails(formattedDetails);
        setDetailVisible(true);
        message.success('Query successful');
      } else {
        throw new Error(response.message || 'No record details found');
      }
    } catch (error) {
      console.error('Failed to query details:', error);
      message.error('Failed to query details: ' + (error.message || 'Unknown error'));
    } finally {
      setDetailLoading(false);
    }
  };
 
  const handleRiskAssessment = async () => {
    setAssessmentLoading(true);
    try {
      const loginInstitutionId = localStorage.getItem('userPrincipal');
      if (!loginInstitutionId) {
        throw new Error('请重新登录');
      }
      console.log(loginInstitutionId)
      const response = await getRiskAssessment(loginInstitutionId,userDid);
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '30%',
    },
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
    <div className="space-y-4"> {/* 改外层容器 */}
  <div>
    <h2 className="text-xl font-semibold text-gray-200 mb-2">信用记录查询</h2>
    <p className="text-gray-400">查询和管理用户的历史信用记录信息</p>
  </div>

      <div className="grid grid-cols-1 gap-6">
      <Card className="bg-black/20 border-gray-700">
  <Form
    form={form}
    layout="inline"
    className="w-full"
    onFinish={handleSearch}
  >
    <Space wrap className="w-full justify-between">
      <Space wrap>
        <Form.Item
          name="userDid"
          label={<span className="text-gray-300">用户DID</span>}
          rules={[{ required: true, message: '请输入用户DID' }]}
        >
          <Input 
            prefix={<SearchOutlined className="text-gray-400" />} 
            placeholder="请输入用户DID"
            className="bg-gray-800 border-gray-700 text-gray-200"
          />
        </Form.Item>
      </Space>

      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            icon={<SearchOutlined />}
            htmlType="submit"
            loading={loading}
            className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
          >
            查询记录
          </Button>
          <Button 
            onClick={() => form.resetFields()}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            重置
          </Button>
        </Space>
      </Form.Item>
        </Space>
      </Form>
    </Card>

    <Card 
  className="bg-black/20 border-gray-700"
  title={
    <div className="flex justify-between items-center text-gray-200">
      <Space><FileTextOutlined /> 查询结果</Space>
      {records.length > 0 && (
        <Button
          type="primary"
          icon={<SafetyCertificateOutlined />}
          onClick={handleRiskAssessment}
          loading={assessmentLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
        >
          进行用户风险评估
        </Button>
      )}
    </div>
  }
>
  {!searchPerformed ? (
    <Empty description={<span className="text-gray-400">请输入查询条件</span>} />
  ) : records.length === 0 ? (
    <Empty description={<span className="text-gray-400">未找到相关记录</span>} />
  ) : (
    <Table
      columns={columns}
      dataSource={records}
      rowKey={(record) => `${record.institution_id}_${record.timestamp}`}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`,
        pageSize: 10,
        className: "px-4 py-3"
      }}
      className="custom-table"
    />
  )}
</Card>
      </div>

      <Modal
  title={
    <Space className="text-gray-200">
      <FileTextOutlined />
      信用记录详情 - {currentDetails?.institution_name || ''}
    </Space>
  }
  open={detailVisible}
  onCancel={() => setDetailVisible(false)}
  width={900}
  footer={[
    <Button 
      key="close" 
      onClick={() => setDetailVisible(false)}
      className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
    >
      关闭
    </Button>
  ]}
  className="dark-modal"
>
  {currentDetails ? (
    <Table
      columns={detailColumns}
      dataSource={currentDetails.records}
      rowKey={(record) => `${record.id}_${record.timestamp}`}
      pagination={false}
      className="custom-table"
    />
  ) : (
    <Empty description={<span className="text-gray-400">暂无详细信息</span>} />
  )}
</Modal>

{/* 风险评估模态框 */}
<Modal
  title={
    <Space className="text-gray-200">
      <AlertOutlined />
      用户风险评估报告
    </Space>
  }
  open={riskAssessmentVisible}
  onCancel={() => setRiskAssessmentVisible(false)}
  width={800}
  footer={null}
  className="dark-modal"
>
  {riskAssessment && <RiskAssessmentReport data={riskAssessment} showCard={false} />}
</Modal>
    </div>
  );
};

export default CreditRecordQuery;