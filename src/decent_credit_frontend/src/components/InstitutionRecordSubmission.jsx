import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, DatePicker, message, Alert, Tabs, Upload, Modal, Progress } from 'antd';
import { InfoCircleOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CodeBlock } from './code-block.js';

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

  // 保持您原有的其他函数和代码...
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Success');
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
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-200">JSON Format Example</h3>
          <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
            <pre className="text-sm font-mono text-gray-200 whitespace-pre">
              {JSON.stringify(batchJsonExample, null, 2)}
            </pre>
          </div>
        </div>
        <Alert
          message="Format Requirements"
          description={
            <ul className="list-disc list-inside text-gray-300">
              <li>Date format: YYYY-MM-DD</li>
              <li>Amount must be greater than 0</li>
              <li>Interest rate is percentage (e.g. 4.35)</li>
              <li>Loan term and overdue days must be integers</li>
            </ul>
          }
          type="info"
          showIcon
        />
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