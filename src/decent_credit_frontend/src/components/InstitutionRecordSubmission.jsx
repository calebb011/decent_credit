import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, DatePicker, message, Alert, Tabs, Upload, Modal, Progress } from 'antd';
import { InfoCircleOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CodeBlock } from './code-block.js';
import { submitRecord  } from '../services/institutionRecordSubmissionService';

const { Option } = Select;

const InstitutionRecordSubmission = () => {
  // 保持您原有的所有 state
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recordType, setRecordType] = useState('loan');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // 添加缺失的处理函数
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'userDid',
      'recordType',
      'amount',
      'eventDate',
      'term',
      'interestRate',
      'originalLoanId',
      'overdueDays'
    ].join(',');
    
    const templateContent = `${templateHeaders}\ndid:example:123,loan,50000,2024-03-01,12,4.35,,\ndid:example:456,repayment,2500,2024-03-02,,,LOAN123456,`;
    
    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit_record_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleBatchUpload = async () => {
    if (!uploadFile) {
      message.error('Please select a file first');
      return;
    }
    
    try {
      setBatchProcessing(true);
      
      // 模拟上传进度
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      message.success('Upload completed successfully');
      setUploadModalOpen(false);
      setUploadFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      message.error('Upload failed');
    } finally {
      setBatchProcessing(false);
      setUploadProgress(0);
    }
  };

  const batchJsonExample = [
    {
      userDid: "did:example:123",
      recordType: "loan",
      amount: 50000,
      eventDate: "2024-03-01",
      term: 12,
      interestRate: 4.35
    },
    {
      userDid: "did:example:456",
      recordType: "repayment",
      amount: 2500,
      eventDate: "2024-03-02",
      originalLoanId: "LOAN123456"
    }
  ];

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      console.log('Form submitted:', values);
      const result = await submitRecord(values)
      if (result.success) {
        message.success('Submit success');

      }
      form.resetFields();
    } catch (error) {
      console.error('Submit failed:', error);
      message.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  const renderExtraFields = () => {
    switch (recordType) {
      case 'loan':
        return (
          <>
            <Form.Item name="term" label="Loan Term (Months)" rules={[{ required: true }]}>
              <Input type="number" min={1} />
            </Form.Item>
            <Form.Item name="interestRate" label="Annual Rate (%)" rules={[{ required: true }]}>
              <Input type="number" step={0.01} min={0} max={100} />
            </Form.Item>
          </>
        );
      case 'repayment':
        return (
          <Form.Item name="originalLoanId" label="Original Loan ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        );
      case 'overdue':
        return (
          <Form.Item name="overdueDays" label="Overdue Days" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
        );
      default:
        return null;
    }
  };

 // 在 InstitutionRecordSubmission 组件内部
const tabItems = [
  {
    key: 'single',
    label: 'Single Event',
    children: (
      <Card className="bg-black/20 border-gray-700">
       
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            recordType: 'loan',
            eventDate: dayjs()
          }}
        >
          <Form.Item name="recordType" label="Record Type" rules={[{ required: true }]}>
            <Select onChange={(value) => setRecordType(value)}>
              <Option value="loan">Loan Record</Option>
              <Option value="repayment">Repayment Record</Option>
              <Option value="overdue">Overdue Record</Option>
            </Select>
          </Form.Item>

          <Form.Item name="userDid" label="User DID" rules={[{ required: true }]}>
            <Input placeholder="Enter user DID" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="eventDate" label="Event Date" rules={[{ required: true }]}>
              <DatePicker 
                className="w-full"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <Input type="number" min={0.01} step={0.01} />
            </Form.Item>
          </div>

          {renderExtraFields()}

          <Alert
            className="mb-4"
            message="Submission Note"
            description="Data will be encrypted and ZK proof will be generated to ensure security."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />

          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 border-0"
          >
            Submit
          </Button>
        </Form>
      </Card>
    )
  },
  {
    key: 'batch',
    label: 'Batch Submit',
    children: (
      <Card className="bg-black/20 border-gray-700">
        <div className="space-y-6">
          {/* API 信息部分 */}
          <div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">API Information</h3>
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-purple-400">Endpoint: </span>
                <code className="text-gray-300">/api/v1/credit-records/batch</code>
              </div>
              <div>
                <span className="text-purple-400">Method: </span>
                <code className="text-gray-300">POST</code>
              </div>
              <div>
                <span className="text-purple-400">Content-Type: </span>
                <code className="text-gray-300">application/json</code>
              </div>
              <div>
                <span className="text-purple-400">Authorization: </span>
                <code className="text-gray-300">Bearer {'<your-access-token>'}</code>
              </div>
              <div className="mt-4">
                <span className="text-purple-400">Response Format:</span>
                <pre className="text-gray-300 mt-2">
                  {JSON.stringify({
                    submitted: 2,           // 成功提交数量
                    failed: 0,              // 失败数量
                    record_ids: ["id1", "id2"], // 记录ID列表
                    timestamp: 1638360000000,    // 时间戳
                    status: "Pending"      // 记录状态
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* 基本说明部分 */}
          <div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">Batch Upload Instructions</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Support three types of records: Loan, Repayment, and Notification records</li>
              <li>Maximum 1000 records per batch submission</li>
              <li>All amounts should be in base currency units (e.g., cents, not dollars)</li>
              <li>Each record must contain required fields based on its type</li>
            </ul>
          </div>

          {/* 必填字段说明 */}
          <div>
            <h4 className="text-base font-medium text-gray-200 mb-2">Required Fields by Record Type:</h4>
            <div className="space-y-4">
              <div>
                <p className="text-blue-400 mb-1">Loan Record:</p>
                <ul className="list-disc list-inside text-gray-300 ml-4">
                  <li>userDid - User's DID identifier</li>
                  <li>amount - Loan amount in base units</li>
                  <li>eventDate - Format: YYYY-MM-DD</li>
                  <li>termMonths - Loan term in months</li>
                  <li>interestRate - Annual rate (e.g., 4.35 for 4.35%)</li>
                </ul>
              </div>
              <div>
                <p className="text-green-400 mb-1">Repayment Record:</p>
                <ul className="list-disc list-inside text-gray-300 ml-4">
                  <li>userDid - User's DID identifier</li>
                  <li>amount - Repayment amount in base units</li>
                  <li>eventDate - Format: YYYY-MM-DD</li>
                  <li>loanId - Original loan identifier</li>
                </ul>
              </div>
              <div>
                <p className="text-yellow-400 mb-1">Notification Record:</p>
                <ul className="list-disc list-inside text-gray-300 ml-4">
                  <li>userDid - User's DID identifier</li>
                  <li>amount - Notification amount</li>
                  <li>eventDate - Format: YYYY-MM-DD</li>
                  <li>days - Number of days</li>
                  <li>periodAmount - Amount per period</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 请求示例 */}
          <div>
            <h4 className="text-base font-medium text-gray-200 mb-2">Request Example:</h4>
            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm whitespace-pre">
{`{
  "records": [
    {
      "userDid": "did:example:123",
      "recordType": "loan",
      "amount": 5000000,        // 50000.00 in base units
      "eventDate": "2024-03-01",
      "termMonths": 12,
      "interestRate": 4.35
    },
    {
      "userDid": "did:example:456",
      "recordType": "repayment",
      "amount": 250000,         // 2500.00 in base units
      "eventDate": "2024-03-02",
      "loanId": "LOAN123456"
    }
  ]
}`}
            </div>
          </div>

          
          {/* 验证提示 */}
          <Alert
            message="Data Validation Requirements"
            description={
              <ul className="list-disc list-inside text-gray-300">
                <li>All dates must be in YYYY-MM-DD format and not in the future</li>
                <li>All amounts must be positive numbers in base currency units</li>
                <li>Interest rates must be between 0 and 100</li>
                <li>Loan terms must be positive integers</li>
                <li>User DID must be properly formatted</li>
                <li>Each batch must not exceed 1000 records</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      </Card>
    )
  },
  {
    key: 'excel',
    label: 'Excel Upload',
    children: (
      <Card className="bg-black/20 border-gray-700">
        <Upload
          accept=".csv,.xlsx,.xls"
          beforeUpload={(file) => {
            setUploadFile(file);
            return false;
          }}
          fileList={uploadFile ? [uploadFile] : []}
          onRemove={() => setUploadFile(null)}
        >
          <Button icon={<UploadOutlined />} className="mb-4">Select Excel File</Button>
        </Upload>

        <Button 
          type="primary" 
          onClick={() => setUploadModalOpen(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 border-0"
          disabled={!uploadFile}
        >
          Upload
        </Button>

        <Alert
          className="mt-4"
          message="Upload Instructions"
          description={
            <ul className="list-disc list-inside text-gray-300">
              <li>Supported formats: CSV, Excel</li>
              <li>Maximum 1000 records per upload</li>
              <li>Please use the template format</li>
              <li>Ensure data validation before upload</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Card>
    )
  }
];

  // 保持您原有的渲染逻辑
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-200">Credit Record Submission</h2>
        <Button 
          onClick={handleDownloadTemplate}
          icon={<UploadOutlined />}
          className="text-gray-300 border-gray-700 hover:text-white hover:border-gray-500"
        >
          Download Template
        </Button>
      </div>

      <Tabs 
        items={tabItems}
        className="text-gray-200"
        type="card"
      />

      <Modal
        title="Batch Upload"
        open={uploadModalOpen}
        onCancel={() => !batchProcessing && setUploadModalOpen(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setUploadModalOpen(false)}
            disabled={batchProcessing}
          >
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary"
            onClick={handleBatchUpload}
            loading={batchProcessing}
            className="bg-gradient-to-r from-blue-500 to-purple-500 border-0"
          >
            Start Upload
          </Button>
        ]}
      >
        {batchProcessing && (
          <div className="pt-4">
            <Progress percent={uploadProgress} status="active" />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstitutionRecordSubmission;