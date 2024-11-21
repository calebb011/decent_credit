import React, { useState, useContext } from 'react';
import { Card, Form, Input, Select, Button, DatePicker, message, Alert, Descriptions } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Option } = Select;

const InstitutionDataSubmission = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recordType, setRecordType] = useState('loan');
  const navigate = useNavigate();
  
  // 模拟当前登录机构信息（实际应从登录状态或Context中获取）
  const currentInstitution = {
    id: localStorage.getItem('institutionId'),
    name: localStorage.getItem('institutionName'),
    type: '金融机构',
    status: 'active'
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      // 添加机构信息到提交数据中
      const formattedValues = {
        ...values,
        eventDate: values.eventDate.format('YYYY-MM-DD'),
        institutionId: currentInstitution.id,
        institutionName: currentInstitution.name,
        submitTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };
      
      console.log('提交的数据:', formattedValues);
      // TODO: 调用后端API提交数据
      message.success('数据提交成功');
      form.resetFields();
    } catch (error) {
      message.error('提交失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 渲染机构信息
  const renderInstitutionInfo = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <Descriptions title="提交机构信息" column={1} size="small">
        <Descriptions.Item label="机构ID">{currentInstitution.id}</Descriptions.Item>
        <Descriptions.Item label="机构名称">{currentInstitution.name}</Descriptions.Item>
        <Descriptions.Item label="机构类型">{currentInstitution.type}</Descriptions.Item>
      </Descriptions>
    </div>
  );

  // 根据记录类型显示不同的表单字段
  const renderExtraFields = () => {
    switch (recordType) {
      case 'loan':
        return (
          <>
            <Form.Item
              name="term"
              label="贷款期限(月)"
              rules={[{ required: true, message: '请输入贷款期限' }]}
            >
              <Input type="number" placeholder="请输入贷款期限" min={1} />
            </Form.Item>
            <Form.Item
              name="interestRate"
              label="年化利率(%)"
              rules={[{ required: true, message: '请输入年化利率' }]}
            >
              <Input type="number" placeholder="请输入年化利率" step={0.01} min={0} max={100} />
            </Form.Item>
          </>
        );
      case 'repayment':
        return (
          <Form.Item
            name="originalLoanId"
            label="原贷款编号"
            rules={[{ required: true, message: '请输入原贷款编号' }]}
          >
            <Input placeholder="请输入原贷款编号" />
          </Form.Item>
        );
      case 'overdue':
        return (
          <>
            <Form.Item
              name="overdueDays"
              label="逾期天数"
              rules={[{ required: true, message: '请输入逾期天数' }]}
            >
              <Input type="number" placeholder="请输入逾期天数" min={1} />
            </Form.Item>
            <Form.Item
              name="overdueAmount"
              label="逾期金额"
              rules={[{ required: true, message: '请输入逾期金额' }]}
            >
              <Input type="number" placeholder="请输入逾期金额" min={0} step={0.01} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">数据贡献</h2>
        <p className="text-gray-600">提交新的信用记录数据，获取平台奖励</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="提交新记录" className="shadow-sm">
          {/* 添加机构信息展示 */}
          {renderInstitutionInfo()}
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              recordType: 'loan',
              eventDate: dayjs()
            }}
          >
            <Form.Item
              name="recordType"
              label="记录类型"
              rules={[{ required: true, message: '请选择记录类型' }]}
            >
              <Select onChange={(value) => setRecordType(value)}>
                <Option value="loan">贷款记录</Option>
                <Option value="repayment">还款记录</Option>
                <Option value="overdue">逾期记录</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="userDID"
              label="用户DID"
              rules={[{ required: true, message: '请输入用户DID' }]}
              tooltip="用户的去中心化身份标识"
            >
              <Input placeholder="请输入用户DID" />
            </Form.Item>

            <Form.Item
              name="eventDate"
              label="发生日期"
              rules={[{ required: true, message: '请选择发生日期' }]}
            >
              <DatePicker 
                className="w-full"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="金额"
              rules={[
                { required: true, message: '请输入金额' },
                { type: 'number', min: 0.01, message: '金额必须大于0' }
              ]}
            >
              <Input type="number" placeholder="请输入金额" min={0.01} step={0.01} />
            </Form.Item>

            {renderExtraFields()}

            <Alert
              message="提交说明"
              description="提交的数据将进行ZK证明生成和加密存储，确保数据安全性。提交成功后将获得相应的代币奖励。"
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              className="mb-4"
            />

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block
              >
                提交记录
              </Button>
            </Form.Item>
          </Form>
        </Card>


<Card title="提交指南" className="shadow-sm">
  <div className="space-y-6">
    {/* 原有的提交指南内容 */}
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">支持的记录类型</h4>
        <ul className="list-disc list-inside text-gray-600">
          <li>贷款记录：原始贷款信息，包含金额、期限、利率</li>
          <li>还款记录：还款金额、原贷款关联</li>
          <li>逾期记录：逾期金额、逾期天数</li>
        </ul>
      </div>

      <div>
        <h4 className="font-medium mb-2">奖励说明</h4>
        <ul className="list-disc list-inside text-gray-600">
          <li>贷款记录：1 DCC/条</li>
          <li>还款记录：0.5 DCC/条</li>
          <li>逾期记录：0.8 DCC/条</li>
        </ul>
      </div>

      <div>
        <h4 className="font-medium mb-2">数据要求</h4>
        <ul className="list-disc list-inside text-gray-600">
          <li>确保数据真实性和准确性</li>
          <li>必须包含用户的DID信息</li>
          <li>金额必须大于0</li>
          <li>发生日期不能晚于今天</li>
          <li>逾期记录需标注具体逾期天数</li>
          <li>还款记录需关联原贷款编号</li>
        </ul>
      </div>
    </div>

    {/* 新增的 API 示例部分 */}
    <div className="border-t pt-4">
      <h4 className="font-medium mb-3">批量提交 API 示例</h4>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">接口地址</p>
          <div className="bg-gray-50 p-2 rounded">
            <code className="text-sm">POST /api/v1/records/batch</code>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">请求头</p>
          <div className="bg-gray-50 p-2 rounded">
            <pre className="text-sm whitespace-pre-wrap">
{`{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}`}
            </pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">请求体示例</p>
          <div className="bg-gray-50 p-2 rounded">
            <pre className="text-sm whitespace-pre-wrap">
{`{
  "records": [
    {
      "recordType": "loan",
      "userDID": "did:example:123",
      "eventDate": "2024-03-20",
      "amount": 10000,
      "term": 12,
      "interestRate": 4.35
    },
    {
      "recordType": "repayment",
      "userDID": "did:example:123",
      "eventDate": "2024-03-21",
      "amount": 1000,
      "originalLoanId": "LOAN123456"
    },
    {
      "recordType": "overdue",
      "userDID": "did:example:123",
      "eventDate": "2024-03-19",
      "amount": 5000,
      "overdueDays": 30,
      "overdueAmount": 5200
    }
  ]
}`}
            </pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">响应示例</p>
          <div className="bg-gray-50 p-2 rounded">
            <pre className="text-sm whitespace-pre-wrap">
{`{
  "success": true,
  "data": {
    "submitted": 3,
    "failed": 0,
    "recordIds": [
      "REC20240320001",
      "REC20240320002",
      "REC20240320003"
    ],
    "rewards": {
      "totalDCC": 2.3,
      "breakdown": {
        "loan": 1.0,
        "repayment": 0.5,
        "overdue": 0.8
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">错误响应示例</p>
          <div className="bg-gray-50 p-2 rounded">
            <pre className="text-sm whitespace-pre-wrap">
{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "数据验证失败",
    "details": [
      {
        "recordIndex": 1,
        "field": "amount",
        "message": "金额必须大于0"
      }
    ]
  }
}`}
            </pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">注意事项</p>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>单次批量提交最多支持 100 条记录</li>
            <li>所有记录必须属于同一个机构</li>
            <li>时间戳使用 ISO 8601 格式</li>
            <li>金额单位为元，支持小数点后两位</li>
            <li>接口调用需要机构认证token</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-700">代码示例</p>
          <div className="bg-gray-50 p-2 rounded">
            <pre className="text-sm whitespace-pre-wrap">
{`// 使用 fetch API 调用示例
const response = await fetch('/api/v1/records/batch', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${YOUR_ACCESS_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    records: [
      // 记录数组
    ]
  })
});

const result = await response.json();

// 使用 axios 调用示例
const result = await axios.post('/api/v1/records/batch', {
  records: [
    // 记录数组
  ]
}, {
  headers: {
    'Authorization': \`Bearer \${YOUR_ACCESS_TOKEN}\`
  }
});`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</Card>
      </div>
    </div>
  );
};

export default InstitutionDataSubmission;